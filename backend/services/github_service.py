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
    """ Fetches high-level project details for the dashboard including pushes and merges. """
    print(f"Fetching LIVE data for {project_id} dashboard...")

    # API endpoints
    commits_url = f"{BASE_URL}{project_id}/commits?per_page=15"
    prs_url = f"{BASE_URL}{project_id}/pulls?state=all&per_page=15&sort=updated&direction=desc"
    contributors_url = f"{BASE_URL}{project_id}/contributors?per_page=10"
    readme_url = f"{BASE_URL}{project_id}/readme"
    events_url = f"{BASE_URL}{project_id}/events?per_page=30"  # For push events
    repo_url = f"{BASE_URL}{project_id}"  # For repository stats

    # Make API requests
    commits_response = requests.get(commits_url, headers=HEADERS)
    prs_response = requests.get(prs_url, headers=HEADERS)
    contributors_response = requests.get(contributors_url, headers=HEADERS)
    readme_response = requests.get(readme_url, headers=HEADERS)
    events_response = requests.get(events_url, headers=HEADERS)
    repo_response = requests.get(repo_url, headers=HEADERS)

    # Process README content
    readme_content = ""
    if readme_response.ok:
        readme_content = base64.b64decode(readme_response.json()['content']).decode('utf-8')

    # Process events to extract push information
    pushes = []
    if events_response.ok:
        events = events_response.json()
        for event in events:
            if event.get('type') == 'PushEvent':
                push_info = {
                    "id": event.get('id'),
                    "actor": event.get('actor', {}).get('login'),
                    "created_at": event.get('created_at'),
                    "ref": event.get('payload', {}).get('ref'),
                    "commits_count": len(event.get('payload', {}).get('commits', [])),
                    "commits": event.get('payload', {}).get('commits', [])[:3],  # First 3 commits
                    "repository": event.get('repo', {}).get('name')
                }
                pushes.append(push_info)

    # Process pull requests to extract merge information
    merges = []
    if prs_response.ok:
        prs = prs_response.json()
        for pr in prs:
            if pr.get('merged_at'):  # Only merged PRs
                merge_info = {
                    "id": pr.get('id'),
                    "number": pr.get('number'),
                    "title": pr.get('title'),
                    "user": pr.get('user', {}).get('login'),
                    "merged_at": pr.get('merged_at'),
                    "merged_by": pr.get('merged_by', {}).get('login') if pr.get('merged_by') else None,
                    "base_branch": pr.get('base', {}).get('ref'),
                    "head_branch": pr.get('head', {}).get('ref'),
                    "commits": pr.get('commits'),
                    "additions": pr.get('additions'),
                    "deletions": pr.get('deletions'),
                    "changed_files": pr.get('changed_files')
                }
                merges.append(merge_info)

    # Process repository statistics
    repo_stats = {}
    if repo_response.ok:
        repo_data = repo_response.json()
        repo_stats = {
            "stars": repo_data.get('stargazers_count', 0),
            "forks": repo_data.get('forks_count', 0),
            "watchers": repo_data.get('watchers_count', 0),
            "open_issues": repo_data.get('open_issues_count', 0),
            "size": repo_data.get('size', 0),
            "language": repo_data.get('language'),
            "created_at": repo_data.get('created_at'),
            "updated_at": repo_data.get('updated_at'),
            "pushed_at": repo_data.get('pushed_at'),
            "default_branch": repo_data.get('default_branch'),
            "description": repo_data.get('description'),
            "homepage": repo_data.get('homepage'),
            "topics": repo_data.get('topics', []),
            "license": repo_data.get('license', {}).get('name') if repo_data.get('license') else None,
            "visibility": repo_data.get('visibility', 'public'),
            "archived": repo_data.get('archived', False),
            "disabled": repo_data.get('disabled', False),
            "has_issues": repo_data.get('has_issues', False),
            "has_projects": repo_data.get('has_projects', False),
            "has_wiki": repo_data.get('has_wiki', False),
            "has_pages": repo_data.get('has_pages', False),
            "has_downloads": repo_data.get('has_downloads', False),
            "network_count": repo_data.get('network_count', 0),
            "subscribers_count": repo_data.get('subscribers_count', 0)
        }

    return {
        "project_id": project_id,
        "commits": commits_response.json() if commits_response.ok else [],
        "pull_requests": prs_response.json() if prs_response.ok else [],
        "contributors": contributors_response.json() if contributors_response.ok else [],
        "documentation": readme_content,
        "pushes": pushes,
        "merges": merges,
        "repository_stats": repo_stats
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
