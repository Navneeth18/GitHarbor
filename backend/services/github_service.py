# FILE: services/github_service.py (Updated)
# ----------------------
# This service is now heavily modified to make calls on behalf of the user.
import requests
import base64
from functools import lru_cache
from typing import List, Dict, Any
from models.user import UserInDB
from . import encryption_service
import time

BASE_URL = "https://api.github.com"
REPOS_BASE_URL = "https://api.github.com/repos/"

def get_user_repos_for_user(user: UserInDB) -> List[Dict[str, Any]]:
    """
    Fetches a user's own public repos and repos they've contributed to.
    """
    if not user.encrypted_github_token:
        print("No encrypted token available")
        return []

    try:
        decrypted_token = encryption_service.decrypt_token(user.encrypted_github_token)
        headers = {
            "Authorization": f"token {decrypted_token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Kortex-App"
        }

        # Fetch user's own repos
        repos_url = f"{BASE_URL}/user/repos?type=owner&sort=updated&per_page=100"
        print(f"Fetching repos from: {repos_url}")
        
        repos_response = requests.get(repos_url, headers=headers, timeout=10)
        print(f"Repos response status: {repos_response.status_code}")
        
        if repos_response.ok:
            user_repos = repos_response.json()
            print(f"Successfully fetched {len(user_repos)} repositories")
            return user_repos
        else:
            print(f"Failed to fetch repos: {repos_response.status_code} - {repos_response.text}")
            return []
            
    except Exception as e:
        print(f"Error fetching user repos: {e}")
        return []

def make_github_request(url: str, user: UserInDB = None, timeout: int = 10) -> Dict[str, Any]:
    """
    Helper function to make GitHub API requests with proper error handling
    """
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Kortex-App"
    }
    
    if user and user.encrypted_github_token:
        try:
            decrypted_token = encryption_service.decrypt_token(user.encrypted_github_token)
            headers["Authorization"] = f"token {decrypted_token}"
            print(f"Using authenticated request for {url}")
        except Exception as e:
            print(f"Failed to decrypt token: {e}")
    else:
        print(f"Using public request for {url}")
    
    try:
        response = requests.get(url, headers=headers, timeout=timeout)
        print(f"Request to {url} returned status: {response.status_code}")
        
        if response.status_code == 200:
            return {"success": True, "data": response.json()}
        elif response.status_code == 404:
            return {"success": False, "error": "Repository not found"}
        elif response.status_code == 401:
            return {"success": False, "error": "Unauthorized - token may be invalid"}
        elif response.status_code == 403:
            return {"success": False, "error": "Rate limited or access forbidden"}
        else:
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
            
    except requests.exceptions.Timeout:
        return {"success": False, "error": "Request timeout"}
    except requests.exceptions.RequestException as e:
        return {"success": False, "error": f"Request failed: {str(e)}"}

@lru_cache(maxsize=32)
def get_live_project_details(project_id: str, user: UserInDB = None) -> Dict[str, Any]:
    """ Fetches high-level project details for the dashboard including pushes and merges. """
    print(f"Fetching LIVE data for {project_id} dashboard...")
    print(f"User: {user.username if user else 'None'}")

    # API endpoints
    repo_url = f"{REPOS_BASE_URL}{project_id}"
    commits_url = f"{REPOS_BASE_URL}{project_id}/commits?per_page=15"
    prs_url = f"{REPOS_BASE_URL}{project_id}/pulls?state=all&per_page=15&sort=updated&direction=desc"
    contributors_url = f"{REPOS_BASE_URL}{project_id}/contributors?per_page=10"
    readme_url = f"{REPOS_BASE_URL}{project_id}/readme"
    events_url = f"{REPOS_BASE_URL}{project_id}/events?per_page=30"

    # Make all requests
    repo_result = make_github_request(repo_url, user)
    commits_result = make_github_request(commits_url, user)
    prs_result = make_github_request(prs_url, user)
    contributors_result = make_github_request(contributors_url, user)
    readme_result = make_github_request(readme_url, user)
    events_result = make_github_request(events_url, user)

    # Process repository data
    repo_stats = {}
    if repo_result["success"]:
        repo_data = repo_result["data"]
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
    else:
        print(f"Failed to get repo data: {repo_result['error']}")

    # Process README content
    readme_content = ""
    if readme_result["success"]:
        try:
            readme_data = readme_result["data"]
            readme_content = base64.b64decode(readme_data['content']).decode('utf-8')
        except Exception as e:
            print(f"Failed to decode README: {e}")

    # Process events to extract push information
    pushes = []
    if events_result["success"]:
        events = events_result["data"]
        for event in events:
            if event.get('type') == 'PushEvent':
                push_info = {
                    "id": event.get('id'),
                    "actor": event.get('actor', {}).get('login'),
                    "created_at": event.get('created_at'),
                    "ref": event.get('payload', {}).get('ref'),
                    "commits_count": len(event.get('payload', {}).get('commits', [])),
                    "commits": event.get('payload', {}).get('commits', [])[:3],
                    "repository": event.get('repo', {}).get('name')
                }
                pushes.append(push_info)

    # Process pull requests to extract merge information
    merges = []
    if prs_result["success"]:
        prs = prs_result["data"]
        for pr in prs:
            if pr.get('merged_at'):
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

    return {
        "project_id": project_id,
        "commits": commits_result["data"] if commits_result["success"] else [],
        "pull_requests": prs_result["data"] if prs_result["success"] else [],
        "contributors": contributors_result["data"] if contributors_result["success"] else [],
        "documentation": readme_content,
        "pushes": pushes,
        "merges": merges,
        "repository_stats": repo_stats
    }

def get_project_issues(project_id: str, user: UserInDB = None) -> List[Dict[str, Any]]:
    """ Fetches issues for a specific project """
    print(f"Fetching issues for {project_id}...")
    
    issues_url = f"{REPOS_BASE_URL}{project_id}/issues?state=all&per_page=50&sort=updated&direction=desc"
    result = make_github_request(issues_url, user)
    
    if result["success"]:
        issues = result["data"]
        # Filter out pull requests (GitHub API returns both issues and PRs)
        issues_only = [issue for issue in issues if 'pull_request' not in issue]
        print(f"Successfully fetched {len(issues_only)} issues")
        return issues_only
    else:
        print(f"Failed to fetch issues: {result['error']}")
        return []

def get_project_pull_requests(project_id: str, user: UserInDB = None) -> List[Dict[str, Any]]:
    """ Fetches pull requests for a specific project """
    print(f"Fetching pull requests for {project_id}...")
    
    prs_url = f"{REPOS_BASE_URL}{project_id}/pulls?state=all&per_page=50&sort=updated&direction=desc"
    result = make_github_request(prs_url, user)
    
    if result["success"]:
        print(f"Successfully fetched {len(result['data'])} pull requests")
        return result["data"]
    else:
        print(f"Failed to fetch pull requests: {result['error']}")
        return []

def get_project_commits(project_id: str, user: UserInDB = None) -> List[Dict[str, Any]]:
    """ Fetches commit history for a specific project """
    print(f"Fetching commits for {project_id}...")
    
    commits_url = f"{REPOS_BASE_URL}{project_id}/commits?per_page=50"
    result = make_github_request(commits_url, user)
    
    if result["success"]:
        print(f"Successfully fetched {len(result['data'])} commits")
        return result["data"]
    else:
        print(f"Failed to fetch commits: {result['error']}")
        return []

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
