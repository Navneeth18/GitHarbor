import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  BrainCircuit, 
  Users, 
  GitCommit, 
  BookOpen,
  Loader2,
  AlertCircle 
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
      {/* Header with back button and project name */}
      <div className="flex items-center space-x-4 mb-8">
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
        </div>

        {/* Center Column - Documentation */}
        <div className="lg:col-span-6">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center space-x-2 mb-6">
              <BookOpen className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Documentation</h3>
            </div>
            <div className="prose prose-invert prose-sm max-w-none">
              {projectData?.documentation ? (
                <ReactMarkdown
                  components={{
                    // Custom styling for markdown elements
                    h1: ({children}) => <h1 className="text-2xl font-bold text-white mb-4">{children}</h1>,
                    h2: ({children}) => <h2 className="text-xl font-semibold text-white mb-3 mt-6">{children}</h2>,
                    h3: ({children}) => <h3 className="text-lg font-medium text-white mb-2 mt-4">{children}</h3>,
                    p: ({children}) => <p className="text-gray-300 mb-3 leading-relaxed">{children}</p>,
                    code: ({children}) => <code className="bg-gray-700 text-gray-200 px-1 py-0.5 rounded text-sm">{children}</code>,
                    pre: ({children}) => <pre className="bg-gray-900 border border-gray-600 rounded-lg p-4 overflow-x-auto mb-4">{children}</pre>,
                    a: ({href, children}) => <a href={href} className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                    ul: ({children}) => <ul className="text-gray-300 mb-3 ml-4 list-disc">{children}</ul>,
                    ol: ({children}) => <ol className="text-gray-300 mb-3 ml-4 list-decimal">{children}</ol>,
                    li: ({children}) => <li className="mb-1">{children}</li>,
                    blockquote: ({children}) => <blockquote className="border-l-4 border-gray-600 pl-4 italic text-gray-400 mb-4">{children}</blockquote>
                  }}
                >
                  {projectData.documentation}
                </ReactMarkdown>
              ) : (
                <p className="text-gray-500">No documentation available</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - AI Chat Panel */}
        <div className="lg:col-span-3">
          <ChatPanel projectId={projectId} />
        </div>
      </div>
    </div>
  );
}

export default Dashboard;