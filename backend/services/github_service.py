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
import time

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
            # Check if it's rate limiting
            if "rate limit" in response.text.lower():
                return {"success": False, "error": "Rate limited - try again later"}
            else:
                return {"success": False, "error": "Access forbidden - repository may be private"}
        elif response.status_code == 429:
            return {"success": False, "error": "Rate limited - too many requests"}
        else:
            return {"success": False, "error": f"HTTP {response.status_code}: {response.text}"}
            
    except requests.exceptions.Timeout:
        return {"success": False, "error": "Request timeout"}
    except requests.exceptions.RequestException as e:
        return {"success": False, "error": f"Request failed: {str(e)}"}

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

def get_external_repository_details(owner: str, repo: str, user: Optional[UserInDB] = None) -> Dict[str, Any]:
    """
    Fetch detailed information about an external repository for summary generation
    """
    try:
        repo_name = f"{owner}/{repo}"
        print(f"Fetching external repository details for {repo_name}")

        # API endpoints
        repo_url = f"{REPOS_BASE_URL}{repo_name}"
        commits_url = f"{REPOS_BASE_URL}{repo_name}/commits?per_page=10"
        readme_url = f"{REPOS_BASE_URL}{repo_name}/readme"
        languages_url = f"{REPOS_BASE_URL}{repo_name}/languages"

        # Make requests
        repo_result = make_github_request(repo_url, user)
        commits_result = make_github_request(commits_url, user)
        readme_result = make_github_request(readme_url, user)
        languages_result = make_github_request(languages_url, user)

        if not repo_result["success"]:
            return {"success": False, "error": repo_result["error"]}

        # Process repository data
        repo_data = repo_result["data"]

        # Process commits
        recent_commits = []
        if commits_result["success"]:
            for commit in commits_result["data"][:5]:  # Get last 5 commits
                recent_commits.append({
                    "sha": commit.get("sha"),
                    "message": commit.get("commit", {}).get("message", ""),
                    "author": commit.get("commit", {}).get("author", {}).get("name", "Unknown"),
                    "date": commit.get("commit", {}).get("author", {}).get("date", ""),
                    "url": commit.get("html_url")
                })

        # Process README
        readme_content = ""
        if readme_result["success"]:
            try:
                import base64
                content = readme_result["data"].get("content", "")
                if content:
                    readme_content = base64.b64decode(content).decode('utf-8')
            except Exception as e:
                print(f"Error decoding README: {e}")
                readme_content = "README content could not be decoded"

        # Process languages
        languages = {}
        if languages_result["success"]:
            lang_data = languages_result["data"]
            total_bytes = sum(lang_data.values())
            if total_bytes > 0:
                languages = {
                    lang: (bytes_count / total_bytes) * 100
                    for lang, bytes_count in lang_data.items()
                }

        return {
            "success": True,
            "data": {
                "repository_info": {
                    "name": repo_data.get("name"),
                    "full_name": repo_data.get("full_name"),
                    "description": repo_data.get("description"),
                    "stars": repo_data.get("stargazers_count", 0),
                    "forks": repo_data.get("forks_count", 0),
                    "watchers": repo_data.get("watchers_count", 0),
                    "language": repo_data.get("language"),
                    "created_at": repo_data.get("created_at"),
                    "updated_at": repo_data.get("updated_at"),
                    "pushed_at": repo_data.get("pushed_at"),
                    "size": repo_data.get("size", 0),
                    "default_branch": repo_data.get("default_branch"),
                    "topics": repo_data.get("topics", []),
                    "license": repo_data.get("license", {}).get("name") if repo_data.get("license") else None,
                    "open_issues": repo_data.get("open_issues_count", 0),
                    "homepage": repo_data.get("homepage"),
                    "archived": repo_data.get("archived", False),
                    "disabled": repo_data.get("disabled", False)
                },
                "recent_commits": recent_commits,
                "readme": readme_content[:2000],  # Limit README to 2000 chars for AI processing
                "languages": languages
            }
        }

    except Exception as e:
        print(f"Error fetching external repository details: {e}")
        return {"success": False, "error": str(e)}

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

    # Process repository data with fallback
    repo_stats = {
        "name": project_id,
        "description": "Repository information not available",
        "language": "Unknown",
        "stars": 0,
        "forks": 0,
        "watchers": 0,
        "open_issues": 0,
        "size": 0,
        "created_at": None,
        "updated_at": None,
        "pushed_at": None,
        "default_branch": "main",
        "homepage": None,
        "topics": [],
        "license": None,
        "visibility": "unknown",
        "archived": False,
        "disabled": False,
        "has_issues": False,
        "has_projects": False,
        "has_wiki": False,
        "has_pages": False,
        "has_downloads": False,
        "network_count": 0,
        "subscribers_count": 0
    }
    
    if repo_result["success"]:
        repo_data = repo_result["data"]
        repo_stats.update({
            "stars": repo_data.get('stargazers_count', 0),
            "forks": repo_data.get('forks_count', 0),
            "watchers": repo_data.get('watchers_count', 0),
            "open_issues": repo_data.get('open_issues_count', 0),
            "size": repo_data.get('size', 0),
            "language": repo_data.get('language', 'Unknown'),
            "created_at": repo_data.get('created_at'),
            "updated_at": repo_data.get('updated_at'),
            "pushed_at": repo_data.get('pushed_at'),
            "default_branch": repo_data.get('default_branch', 'main'),
            "description": repo_data.get('description', 'No description available'),
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
        })
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

def get_text_content_for_rag(project_id: str, user: UserInDB = None) -> List[Dict[str, str]]:
    """ Gathers all relevant text content for the RAG pipeline. """
    print(f"Gathering all text content for RAG pipeline for {project_id}...")
    documents = []
    
    try:
        # Get project details with README
        details = get_live_project_details(project_id, user)
        if details.get("documentation"):
            documents.append({
                "id": f"{project_id}_readme", 
                "content": f"Project README:\n{details['documentation']}", 
                "metadata": {"source": "README.md", "type": "documentation"}
            })

        # Get issues using authenticated request
        issues_url = f"{REPOS_BASE_URL}{project_id}/issues?state=all&per_page=50&sort=updated&direction=desc"
        issues_result = make_github_request(issues_url, user)
        if issues_result["success"]:
            for item in issues_result["data"]:
                if item.get('body') and 'pull_request' not in item:  # Filter out PRs
                    documents.append({
                        "id": f"issue_{item['id']}", 
                        "content": f"Issue Title: {item.get('title', '')}\n\nBody:\n{item.get('body')}", 
                        "metadata": {"source": item.get('html_url', ''), "type": "issue"}
                    })

        # Get pull requests using authenticated request
        prs_url = f"{REPOS_BASE_URL}{project_id}/pulls?state=all&per_page=50&sort=updated&direction=desc"
        prs_result = make_github_request(prs_url, user)
        if prs_result["success"]:
            for item in prs_result["data"]:
                if item.get('body'):
                    documents.append({
                        "id": f"pr_{item['id']}", 
                        "content": f"Pull Request Title: {item.get('title', '')}\n\nBody:\n{item.get('body')}", 
                        "metadata": {"source": item.get('html_url', ''), "type": "pull_request"}
                    })

        # Get recent commits for context
        commits_url = f"{REPOS_BASE_URL}{project_id}/commits?per_page=20"
        commits_result = make_github_request(commits_url, user)
        if commits_result["success"]:
            commit_messages = []
            for commit in commits_result["data"][:10]:  # Last 10 commits
                message = commit.get('commit', {}).get('message', '')
                if message:
                    commit_messages.append(message)
            
            if commit_messages:
                documents.append({
                    "id": f"{project_id}_commits", 
                    "content": f"Recent Commits:\n" + "\n".join([f"- {msg}" for msg in commit_messages]), 
                    "metadata": {"source": f"https://github.com/{project_id}/commits", "type": "commits"}
                })

        print(f"Gathered {len(documents)} documents for RAG pipeline")
        return documents
        
    except Exception as e:
        print(f"Error gathering RAG content for {project_id}: {e}")
        # Return at least the README if available
        if documents:
            return documents
        return []

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
