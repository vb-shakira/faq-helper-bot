import os
import tempfile

import streamlit as st
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate

st.set_page_config(page_title="Company FAQ Q&A")
st.title("Company FAQ Q&A")

api_key = st.text_input("OpenAI API Key", type="password")
uploaded_file = st.file_uploader("Upload FAQ document (PDF)", type=["pdf"])

if uploaded_file is not None:
    st.info("Document uploaded")

if "vectorstore" not in st.session_state:
    st.session_state.vectorstore = None

if st.button("Process Document"):
    if not api_key:
        st.error("Please enter your OpenAI API key.")
    elif uploaded_file is None:
        st.error("Please upload a FAQ PDF document.")
    else:
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                tmp.write(uploaded_file.getvalue())
                tmp_path = tmp.name

            docs = PyPDFLoader(tmp_path).load()
            os.remove(tmp_path)

            text = "\n".join(d.page_content for d in docs).strip()
            if not text:
                st.error("No text could be extracted from this PDF.")
            else:
                splitter = RecursiveCharacterTextSplitter(
                    chunk_size=1000, chunk_overlap=150
                )
                chunks = splitter.split_documents(docs)

                embeddings = OpenAIEmbeddings(
                    model="text-embedding-3-small", api_key=api_key
                )
                vectorstore = Chroma.from_documents(
                    documents=chunks,
                    embedding=embeddings,
                    collection_name="company_faq",
                )
                st.session_state.vectorstore = vectorstore

                st.success("Document processed successfully")
                st.write(f"Number of chunks created: {len(chunks)}")
                st.success("FAQ is ready for questions")
        except Exception as e:
            st.error(f"Failed to process document: {e}")

question = st.text_input("Ask a question about the FAQ")

if st.button("Ask"):
    if not api_key:
        st.error("Please enter your OpenAI API key.")
    elif st.session_state.vectorstore is None:
        st.error("Please process a FAQ document first.")
    elif not question.strip():
        st.error("Please enter a question.")
    else:
        try:
            retriever = st.session_state.vectorstore.as_retriever(
                search_kwargs={"k": 4}
            )
            relevant_docs = retriever.invoke(question)
            context = "\n\n".join(d.page_content for d in relevant_docs)

            prompt = ChatPromptTemplate.from_messages(
                [
                    (
                        "system",
                        "You answer questions using only the provided company FAQ "
                        "context. If the answer is not in the context, say you "
                        "don't know.",
                    ),
                    ("human", "Context:\n{context}\n\nQuestion: {question}"),
                ]
            )
            llm = ChatOpenAI(model="gpt-4o-mini", temperature=0, api_key=api_key)
            answer = (prompt | llm).invoke(
                {"context": context, "question": question}
            ).content

            st.subheader("Answer")
            st.write(answer)
        except Exception as e:
            st.error(f"Failed to generate answer: {e}")
