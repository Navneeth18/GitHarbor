import React, { useEffect, useState } from 'react';
import { Github, Loader2, CheckCircle } from 'lucide-react';

/**
 * LoginPage component that handles GitHub OAuth authentication
 */
function LoginPage({ onLoginSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

  // Check if we're returning from GitHub OAuth
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');
    
    if (token) {
      // Store the token and notify parent component
      localStorage.setItem('access_token', token);
      onLoginSuccess(token);
      
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (error) {
      setError('Authentication failed. Please try again.');
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [onLoginSuccess]);

  const handleGitHubLogin = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`${backendUrl}/api/v1/auth/login`);
      const loginUrl = await response.text();
      
      // Redirect to GitHub OAuth
      window.location.href = loginUrl;
      
    } catch (err) {
      console.error('Login error:', err);
      setError('Failed to start login process. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">K</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to Kortex</h1>
          <p className="text-gray-400">Sign in to access your GitHub repositories</p>
        </div>

        {/* Login Card */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="text-center">
              <p className="text-gray-300 mb-6">
                Connect your GitHub account to explore your repositories with AI-powered insights.
              </p>
            </div>

            <button
              onClick={handleGitHubLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Github className="w-5 h-5" />
              )}
              <span>
                {isLoading ? 'Connecting...' : 'Continue with GitHub'}
              </span>
            </button>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                By continuing, you agree to our terms of service and privacy policy.
              </p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 text-center">
          <div className="grid grid-cols-1 gap-4 text-sm text-gray-400">
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>AI-powered code analysis</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Repository insights and summaries</span>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Secure GitHub integration</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage; 