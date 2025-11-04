import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Database-integrated IBOSS Portfolio Tracker Component
const DatabaseIntegratedPortfolioTracker = () => {
  // State management
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [portfolioTab, setPortfolioTab] = useState('overview');
  const [credentials, setCredentials] = useState({
    bankUsername: '',
    bankPassword: '',
    ibossUsername: '',
    ibossPassword: ''
  });
  const [user, setUser] = useState(null);
  const [portfolioData, setPortfolioData] = useState({
    summary: null,
    holdings: [],
    performance: [],
    riskMetrics: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // API configuration
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  const token = localStorage.getItem('authToken');

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setIsLoggedIn(true);
      loadPortfolioData();
    }
  }, [token]);

  // API service functions
  const apiService = {
    async login(credentials) {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials);
      return response.data;
    },

    async getPortfolioSummary() {
      const response = await axios.get(`${API_BASE_URL}/portfolio/summary`);
      return response.data;
    },

    async getHoldings(accountNumber) {
      const response = await axios.get(`${API_BASE_URL}/portfolio/holdings`, {
        params: { accountNumber }
      });
      return response.data;
    },

    async getPerformance(accountNumber) {
      const response = await axios.get(`${API_BASE_URL}/portfolio/performance`, {
        params: { accountNumber }
      });
      return response.data;
    },

    async getRiskMetrics(accountNumber) {
      const response = await axios.get(`${API_BASE_URL}/portfolio/risk`, {
        params: { accountNumber }
      });
      return response.data;
    },

    async refreshPortfolio(accountNumber, ibossPassword) {
      const response = await axios.post(`${API_BASE_URL}/portfolio/refresh`, {
        accountNumber,
        ibossPassword
      });
      return response.data;
    }
  };

  // Handle login
  const handleLogin = async () => {
    if (!credentials.bankUsername || !credentials.bankPassword || 
        !credentials.ibossUsername || !credentials.ibossPassword) {
      setError('Please fill in all credentials');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiService.login(credentials);
      
      // Store token and user data
      localStorage.setItem('authToken', response.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${response.token}`;
      
      setUser(response.user);
      setIsLoggedIn(true);
      
      // Load portfolio data
      await loadPortfolioData();
      
      if (response.warning) {
        setError(response.warning);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Load portfolio data from database
  const loadPortfolioData = async () => {
    if (!user?.accountNumber) return;

    setLoading(true);
    try {
      const [summary, holdings, performance, riskMetrics] = await Promise.all([
        apiService.getPortfolioSummary(),
        apiService.getHoldings(user.accountNumber),
        apiService.getPerformance(user.accountNumber),
        apiService.getRiskMetrics(user.accountNumber)
      ]);

      setPortfolioData({
        summary,
        holdings,
        performance: formatPerformanceData(performance),
        riskMetrics
      });
    } catch (err) {
      console.error('Failed to load portfolio data:', err);
      setError('Failed to load portfolio data');
    } finally {
      setLoading(false);
    }
  };

  // Format performance data for display
  const formatPerformanceData = (performanceArray) => {
    const formatted = {};
    performanceArray.forEach(item => {
      formatted[item.period_type] = {
        value: item.return_percent,
        amount: item.return_amount,
        benchmark: item.benchmark_return,
        alpha: item.alpha
      };
    });
    return formatted;
  };

  // Handle refresh
  const handleRefresh = async () => {
    if (!user?.accountNumber) return;

    setRefreshing(true);
    try {
      await apiService.refreshPortfolio(user.accountNumber, credentials.ibossPassword);
      await loadPortfolioData();
    } catch (err) {
      console.error('Refresh error:', err);
      setError('Failed to refresh portfolio data');
    } finally {
      setRefreshing(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    delete axios.defaults.headers.common['Authorization'];
    setIsLoggedIn(false);
    setUser(null);
    setPortfolioData({ summary: null, holdings: [], performance: [], riskMetrics: null });
    setCredentials({ bankUsername: '', bankPassword: '', ibossUsername: '', ibossPassword: '' });
    setError(null);
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
  };

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 py-16">
        <div className="container mx-auto px-4 max-w-md">
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            <div className="bg-red-600 text-white p-6 text-center">
              <h2 className="text-2xl font-bold">IBOSS Portfolio Tracker</h2>
              <p className="mt-2">Database-Integrated Portfolio Analytics</p>
            </div>
            
            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bank Username</label>
                <input
                  type="text"
                  value={credentials.bankUsername}
                  onChange={(e) => handleInputChange('bankUsername', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter your bank username"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bank Password</label>
                <input
                  type="password"
                  value={credentials.bankPassword}
                  onChange={(e) => handleInputChange('bankPassword', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter your bank password"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">IBOSS Trading Username</label>
                <input
                  type="text"
                  value={credentials.ibossUsername}
                  onChange={(e) => handleInputChange('ibossUsername', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Your IBOSS trading username"
                  disabled={loading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">IBOSS Trading Password</label>
                <input
                  type="password"
                  value={credentials.ibossPassword}
                  onChange={(e) => handleInputChange('ibossPassword', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Your IBOSS trading password"
                  disabled={loading}
                />
              </div>
              
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '🔄 Connecting to Database & IBOSS...' : '🔐 Secure Login'}
              </button>
              
              <div className="text-center text-sm text-gray-500 mt-4">
                Demo: demo_user / demo_pass / iboss_demo / iboss_pass
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Portfolio Dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <img src="/alhambra-logo.png" alt="Alhambra Bank" className="h-8" />
            <div>
              <span className="text-lg font-semibold text-red-700">
                Welcome back, {user?.accountName || user?.username}
              </span>
              <div className="text-sm text-gray-500">
                Account: {user?.accountNumber} | 
                Last Updated: {portfolioData.summary?.as_of_date || 'Loading...'}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="container mx-auto px-4 py-8 text-center">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading portfolio data from database...</p>
          </div>
        </div>
      )}

      {/* Portfolio Metrics */}
      {!loading && portfolioData.summary && (
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Equity</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${portfolioData.summary.total_equity?.toLocaleString() || '0'}
                  </p>
                  <p className="text-xs text-gray-500">Net Liquidation Value</p>
                </div>
                <div className="text-2xl">💰</div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Day P&L</p>
                  <p className="text-2xl font-bold text-green-600">
                    +${portfolioData.summary.daily_return_amount?.toLocaleString() || '0'}
                  </p>
                  <p className="text-sm text-green-600">
                    ↗ {portfolioData.summary.daily_return || 0}%
                  </p>
                </div>
                <div className="text-2xl">📈</div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Cash Balance</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${portfolioData.summary.cash_balance?.toLocaleString() || '0'}
                  </p>
                  <p className="text-xs text-gray-500">Available Funds</p>
                </div>
                <div className="text-2xl">💵</div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Buying Power</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${portfolioData.summary.day_buying_power?.toLocaleString() || '0'}
                  </p>
                  <p className="text-xs text-gray-500">Day Trading Power</p>
                </div>
                <div className="text-2xl">⚡</div>
              </div>
            </div>
          </div>

          {/* Risk Metrics Row */}
          {portfolioData.riskMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                <p className="text-xs text-gray-600">Risk Score</p>
                <p className="text-lg font-bold text-yellow-600">
                  {portfolioData.riskMetrics.risk_score}/10
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                <p className="text-xs text-gray-600">Beta</p>
                <p className="text-lg font-bold text-gray-900">
                  {portfolioData.riskMetrics.beta}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                <p className="text-xs text-gray-600">Sharpe Ratio</p>
                <p className="text-lg font-bold text-green-600">
                  {portfolioData.riskMetrics.sharpe_ratio}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                <p className="text-xs text-gray-600">Volatility</p>
                <p className="text-lg font-bold text-orange-600">
                  {portfolioData.riskMetrics.volatility}%
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                <p className="text-xs text-gray-600">Max Drawdown</p>
                <p className="text-lg font-bold text-red-600">
                  {portfolioData.riskMetrics.max_drawdown}%
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                <p className="text-xs text-gray-600">VaR (95%)</p>
                <p className="text-lg font-bold text-purple-600">
                  ${portfolioData.riskMetrics.var_95?.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          {/* Portfolio Tabs */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'overview', label: '📊 Overview' },
                  { id: 'holdings', label: '📈 Holdings' },
                  { id: 'performance', label: '🎯 Performance' },
                  { id: 'risk', label: '⚠️ Risk Analysis' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setPortfolioTab(tab.id)}
                    className={`py-4 px-2 border-b-2 font-medium text-sm ${
                      portfolioTab === tab.id
                        ? 'border-red-500 text-red-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Overview Tab */}
              {portfolioTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold mb-4">📊 Performance Summary</h3>
                      <div className="space-y-3">
                        {Object.entries(portfolioData.performance).map(([period, data]) => (
                          <div key={period} className="flex justify-between items-center py-2 border-b border-gray-200">
                            <span className="text-gray-600 font-medium capitalize">
                              {period.replace('_', ' ')}
                            </span>
                            <div className="text-right">
                              <div className="font-semibold text-green-600">+{data.value}% ↗️</div>
                              <div className="text-sm text-gray-500">+${data.amount?.toLocaleString()}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold mb-4">🏆 Top Holdings</h3>
                      <div className="space-y-3">
                        {portfolioData.holdings.slice(0, 5).map((holding, index) => (
                          <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200">
                            <div>
                              <div className="font-semibold">{holding.symbol}</div>
                              <div className="text-sm text-gray-500">{holding.shares} shares</div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">${holding.market_value?.toLocaleString()}</div>
                              <div className={`text-sm ${holding.day_change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {holding.day_change_percent >= 0 ? '+' : ''}{holding.day_change_percent}%
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Holdings Tab */}
              {portfolioTab === 'holdings' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">📈 Portfolio Holdings (Live Database Data)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border border-gray-200 px-4 py-2 text-left">Symbol</th>
                          <th className="border border-gray-200 px-4 py-2 text-left">Company</th>
                          <th className="border border-gray-200 px-4 py-2 text-right">Shares</th>
                          <th className="border border-gray-200 px-4 py-2 text-right">Price</th>
                          <th className="border border-gray-200 px-4 py-2 text-right">Market Value</th>
                          <th className="border border-gray-200 px-4 py-2 text-right">Day Change</th>
                          <th className="border border-gray-200 px-4 py-2 text-right">Allocation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolioData.holdings.map((holding, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="border border-gray-200 px-4 py-2 font-semibold">{holding.symbol}</td>
                            <td className="border border-gray-200 px-4 py-2">{holding.company_name}</td>
                            <td className="border border-gray-200 px-4 py-2 text-right">{holding.shares}</td>
                            <td className="border border-gray-200 px-4 py-2 text-right">${holding.current_price}</td>
                            <td className="border border-gray-200 px-4 py-2 text-right font-semibold">
                              ${holding.market_value?.toLocaleString()}
                            </td>
                            <td className={`border border-gray-200 px-4 py-2 text-right font-semibold ${
                              holding.day_change_percent >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {holding.day_change_percent >= 0 ? '+' : ''}{holding.day_change_percent}%
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-right">
                              {holding.allocation_percent?.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Performance Tab */}
              {portfolioTab === 'performance' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">🎯 Performance Analysis (Database Stored)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(portfolioData.performance).map(([period, data]) => (
                      <div key={period} className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg border-l-4 border-green-500">
                        <h4 className="font-semibold text-green-800 mb-2 capitalize">
                          {period.replace('_', ' ')} Performance
                        </h4>
                        <p className="text-2xl font-bold text-green-900">+{data.value}%</p>
                        <p className="text-sm text-green-700">+${data.amount?.toLocaleString()}</p>
                        {data.benchmark && (
                          <p className="text-xs text-green-600 mt-1">
                            Benchmark: +{data.benchmark}% | Alpha: +{data.alpha}%
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Risk Tab */}
              {portfolioTab === 'risk' && portfolioData.riskMetrics && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">⚠️ Risk Analysis (Database Calculated)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="bg-yellow-50 p-6 rounded-lg border-l-4 border-yellow-500">
                      <h4 className="font-semibold text-yellow-800 mb-2">Portfolio Beta</h4>
                      <p className="text-2xl font-bold text-yellow-900">{portfolioData.riskMetrics.beta}</p>
                      <p className="text-sm text-yellow-700">Market correlation measure</p>
                    </div>
                    <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500">
                      <h4 className="font-semibold text-blue-800 mb-2">Sharpe Ratio</h4>
                      <p className="text-2xl font-bold text-blue-900">{portfolioData.riskMetrics.sharpe_ratio}</p>
                      <p className="text-sm text-blue-700">Risk-adjusted return</p>
                    </div>
                    <div className="bg-red-50 p-6 rounded-lg border-l-4 border-red-500">
                      <h4 className="font-semibold text-red-800 mb-2">Max Drawdown</h4>
                      <p className="text-2xl font-bold text-red-900">{portfolioData.riskMetrics.max_drawdown}%</p>
                      <p className="text-sm text-red-700">Largest peak-to-trough decline</p>
                    </div>
                    <div className="bg-purple-50 p-6 rounded-lg border-l-4 border-purple-500">
                      <h4 className="font-semibold text-purple-800 mb-2">Volatility</h4>
                      <p className="text-2xl font-bold text-purple-900">{portfolioData.riskMetrics.volatility}%</p>
                      <p className="text-sm text-purple-700">Annual volatility measure</p>
                    </div>
                    <div className="bg-orange-50 p-6 rounded-lg border-l-4 border-orange-500">
                      <h4 className="font-semibold text-orange-800 mb-2">VaR (95%)</h4>
                      <p className="text-2xl font-bold text-orange-900">
                        ${portfolioData.riskMetrics.var_95?.toLocaleString()}
                      </p>
                      <p className="text-sm text-orange-700">Value at Risk (95% confidence)</p>
                    </div>
                    <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-500">
                      <h4 className="font-semibold text-green-800 mb-2">Risk Score</h4>
                      <p className="text-2xl font-bold text-green-900">{portfolioData.riskMetrics.risk_score}/10</p>
                      <p className="text-sm text-green-700">Overall risk assessment</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseIntegratedPortfolioTracker;
