const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'alhambra_bank',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// IBOSS API Configuration
const IBOSS_CONFIG = {
  baseURL: process.env.IBOSS_API_URL || 'https://api.iboss.com/v1',
  apiKey: process.env.IBOSS_API_KEY || 'demo-key',
  timeout: 30000
};

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// IBOSS API Service Class
class IBOSSAPIService {
  constructor() {
    this.baseURL = IBOSS_CONFIG.baseURL;
    this.apiKey = IBOSS_CONFIG.apiKey;
  }

  async makeAPICall(operation, credentials, params = {}) {
    const startTime = Date.now();
    let response = null;
    let error = null;

    try {
      // Simulate IBOSS API call (replace with actual API integration)
      response = await this.simulateIBOSSAPI(operation, credentials, params);
      
      // Log API call
      await this.logAPICall(credentials.userId, operation, params, response, null, Date.now() - startTime);
      
      return response;
    } catch (err) {
      error = err.message;
      await this.logAPICall(credentials.userId, operation, params, null, error, Date.now() - startTime);
      throw err;
    }
  }

  async simulateIBOSSAPI(operation, credentials, params) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

    const mockData = {
      GetAccountInfo: {
        Account: credentials.ibossUsername || 'DEMO123456',
        AccountName: 'Alhambra Investment Account',
        MainAccount: 'MAIN_' + (credentials.ibossUsername || 'DEMO'),
        AccountType: 1,
        AccountEnable: 1,
        Currency: 'USD',
        DateAsof: new Date().toISOString().split('T')[0]
      },
      GetAccountBalance: {
        TotalEquity: 125750.50 + (Math.random() - 0.5) * 5000,
        CashBalance: 15250.75 + (Math.random() - 0.5) * 2000,
        LongMarketValue: 110500.25 + (Math.random() - 0.5) * 4000,
        ShortMarketValue: 0,
        DBP: 45000.00,
        OBP: 42500.00,
        Currency: 'USD',
        DateAsof: new Date().toISOString().split('T')[0]
      },
      GetAccountCommission: {
        PerTicket: 4.95,
        PerShare: 0.005,
        PerPrincipal: 0.0025,
        PerOption: 0.65,
        PerContract: 1.25
      },
      GetPortfolioHoldings: this.generateMockHoldings(),
      GetTransactionHistory: this.generateMockTransactions()
    };

    return mockData[operation] || {};
  }

  generateMockHoldings() {
    const holdings = [
      { symbol: 'AAPL', name: 'Apple Inc.', shares: 50, price: 175.25 + (Math.random() - 0.5) * 10 },
      { symbol: 'MSFT', name: 'Microsoft Corp.', shares: 75, price: 335.50 + (Math.random() - 0.5) * 15 },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', shares: 25, price: 142.75 + (Math.random() - 0.5) * 8 },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', shares: 40, price: 145.80 + (Math.random() - 0.5) * 12 },
      { symbol: 'TSLA', name: 'Tesla Inc.', shares: 30, price: 245.60 + (Math.random() - 0.5) * 20 },
      { symbol: 'NVDA', name: 'NVIDIA Corp.', shares: 20, price: 875.25 + (Math.random() - 0.5) * 50 },
      { symbol: 'META', name: 'Meta Platforms', shares: 35, price: 485.30 + (Math.random() - 0.5) * 25 },
      { symbol: 'BRK.B', name: 'Berkshire Hathaway', shares: 60, price: 425.75 + (Math.random() - 0.5) * 15 }
    ];

    return holdings.map(holding => ({
      ...holding,
      value: holding.shares * holding.price,
      change: (Math.random() - 0.5) * 10,
      changePercent: (Math.random() - 0.5) * 5
    }));
  }

  generateMockTransactions() {
    const transactions = [];
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'BRK.B'];
    
    for (let i = 0; i < 20; i++) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const type = Math.random() > 0.5 ? 'BUY' : 'SELL';
      const quantity = Math.floor(Math.random() * 50) + 1;
      const price = 100 + Math.random() * 500;
      
      transactions.push({
        transaction_id: `TXN${Date.now()}${i}`,
        symbol,
        transaction_type: type,
        quantity,
        price,
        amount: quantity * price,
        commission: 4.95,
        trade_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    }
    
    return transactions;
  }

  async logAPICall(userId, operation, requestData, responseData, errorMessage, executionTime) {
    try {
      const connection = await pool.getConnection();
      await connection.execute(
        `INSERT INTO iboss_api_log (user_id, api_operation, request_data, response_data, status_code, error_message, execution_time_ms) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          operation,
          JSON.stringify(requestData),
          JSON.stringify(responseData),
          errorMessage ? 500 : 200,
          errorMessage,
          executionTime
        ]
      );
      connection.release();
    } catch (err) {
      console.error('Failed to log API call:', err);
    }
  }
}

const ibossService = new IBOSSAPIService();

// Database helper functions
class DatabaseService {
  static async getUserByUsername(username) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM users WHERE username = ? AND is_active = TRUE',
        [username]
      );
      return rows[0];
    } finally {
      connection.release();
    }
  }

  static async createUser(userData) {
    const connection = await pool.getConnection();
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const [result] = await connection.execute(
        `INSERT INTO users (username, email, password_hash, bank_username, iboss_username) 
         VALUES (?, ?, ?, ?, ?)`,
        [userData.username, userData.email, hashedPassword, userData.bankUsername, userData.ibossUsername]
      );
      return result.insertId;
    } finally {
      connection.release();
    }
  }

  static async saveAccountInfo(userId, accountData) {
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        `INSERT INTO account_info (user_id, account_number, account_name, main_account, account_type, account_enabled, currency, as_of_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?) 
         ON DUPLICATE KEY UPDATE 
         account_name = VALUES(account_name), main_account = VALUES(main_account), 
         account_type = VALUES(account_type), account_enabled = VALUES(account_enabled), 
         currency = VALUES(currency), updated_at = CURRENT_TIMESTAMP`,
        [
          userId, accountData.Account, accountData.AccountName, accountData.MainAccount,
          accountData.AccountType, accountData.AccountEnable, accountData.Currency, accountData.DateAsof
        ]
      );
    } finally {
      connection.release();
    }
  }

  static async saveAccountBalance(userId, accountNumber, balanceData) {
    const connection = await pool.getConnection();
    try {
      const netLiquidationValue = balanceData.TotalEquity;
      const equityWithLoanValue = balanceData.TotalEquity + balanceData.CashBalance;
      const availableFunds = Math.max(0, balanceData.CashBalance);
      const excessLiquidity = balanceData.DBP - (balanceData.TotalEquity * 0.25);

      await connection.execute(
        `INSERT INTO account_balance 
         (user_id, account_number, total_equity, cash_balance, long_market_value, short_market_value, 
          day_buying_power, overnight_buying_power, net_liquidation_value, equity_with_loan_value, 
          available_funds, excess_liquidity, currency, as_of_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         total_equity = VALUES(total_equity), cash_balance = VALUES(cash_balance),
         long_market_value = VALUES(long_market_value), short_market_value = VALUES(short_market_value),
         day_buying_power = VALUES(day_buying_power), overnight_buying_power = VALUES(overnight_buying_power),
         net_liquidation_value = VALUES(net_liquidation_value), equity_with_loan_value = VALUES(equity_with_loan_value),
         available_funds = VALUES(available_funds), excess_liquidity = VALUES(excess_liquidity),
         last_updated_date = CURRENT_TIMESTAMP`,
        [
          userId, accountNumber, balanceData.TotalEquity, balanceData.CashBalance,
          balanceData.LongMarketValue, balanceData.ShortMarketValue, balanceData.DBP, balanceData.OBP,
          netLiquidationValue, equityWithLoanValue, availableFunds, excessLiquidity,
          balanceData.Currency, balanceData.DateAsof
        ]
      );
    } finally {
      connection.release();
    }
  }

  static async saveCommissionInfo(userId, accountNumber, commissionData) {
    const connection = await pool.getConnection();
    try {
      await connection.execute(
        `INSERT INTO account_commission 
         (user_id, account_number, per_ticket, per_share, per_principal, per_option, per_contract)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         per_ticket = VALUES(per_ticket), per_share = VALUES(per_share),
         per_principal = VALUES(per_principal), per_option = VALUES(per_option),
         per_contract = VALUES(per_contract), updated_at = CURRENT_TIMESTAMP`,
        [
          userId, accountNumber, commissionData.PerTicket, commissionData.PerShare,
          commissionData.PerPrincipal, commissionData.PerOption, commissionData.PerContract
        ]
      );
    } finally {
      connection.release();
    }
  }

  static async saveHoldings(userId, accountNumber, holdings) {
    const connection = await pool.getConnection();
    try {
      // Clear existing holdings for today
      await connection.execute(
        'DELETE FROM portfolio_holdings WHERE user_id = ? AND account_number = ? AND as_of_date = CURDATE()',
        [userId, accountNumber]
      );

      // Insert new holdings
      for (const holding of holdings) {
        const totalEquity = 125750.50; // This should come from account balance
        const allocation = (holding.value / totalEquity) * 100;
        const dayPL = (holding.value * holding.changePercent) / 100;

        await connection.execute(
          `INSERT INTO portfolio_holdings 
           (user_id, account_number, symbol, company_name, shares, current_price, market_value, 
            day_change, day_change_percent, allocation_percent, sector, asset_type, as_of_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())`,
          [
            userId, accountNumber, holding.symbol, holding.name, holding.shares,
            holding.price, holding.value, holding.change, holding.changePercent,
            allocation, 'Technology', 'STOCK'
          ]
        );
      }
    } finally {
      connection.release();
    }
  }

  static async getPortfolioSummary(userId) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM portfolio_summary WHERE username = (SELECT username FROM users WHERE id = ?)',
        [userId]
      );
      return rows[0];
    } finally {
      connection.release();
    }
  }

  static async getHoldings(userId, accountNumber) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM portfolio_holdings 
         WHERE user_id = ? AND account_number = ? AND as_of_date = CURDATE()
         ORDER BY market_value DESC`,
        [userId, accountNumber]
      );
      return rows;
    } finally {
      connection.release();
    }
  }

  static async getPerformance(userId, accountNumber) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM portfolio_performance 
         WHERE user_id = ? AND account_number = ? AND as_of_date = CURDATE()
         ORDER BY 
         CASE period_type 
           WHEN 'daily' THEN 1 
           WHEN 'weekly' THEN 2 
           WHEN 'monthly' THEN 3 
           WHEN 'quarterly' THEN 4 
           WHEN 'yearly' THEN 5 
           WHEN 'three_year' THEN 6 
           WHEN 'five_year' THEN 7 
         END`,
        [userId, accountNumber]
      );
      return rows;
    } finally {
      connection.release();
    }
  }

  static async getRiskMetrics(userId, accountNumber) {
    const connection = await pool.getConnection();
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM risk_metrics 
         WHERE user_id = ? AND account_number = ? AND as_of_date = CURDATE()`,
        [userId, accountNumber]
      );
      return rows[0];
    } finally {
      connection.release();
    }
  }
}

// API Routes

// Authentication
app.post('/api/auth/login', async (req, res) => {
  try {
    const { bankUsername, bankPassword, ibossUsername, ibossPassword } = req.body;

    // Find user by bank username
    const user = await DatabaseService.getUserByUsername(bankUsername);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(bankPassword, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, ibossUsername },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Fetch and store IBOSS data
    const credentials = { userId: user.id, ibossUsername, ibossPassword };
    
    try {
      // Fetch account info
      const accountInfo = await ibossService.makeAPICall('GetAccountInfo', credentials);
      await DatabaseService.saveAccountInfo(user.id, accountInfo);

      // Fetch account balance
      const accountBalance = await ibossService.makeAPICall('GetAccountBalance', credentials);
      await DatabaseService.saveAccountBalance(user.id, accountInfo.Account, accountBalance);

      // Fetch commission info
      const commissionInfo = await ibossService.makeAPICall('GetAccountCommission', credentials);
      await DatabaseService.saveCommissionInfo(user.id, accountInfo.Account, commissionInfo);

      // Fetch holdings
      const holdings = await ibossService.makeAPICall('GetPortfolioHoldings', credentials);
      await DatabaseService.saveHoldings(user.id, accountInfo.Account, holdings);

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          accountNumber: accountInfo.Account,
          accountName: accountInfo.AccountName
        }
      });
    } catch (apiError) {
      console.error('IBOSS API Error:', apiError);
      // Still return token but with limited data
      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        },
        warning: 'Some portfolio data may be unavailable'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register new user
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, bankUsername, ibossUsername } = req.body;

    // Check if user already exists
    const existingUser = await DatabaseService.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Create new user
    const userId = await DatabaseService.createUser({
      username,
      email,
      password,
      bankUsername,
      ibossUsername
    });

    res.status(201).json({ message: 'User created successfully', userId });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Portfolio data endpoints
app.get('/api/portfolio/summary', authenticateToken, async (req, res) => {
  try {
    const summary = await DatabaseService.getPortfolioSummary(req.user.userId);
    res.json(summary);
  } catch (error) {
    console.error('Portfolio summary error:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio summary' });
  }
});

app.get('/api/portfolio/holdings', authenticateToken, async (req, res) => {
  try {
    const { accountNumber } = req.query;
    const holdings = await DatabaseService.getHoldings(req.user.userId, accountNumber);
    res.json(holdings);
  } catch (error) {
    console.error('Holdings error:', error);
    res.status(500).json({ error: 'Failed to fetch holdings' });
  }
});

app.get('/api/portfolio/performance', authenticateToken, async (req, res) => {
  try {
    const { accountNumber } = req.query;
    const performance = await DatabaseService.getPerformance(req.user.userId, accountNumber);
    res.json(performance);
  } catch (error) {
    console.error('Performance error:', error);
    res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

app.get('/api/portfolio/risk', authenticateToken, async (req, res) => {
  try {
    const { accountNumber } = req.query;
    const riskMetrics = await DatabaseService.getRiskMetrics(req.user.userId, accountNumber);
    res.json(riskMetrics);
  } catch (error) {
    console.error('Risk metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch risk metrics' });
  }
});

// Refresh portfolio data
app.post('/api/portfolio/refresh', authenticateToken, async (req, res) => {
  try {
    const { accountNumber, ibossPassword } = req.body;
    const credentials = { 
      userId: req.user.userId, 
      ibossUsername: req.user.ibossUsername, 
      ibossPassword 
    };

    // Refresh all data
    const [accountInfo, accountBalance, commissionInfo, holdings] = await Promise.all([
      ibossService.makeAPICall('GetAccountInfo', credentials),
      ibossService.makeAPICall('GetAccountBalance', credentials),
      ibossService.makeAPICall('GetAccountCommission', credentials),
      ibossService.makeAPICall('GetPortfolioHoldings', credentials)
    ]);

    // Save to database
    await Promise.all([
      DatabaseService.saveAccountInfo(req.user.userId, accountInfo),
      DatabaseService.saveAccountBalance(req.user.userId, accountNumber, accountBalance),
      DatabaseService.saveCommissionInfo(req.user.userId, accountNumber, commissionInfo),
      DatabaseService.saveHoldings(req.user.userId, accountNumber, holdings)
    ]);

    res.json({ message: 'Portfolio data refreshed successfully' });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh portfolio data' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`IBOSS Portfolio Tracker API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
