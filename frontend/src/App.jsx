import React, { useState, useEffect } from 'react';
import { Search, X, Globe } from 'lucide-react';
import Homepage from './components/Homepage';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage';
import MessagingPage from './components/MessagingPage';
import FullDocumentation from './components/FullDocumentation';
import GlobalSearch from './components/GlobalSearch';
import { AuthProvider, useAuth } from './contexts/AuthContext';

/**
 * Main App component that handles routing between Login, Homepage and Dashboard
 * Uses simple state-based routing instead of react-router-dom
 */
function AppContent() {
  const { isAuthenticated, isLoading, handleLoginSuccess, logout } = useAuth();

  // Page state to handle navigation - 'home', 'dashboard', 'messaging', or 'docs'
  const [page, setPage] = useState({ name: 'home', projectId: null });

  // Global search state
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [showGlobalSearchModal, setShowGlobalSearchModal] = useState(false);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K or Cmd+K to open global search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isAuthenticated) {
          setShowGlobalSearchModal(true);
        }
      }
      // Escape to close global search
      if (e.key === 'Escape') {
        setShowGlobalSearchModal(false);
        setShowGlobalSearch(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated]);

  /**
   * Navigation function to switch between pages
   * @param {Object} newPage - Page object with name and optional projectId
   */
  const navigateTo = (newPage) => {
    console.log('navigateTo called with:', newPage);
    setPage(newPage);
    setShowGlobalSearch(false); // Close search when navigating
  };

  /**
   * Handle global search
   */
  const handleGlobalSearch = (query) => {
    if (query.trim()) {
      // Navigate to homepage with search query
      setPage({ name: 'home', projectId: null, searchQuery: query });
      setShowGlobalSearch(false);
    }
  };

  /**
   * Toggle global search
   */
  const toggleGlobalSearch = () => {
    setShowGlobalSearch(!showGlobalSearch);
    if (!showGlobalSearch) {
      setGlobalSearchQuery('');
    }
  };

  // Handle URL hash routing for full documentation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/docs/')) {
        const projectId = decodeURIComponent(hash.replace('#/docs/', ''));
        setPage({ name: 'docs', projectId });
      }
    };

    // Check initial hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + K to open global search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowGlobalSearchModal(true);
      }
      // Escape to close search
      if (e.key === 'Escape') {
        if (showGlobalSearchModal) {
          setShowGlobalSearchModal(false);
        } else if (showGlobalSearch) {
          setShowGlobalSearch(false);
          setGlobalSearchQuery('');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showGlobalSearch, showGlobalSearchModal]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">K</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Kortex</h1>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

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
            <div className="flex items-center space-x-6">
              {/* Local Search */}
              {showGlobalSearch ? (
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <input
                      type="text"
                      value={globalSearchQuery}
                      onChange={(e) => setGlobalSearchQuery(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleGlobalSearch(globalSearchQuery);
                        }
                      }}
                      placeholder="Search your repositories..."
                      className="w-64 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>
                  <button
                    onClick={toggleGlobalSearch}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={toggleGlobalSearch}
                  className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-gray-700"
                  title="Search your repos (Ctrl+K for global)"
                >
                  <Search className="w-4 h-4" />
                  <span className="hidden sm:inline">Local Search</span>
                </button>
              )}

              {/* Global Search Button */}
              <button
                onClick={() => setShowGlobalSearchModal(true)}
                className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-gray-700"
                title="Global GitHub Search (Ctrl+K)"
              >
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">Global Search</span>
                <span className="hidden lg:inline text-xs text-gray-500 ml-2">⌘K</span>
              </button>

              <button
                onClick={() => navigateTo({ name: 'messaging', projectId: null })}
                className="text-gray-300 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-gray-700"
              >
                💬 Chat
              </button>
              <p className="text-gray-400 text-sm hidden md:block">GitHub Knowledge Transfer Platform</p>
              <button
                onClick={logout}
                className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main className={`${page.name === 'docs' ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'} py-8 overflow-hidden`}>
        {page.name === 'home' && (
          <Homepage
            onProjectSelect={(projectId) =>
              navigateTo({ name: 'dashboard', projectId })
            }
            initialSearchQuery={page.searchQuery}
          />
        )}
        {page.name === 'dashboard' && (
          <Dashboard
            projectId={page.projectId}
            onBack={() => navigateTo({ name: 'home', projectId: null })}
          />
        )}
        {page.name === 'messaging' && (
          <MessagingPage
            onBack={() => navigateTo({ name: 'home', projectId: null })}
          />
        )}
        {page.name === 'docs' && (
          <FullDocumentation
            projectId={page.projectId}
            onBack={() => {
              window.location.hash = '';
              navigateTo({ name: 'dashboard', projectId: page.projectId });
            }}
          />
        )}
      </main>

      {/* Global Search Modal */}
      {showGlobalSearchModal && (
        <GlobalSearch
          onClose={() => setShowGlobalSearchModal(false)}
        />
      )}
    </div>
  );
}

/**
 * Main App component wrapped with AuthProvider
 */
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;