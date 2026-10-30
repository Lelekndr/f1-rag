import { QdrantVectorStore } from "@langchain/qdrant"
import { OllamaEmbeddings } from "@langchain/ollama"
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer" // 6
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters" // 6
import "dotenv/config"
import { QdrantClient } from "@qdrant/js-client-rest"
import { createHash } from "node:crypto"

type SimilarityMetric = "dot_product" | "cosine" | "euclidean"

const required = (name: string): string => {
  const value = process.env[name]
  if (!value) throw new Error(`Variável ${name} não definida no .env`)
  return value
}

const embeddings = new OllamaEmbeddings({
  model: required("OLLAMA_EMBEDDING_MODEL"),
  baseUrl:  required("OLLAMA_BASE_URL"),
})

const qdrantUrl = required("QDRANT_URL")
const collectionName = required("QDRANT_COLLECTION")

const f1Data = [
  "https://pt.wikipedia.org/wiki/F%C3%B3rmula_1", 
  "https://www.skysports.com/f1/news/13117256/lewis-hamilton-says-move-to-ferrari-from-mercedes-doesnt-need-vindicating-amid-irritation-at-coverage",
  "https://www.formula1.com/en/latest",
  "https://www.formula1.com/en/drivers",
  "https://www.formula1.com/en/teams",
  "https://www.statsf1.com/",
]

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 100,
})

const qdrant = new QdrantClient({ url: qdrantUrl })

const createCollection = async (
  similarityMetric: SimilarityMetric = "cosine"
) => {
  const { exists } = await qdrant.collectionExists(collectionName)
  if (exists) {
    console.log(`Coleção "${collectionName}" já existe, pulando criação.`)
    return
  }

  const vector = await embeddings.embedQuery("dimension check")

  const distance =
    similarityMetric === "dot_product"
      ? "Dot"
      : similarityMetric === "euclidean"
        ? "Euclid"
        : "Cosine"

  const res = await qdrant.createCollection(collectionName, {
    vectors: { size: vector.length, distance },
  })
  console.log(res)
}

const chunkId = (url: string, index: number, text: string) => {
  const h = createHash("sha256").update(`${url}:${index}:${text}`).digest("hex")
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`
}

const scrapePage = async (url: string): Promise<string> => {
  const loader = new PuppeteerWebBaseLoader(url, {
    launchOptions: { headless: true },
    gotoOptions: {
      waitUntil: "networkidle2", 
      timeout: 60_000,
    },
    evaluate: async (page) => {
      return await page.evaluate(() => document.body.innerText)
    },
  })

  const docs = await loader.load()
  return docs.map((doc) => doc.pageContent).join("\n")
}

const loadSampleData = async () => {
  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    { url: qdrantUrl, collectionName }
  )

  for (const url of f1Data) {
   
    try {
      const content = await scrapePage(url)

    
      if (!content.trim()) {
        console.warn(`Conteúdo vazio, pulando: ${url}`)
        continue
      }

      const chunks = await splitter.splitText(content)

      await vectorStore.addDocuments(
        chunks.map((chunk, i) => ({
          pageContent: chunk,
          metadata: { source: url },
        })),
        { ids: chunks.map((chunk, i) => chunkId(url, i, chunk)) }
      )

      console.log(`OK: ${url} (${chunks.length} chunks)`)
    } catch (err) {
      console.error(`Falhou: ${url}`, err)
    }
  }
}


const main = async () => {
  await createCollection()
  await loadSampleData()
}

main()
  .then(() => process.exit(0)) 
  .catch((err) => {
    console.error("Erro fatal:", err)
    process.exit(1)
  })