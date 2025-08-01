import React, { useState, useEffect } from 'react';
import Homepage from './components/Homepage';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage';

/**
 * Main App component that handles routing between Login, Homepage and Dashboard
 * Uses simple state-based routing instead of react-router-dom
 */
function App() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  
  // Page state to handle navigation - either 'home' or 'dashboard'
  const [page, setPage] = useState({ name: 'home', projectId: null });

  // Check for existing token on app load
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      setAccessToken(token);
      setIsAuthenticated(true);
    }
  }, []);

  /**
   * Handle successful login
   */
  const handleLoginSuccess = (token) => {
    setAccessToken(token);
    setIsAuthenticated(true);
  };

  /**
   * Handle logout
   */
  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setAccessToken(null);
    setIsAuthenticated(false);
    setPage({ name: 'home', projectId: null });
  };

  /**
   * Navigation function to switch between pages
   * @param {Object} newPage - Page object with name and optional projectId
   */
  const navigateTo = (newPage) => {
    setPage(newPage);
  };

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header with Kortex branding and navigation */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div 
              className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => navigateTo({ name: 'home', projectId: null })}
            >
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">K</span>
              </div>
              <h1 className="text-2xl font-bold text-white">Kortex</h1>
            </div>
            <div className="flex items-center space-x-4">
              <p className="text-gray-400 text-sm">GitHub Knowledge Transfer Platform</p>
              <button
                onClick={handleLogout}
                className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {page.name === 'home' && (
          <Homepage 
            onProjectSelect={(projectId) => 
              navigateTo({ name: 'dashboard', projectId })
            }
            accessToken={accessToken}
          />
        )}
        {page.name === 'dashboard' && (
          <Dashboard 
            projectId={page.projectId}
            onBack={() => navigateTo({ name: 'home', projectId: null })}
            accessToken={accessToken}
          />
        )}
      </main>
    </div>
  );
}

export default App;