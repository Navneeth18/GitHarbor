import React, { useState, useEffect, useCallback } from 'react';
import { Github, Loader2, AlertCircle, Search, X, Filter, Globe } from 'lucide-react';
import GlobalSearch from './GlobalSearch';
import { useAuth } from '../contexts/AuthContext';

/**
 * Homepage component that displays a grid of available GitHub projects
 * Fetches project list from the backend API using user's authentication
 */
function Homepage({ onProjectSelect, initialSearchQuery }) {
  const { makeAuthenticatedRequest } = useAuth();
  
  // State for projects data, loading, and error handling
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  // Backend URL from environment variables
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

  /**
   * Fetch projects from the backend API
   */
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching projects...');
      console.log('Backend URL:', backendUrl);
      
      const response = await makeAuthenticatedRequest(`${backendUrl}/api/v1/projects/`);
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication expired. Please login again.');
        }
        throw new Error(`Failed to fetch projects: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Projects data:', data);
      setProjects(data);
      setFilteredProjects(data);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err.message || 'Failed to load projects. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [makeAuthenticatedRequest, backendUrl]);

  /**
   * Extract a snippet of text around the search query
   */
  const extractSnippet = useCallback((text, query, maxLength = 150) => {
    const index = text.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return text.substring(0, maxLength) + '...';
    
    const start = Math.max(0, index - maxLength / 2);
    const end = Math.min(text.length, index + query.length + maxLength / 2);
    let snippet = text.substring(start, end);
    
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    
    return snippet;
  }, []);

  /**
   * Search through projects and their content
   */
  const searchProjects = useCallback(async (query) => {
    if (!query.trim()) {
      setFilteredProjects(projects);
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    try {
      // Filter projects by name/id
      const projectMatches = projects.filter(project =>
        project.name.toLowerCase().includes(query.toLowerCase()) ||
        project.id.toLowerCase().includes(query.toLowerCase())
      );

      // Search through project content (you can enhance this with backend search)
      const contentResults = [];
      for (const project of projects) {
        try {
          const response = await makeAuthenticatedRequest(`${backendUrl}/api/v1/projects/${encodeURIComponent(project.id)}`);
          if (response.ok) {
            const projectData = await response.json();

            // Search in documentation
            if (projectData.documentation &&
                projectData.documentation.toLowerCase().includes(query.toLowerCase())) {
              contentResults.push({
                type: 'documentation',
                project: project,
                snippet: extractSnippet(projectData.documentation, query),
                url: `#/docs/${encodeURIComponent(project.id)}`
              });
            }

            // Search in commits
            if (projectData.commits) {
              for (const commit of projectData.commits.slice(0, 5)) {
                if (commit.commit && commit.commit.message &&
                    commit.commit.message.toLowerCase().includes(query.toLowerCase())) {
                  contentResults.push({
                    type: 'commit',
                    project: project,
                    snippet: extractSnippet(commit.commit.message, query),
                    url: commit.html_url
                  });
                }
              }
            }
          }
        } catch (error) {
          console.error(`Error searching project ${project.id}:`, error);
        }
      }

      setSearchResults(contentResults);
      setFilteredProjects(projectMatches);
    } catch (error) {
      console.error('Search error:', error);
      setError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [makeAuthenticatedRequest, backendUrl, projects, extractSnippet]);

  /**
   * Handle search input change
   */
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim()) {
      searchProjects(query);
    } else {
      setFilteredProjects(projects);
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  /**
   * Clear search
   */
  const clearSearch = () => {
    setSearchQuery('');
    setFilteredProjects(projects);
    setSearchResults([]);
    setIsSearching(false);
  };

  // Fetch projects on component mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Handle initial search query
  useEffect(() => {
    if (initialSearchQuery && projects.length > 0) {
      setSearchQuery(initialSearchQuery);
      searchProjects(initialSearchQuery);
    }
  }, [initialSearchQuery, projects, searchProjects]);

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-400 text-lg">Loading your repositories...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-red-400 text-lg mb-4">{error}</p>
        <button
          onClick={fetchProjects}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Welcome section */}
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-white mb-4">
          Your GitHub Repositories
        </h2>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
          Explore your repositories with AI-powered insights.
          Get summaries, ask questions, and understand codebases faster.
        </p>

        {/* Search Section */}
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search repositories, documentation, commits..."
              className="block w-full pl-10 pr-12 py-3 border border-gray-600 rounded-lg bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
              </button>
            )}
            {isSearching && (
              <div className="absolute inset-y-0 right-8 flex items-center">
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
              </div>
            )}
          </div>

          {/* Search Stats and Global Search Button */}
          <div className="mt-3 flex items-center justify-center space-x-4">
            {searchQuery && (
              <div className="text-sm text-gray-400 flex items-center space-x-4">
                <span>
                  {filteredProjects.length} project{filteredProjects.length !== 1 ? 's' : ''} found
                </span>
                {searchResults.length > 0 && (
                  <>
                    <span>•</span>
                    <span>
                      {searchResults.length} content match{searchResults.length !== 1 ? 'es' : ''}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Global Search Button */}
            <button
              onClick={() => setShowGlobalSearch(true)}
              className="flex items-center space-x-2 text-blue-400 hover:text-blue-300 transition-colors text-sm"
            >
              <Globe className="w-4 h-4" />
              <span>Search all of GitHub</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search Results */}
      {searchQuery && searchResults.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Content Matches
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {searchResults.map((result, index) => (
              <div
                key={`${result.project.id}-${index}`}
                onClick={() => onProjectSelect(result.project.id)}
                className="bg-gray-800 border border-blue-600 rounded-lg p-4 hover:bg-gray-750 cursor-pointer transition-all duration-200"
              >
                <div className="flex items-center space-x-3 mb-2">
                  <Github className="w-5 h-5 text-blue-400" />
                  <h4 className="text-white font-medium">{result.project.name}</h4>
                  <span className="px-2 py-1 bg-blue-600 text-blue-100 text-xs rounded-full">
                    {result.type}
                  </span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {result.snippet}
                </p>
                {result.url && (
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline text-sm mt-2 block"
                  >
                    View on GitHub
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects grid */}
      <div>
        {searchQuery && (
          <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
            <Github className="w-5 h-5 mr-2" />
            Repository Matches
          </h3>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProjects.map((project) => (
          <div
            key={project.id}
            onClick={() => {
              console.log('Project clicked:', project.id, project.name);
              onProjectSelect(project.id);
            }}
            className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:bg-gray-750 hover:border-gray-600 cursor-pointer transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
          >
            <div className="flex items-center space-x-3 mb-4">
              <Github className="w-8 h-8 text-gray-400" />
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-white truncate">
                  {project.name}
                </h3>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>Click to explore</span>
              <span>→</span>
            </div>
          </div>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {projects.length === 0 && !loading && !searchQuery && (
        <div className="text-center py-12">
          <Github className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">No repositories found</p>
          <p className="text-gray-500 text-sm">You don't have any public repositories or the repositories are not accessible.</p>
        </div>
      )}

      {/* No search results */}
      {searchQuery && filteredProjects.length === 0 && searchResults.length === 0 && !isSearching && (
        <div className="text-center py-12">
          <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">No results found for "{searchQuery}"</p>
          <p className="text-gray-500 text-sm">Try searching with different keywords or check the spelling</p>
          <button
            onClick={clearSearch}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* Global Search Modal */}
      {showGlobalSearch && (
        <GlobalSearch
          onClose={() => setShowGlobalSearch(false)}
        />
      )}
    </div>
  );
}

export default Homepage;