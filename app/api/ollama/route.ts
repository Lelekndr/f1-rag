import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";
import { QdrantVectorStore } from "@langchain/qdrant";
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { UIMessage } from "ai";

export const runtime = "nodejs";

const model = new ChatOllama({
    model: process.env.OLLAMA_CHAT_MODEL!,
    baseUrl: process.env.OLLAMA_BASE_URL!,
    temperature: 0,
});

const embeddings = new OllamaEmbeddings({
    model: process.env.OLLAMA_EMBEDDING_MODEL!,
    baseUrl: process.env.OLLAMA_BASE_URL!,
});

let vectorStorePromise: Promise<QdrantVectorStore> | null = null;
const getVectorStore = () => {
    vectorStorePromise ??= QdrantVectorStore.fromExistingCollection(embeddings, {
        url: process.env.QDRANT_URL!,
        collectionName: process.env.QDRANT_COLLECTION!,
    });
    return vectorStorePromise;
};

const textOf = (message: UIMessage) =>
    message.parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("\n");

const rewriteQuestion = async (messages: UIMessage[], question: string) => {
    if (messages.length <= 1) return question;

    const transcript = messages
        .slice(-7, -1)
        .map(
            (m) =>
                `${m.role === "user" ? "Usuário" : "Assistente"}: ${textOf(m).slice(0, 300)}`
        )
        .join("\n");

    const res = await model.invoke([
        new SystemMessage(
            "Reescreva a última pergunta do usuário como uma pergunta completa e independente, usando a conversa como contexto. Responda APENAS com a pergunta reescrita."
        ),
        new HumanMessage(`Conversa:\n${transcript}\n\nÚltima pergunta: ${question}`),
    ]);

    return typeof res.content === "string" && res.content.trim()
        ? res.content.trim()
        : question;
};

export async function POST(req: Request) {
    try {
        const { messages }: { messages: UIMessage[] } = await req.json();

        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        const question = lastUser ? textOf(lastUser) : "";

        const vectorStore = await getVectorStore();
        const searchQuery = await rewriteQuestion(messages, question);
        const docs = await vectorStore.similaritySearch(searchQuery, 6);

        const context = docs
            .map((doc, i) => `[${i + 1}] (fonte: ${doc.metadata.source})\n${doc.pageContent}`)
            .join("\n\n");

        const system = new SystemMessage(
            `Você é um assistente especialista em Fórmula 1.
Responda em português, direto ao ponto, usando SOMENTE o contexto abaixo. Não use conhecimento próprio.
O contexto pode estar em inglês ou ser uma lista de nomes sem frases completas (por exemplo "Charles Leclerc Ferrari Lewis Hamilton Ferrari" significa que os pilotos da Ferrari são Leclerc e Hamilton). Nesse caso, extraia a resposta da lista.
Se a informação não aparecer no contexto, responda exatamente: "Não encontrei essa informação nas fontes."
Não mencione a palavra "contexto" na resposta.

CONTEXTO:
${context}`
        );

        const history = messages
            .map((message) => {
                const content = textOf(message);
                if (message.role === "user") return new HumanMessage(content);
                if (message.role === "assistant") return new AIMessage(content);
                return null;
            })
            .filter((message) => message !== null);

        const stream = await model.stream([system, ...history]);

        const responseStream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                try {
                    for await (const chunk of stream) {
                        const text =
                            typeof chunk.content === "string"
                                ? chunk.content
                                : chunk.content
                                      .filter((part) => part.type === "text")
                                      .map((part) => part.text)
                                      .join("");

                        if (text) controller.enqueue(encoder.encode(text));
                    }
                    controller.close();
                } catch (error) {
                    controller.error(error);
                }
            },
        });

        return new Response(responseStream, {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "no-cache, no-transform",
            },
        });
    } catch (error) {
        console.error("Erro na API:", error);
        return Response.json(
            { error: "Não foi possível processar a mensagem." },
            { status: 500 }
        );
    }
}