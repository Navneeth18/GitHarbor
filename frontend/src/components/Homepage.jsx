import React, { useState, useEffect } from 'react';
import { Github, Loader2, AlertCircle } from 'lucide-react';

/**
 * Homepage component that displays a grid of available GitHub projects
 * Fetches project list from the backend API using user's authentication
 */
function Homepage({ onProjectSelect, accessToken }) {
  // State for projects data, loading, and error handling
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Backend URL from environment variables
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

  /**
   * Fetch projects from the backend API
   */
  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${backendUrl}/api/v1/projects/`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication expired. Please login again.');
        }
        throw new Error(`Failed to fetch projects: ${response.status}`);
      }
      
      const data = await response.json();
      setProjects(data);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err.message || 'Failed to load projects. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch projects on component mount or when accessToken changes
  useEffect(() => {
    if (accessToken) {
      fetchProjects();
    }
  }, [accessToken]);

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
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">
          Explore your repositories with AI-powered insights. 
          Get summaries, ask questions, and understand codebases faster.
        </p>
      </div>

      {/* Projects grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {projects.map((project) => (
          <div
            key={project.id}
            onClick={() => onProjectSelect(project.id)}
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

      {/* Empty state */}
      {projects.length === 0 && !loading && (
        <div className="text-center py-12">
          <Github className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-2">No repositories found</p>
          <p className="text-gray-500 text-sm">You don't have any public repositories or the repositories are not accessible.</p>
        </div>
      )}
    </div>
  );
}

export default Homepage;