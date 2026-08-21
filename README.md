# FAQ Helper Bot

Build a minimal,simple working RAG Q&A system for a company FAQ document.

Required technologies

Python

Streamlit for the UI

LangChain for the RAG pipeline

ChromaDB as the vector database

OpenAI API for embeddings and the LLM

Core requirement

The user must be able to upload their own company FAQ document through the application. Do NOT create or provide a sample FAQ document.

The uploaded document must actually be processed successfully. The application should:

Accept the uploaded FAQ PDF.

Extract the text from the document.

Split the text into smaller chunks using LangChain.

Create embeddings using OpenAI.

Store the chunks and embeddings in ChromaDB.

Allow the user to enter a question about the FAQ.

Convert the question into an embedding.

Search ChromaDB for the most relevant chunks.

Send the retrieved chunks and the user's question to an OpenAI LLM through the OpenAI API.

Display the generated answer.

OpenAI API key

Provide a simple input for the user to enter their OpenAI API key when using the application.

Do not hard-code an API key and do not expose or store the user's key in the source code.

The entered key must actually be used for:

OpenAI embeddings

OpenAI LLM generation

If the API key is missing or invalid, show a clear error message instead of failing silently.

UI

Keep the UI extremely simple:

Title: "Company FAQ Q&A"

OpenAI API key input

FAQ document upload

"Process Document" button

Question input

"Ask" button

Answer area

Show clear status messages such as:

Document uploaded

Document processed successfully

Number of chunks created

FAQ is ready for questions

Clear error messages if something fails

Important constraints

Do NOT create a React frontend.

Do NOT create a separate FastAPI backend.

Do NOT add authentication.

Do NOT add login/signup.

Do NOT add unnecessary dashboards.

Do NOT add chat history.

Do NOT add unnecessary databases.

Do NOT create a sample FAQ document.

Do NOT use mock data.

Do NOT replace ChromaDB with another vector database.

Do NOT replace LangChain with another RAG framework.

Do NOT replace OpenAI with another LLM provider.

The priority is a simple, reliable, working Lab 2 implementation, not a visually complex application.

Before finishing, verify that the complete flow works:

Upload FAQ → Extract text → Chunk with LangChain → OpenAI embeddings → ChromaDB → Question → Similarity search → Retrieved chunks → OpenAI LLM → Answer

Also make sure the application does not produce a frontend/backend "Failed to fetch" problem caused by unnecessary separate services. Keep the implementation self-contained and simple."Implement the complete flow exactly as specified. Keep the implementation minimal and do not add features beyond the requirements."

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/582240bc-0ac9-480d-ae34-ce8b79964769).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
