import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";
import { QdrantVectorStore } from "@langchain/qdrant";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import type { UIMessage } from "ai";


const model = new ChatOllama({
    model: "qwen2.5:7b",
    baseUrl: "http://127.0.0.1:11434",
    temperature: 0,
});

const embeddings = new OllamaEmbeddings({
    model: process.env.OLLAMA_EMBEDDING_MODEL!,
    baseUrl: process.env.OLLAMA_BASE_URL!,
});

const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    {
        url: process.env.QDRANT_URL!,
        collectionName: process.env.QDRANT_COLLECTION!,
    }
);

export async function POST(req: Request) {
    try {
        const { messages }: { messages: UIMessage[] } = await req.json();

        const history = messages
            .map((message) => {
                const content = message.parts
                    .filter((part) => part.type === "text")
                    .map((part) => part.text)
                    .join("\n");

                if (message.role === "user") {
                    return new HumanMessage(content);
                }

                if (message.role === "assistant") {
                    return new AIMessage(content);
                }

                return null;
            })
            .filter((message) => message !== null);

        const stream = await model.stream(history);

        const responseStream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();

                try {
                    for await (const chunk of stream) {
                        let text = "";

                        if (typeof chunk.content === "string") {
                            text = chunk.content;
                        } else {
                            text = chunk.content
                                .filter((part) => part.type === "text")
                                .map((part) => part.text)
                                .join("");
                        }

                        if (text) {
                            controller.enqueue(encoder.encode(text));
                        }
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
