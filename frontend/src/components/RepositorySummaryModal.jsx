import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, Star, GitFork, Eye, Calendar, User, Code, FileText, 
  ExternalLink, Download, BookOpen, Activity, Clock, 
  GitCommit, AlertCircle, Loader2, Copy, Check
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const RepositorySummaryModal = ({ repository, onClose }) => {
  const { makeAuthenticatedRequest } = useAuth();
  
  const [summary, setSummary] = useState('');
  const [recentCommits, setRecentCommits] = useState([]);
  const [readme, setReadme] = useState('');
  const [languages, setLanguages] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [copied, setCopied] = useState(false);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

  const fetchRepositoryDetails = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch repository summary from our backend
      const summaryResponse = await makeAuthenticatedRequest(`${backendUrl}/api/v1/search/repository-summary`, {
        method: 'POST',
        body: JSON.stringify({
          owner: repository.owner.login,
          repo: repository.name,
          full_name: repository.full_name
        })
      });

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        setSummary(summaryData.summary || 'No summary available');
        setRecentCommits(summaryData.recent_commits || []);
        setReadme(summaryData.readme || '');
        setLanguages(summaryData.languages || {});
      } else {
        // Fallback to basic information
        setSummary(`${repository.full_name} is a ${repository.language || 'software'} project with ${repository.stargazers_count} stars and ${repository.forks_count} forks.`);
      }
    } catch (err) {
      console.error('Error fetching repository details:', err);
      setError('Failed to load repository details');
      setSummary(`${repository.full_name} is a ${repository.language || 'software'} project with ${repository.stargazers_count} stars and ${repository.forks_count} forks.`);
    } finally {
      setLoading(false);
    }
  }, [repository, makeAuthenticatedRequest, backendUrl]);

  useEffect(() => {
    if (repository) {
      fetchRepositoryDetails();
    }
  }, [repository, fetchRepositoryDetails]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getLanguageColor = (language) => {
    const colors = {
      JavaScript: '#f1e05a',
      Python: '#3572A5',
      Java: '#b07219',
      TypeScript: '#2b7489',
      C: '#555555',
      'C++': '#f34b7d',
      'C#': '#239120',
      PHP: '#4F5D95',
      Ruby: '#701516',
      Go: '#00ADD8',
      Rust: '#dea584',
      Swift: '#ffac45',
      Kotlin: '#F18E33',
      Dart: '#00B4AB',
      HTML: '#e34c26',
      CSS: '#1572B6',
      Shell: '#89e051',
      PowerShell: '#012456',
      Dockerfile: '#384d54',
      Vue: '#2c3e50',
      React: '#61dafb'
    };
    return colors[language] || '#8b949e';
  };

  if (!repository) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <img
                src={repository.owner.avatar_url}
                alt={repository.owner.login}
                className="w-16 h-16 rounded-full"
              />
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  <a
                    href={repository.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-400 transition-colors flex items-center space-x-2"
                  >
                    <span>{repository.full_name}</span>
                    <ExternalLink className="w-5 h-5" />
                  </a>
                </h2>
                {repository.description && (
                  <p className="text-gray-300 mb-3">{repository.description}</p>
                )}
                
                {/* Repository Stats */}
                <div className="flex items-center space-x-6 text-sm text-gray-400">
                  <span className="flex items-center space-x-1">
                    <Star className="w-4 h-4" />
                    <span>{formatNumber(repository.stargazers_count)}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <GitFork className="w-4 h-4" />
                    <span>{formatNumber(repository.forks_count)}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Eye className="w-4 h-4" />
                    <span>{formatNumber(repository.watchers_count)}</span>
                  </span>
                  {repository.language && (
                    <span className="flex items-center space-x-1">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: getLanguageColor(repository.language) }}
                      ></div>
                      <span>{repository.language}</span>
                    </span>
                  )}
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Updated {formatDate(repository.updated_at)}</span>
                  </span>
                </div>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Quick Actions */}
          <div className="flex items-center space-x-3 mt-4">
            <a
              href={repository.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>View on GitHub</span>
            </a>
            
            <button
              onClick={() => copyToClipboard(repository.clone_url)}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Clone URL'}</span>
            </button>
            
            {repository.homepage && (
              <a
                href={repository.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                <span>Website</span>
              </a>
            )}
          </div>
          
          {/* Topics */}
          {repository.topics && repository.topics.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {repository.topics.map((topic) => (
                <span
                  key={topic}
                  className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {[
            { id: 'overview', label: 'Overview', icon: FileText },
            { id: 'activity', label: 'Recent Activity', icon: Activity },
            { id: 'languages', label: 'Languages', icon: Code }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <span className="ml-3 text-gray-400">Loading repository details...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <span className="ml-3 text-red-400">{error}</span>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* AI Summary */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                      <Activity className="w-5 h-5" />
                      <span>AI Summary</span>
                    </h3>
                    <div className="bg-gray-700 rounded-lg p-4">
                      <p className="text-gray-300 leading-relaxed">{summary}</p>
                    </div>
                  </div>
                  
                  {/* README Preview */}
                  {readme && (
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
                        <BookOpen className="w-5 h-5" />
                        <span>README Preview</span>
                      </h3>
                      <div className="bg-gray-700 rounded-lg p-4 max-h-64 overflow-y-auto">
                        <pre className="text-gray-300 text-sm whitespace-pre-wrap">{readme.substring(0, 1000)}{readme.length > 1000 ? '...' : ''}</pre>
                      </div>
                    </div>
                  )}
                  
                  {/* Repository Info */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Repository Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-700 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-1">Created</div>
                        <div className="text-white">{formatDate(repository.created_at)}</div>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-1">Last Push</div>
                        <div className="text-white">{formatDate(repository.pushed_at)}</div>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-1">Size</div>
                        <div className="text-white">{(repository.size / 1024).toFixed(1)} MB</div>
                      </div>
                      <div className="bg-gray-700 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-1">Default Branch</div>
                        <div className="text-white">{repository.default_branch}</div>
                      </div>
                      {repository.license && (
                        <div className="bg-gray-700 rounded-lg p-4">
                          <div className="text-sm text-gray-400 mb-1">License</div>
                          <div className="text-white">{repository.license}</div>
                        </div>
                      )}
                      <div className="bg-gray-700 rounded-lg p-4">
                        <div className="text-sm text-gray-400 mb-1">Open Issues</div>
                        <div className="text-white">{repository.open_issues_count}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'activity' && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                    <GitCommit className="w-5 h-5" />
                    <span>Recent Commits</span>
                  </h3>
                  {recentCommits.length > 0 ? (
                    <div className="space-y-3">
                      {recentCommits.map((commit, index) => (
                        <div key={index} className="bg-gray-700 rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-white font-medium mb-1">{commit.message}</p>
                              <div className="flex items-center space-x-4 text-sm text-gray-400">
                                <span>{commit.author}</span>
                                <span className="flex items-center space-x-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatDate(commit.date)}</span>
                                </span>
                              </div>
                            </div>
                            <code className="text-xs bg-gray-600 px-2 py-1 rounded text-gray-300">
                              {commit.sha?.substring(0, 7)}
                            </code>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <GitCommit className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No recent commits available</p>
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'languages' && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                    <Code className="w-5 h-5" />
                    <span>Languages Used</span>
                  </h3>
                  {Object.keys(languages).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(languages)
                        .sort(([,a], [,b]) => b - a)
                        .map(([language, percentage]) => (
                          <div key={language} className="bg-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: getLanguageColor(language) }}
                                ></div>
                                <span className="text-white font-medium">{language}</span>
                              </div>
                              <span className="text-gray-400">{percentage.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-600 rounded-full h-2">
                              <div 
                                className="h-2 rounded-full" 
                                style={{ 
                                  backgroundColor: getLanguageColor(language),
                                  width: `${percentage}%`
                                }}
                              ></div>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Code className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Language information not available</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RepositorySummaryModal;
