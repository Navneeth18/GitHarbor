import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  BrainCircuit,
  Users,
  GitCommit,
  BookOpen,
  Loader2,
  AlertCircle,
  MessageCircle,
  X,
  Upload,
  GitMerge,
  Star,
  GitFork,
  Eye,
  ExternalLink
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import ChatPanel from './ChatPanel';

/**
 * Dashboard component that displays detailed project information
 * Includes AI summary, contributors, commits, documentation, and chat
 */
function Dashboard({ projectId, onBack }) {
  // State for project data, loading, and error handling
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isChatVisible, setIsChatVisible] = useState(false);

  // Backend URL from environment variables
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  /**
   * Fetch project details from the backend API
   */
  const fetchProjectData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${backendUrl}/api/v1/projects/${encodeURIComponent(projectId)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch project data: ${response.status}`);
      }
      
      const data = await response.json();
      setProjectData(data);
    } catch (err) {
      console.error('Error fetching project data:', err);
      setError('Failed to load project data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch project data on component mount or projectId change
  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  /**
   * Format date to readable string
   */
  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  /**
   * Get first line of commit message
   */
  const getCommitSummary = (message) => {
    return message ? message.split('\n')[0] : 'No message';
  };

  // Loading state with skeleton loaders
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center space-x-4 mb-8">
          <div className="w-10 h-10 bg-gray-700 rounded-lg animate-pulse"></div>
          <div className="w-48 h-8 bg-gray-700 rounded animate-pulse"></div>
        </div>

        {/* Three-column layout skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left column skeleton */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="w-32 h-6 bg-gray-700 rounded animate-pulse mb-4"></div>
              <div className="space-y-2">
                <div className="w-full h-4 bg-gray-700 rounded animate-pulse"></div>
                <div className="w-3/4 h-4 bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="w-32 h-6 bg-gray-700 rounded animate-pulse mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-700 rounded-full animate-pulse"></div>
                    <div className="flex-1">
                      <div className="w-24 h-4 bg-gray-700 rounded animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Center column skeleton */}
          <div className="lg:col-span-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="w-40 h-6 bg-gray-700 rounded animate-pulse mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="w-full h-4 bg-gray-700 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column skeleton */}
          <div className="lg:col-span-3">
            <div className="bg-gray-800 rounded-lg p-6 h-96">
              <div className="w-24 h-6 bg-gray-700 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-red-400 text-lg mb-4">{error}</p>
        <div className="space-x-4">
          <button
            onClick={fetchProjectData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with back button, project name, and chat toggle */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Projects</span>
          </button>
          <div className="h-6 w-px bg-gray-600"></div>
          <h1 className="text-2xl font-bold text-white">{projectId}</h1>
        </div>

        {/* Chat Toggle Button */}
        <button
          onClick={() => setIsChatVisible(!isChatVisible)}
          className={`fixed top-20 right-6 z-50 flex items-center space-x-2 px-4 py-2 rounded-lg shadow-lg transition-all duration-200 ${
            isChatVisible
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
          style={{ position: 'fixed', top: '80px', right: '24px' }}
        >
          {isChatVisible ? (
            <>
              <X className="w-5 h-5" />
              <span>Close</span>
            </>
          ) : (
            <>
              <MessageCircle className="w-5 h-5" />
              <span>CB</span>
            </>
          )}
        </button>
      </div>

      {/* Three-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Project Details */}
        <div className="lg:col-span-3 space-y-6">
          {/* AI Summary */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <BrainCircuit className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">AI Summary</h3>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              {projectData?.summary || 'No summary available'}
            </p>
          </div>

          {/* Top Contributors */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Users className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-semibold text-white">Top Contributors</h3>
            </div>
            <div className="space-y-3">
              {projectData?.contributors?.slice(0, 5).map((contributor, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-300">
                        {contributor.login?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm text-gray-300 truncate max-w-24">
                      {contributor.login}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {contributor.contributions}
                  </span>
                </div>
              )) || (
                <p className="text-gray-500 text-sm">No contributors data</p>
              )}
            </div>
          </div>

          {/* Recent Commits */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <GitCommit className="w-5 h-5 text-yellow-400" />
              <h3 className="text-lg font-semibold text-white">Recent Commits</h3>
            </div>
            <div className="space-y-4">
              {projectData?.commits?.slice(0, 5).map((commit, index) => (
                <div key={index} className="border-l-2 border-gray-600 pl-3">
                  <p className="text-sm text-gray-300 mb-1">
                    {getCommitSummary(commit.commit?.message)}
                  </p>
                  <div className="text-xs text-gray-500">
                    <span>{commit.commit?.author?.name}</span>
                    {commit.commit?.author?.date && (
                      <>
                        <span className="mx-1">•</span>
                        <span>{formatDate(commit.commit.author.date)}</span>
                      </>
                    )}
                  </div>
                </div>
              )) || (
                <p className="text-gray-500 text-sm">No commits data</p>
              )}
            </div>
          </div>

          {/* Recent Pushes */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Upload className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Recent Pushes</h3>
            </div>
            <div className="space-y-4">
              {projectData?.pushes?.slice(0, 5).map((push, index) => (
                <div key={index} className="border-l-2 border-blue-600 pl-3">
                  <p className="text-sm text-gray-300 mb-1">
                    {push.commits_count} commit{push.commits_count !== 1 ? 's' : ''} to {push.ref?.replace('refs/heads/', '')}
                  </p>
                  <div className="text-xs text-gray-500">
                    <span>{push.actor}</span>
                    {push.created_at && (
                      <>
                        <span className="mx-1">•</span>
                        <span>{formatDate(push.created_at)}</span>
                      </>
                    )}
                  </div>
                </div>
              )) || (
                <p className="text-gray-500 text-sm">No push data</p>
              )}
            </div>
          </div>

          {/* Recent Merges */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <GitMerge className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-semibold text-white">Recent Merges</h3>
            </div>
            <div className="space-y-4">
              {projectData?.merges?.slice(0, 5).map((merge, index) => (
                <div key={index} className="border-l-2 border-green-600 pl-3">
                  <p className="text-sm text-gray-300 mb-1">
                    #{merge.number}: {getCommitSummary(merge.title)}
                  </p>
                  <div className="text-xs text-gray-500">
                    <span>{merge.user} → {merge.base_branch}</span>
                    {merge.merged_at && (
                      <>
                        <span className="mx-1">•</span>
                        <span>{formatDate(merge.merged_at)}</span>
                      </>
                    )}
                  </div>
                  {(merge.additions || merge.deletions) && (
                    <div className="text-xs text-gray-500 mt-1">
                      <span className="text-green-400">+{merge.additions || 0}</span>
                      <span className="mx-1">•</span>
                      <span className="text-red-400">-{merge.deletions || 0}</span>
                    </div>
                  )}
                </div>
              )) || (
                <p className="text-gray-500 text-sm">No merge data</p>
              )}
            </div>
          </div>


        </div>

        {/* Center Column - Documentation & Repository Stats */}
        <div className={`${isChatVisible ? 'lg:col-span-5' : 'lg:col-span-9'} transition-all duration-300`}>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 h-[calc(100vh-8rem)] min-h-[800px] max-h-[1200px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">Documentation & Repository Info</h3>
              </div>
              <button
                onClick={() => window.open(`#/docs/${encodeURIComponent(projectId)}`, '_blank')}
                className="flex items-center space-x-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Full View</span>
              </button>
            </div>
            <div className="prose prose-invert prose-sm max-w-none flex-1 overflow-y-auto scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500 pr-2">

              {/* Repository Statistics Section */}
              <div className="mb-10 p-6 bg-gray-900 border border-gray-600 rounded-lg">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <Star className="w-5 h-5 text-yellow-400 mr-2" />
                  Repository Statistics
                </h2>

                {projectData?.repository_stats ? (
                  <div className="space-y-4">
                    {/* Primary Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-gray-800 rounded-lg">
                        <div className="flex items-center justify-center space-x-1 mb-2">
                          <Star className="w-5 h-5 text-yellow-400" />
                          <span className="text-xl font-bold text-white">
                            {projectData.repository_stats.stars || 0}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">Stars</p>
                      </div>

                      <div className="text-center p-3 bg-gray-800 rounded-lg">
                        <div className="flex items-center justify-center space-x-1 mb-2">
                          <GitFork className="w-5 h-5 text-blue-400" />
                          <span className="text-xl font-bold text-white">
                            {projectData.repository_stats.forks || 0}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">Forks</p>
                      </div>

                      <div className="text-center p-3 bg-gray-800 rounded-lg">
                        <div className="flex items-center justify-center space-x-1 mb-2">
                          <Eye className="w-5 h-5 text-green-400" />
                          <span className="text-xl font-bold text-white">
                            {projectData.repository_stats.watchers || 0}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">Watchers</p>
                      </div>

                      <div className="text-center p-3 bg-gray-800 rounded-lg">
                        <div className="flex items-center justify-center space-x-1 mb-2">
                          <AlertCircle className="w-5 h-5 text-red-400" />
                          <span className="text-xl font-bold text-white">
                            {projectData.repository_stats.open_issues || 0}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">Open Issues</p>
                      </div>
                    </div>

                    {/* Additional Repository Info - Extended */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                      {projectData.repository_stats.language && (
                        <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                          <p className="text-sm text-gray-400 mb-1">Primary Language</p>
                          <p className="text-white font-medium">{projectData.repository_stats.language}</p>
                        </div>
                      )}

                      {projectData.repository_stats.default_branch && (
                        <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                          <p className="text-sm text-gray-400 mb-1">Default Branch</p>
                          <p className="text-white font-medium">{projectData.repository_stats.default_branch}</p>
                        </div>
                      )}

                      {projectData.repository_stats.size !== undefined && (
                        <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                          <p className="text-sm text-gray-400 mb-1">Repository Size</p>
                          <p className="text-white font-medium">{(projectData.repository_stats.size / 1024).toFixed(1)} MB</p>
                        </div>
                      )}

                      {projectData.repository_stats.created_at && (
                        <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                          <p className="text-sm text-gray-400 mb-1">Created</p>
                          <p className="text-white font-medium">{formatDate(projectData.repository_stats.created_at)}</p>
                        </div>
                      )}

                      {projectData.repository_stats.updated_at && (
                        <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                          <p className="text-sm text-gray-400 mb-1">Last Updated</p>
                          <p className="text-white font-medium">{formatDate(projectData.repository_stats.updated_at)}</p>
                        </div>
                      )}

                      {projectData.repository_stats.pushed_at && (
                        <div className="p-3 bg-gray-800 rounded-lg border border-gray-700">
                          <p className="text-sm text-gray-400 mb-1">Last Push</p>
                          <p className="text-white font-medium">{formatDate(projectData.repository_stats.pushed_at)}</p>
                        </div>
                      )}
                    </div>

                    {/* Extended Repository Metrics */}
                    <div className="mt-8 p-6 bg-gray-800 rounded-lg border border-gray-700">
                      <h3 className="text-lg font-semibold text-white mb-4">Repository Activity</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-400 mb-1">
                            {projectData?.commits?.length || 0}
                          </div>
                          <p className="text-sm text-gray-400">Recent Commits</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-400 mb-1">
                            {projectData?.merges?.length || 0}
                          </div>
                          <p className="text-sm text-gray-400">Recent Merges</p>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-400 mb-1">
                            {projectData?.pushes?.length || 0}
                          </div>
                          <p className="text-sm text-gray-400">Recent Pushes</p>
                        </div>
                      </div>
                    </div>

                    {/* Contributors Summary */}
                    {projectData?.contributors && projectData.contributors.length > 0 && (
                      <div className="mt-8 p-6 bg-gray-800 rounded-lg border border-gray-700">
                        <h3 className="text-lg font-semibold text-white mb-4">Contributors Overview</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-400 mb-2">Total Contributors</p>
                            <p className="text-xl font-bold text-white">{projectData.contributors.length}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400 mb-2">Total Contributions</p>
                            <p className="text-xl font-bold text-white">
                              {projectData.contributors.reduce((sum, contributor) => sum + (contributor.contributions || 0), 0)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4">
                          <p className="text-sm text-gray-400 mb-2">Top Contributor</p>
                          {projectData.contributors[0] && (
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                                <span className="text-sm font-bold text-white">
                                  {projectData.contributors[0].login?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <p className="text-white font-medium">{projectData.contributors[0].login}</p>
                                <p className="text-sm text-gray-400">{projectData.contributors[0].contributions} contributions</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Repository Details */}
                    {projectData?.repository_stats && (
                      <div className="mt-8 p-6 bg-gray-800 rounded-lg border border-gray-700">
                        <h3 className="text-lg font-semibold text-white mb-4">Repository Details</h3>
                        <div className="space-y-4">
                          {projectData.repository_stats.description && (
                            <div>
                              <p className="text-sm text-gray-400 mb-1">Description</p>
                              <p className="text-gray-300">{projectData.repository_stats.description}</p>
                            </div>
                          )}

                          {projectData.repository_stats.topics && projectData.repository_stats.topics.length > 0 && (
                            <div>
                              <p className="text-sm text-gray-400 mb-2">Topics</p>
                              <div className="flex flex-wrap gap-2">
                                {projectData.repository_stats.topics.map((topic, index) => (
                                  <span key={index} className="px-2 py-1 bg-blue-600 text-blue-100 text-xs rounded-full">
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {projectData.repository_stats.license && (
                              <div>
                                <p className="text-sm text-gray-400 mb-1">License</p>
                                <p className="text-gray-300">{projectData.repository_stats.license}</p>
                              </div>
                            )}

                            {projectData.repository_stats.visibility && (
                              <div>
                                <p className="text-sm text-gray-400 mb-1">Visibility</p>
                                <span className={`px-2 py-1 text-xs rounded-full ${
                                  projectData.repository_stats.visibility === 'public'
                                    ? 'bg-green-600 text-green-100'
                                    : 'bg-yellow-600 text-yellow-100'
                                }`}>
                                  {projectData.repository_stats.visibility}
                                </span>
                              </div>
                            )}

                            {projectData.repository_stats.homepage && (
                              <div className="md:col-span-2">
                                <p className="text-sm text-gray-400 mb-1">Homepage</p>
                                <a
                                  href={projectData.repository_stats.homepage}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 underline break-all"
                                >
                                  {projectData.repository_stats.homepage}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Repository Features */}
                    {projectData?.repository_stats && (
                      <div className="mt-8 p-6 bg-gray-800 rounded-lg border border-gray-700">
                        <h3 className="text-lg font-semibold text-white mb-4">Repository Features</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div className={`p-2 rounded text-center text-sm ${
                            projectData.repository_stats.has_issues
                              ? 'bg-green-600 text-green-100'
                              : 'bg-gray-700 text-gray-400'
                          }`}>
                            Issues {projectData.repository_stats.has_issues ? '✓' : '✗'}
                          </div>
                          <div className={`p-2 rounded text-center text-sm ${
                            projectData.repository_stats.has_projects
                              ? 'bg-green-600 text-green-100'
                              : 'bg-gray-700 text-gray-400'
                          }`}>
                            Projects {projectData.repository_stats.has_projects ? '✓' : '✗'}
                          </div>
                          <div className={`p-2 rounded text-center text-sm ${
                            projectData.repository_stats.has_wiki
                              ? 'bg-green-600 text-green-100'
                              : 'bg-gray-700 text-gray-400'
                          }`}>
                            Wiki {projectData.repository_stats.has_wiki ? '✓' : '✗'}
                          </div>
                          <div className={`p-2 rounded text-center text-sm ${
                            projectData.repository_stats.has_pages
                              ? 'bg-green-600 text-green-100'
                              : 'bg-gray-700 text-gray-400'
                          }`}>
                            Pages {projectData.repository_stats.has_pages ? '✓' : '✗'}
                          </div>
                          <div className={`p-2 rounded text-center text-sm ${
                            projectData.repository_stats.has_downloads
                              ? 'bg-green-600 text-green-100'
                              : 'bg-gray-700 text-gray-400'
                          }`}>
                            Downloads {projectData.repository_stats.has_downloads ? '✓' : '✗'}
                          </div>
                          {projectData.repository_stats.archived && (
                            <div className="p-2 rounded text-center text-sm bg-yellow-600 text-yellow-100">
                              Archived
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Recent Activity Summary */}
                    <div className="mt-8 p-6 bg-gray-800 rounded-lg border border-gray-700">
                      <h3 className="text-lg font-semibold text-white mb-4">Recent Activity Summary</h3>
                      <div className="space-y-3">
                        {projectData?.pushes && projectData.pushes.length > 0 && (
                          <div className="flex items-center justify-between p-2 bg-gray-900 rounded">
                            <span className="text-gray-300">Latest Push</span>
                            <span className="text-sm text-gray-400">
                              {projectData.pushes[0].actor} • {formatDate(projectData.pushes[0].created_at)}
                            </span>
                          </div>
                        )}
                        {projectData?.merges && projectData.merges.length > 0 && (
                          <div className="flex items-center justify-between p-2 bg-gray-900 rounded">
                            <span className="text-gray-300">Latest Merge</span>
                            <span className="text-sm text-gray-400">
                              #{projectData.merges[0].number} • {formatDate(projectData.merges[0].merged_at)}
                            </span>
                          </div>
                        )}
                        {projectData?.commits && projectData.commits.length > 0 && (
                          <div className="flex items-center justify-between p-2 bg-gray-900 rounded">
                            <span className="text-gray-300">Latest Commit</span>
                            <span className="text-sm text-gray-400">
                              {projectData.commits[0].commit?.author?.name} • {formatDate(projectData.commits[0].commit?.author?.date)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">No repository statistics available</p>
                )}
              </div>

              {/* Separator */}
              <div className="mt-10 mb-10">
                <div className="border-t border-gray-600"></div>
              </div>

              {/* README Documentation */}
              <div>
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
                  <BookOpen className="w-5 h-5 text-purple-400 mr-2" />
                  README Documentation
                </h2>

                <div className="bg-gray-900 border border-gray-600 rounded-lg p-6">
                  {projectData?.documentation ? (
                    <ReactMarkdown
                      components={{
                        // Custom styling for markdown elements
                        h1: ({children}) => <h1 className="text-2xl font-bold text-white mb-6">{children}</h1>,
                        h2: ({children}) => <h2 className="text-xl font-semibold text-white mb-4 mt-8">{children}</h2>,
                        h3: ({children}) => <h3 className="text-lg font-medium text-white mb-3 mt-6">{children}</h3>,
                        p: ({children}) => <p className="text-gray-300 mb-4 leading-relaxed">{children}</p>,
                        code: ({children}) => <code className="bg-gray-700 text-gray-200 px-2 py-1 rounded text-sm">{children}</code>,
                        pre: ({children}) => <pre className="bg-gray-800 border border-gray-600 rounded-lg p-4 overflow-x-auto mb-6">{children}</pre>,
                        a: ({href, children}) => <a href={href} className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                        ul: ({children}) => <ul className="text-gray-300 mb-4 ml-6 list-disc">{children}</ul>,
                        ol: ({children}) => <ol className="text-gray-300 mb-4 ml-6 list-decimal">{children}</ol>,
                        li: ({children}) => <li className="mb-2">{children}</li>,
                        blockquote: ({children}) => <blockquote className="border-l-4 border-purple-500 pl-6 italic text-gray-400 mb-6 bg-gray-800 py-4 rounded-r">{children}</blockquote>
                      }}
                    >
                      {projectData.documentation}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No README documentation available</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - AI Chat Panel */}
        {isChatVisible && (
          <div className="lg:col-span-4 transition-all duration-300">
            <ChatPanel projectId={projectId} />
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;