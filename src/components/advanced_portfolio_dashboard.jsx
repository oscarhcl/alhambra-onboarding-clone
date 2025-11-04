/**
 * Advanced Portfolio Dashboard - Mobile-Responsive with Enhanced UI/UX
 * Alhambra Bank & Trust - IBOSS Portfolio Tracker Enhancement
 * 
 * This component provides a comprehensive, mobile-responsive portfolio dashboard
 * with advanced analytics, real-time updates, and professional UI/UX design.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

const AdvancedPortfolioDashboard = () => {
  // State management
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [portfolioData, setPortfolioData] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeframe, setTimeframe] = useState('1D');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30000);

  // API configuration
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));

  // Color schemes
  const colors = {
    primary: '#B91C1C', // Red-600
    secondary: '#DC2626', // Red-500
    success: '#059669', // Emerald-600
    warning: '#D97706', // Amber-600
    danger: '#DC2626', // Red-500
    info: '#2563EB', // Blue-600
    light: '#F3F4F6', // Gray-100
    dark: '#1F2937', // Gray-800
    muted: '#6B7280' // Gray-500
  };

  const chartColors = ['#B91C1C', '#DC2626', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#F97316', '#06B6D4'];

  // Authentication
  const login = async (credentials) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();
      
      if (response.ok) {
        setAuthToken(data.token);
        setUser(data.user);
        setIsAuthenticated(true);
        localStorage.setItem('authToken', data.token);
        await loadPortfolioData();
        showNotification('Login successful', 'success');
      } else {
        throw new Error(data.error || 'Login failed');
      }
    } catch (error) {
      setError(error.message);
      showNotification(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Data loading
  const loadPortfolioData = useCallback(async () => {
    if (!authToken) return;

    setIsLoading(true);
    try {
      const [summaryRes, holdingsRes, performanceRes, riskRes, marketRes] = await Promise.all([
        fetch(`${API_BASE_URL}/portfolio/summary`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }),
        fetch(`${API_BASE_URL}/portfolio/holdings`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }),
        fetch(`${API_BASE_URL}/portfolio/performance`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }),
        fetch(`${API_BASE_URL}/portfolio/risk`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }),
        fetch(`${API_BASE_URL}/market/indices`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
      ]);

      const [summary, holdings, performance, risk, market] = await Promise.all([
        summaryRes.json(),
        holdingsRes.json(),
        performanceRes.json(),
        riskRes.json(),
        marketRes.json()
      ]);

      setPortfolioData({ summary, holdings, performance, risk });
      setMarketData(market);
      
      // Load advanced analytics
      await loadAnalytics();
      
    } catch (error) {
      setError('Failed to load portfolio data');
      showNotification('Failed to load portfolio data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [authToken, API_BASE_URL]);

  const loadAnalytics = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/portfolio/analytics`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const analyticsData = await response.json();
      setAnalytics(analyticsData);
    } catch (error) {
      console.warn('Analytics data not available:', error);
    }
  };

  // Utility functions
  const showNotification = (message, type = 'info') => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    setNotifications(prev => [notification, ...prev.slice(0, 4)]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 5000);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Effects
  useEffect(() => {
    if (authToken) {
      setIsAuthenticated(true);
      loadPortfolioData();
    }
  }, [authToken, loadPortfolioData]);

  useEffect(() => {
    if (isAuthenticated && refreshInterval > 0) {
      const interval = setInterval(loadPortfolioData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, refreshInterval, loadPortfolioData]);

  // Memoized calculations
  const portfolioMetrics = useMemo(() => {
    if (!portfolioData) return null;

    const { summary, holdings, performance, risk } = portfolioData;
    
    return {
      totalValue: summary.total_equity || 0,
      dayChange: summary.daily_return_amount || 0,
      dayChangePercent: summary.daily_return || 0,
      totalGainLoss: holdings.reduce((sum, h) => sum + h.unrealized_pnl, 0),
      bestPerformer: holdings.reduce((best, current) => 
        current.day_change_percent > (best?.day_change_percent || -Infinity) ? current : best, null),
      worstPerformer: holdings.reduce((worst, current) => 
        current.day_change_percent < (worst?.day_change_percent || Infinity) ? current : worst, null),
      sectorAllocation: holdings.reduce((acc, holding) => {
        const sector = holding.sector || 'Other';
        acc[sector] = (acc[sector] || 0) + holding.allocation_percent;
        return acc;
      }, {}),
      riskScore: risk?.risk_score || 0,
      sharpeRatio: risk?.sharpe_ratio || 0
    };
  }, [portfolioData]);

  // Login Component
  const LoginForm = () => {
    const [credentials, setCredentials] = useState({
      bankUsername: 'admin',
      bankPassword: 'RafiRamzi2025!!',
      ibossUsername: 'alhambrabank',
      ibossPassword: 'alhambra5312@abt.ky'
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      login(credentials);
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="bg-gradient-to-r from-red-600 to-red-700 p-8 text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🏦</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Alhambra Bank & Trust</h1>
            <p className="text-red-100">Advanced Portfolio Tracker</p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bank Username</label>
                <input
                  type="text"
                  value={credentials.bankUsername}
                  onChange={(e) => setCredentials({...credentials, bankUsername: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                  placeholder="Enter your bank username"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bank Password</label>
                <input
                  type="password"
                  value={credentials.bankPassword}
                  onChange={(e) => setCredentials({...credentials, bankPassword: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                  placeholder="Enter your bank password"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">IBOSS Username</label>
                <input
                  type="text"
                  value={credentials.ibossUsername}
                  onChange={(e) => setCredentials({...credentials, ibossUsername: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                  placeholder="Your IBOSS trading username"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">IBOSS Password</label>
                <input
                  type="password"
                  value={credentials.ibossPassword}
                  onChange={(e) => setCredentials({...credentials, ibossPassword: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-colors"
                  placeholder="Your IBOSS trading password"
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Connecting...
                </div>
              ) : (
                '🔐 Secure Login'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  };

  // Main Dashboard Component
  const Dashboard = () => {
    if (!portfolioData || !portfolioMetrics) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
        </div>
      );
    }

    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} transition-colors duration-200`}>
        {/* Header */}
        <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-50 transition-colors duration-200`}>
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div className="flex items-center ml-4 lg:ml-0">
                  <span className="text-2xl mr-3">🏦</span>
                  <div>
                    <h1 className="text-xl font-bold text-red-600">Alhambra Bank & Trust</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Advanced Portfolio Tracker</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Notifications */}
                <div className="relative">
                  <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 relative">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M9 11h.01M9 8h.01" />
                    </svg>
                    {notifications.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {notifications.length}
                      </span>
                    )}
                  </button>
                </div>
                
                {/* Dark mode toggle */}
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {darkMode ? '☀️' : '🌙'}
                </button>
                
                {/* User menu */}
                <div className="flex items-center space-x-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium">{user?.username || 'Admin'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Portfolio Manager</p>
                  </div>
                  <button
                    onClick={() => {
                      setIsAuthenticated(false);
                      setAuthToken(null);
                      localStorage.removeItem('authToken');
                    }}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex">
          {/* Sidebar */}
          <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r transition-transform duration-200 ease-in-out lg:transition-none`}>
            <nav className="mt-8 px-4">
              <div className="space-y-2">
                {[
                  { id: 'overview', label: 'Overview', icon: '📊' },
                  { id: 'holdings', label: 'Holdings', icon: '📈' },
                  { id: 'performance', label: 'Performance', icon: '🎯' },
                  { id: 'analytics', label: 'Analytics', icon: '🔬' },
                  { id: 'risk', label: 'Risk Analysis', icon: '⚠️' },
                  { id: 'reports', label: 'Reports', icon: '📋' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-red-600 text-white'
                        : `${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`
                    }`}
                  >
                    <span className="mr-3 text-lg">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 lg:ml-0">
            <div className="p-4 sm:p-6 lg:p-8">
              {/* Portfolio Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <MetricCard
                  title="Total Portfolio Value"
                  value={formatCurrency(portfolioMetrics.totalValue)}
                  change={portfolioMetrics.dayChange}
                  changePercent={portfolioMetrics.dayChangePercent}
                  icon="💰"
                  darkMode={darkMode}
                />
                <MetricCard
                  title="Day P&L"
                  value={formatCurrency(portfolioMetrics.dayChange)}
                  changePercent={portfolioMetrics.dayChangePercent}
                  icon="📈"
                  darkMode={darkMode}
                />
                <MetricCard
                  title="Total Gain/Loss"
                  value={formatCurrency(portfolioMetrics.totalGainLoss)}
                  icon="🎯"
                  darkMode={darkMode}
                />
                <MetricCard
                  title="Risk Score"
                  value={`${portfolioMetrics.riskScore.toFixed(1)}/10`}
                  icon="⚠️"
                  darkMode={darkMode}
                />
              </div>

              {/* Tab Content */}
              <div className="space-y-8">
                {activeTab === 'overview' && <OverviewTab portfolioData={portfolioData} portfolioMetrics={portfolioMetrics} darkMode={darkMode} />}
                {activeTab === 'holdings' && <HoldingsTab holdings={portfolioData.holdings} darkMode={darkMode} />}
                {activeTab === 'performance' && <PerformanceTab performance={portfolioData.performance} darkMode={darkMode} />}
                {activeTab === 'analytics' && <AnalyticsTab analytics={analytics} portfolioMetrics={portfolioMetrics} darkMode={darkMode} />}
                {activeTab === 'risk' && <RiskTab risk={portfolioData.risk} darkMode={darkMode} />}
                {activeTab === 'reports' && <ReportsTab portfolioData={portfolioData} darkMode={darkMode} />}
              </div>
            </div>
          </main>
        </div>

        {/* Notifications */}
        <div className="fixed top-20 right-4 z-50 space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg shadow-lg max-w-sm ${
                notification.type === 'success' ? 'bg-green-500 text-white' :
                notification.type === 'error' ? 'bg-red-500 text-white' :
                'bg-blue-500 text-white'
              } animate-slide-in`}
            >
              <p className="font-medium">{notification.message}</p>
              <p className="text-xs opacity-75">{notification.timestamp.toLocaleTimeString()}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Metric Card Component
  const MetricCard = ({ title, value, change, changePercent, icon, darkMode }) => (
    <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6 transition-all duration-200 hover:shadow-lg`}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-2xl">{icon}</div>
        {changePercent !== undefined && (
          <div className={`flex items-center text-sm font-medium ${changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {changePercent >= 0 ? '↗' : '↘'} {formatPercent(changePercent)}
          </div>
        )}
      </div>
      <div>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>{title}</p>
        <p className="text-2xl font-bold">{value}</p>
        {change !== undefined && (
          <p className={`text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? '+' : ''}{formatCurrency(change)}
          </p>
        )}
      </div>
    </div>
  );

  // Tab Components
  const OverviewTab = ({ portfolioData, portfolioMetrics, darkMode }) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Portfolio Allocation Chart */}
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6`}>
        <h3 className="text-lg font-semibold mb-4">Portfolio Allocation</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={Object.entries(portfolioMetrics.sectorAllocation).map(([sector, percent]) => ({
                name: sector,
                value: percent
              }))}
              cx="50%"
              cy="50%"
              outerRadius={100}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {Object.keys(portfolioMetrics.sectorAllocation).map((entry, index) => (
                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Performance Chart */}
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6`}>
        <h3 className="text-lg font-semibold mb-4">Performance Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={portfolioData.performance}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period_type" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="return_percent" stroke={colors.primary} fill={colors.primary} fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  const HoldingsTab = ({ holdings, darkMode }) => (
    <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl overflow-hidden`}>
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold">Portfolio Holdings</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Symbol</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Company</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Shares</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Price</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Market Value</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Day Change</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">Allocation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {holdings.map((holding, index) => (
              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap font-semibold">{holding.symbol}</td>
                <td className="px-6 py-4 whitespace-nowrap">{holding.company_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right">{holding.shares}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right">{formatCurrency(holding.current_price)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right font-semibold">{formatCurrency(holding.market_value)}</td>
                <td className={`px-6 py-4 whitespace-nowrap text-right font-semibold ${holding.day_change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatPercent(holding.day_change_percent)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">{holding.allocation_percent?.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const PerformanceTab = ({ performance, darkMode }) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6`}>
        <h3 className="text-lg font-semibold mb-4">Performance by Period</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={performance}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period_type" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="return_percent" fill={colors.primary} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6`}>
        <h3 className="text-lg font-semibold mb-4">Risk-Return Analysis</h3>
        <div className="space-y-4">
          {performance.map((period, index) => (
            <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
              <div>
                <p className="font-medium capitalize">{period.period_type}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Return: {formatPercent(period.return_percent)}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatCurrency(period.return_amount)}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Alpha: {period.alpha?.toFixed(2) || 'N/A'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const AnalyticsTab = ({ analytics, portfolioMetrics, darkMode }) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6`}>
        <h3 className="text-lg font-semibold mb-4">Advanced Metrics</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
              <p className="text-2xl font-bold text-blue-600">{portfolioMetrics.sharpeRatio.toFixed(2)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Sharpe Ratio</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
              <p className="text-2xl font-bold text-green-600">{portfolioMetrics.riskScore.toFixed(1)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Risk Score</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6`}>
        <h3 className="text-lg font-semibold mb-4">Top Performers</h3>
        <div className="space-y-3">
          {portfolioMetrics.bestPerformer && (
            <div className="flex justify-between items-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <div>
                <p className="font-semibold text-green-800 dark:text-green-400">{portfolioMetrics.bestPerformer.symbol}</p>
                <p className="text-sm text-green-600 dark:text-green-500">{portfolioMetrics.bestPerformer.company_name}</p>
              </div>
              <p className="font-bold text-green-600">+{portfolioMetrics.bestPerformer.day_change_percent.toFixed(2)}%</p>
            </div>
          )}
          {portfolioMetrics.worstPerformer && (
            <div className="flex justify-between items-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
              <div>
                <p className="font-semibold text-red-800 dark:text-red-400">{portfolioMetrics.worstPerformer.symbol}</p>
                <p className="text-sm text-red-600 dark:text-red-500">{portfolioMetrics.worstPerformer.company_name}</p>
              </div>
              <p className="font-bold text-red-600">{portfolioMetrics.worstPerformer.day_change_percent.toFixed(2)}%</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const RiskTab = ({ risk, darkMode }) => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {[
        { title: 'Beta', value: risk.beta?.toFixed(2) || 'N/A', description: 'Market sensitivity' },
        { title: 'Volatility', value: `${risk.volatility?.toFixed(1) || 0}%`, description: 'Price fluctuation' },
        { title: 'Max Drawdown', value: `${risk.max_drawdown?.toFixed(1) || 0}%`, description: 'Largest loss' },
        { title: 'VaR (95%)', value: formatCurrency(risk.var_95 || 0), description: 'Value at Risk' },
        { title: 'Correlation', value: risk.correlation_sp500?.toFixed(2) || 'N/A', description: 'vs S&P 500' },
        { title: 'Sortino Ratio', value: risk.sortino_ratio?.toFixed(2) || 'N/A', description: 'Downside risk adj.' }
      ].map((metric, index) => (
        <div key={index} className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6 text-center`}>
          <p className="text-3xl font-bold text-red-600 mb-2">{metric.value}</p>
          <p className="font-semibold mb-1">{metric.title}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{metric.description}</p>
        </div>
      ))}
    </div>
  );

  const ReportsTab = ({ portfolioData, darkMode }) => (
    <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6`}>
      <h3 className="text-lg font-semibold mb-4">Portfolio Reports</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: 'Performance Report', description: 'Detailed performance analysis', icon: '📊' },
          { title: 'Risk Assessment', description: 'Comprehensive risk evaluation', icon: '⚠️' },
          { title: 'Tax Report', description: 'Tax implications and optimization', icon: '📋' },
          { title: 'ESG Analysis', description: 'Environmental, Social, Governance', icon: '🌱' },
          { title: 'Sector Analysis', description: 'Sector allocation and performance', icon: '🏭' },
          { title: 'Custom Report', description: 'Build your own report', icon: '🔧' }
        ].map((report, index) => (
          <button
            key={index}
            className={`p-4 rounded-lg border-2 border-dashed ${darkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400'} hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left`}
          >
            <div className="text-2xl mb-2">{report.icon}</div>
            <h4 className="font-semibold mb-1">{report.title}</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">{report.description}</p>
          </button>
        ))}
      </div>
    </div>
  );

  // Main render
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return <Dashboard />;
};

export default AdvancedPortfolioDashboard;
