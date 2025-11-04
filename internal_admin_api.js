// Alhambra Bank & Trust - Internal Admin API
// Account: 600043382145
// Secure internal API for admin dashboard, CRM, KYC, and document management

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const AWS = require('aws-sdk');
const { Pool } = require('pg');
const Redis = require('redis');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const winston = require('winston');
const { body, validationResult } = require('express-validator');

const app = express();

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    port: process.env.INTERNAL_API_PORT || 3002,
    jwtSecret: process.env.INTERNAL_JWT_SECRET || 'alhambra-internal-super-secret-key-2025',
    jwtExpiry: '8h', // Admin sessions expire after 8 hours
    
    // Database Configuration
    database: {
        host: process.env.INTERNAL_DB_HOST || 'localhost',
        port: process.env.INTERNAL_DB_PORT || 5432,
        database: process.env.INTERNAL_DB_NAME || 'alhambra_internal',
        user: process.env.INTERNAL_DB_USER || 'admin',
        password: process.env.INTERNAL_DB_PASSWORD || 'RafiRamzi2025!!',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    },
    
    // Redis Configuration
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || null
    },
    
    // AWS Configuration
    aws: {
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        s3Bucket: process.env.AWS_S3_BUCKET || 'alhambra-internal-documents'
    },
    
    // Email Configuration
    email: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 587,
        user: process.env.SMTP_USER || 'admin@alhambrabank.com',
        password: process.env.SMTP_PASSWORD || 'your-email-password'
    },
    
    // Twilio Configuration
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER
    }
};

// ============================================================================
// LOGGING CONFIGURATION
// ============================================================================

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'alhambra-internal-api' },
    transports: [
        new winston.transports.File({ filename: 'logs/internal-error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/internal-combined.log' }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

// ============================================================================
// DATABASE SETUP
// ============================================================================

const pool = new Pool(CONFIG.database);

// Redis client
const redisClient = Redis.createClient(CONFIG.redis);
redisClient.on('error', (err) => logger.error('Redis Client Error', err));

// AWS S3 client
AWS.config.update({
    region: CONFIG.aws.region,
    accessKeyId: CONFIG.aws.accessKeyId,
    secretAccessKey: CONFIG.aws.secretAccessKey
});
const s3 = new AWS.S3();

// Email transporter
const emailTransporter = nodemailer.createTransporter({
    host: CONFIG.email.host,
    port: CONFIG.email.port,
    secure: false,
    auth: {
        user: CONFIG.email.user,
        pass: CONFIG.email.password
    }
});

// Twilio client
const twilioClient = CONFIG.twilio.accountSid ? 
    twilio(CONFIG.twilio.accountSid, CONFIG.twilio.authToken) : null;

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// CORS configuration for internal use only
app.use(cors({
    origin: [
        'https://admin.alhambrabank.com',
        'https://internal.alhambrabank.com',
        'http://localhost:3000', // Development
        'http://localhost:3001'  // Development
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting for admin API
const adminRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Higher limit for internal admin use
    message: {
        error: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/admin', adminRateLimit);

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
    });
    next();
});

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

const authenticateAdmin = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access denied. No token provided.',
                code: 'NO_TOKEN'
            });
        }

        const decoded = jwt.verify(token, CONFIG.jwtSecret);
        
        // Check if token is blacklisted
        const isBlacklisted = await redisClient.get(`blacklist:${token}`);
        if (isBlacklisted) {
            return res.status(401).json({
                success: false,
                error: 'Token has been invalidated.',
                code: 'TOKEN_BLACKLISTED'
            });
        }

        // Get admin details from database
        const adminQuery = await pool.query(
            'SELECT id, username, email, role, permissions, last_login FROM admin_users WHERE id = $1 AND active = true',
            [decoded.adminId]
        );

        if (adminQuery.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Admin not found or inactive.',
                code: 'ADMIN_NOT_FOUND'
            });
        }

        req.admin = adminQuery.rows[0];
        next();
    } catch (error) {
        logger.error('Admin authentication error:', error);
        return res.status(401).json({
            success: false,
            error: 'Invalid token.',
            code: 'INVALID_TOKEN'
        });
    }
};

// Permission checking middleware
const requirePermission = (permission) => {
    return (req, res, next) => {
        const adminPermissions = req.admin.permissions || [];
        
        if (!adminPermissions.includes(permission) && !adminPermissions.includes('super_admin')) {
            return res.status(403).json({
                success: false,
                error: 'Insufficient permissions.',
                code: 'INSUFFICIENT_PERMISSIONS',
                required: permission
            });
        }
        
        next();
    };
};

// ============================================================================
// FILE UPLOAD CONFIGURATION
// ============================================================================

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
        files: 10 // Maximum 10 files per request
    },
    fileFilter: (req, file, cb) => {
        // Allow common document and image formats
        const allowedMimes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg',
            'image/png',
            'image/gif',
            'text/plain',
            'text/csv'
        ];
        
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'), false);
        }
    }
});

// ============================================================================
// ADMIN AUTHENTICATION ROUTES
// ============================================================================

// Admin login
app.post('/admin/login', [
    body('username').isLength({ min: 3 }).trim().escape(),
    body('password').isLength({ min: 8 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { username, password, mfaCode } = req.body;

        // Get admin from database
        const adminQuery = await pool.query(
            'SELECT * FROM admin_users WHERE username = $1 AND active = true',
            [username]
        );

        if (adminQuery.rows.length === 0) {
            logger.warn(`Failed admin login attempt for username: ${username}`);
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
        }

        const admin = adminQuery.rows[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, admin.password_hash);
        if (!isValidPassword) {
            logger.warn(`Failed admin login attempt for username: ${username} - invalid password`);
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Check if MFA is required
        if (admin.mfa_enabled && !mfaCode) {
            return res.status(200).json({
                success: false,
                mfaRequired: true,
                message: 'MFA code required'
            });
        }

        // Verify MFA if provided
        if (admin.mfa_enabled && mfaCode) {
            // Implement MFA verification logic here
            // For now, we'll skip MFA verification
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                adminId: admin.id,
                username: admin.username,
                role: admin.role
            },
            CONFIG.jwtSecret,
            { expiresIn: CONFIG.jwtExpiry }
        );

        // Update last login
        await pool.query(
            'UPDATE admin_users SET last_login = NOW(), login_count = login_count + 1 WHERE id = $1',
            [admin.id]
        );

        // Log successful login
        logger.info(`Successful admin login: ${username}`, {
            adminId: admin.id,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({
            success: true,
            token,
            admin: {
                id: admin.id,
                username: admin.username,
                email: admin.email,
                name: admin.full_name,
                role: admin.role,
                permissions: admin.permissions
            }
        });

    } catch (error) {
        logger.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});

// Validate admin session
app.get('/admin/validate-session', authenticateAdmin, async (req, res) => {
    res.json({
        valid: true,
        admin: {
            id: req.admin.id,
            username: req.admin.username,
            email: req.admin.email,
            role: req.admin.role,
            permissions: req.admin.permissions
        }
    });
});

// Admin logout
app.post('/admin/logout', authenticateAdmin, async (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        // Add token to blacklist
        if (token) {
            await redisClient.setEx(`blacklist:${token}`, 28800, 'true'); // 8 hours
        }

        logger.info(`Admin logout: ${req.admin.username}`, {
            adminId: req.admin.id,
            ip: req.ip
        });

        res.json({
            success: true,
            message: 'Logged out successfully'
        });
    } catch (error) {
        logger.error('Admin logout error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// ============================================================================
// DASHBOARD OVERVIEW ROUTES
// ============================================================================

// Get overview statistics
app.get('/admin/overview-stats', authenticateAdmin, async (req, res) => {
    try {
        const stats = await Promise.all([
            // Total clients
            pool.query('SELECT COUNT(*) as count FROM clients WHERE active = true'),
            
            // Pending KYC requests
            pool.query('SELECT COUNT(*) as count FROM kyc_requests WHERE status = $1', ['pending']),
            
            // Pending fund transfers
            pool.query('SELECT COUNT(*) as count FROM fund_transfers WHERE status = $1', ['pending']),
            
            // New messages (last 24 hours)
            pool.query(`
                SELECT COUNT(*) as count FROM client_communications 
                WHERE created_at >= NOW() - INTERVAL '24 hours' AND status = 'unread'
            `)
        ]);

        res.json({
            success: true,
            stats: {
                totalClients: parseInt(stats[0].rows[0].count),
                pendingKYC: parseInt(stats[1].rows[0].count),
                pendingTransfers: parseInt(stats[2].rows[0].count),
                newMessages: parseInt(stats[3].rows[0].count)
            }
        });
    } catch (error) {
        logger.error('Error fetching overview stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch overview statistics'
        });
    }
});

// Get recent activities
app.get('/admin/recent-activities', authenticateAdmin, async (req, res) => {
    try {
        const activitiesQuery = await pool.query(`
            SELECT 
                id,
                activity_type as type,
                description,
                created_at as timestamp,
                client_id,
                admin_id
            FROM admin_activities 
            ORDER BY created_at DESC 
            LIMIT 20
        `);

        const activities = activitiesQuery.rows.map(activity => ({
            ...activity,
            timestamp: new Date(activity.timestamp).toLocaleString()
        }));

        res.json({
            success: true,
            activities
        });
    } catch (error) {
        logger.error('Error fetching recent activities:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch recent activities'
        });
    }
});

// Get notifications
app.get('/admin/notifications', authenticateAdmin, async (req, res) => {
    try {
        const notificationsQuery = await pool.query(`
            SELECT 
                id,
                title,
                message,
                type,
                priority,
                read,
                created_at
            FROM admin_notifications 
            WHERE admin_id = $1 OR admin_id IS NULL
            ORDER BY created_at DESC 
            LIMIT 50
        `, [req.admin.id]);

        res.json({
            success: true,
            notifications: notificationsQuery.rows
        });
    } catch (error) {
        logger.error('Error fetching notifications:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notifications'
        });
    }
});

// ============================================================================
// CLIENT MANAGEMENT ROUTES
// ============================================================================

// Get clients list
app.get('/admin/clients', authenticateAdmin, requirePermission('view_clients'), async (req, res) => {
    try {
        const { search, status, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                c.id,
                c.email,
                c.first_name || ' ' || c.last_name as name,
                c.phone,
                c.status,
                c.created_at,
                c.last_login,
                COALESCE(p.total_value, 0) as portfolio_value,
                a.account_number
            FROM clients c
            LEFT JOIN portfolios p ON c.id = p.client_id
            LEFT JOIN accounts a ON c.id = a.client_id
            WHERE c.active = true
        `;

        const queryParams = [];
        let paramCount = 0;

        if (search) {
            paramCount++;
            query += ` AND (c.first_name ILIKE $${paramCount} OR c.last_name ILIKE $${paramCount} OR c.email ILIKE $${paramCount})`;
            queryParams.push(`%${search}%`);
        }

        if (status && status !== 'all') {
            paramCount++;
            query += ` AND c.status = $${paramCount}`;
            queryParams.push(status);
        }

        query += ` ORDER BY c.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        queryParams.push(limit, offset);

        const clientsQuery = await pool.query(query, queryParams);

        res.json({
            success: true,
            clients: clientsQuery.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: clientsQuery.rowCount
            }
        });
    } catch (error) {
        logger.error('Error fetching clients:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch clients'
        });
    }
});

// Get client details
app.get('/admin/clients/:clientId', authenticateAdmin, requirePermission('view_clients'), async (req, res) => {
    try {
        const { clientId } = req.params;

        const clientQuery = await pool.query(`
            SELECT 
                c.*,
                a.account_number,
                a.account_type,
                p.total_value as portfolio_value,
                p.cash_balance,
                p.last_updated as portfolio_last_updated
            FROM clients c
            LEFT JOIN accounts a ON c.id = a.client_id
            LEFT JOIN portfolios p ON c.id = p.client_id
            WHERE c.id = $1
        `, [clientId]);

        if (clientQuery.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Client not found'
            });
        }

        res.json({
            success: true,
            client: clientQuery.rows[0]
        });
    } catch (error) {
        logger.error('Error fetching client details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch client details'
        });
    }
});

// ============================================================================
// KYC MANAGEMENT ROUTES
// ============================================================================

// Get KYC requests
app.get('/admin/kyc-requests', authenticateAdmin, requirePermission('manage_kyc'), async (req, res) => {
    try {
        const { status = 'pending', page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        const kycQuery = await pool.query(`
            SELECT 
                k.id,
                k.client_id,
                c.first_name || ' ' || c.last_name as client_name,
                c.email as client_email,
                k.status,
                k.risk_level,
                k.request_date,
                k.documents_uploaded,
                k.notes,
                k.reviewed_by,
                k.reviewed_at
            FROM kyc_requests k
            JOIN clients c ON k.client_id = c.id
            WHERE k.status = $1
            ORDER BY k.request_date DESC
            LIMIT $2 OFFSET $3
        `, [status, limit, offset]);

        res.json({
            success: true,
            requests: kycQuery.rows
        });
    } catch (error) {
        logger.error('Error fetching KYC requests:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch KYC requests'
        });
    }
});

// Get KYC request details
app.get('/admin/kyc-requests/:requestId', authenticateAdmin, requirePermission('manage_kyc'), async (req, res) => {
    try {
        const { requestId } = req.params;

        const kycQuery = await pool.query(`
            SELECT 
                k.*,
                c.first_name || ' ' || c.last_name as client_name,
                c.email as client_email,
                c.phone as client_phone,
                c.date_of_birth,
                c.address,
                a.username as reviewed_by_username
            FROM kyc_requests k
            JOIN clients c ON k.client_id = c.id
            LEFT JOIN admin_users a ON k.reviewed_by = a.id
            WHERE k.id = $1
        `, [requestId]);

        if (kycQuery.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'KYC request not found'
            });
        }

        // Get associated documents
        const documentsQuery = await pool.query(`
            SELECT id, document_type, file_name, file_url, uploaded_at
            FROM kyc_documents
            WHERE kyc_request_id = $1
        `, [requestId]);

        const kycRequest = kycQuery.rows[0];
        kycRequest.documents = documentsQuery.rows;

        res.json({
            success: true,
            request: kycRequest
        });
    } catch (error) {
        logger.error('Error fetching KYC request details:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch KYC request details'
        });
    }
});

// Process KYC request action
app.post('/admin/kyc-requests/:requestId/action', 
    authenticateAdmin, 
    requirePermission('manage_kyc'),
    [
        body('action').isIn(['approve', 'reject', 'request_more_info']),
        body('notes').optional().isLength({ max: 1000 }).trim()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const { requestId } = req.params;
            const { action, notes } = req.body;

            // Update KYC request
            await pool.query(`
                UPDATE kyc_requests 
                SET 
                    status = $1,
                    notes = $2,
                    reviewed_by = $3,
                    reviewed_at = NOW()
                WHERE id = $4
            `, [action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'pending', notes, req.admin.id, requestId]);

            // If approved, update client status
            if (action === 'approve') {
                await pool.query(`
                    UPDATE clients 
                    SET status = 'active', kyc_status = 'approved'
                    WHERE id = (SELECT client_id FROM kyc_requests WHERE id = $1)
                `, [requestId]);
            }

            // Log activity
            await pool.query(`
                INSERT INTO admin_activities (admin_id, activity_type, description, client_id)
                SELECT $1, 'kyc_action', $2, client_id
                FROM kyc_requests WHERE id = $3
            `, [req.admin.id, `KYC request ${action}ed`, requestId]);

            // Send notification to client (implement email/SMS notification)
            // ... notification logic here ...

            res.json({
                success: true,
                message: `KYC request ${action}ed successfully`
            });
        } catch (error) {
            logger.error('Error processing KYC action:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to process KYC action'
            });
        }
    }
);

// ============================================================================
// FUND TRANSFER MANAGEMENT ROUTES
// ============================================================================

// Get fund transfers
app.get('/admin/fund-transfers', authenticateAdmin, requirePermission('manage_transfers'), async (req, res) => {
    try {
        const { status = 'pending', page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        const transfersQuery = await pool.query(`
            SELECT 
                ft.id,
                ft.client_id,
                c.first_name || ' ' || c.last_name as client_name,
                c.email as client_email,
                ft.transfer_type,
                ft.amount,
                ft.currency,
                ft.from_account,
                ft.to_account,
                ft.status,
                ft.request_date,
                ft.processed_date,
                ft.notes,
                ft.reviewed_by
            FROM fund_transfers ft
            JOIN clients c ON ft.client_id = c.id
            WHERE ft.status = $1
            ORDER BY ft.request_date DESC
            LIMIT $2 OFFSET $3
        `, [status, limit, offset]);

        res.json({
            success: true,
            transfers: transfersQuery.rows
        });
    } catch (error) {
        logger.error('Error fetching fund transfers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch fund transfers'
        });
    }
});

// Process fund transfer action
app.post('/admin/fund-transfers/:transferId/action',
    authenticateAdmin,
    requirePermission('manage_transfers'),
    [
        body('action').isIn(['approve', 'reject']),
        body('notes').optional().isLength({ max: 1000 }).trim()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const { transferId } = req.params;
            const { action, notes } = req.body;

            // Update transfer status
            await pool.query(`
                UPDATE fund_transfers 
                SET 
                    status = $1,
                    notes = $2,
                    reviewed_by = $3,
                    processed_date = NOW()
                WHERE id = $4
            `, [action === 'approve' ? 'approved' : 'rejected', notes, req.admin.id, transferId]);

            // Log activity
            await pool.query(`
                INSERT INTO admin_activities (admin_id, activity_type, description, client_id)
                SELECT $1, 'transfer_action', $2, client_id
                FROM fund_transfers WHERE id = $3
            `, [req.admin.id, `Fund transfer ${action}ed`, transferId]);

            res.json({
                success: true,
                message: `Fund transfer ${action}ed successfully`
            });
        } catch (error) {
            logger.error('Error processing fund transfer action:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to process fund transfer action'
            });
        }
    }
);

// ============================================================================
// COMMUNICATIONS MANAGEMENT ROUTES
// ============================================================================

// Get client communications
app.get('/admin/communications', authenticateAdmin, requirePermission('manage_communications'), async (req, res) => {
    try {
        const { status = 'unread', page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        const communicationsQuery = await pool.query(`
            SELECT 
                cc.id,
                cc.client_id,
                c.first_name || ' ' || c.last_name as client_name,
                c.email as client_email,
                cc.subject,
                cc.message,
                cc.communication_type,
                cc.priority,
                cc.status,
                cc.created_at,
                cc.responded_at,
                cc.responded_by
            FROM client_communications cc
            JOIN clients c ON cc.client_id = c.id
            WHERE cc.status = $1
            ORDER BY cc.created_at DESC
            LIMIT $2 OFFSET $3
        `, [status, limit, offset]);

        res.json({
            success: true,
            communications: communicationsQuery.rows
        });
    } catch (error) {
        logger.error('Error fetching communications:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch communications'
        });
    }
});

// Reply to client communication
app.post('/admin/communications/:commId/reply',
    authenticateAdmin,
    requirePermission('manage_communications'),
    [
        body('reply').isLength({ min: 1, max: 5000 }).trim()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const { commId } = req.params;
            const { reply } = req.body;

            // Update communication status
            await pool.query(`
                UPDATE client_communications 
                SET 
                    status = 'responded',
                    admin_reply = $1,
                    responded_by = $2,
                    responded_at = NOW()
                WHERE id = $3
            `, [reply, req.admin.id, commId]);

            // Get client email for notification
            const clientQuery = await pool.query(`
                SELECT c.email, c.first_name, cc.subject
                FROM client_communications cc
                JOIN clients c ON cc.client_id = c.id
                WHERE cc.id = $1
            `, [commId]);

            if (clientQuery.rows.length > 0) {
                const client = clientQuery.rows[0];
                
                // Send email notification to client
                try {
                    await emailTransporter.sendMail({
                        from: CONFIG.email.user,
                        to: client.email,
                        subject: `Re: ${client.subject}`,
                        html: `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <div style="background: linear-gradient(135deg, #800020, #DC143C); padding: 20px; text-align: center;">
                                    <h1 style="color: white; margin: 0;">Alhambra Bank & Trust</h1>
                                </div>
                                <div style="padding: 20px; background: #f9f9f9;">
                                    <p>Dear ${client.first_name},</p>
                                    <p>Thank you for contacting us. Here is our response to your inquiry:</p>
                                    <div style="background: white; padding: 15px; border-left: 4px solid #800020; margin: 20px 0;">
                                        ${reply.replace(/\n/g, '<br>')}
                                    </div>
                                    <p>If you have any additional questions, please don't hesitate to contact us.</p>
                                    <p>Best regards,<br>Alhambra Bank & Trust Customer Service</p>
                                </div>
                            </div>
                        `
                    });
                } catch (emailError) {
                    logger.error('Error sending email notification:', emailError);
                }
            }

            res.json({
                success: true,
                message: 'Reply sent successfully'
            });
        } catch (error) {
            logger.error('Error sending reply:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to send reply'
            });
        }
    }
);

// ============================================================================
// DOCUMENT MANAGEMENT ROUTES
// ============================================================================

// Get documents
app.get('/admin/documents', authenticateAdmin, requirePermission('manage_documents'), async (req, res) => {
    try {
        const { clientId, documentType, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT 
                d.id,
                d.client_id,
                c.first_name || ' ' || c.last_name as client_name,
                d.document_type,
                d.file_name,
                d.file_size,
                d.file_url,
                d.uploaded_at,
                d.uploaded_by_admin,
                a.username as uploaded_by_username
            FROM documents d
            LEFT JOIN clients c ON d.client_id = c.id
            LEFT JOIN admin_users a ON d.uploaded_by_admin = a.id
            WHERE 1=1
        `;

        const queryParams = [];
        let paramCount = 0;

        if (clientId) {
            paramCount++;
            query += ` AND d.client_id = $${paramCount}`;
            queryParams.push(clientId);
        }

        if (documentType) {
            paramCount++;
            query += ` AND d.document_type = $${paramCount}`;
            queryParams.push(documentType);
        }

        query += ` ORDER BY d.uploaded_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        queryParams.push(limit, offset);

        const documentsQuery = await pool.query(query, queryParams);

        res.json({
            success: true,
            documents: documentsQuery.rows
        });
    } catch (error) {
        logger.error('Error fetching documents:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch documents'
        });
    }
});

// Upload document
app.post('/admin/documents/upload',
    authenticateAdmin,
    requirePermission('manage_documents'),
    upload.array('documents', 10),
    async (req, res) => {
        try {
            const { clientId, documentType, description } = req.body;
            const files = req.files;

            if (!files || files.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'No files uploaded'
                });
            }

            const uploadedDocuments = [];

            for (const file of files) {
                // Generate unique filename
                const timestamp = Date.now();
                const fileName = `${timestamp}-${file.originalname}`;
                const s3Key = `documents/${clientId || 'general'}/${fileName}`;

                // Upload to S3
                const uploadParams = {
                    Bucket: CONFIG.aws.s3Bucket,
                    Key: s3Key,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                    ServerSideEncryption: 'AES256'
                };

                const s3Result = await s3.upload(uploadParams).promise();

                // Save to database
                const documentQuery = await pool.query(`
                    INSERT INTO documents (
                        client_id, document_type, file_name, file_size, 
                        file_url, uploaded_by_admin, description
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING id
                `, [
                    clientId || null,
                    documentType || 'general',
                    file.originalname,
                    file.size,
                    s3Result.Location,
                    req.admin.id,
                    description || null
                ]);

                uploadedDocuments.push({
                    id: documentQuery.rows[0].id,
                    fileName: file.originalname,
                    fileUrl: s3Result.Location
                });
            }

            // Log activity
            await pool.query(`
                INSERT INTO admin_activities (admin_id, activity_type, description, client_id)
                VALUES ($1, 'document_upload', $2, $3)
            `, [req.admin.id, `Uploaded ${files.length} document(s)`, clientId || null]);

            res.json({
                success: true,
                message: 'Documents uploaded successfully',
                documents: uploadedDocuments
            });
        } catch (error) {
            logger.error('Error uploading documents:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to upload documents'
            });
        }
    }
);

// ============================================================================
// CRM ROUTES
// ============================================================================

// Get CRM data
app.get('/admin/crm', authenticateAdmin, requirePermission('view_crm'), async (req, res) => {
    try {
        const [leadsQuery, opportunitiesQuery, activitiesQuery] = await Promise.all([
            // Recent leads
            pool.query(`
                SELECT id, name, email, phone, source, status, created_at
                FROM leads 
                ORDER BY created_at DESC 
                LIMIT 10
            `),
            
            // Opportunities
            pool.query(`
                SELECT id, client_id, opportunity_type, value, probability, stage, created_at
                FROM opportunities 
                WHERE stage != 'closed'
                ORDER BY value DESC 
                LIMIT 10
            `),
            
            // Recent activities
            pool.query(`
                SELECT id, activity_type, description, created_at
                FROM crm_activities 
                ORDER BY created_at DESC 
                LIMIT 15
            `)
        ]);

        res.json({
            success: true,
            leads: leadsQuery.rows,
            opportunities: opportunitiesQuery.rows,
            activities: activitiesQuery.rows
        });
    } catch (error) {
        logger.error('Error fetching CRM data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch CRM data'
        });
    }
});

// ============================================================================
// REPORTS ROUTES
// ============================================================================

// Generate report
app.post('/admin/reports/generate',
    authenticateAdmin,
    requirePermission('generate_reports'),
    [
        body('type').isIn(['client-summary', 'kyc-status', 'fund-transfers', 'communications', 'portfolio-performance']),
        body('dateRange.startDate').optional().isISO8601(),
        body('dateRange.endDate').optional().isISO8601()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    details: errors.array()
                });
            }

            const { type, dateRange } = req.body;

            // Generate report based on type
            let reportData;
            switch (type) {
                case 'client-summary':
                    reportData = await generateClientSummaryReport(dateRange);
                    break;
                case 'kyc-status':
                    reportData = await generateKYCStatusReport(dateRange);
                    break;
                case 'fund-transfers':
                    reportData = await generateFundTransfersReport(dateRange);
                    break;
                case 'communications':
                    reportData = await generateCommunicationsReport(dateRange);
                    break;
                case 'portfolio-performance':
                    reportData = await generatePortfolioPerformanceReport(dateRange);
                    break;
                default:
                    throw new Error('Invalid report type');
            }

            // Log report generation
            await pool.query(`
                INSERT INTO admin_activities (admin_id, activity_type, description)
                VALUES ($1, 'report_generated', $2)
            `, [req.admin.id, `Generated ${type} report`]);

            res.json({
                success: true,
                reportData,
                generatedAt: new Date().toISOString(),
                generatedBy: req.admin.username
            });
        } catch (error) {
            logger.error('Error generating report:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to generate report'
            });
        }
    }
);

// ============================================================================
// SETTINGS ROUTES
// ============================================================================

// Get system settings
app.get('/admin/settings', authenticateAdmin, requirePermission('manage_settings'), async (req, res) => {
    try {
        const settingsQuery = await pool.query(`
            SELECT setting_key, setting_value, description
            FROM system_settings
            ORDER BY setting_key
        `);

        const settings = {};
        settingsQuery.rows.forEach(row => {
            settings[row.setting_key] = {
                value: JSON.parse(row.setting_value),
                description: row.description
            };
        });

        res.json({
            success: true,
            settings
        });
    } catch (error) {
        logger.error('Error fetching settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch settings'
        });
    }
});

// Update system settings
app.put('/admin/settings', authenticateAdmin, requirePermission('manage_settings'), async (req, res) => {
    try {
        const settings = req.body;

        for (const [key, value] of Object.entries(settings)) {
            await pool.query(`
                INSERT INTO system_settings (setting_key, setting_value, updated_by)
                VALUES ($1, $2, $3)
                ON CONFLICT (setting_key)
                DO UPDATE SET 
                    setting_value = $2,
                    updated_by = $3,
                    updated_at = NOW()
            `, [key, JSON.stringify(value), req.admin.id]);
        }

        // Log settings update
        await pool.query(`
            INSERT INTO admin_activities (admin_id, activity_type, description)
            VALUES ($1, 'settings_updated', 'System settings updated')
        `, [req.admin.id]);

        res.json({
            success: true,
            message: 'Settings updated successfully'
        });
    } catch (error) {
        logger.error('Error updating settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update settings'
        });
    }
});

// ============================================================================
// HELPER FUNCTIONS FOR REPORTS
// ============================================================================

async function generateClientSummaryReport(dateRange) {
    const query = `
        SELECT 
            COUNT(*) as total_clients,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_clients,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_clients,
            COUNT(CASE WHEN created_at >= $1 THEN 1 END) as new_clients_period
        FROM clients
        WHERE created_at <= $2
    `;
    
    const result = await pool.query(query, [dateRange.startDate, dateRange.endDate]);
    return result.rows[0];
}

async function generateKYCStatusReport(dateRange) {
    const query = `
        SELECT 
            status,
            COUNT(*) as count,
            AVG(EXTRACT(EPOCH FROM (COALESCE(reviewed_at, NOW()) - request_date))/86400) as avg_processing_days
        FROM kyc_requests
        WHERE request_date BETWEEN $1 AND $2
        GROUP BY status
    `;
    
    const result = await pool.query(query, [dateRange.startDate, dateRange.endDate]);
    return result.rows;
}

async function generateFundTransfersReport(dateRange) {
    const query = `
        SELECT 
            status,
            COUNT(*) as count,
            SUM(amount) as total_amount,
            AVG(amount) as avg_amount
        FROM fund_transfers
        WHERE request_date BETWEEN $1 AND $2
        GROUP BY status
    `;
    
    const result = await pool.query(query, [dateRange.startDate, dateRange.endDate]);
    return result.rows;
}

async function generateCommunicationsReport(dateRange) {
    const query = `
        SELECT 
            communication_type,
            status,
            COUNT(*) as count,
            AVG(EXTRACT(EPOCH FROM (COALESCE(responded_at, NOW()) - created_at))/3600) as avg_response_hours
        FROM client_communications
        WHERE created_at BETWEEN $1 AND $2
        GROUP BY communication_type, status
    `;
    
    const result = await pool.query(query, [dateRange.startDate, dateRange.endDate]);
    return result.rows;
}

async function generatePortfolioPerformanceReport(dateRange) {
    const query = `
        SELECT 
            AVG(total_value) as avg_portfolio_value,
            SUM(total_value) as total_aum,
            COUNT(*) as total_portfolios,
            AVG(performance_ytd) as avg_performance_ytd
        FROM portfolios p
        JOIN clients c ON p.client_id = c.id
        WHERE c.created_at <= $2
    `;
    
    const result = await pool.query(query, [dateRange.startDate, dateRange.endDate]);
    return result.rows[0];
}

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        code: 'NOT_FOUND'
    });
});

// Global error handler
app.use((error, req, res, next) => {
    logger.error('Unhandled error:', error);
    
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const startServer = async () => {
    try {
        // Test database connection
        await pool.query('SELECT NOW()');
        logger.info('Database connection established');

        // Connect to Redis
        await redisClient.connect();
        logger.info('Redis connection established');

        // Start server
        app.listen(CONFIG.port, () => {
            logger.info(`Alhambra Bank Internal Admin API server running on port ${CONFIG.port}`);
            logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    await pool.end();
    await redisClient.quit();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    await pool.end();
    await redisClient.quit();
    process.exit(0);
});

// Start the server
startServer();

module.exports = app;
