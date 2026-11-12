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

export async function POST(req: Request) {
    try {
        const { messages }: { messages: UIMessage[] } = await req.json();

        
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        const question = lastUser ? textOf(lastUser) : "";

       
        const vectorStore = await getVectorStore();
        const docs = await vectorStore.similaritySearch(question, 4);

        const context = docs
            .map((doc, i) => `[${i + 1}] (fonte: ${doc.metadata.source})\n${doc.pageContent}`)
            .join("\n\n");

        
        const system = new SystemMessage(
            `Você é um assistente especialista em Fórmula 1.
Responda usando APENAS o contexto abaixo. Se a resposta não estiver no contexto, diga que não encontrou essa informação nas fontes.
Responda no mesmo idioma da pergunta.

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