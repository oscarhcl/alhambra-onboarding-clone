/**
 * Enhanced IBOSS Portfolio Tracker Backend API Integration
 * Based on IBOSS evaluation analysis and improvement recommendations
 * 
 * This file implements the enhanced API integration for the Alhambra Bank & Trust
 * portfolio tracker, incorporating all available IBOSS API operations and fields.
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const redis = require('redis');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Redis client for caching
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
});

// PostgreSQL connection pool
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'alhambra_bank',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// IBOSS API Configuration
const IBOSS_CONFIG = {
  baseURL: process.env.IBOSS_API_URL || 'https://api.iboss.com/v1',
  timeout: 30000,
  retries: 3
};

/**
 * Enhanced IBOSS API Client with comprehensive error handling and caching
 */
class EnhancedIBOSSClient {
  constructor(credentials) {
    this.credentials = credentials;
    this.apiClient = axios.create({
      baseURL: IBOSS_CONFIG.baseURL,
      timeout: IBOSS_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${credentials.token}`
      }
    });
  }

  /**
   * Get Account Information - Enhanced with all available fields
   * Based on IBOSS evaluation: GetAccountInfo operation
   */
  async getAccountInfo(accountNumber) {
    const cacheKey = `account_info:${accountNumber}`;
    
    try {
      // Check cache first
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const response = await this.apiClient.get(`/accounts/${accountNumber}/info`);
      
      const accountInfo = {
        // Core account fields from IBOSS evaluation
        accountNumber: response.data.Account,
        accountName: response.data.AccountName,
        mainAccount: response.data.MainAccount,
        accountType: response.data.AccountType,
        accountEnabled: response.data.AccountEnable,
        
        // Address information
        addressLine1: response.data.Addr1,
        addressLine2: response.data.Addr2,
        addressLine3: response.data.Addr3,
        city: response.data.City,
        state: response.data.State,
        zipCode: response.data.Zip,
        country: response.data.Country,
        
        // Contact information
        phonePrimary: response.data.Phone1,
        phoneSecondary: response.data.Phone2,
        fax: response.data.FAX,
        email: response.data.Email,
        
        // Account metadata
        taxId: response.data.TaxID,
        createDate: response.data.CreateDate,
        lastUpdated: new Date().toISOString()
      };

      // Cache for 1 hour
      await redisClient.setex(cacheKey, 3600, JSON.stringify(accountInfo));
      
      return accountInfo;
    } catch (error) {
      console.error('Error fetching account info:', error);
      throw new Error(`Failed to fetch account information: ${error.message}`);
    }
  }

  /**
   * Get Account Balance - Enhanced with calculated fields
   * Based on IBOSS evaluation: GetAccountBalance operation
   */
  async getAccountBalance(accountNumber) {
    const cacheKey = `account_balance:${accountNumber}`;
    
    try {
      // Check cache first (shorter cache time for balance data)
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const response = await this.apiClient.get(`/accounts/${accountNumber}/balance`);
      
      const balanceData = {
        // Core balance fields from IBOSS evaluation
        totalEquity: response.data.TotalEquity,
        cashBalance: response.data.CashBalance,
        longMarketValue: response.data.LongMarketValue,
        shortMarketValue: response.data.ShortMarketValue,
        dayBuyingPower: response.data.DBP,
        overnightBuyingPower: response.data.OBP,
        currency: response.data.Currency,
        asOfDate: response.data.DateAsof,
        lastUpdatedDate: response.data.DateAsof,
        
        // Calculated fields based on IBOSS evaluation formulas
        netLiquidationValue: this.calculateNetLiquidationValue(response.data),
        equityWithLoanValue: this.calculateEquityWithLoanValue(response.data),
        availableFunds: this.calculateAvailableFunds(response.data),
        excessLiquidity: this.calculateExcessLiquidity(response.data),
        
        // Allocation percentages
        cashPercentage: this.calculateCashPercentage(response.data),
        equityPercentage: this.calculateEquityPercentage(response.data),
        
        // Balance classification
        balanceType: response.data.CashBalance > 0 ? 'cash' : 'cash_deficit'
      };

      // Cache for 5 minutes (balance data changes frequently)
      await redisClient.setex(cacheKey, 300, JSON.stringify(balanceData));
      
      return balanceData;
    } catch (error) {
      console.error('Error fetching account balance:', error);
      throw new Error(`Failed to fetch account balance: ${error.message}`);
    }
  }

  /**
   * Get Account Commission Structure
   * Based on IBOSS evaluation: GetAccountCommission operation
   */
  async getAccountCommission(accountNumber) {
    const cacheKey = `account_commission:${accountNumber}`;
    
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const response = await this.apiClient.get(`/accounts/${accountNumber}/commission`);
      
      const commissionData = {
        perTicketCommission: response.data.PerTicket,
        perShareCommission: response.data.PerShare,
        perPrincipalCommission: response.data.PerPrincipal,
        perOptionCommission: response.data.PerOption,
        perContractCommission: response.data.PerContract,
        minOptionCommission: response.data.PerOptionMin,
        minCommission: response.data.MinCommission,
        maxCommission: response.data.MaxCommission,
        minCommissionShare: response.data.MinCommShare
      };

      // Cache for 24 hours (commission structure rarely changes)
      await redisClient.setex(cacheKey, 86400, JSON.stringify(commissionData));
      
      return commissionData;
    } catch (error) {
      console.error('Error fetching commission data:', error);
      throw new Error(`Failed to fetch commission structure: ${error.message}`);
    }
  }

  /**
   * Get Portfolio Holdings - Enhanced with calculated metrics
   * Note: IBOSS evaluation indicates holdings detail not directly available
   * This method implements alternative solution using separate holdings API/service
   */
  async getPortfolioHoldings(accountNumber) {
    const cacheKey = `portfolio_holdings:${accountNumber}`;
    
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Since IBOSS doesn't provide detailed holdings, we maintain this separately
      const holdings = await this.getHoldingsFromDatabase(accountNumber);
      
      // Enhance holdings with calculated metrics
      const enhancedHoldings = await Promise.all(holdings.map(async (holding) => {
        const currentPrice = await this.getCurrentPrice(holding.symbol);
        const marketValue = holding.quantity * currentPrice;
        const unrealizedPL = marketValue - (holding.avgCost * holding.quantity);
        const unrealizedPLPercent = (unrealizedPL / (holding.avgCost * holding.quantity)) * 100;
        
        return {
          ...holding,
          currentPrice,
          marketValue,
          unrealizedPL,
          unrealizedPLPercent,
          percentageOfTotal: 0 // Will be calculated after getting total portfolio value
        };
      }));

      // Calculate percentage of total for each holding
      const totalPortfolioValue = enhancedHoldings.reduce((sum, holding) => sum + holding.marketValue, 0);
      enhancedHoldings.forEach(holding => {
        holding.percentageOfTotal = (holding.marketValue / totalPortfolioValue) * 100;
      });

      // Cache for 1 minute (holdings data changes frequently)
      await redisClient.setex(cacheKey, 60, JSON.stringify(enhancedHoldings));
      
      return enhancedHoldings;
    } catch (error) {
      console.error('Error fetching portfolio holdings:', error);
      throw new Error(`Failed to fetch portfolio holdings: ${error.message}`);
    }
  }

  /**
   * Get Performance Data - Enhanced with multiple time periods
   */
  async getPerformanceData(accountNumber) {
    const cacheKey = `performance_data:${accountNumber}`;
    
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get historical performance data from database
      const performanceData = await this.getPerformanceFromDatabase(accountNumber);
      
      // Cache for 5 minutes
      await redisClient.setex(cacheKey, 300, JSON.stringify(performanceData));
      
      return performanceData;
    } catch (error) {
      console.error('Error fetching performance data:', error);
      throw new Error(`Failed to fetch performance data: ${error.message}`);
    }
  }

  // Calculation methods based on IBOSS evaluation formulas

  calculateNetLiquidationValue(data) {
    return data.TotalEquity - data.CashBalance - data.LongMarketValue + data.ShortMarketValue;
  }

  calculateEquityWithLoanValue(data) {
    return data.TotalEquity;
  }

  calculateAvailableFunds(data) {
    return Math.max(data.DBP, data.OBP);
  }

  calculateExcessLiquidity(data) {
    // Partial implementation as noted in IBOSS evaluation
    return data.TotalEquity * 0.25; // Simplified calculation
  }

  calculateCashPercentage(data) {
    return (data.CashBalance / data.TotalEquity) * 100;
  }

  calculateEquityPercentage(data) {
    return ((data.LongMarketValue - data.ShortMarketValue) / data.TotalEquity) * 100;
  }

  // Database helper methods

  async getHoldingsFromDatabase(accountNumber) {
    const query = `
      SELECT symbol, quantity, avg_cost, last_updated
      FROM portfolio_holdings 
      WHERE account_number = $1 AND quantity > 0
      ORDER BY market_value DESC
    `;
    const result = await pool.query(query, [accountNumber]);
    return result.rows;
  }

  async getPerformanceFromDatabase(accountNumber) {
    const query = `
      SELECT 
        daily_pl, daily_pl_percent,
        weekly_pl, weekly_pl_percent,
        monthly_pl, monthly_pl_percent,
        quarterly_pl, quarterly_pl_percent,
        yearly_pl, yearly_pl_percent
      FROM portfolio_performance 
      WHERE account_number = $1
      ORDER BY date DESC
      LIMIT 1
    `;
    const result = await pool.query(query, [accountNumber]);
    return result.rows[0] || {};
  }

  async getCurrentPrice(symbol) {
    // Implement market data service integration
    // This would typically call a market data API
    return 100; // Placeholder
  }
}

// API Routes

/**
 * Authentication endpoint
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { bankUsername, bankPassword, ibossUsername, ibossPassword } = req.body;
    
    // Validate credentials (implement actual authentication logic)
    if (!bankUsername || !bankPassword || !ibossUsername || !ibossPassword) {
      return res.status(400).json({ error: 'All credentials are required' });
    }

    // Generate session token
    const sessionToken = generateSessionToken();
    
    // Store session in Redis
    await redisClient.setex(`session:${sessionToken}`, 3600, JSON.stringify({
      bankUsername,
      ibossUsername,
      loginTime: new Date().toISOString()
    }));

    res.json({
      success: true,
      token: sessionToken,
      message: 'Authentication successful'
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * Get comprehensive portfolio data
 */
app.get('/api/portfolio/:accountNumber', authenticateToken, async (req, res) => {
  try {
    const { accountNumber } = req.params;
    const ibossClient = new EnhancedIBOSSClient(req.user.credentials);

    // Fetch all portfolio data in parallel
    const [accountInfo, balanceData, commissionData, holdings, performanceData] = await Promise.all([
      ibossClient.getAccountInfo(accountNumber),
      ibossClient.getAccountBalance(accountNumber),
      ibossClient.getAccountCommission(accountNumber),
      ibossClient.getPortfolioHoldings(accountNumber),
      ibossClient.getPerformanceData(accountNumber)
    ]);

    res.json({
      accountInfo,
      balances: balanceData,
      commissions: commissionData,
      holdings,
      performance: performanceData,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Portfolio data error:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio data' });
  }
});

/**
 * Get real-time account balance
 */
app.get('/api/balance/:accountNumber', authenticateToken, async (req, res) => {
  try {
    const { accountNumber } = req.params;
    const ibossClient = new EnhancedIBOSSClient(req.user.credentials);
    
    const balanceData = await ibossClient.getAccountBalance(accountNumber);
    res.json(balanceData);
  } catch (error) {
    console.error('Balance data error:', error);
    res.status(500).json({ error: 'Failed to fetch balance data' });
  }
});

/**
 * Get portfolio performance analytics
 */
app.get('/api/performance/:accountNumber', authenticateToken, async (req, res) => {
  try {
    const { accountNumber } = req.params;
    const ibossClient = new EnhancedIBOSSClient(req.user.credentials);
    
    const performanceData = await ibossClient.getPerformanceData(accountNumber);
    
    // Add risk metrics calculation
    const riskMetrics = await calculateRiskMetrics(accountNumber);
    
    res.json({
      ...performanceData,
      riskMetrics
    });
  } catch (error) {
    console.error('Performance data error:', error);
    res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

/**
 * Generate portfolio statement
 */
app.post('/api/statements/generate', authenticateToken, async (req, res) => {
  try {
    const { accountNumber, templateType, format } = req.body;
    
    // Generate statement based on template type
    const statement = await generatePortfolioStatement(accountNumber, templateType, format);
    
    res.json({
      success: true,
      statementUrl: statement.url,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Statement generation error:', error);
    res.status(500).json({ error: 'Failed to generate statement' });
  }
});

// Middleware functions

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Verify token with Redis
  redisClient.get(`session:${token}`, (err, session) => {
    if (err || !session) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.user = JSON.parse(session);
    next();
  });
}

function generateSessionToken() {
  return require('crypto').randomBytes(32).toString('hex');
}

async function calculateRiskMetrics(accountNumber) {
  // Implement risk metrics calculation
  // This would typically involve complex financial calculations
  return {
    sharpeRatio: 1.85,
    beta: 0.92,
    maxDrawdown: -8.5,
    volatility: 12.3,
    var95: -2.1,
    expectedShortfall: -3.2
  };
}

async function generatePortfolioStatement(accountNumber, templateType, format) {
  // Implement statement generation logic
  // This would create PDF/Excel reports based on template
  return {
    url: `/statements/${accountNumber}_${templateType}_${Date.now()}.${format}`
  };
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// Start server
app.listen(port, () => {
  console.log(`Enhanced IBOSS Portfolio Tracker API running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
