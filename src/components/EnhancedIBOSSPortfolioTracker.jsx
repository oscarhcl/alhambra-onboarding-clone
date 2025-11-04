import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Progress } from './components/ui/progress';
import { Alert, AlertDescription } from './components/ui/alert';

const EnhancedIBOSSPortfolioTracker = () => {
  // Enhanced state management based on IBOSS evaluation
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [portfolioTab, setPortfolioTab] = useState('overview');
  const [credentials, setCredentials] = useState({
    bankUsername: '',
    bankPassword: '',
    ibossUsername: '',
    ibossPassword: ''
  });

  // Enhanced portfolio data structure based on IBOSS API fields
  const [portfolioData, setPortfolioData] = useState({
    accountInfo: {
      accountNumber: 'ACC-2024-001',
      accountName: 'John Doe Investment Account',
      accountType: 'Individual Trading',
      accountEnabled: true,
      createDate: '2024-01-15',
      currency: 'USD'
    },
    balances: {
      totalEquity: 125750.50,
      cashBalance: 15250.75,
      longMarketValue: 110499.75,
      shortMarketValue: 0,
      dayBuyingPower: 45000,
      overnightBuyingPower: 30000,
      netLiquidationValue: 125750.50,
      equityWithLoanValue: 125750.50,
      availableFunds: 45000,
      excessLiquidity: 15000
    },
    performance: {
      dailyPL: 2150.25,
      dailyPLPercent: 1.74,
      weeklyPL: 4725.50,
      weeklyPLPercent: 3.8,
      monthlyPL: 6425.75,
      monthlyPLPercent: 5.2,
      quarterlyPL: 10875.25,
      quarterlyPLPercent: 8.7,
      yearlyPL: 19650.50,
      yearlyPLPercent: 15.8
    },
    holdings: [
      {
        symbol: 'AAPL',
        quantity: 150,
        marketValue: 26325,
        avgCost: 165.50,
        currentPrice: 175.50,
        unrealizedPL: 1500,
        unrealizedPLPercent: 6.04,
        percentageOfTotal: 20.9
      },
      {
        symbol: 'GOOGL',
        quantity: 75,
        marketValue: 10672.5,
        avgCost: 145.30,
        currentPrice: 142.30,
        unrealizedPL: -225,
        unrealizedPLPercent: -1.55,
        percentageOfTotal: 8.5
      },
      {
        symbol: 'MSFT',
        quantity: 200,
        marketValue: 75770,
        avgCost: 365.85,
        currentPrice: 378.85,
        unrealizedPL: 2600,
        unrealizedPLPercent: 3.55,
        percentageOfTotal: 60.2
      },
      {
        symbol: 'TSLA',
        quantity: 50,
        marketValue: 12437.5,
        avgCost: 255.75,
        currentPrice: 248.75,
        unrealizedPL: -350,
        unrealizedPLPercent: -2.74,
        percentageOfTotal: 9.9
      }
    ],
    commissions: {
      perTicket: 1.00,
      perShare: 0.005,
      perPrincipal: 0.0025,
      perOption: 0.65,
      perContract: 0.65,
      minCommission: 1.00,
      maxCommission: 50.00
    }
  });

  const handleLogin = () => {
    if (credentials.bankUsername && credentials.bankPassword && 
        credentials.ibossUsername && credentials.ibossPassword) {
      setIsLoggedIn(true);
      // Simulate API data fetch
      fetchPortfolioData();
    }
  };

  const fetchPortfolioData = () => {
    // Simulate real-time data updates
    const interval = setInterval(() => {
      setPortfolioData(prev => ({
        ...prev,
        balances: {
          ...prev.balances,
          totalEquity: prev.balances.totalEquity + (Math.random() - 0.5) * 100,
          dailyPL: prev.performance.dailyPL + (Math.random() - 0.5) * 50
        }
      }));
    }, 5000);

    return () => clearInterval(interval);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCredentials({
      bankUsername: '',
      bankPassword: '',
      ibossUsername: '',
      ibossPassword: ''
    });
    setPortfolioTab('overview');
  };

  // Enhanced login form
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 py-16">
        <div className="container mx-auto px-4 max-w-md">
          <Card className="shadow-xl">
            <CardHeader className="bg-red-600 text-white text-center">
              <CardTitle className="text-2xl">Enhanced Portfolio Tracker</CardTitle>
              <CardDescription className="text-red-100">
                Access your IBOSS trading portfolio with advanced analytics
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Username
                </label>
                <input
                  type="text"
                  value={credentials.bankUsername}
                  onChange={(e) => setCredentials({...credentials, bankUsername: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter your bank username"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Password
                </label>
                <input
                  type="password"
                  value={credentials.bankPassword}
                  onChange={(e) => setCredentials({...credentials, bankPassword: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Enter your bank password"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IBOSS Username
                </label>
                <input
                  type="text"
                  value={credentials.ibossUsername}
                  onChange={(e) => setCredentials({...credentials, ibossUsername: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Your IBOSS trading username"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IBOSS Password
                </label>
                <input
                  type="password"
                  value={credentials.ibossPassword}
                  onChange={(e) => setCredentials({...credentials, ibossPassword: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Your IBOSS trading password"
                />
              </div>
              
              <Button
                onClick={handleLogin}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                🔐 Secure Login
              </Button>
              
              <Alert>
                <AlertDescription>
                  Demo credentials: bank_user / bank_pass / iboss_user / iboss_pass
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Enhanced Portfolio Dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <img src="/alhambra-logo.png" alt="Alhambra Bank" className="h-8" />
            <div>
              <span className="text-lg font-semibold text-red-700">
                Welcome back, {portfolioData.accountInfo.accountName}
              </span>
              <div className="text-sm text-gray-500">
                Account: {portfolioData.accountInfo.accountNumber} | 
                Type: {portfolioData.accountInfo.accountType}
              </div>
            </div>
          </div>
          <Button onClick={handleLogout} variant="destructive">
            🚪 Logout
          </Button>
        </div>
      </div>

      {/* Enhanced Portfolio Metrics */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Equity</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${portfolioData.balances.totalEquity.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                  <p className="text-xs text-gray-500">
                    Net Liquidation: ${portfolioData.balances.netLiquidationValue.toLocaleString()}
                  </p>
                </div>
                <div className="text-2xl">💰</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Daily P&L</p>
                  <p className={`text-2xl font-bold ${
                    portfolioData.performance.dailyPL >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ${portfolioData.performance.dailyPL.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                  <p className={`text-sm ${
                    portfolioData.performance.dailyPLPercent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {portfolioData.performance.dailyPLPercent >= 0 ? '↗' : '↘'} {portfolioData.performance.dailyPLPercent}%
                  </p>
                </div>
                <div className="text-2xl">📈</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Cash Balance</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${portfolioData.balances.cashBalance.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                  <p className="text-xs text-gray-500">
                    {((portfolioData.balances.cashBalance / portfolioData.balances.totalEquity) * 100).toFixed(1)}% allocation
                  </p>
                </div>
                <div className="text-2xl">💵</div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-l-4 border-orange-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Buying Power</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${portfolioData.balances.dayBuyingPower.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    Overnight: ${portfolioData.balances.overnightBuyingPower.toLocaleString()}
                  </p>
                </div>
                <div className="text-2xl">⚡</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Portfolio Tabs */}
        <Tabs value={portfolioTab} onValueChange={setPortfolioTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">📊 Overview</TabsTrigger>
            <TabsTrigger value="holdings">📈 Holdings</TabsTrigger>
            <TabsTrigger value="performance">🎯 Performance</TabsTrigger>
            <TabsTrigger value="allocation">🥧 Allocation</TabsTrigger>
            <TabsTrigger value="statements">📄 Statements</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>📈 Performance Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { period: 'Daily', value: portfolioData.performance.dailyPLPercent, amount: portfolioData.performance.dailyPL },
                      { period: 'Weekly', value: portfolioData.performance.weeklyPLPercent, amount: portfolioData.performance.weeklyPL },
                      { period: 'Monthly', value: portfolioData.performance.monthlyPLPercent, amount: portfolioData.performance.monthlyPL },
                      { period: 'Quarterly', value: portfolioData.performance.quarterlyPLPercent, amount: portfolioData.performance.quarterlyPL },
                      { period: 'Yearly', value: portfolioData.performance.yearlyPLPercent, amount: portfolioData.performance.yearlyPL }
                    ].map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600 font-medium">{item.period}</span>
                        <div className="text-right">
                          <Badge variant={item.value >= 0 ? "default" : "destructive"}>
                            {item.value >= 0 ? '↗' : '↘'} {item.value.toFixed(2)}%
                          </Badge>
                          <div className="text-sm text-gray-500">
                            ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Holdings */}
              <Card>
                <CardHeader>
                  <CardTitle>🏆 Top Holdings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {portfolioData.holdings.map((holding, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-gray-900">{holding.symbol}</div>
                            <div className="text-sm text-gray-600">{holding.quantity} shares</div>
                            <div className="text-xs text-gray-500">
                              {holding.percentageOfTotal.toFixed(1)}% of portfolio
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">
                              ${holding.marketValue.toLocaleString()}
                            </div>
                            <Badge variant={holding.unrealizedPL >= 0 ? "default" : "destructive"}>
                              {holding.unrealizedPL >= 0 ? '+' : ''}${holding.unrealizedPL.toLocaleString()} 
                              ({holding.unrealizedPLPercent.toFixed(2)}%)
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="holdings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>📈 Detailed Holdings</CardTitle>
                <CardDescription>
                  Complete breakdown of your investment positions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Symbol</th>
                        <th className="text-right p-2">Quantity</th>
                        <th className="text-right p-2">Avg Cost</th>
                        <th className="text-right p-2">Current Price</th>
                        <th className="text-right p-2">Market Value</th>
                        <th className="text-right p-2">Unrealized P&L</th>
                        <th className="text-right p-2">% of Portfolio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolioData.holdings.map((holding, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-medium">{holding.symbol}</td>
                          <td className="p-2 text-right">{holding.quantity}</td>
                          <td className="p-2 text-right">${holding.avgCost.toFixed(2)}</td>
                          <td className="p-2 text-right">${holding.currentPrice.toFixed(2)}</td>
                          <td className="p-2 text-right">${holding.marketValue.toLocaleString()}</td>
                          <td className={`p-2 text-right ${holding.unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {holding.unrealizedPL >= 0 ? '+' : ''}${holding.unrealizedPL.toLocaleString()}
                            <br />
                            <span className="text-xs">
                              ({holding.unrealizedPLPercent.toFixed(2)}%)
                            </span>
                          </td>
                          <td className="p-2 text-right">
                            <Progress value={holding.percentageOfTotal} className="w-16 h-2" />
                            <span className="text-xs">{holding.percentageOfTotal.toFixed(1)}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>🎯 Advanced Performance Analytics</CardTitle>
                <CardDescription>
                  Comprehensive performance metrics and risk analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-4">Risk Metrics</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Sharpe Ratio</span>
                        <Badge>1.85</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Beta</span>
                        <Badge>0.92</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Max Drawdown</span>
                        <Badge variant="destructive">-8.5%</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Volatility</span>
                        <Badge>12.3%</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-4">Benchmark Comparison</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>vs S&P 500</span>
                        <Badge>+3.2%</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>vs NASDAQ</span>
                        <Badge>+1.8%</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>vs Russell 2000</span>
                        <Badge>+5.7%</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="allocation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>🥧 Portfolio Allocation</CardTitle>
                <CardDescription>
                  Asset allocation breakdown and diversification analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-4">By Asset Class</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>Equities</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={87.9} className="w-20 h-2" />
                          <span className="text-sm">87.9%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Cash</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={12.1} className="w-20 h-2" />
                          <span className="text-sm">12.1%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-4">By Sector</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span>Technology</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={68.7} className="w-20 h-2" />
                          <span className="text-sm">68.7%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Consumer Discretionary</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={20.9} className="w-20 h-2" />
                          <span className="text-sm">20.9%</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Automotive</span>
                        <div className="flex items-center space-x-2">
                          <Progress value={9.9} className="w-20 h-2" />
                          <span className="text-sm">9.9%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statements" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>📄 Account Statements & Reports</CardTitle>
                <CardDescription>
                  Generate and download comprehensive portfolio reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-4">Statement Templates</h4>
                    <div className="space-y-3">
                      {[
                        { name: 'Comprehensive Statement', icon: '📋', description: 'Complete portfolio overview' },
                        { name: 'Performance Report', icon: '📈', description: 'Detailed performance analysis' },
                        { name: 'Holdings Summary', icon: '🥧', description: 'Current positions breakdown' },
                        { name: 'Tax Report', icon: '📊', description: 'Tax-optimized reporting' }
                      ].map((template, index) => (
                        <Card key={index} className="p-3 hover:bg-gray-50 cursor-pointer">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{template.icon}</span>
                            <div>
                              <div className="font-medium">{template.name}</div>
                              <div className="text-sm text-gray-500">{template.description}</div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-4">Export Options</h4>
                    <div className="space-y-3">
                      {[
                        { format: 'PDF Report', icon: '📄' },
                        { format: 'Excel Spreadsheet', icon: '📊' },
                        { format: 'CSV Data', icon: '📋' },
                        { format: 'Email Summary', icon: '📧' }
                      ].map((option, index) => (
                        <Button key={index} variant="outline" className="w-full justify-start">
                          <span className="mr-2">{option.icon}</span>
                          {option.format}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EnhancedIBOSSPortfolioTracker;
