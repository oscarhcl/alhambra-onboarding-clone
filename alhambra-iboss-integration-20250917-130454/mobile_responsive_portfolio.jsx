/**
 * Mobile-Responsive Portfolio Dashboard with Advanced UI/UX
 * Alhambra Bank & Trust - IBOSS Portfolio Tracker Follow-up #2
 * 
 * This component provides a fully responsive, mobile-first portfolio dashboard
 * with advanced UI/UX features, animations, and interactive elements.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

const MobileResponsivePortfolio = () => {
  // State management
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [portfolioData, setPortfolioData] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHolding, setSelectedHolding] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('marketValue');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('cards'); // 'cards', 'list', 'grid'
  const [refreshing, setRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connected');

  // Refs for animations and interactions
  const dashboardRef = useRef(null);
  const pullToRefreshRef = useRef(null);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);

  // API configuration
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));

  // Responsive breakpoints
  const [screenSize, setScreenSize] = useState('desktop');
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  // Color scheme with Alhambra Bank branding
  const colors = {
    primary: '#B91C1C', // Red-600 (Alhambra Bank primary)
    secondary: '#DC2626', // Red-500
    accent: '#7C2D12', // Red-900 (darker accent)
    success: '#059669', // Emerald-600
    warning: '#D97706', // Amber-600
    danger: '#DC2626', // Red-500
    info: '#2563EB', // Blue-600
    light: '#FEF2F2', // Red-50
    dark: '#1F2937', // Gray-800
    muted: '#6B7280', // Gray-500
    background: darkMode ? '#111827' : '#FFFFFF',
    surface: darkMode ? '#1F2937' : '#F9FAFB',
    text: darkMode ? '#F9FAFB' : '#111827',
    textSecondary: darkMode ? '#D1D5DB' : '#6B7280'
  };

  // Responsive design detection
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize('mobile');
        setIsMobile(true);
        setIsTablet(false);
      } else if (width < 1024) {
        setScreenSize('tablet');
        setIsMobile(false);
        setIsTablet(true);
      } else {
        setScreenSize('desktop');
        setIsMobile(false);
        setIsTablet(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        showNotification('Welcome back! Portfolio loaded successfully.', 'success');
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

  // Data loading with enhanced error handling
  const loadPortfolioData = useCallback(async () => {
    if (!authToken) return;

    setIsLoading(true);
    setConnectionStatus('connecting');
    
    try {
      const [summaryRes, holdingsRes, performanceRes, marketRes] = await Promise.all([
        fetch(`${API_BASE_URL}/portfolio/summary`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }),
        fetch(`${API_BASE_URL}/portfolio/holdings`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }),
        fetch(`${API_BASE_URL}/portfolio/performance`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }),
        fetch(`${API_BASE_URL}/market/intelligence`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
      ]);

      const [summary, holdings, performance, market] = await Promise.all([
        summaryRes.json(),
        holdingsRes.json(),
        performanceRes.json(),
        marketRes.json()
      ]);

      setPortfolioData({ summary, holdings, performance });
      setMarketData(market);
      setConnectionStatus('connected');
      
    } catch (error) {
      setError('Failed to load portfolio data');
      setConnectionStatus('error');
      showNotification('Connection error. Please check your internet connection.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [authToken, API_BASE_URL]);

  // Pull-to-refresh functionality
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    touchEndY.current = e.touches[0].clientY;
    const pullDistance = touchEndY.current - touchStartY.current;
    
    if (pullDistance > 0 && window.scrollY === 0) {
      const pullIndicator = pullToRefreshRef.current;
      if (pullIndicator) {
        pullIndicator.style.transform = `translateY(${Math.min(pullDistance * 0.5, 60)}px)`;
        pullIndicator.style.opacity = Math.min(pullDistance / 100, 1);
      }
    }
  };

  const handleTouchEnd = () => {
    const pullDistance = touchEndY.current - touchStartY.current;
    const pullIndicator = pullToRefreshRef.current;
    
    if (pullIndicator) {
      pullIndicator.style.transform = 'translateY(0)';
      pullIndicator.style.opacity = '0';
    }
    
    if (pullDistance > 100 && window.scrollY === 0) {
      handleRefresh();
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPortfolioData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Notification system
  const showNotification = (message, type = 'info', duration = 5000) => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date()
    };
    
    setNotifications(prev => [notification, ...prev.slice(0, 2)]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, duration);
  };

  // Utility functions
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatCompactNumber = (value) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return formatCurrency(value);
  };

  // Portfolio calculations
  const portfolioMetrics = useMemo(() => {
    if (!portfolioData) return null;

    const { summary, holdings } = portfolioData;
    const totalValue = summary.total_equity || 0;
    const dayChange = summary.daily_return_amount || 0;
    const dayChangePercent = summary.daily_return || 0;

    const sortedHoldings = [...holdings].sort((a, b) => b.market_value - a.market_value);
    
    return {
      totalValue,
      dayChange,
      dayChangePercent,
      bestPerformer: sortedHoldings.find(h => h.day_change_percent > 0),
      worstPerformer: sortedHoldings.find(h => h.day_change_percent < 0),
      topHoldings: sortedHoldings.slice(0, 5),
      sectorAllocation: holdings.reduce((acc, holding) => {
        const sector = holding.sector || 'Other';
        acc[sector] = (acc[sector] || 0) + holding.allocation_percent;
        return acc;
      }, {}),
      totalGainLoss: holdings.reduce((sum, h) => sum + h.unrealized_pnl, 0),
      cashBalance: summary.cash_balance || 0,
      buyingPower: summary.day_buying_power || 0
    };
  }, [portfolioData]);

  // Login Component with enhanced mobile design
  const LoginForm = () => {
    const [credentials, setCredentials] = useState({
      bankUsername: 'admin',
      bankPassword: 'RafiRamzi2025!!',
      ibossUsername: 'alhambrabank',
      ibossPassword: 'alhambra5312@abt.ky'
    });

    const [showPassword, setShowPassword] = useState({
      bank: false,
      iboss: false
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      login(credentials);
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
        {/* Pull to refresh indicator */}
        <div 
          ref={pullToRefreshRef}
          className="fixed top-0 left-1/2 transform -translate-x-1/2 -translate-y-full bg-white rounded-full p-3 shadow-lg z-50 transition-all duration-300"
          style={{ opacity: 0 }}
        >
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all duration-300 hover:scale-105">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 p-8 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-black opacity-10"></div>
            <div className="relative z-10">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-3xl">🏦</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Alhambra Bank & Trust</h1>
              <p className="text-red-100 text-sm">Advanced Portfolio Tracker</p>
              <div className="mt-4 flex justify-center space-x-2">
                <div className="w-2 h-2 bg-white rounded-full opacity-60"></div>
                <div className="w-2 h-2 bg-white rounded-full opacity-80"></div>
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg animate-shake">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <span className="text-red-400">⚠️</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              {/* Bank Credentials */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                  <span className="mr-2">🏛️</span>
                  Bank Credentials
                </h3>
                
                <div className="relative">
                  <input
                    type="text"
                    value={credentials.bankUsername}
                    onChange={(e) => setCredentials({...credentials, bankUsername: e.target.value})}
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 pl-12"
                    placeholder="Bank username"
                  />
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">👤</span>
                </div>
                
                <div className="relative">
                  <input
                    type={showPassword.bank ? "text" : "password"}
                    value={credentials.bankPassword}
                    onChange={(e) => setCredentials({...credentials, bankPassword: e.target.value})}
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 pl-12 pr-12"
                    placeholder="Bank password"
                  />
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">🔒</span>
                  <button
                    type="button"
                    onClick={() => setShowPassword({...showPassword, bank: !showPassword.bank})}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword.bank ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              {/* IBOSS Credentials */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                  <span className="mr-2">📊</span>
                  IBOSS Trading Platform
                </h3>
                
                <div className="relative">
                  <input
                    type="text"
                    value={credentials.ibossUsername}
                    onChange={(e) => setCredentials({...credentials, ibossUsername: e.target.value})}
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 pl-12"
                    placeholder="IBOSS username"
                  />
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">🎯</span>
                </div>
                
                <div className="relative">
                  <input
                    type={showPassword.iboss ? "text" : "password"}
                    value={credentials.ibossPassword}
                    onChange={(e) => setCredentials({...credentials, ibossPassword: e.target.value})}
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 pl-12 pr-12"
                    placeholder="IBOSS password"
                  />
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">🔐</span>
                  <button
                    type="button"
                    onClick={() => setShowPassword({...showPassword, iboss: !showPassword.iboss})}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword.iboss ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 shadow-lg"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  <span>Connecting to secure servers...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <span className="mr-2">🔐</span>
                  Secure Login
                </div>
              )}
            </button>

            {/* Biometric login option (simulated) */}
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-3">Or use biometric authentication</p>
              <div className="flex justify-center space-x-4">
                <button
                  type="button"
                  className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                  onClick={() => showNotification('Biometric authentication not available in demo', 'info')}
                >
                  <span className="text-xl">👆</span>
                </button>
                <button
                  type="button"
                  className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                  onClick={() => showNotification('Face ID not available in demo', 'info')}
                >
                  <span className="text-xl">👤</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Enhanced Mobile Dashboard
  const MobileDashboard = () => {
    if (!portfolioData || !portfolioMetrics) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading your portfolio...</p>
          </div>
        </div>
      );
    }

    return (
      <div 
        className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Pull to refresh indicator */}
        <div 
          ref={pullToRefreshRef}
          className="fixed top-0 left-1/2 transform -translate-x-1/2 -translate-y-full bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg z-50 transition-all duration-300"
          style={{ opacity: 0 }}
        >
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
        </div>

        {/* Mobile Header */}
        <header className={`sticky top-0 z-40 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b backdrop-blur-lg bg-opacity-95`}>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-lg font-bold text-red-600">Alhambra Bank</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Portfolio Tracker</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Connection status */}
                <div className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' :
                  connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                  'bg-red-500'
                }`}></div>
                
                {/* Refresh button */}
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                
                {/* Dark mode toggle */}
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {darkMode ? '☀️' : '🌙'}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Portfolio Summary Cards */}
        <div className="p-4 space-y-4">
          {/* Main Portfolio Value Card */}
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl p-6 shadow-lg`}>
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Total Portfolio Value</p>
              <p className="text-3xl font-bold mb-2">{formatCurrency(portfolioMetrics.totalValue)}</p>
              <div className={`flex items-center justify-center space-x-2 ${portfolioMetrics.dayChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <span className="text-lg">{portfolioMetrics.dayChangePercent >= 0 ? '📈' : '📉'}</span>
                <span className="font-semibold">{formatPercent(portfolioMetrics.dayChangePercent)}</span>
                <span className="text-sm">({formatCurrency(portfolioMetrics.dayChange)})</span>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <QuickStatCard
              title="Cash Balance"
              value={formatCompactNumber(portfolioMetrics.cashBalance)}
              icon="💰"
              darkMode={darkMode}
            />
            <QuickStatCard
              title="Buying Power"
              value={formatCompactNumber(portfolioMetrics.buyingPower)}
              icon="⚡"
              darkMode={darkMode}
            />
            <QuickStatCard
              title="Total Gain/Loss"
              value={formatCompactNumber(portfolioMetrics.totalGainLoss)}
              icon={portfolioMetrics.totalGainLoss >= 0 ? "📊" : "📉"}
              color={portfolioMetrics.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"}
              darkMode={darkMode}
            />
            <QuickStatCard
              title="Holdings"
              value={portfolioData.holdings.length.toString()}
              icon="🏢"
              darkMode={darkMode}
            />
          </div>

          {/* Performance Chart */}
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl p-6 shadow-lg`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Performance</h3>
              <div className="flex space-x-2">
                {['1D', '1W', '1M', '3M', '1Y'].map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedTimeframe(period)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      selectedTimeframe === period
                        ? 'bg-red-600 text-white'
                        : `${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'} hover:bg-gray-200 dark:hover:bg-gray-600`
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={portfolioData.performance}>
                <defs>
                  <linearGradient id="colorPerformance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={colors.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#E5E7EB'} />
                <XAxis dataKey="period_type" stroke={colors.textSecondary} fontSize={12} />
                <YAxis stroke={colors.textSecondary} fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: darkMode ? '#1F2937' : '#FFFFFF',
                    border: `1px solid ${darkMode ? '#374151' : '#E5E7EB'}`,
                    borderRadius: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="return_percent" 
                  stroke={colors.primary} 
                  fillOpacity={1} 
                  fill="url(#colorPerformance)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Top Holdings */}
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl p-6 shadow-lg`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Top Holdings</h3>
              <button
                onClick={() => setActiveView('holdings')}
                className="text-red-600 text-sm font-medium hover:text-red-700 transition-colors"
              >
                View All →
              </button>
            </div>
            <div className="space-y-3">
              {portfolioMetrics.topHoldings.slice(0, 5).map((holding, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {holding.symbol.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{holding.symbol}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{holding.company_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatCompactNumber(holding.market_value)}</p>
                    <p className={`text-xs ${holding.day_change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercent(holding.day_change_percent)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Market Overview */}
          {marketData && (
            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl p-6 shadow-lg`}>
              <h3 className="text-lg font-semibold mb-4">Market Overview</h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(marketData.marketOverview || {}).slice(0, 4).map(([key, value], index) => (
                  <div key={index} className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{key}</p>
                    <p className="font-semibold">{typeof value === 'number' ? formatPercent(value) : value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <nav className={`fixed bottom-0 left-0 right-0 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t backdrop-blur-lg bg-opacity-95`}>
          <div className="flex justify-around py-2">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '📊' },
              { id: 'holdings', label: 'Holdings', icon: '📈' },
              { id: 'analytics', label: 'Analytics', icon: '🔬' },
              { id: 'news', label: 'News', icon: '📰' },
              { id: 'settings', label: 'Settings', icon: '⚙️' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                  activeView === item.id
                    ? 'text-red-600 bg-red-50 dark:bg-red-900/20'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <span className="text-lg mb-1">{item.icon}</span>
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Notifications */}
        <div className="fixed top-20 right-4 z-50 space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-xl shadow-lg max-w-sm transform transition-all duration-300 animate-slide-in ${
                notification.type === 'success' ? 'bg-green-500 text-white' :
                notification.type === 'error' ? 'bg-red-500 text-white' :
                'bg-blue-500 text-white'
              }`}
            >
              <div className="flex items-start space-x-2">
                <span className="text-lg">
                  {notification.type === 'success' ? '✅' :
                   notification.type === 'error' ? '❌' : 'ℹ️'}
                </span>
                <div>
                  <p className="font-medium text-sm">{notification.message}</p>
                  <p className="text-xs opacity-75">{notification.timestamp.toLocaleTimeString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add bottom padding to account for navigation */}
        <div className="h-20"></div>
      </div>
    );
  };

  // Quick Stat Card Component
  const QuickStatCard = ({ title, value, icon, color = '', darkMode }) => (
    <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-4 shadow-lg transform hover:scale-105 transition-transform duration-200`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
      </div>
      <div>
        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>{title}</p>
        <p className={`text-lg font-bold ${color}`}>{value}</p>
      </div>
    </div>
  );

  // Effects
  useEffect(() => {
    if (authToken) {
      setIsAuthenticated(true);
      loadPortfolioData();
    }
  }, [authToken, loadPortfolioData]);

  // Auto-refresh data
  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(loadPortfolioData, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, loadPortfolioData]);

  // Main render
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return <MobileDashboard />;
};

export default MobileResponsivePortfolio;
