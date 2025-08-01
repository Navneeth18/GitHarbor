# FILE: api/v1/endpoints/search.py
# ----------------------
# Global GitHub search endpoints
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Any, Optional
from models.user import UserInDB
from services import github_service
from api.v1.dependencies import get_current_user

router = APIRouter()

@router.get("/repositories")
def search_repositories_global(
    q: str = Query(..., description="Search query"),
    sort: str = Query("best-match", description="Sort field: stars, forks, help-wanted-issues, updated, best-match"),
    order: str = Query("desc", description="Sort order: asc, desc"),
    per_page: int = Query(30, ge=1, le=100, description="Results per page"),
    page: int = Query(1, ge=1, description="Page number"),
    current_user: UserInDB = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Search for repositories across all of GitHub
    
    Query examples:
    - "machine learning" - Basic text search
    - "language:python" - Filter by language
    - "stars:>1000" - Filter by star count
    - "created:>2020-01-01" - Filter by creation date
    - "user:octocat" - Search in specific user's repos
    """
    try:
        result = github_service.search_repositories_global(
            query=q,
            sort=sort,
            order=order,
            per_page=per_page,
            page=page,
            user=current_user
        )
        return result
    except Exception as e:
        print(f"Error in repository search: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during repository search")

@router.get("/code")
def search_code_global(
    q: str = Query(..., description="Search query"),
    sort: str = Query("best-match", description="Sort field: indexed, best-match"),
    order: str = Query("desc", description="Sort order: asc, desc"),
    per_page: int = Query(30, ge=1, le=100, description="Results per page"),
    page: int = Query(1, ge=1, description="Page number"),
    current_user: UserInDB = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Search for code across all of GitHub
    
    Query examples:
    - "function" - Basic text search
    - "language:python function" - Search in Python files
    - "filename:package.json" - Search in specific files
    - "extension:py import" - Search in files with specific extension
    - "repo:owner/name function" - Search in specific repository
    """
    try:
        result = github_service.search_code_global(
            query=q,
            sort=sort,
            order=order,
            per_page=per_page,
            page=page,
            user=current_user
        )
        return result
    except Exception as e:
        print(f"Error in code search: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during code search")

@router.get("/users")
def search_users_global(
    q: str = Query(..., description="Search query"),
    sort: str = Query("best-match", description="Sort field: followers, repositories, joined, best-match"),
    order: str = Query("desc", description="Sort order: asc, desc"),
    per_page: int = Query(30, ge=1, le=100, description="Results per page"),
    page: int = Query(1, ge=1, description="Page number"),
    current_user: UserInDB = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Search for users across all of GitHub
    
    Query examples:
    - "john" - Basic username search
    - "location:london" - Filter by location
    - "language:python" - Filter by primary language
    - "followers:>100" - Filter by follower count
    - "repos:>10" - Filter by repository count
    """
    try:
        result = github_service.search_users_global(
            query=q,
            sort=sort,
            order=order,
            per_page=per_page,
            page=page,
            user=current_user
        )
        return result
    except Exception as e:
        print(f"Error in user search: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during user search")

@router.get("/issues")
def search_issues_global(
    q: str = Query(..., description="Search query"),
    sort: str = Query("best-match", description="Sort field: comments, reactions, author-date, committer-date, updated, created, best-match"),
    order: str = Query("desc", description="Sort order: asc, desc"),
    per_page: int = Query(30, ge=1, le=100, description="Results per page"),
    page: int = Query(1, ge=1, description="Page number"),
    current_user: UserInDB = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Search for issues and pull requests across all of GitHub
    
    Query examples:
    - "bug" - Basic text search
    - "is:issue state:open" - Open issues only
    - "is:pr state:closed" - Closed pull requests only
    - "label:bug" - Filter by label
    - "author:username" - Filter by author
    - "assignee:username" - Filter by assignee
    """
    try:
        result = github_service.search_issues_global(
            query=q,
            sort=sort,
            order=order,
            per_page=per_page,
            page=page,
            user=current_user
        )
        return result
    except Exception as e:
        print(f"Error in issue search: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during issue search")

@router.get("/commits")
def search_commits_global(
    q: str = Query(..., description="Search query"),
    sort: str = Query("best-match", description="Sort field: author-date, committer-date, best-match"),
    order: str = Query("desc", description="Sort order: asc, desc"),
    per_page: int = Query(30, ge=1, le=100, description="Results per page"),
    page: int = Query(1, ge=1, description="Page number"),
    current_user: UserInDB = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Search for commits across all of GitHub
    
    Query examples:
    - "fix bug" - Basic commit message search
    - "author:username" - Filter by author
    - "committer:username" - Filter by committer
    - "author-date:>2020-01-01" - Filter by author date
    - "repo:owner/name" - Search in specific repository
    """
    try:
        result = github_service.search_commits_global(
            query=q,
            sort=sort,
            order=order,
            per_page=per_page,
            page=page,
            user=current_user
        )
        return result
    except Exception as e:
        print(f"Error in commit search: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during commit search")

@router.get("/all")
def search_all_global(
    q: str = Query(..., description="Search query"),
    per_page: int = Query(10, ge=1, le=30, description="Results per page per category"),
    current_user: UserInDB = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Search across all GitHub content types (repositories, code, users, issues, commits)
    Returns a limited number of results from each category for overview
    """
    try:
        # Search across all categories with limited results
        repositories = github_service.search_repositories_global(
            query=q, per_page=per_page, user=current_user
        )
        
        code = github_service.search_code_global(
            query=q, per_page=per_page, user=current_user
        )
        
        users = github_service.search_users_global(
            query=q, per_page=per_page, user=current_user
        )
        
        issues = github_service.search_issues_global(
            query=q, per_page=per_page, user=current_user
        )
        
        commits = github_service.search_commits_global(
            query=q, per_page=per_page, user=current_user
        )
        
        return {
            "query": q,
            "repositories": repositories,
            "code": code,
            "users": users,
            "issues": issues,
            "commits": commits,
            "total_results": {
                "repositories": repositories.get("total_count", 0),
                "code": code.get("total_count", 0),
                "users": users.get("total_count", 0),
                "issues": issues.get("total_count", 0),
                "commits": commits.get("total_count", 0)
            }
        }
    except Exception as e:
        print(f"Error in global search: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during global search")
