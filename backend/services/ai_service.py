# FILE: services/ai_service.py
# ----------------------
# REVISED: Now uses a hybrid approach to answer questions.

import google.generativeai as genai
import chromadb
from core.config import GOOGLE_API_KEY
from . import github_service
from typing import Dict, Any, Optional
from models.user import UserInDB

# Configure the Gemini API
genai.configure(api_key=GOOGLE_API_KEY)
client = chromadb.Client()
project_collections = {}

def _initialize_vector_store(project_id: str):
    """ Private function to build and cache a vector store for a project. """
    if project_id in project_collections:
        return
    print(f"Lazy-loading RAG vector store for {project_id}...")
    docs_to_index = github_service.get_text_content_for_rag(project_id)
    if not docs_to_index:
        project_collections[project_id] = None 
        return
    collection = client.get_or_create_collection(name=project_id.replace('/', '_'))
    collection.add(
        documents=[doc['content'] for doc in docs_to_index],
        metadatas=[doc['metadata'] for doc in docs_to_index],
        ids=[doc['id'] for doc in docs_to_index]
    )
    project_collections[project_id] = collection
    print(f"Vector store for {project_id} initialized.")

def query_project(project_id: str, question: str) -> dict:
    """
    Uses a hybrid approach: checks for factual keywords first,
    otherwise uses the RAG pipeline for contextual questions.
    """
    lower_question = question.lower()

    # --- HYBRID LOGIC ---
    # Check for factual questions that are better answered by direct API calls.
    if "contributor" in lower_question or "who worked on" in lower_question or "commit count" in lower_question:
        print("Factual question detected. Fetching contributor stats directly.")
        direct_answer = github_service.get_formatted_contributor_stats(project_id)
        return {"answer": direct_answer, "sources": [{"source": "Direct GitHub API Call"}]}

    # --- RAG PIPELINE (for contextual questions) ---
    print("Contextual question detected. Using RAG pipeline.")
    if project_id not in project_collections:
        _initialize_vector_store(project_id)

    collection = project_collections.get(project_id)
    if collection is None:
        return {"answer": "Could not answer. No text content (issues, PRs, README) available to analyze.", "sources": []}

    results = collection.query(query_texts=[question], n_results=5)
    context_docs = results['documents'][0]
    sources = results['metadatas'][0]
    context_str = "\n\n---\n\n".join(context_docs)

    prompt = f"""
    You are Kortex, an AI assistant expert on software projects.
    Based ONLY on the following context from project '{project_id}', answer the user's question.
    If the context doesn't contain the answer, state that the information is not available in the provided context.

    Context:
    {context_str}

    Question: {question}
    Answer:
    """
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        return {"answer": response.text, "sources": sources}
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return {"answer": "Sorry, there was an error communicating with the AI model.", "sources": []}

def summarize_project(project_id: str, user=None) -> str:
    """ Generates a high-level summary of a project using its README. """
    print(f"Generating AI summary for {project_id}...")
    details = github_service.get_live_project_details(project_id, user)
    readme = details.get("documentation")
    if not readme:
        return "No README file found to generate a summary."
    prompt = f"""
    Read the following README file for the project '{project_id}' and provide a concise, one-paragraph summary.
    README:
    {readme[:4000]}
    """
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Error calling Gemini API for summary: {e}")
        return "Could not generate summary due to an AI model error."

def generate_repository_summary(full_name: str, repository_data: Dict[str, Any], user: Optional[UserInDB] = None) -> str:
    """
    Generate an AI-powered summary for an external repository
    """
    try:
        repo_info = repository_data.get("repository_info", {})
        readme = repository_data.get("readme", "")
        recent_commits = repository_data.get("recent_commits", [])
        languages = repository_data.get("languages", {})

        # Build context for AI
        context_parts = []

        # Repository basic info
        context_parts.append(f"Repository: {full_name}")
        if repo_info.get("description"):
            context_parts.append(f"Description: {repo_info['description']}")

        # Statistics
        stats = []
        if repo_info.get("stars"):
            stats.append(f"{repo_info['stars']} stars")
        if repo_info.get("forks"):
            stats.append(f"{repo_info['forks']} forks")
        if repo_info.get("language"):
            stats.append(f"Primary language: {repo_info['language']}")
        if stats:
            context_parts.append(f"Statistics: {', '.join(stats)}")

        # Languages breakdown
        if languages:
            top_languages = sorted(languages.items(), key=lambda x: x[1], reverse=True)[:3]
            lang_text = ", ".join([f"{lang} ({perc:.1f}%)" for lang, perc in top_languages])
            context_parts.append(f"Top languages: {lang_text}")

        # Recent activity
        if recent_commits:
            context_parts.append(f"Recent commits ({len(recent_commits)}):")
            for commit in recent_commits[:3]:
                context_parts.append(f"- {commit.get('message', '')[:100]}...")

        # README content
        if readme:
            context_parts.append(f"README content (excerpt):\n{readme}")

        # Topics/tags
        if repo_info.get("topics"):
            context_parts.append(f"Topics: {', '.join(repo_info['topics'][:5])}")

        context = "\n\n".join(context_parts)

        prompt = f"""
        Analyze the following GitHub repository and provide a comprehensive, engaging summary in 2-3 sentences.
        Focus on what the project does, its key features, technology stack, and why it might be useful or interesting.
        Be specific about the project's purpose and highlight any notable aspects.

        Repository Information:
        {context}

        Provide a clear, informative summary that would help someone quickly understand what this repository is about:
        """

        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(prompt)

        summary = response.text.strip()

        # Add some basic fallback info if AI response is too short
        if len(summary) < 50:
            fallback_parts = [f"{full_name} is a {repo_info.get('language', 'software')} project"]
            if repo_info.get("description"):
                fallback_parts.append(repo_info["description"])
            if repo_info.get("stars", 0) > 100:
                fallback_parts.append(f"with {repo_info['stars']} stars on GitHub")
            summary = ". ".join(fallback_parts) + "."

        return summary

    except Exception as e:
        print(f"Error generating repository summary: {e}")
        # Fallback summary
        repo_info = repository_data.get("repository_info", {})
        return f"{full_name} is a {repo_info.get('language', 'software')} repository with {repo_info.get('stars', 0)} stars. {repo_info.get('description', 'No description available.')}"
