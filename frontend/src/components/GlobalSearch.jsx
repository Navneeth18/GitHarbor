import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronDown, ChevronUp, Star, GitFork, Eye, Calendar, User, Code, FileText, MessageSquare, GitCommit, ExternalLink } from 'lucide-react';

const GlobalSearch = ({ accessToken, onClose }) => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('all');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('best-match');
  const [sortOrder, setSortOrder] = useState('desc');
  const [perPage, setPerPage] = useState(30);
  const [languageFilter, setLanguageFilter] = useState('');
  const [starsFilter, setStarsFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

  const buildSearchQuery = (baseQuery) => {
    let searchQuery = baseQuery.trim();

    // Add language filter
    if (languageFilter && searchType === 'repositories') {
      searchQuery += ` language:${languageFilter}`;
    } else if (languageFilter && searchType === 'code') {
      searchQuery += ` language:${languageFilter}`;
    }

    // Add stars filter for repositories
    if (starsFilter && searchType === 'repositories') {
      searchQuery += ` stars:${starsFilter}`;
    }

    // Add date filter
    if (dateFilter) {
      if (searchType === 'repositories') {
        searchQuery += ` created:${dateFilter}`;
      } else if (searchType === 'issues') {
        searchQuery += ` created:${dateFilter}`;
      } else if (searchType === 'commits') {
        searchQuery += ` author-date:${dateFilter}`;
      }
    }

    return searchQuery;
  };

  const searchTypes = [
    { value: 'all', label: 'All', icon: Search },
    { value: 'repositories', label: 'Repositories', icon: FileText },
    { value: 'code', label: 'Code', icon: Code },
    { value: 'users', label: 'Users', icon: User },
    { value: 'issues', label: 'Issues & PRs', icon: MessageSquare },
    { value: 'commits', label: 'Commits', icon: GitCommit }
  ];

  const sortOptions = {
    repositories: [
      { value: 'best-match', label: 'Best match' },
      { value: 'stars', label: 'Stars' },
      { value: 'forks', label: 'Forks' },
      { value: 'updated', label: 'Recently updated' }
    ],
    code: [
      { value: 'best-match', label: 'Best match' },
      { value: 'indexed', label: 'Recently indexed' }
    ],
    users: [
      { value: 'best-match', label: 'Best match' },
      { value: 'followers', label: 'Most followers' },
      { value: 'repositories', label: 'Most repositories' },
      { value: 'joined', label: 'Recently joined' }
    ],
    issues: [
      { value: 'best-match', label: 'Best match' },
      { value: 'comments', label: 'Most commented' },
      { value: 'reactions', label: 'Most reactions' },
      { value: 'updated', label: 'Recently updated' },
      { value: 'created', label: 'Newest' }
    ],
    commits: [
      { value: 'best-match', label: 'Best match' },
      { value: 'author-date', label: 'Author date' },
      { value: 'committer-date', label: 'Committer date' }
    ]
  };

  const performSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError('');

    try {
      const endpoint = searchType === 'all' ? 'all' : searchType;
      const searchQuery = buildSearchQuery(query);
      const params = new URLSearchParams({
        q: searchQuery,
        page: currentPage,
        per_page: searchType === 'all' ? Math.min(perPage, 10) : perPage
      });

      if (searchType !== 'all') {
        params.append('sort', sortBy);
        params.append('order', sortOrder);
      }

      const response = await fetch(`${backendUrl}/api/v1/search/${endpoint}?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.message || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    performSearch();
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    performSearch();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const renderRepositoryResult = (repo) => (
    <div key={repo.id} className="border border-gray-600 rounded-lg p-4 hover:border-blue-500 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 font-semibold text-lg flex items-center space-x-1"
            >
              <span>{repo.full_name}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            {repo.is_fork && <span className="text-xs bg-gray-700 px-2 py-1 rounded">Fork</span>}
            {repo.visibility === 'private' && <span className="text-xs bg-red-700 px-2 py-1 rounded">Private</span>}
          </div>
          
          {repo.description && (
            <p className="text-gray-300 mb-3">{repo.description}</p>
          )}
          
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            {repo.language && (
              <span className="flex items-center space-x-1">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>{repo.language}</span>
              </span>
            )}
            <span className="flex items-center space-x-1">
              <Star className="w-4 h-4" />
              <span>{formatNumber(repo.stargazers_count)}</span>
            </span>
            <span className="flex items-center space-x-1">
              <GitFork className="w-4 h-4" />
              <span>{formatNumber(repo.forks_count)}</span>
            </span>
            <span className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>Updated {formatDate(repo.updated_at)}</span>
            </span>
          </div>
          
          {repo.topics && repo.topics.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {repo.topics.slice(0, 5).map((topic) => (
                <span key={topic} className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded">
                  {topic}
                </span>
              ))}
              {repo.topics.length > 5 && (
                <span className="text-xs text-gray-400">+{repo.topics.length - 5} more</span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <img
            src={repo.owner.avatar_url}
            alt={repo.owner.login}
            className="w-8 h-8 rounded-full"
          />
          <span className="text-sm text-gray-400">{repo.owner.login}</span>
        </div>
      </div>
    </div>
  );

  const renderCodeResult = (code) => (
    <div key={`${code.repository.full_name}/${code.path}`} className="border border-gray-600 rounded-lg p-4 hover:border-blue-500 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <a
              href={code.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-1"
            >
              <span>{code.name}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
          
          <p className="text-gray-400 text-sm mb-2">{code.path}</p>
          
          <div className="text-sm text-gray-300 mb-2">
            in <a
              href={code.repository.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              {code.repository.full_name}
            </a>
          </div>
          
          {code.repository.description && (
            <p className="text-gray-400 text-sm">{code.repository.description}</p>
          )}
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <img
            src={code.repository.owner.avatar_url}
            alt={code.repository.owner.login}
            className="w-6 h-6 rounded-full"
          />
          <span className="text-xs text-gray-400">{code.repository.owner.login}</span>
        </div>
      </div>
    </div>
  );

  const renderUserResult = (user) => (
    <div key={user.login} className="border border-gray-600 rounded-lg p-4 hover:border-blue-500 transition-colors">
      <div className="flex items-start space-x-4">
        <img
          src={user.avatar_url}
          alt={user.login}
          className="w-16 h-16 rounded-full"
        />

        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <a
              href={user.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 font-semibold text-lg flex items-center space-x-1"
            >
              <span>{user.login}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            {user.type === 'Organization' && (
              <span className="text-xs bg-purple-700 px-2 py-1 rounded">Org</span>
            )}
          </div>

          {user.name && user.name !== user.login && (
            <p className="text-gray-300 mb-1">{user.name}</p>
          )}

          {user.bio && (
            <p className="text-gray-400 text-sm mb-2">{user.bio}</p>
          )}

          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <span>{formatNumber(user.public_repos)} repositories</span>
            <span>{formatNumber(user.followers)} followers</span>
            <span>{formatNumber(user.following)} following</span>
          </div>

          {(user.company || user.location) && (
            <div className="flex items-center space-x-4 text-sm text-gray-400 mt-1">
              {user.company && <span>🏢 {user.company}</span>}
              {user.location && <span>📍 {user.location}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderIssueResult = (issue) => (
    <div key={issue.id} className="border border-gray-600 rounded-lg p-4 hover:border-blue-500 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <a
              href={issue.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-1"
            >
              <span>{issue.title}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <span className={`text-xs px-2 py-1 rounded ${
              issue.state === 'open' ? 'bg-green-700 text-green-200' : 'bg-purple-700 text-purple-200'
            }`}>
              {issue.state}
            </span>
            {issue.pull_request && (
              <span className="text-xs bg-blue-700 text-blue-200 px-2 py-1 rounded">PR</span>
            )}
          </div>

          <p className="text-gray-400 text-sm mb-2">
            #{issue.number} in <a
              href={issue.repository.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              {issue.repository.full_name}
            </a>
          </p>

          {issue.body && (
            <p className="text-gray-300 text-sm mb-3 line-clamp-2">{issue.body}</p>
          )}

          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <span className="flex items-center space-x-1">
              <MessageSquare className="w-4 h-4" />
              <span>{issue.comments} comments</span>
            </span>
            <span className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>Created {formatDate(issue.created_at)}</span>
            </span>
            {issue.updated_at !== issue.created_at && (
              <span>Updated {formatDate(issue.updated_at)}</span>
            )}
          </div>

          {issue.labels && issue.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {issue.labels.slice(0, 3).map((label) => (
                <span
                  key={label.name}
                  className="text-xs px-2 py-1 rounded"
                  style={{ backgroundColor: `#${label.color}`, color: '#fff' }}
                >
                  {label.name}
                </span>
              ))}
              {issue.labels.length > 3 && (
                <span className="text-xs text-gray-400">+{issue.labels.length - 3} more</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 ml-4">
          <img
            src={issue.user.avatar_url}
            alt={issue.user.login}
            className="w-8 h-8 rounded-full"
          />
          <span className="text-sm text-gray-400">{issue.user.login}</span>
        </div>
      </div>
    </div>
  );

  const renderCommitResult = (commit) => (
    <div key={commit.sha} className="border border-gray-600 rounded-lg p-4 hover:border-blue-500 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <a
              href={commit.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-1"
            >
              <span className="font-mono text-sm">{commit.sha.substring(0, 7)}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          <p className="text-gray-300 mb-2">{commit.commit.message}</p>

          <p className="text-gray-400 text-sm mb-2">
            in <a
              href={commit.repository.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              {commit.repository.full_name}
            </a>
          </p>

          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <span className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>Committed {formatDate(commit.commit.committer.date)}</span>
            </span>
            {commit.commit.comment_count > 0 && (
              <span className="flex items-center space-x-1">
                <MessageSquare className="w-4 h-4" />
                <span>{commit.commit.comment_count} comments</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-4">
          {commit.author && (
            <>
              <img
                src={commit.author.avatar_url}
                alt={commit.author.login}
                className="w-8 h-8 rounded-full"
              />
              <span className="text-sm text-gray-400">{commit.author.login}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">Global GitHub Search</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          
          {/* Search Form */}
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search all of GitHub..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
            
            {/* Search Type Tabs */}
            <div className="flex flex-wrap gap-2">
              {searchTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => {
                      setSearchType(type.value);
                      setCurrentPage(1);
                    }}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      searchType === type.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{type.label}</span>
                  </button>
                );
              })}
            </div>
            
            {/* Filters */}
            {searchType !== 'all' && (
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
                >
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                  {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                
                {showFilters && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-700 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Sort by</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm"
                      >
                        {sortOptions[searchType]?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Order</label>
                      <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm"
                      >
                        <option value="desc">Descending</option>
                        <option value="asc">Ascending</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Results per page</label>
                      <select
                        value={perPage}
                        onChange={(e) => setPerPage(parseInt(e.target.value))}
                        className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm"
                      >
                        <option value={10}>10 per page</option>
                        <option value={30}>30 per page</option>
                        <option value={50}>50 per page</option>
                        <option value={100}>100 per page</option>
                      </select>
                    </div>

                    {(searchType === 'repositories' || searchType === 'code') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Language</label>
                        <input
                          type="text"
                          value={languageFilter}
                          onChange={(e) => setLanguageFilter(e.target.value)}
                          placeholder="e.g., JavaScript, Python"
                          className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm placeholder-gray-400"
                        />
                      </div>
                    )}

                    {searchType === 'repositories' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Stars</label>
                        <input
                          type="text"
                          value={starsFilter}
                          onChange={(e) => setStarsFilter(e.target.value)}
                          placeholder="e.g., >100, 10..50"
                          className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm placeholder-gray-400"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        {searchType === 'commits' ? 'Author Date' : 'Created Date'}
                      </label>
                      <input
                        type="text"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        placeholder="e.g., >2020-01-01, 2020..2021"
                        className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm placeholder-gray-400"
                      />
                    </div>

                    <div className="md:col-span-2 lg:col-span-3">
                      <div className="text-xs text-gray-400 space-y-1">
                        <p><strong>Filter examples:</strong></p>
                        <p>• Language: JavaScript, Python, TypeScript</p>
                        <p>• Stars: &gt;100, 10..50, &lt;=5</p>
                        <p>• Date: &gt;2020-01-01, 2020..2021, &lt;2019-01-01</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>
        
        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-900 border border-red-700 rounded-lg p-4 mb-4">
              <p className="text-red-200">{error}</p>
            </div>
          )}
          
          {results && !loading && (
            <div className="space-y-6">
              {searchType === 'all' ? (
                // Render all search results
                <div className="space-y-8">
                  {results.repositories?.items?.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                        <FileText className="w-5 h-5" />
                        <span>Repositories ({formatNumber(results.total_results.repositories)})</span>
                      </h3>
                      <div className="space-y-4">
                        {results.repositories.items.map(renderRepositoryResult)}
                      </div>
                    </div>
                  )}
                  
                  {results.code?.items?.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                        <Code className="w-5 h-5" />
                        <span>Code ({formatNumber(results.total_results.code)})</span>
                      </h3>
                      <div className="space-y-4">
                        {results.code.items.map(renderCodeResult)}
                      </div>
                    </div>
                  )}
                  
                  {results.users?.items?.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                        <User className="w-5 h-5" />
                        <span>Users ({formatNumber(results.total_results.users)})</span>
                      </h3>
                      <div className="space-y-4">
                        {results.users.items.map(renderUserResult)}
                      </div>
                    </div>
                  )}

                  {results.issues?.items?.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                        <MessageSquare className="w-5 h-5" />
                        <span>Issues & PRs ({formatNumber(results.total_results.issues)})</span>
                      </h3>
                      <div className="space-y-4">
                        {results.issues.items.map(renderIssueResult)}
                      </div>
                    </div>
                  )}

                  {results.commits?.items?.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                        <GitCommit className="w-5 h-5" />
                        <span>Commits ({formatNumber(results.total_results.commits)})</span>
                      </h3>
                      <div className="space-y-4">
                        {results.commits.items.map(renderCommitResult)}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Render specific search type results
                <div>
                  {results.total_count !== undefined && (
                    <p className="text-gray-400 mb-4">
                      {formatNumber(results.total_count)} results found
                    </p>
                  )}
                  
                  <div className="space-y-4">
                    {searchType === 'repositories' && results.items?.map(renderRepositoryResult)}
                    {searchType === 'code' && results.items?.map(renderCodeResult)}
                    {searchType === 'users' && results.items?.map(renderUserResult)}
                    {searchType === 'issues' && results.items?.map(renderIssueResult)}
                    {searchType === 'commits' && results.items?.map(renderCommitResult)}
                  </div>
                  
                  {/* Pagination */}
                  {results.items?.length > 0 && searchType !== 'all' && (
                    <div className="flex justify-center items-center space-x-4 mt-8">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                      >
                        Previous
                      </button>
                      
                      <span className="text-gray-400">
                        Page {currentPage}
                      </span>
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={results.items?.length < perPage}
                        className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {results && ((searchType === 'all' && Object.values(results.total_results || {}).every(count => count === 0)) || 
                          (searchType !== 'all' && (!results.items || results.items.length === 0))) && (
                <div className="text-center py-12">
                  <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-400 mb-2">No results found</h3>
                  <p className="text-gray-500">Try adjusting your search terms or filters</p>
                </div>
              )}
            </div>
          )}
          
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Searching GitHub...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
