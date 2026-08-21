# Company FAQ Q&A (RAG)

Minimal Streamlit + LangChain + ChromaDB + OpenAI RAG app.

## Run

```bash
pip install -r requirements.txt
streamlit run app.py
```

Enter your OpenAI API key in the app, upload your FAQ PDF, click **Process Document**,
then ask questions. The key is used only in-memory; nothing is hard-coded or stored.

Flow: Upload PDF -> PyPDFLoader text extraction -> RecursiveCharacterTextSplitter chunks
-> OpenAIEmbeddings -> ChromaDB -> similarity search -> ChatOpenAI answer.
