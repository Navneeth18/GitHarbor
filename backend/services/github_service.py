# FILE: services/github_service.py
# ----------------------
# REVISED: Added a new function to get specific contributor stats.

import base64
import requests
from functools import lru_cache
from typing import List, Dict, Any
from core.config import GITHUB_PAT

# Set up headers for authenticated GitHub API requests
HEADERS = {}
if GITHUB_PAT:
    HEADERS['Authorization'] = f'token {GITHUB_PAT}'
else:
    print("WARNING: No GITHUB_PAT found. API requests will be severely rate-limited.")

BASE_URL = "https://api.github.com/repos/"

@lru_cache(maxsize=32)
def get_live_project_details(project_id: str) -> Dict[str, Any]:
    """ Fetches high-level project details for the dashboard. """
    print(f"Fetching LIVE data for {project_id} dashboard...")
    commits_url = f"{BASE_URL}{project_id}/commits?per_page=10"
    prs_url = f"{BASE_URL}{project_id}/pulls?state=all&per_page=10&sort=updated&direction=desc"
    contributors_url = f"{BASE_URL}{project_id}/contributors?per_page=5"
    readme_url = f"{BASE_URL}{project_id}/readme"

    commits_response = requests.get(commits_url, headers=HEADERS)
    prs_response = requests.get(prs_url, headers=HEADERS)
    contributors_response = requests.get(contributors_url, headers=HEADERS)
    readme_response = requests.get(readme_url, headers=HEADERS)

    readme_content = ""
    if readme_response.ok:
        readme_content = base64.b64decode(readme_response.json()['content']).decode('utf-8')

    return {
        "project_id": project_id,
        "commits": commits_response.json() if commits_response.ok else [],
        "pull_requests": prs_response.json() if prs_response.ok else [],
        "contributors": contributors_response.json() if contributors_response.ok else [],
        "documentation": readme_content
    }

def get_text_content_for_rag(project_id: str) -> List[Dict[str, str]]:
    """ Gathers all relevant text content for the RAG pipeline. """
    print(f"Gathering all text content for RAG pipeline for {project_id}...")
    documents = []
    details = get_live_project_details(project_id)
    if details.get("documentation"):
        documents.append({"id": f"{project_id}_readme", "content": f"Project README:\n{details['documentation']}", "metadata": {"source": "README.md"}})
    
    issues_url = f"{BASE_URL}{project_id}/issues?state=all&per_page=100"
    issues_response = requests.get(issues_url, headers=HEADERS)
    for item in (issues_response.json() if issues_response.ok else []):
        if item.get('body'):
            documents.append({"id": f"issue_{item['id']}", "content": f"Issue Title: {item.get('title', '')}\n\nBody:\n{item.get('body')}", "metadata": {"source": item.get('html_url', '')}})

    prs_url = f"{BASE_URL}{project_id}/pulls?state=all&per_page=100"
    prs_response = requests.get(prs_url, headers=HEADERS)
    for item in (prs_response.json() if prs_response.ok else []):
        if item.get('body'):
            documents.append({"id": f"pr_{item['id']}", "content": f"Pull Request Title: {item.get('title', '')}\n\nBody:\n{item.get('body')}", "metadata": {"source": item.get('html_url', '')}})
            
    return documents

# --- NEW FUNCTION FOR FACTUAL QUERIES ---
def get_formatted_contributor_stats(project_id: str) -> str:
    """
    Fetches contributor data directly from the API and formats it as a string answer.
    """
    print(f"Fetching direct contributor stats for {project_id}...")
    contributors_url = f"{BASE_URL}{project_id}/contributors"
    response = requests.get(contributors_url, headers=HEADERS)
    
    if not response.ok:
        return "I was unable to fetch the contributor data from the GitHub API."

    data = response.json()
    if not data:
        return "No contributor data could be found for this project."

    answer = f"This project has {len(data)} contributor(s). Here are the details:\n\n"
    for contributor in data:
        username = contributor.get('login', 'N/A')
        contributions = contributor.get('contributions', 'N/A')
        answer += f"- **{username}**: {contributions} contributions\n"
        
    return answer
