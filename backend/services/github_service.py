# FILE: services/github_service.py (Updated)
# ----------------------
# This service is now heavily modified to make calls on behalf of the user.
import requests
import base64
import time
from functools import lru_cache
from typing import List, Dict, Any, Optional
from models.user import UserInDB
from . import encryption_service

BASE_URL = "https://api.github.com"
REPOS_BASE_URL = "https://api.github.com/repos/"
SEARCH_BASE_URL = "https://api.github.com/search/"

# Rate limiting for GitHub Search API
SEARCH_RATE_LIMIT = {
    'requests_per_minute': 30,
    'last_request_time': 0,
    'request_count': 0,
    'reset_time': 0
}

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

def _check_rate_limit():
    """Check and enforce GitHub Search API rate limits"""
    current_time = time.time()

    # Reset counter if a minute has passed
    if current_time - SEARCH_RATE_LIMIT['reset_time'] >= 60:
        SEARCH_RATE_LIMIT['request_count'] = 0
        SEARCH_RATE_LIMIT['reset_time'] = current_time

    # Check if we've exceeded the rate limit
    if SEARCH_RATE_LIMIT['request_count'] >= SEARCH_RATE_LIMIT['requests_per_minute']:
        sleep_time = 60 - (current_time - SEARCH_RATE_LIMIT['reset_time'])
        if sleep_time > 0:
            time.sleep(sleep_time)
            SEARCH_RATE_LIMIT['request_count'] = 0
            SEARCH_RATE_LIMIT['reset_time'] = time.time()

    SEARCH_RATE_LIMIT['request_count'] += 1
    SEARCH_RATE_LIMIT['last_request_time'] = current_time

def _make_search_request(url: str, headers: Dict[str, str]) -> Dict[str, Any]:
    """Make a rate-limited search request to GitHub API"""
    _check_rate_limit()

    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 403:
            # Rate limit exceeded
            print(f"GitHub API rate limit exceeded: {response.headers.get('X-RateLimit-Remaining', 'Unknown')}")
            return {"error": "Rate limit exceeded", "items": [], "total_count": 0}
        elif response.status_code == 422:
            # Validation failed
            return {"error": "Invalid search query", "items": [], "total_count": 0}
        else:
            print(f"GitHub API error: {response.status_code} - {response.text}")
            return {"error": f"API error: {response.status_code}", "items": [], "total_count": 0}
    except requests.exceptions.RequestException as e:
        print(f"Request error: {e}")
        return {"error": "Network error", "items": [], "total_count": 0}

def search_repositories_global(
    query: str,
    sort: str = "best-match",
    order: str = "desc",
    per_page: int = 30,
    page: int = 1,
    user: Optional[UserInDB] = None
) -> Dict[str, Any]:
    """
    Search for repositories across all of GitHub

    Args:
        query: Search query string
        sort: Sort field (stars, forks, help-wanted-issues, updated, best-match)
        order: Sort order (asc, desc)
        per_page: Results per page (max 100)
        page: Page number
        user: Optional user for authenticated requests
    """
    # Build search URL
    params = {
        'q': query,
        'sort': sort,
        'order': order,
        'per_page': min(per_page, 100),
        'page': page
    }

    url = f"{SEARCH_BASE_URL}repositories?" + "&".join([f"{k}={v}" for k, v in params.items()])

    # Set up headers
    headers = {"Accept": "application/vnd.github.v3+json"}
    if user and user.encrypted_github_token:
        try:
            decrypted_token = encryption_service.decrypt_token(user.encrypted_github_token)
            headers["Authorization"] = f"token {decrypted_token}"
        except Exception as e:
            print(f"Error decrypting token: {e}")

    result = _make_search_request(url, headers)

    # Format the results
    if "items" in result:
        formatted_items = []
        for repo in result["items"]:
            formatted_items.append({
                "id": repo.get("full_name"),
                "name": repo.get("name"),
                "full_name": repo.get("full_name"),
                "description": repo.get("description"),
                "html_url": repo.get("html_url"),
                "clone_url": repo.get("clone_url"),
                "language": repo.get("language"),
                "stargazers_count": repo.get("stargazers_count", 0),
                "forks_count": repo.get("forks_count", 0),
                "watchers_count": repo.get("watchers_count", 0),
                "size": repo.get("size", 0),
                "default_branch": repo.get("default_branch"),
                "open_issues_count": repo.get("open_issues_count", 0),
                "is_fork": repo.get("fork", False),
                "created_at": repo.get("created_at"),
                "updated_at": repo.get("updated_at"),
                "pushed_at": repo.get("pushed_at"),
                "owner": {
                    "login": repo.get("owner", {}).get("login"),
                    "avatar_url": repo.get("owner", {}).get("avatar_url"),
                    "html_url": repo.get("owner", {}).get("html_url"),
                    "type": repo.get("owner", {}).get("type")
                },
                "topics": repo.get("topics", []),
                "visibility": repo.get("visibility", "public"),
                "license": repo.get("license", {}).get("name") if repo.get("license") else None
            })

        result["items"] = formatted_items

    return result

def search_code_global(
    query: str,
    sort: str = "best-match",
    order: str = "desc",
    per_page: int = 30,
    page: int = 1,
    user: Optional[UserInDB] = None
) -> Dict[str, Any]:
    """
    Search for code across all of GitHub

    Args:
        query: Search query string (can include qualifiers like language:python)
        sort: Sort field (indexed, best-match)
        order: Sort order (asc, desc)
        per_page: Results per page (max 100)
        page: Page number
        user: Optional user for authenticated requests
    """
    params = {
        'q': query,
        'sort': sort,
        'order': order,
        'per_page': min(per_page, 100),
        'page': page
    }

    url = f"{SEARCH_BASE_URL}code?" + "&".join([f"{k}={v}" for k, v in params.items()])

    headers = {"Accept": "application/vnd.github.v3+json"}
    if user and user.encrypted_github_token:
        try:
            decrypted_token = encryption_service.decrypt_token(user.encrypted_github_token)
            headers["Authorization"] = f"token {decrypted_token}"
        except Exception as e:
            print(f"Error decrypting token: {e}")

    result = _make_search_request(url, headers)

    # Format the results
    if "items" in result:
        formatted_items = []
        for code in result["items"]:
            formatted_items.append({
                "name": code.get("name"),
                "path": code.get("path"),
                "sha": code.get("sha"),
                "url": code.get("url"),
                "git_url": code.get("git_url"),
                "html_url": code.get("html_url"),
                "repository": {
                    "id": code.get("repository", {}).get("id"),
                    "name": code.get("repository", {}).get("name"),
                    "full_name": code.get("repository", {}).get("full_name"),
                    "html_url": code.get("repository", {}).get("html_url"),
                    "description": code.get("repository", {}).get("description"),
                    "language": code.get("repository", {}).get("language"),
                    "stargazers_count": code.get("repository", {}).get("stargazers_count", 0),
                    "owner": {
                        "login": code.get("repository", {}).get("owner", {}).get("login"),
                        "avatar_url": code.get("repository", {}).get("owner", {}).get("avatar_url"),
                        "html_url": code.get("repository", {}).get("owner", {}).get("html_url")
                    }
                },
                "score": code.get("score", 0)
            })

        result["items"] = formatted_items

    return result

def search_users_global(
    query: str,
    sort: str = "best-match",
    order: str = "desc",
    per_page: int = 30,
    page: int = 1,
    user: Optional[UserInDB] = None
) -> Dict[str, Any]:
    """
    Search for users across all of GitHub

    Args:
        query: Search query string
        sort: Sort field (followers, repositories, joined, best-match)
        order: Sort order (asc, desc)
        per_page: Results per page (max 100)
        page: Page number
        user: Optional user for authenticated requests
    """
    params = {
        'q': query,
        'sort': sort,
        'order': order,
        'per_page': min(per_page, 100),
        'page': page
    }

    url = f"{SEARCH_BASE_URL}users?" + "&".join([f"{k}={v}" for k, v in params.items()])

    headers = {"Accept": "application/vnd.github.v3+json"}
    if user and user.encrypted_github_token:
        try:
            decrypted_token = encryption_service.decrypt_token(user.encrypted_github_token)
            headers["Authorization"] = f"token {decrypted_token}"
        except Exception as e:
            print(f"Error decrypting token: {e}")

    result = _make_search_request(url, headers)

    # Format the results
    if "items" in result:
        formatted_items = []
        for github_user in result["items"]:
            formatted_items.append({
                "login": github_user.get("login"),
                "id": github_user.get("id"),
                "avatar_url": github_user.get("avatar_url"),
                "gravatar_id": github_user.get("gravatar_id"),
                "url": github_user.get("url"),
                "html_url": github_user.get("html_url"),
                "followers_url": github_user.get("followers_url"),
                "following_url": github_user.get("following_url"),
                "repos_url": github_user.get("repos_url"),
                "type": github_user.get("type"),
                "score": github_user.get("score", 0),
                "name": github_user.get("name"),
                "company": github_user.get("company"),
                "blog": github_user.get("blog"),
                "location": github_user.get("location"),
                "email": github_user.get("email"),
                "bio": github_user.get("bio"),
                "public_repos": github_user.get("public_repos", 0),
                "public_gists": github_user.get("public_gists", 0),
                "followers": github_user.get("followers", 0),
                "following": github_user.get("following", 0),
                "created_at": github_user.get("created_at"),
                "updated_at": github_user.get("updated_at")
            })

        result["items"] = formatted_items

    return result

def search_issues_global(
    query: str,
    sort: str = "best-match",
    order: str = "desc",
    per_page: int = 30,
    page: int = 1,
    user: Optional[UserInDB] = None
) -> Dict[str, Any]:
    """
    Search for issues and pull requests across all of GitHub

    Args:
        query: Search query string (can include qualifiers like is:issue, is:pr)
        sort: Sort field (comments, reactions, author-date, committer-date, updated, created, best-match)
        order: Sort order (asc, desc)
        per_page: Results per page (max 100)
        page: Page number
        user: Optional user for authenticated requests
    """
    params = {
        'q': query,
        'sort': sort,
        'order': order,
        'per_page': min(per_page, 100),
        'page': page
    }

    url = f"{SEARCH_BASE_URL}issues?" + "&".join([f"{k}={v}" for k, v in params.items()])

    headers = {"Accept": "application/vnd.github.v3+json"}
    if user and user.encrypted_github_token:
        try:
            decrypted_token = encryption_service.decrypt_token(user.encrypted_github_token)
            headers["Authorization"] = f"token {decrypted_token}"
        except Exception as e:
            print(f"Error decrypting token: {e}")

    result = _make_search_request(url, headers)

    # Format the results
    if "items" in result:
        formatted_items = []
        for issue in result["items"]:
            formatted_items.append({
                "id": issue.get("id"),
                "number": issue.get("number"),
                "title": issue.get("title"),
                "body": issue.get("body", "")[:500] + ("..." if len(issue.get("body", "")) > 500 else ""),  # Truncate body
                "html_url": issue.get("html_url"),
                "state": issue.get("state"),
                "locked": issue.get("locked", False),
                "comments": issue.get("comments", 0),
                "created_at": issue.get("created_at"),
                "updated_at": issue.get("updated_at"),
                "closed_at": issue.get("closed_at"),
                "author_association": issue.get("author_association"),
                "user": {
                    "login": issue.get("user", {}).get("login"),
                    "avatar_url": issue.get("user", {}).get("avatar_url"),
                    "html_url": issue.get("user", {}).get("html_url"),
                    "type": issue.get("user", {}).get("type")
                },
                "labels": [
                    {
                        "name": label.get("name"),
                        "color": label.get("color"),
                        "description": label.get("description")
                    } for label in issue.get("labels", [])
                ],
                "assignees": [
                    {
                        "login": assignee.get("login"),
                        "avatar_url": assignee.get("avatar_url"),
                        "html_url": assignee.get("html_url")
                    } for assignee in issue.get("assignees", [])
                ],
                "repository": {
                    "id": issue.get("repository", {}).get("id"),
                    "name": issue.get("repository", {}).get("name"),
                    "full_name": issue.get("repository", {}).get("full_name"),
                    "html_url": issue.get("repository", {}).get("html_url"),
                    "description": issue.get("repository", {}).get("description"),
                    "owner": {
                        "login": issue.get("repository", {}).get("owner", {}).get("login"),
                        "avatar_url": issue.get("repository", {}).get("owner", {}).get("avatar_url"),
                        "html_url": issue.get("repository", {}).get("owner", {}).get("html_url")
                    }
                },
                "pull_request": issue.get("pull_request"),  # Present if this is a PR
                "score": issue.get("score", 0)
            })

        result["items"] = formatted_items

    return result

def search_commits_global(
    query: str,
    sort: str = "best-match",
    order: str = "desc",
    per_page: int = 30,
    page: int = 1,
    user: Optional[UserInDB] = None
) -> Dict[str, Any]:
    """
    Search for commits across all of GitHub

    Args:
        query: Search query string (can include qualifiers like author:username)
        sort: Sort field (author-date, committer-date, best-match)
        order: Sort order (asc, desc)
        per_page: Results per page (max 100)
        page: Page number
        user: Optional user for authenticated requests
    """
    params = {
        'q': query,
        'sort': sort,
        'order': order,
        'per_page': min(per_page, 100),
        'page': page
    }

    url = f"{SEARCH_BASE_URL}commits?" + "&".join([f"{k}={v}" for k, v in params.items()])

    headers = {"Accept": "application/vnd.github.v3+json"}
    if user and user.encrypted_github_token:
        try:
            decrypted_token = encryption_service.decrypt_token(user.encrypted_github_token)
            headers["Authorization"] = f"token {decrypted_token}"
        except Exception as e:
            print(f"Error decrypting token: {e}")

    result = _make_search_request(url, headers)

    # Format the results
    if "items" in result:
        formatted_items = []
        for commit in result["items"]:
            formatted_items.append({
                "sha": commit.get("sha"),
                "html_url": commit.get("html_url"),
                "url": commit.get("url"),
                "commit": {
                    "message": commit.get("commit", {}).get("message"),
                    "author": {
                        "name": commit.get("commit", {}).get("author", {}).get("name"),
                        "email": commit.get("commit", {}).get("author", {}).get("email"),
                        "date": commit.get("commit", {}).get("author", {}).get("date")
                    },
                    "committer": {
                        "name": commit.get("commit", {}).get("committer", {}).get("name"),
                        "email": commit.get("commit", {}).get("committer", {}).get("email"),
                        "date": commit.get("commit", {}).get("committer", {}).get("date")
                    },
                    "comment_count": commit.get("commit", {}).get("comment_count", 0)
                },
                "author": {
                    "login": commit.get("author", {}).get("login") if commit.get("author") else None,
                    "avatar_url": commit.get("author", {}).get("avatar_url") if commit.get("author") else None,
                    "html_url": commit.get("author", {}).get("html_url") if commit.get("author") else None
                },
                "committer": {
                    "login": commit.get("committer", {}).get("login") if commit.get("committer") else None,
                    "avatar_url": commit.get("committer", {}).get("avatar_url") if commit.get("committer") else None,
                    "html_url": commit.get("committer", {}).get("html_url") if commit.get("committer") else None
                },
                "repository": {
                    "id": commit.get("repository", {}).get("id"),
                    "name": commit.get("repository", {}).get("name"),
                    "full_name": commit.get("repository", {}).get("full_name"),
                    "html_url": commit.get("repository", {}).get("html_url"),
                    "description": commit.get("repository", {}).get("description"),
                    "owner": {
                        "login": commit.get("repository", {}).get("owner", {}).get("login"),
                        "avatar_url": commit.get("repository", {}).get("owner", {}).get("avatar_url"),
                        "html_url": commit.get("repository", {}).get("owner", {}).get("html_url")
                    }
                },
                "score": commit.get("score", 0)
            })

        result["items"] = formatted_items

    return result

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
