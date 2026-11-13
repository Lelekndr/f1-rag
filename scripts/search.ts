import "dotenv/config"
import { OllamaEmbeddings } from "@langchain/ollama"
import { QdrantVectorStore } from "@langchain/qdrant"

const run = async () => {
  const query = process.argv[2]

  const embeddings = new OllamaEmbeddings({
    model: process.env.OLLAMA_EMBEDDING_MODEL!,
    baseUrl: process.env.OLLAMA_BASE_URL!,
  })

  const store = await QdrantVectorStore.fromExistingCollection(embeddings, {
    url: process.env.QDRANT_URL!,
    collectionName: process.env.QDRANT_COLLECTION!,
  })

  console.log("Modelo de embedding:", process.env.OLLAMA_EMBEDDING_MODEL)

  const results = await store.similaritySearchWithScore(query, 6)
  for (const [doc, score] of results) {
    console.log(`\n--- score ${score.toFixed(3)} | ${doc.metadata.source}`)
    console.log(doc.pageContent.slice(0, 250))
  }
}

run().then(() => process.exit(0))