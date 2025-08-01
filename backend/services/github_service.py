# FILE: services/github_service.py (Updated)
# ----------------------
# This service is now heavily modified to make calls on behalf of the user.
import requests
import base64
from functools import lru_cache
from typing import List, Dict, Any
from models.user import UserInDB
from . import encryption_service

BASE_URL = "https://api.github.com"
REPOS_BASE_URL = "https://api.github.com/repos/"

def get_user_repos_for_user(user: UserInDB) -> List[Dict[str, Any]]:
    """
    Fetches a user's own public repos and repos they've contributed to.
    """
    if not user.encrypted_github_token:
        return []

    decrypted_token = encryption_service.decrypt_token(user.encrypted_github_token)
    headers = {"Authorization": f"token {decrypted_token}"}

    # Fetch user's own repos
    repos_url = f"{BASE_URL}/user/repos?type=owner&sort=updated"
    repos_response = requests.get(repos_url, headers=headers)
    user_repos = repos_response.json() if repos_response.ok else []

    # A more complex implementation could also fetch contributed repos,
    # but for a hackathon, fetching the user's own repos is a great start.

    return user_repos

@lru_cache(maxsize=32)
def get_live_project_details(project_id: str, user: UserInDB = None) -> Dict[str, Any]:
    """ Fetches high-level project details for the dashboard including pushes and merges. """
    print(f"Fetching LIVE data for {project_id} dashboard...")
    print(f"User: {user.username if user else 'None'}")

    # API endpoints
    commits_url = f"{REPOS_BASE_URL}{project_id}/commits?per_page=15"
    prs_url = f"{REPOS_BASE_URL}{project_id}/pulls?state=all&per_page=15&sort=updated&direction=desc"
    contributors_url = f"{REPOS_BASE_URL}{project_id}/contributors?per_page=10"
    readme_url = f"{REPOS_BASE_URL}{project_id}/readme"
    events_url = f"{REPOS_BASE_URL}{project_id}/events?per_page=30"  # For push events
    repo_url = f"{REPOS_BASE_URL}{project_id}"  # For repository stats

    # Use user's token if available, otherwise use basic headers
    headers = {"Accept": "application/vnd.github.v3+json"}
    if user and user.encrypted_github_token:
        try:
            decrypted_token = encryption_service.decrypt_token(user.encrypted_github_token)
            headers["Authorization"] = f"token {decrypted_token}"
            print(f"Using user's GitHub token for API calls")
        except Exception as e:
            print(f"Failed to decrypt user token: {e}")
    else:
        print(f"No user token available, using public API")

    # Make API requests
    print(f"Making API requests to GitHub...")
    commits_response = requests.get(commits_url, headers=headers)
    prs_response = requests.get(prs_url, headers=headers)
    contributors_response = requests.get(contributors_url, headers=headers)
    readme_response = requests.get(readme_url, headers=headers)
    events_response = requests.get(events_url, headers=headers)
    repo_response = requests.get(repo_url, headers=headers)

    # Log response statuses
    print(f"API Response Statuses:")
    print(f"  Commits: {commits_response.status_code}")
    print(f"  PRs: {prs_response.status_code}")
    print(f"  Contributors: {contributors_response.status_code}")
    print(f"  README: {readme_response.status_code}")
    print(f"  Events: {events_response.status_code}")
    print(f"  Repo: {repo_response.status_code}")

    # Check if any critical requests failed
    if repo_response.status_code == 404:
        print(f"ERROR: Repository {project_id} not found or access denied")
        raise Exception(f"Repository {project_id} not found or access denied")
    
    if repo_response.status_code != 200:
        print(f"ERROR: Repository API failed with status {repo_response.status_code}")
        print(f"Response: {repo_response.text}")
        raise Exception(f"GitHub API error: {repo_response.status_code}")

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

    headers = {"Accept": "application/vnd.github.v3+json"}

    issues_url = f"{REPOS_BASE_URL}{project_id}/issues?state=all&per_page=100"
    issues_response = requests.get(issues_url, headers=headers)
    for item in (issues_response.json() if issues_response.ok else []):
        if item.get('body'):
            documents.append({"id": f"issue_{item['id']}", "content": f"Issue Title: {item.get('title', '')}\n\nBody:\n{item.get('body')}", "metadata": {"source": item.get('html_url', '')}})

    prs_url = f"{REPOS_BASE_URL}{project_id}/pulls?state=all&per_page=100"
    prs_response = requests.get(prs_url, headers=headers)
    for item in (prs_response.json() if prs_response.ok else []):
        if item.get('body'):
            documents.append({"id": f"pr_{item['id']}", "content": f"Pull Request Title: {item.get('title', '')}\n\nBody:\n{item.get('body')}", "metadata": {"source": item.get('html_url', '')}})

    return documents

def get_formatted_contributor_stats(project_id: str) -> str:
    """ Returns formatted contributor statistics for display """
    details = get_live_project_details(project_id)
    contributors = details.get('contributors', [])

    if not contributors:
        return "No contributor data available."

    stats = []
    for contributor in contributors[:10]:  # Top 10 contributors
        stats.append(f"- {contributor.get('login', 'Unknown')}: {contributor.get('contributions', 0)} contributions")

    return "\n".join(stats)
