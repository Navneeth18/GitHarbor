import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [accessToken, setAccessToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000';

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      validateToken(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  // Validate token with backend
  const validateToken = useCallback(async (token) => {
    try {
      console.log('Validating token...');
      const response = await fetch(`${backendUrl}/api/v1/auth/validate`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Token is valid');
        setAccessToken(token);
        setIsAuthenticated(true);
        setUser(data.user);
        localStorage.setItem('access_token', token);
      } else {
        console.log('Token is invalid, attempting refresh');
        // Call refreshToken directly to avoid dependency issues
        try {
          console.log('Attempting to refresh GitHub token...');
          const refreshResponse = await fetch(`${backendUrl}/api/v1/auth/refresh-token`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            console.log('Redirecting to GitHub for re-authentication');
            window.location.href = refreshData.auth_url;
          } else {
            console.log('Token refresh failed, clearing storage');
            localStorage.removeItem('access_token');
            setAccessToken(null);
            setIsAuthenticated(false);
            setUser(null);
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          localStorage.removeItem('access_token');
          setAccessToken(null);
          setIsAuthenticated(false);
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Token validation failed:', error);
      // Call refreshToken directly to avoid dependency issues
      try {
        console.log('Attempting to refresh GitHub token...');
        const refreshResponse = await fetch(`${backendUrl}/api/v1/auth/refresh-token`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          console.log('Redirecting to GitHub for re-authentication');
          window.location.href = refreshData.auth_url;
        } else {
          console.log('Token refresh failed, clearing storage');
          localStorage.removeItem('access_token');
          setAccessToken(null);
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        localStorage.removeItem('access_token');
        setAccessToken(null);
        setIsAuthenticated(false);
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [backendUrl]);

  // Refresh GitHub token
  const refreshToken = useCallback(async (oldToken) => {
    try {
      console.log('Attempting to refresh GitHub token...');
      const response = await fetch(`${backendUrl}/api/v1/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${oldToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Redirecting to GitHub for re-authentication');
        window.location.href = data.auth_url;
      } else {
        console.log('Token refresh failed, clearing storage');
        localStorage.removeItem('access_token');
        setAccessToken(null);
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      localStorage.removeItem('access_token');
      setAccessToken(null);
      setIsAuthenticated(false);
      setUser(null);
    }
  }, [backendUrl]);

  // Login success handler
  const handleLoginSuccess = useCallback((token) => {
    console.log('Login successful, storing token');
    setAccessToken(token);
    setIsAuthenticated(true);
    localStorage.setItem('access_token', token);
    validateToken(token);
  }, [validateToken]);

  // Logout handler
  const logout = useCallback(() => {
    console.log('Logging out...');
    localStorage.removeItem('access_token');
    setAccessToken(null);
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  // Get a valid token (with automatic refresh if needed)
  const getValidToken = useCallback(async () => {
    if (!accessToken) {
      throw new Error('No access token available');
    }

    // Try to validate the current token
    try {
      const response = await fetch(`${backendUrl}/api/v1/auth/validate`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        return accessToken;
      } else {
        // Token is invalid, try to refresh
        try {
          console.log('Attempting to refresh GitHub token...');
          const refreshResponse = await fetch(`${backendUrl}/api/v1/auth/refresh-token`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            console.log('Redirecting to GitHub for re-authentication');
            window.location.href = refreshData.auth_url;
          } else {
            console.log('Token refresh failed, clearing storage');
            localStorage.removeItem('access_token');
            setAccessToken(null);
            setIsAuthenticated(false);
            setUser(null);
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          localStorage.removeItem('access_token');
          setAccessToken(null);
          setIsAuthenticated(false);
          setUser(null);
        }
        throw new Error('Token refresh in progress');
      }
    } catch (error) {
      console.error('Error getting valid token:', error);
      throw error;
    }
  }, [accessToken, backendUrl]);

  // Make authenticated API request with automatic token refresh
  const makeAuthenticatedRequest = useCallback(async (url, options = {}) => {
    try {
      console.log('=== makeAuthenticatedRequest DEBUG ===');
      console.log('URL:', url);
      console.log('Current accessToken:', accessToken);
      console.log('Is authenticated:', isAuthenticated);
      console.log('Options:', options);
      
      if (!accessToken) {
        console.error('No access token available');
        throw new Error('No access token available');
      }
      
      console.log('Using token for request to:', url);
      console.log('Token length:', accessToken.length);
      console.log('Token preview:', accessToken.substring(0, 20) + '...');
      
      const requestHeaders = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      };
      console.log('Request headers:', requestHeaders);
      
      const response = await fetch(url, {
        ...options,
        headers: requestHeaders,
      });

      console.log('Response received:', response.status, response.statusText);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.status === 401) {
        console.log('401 Unauthorized - Token may be expired');
        // Token expired, try to refresh
        try {
          console.log('Attempting to refresh GitHub token...');
          const refreshResponse = await fetch(`${backendUrl}/api/v1/auth/refresh-token`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            console.log('Redirecting to GitHub for re-authentication');
            window.location.href = refreshData.auth_url;
          } else {
            console.log('Token refresh failed, clearing storage');
            localStorage.removeItem('access_token');
            setAccessToken(null);
            setIsAuthenticated(false);
            setUser(null);
          }
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          localStorage.removeItem('access_token');
          setAccessToken(null);
          setIsAuthenticated(false);
          setUser(null);
        }
        throw new Error('Token expired, please try again');
      }

      console.log('=== END makeAuthenticatedRequest DEBUG ===');
      return response;
    } catch (error) {
      console.error('Authenticated request failed:', error);
      throw error;
    }
  }, [accessToken, backendUrl, isAuthenticated]);

  const value = {
    accessToken,
    isAuthenticated,
    isLoading,
    user,
    handleLoginSuccess,
    logout,
    getValidToken,
    makeAuthenticatedRequest,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 