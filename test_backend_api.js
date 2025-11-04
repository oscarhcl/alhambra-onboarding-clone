const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const dbPath = path.join(__dirname, 'alhambra_test.db');
const db = new sqlite3.Database(dbPath);

// JWT Secret
const JWT_SECRET = 'alhambra-bank-super-secret-jwt-key-for-testing-min-32-chars';

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

// IBOSS API Service Mock
class IBOSSAPIService {
  static async simulateIBOSSAPI(operation, credentials) {
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
      }
    };

    return mockData[operation] || {};
  }
}

// Database helper functions
class DatabaseService {
  static getUserByUsername(username) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM users WHERE username = ? AND is_active = 1',
        [username],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  static getPortfolioSummary(userId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          u.username,
          ai.account_number,
          ai.account_name,
          ab.total_equity,
          ab.cash_balance,
          ab.day_buying_power,
          ab.net_liquidation_value,
          pp.return_percent as daily_return,
          pp.return_amount as daily_return_amount,
          rm.risk_score,
          rm.sharpe_ratio,
          ab.as_of_date
        FROM users u
        JOIN account_info ai ON u.id = ai.user_id
        JOIN account_balance ab ON u.id = ab.user_id AND ai.account_number = ab.account_number
        LEFT JOIN portfolio_performance pp ON u.id = pp.user_id AND ai.account_number = pp.account_number AND pp.period_type = 'daily'
        LEFT JOIN risk_metrics rm ON u.id = rm.user_id AND ai.account_number = rm.account_number
        WHERE u.id = ?
      `;
      
      db.get(query, [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  static getHoldings(userId, accountNumber) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM portfolio_holdings 
         WHERE user_id = ? AND account_number = ? AND as_of_date = date('now')
         ORDER BY market_value DESC`,
        [userId, accountNumber],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  static getPerformance(userId, accountNumber) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM portfolio_performance 
         WHERE user_id = ? AND account_number = ? AND as_of_date = date('now')
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
        [userId, accountNumber],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  static getRiskMetrics(userId, accountNumber) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM risk_metrics 
         WHERE user_id = ? AND account_number = ? AND as_of_date = date('now')`,
        [userId, accountNumber],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: 'SQLite (Test Mode)'
  });
});

// Authentication
app.post('/api/auth/login', async (req, res) => {
  try {
    const { bankUsername, bankPassword, ibossUsername, ibossPassword } = req.body;

    // Find user by bank username
    const user = await DatabaseService.getUserByUsername(bankUsername);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check for specific admin credentials
    const validPassword = (bankPassword === 'ali1234' || bankPassword === 'RafiRamzi2025!!');
    const validIbossPassword = (ibossPassword === 'alhambra5312@abt.ky');

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid bank credentials' });
    }

    if (!validIbossPassword) {
      return res.status(401).json({ error: 'Invalid IBOSS credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, ibossUsername },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Simulate IBOSS API calls
    try {
      const accountInfo = await IBOSSAPIService.simulateIBOSSAPI('GetAccountInfo', { ibossUsername });
      const accountBalance = await IBOSSAPIService.simulateIBOSSAPI('GetAccountBalance', { ibossUsername });

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
    const holdings = await DatabaseService.getHoldings(req.user.userId, accountNumber || 'DEMO123456');
    res.json(holdings);
  } catch (error) {
    console.error('Holdings error:', error);
    res.status(500).json({ error: 'Failed to fetch holdings' });
  }
});

app.get('/api/portfolio/performance', authenticateToken, async (req, res) => {
  try {
    const { accountNumber } = req.query;
    const performance = await DatabaseService.getPerformance(req.user.userId, accountNumber || 'DEMO123456');
    res.json(performance);
  } catch (error) {
    console.error('Performance error:', error);
    res.status(500).json({ error: 'Failed to fetch performance data' });
  }
});

app.get('/api/portfolio/risk', authenticateToken, async (req, res) => {
  try {
    const { accountNumber } = req.query;
    const riskMetrics = await DatabaseService.getRiskMetrics(req.user.userId, accountNumber || 'DEMO123456');
    res.json(riskMetrics);
  } catch (error) {
    console.error('Risk metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch risk metrics' });
  }
});

// Refresh portfolio data (mock)
app.post('/api/portfolio/refresh', authenticateToken, async (req, res) => {
  try {
    // Simulate refresh by updating some random data
    const { accountNumber } = req.body;
    
    // In a real implementation, this would call IBOSS APIs and update the database
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call delay
    
    res.json({ message: 'Portfolio data refreshed successfully (simulated)' });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh portfolio data' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🏦 Alhambra Bank IBOSS Portfolio Tracker API (Test Mode)`);
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Database: SQLite (${dbPath})`);
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📝 Admin credentials: admin / ali1234 or RafiRamzi2025!! / alhambrabank / alhambra5312@abt.ky`);
});

module.exports = app;
