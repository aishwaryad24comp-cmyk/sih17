import os
import chromadb
from chromadb.utils import embedding_functions
import google.generativeai as genai

# Setup ChromaDB persistent client
CHROMA_DATA_PATH = os.path.join(os.path.dirname(__file__), "chroma_db")
chroma_client = chromadb.PersistentClient(path=CHROMA_DATA_PATH)

# Use a lightweight sentence-transformer for embeddings (free, runs locally)
embed_fn = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")

# Create or get the collection
collection = chroma_client.get_or_create_collection(
    name="legal_docs",
    embedding_function=embed_fn
)

# Initialize Gemini
# Attempt to read GEMINI_API_KEY from the root .env file automatically
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../.env'))
gemini_key = os.environ.get("GEMINI_API_KEY", "")
if not gemini_key and os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            if line.strip().startswith('GEMINI_API_KEY='):
                gemini_key = line.strip().split('=', 1)[1].strip("'\"")
                break

if gemini_key:
    genai.configure(api_key=gemini_key)

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200):
    """Splits text into chunks for vectorization."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

def ingest_document(doc_id: str, text: str):
    """Chunks the document and inserts it into ChromaDB."""
    chunks = chunk_text(text)
    
    documents = []
    ids = []
    metadatas = []
    
    for i, chunk in enumerate(chunks):
        documents.append(chunk)
        ids.append(f"{doc_id}_chunk_{i}")
        metadatas.append({"doc_id": doc_id, "chunk_index": i})
        
    collection.upsert(
        documents=documents,
        ids=ids,
        metadatas=metadatas
    )
    return len(chunks)

def query_legal_assistant(question: str, top_k: int = 3):
    """Retrieves relevant chunks and asks Gemini or synthesizes local RAG answer."""
    # 1. Retrieve
    results = collection.query(
        query_texts=[question],
        n_results=top_k
    )
    
    if not results['documents'] or not results['documents'][0]:
        return "I don't have enough legal context loaded in my database to answer this. Please upload a legal document (PDF) using the 'Upload PDF' button above!"
        
    retrieved_chunks = results['documents'][0]
    context = "\n\n---\n\n".join(retrieved_chunks)
    
    # 2. Augment & Generate via Gemini if API key is present
    if gemini_key:
        prompt = f"""You are an expert Legal AI Assistant for land acquisition officers in India. 
Use the following legal context retrieved from official documents to answer the user's question. 
If the answer is not in the context, do not guess; state that the documents do not provide this information.

Context:
{context}

Question: {question}

Answer in a clear, professional, and concise manner:"""

        try:
            model = genai.GenerativeModel('gemini-2.5-flash')
            response = model.generate_content(prompt)
            return {
                "answer": response.text,
                "context_used": retrieved_chunks
            }
        except Exception as e:
            print(f"Gemini API Error: {e}")

    # Fallback RAG synthesis when GEMINI_API_KEY is not configured
    synthesized_answer = (
        f"Based on official Land Acquisition Rules (RAG Vector Search):\n\n"
        f"{retrieved_chunks[0][:500]}\n\n"
        f"💡 Note: To enable generative LLM responses, set GEMINI_API_KEY in your local .env file."
    )
    return {
        "answer": synthesized_answer,
        "context_used": retrieved_chunks
    }
