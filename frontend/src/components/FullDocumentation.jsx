import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Star,
  GitFork,
  Eye,
  AlertCircle,
  Upload,
  GitMerge,
  GitCommit,
  Users,
  ExternalLink,
  Calendar,
  Code,
  Globe,
  Shield,
  Tag
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

/**
 * Full Documentation component that displays comprehensive repository information
 * without sidebar - dedicated full-width documentation view
 */
function FullDocumentation({ projectId, onBack }) {
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  /**
   * Helper function to format dates
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  /**
   * Helper function to get commit summary
   */
  const getCommitSummary = (message) => {
    if (!message) return 'No commit message';
    return message.split('\n')[0].substring(0, 80) + (message.length > 80 ? '...' : '');
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-4 mb-8">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>
          </div>
          
          <div className="flex items-center justify-center min-h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading documentation...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center space-x-4 mb-8">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>
          </div>
          
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>
            <div className="h-6 w-px bg-gray-600"></div>
            <h1 className="text-3xl font-bold text-white">{projectId}</h1>
          </div>
          <div className="flex items-center space-x-2 text-gray-400">
            <BookOpen className="w-6 h-6" />
            <span className="text-lg">Full Documentation</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* Repository Overview */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Star className="w-6 h-6 text-yellow-400 mr-3" />
              Repository Overview
            </h2>
            
            {/* Primary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="text-center p-4 bg-gray-900 rounded-lg border border-gray-600">
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <Star className="w-6 h-6 text-yellow-400" />
                  <span className="text-2xl font-bold text-white">
                    {projectData?.repository_stats?.stars || 0}
                  </span>
                </div>
                <p className="text-gray-400">Stars</p>
              </div>
              
              <div className="text-center p-4 bg-gray-900 rounded-lg border border-gray-600">
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <GitFork className="w-6 h-6 text-blue-400" />
                  <span className="text-2xl font-bold text-white">
                    {projectData?.repository_stats?.forks || 0}
                  </span>
                </div>
                <p className="text-gray-400">Forks</p>
              </div>
              
              <div className="text-center p-4 bg-gray-900 rounded-lg border border-gray-600">
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <Eye className="w-6 h-6 text-green-400" />
                  <span className="text-2xl font-bold text-white">
                    {projectData?.repository_stats?.watchers || 0}
                  </span>
                </div>
                <p className="text-gray-400">Watchers</p>
              </div>
              
              <div className="text-center p-4 bg-gray-900 rounded-lg border border-gray-600">
                <div className="flex items-center justify-center space-x-2 mb-3">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                  <span className="text-2xl font-bold text-white">
                    {projectData?.repository_stats?.open_issues || 0}
                  </span>
                </div>
                <p className="text-gray-400">Open Issues</p>
              </div>
            </div>

            {/* Repository Description */}
            {projectData?.repository_stats?.description && (
              <div className="mb-6 p-4 bg-gray-900 rounded-lg border border-gray-600">
                <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                <p className="text-gray-300 leading-relaxed">{projectData.repository_stats.description}</p>
              </div>
            )}

            {/* Repository Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projectData?.repository_stats?.language && (
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-600">
                  <div className="flex items-center space-x-2 mb-2">
                    <Code className="w-5 h-5 text-blue-400" />
                    <span className="text-sm text-gray-400">Primary Language</span>
                  </div>
                  <p className="text-white font-medium">{projectData.repository_stats.language}</p>
                </div>
              )}
              
              {projectData?.repository_stats?.default_branch && (
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-600">
                  <div className="flex items-center space-x-2 mb-2">
                    <GitCommit className="w-5 h-5 text-green-400" />
                    <span className="text-sm text-gray-400">Default Branch</span>
                  </div>
                  <p className="text-white font-medium">{projectData.repository_stats.default_branch}</p>
                </div>
              )}
              
              {projectData?.repository_stats?.size !== undefined && (
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-600">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-purple-400" />
                    <span className="text-sm text-gray-400">Repository Size</span>
                  </div>
                  <p className="text-white font-medium">{(projectData.repository_stats.size / 1024).toFixed(1)} MB</p>
                </div>
              )}
              
              {projectData?.repository_stats?.license && (
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-600">
                  <div className="flex items-center space-x-2 mb-2">
                    <Shield className="w-5 h-5 text-yellow-400" />
                    <span className="text-sm text-gray-400">License</span>
                  </div>
                  <p className="text-white font-medium">{projectData.repository_stats.license}</p>
                </div>
              )}
              
              {projectData?.repository_stats?.visibility && (
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-600">
                  <div className="flex items-center space-x-2 mb-2">
                    <Eye className="w-5 h-5 text-green-400" />
                    <span className="text-sm text-gray-400">Visibility</span>
                  </div>
                  <span className={`px-3 py-1 text-sm rounded-full ${
                    projectData.repository_stats.visibility === 'public' 
                      ? 'bg-green-600 text-green-100' 
                      : 'bg-yellow-600 text-yellow-100'
                  }`}>
                    {projectData.repository_stats.visibility}
                  </span>
                </div>
              )}
              
              {projectData?.repository_stats?.homepage && (
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-600">
                  <div className="flex items-center space-x-2 mb-2">
                    <Globe className="w-5 h-5 text-blue-400" />
                    <span className="text-sm text-gray-400">Homepage</span>
                  </div>
                  <a 
                    href={projectData.repository_stats.homepage} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline flex items-center space-x-1"
                  >
                    <span className="truncate">{projectData.repository_stats.homepage}</span>
                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                  </a>
                </div>
              )}
            </div>

            {/* Topics */}
            {projectData?.repository_stats?.topics && projectData.repository_stats.topics.length > 0 && (
              <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-600">
                <div className="flex items-center space-x-2 mb-3">
                  <Tag className="w-5 h-5 text-purple-400" />
                  <span className="text-lg font-semibold text-white">Topics</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {projectData.repository_stats.topics.map((topic, index) => (
                    <span key={index} className="px-3 py-1 bg-blue-600 text-blue-100 text-sm rounded-full">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Repository Timeline */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Calendar className="w-6 h-6 text-green-400 mr-3" />
              Repository Timeline
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {projectData?.repository_stats?.created_at && (
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-600">
                  <h3 className="text-lg font-semibold text-white mb-2">Created</h3>
                  <p className="text-gray-300">{formatDate(projectData.repository_stats.created_at)}</p>
                </div>
              )}

              {projectData?.repository_stats?.updated_at && (
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-600">
                  <h3 className="text-lg font-semibold text-white mb-2">Last Updated</h3>
                  <p className="text-gray-300">{formatDate(projectData.repository_stats.updated_at)}</p>
                </div>
              )}

              {projectData?.repository_stats?.pushed_at && (
                <div className="p-4 bg-gray-900 rounded-lg border border-gray-600">
                  <h3 className="text-lg font-semibold text-white mb-2">Last Push</h3>
                  <p className="text-gray-300">{formatDate(projectData.repository_stats.pushed_at)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Repository Features */}
          {projectData?.repository_stats && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-8">
              <h2 className="text-2xl font-bold text-white mb-6">Repository Features</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className={`p-4 rounded-lg text-center ${
                  projectData.repository_stats.has_issues
                    ? 'bg-green-600 text-green-100'
                    : 'bg-gray-700 text-gray-400'
                }`}>
                  <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                  <span className="text-sm font-medium">Issues {projectData.repository_stats.has_issues ? '✓' : '✗'}</span>
                </div>
                <div className={`p-4 rounded-lg text-center ${
                  projectData.repository_stats.has_projects
                    ? 'bg-green-600 text-green-100'
                    : 'bg-gray-700 text-gray-400'
                }`}>
                  <GitCommit className="w-6 h-6 mx-auto mb-2" />
                  <span className="text-sm font-medium">Projects {projectData.repository_stats.has_projects ? '✓' : '✗'}</span>
                </div>
                <div className={`p-4 rounded-lg text-center ${
                  projectData.repository_stats.has_wiki
                    ? 'bg-green-600 text-green-100'
                    : 'bg-gray-700 text-gray-400'
                }`}>
                  <BookOpen className="w-6 h-6 mx-auto mb-2" />
                  <span className="text-sm font-medium">Wiki {projectData.repository_stats.has_wiki ? '✓' : '✗'}</span>
                </div>
                <div className={`p-4 rounded-lg text-center ${
                  projectData.repository_stats.has_pages
                    ? 'bg-green-600 text-green-100'
                    : 'bg-gray-700 text-gray-400'
                }`}>
                  <Globe className="w-6 h-6 mx-auto mb-2" />
                  <span className="text-sm font-medium">Pages {projectData.repository_stats.has_pages ? '✓' : '✗'}</span>
                </div>
                <div className={`p-4 rounded-lg text-center ${
                  projectData.repository_stats.has_downloads
                    ? 'bg-green-600 text-green-100'
                    : 'bg-gray-700 text-gray-400'
                }`}>
                  <Upload className="w-6 h-6 mx-auto mb-2" />
                  <span className="text-sm font-medium">Downloads {projectData.repository_stats.has_downloads ? '✓' : '✗'}</span>
                </div>
              </div>

              {projectData.repository_stats.archived && (
                <div className="mt-4 p-4 bg-yellow-600 text-yellow-100 rounded-lg text-center">
                  <span className="font-medium">⚠️ This repository is archived</span>
                </div>
              )}
            </div>
          )}

          {/* Activity Overview */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Activity Overview</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="text-center p-6 bg-gray-900 rounded-lg border border-gray-600">
                <GitCommit className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
                <div className="text-3xl font-bold text-white mb-2">
                  {projectData?.commits?.length || 0}
                </div>
                <p className="text-gray-400">Recent Commits</p>
              </div>
              <div className="text-center p-6 bg-gray-900 rounded-lg border border-gray-600">
                <GitMerge className="w-8 h-8 text-green-400 mx-auto mb-3" />
                <div className="text-3xl font-bold text-white mb-2">
                  {projectData?.merges?.length || 0}
                </div>
                <p className="text-gray-400">Recent Merges</p>
              </div>
              <div className="text-center p-6 bg-gray-900 rounded-lg border border-gray-600">
                <Upload className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                <div className="text-3xl font-bold text-white mb-2">
                  {projectData?.pushes?.length || 0}
                </div>
                <p className="text-gray-400">Recent Pushes</p>
              </div>
            </div>

            {/* Contributors Summary */}
            {projectData?.contributors && projectData.contributors.length > 0 && (
              <div className="p-6 bg-gray-900 rounded-lg border border-gray-600">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <Users className="w-6 h-6 text-purple-400 mr-2" />
                  Contributors ({projectData.contributors.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <p className="text-gray-400 mb-2">Total Contributions</p>
                    <p className="text-2xl font-bold text-white">
                      {projectData.contributors.reduce((sum, contributor) => sum + (contributor.contributions || 0), 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-2">Top Contributor</p>
                    {projectData.contributors[0] && (
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
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

                {/* All Contributors */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projectData.contributors.slice(0, 12).map((contributor, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-white">
                          {contributor.login?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{contributor.login}</p>
                        <p className="text-xs text-gray-400">{contributor.contributions} contributions</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent Activity Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Commits */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <GitCommit className="w-5 h-5 text-yellow-400 mr-2" />
                Recent Commits
              </h3>
              <div className="space-y-4">
                {projectData?.commits?.slice(0, 8).map((commit, index) => (
                  <div key={index} className="border-l-2 border-yellow-600 pl-3">
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
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Upload className="w-5 h-5 text-blue-400 mr-2" />
                Recent Pushes
              </h3>
              <div className="space-y-4">
                {projectData?.pushes?.slice(0, 8).map((push, index) => (
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
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <GitMerge className="w-5 h-5 text-green-400 mr-2" />
                Recent Merges
              </h3>
              <div className="space-y-4">
                {projectData?.merges?.slice(0, 8).map((merge, index) => (
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

          {/* README Documentation */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <BookOpen className="w-6 h-6 text-purple-400 mr-3" />
              README Documentation
            </h2>

            <div className="bg-gray-900 border border-gray-600 rounded-lg p-6">
              {projectData?.documentation ? (
                <div className="prose prose-invert prose-lg max-w-none">
                  <ReactMarkdown
                    components={{
                      // Custom styling for markdown elements
                      h1: ({children}) => <h1 className="text-3xl font-bold text-white mb-6 border-b border-gray-600 pb-3">{children}</h1>,
                      h2: ({children}) => <h2 className="text-2xl font-semibold text-white mb-4 mt-8">{children}</h2>,
                      h3: ({children}) => <h3 className="text-xl font-medium text-white mb-3 mt-6">{children}</h3>,
                      h4: ({children}) => <h4 className="text-lg font-medium text-white mb-2 mt-4">{children}</h4>,
                      p: ({children}) => <p className="text-gray-300 mb-4 leading-relaxed text-base">{children}</p>,
                      code: ({children}) => <code className="bg-gray-700 text-gray-200 px-2 py-1 rounded text-sm font-mono">{children}</code>,
                      pre: ({children}) => <pre className="bg-gray-800 border border-gray-600 rounded-lg p-4 overflow-x-auto mb-6 text-sm">{children}</pre>,
                      a: ({href, children}) => <a href={href} className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                      ul: ({children}) => <ul className="text-gray-300 mb-4 ml-6 list-disc space-y-1">{children}</ul>,
                      ol: ({children}) => <ol className="text-gray-300 mb-4 ml-6 list-decimal space-y-1">{children}</ol>,
                      li: ({children}) => <li className="mb-1">{children}</li>,
                      blockquote: ({children}) => <blockquote className="border-l-4 border-purple-500 pl-6 italic text-gray-400 mb-6 bg-gray-800 py-4 rounded-r">{children}</blockquote>,
                      table: ({children}) => <table className="w-full border-collapse border border-gray-600 mb-6">{children}</table>,
                      th: ({children}) => <th className="border border-gray-600 px-4 py-2 bg-gray-700 text-white font-semibold text-left">{children}</th>,
                      td: ({children}) => <td className="border border-gray-600 px-4 py-2 text-gray-300">{children}</td>,
                      img: ({src, alt}) => <img src={src} alt={alt} className="max-w-full h-auto rounded-lg mb-4" />
                    }}
                  >
                    {projectData.documentation}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No README documentation available</p>
                  <p className="text-gray-600 text-sm mt-2">This repository doesn't have a README file</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FullDocumentation;
