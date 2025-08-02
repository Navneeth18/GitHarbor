# FILE: services/ai_service.py
# ----------------------
# REVISED: Enhanced AI service with better RAG pipeline and GitHub data utilization

import google.generativeai as genai
import chromadb
from core.config import GOOGLE_API_KEY
from . import github_service
from typing import Dict, Any, Optional, List
from models.user import UserInDB
import logging
import traceback
import time
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure the Gemini API
try:
    if GOOGLE_API_KEY and GOOGLE_API_KEY != "your_google_api_key_here":
        genai.configure(api_key=GOOGLE_API_KEY)
        logger.info("Gemini API configured successfully")
    else:
        logger.warning("GOOGLE_API_KEY not configured - AI features will be limited")
        genai = None
except Exception as e:
    logger.error(f"Failed to configure Gemini API: {e}")
    genai = None

# Initialize ChromaDB client with error handling
try:
    client = chromadb.Client()
    logger.info("ChromaDB client initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize ChromaDB client: {e}")
    client = None

project_collections = {}
project_data_cache = {}  # Cache for project data to avoid refetching

def _get_basic_project_info(project_id: str, user: UserInDB = None) -> Dict[str, Any]:
    """Get basic project information with fallbacks"""
    try:
        # Check cache first
        if project_id in project_data_cache:
            logger.info(f"Using cached data for {project_id}")
            return project_data_cache[project_id]
        
        # Try to get fresh data
        details = github_service.get_live_project_details(project_id, user)
        
        # Check if we got meaningful data
        has_data = (
            details.get("repository_stats", {}).get("stars") is not None or
            details.get("commits") or
            details.get("contributors") or
            details.get("documentation")
        )
        
        if not has_data:
            logger.warning(f"No meaningful data received for {project_id}, trying public fallback")
            # Try public fallback without user token
            details = github_service.get_live_project_details(project_id, None)
            
            # Check again if we got data
            has_data = (
                details.get("repository_stats", {}).get("stars") is not None or
                details.get("commits") or
                details.get("contributors") or
                details.get("documentation")
            )
        
        # If we still don't have data, create minimal info from project_id
        if not has_data:
            logger.warning(f"Creating minimal data for {project_id} due to API limitations")
            details = {
                "repository_stats": {
                    "name": project_id,
                    "description": "Repository information not available due to API rate limits",
                    "language": "Unknown",
                    "stars": 0,
                    "forks": 0,
                    "size": 0,
                    "created_at": "Unknown",
                    "updated_at": "Unknown"
                },
                "contributors": [],
                "commits": [],
                "documentation": "",
                "issues": [],
                "pull_requests": []
            }
        
        # Cache the data for future use
        project_data_cache[project_id] = details
        
        return details
    except Exception as e:
        logger.error(f"Error getting project details: {e}")
        # Return minimal info with project_id
        minimal_info = {
            "repository_stats": {
                "name": project_id,
                "description": "Repository information not available",
                "language": "Unknown",
                "stars": 0,
                "forks": 0,
                "size": 0,
                "created_at": "Unknown",
                "updated_at": "Unknown"
            },
            "contributors": [],
            "commits": [],
            "documentation": "",
            "issues": [],
            "pull_requests": []
        }
        
        # Cache this minimal info too
        project_data_cache[project_id] = minimal_info
        
        return minimal_info

def _create_documents_from_project_data(project_id: str, project_data: Dict[str, Any]) -> List[Dict[str, str]]:
    """Create documents for RAG from already fetched project data"""
    documents = []
    
    try:
        # Repository basic info
        repo_stats = project_data.get("repository_stats", {})
        if repo_stats:
            basic_info = f"Repository: {project_id}\n"
            if repo_stats.get("description"):
                basic_info += f"Description: {repo_stats['description']}\n"
            if repo_stats.get("language"):
                basic_info += f"Primary Language: {repo_stats['language']}\n"
            if repo_stats.get("stars"):
                basic_info += f"Stars: {repo_stats['stars']}\n"
            if repo_stats.get("forks"):
                basic_info += f"Forks: {repo_stats['forks']}\n"
            if repo_stats.get("size"):
                basic_info += f"Size: {repo_stats['size']} KB\n"
            if repo_stats.get("created_at"):
                basic_info += f"Created: {repo_stats['created_at']}\n"
            if repo_stats.get("updated_at"):
                basic_info += f"Last Updated: {repo_stats['updated_at']}\n"
            
            documents.append({
                "id": f"{project_id}_basic_info",
                "content": basic_info,
                "metadata": {"source": f"https://github.com/{project_id}", "type": "repository_info"}
            })

        # README content
        documentation = project_data.get("documentation")
        if documentation:
            documents.append({
                "id": f"{project_id}_readme",
                "content": f"README Content:\n{documentation}",
                "metadata": {"source": f"https://github.com/{project_id}/blob/main/README.md", "type": "documentation"}
            })

        # Contributors
        contributors = project_data.get("contributors", [])
        if contributors:
            contributor_info = "Contributors:\n"
            for i, contributor in enumerate(contributors[:10]):  # Top 10 contributors
                contributor_info += f"{i+1}. {contributor.get('login', 'Unknown')}: {contributor.get('contributions', 0)} contributions\n"
            
            documents.append({
                "id": f"{project_id}_contributors",
                "content": contributor_info,
                "metadata": {"source": f"https://github.com/{project_id}/graphs/contributors", "type": "contributors"}
            })

        # Recent commits
        commits = project_data.get("commits", [])
        if commits:
            commit_info = "Recent Commits:\n"
            for i, commit in enumerate(commits[:15]):  # Last 15 commits
                commit_msg = commit.get('commit', {}).get('message', '')
                commit_author = commit.get('commit', {}).get('author', {}).get('name', 'Unknown')
                commit_date = commit.get('commit', {}).get('author', {}).get('date', '')
                if commit_msg:
                    commit_info += f"{i+1}. {commit_msg[:100]}... (by {commit_author} on {commit_date})\n"
            
            documents.append({
                "id": f"{project_id}_commits",
                "content": commit_info,
                "metadata": {"source": f"https://github.com/{project_id}/commits", "type": "commits"}
            })

        # Issues
        issues = project_data.get("issues", [])
        if issues:
            issues_info = "Recent Issues:\n"
            for i, issue in enumerate(issues[:10]):  # Last 10 issues
                title = issue.get('title', '')
                body = issue.get('body', '')
                state = issue.get('state', '')
                if title and 'pull_request' not in issue:
                    issues_info += f"{i+1}. [{state.upper()}] {title}\n"
                    if body:
                        issues_info += f"   {body[:200]}...\n"
            
            documents.append({
                "id": f"{project_id}_issues",
                "content": issues_info,
                "metadata": {"source": f"https://github.com/{project_id}/issues", "type": "issues"}
            })

        # Pull Requests
        pull_requests = project_data.get("pull_requests", [])
        if pull_requests:
            pr_info = "Recent Pull Requests:\n"
            for i, pr in enumerate(pull_requests[:10]):  # Last 10 PRs
                title = pr.get('title', '')
                body = pr.get('body', '')
                state = pr.get('state', '')
                if title:
                    pr_info += f"{i+1}. [{state.upper()}] {title}\n"
                    if body:
                        pr_info += f"   {body[:200]}...\n"
            
            documents.append({
                "id": f"{project_id}_pull_requests",
                "content": pr_info,
                "metadata": {"source": f"https://github.com/{project_id}/pulls", "type": "pull_requests"}
            })

        logger.info(f"Created {len(documents)} documents from project data for {project_id}")
        return documents
        
    except Exception as e:
        logger.error(f"Error creating documents from project data: {e}")
        return []

def _initialize_vector_store(project_id: str, user: UserInDB = None):
    """Initialize vector store with project data"""
    if project_id in project_collections:
        return
    
    if client is None:
        logger.error("ChromaDB client not available")
        project_collections[project_id] = None
        return
        
    logger.info(f"Initializing RAG vector store for {project_id}...")
    try:
        # Get project data (this uses cached data if available)
        project_data = _get_basic_project_info(project_id, user)
        
        # Create documents from the project data
        documents = _create_documents_from_project_data(project_id, project_data)
        
        if not documents:
            logger.warning(f"No documents created for {project_id}")
            project_collections[project_id] = None 
            return
        
        # Create collection
        collection_name = project_id.replace('/', '_').replace('-', '_')
        collection = client.get_or_create_collection(name=collection_name)
        
        # Add documents to collection
        collection.add(
            documents=[doc['content'] for doc in documents],
            metadatas=[doc['metadata'] for doc in documents],
            ids=[doc['id'] for doc in documents]
        )
        
        project_collections[project_id] = collection
        logger.info(f"Vector store for {project_id} initialized with {len(documents)} documents.")
        
    except Exception as e:
        logger.error(f"Error initializing vector store for {project_id}: {e}")
        logger.error(traceback.format_exc())
        project_collections[project_id] = None

def query_project(project_id: str, question: str, user: UserInDB = None) -> dict:
    """
    Enhanced query function that uses available project data for RAG
    """
    try:
        lower_question = question.lower()
        
        # Get project data first (this will use cache if available)
        project_data = _get_basic_project_info(project_id, user)
        
        # Check for specific question types that can be answered directly
        if any(keyword in lower_question for keyword in ["contributor", "who worked", "commit count", "stars", "forks", "language"]):
            logger.info("Direct question detected, answering from project data")
            return _answer_direct_question(project_id, question, project_data)
        
        # Initialize vector store if needed
        if project_id not in project_collections:
            _initialize_vector_store(project_id, user)

        collection = project_collections.get(project_id)
        if collection is None:
            # Fallback to direct answer from project data
            return _answer_direct_question(project_id, question, project_data)

        # Use RAG pipeline
        try:
            results = collection.query(query_texts=[question], n_results=3)
            context_docs = results['documents'][0]
            sources = results['metadatas'][0]
            context_str = "\n\n---\n\n".join(context_docs)

            # Check if Gemini API is available
            if genai is None:
                return {
                    "answer": f"Based on the available information about {project_id}, I can see this is a project with some activity, but I need the AI service to be properly configured to provide detailed answers. Here's what I know: {context_str[:500]}...",
                    "sources": sources
                }

            prompt = f"""
            You are Kortex, an AI assistant expert on software projects.
            Based ONLY on the following context from project '{project_id}', answer the user's question.
            If the context doesn't contain the answer, state that the information is not available in the provided context.
            Be helpful and provide detailed, accurate information based on the available context.
            Keep your answer concise but informative.

            Context:
            {context_str}

            Question: {question}
            Answer:
            """
            
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(prompt)
            
            if response and response.text:
                return {"answer": response.text.strip(), "sources": sources}
            else:
                return {"answer": "I couldn't generate a response. Please try rephrasing your question.", "sources": []}
                
        except Exception as e:
            logger.error(f"Error in RAG query: {e}")
            # Fallback to direct answer
            return _answer_direct_question(project_id, question, project_data)
            
    except Exception as e:
        logger.error(f"Error in query_project: {e}")
        logger.error(traceback.format_exc())
        return {"answer": f"I'm experiencing technical difficulties while trying to answer your question about {project_id}. Please try again in a moment.", "sources": []}

def _answer_direct_question(project_id: str, question: str, project_data: Dict[str, Any]) -> dict:
    """Answer questions directly from project data without RAG"""
    try:
        lower_question = question.lower()
        repo_stats = project_data.get("repository_stats", {})
        
        # Handle specific question types
        if "contributor" in lower_question or "who worked" in lower_question:
            contributors = project_data.get("contributors", [])
            if contributors:
                contributor_list = [f"{c.get('login', 'Unknown')} ({c.get('contributions', 0)} contributions)" for c in contributors[:5]]
                return {"answer": f"Top contributors to {project_id}: {', '.join(contributor_list)}", "sources": [{"source": f"https://github.com/{project_id}/graphs/contributors", "type": "contributors"}]}
            else:
                return {"answer": "No contributor data available.", "sources": [{"source": "Direct GitHub API Call", "type": "contributors"}]}
        
        elif "language" in lower_question:
            language = repo_stats.get("language", "Unknown")
            return {"answer": f"The primary language for {project_id} is {language}.", "sources": [{"source": f"https://github.com/{project_id}", "type": "repository_info"}]}
        
        elif "star" in lower_question:
            stars = repo_stats.get("stars", 0)
            return {"answer": f"{project_id} has {stars} stars on GitHub.", "sources": [{"source": f"https://github.com/{project_id}", "type": "repository_info"}]}
        
        elif "fork" in lower_question:
            forks = repo_stats.get("forks", 0)
            return {"answer": f"{project_id} has {forks} forks on GitHub.", "sources": [{"source": f"https://github.com/{project_id}", "type": "repository_info"}]}
        
        elif "commit" in lower_question:
            commits = project_data.get("commits", [])
            commit_count = len(commits)
            return {"answer": f"{project_id} has {commit_count} recent commits available.", "sources": [{"source": f"https://github.com/{project_id}/commits", "type": "commits"}]}
        
        else:
            # General project information
            description = repo_stats.get("description", "No description available")
            language = repo_stats.get("language", "Unknown")
            stars = repo_stats.get("stars", 0)
            
            answer = f"{project_id} is a {language} project"
            if description and description != "No description available":
                answer += f" that {description.lower()}"
            if stars > 0:
                answer += f" with {stars} stars on GitHub"
            answer += "."
            
            return {"answer": answer, "sources": [{"source": f"https://github.com/{project_id}", "type": "repository_info"}]}
            
    except Exception as e:
        logger.error(f"Error in direct answer: {e}")
        return {"answer": f"I can see you're asking about {project_id}, but I'm having trouble accessing the project information at the moment.", "sources": []}

def summarize_project(project_id: str, user=None) -> str:
    """Generate a summary using complete RAG architecture with vector embeddings"""
    try:
        logger.info(f"Generating AI summary for {project_id} using RAG architecture...")
        
        # Get project data (uses cache if available)
        project_data = _get_basic_project_info(project_id, user)
        
        # Initialize vector store with project data
        if project_id not in project_collections:
            _initialize_vector_store(project_id, user)
        
        collection = project_collections.get(project_id)
        if collection is None:
            logger.warning(f"No vector collection available for {project_id}, using fallback")
            return _generate_short_summary(project_id, project_data.get("repository_stats", {}))
        
        # Use RAG pipeline for summary generation
        try:
            # Query the vector store for relevant context
            summary_query = f"What is {project_id}? Describe the main purpose and features of this project."
            results = collection.query(query_texts=[summary_query], n_results=5)
            
            context_docs = results['documents'][0]
            sources = results['metadatas'][0]
            
            if not context_docs:
                logger.warning(f"No relevant documents found for {project_id}")
                return _generate_short_summary(project_id, project_data.get("repository_stats", {}))
            
            # Combine context documents
            context_str = "\n\n---\n\n".join(context_docs)
            
            # Check if Gemini API is available
            if genai is None:
                logger.warning("Gemini API not available, using fallback summary")
                return _generate_short_summary(project_id, project_data.get("repository_stats", {}))
            
            # Create RAG-based prompt
            prompt = f"""
            You are an AI assistant analyzing GitHub repositories using RAG (Retrieval Augmented Generation).
            
            Based on the retrieved context from the vector database for repository '{project_id}', 
            provide a concise, informative summary (1-2 sentences) that explains:
            - What the project does
            - Its main purpose and key features
            - Technology stack if mentioned
            
            Retrieved Context:
            {context_str}
            
            Repository: {project_id}
            
            Provide a clear, concise summary:
            """
            
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(prompt)
            
            if response and response.text:
                summary = response.text.strip()
                # Ensure summary is concise
                if len(summary) > 300:
                    summary = summary[:300] + "..."
                return summary
            else:
                logger.warning(f"No AI response generated for {project_id}, using fallback")
                return _generate_short_summary(project_id, project_data.get("repository_stats", {}))
                
        except Exception as e:
            logger.error(f"Error in RAG summary generation for {project_id}: {e}")
            logger.error(traceback.format_exc())
            return _generate_short_summary(project_id, project_data.get("repository_stats", {}))
            
    except Exception as e:
        logger.error(f"Error in summarize_project: {e}")
        logger.error(traceback.format_exc())
        return _generate_short_summary(project_id, project_data.get("repository_stats", {}))

def _generate_short_summary(project_id: str, repo_stats: Dict[str, Any]) -> str:
    """Generate a very short summary without AI"""
    try:
        # Extract basic info
        language = repo_stats.get("language", "software")
        description = repo_stats.get("description", "")
        stars = repo_stats.get("stars", 0)
        
        # Extract repo name for analysis
        owner, repo_name = project_id.split('/', 1) if '/' in project_id else (project_id, '')
        
        # Build short summary based on available data
        if description and description != "Repository information not available" and description != "Repository information not available due to API rate limits":
            return f"{project_id} is a {language} project that {description.lower()}"
        
        # Analyze repository name for patterns
        repo_lower = repo_name.lower()
        
        if 'hack' in repo_lower:
            # Extract the main topic from hackathon name
            topic = repo_lower.replace('hack', '').replace('ies', '').replace('-', ' ').replace('_', ' ').strip()
            if topic:
                return f"{project_id} is a hackathon project focused on {topic}"
            else:
                return f"{project_id} is a hackathon project"
        
        elif 'adobe' in repo_lower:
            if 'r1' in repo_lower:
                return f"{project_id} is an Adobe R1 hackathon project"
            else:
                return f"{project_id} is an Adobe-related {language} project"
        
        elif 'git' in repo_lower and 'harbor' in repo_lower:
            return f"{project_id} is a Git management tool project"
        
        elif 'summary' in repo_lower:
            return f"{project_id} contains documentation and summaries"
        
        elif 'api' in repo_lower:
            return f"{project_id} is an API-related {language} project"
        
        elif 'web' in repo_lower or 'app' in repo_lower:
            return f"{project_id} is a web application project"
        
        elif 'mobile' in repo_lower or 'ios' in repo_lower or 'android' in repo_lower:
            return f"{project_id} is a mobile application project"
        
        elif 'data' in repo_lower or 'ml' in repo_lower or 'ai' in repo_lower:
            return f"{project_id} is a data science or AI project"
        
        else:
            # Generic summary based on language
            if language and language != "Unknown":
                return f"{project_id} is a {language} project by {owner}"
            else:
                return f"{project_id} is a software project by {owner}"
            
    except Exception as e:
        logger.error(f"Error generating short summary: {e}")
        return f"{project_id} is a software project."

def generate_repository_summary(full_name: str, repository_data: Dict[str, Any], user: Optional[UserInDB] = None) -> str:
    """Generate an AI-powered summary for an external repository"""
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
            context_parts.append(f"README content (excerpt):\n{readme[:2000]}")

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

        if response and response.text:
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
        else:
            # Fallback summary
            repo_info = repository_data.get("repository_info", {})
            return f"{full_name} is a {repo_info.get('language', 'software')} repository with {repo_info.get('stars', 0)} stars. {repo_info.get('description', 'No description available.')}"

    except Exception as e:
        logger.error(f"Error generating repository summary: {e}")
        logger.error(traceback.format_exc())
        # Fallback summary
        repo_info = repository_data.get("repository_info", {})
        return f"{full_name} is a {repo_info.get('language', 'software')} repository with {repo_info.get('stars', 0)} stars. {repo_info.get('description', 'No description available.')}"
