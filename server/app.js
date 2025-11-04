const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const redis = require('redis');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Redis connection
const redisClient = redis.createClient({
  url: process.env.REDIS_URL
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisClient.connect();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token is blacklisted in Redis
    const isBlacklisted = await redisClient.get(`blacklist_${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ message: 'Token has been revoked' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Audit logging middleware
const auditLog = async (req, res, next) => {
  if (req.user) {
    try {
      await pool.query(
        `INSERT INTO audit_logs (admin_id, action, resource_type, resource_id, details, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          req.user.id,
          `${req.method} ${req.path}`,
          req.path.split('/')[2] || 'unknown',
          req.params.id || null,
          JSON.stringify({ body: req.body, query: req.query }),
          req.ip,
          req.get('User-Agent')
        ]
      );
    } catch (error) {
      console.error('Audit logging error:', error);
    }
  }
  next();
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Get user from database
    const userResult = await pool.query(
      'SELECT * FROM admin_users WHERE username = $1 AND is_active = true',
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    await pool.query(
      'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Store token in Redis for session management
    await redisClient.setEx(`session_${user.id}`, 24 * 60 * 60, token);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    const token = req.headers['authorization'].split(' ')[1];
    
    // Add token to blacklist
    await redisClient.setEx(`blacklist_${token}`, 24 * 60 * 60, 'true');
    
    // Remove session
    await redisClient.del(`session_${req.user.id}`);

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ 
    message: 'Token is valid', 
    user: req.user 
  });
});

// Dashboard statistics
app.get('/api/dashboard/statistics', authenticateToken, auditLog, async (req, res) => {
  try {
    const [clientsResult, kycResult, transfersResult, messagesResult] = await Promise.all([
      pool.query('SELECT COUNT(*) as total FROM clients'),
      pool.query('SELECT COUNT(*) as pending FROM kyc_requests WHERE status = $1', ['pending']),
      pool.query('SELECT COUNT(*) as pending FROM fund_transfers WHERE status = $1', ['pending']),
      pool.query('SELECT COUNT(*) as unread FROM communications WHERE status = $1', ['unread'])
    ]);

    res.json({
      totalClients: parseInt(clientsResult.rows[0].total),
      pendingKyc: parseInt(kycResult.rows[0].pending),
      fundTransfers: parseInt(transfersResult.rows[0].pending),
      newMessages: parseInt(messagesResult.rows[0].unread)
    });
  } catch (error) {
    console.error('Statistics error:', error);
    res.status(500).json({ message: 'Failed to fetch statistics' });
  }
});

// Client management routes
app.get('/api/clients', authenticateToken, auditLog, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '', status = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT id, first_name, last_name, email, phone, status, 
             account_number, portfolio_value, risk_score, 
             created_at, updated_at
      FROM clients
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Clients fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch clients' });
  }
});

app.get('/api/clients/:id', authenticateToken, auditLog, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Client fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch client' });
  }
});

app.patch('/api/clients/:id', authenticateToken, auditLog, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, portfolio_value, risk_score } = req.body;

    const updates = [];
    const params = [id];
    let paramCount = 1;

    if (status) {
      paramCount++;
      updates.push(`status = $${paramCount}`);
      params.push(status);
    }

    if (portfolio_value !== undefined) {
      paramCount++;
      updates.push(`portfolio_value = $${paramCount}`);
      params.push(portfolio_value);
    }

    if (risk_score !== undefined) {
      paramCount++;
      updates.push(`risk_score = $${paramCount}`);
      params.push(risk_score);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    const query = `UPDATE clients SET ${updates.join(', ')} WHERE id = $1 RETURNING *`;
    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Client update error:', error);
    res.status(500).json({ message: 'Failed to update client' });
  }
});

// KYC management routes
app.get('/api/kyc-requests', authenticateToken, auditLog, async (req, res) => {
  try {
    const { status = 'pending' } = req.query;

    const query = `
      SELECT kr.*, c.first_name, c.last_name, c.email,
             CONCAT(c.first_name, ' ', c.last_name) as client_name
      FROM kyc_requests kr
      JOIN clients c ON kr.client_id = c.id
      WHERE kr.status = $1
      ORDER BY kr.submitted_at DESC
    `;

    const result = await pool.query(query, [status]);
    res.json(result.rows);
  } catch (error) {
    console.error('KYC requests fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch KYC requests' });
  }
});

app.patch('/api/kyc-requests/:id', authenticateToken, auditLog, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, review_notes } = req.body;

    const query = `
      UPDATE kyc_requests 
      SET status = $1, reviewer_id = $2, review_notes = $3, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;

    const result = await pool.query(query, [status, req.user.id, review_notes, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'KYC request not found' });
    }

    // Update client status if KYC is approved
    if (status === 'approved') {
      await pool.query(
        'UPDATE clients SET status = $1 WHERE id = $2',
        ['active', result.rows[0].client_id]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('KYC update error:', error);
    res.status(500).json({ message: 'Failed to update KYC request' });
  }
});

// Fund transfer management routes
app.get('/api/fund-transfers', authenticateToken, auditLog, async (req, res) => {
  try {
    const { status = 'pending' } = req.query;

    const query = `
      SELECT ft.*, c.first_name, c.last_name, c.email,
             CONCAT(c.first_name, ' ', c.last_name) as client_name
      FROM fund_transfers ft
      JOIN clients c ON ft.client_id = c.id
      WHERE ft.status = $1
      ORDER BY ft.requested_at DESC
    `;

    const result = await pool.query(query, [status]);
    res.json(result.rows);
  } catch (error) {
    console.error('Fund transfers fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch fund transfers' });
  }
});

app.patch('/api/fund-transfers/:id', authenticateToken, auditLog, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const query = `
      UPDATE fund_transfers 
      SET status = $1, approver_id = $2, approved_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;

    const result = await pool.query(query, [status, req.user.id, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Fund transfer not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Fund transfer update error:', error);
    res.status(500).json({ message: 'Failed to update fund transfer' });
  }
});

// Communication management routes
app.get('/api/communications', authenticateToken, auditLog, async (req, res) => {
  try {
    const { status = 'unread' } = req.query;

    const query = `
      SELECT comm.*, c.first_name, c.last_name, c.email as client_email,
             CONCAT(c.first_name, ' ', c.last_name) as client_name
      FROM communications comm
      JOIN clients c ON comm.client_id = c.id
      WHERE comm.status = $1
      ORDER BY comm.created_at DESC
    `;

    const result = await pool.query(query, [status]);
    res.json(result.rows);
  } catch (error) {
    console.error('Communications fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch communications' });
  }
});

app.patch('/api/communications/:id', authenticateToken, auditLog, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const query = `
      UPDATE communications 
      SET status = $1, admin_id = $2
      WHERE id = $3
      RETURNING *
    `;

    const result = await pool.query(query, [status, req.user.id, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Communication not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Communication update error:', error);
    res.status(500).json({ message: 'Failed to update communication' });
  }
});

app.post('/api/communications', authenticateToken, auditLog, async (req, res) => {
  try {
    const { client_id, subject, message } = req.body;

    const query = `
      INSERT INTO communications (client_id, subject, message, direction, admin_id)
      VALUES ($1, $2, $3, 'outbound', $4)
      RETURNING *
    `;

    const result = await pool.query(query, [client_id, subject, message, req.user.id]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Communication creation error:', error);
    res.status(500).json({ message: 'Failed to create communication' });
  }
});

// Document management routes
app.get('/api/documents', authenticateToken, auditLog, async (req, res) => {
  try {
    const { client_id, status } = req.query;

    let query = `
      SELECT d.*, c.first_name, c.last_name,
             CONCAT(c.first_name, ' ', c.last_name) as client_name
      FROM documents d
      JOIN clients c ON d.client_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (client_id) {
      paramCount++;
      query += ` AND d.client_id = $${paramCount}`;
      params.push(client_id);
    }

    if (status) {
      paramCount++;
      query += ` AND d.status = $${paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY d.uploaded_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Documents fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
});

app.post('/api/documents/upload', authenticateToken, auditLog, upload.single('document'), async (req, res) => {
  try {
    const { client_id, document_type } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const query = `
      INSERT INTO documents (client_id, document_name, document_type, file_path, file_size, mime_type)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await pool.query(query, [
      client_id,
      file.originalname,
      document_type,
      file.path,
      file.size,
      file.mimetype
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ message: 'Failed to upload document' });
  }
});

app.get('/api/documents/:id/download', authenticateToken, auditLog, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('SELECT * FROM documents WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const document = result.rows[0];
    const filePath = document.file_path;

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ message: 'File not found on disk' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${document.document_name}"`);
    res.setHeader('Content-Type', document.mime_type);
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error('Document download error:', error);
    res.status(500).json({ message: 'Failed to download document' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large' });
    }
  }

  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  try {
    await pool.end();
    await redisClient.quit();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Admin Dashboard API server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`AWS Account: ${process.env.AWS_ACCOUNT_ID || 'Not configured'}`);
});

module.exports = app;
