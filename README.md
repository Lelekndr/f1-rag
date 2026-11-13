# F1 RAG

Chatbot sobre Fórmula 1 com RAG: coleta o texto de sites, guarda os embeddings no Qdrant e responde com um modelo rodando no Ollama.

**Stack:** Next.js, AI SDK, LangChain, Qdrant, Ollama, Puppeteer.

## Como rodar

1. Copie o `.env.example` para `.env`.
2. `docker compose up -d` sobe o Qdrant e o Ollama e baixa os modelos (a primeira vez demora).
3. `npm install`
4. `npm run seed` coleta os sites e grava no Qdrant.
5. `npm run dev` e abra http://localhost:3000

## Observações

- O Ollama do Docker usa só CPU, então o chat pode demorar. Um modelo menor (ex.: `qwen2.5:3b`) acelera.
- Se o Ollama do Windows estiver aberto, feche-o antes: a porta 11434 fica ocupada.
- Para recarregar os dados do zero, apague a coleção `f1_documents` e rode o seed de novo. Se trocar o modelo de embedding, apague a coleção antes.
- As fontes ficam na lista `f1Data` em `scripts/loadDb.ts`.