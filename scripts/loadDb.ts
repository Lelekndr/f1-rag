import { QdrantVectorStore } from "@langchain/qdrant"
import { OllamaEmbeddings } from "@langchain/ollama"
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
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
  baseUrl: required("OLLAMA_BASE_URL"),
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

// ID determinístico (UUID a partir do hash do conteúdo)
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
      await new Promise((r) => setTimeout(r, 3000))

      
      await page.evaluate(() => {
        const btn = [...document.querySelectorAll("button")].find((b) =>
          /accept|aceitar|agree|concordo/i.test((b as HTMLElement).innerText)
        )
        ;(btn as HTMLElement | undefined)?.click()
      })
      await new Promise((r) => setTimeout(r, 1000))

     
      return await page.evaluate(() => {
        document
          .querySelectorAll("nav, header, footer, script, style, noscript")
          .forEach((el) => el.remove())
        return ((document.querySelector("main") ?? document.body) as HTMLElement)
          .innerText
      })
    },
  })

  const docs = await loader.load()
  return docs.map((doc) => doc.pageContent).join("\n")
}

const normalize = (text: string) => {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
  const out: string[] = []
  let buffer: string[] = []

  const flush = () => {
    if (buffer.length) {
      out.push(buffer.join(" "))
      buffer = []
    }
  }

  for (const line of lines) {
    if (line.length < 30) buffer.push(line)
    else {
      flush()
      out.push(line)
    }
  }
  flush()

  return out.join("\n")
}

const loadSampleData = async () => {
  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    { url: qdrantUrl, collectionName }
  )

  for (const url of f1Data) {
    try {
      const raw = await scrapePage(url)
      const content = url.includes("formula1.com") ? normalize(raw) : raw

      if (!content.trim()) {
        console.warn(`Conteúdo vazio, pulando: ${url}`)
        continue
      }

      const chunks = await splitter.splitText(content)

      
      await qdrant.delete(collectionName, {
        filter: {
          must: [{ key: "metadata.source", match: { value: url } }],
        },
      })

      await vectorStore.addDocuments(
        chunks.map((chunk) => ({
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