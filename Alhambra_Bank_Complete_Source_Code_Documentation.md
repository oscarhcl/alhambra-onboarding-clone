# Alhambra Bank & Trust - Complete Source Code & AWS Deployment Guide

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Frontend Source Code](#frontend-source-code)
3. [Backend API Integration](#backend-api-integration)
4. [Database Schema](#database-schema)
5. [Complete Workflow](#complete-workflow)
6. [AWS Deployment Guide](#aws-deployment-guide)
7. [Environment Configuration](#environment-configuration)
8. [Security Implementation](#security-implementation)
9. [Monitoring & Maintenance](#monitoring--maintenance)

## 🏦 Project Overview

### Architecture
- **Frontend**: React.js with Tailwind CSS
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL with Redis for caching
- **Authentication**: JWT with refresh tokens
- **File Storage**: AWS S3
- **Deployment**: AWS ECS with Application Load Balancer
- **CDN**: AWS CloudFront
- **Monitoring**: AWS CloudWatch

### Key Features
- Multi-language support (English, Spanish, Arabic, Chinese)
- IBOSS Portfolio Tracker integration
- Account opening workflow with Video KYC
- Real-time portfolio analytics
- Secure document management
- Professional banking services

## 🎨 Frontend Source Code

### Project Structure
```
alhambra-bank-trust/
├── public/
│   ├── index.html
│   ├── alhambra-logo.png
│   ├── ali-alsari-founder.png
│   └── assets/
├── src/
│   ├── components/
│   │   ├── Header.jsx
│   │   ├── Footer.jsx
│   │   ├── PortfolioTracker.jsx
│   │   ├── AccountOpening.jsx
│   │   └── VideoKYC.jsx
│   ├── services/
│   │   ├── api.js
│   │   ├── auth.js
│   │   └── portfolio.js
│   ├── utils/
│   │   ├── constants.js
│   │   └── helpers.js
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
├── package.json
├── vite.config.js
├── tailwind.config.js
└── Dockerfile
```

### Key Frontend Files

#### package.json
```json
{
  "name": "alhambra-bank-trust",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.0",
    "react-router-dom": "^6.8.0",
    "react-query": "^3.39.0",
    "react-hook-form": "^7.45.0",
    "react-i18next": "^13.2.0",
    "chart.js": "^4.4.0",
    "react-chartjs-2": "^5.2.0",
    "date-fns": "^2.30.0",
    "react-webcam": "^7.1.1",
    "socket.io-client": "^4.7.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.15",
    "@types/react-dom": "^18.2.7",
    "@vitejs/plugin-react": "^4.0.3",
    "autoprefixer": "^10.4.14",
    "eslint": "^8.45.0",
    "eslint-plugin-react": "^7.32.2",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.3",
    "postcss": "^8.4.24",
    "tailwindcss": "^3.3.0",
    "vite": "^4.4.5"
  }
}
```

#### vite.config.js
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['chart.js', 'react-chartjs-2']
        }
      }
    }
  }
})
```

#### src/services/api.js
```javascript
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken
        });
        
        const { token } = response.data;
        localStorage.setItem('authToken', token);
        
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

#### src/services/auth.js
```javascript
import api from './api';

export const authService = {
  // User authentication
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    const { token, refreshToken, user } = response.data;
    
    localStorage.setItem('authToken', token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    
    return response.data;
  },

  // Portfolio tracker login
  portfolioLogin: async (bankCredentials, ibossCredentials) => {
    const response = await api.post('/auth/portfolio-login', {
      bankCredentials,
      ibossCredentials
    });
    return response.data;
  },

  // Account opening
  openAccount: async (accountData) => {
    const response = await api.post('/accounts/open', accountData);
    return response.data;
  },

  // Video KYC
  initiateVideoKYC: async (accountId) => {
    const response = await api.post('/kyc/video/initiate', { accountId });
    return response.data;
  },

  // Document upload
  uploadDocument: async (file, documentType) => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('type', documentType);
    
    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }
};
```

#### src/services/portfolio.js
```javascript
import api from './api';

export const portfolioService = {
  // Get portfolio overview
  getPortfolioOverview: async () => {
    const response = await api.get('/portfolio/overview');
    return response.data;
  },

  // Get holdings
  getHoldings: async () => {
    const response = await api.get('/portfolio/holdings');
    return response.data;
  },

  // Get performance data
  getPerformance: async (period = '1Y') => {
    const response = await api.get(`/portfolio/performance?period=${period}`);
    return response.data;
  },

  // Get allocation data
  getAllocation: async () => {
    const response = await api.get('/portfolio/allocation');
    return response.data;
  },

  // Get statements
  getStatements: async (startDate, endDate) => {
    const response = await api.get('/portfolio/statements', {
      params: { startDate, endDate }
    });
    return response.data;
  },

  // Generate PDF statement
  generatePDFStatement: async (period) => {
    const response = await api.get(`/portfolio/statements/pdf?period=${period}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Share portfolio
  sharePortfolio: async (email, message) => {
    const response = await api.post('/portfolio/share', { email, message });
    return response.data;
  }
};
```

## 🔧 Backend API Integration

### Backend Project Structure
```
alhambra-bank-backend/
├── src/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── portfolioController.js
│   │   ├── accountController.js
│   │   └── kycController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── validation.js
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Account.js
│   │   ├── Portfolio.js
│   │   └── Transaction.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── portfolio.js
│   │   ├── accounts.js
│   │   └── kyc.js
│   ├── services/
│   │   ├── ibossService.js
│   │   ├── emailService.js
│   │   ├── pdfService.js
│   │   └── videoKycService.js
│   ├── utils/
│   │   ├── database.js
│   │   ├── redis.js
│   │   └── s3.js
│   ├── config/
│   │   ├── database.js
│   │   ├── redis.js
│   │   └── aws.js
│   └── app.js
├── package.json
├── Dockerfile
└── docker-compose.yml
```

### Backend package.json
```json
{
  "name": "alhambra-bank-backend",
  "version": "1.0.0",
  "description": "Alhambra Bank & Trust Backend API",
  "main": "src/app.js",
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js",
    "test": "jest",
    "migrate": "knex migrate:latest",
    "seed": "knex seed:run"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "joi": "^17.9.2",
    "pg": "^8.11.0",
    "knex": "^2.5.1",
    "redis": "^4.6.7",
    "aws-sdk": "^2.1400.0",
    "multer": "^1.4.5-lts.1",
    "multer-s3": "^3.0.1",
    "nodemailer": "^6.9.3",
    "puppeteer": "^20.7.0",
    "socket.io": "^4.7.1",
    "express-rate-limit": "^6.8.1",
    "compression": "^1.7.4",
    "morgan": "^1.10.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.6.1",
    "supertest": "^6.3.3"
  }
}
```

### src/app.js
```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const portfolioRoutes = require('./routes/portfolio');
const accountRoutes = require('./routes/accounts');
const kycRoutes = require('./routes/kyc');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/kyc', kycRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Alhambra Bank API server running on port ${PORT}`);
});

module.exports = app;
```

### src/controllers/portfolioController.js
```javascript
const portfolioService = require('../services/portfolioService');
const ibossService = require('../services/ibossService');
const pdfService = require('../services/pdfService');
const emailService = require('../services/emailService');

class PortfolioController {
  async getOverview(req, res, next) {
    try {
      const { userId } = req.user;
      const overview = await portfolioService.getPortfolioOverview(userId);
      res.json(overview);
    } catch (error) {
      next(error);
    }
  }

  async getHoldings(req, res, next) {
    try {
      const { userId } = req.user;
      const holdings = await portfolioService.getHoldings(userId);
      res.json(holdings);
    } catch (error) {
      next(error);
    }
  }

  async getPerformance(req, res, next) {
    try {
      const { userId } = req.user;
      const { period } = req.query;
      const performance = await portfolioService.getPerformance(userId, period);
      res.json(performance);
    } catch (error) {
      next(error);
    }
  }

  async getAllocation(req, res, next) {
    try {
      const { userId } = req.user;
      const allocation = await portfolioService.getAllocation(userId);
      res.json(allocation);
    } catch (error) {
      next(error);
    }
  }

  async getStatements(req, res, next) {
    try {
      const { userId } = req.user;
      const { startDate, endDate } = req.query;
      const statements = await portfolioService.getStatements(userId, startDate, endDate);
      res.json(statements);
    } catch (error) {
      next(error);
    }
  }

  async generatePDFStatement(req, res, next) {
    try {
      const { userId } = req.user;
      const { period } = req.query;
      
      const portfolioData = await portfolioService.getPortfolioData(userId, period);
      const pdfBuffer = await pdfService.generatePortfolioStatement(portfolioData);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=portfolio-statement-${period}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }

  async sharePortfolio(req, res, next) {
    try {
      const { userId } = req.user;
      const { email, message } = req.body;
      
      const portfolioData = await portfolioService.getPortfolioOverview(userId);
      await emailService.sendPortfolioShare(email, portfolioData, message);
      
      res.json({ success: true, message: 'Portfolio shared successfully' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PortfolioController();
```

### src/services/ibossService.js
```javascript
const axios = require('axios');
const xml2js = require('xml2js');

class IBOSSService {
  constructor() {
    this.baseURL = process.env.IBOSS_API_URL;
    this.apiKey = process.env.IBOSS_API_KEY;
  }

  async authenticateUser(bankCredentials, ibossCredentials) {
    try {
      // Validate bank credentials first
      const bankAuth = await this.validateBankCredentials(bankCredentials);
      if (!bankAuth.valid) {
        throw new Error('Invalid bank credentials');
      }

      // Then authenticate with IBOSS
      const ibossAuth = await this.authenticateWithIBOSS(ibossCredentials);
      if (!ibossAuth.valid) {
        throw new Error('Invalid IBOSS credentials');
      }

      return {
        valid: true,
        sessionToken: ibossAuth.sessionToken,
        userId: bankAuth.userId
      };
    } catch (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  async validateBankCredentials(credentials) {
    // Implement bank credential validation logic
    // This would typically check against your user database
    return {
      valid: credentials.username === 'bank_user' && credentials.password === 'bank_pass',
      userId: 'user123'
    };
  }

  async authenticateWithIBOSS(credentials) {
    try {
      const xmlRequest = `
        <?xml version="1.0" encoding="UTF-8"?>
        <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <Authenticate>
              <Username>${credentials.username}</Username>
              <Password>${credentials.password}</Password>
            </Authenticate>
          </soap:Body>
        </soap:Envelope>
      `;

      const response = await axios.post(`${this.baseURL}/authenticate`, xmlRequest, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'Authenticate'
        }
      });

      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(response.data);
      
      return {
        valid: true,
        sessionToken: result.sessionToken || 'mock-session-token'
      };
    } catch (error) {
      return { valid: false };
    }
  }

  async getPortfolioData(sessionToken, userId) {
    try {
      // Mock portfolio data - replace with actual IBOSS API calls
      return {
        totalEquity: 125750.50,
        dayPL: 2150.25,
        dayPLPercent: 1.74,
        cashBalance: 15250.75,
        buyingPower: 45000,
        holdings: [
          {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            shares: 150,
            price: 175.50,
            value: 26325,
            dayPL: 1250.75,
            dayPLPercent: 4.98
          },
          {
            symbol: 'GOOGL',
            name: 'Alphabet Inc.',
            shares: 75,
            price: 142.30,
            value: 10672.50,
            dayPL: -325.25,
            dayPLPercent: -2.95
          },
          {
            symbol: 'MSFT',
            name: 'Microsoft Corporation',
            shares: 200,
            price: 378.85,
            value: 75770,
            dayPL: 2150.50,
            dayPLPercent: 2.92
          }
        ],
        performance: {
          daily: { return: 1.74, value: 2150.25 },
          weekly: { return: 3.8, value: 4725.50 },
          monthly: { return: 5.2, value: 6425.75 },
          quarterly: { return: 8.7, value: 10875.25 },
          yearly: { return: 15.8, value: 19650.50 },
          threeYear: { return: 42.5, value: 52875.75 },
          fiveYear: { return: 85.2, value: 106250.25 }
        }
      };
    } catch (error) {
      throw new Error(`Failed to fetch portfolio data: ${error.message}`);
    }
  }
}

module.exports = new IBOSSService();
```

## 🗄️ Database Schema

### PostgreSQL Schema
```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    country VARCHAR(2),
    language VARCHAR(5) DEFAULT 'en',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Accounts table
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    account_number VARCHAR(20) UNIQUE NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    balance DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    opened_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portfolio table
CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    account_id UUID REFERENCES accounts(id),
    iboss_account_id VARCHAR(50),
    total_value DECIMAL(15,2),
    cash_balance DECIMAL(15,2),
    buying_power DECIMAL(15,2),
    day_pl DECIMAL(15,2),
    day_pl_percent DECIMAL(5,2),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Holdings table
CREATE TABLE holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID REFERENCES portfolios(id),
    symbol VARCHAR(10) NOT NULL,
    name VARCHAR(255),
    shares DECIMAL(15,4),
    price DECIMAL(10,2),
    value DECIMAL(15,2),
    day_pl DECIMAL(15,2),
    day_pl_percent DECIMAL(5,2),
    sector VARCHAR(100),
    country VARCHAR(2),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES accounts(id),
    type VARCHAR(20) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    reference_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- KYC documents table
CREATE TABLE kyc_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    document_type VARCHAR(50) NOT NULL,
    file_path VARCHAR(500),
    file_name VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP
);

-- Video KYC sessions table
CREATE TABLE video_kyc_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    session_token VARCHAR(255),
    status VARCHAR(20) DEFAULT 'scheduled',
    scheduled_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    agent_id UUID,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX idx_holdings_portfolio_id ON holdings(portfolio_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_kyc_documents_user_id ON kyc_documents(user_id);
```

## 🔄 Complete Workflow

### 1. User Registration & Authentication Flow
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant D as Database
    participant E as Email Service

    U->>F: Register/Login
    F->>B: POST /api/auth/register
    B->>D: Create user record
    B->>E: Send verification email
    B->>F: Return JWT token
    F->>U: Redirect to dashboard
```

### 2. Portfolio Tracker Integration Flow
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant I as IBOSS API
    participant D as Database

    U->>F: Enter credentials
    F->>B: POST /api/auth/portfolio-login
    B->>B: Validate bank credentials
    B->>I: Authenticate with IBOSS
    I->>B: Return session token
    B->>I: Fetch portfolio data
    I->>B: Return portfolio data
    B->>D: Cache portfolio data
    B->>F: Return portfolio data
    F->>U: Display portfolio dashboard
```

### 3. Account Opening Workflow
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant S as S3 Storage
    participant V as Video KYC Service
    participant D as Database

    U->>F: Start account opening
    F->>B: POST /api/accounts/open
    B->>D: Create account record
    U->>F: Upload documents
    F->>B: POST /api/documents/upload
    B->>S: Store documents
    U->>F: Schedule Video KYC
    F->>B: POST /api/kyc/video/schedule
    B->>V: Create KYC session
    B->>D: Update account status
    B->>F: Return account details
```

## ☁️ AWS Deployment Guide

### 1. Infrastructure Setup

#### AWS Services Required
- **ECS (Elastic Container Service)**: Container orchestration
- **RDS (PostgreSQL)**: Database
- **ElastiCache (Redis)**: Caching
- **S3**: File storage
- **CloudFront**: CDN
- **Application Load Balancer**: Load balancing
- **Route 53**: DNS management
- **CloudWatch**: Monitoring
- **IAM**: Access management

#### Terraform Configuration
```hcl
# terraform/main.tf
provider "aws" {
  region = var.aws_region
}

# VPC Configuration
resource "aws_vpc" "alhambra_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "alhambra-vpc"
  }
}

# Subnets
resource "aws_subnet" "public_subnet_1" {
  vpc_id                  = aws_vpc.alhambra_vpc.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = {
    Name = "alhambra-public-subnet-1"
  }
}

resource "aws_subnet" "public_subnet_2" {
  vpc_id                  = aws_vpc.alhambra_vpc.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "${var.aws_region}b"
  map_public_ip_on_launch = true

  tags = {
    Name = "alhambra-public-subnet-2"
  }
}

resource "aws_subnet" "private_subnet_1" {
  vpc_id            = aws_vpc.alhambra_vpc.id
  cidr_block        = "10.0.3.0/24"
  availability_zone = "${var.aws_region}a"

  tags = {
    Name = "alhambra-private-subnet-1"
  }
}

resource "aws_subnet" "private_subnet_2" {
  vpc_id            = aws_vpc.alhambra_vpc.id
  cidr_block        = "10.0.4.0/24"
  availability_zone = "${var.aws_region}b"

  tags = {
    Name = "alhambra-private-subnet-2"
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "alhambra_db" {
  identifier     = "alhambra-db"
  engine         = "postgres"
  engine_version = "14.9"
  instance_class = "db.t3.micro"
  
  allocated_storage     = 20
  max_allocated_storage = 100
  storage_type          = "gp2"
  storage_encrypted     = true
  
  db_name  = "alhambra_bank"
  username = var.db_username
  password = var.db_password
  
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.alhambra_db_subnet_group.name
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = true
  deletion_protection = false

  tags = {
    Name = "alhambra-db"
  }
}

# ElastiCache Redis
resource "aws_elasticache_subnet_group" "alhambra_cache_subnet_group" {
  name       = "alhambra-cache-subnet-group"
  subnet_ids = [aws_subnet.private_subnet_1.id, aws_subnet.private_subnet_2.id]
}

resource "aws_elasticache_cluster" "alhambra_redis" {
  cluster_id           = "alhambra-redis"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.alhambra_cache_subnet_group.name
  security_group_ids   = [aws_security_group.redis_sg.id]
}

# S3 Bucket
resource "aws_s3_bucket" "alhambra_storage" {
  bucket = "alhambra-bank-storage-${random_string.bucket_suffix.result}"
}

resource "aws_s3_bucket_versioning" "alhambra_storage_versioning" {
  bucket = aws_s3_bucket.alhambra_storage.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "alhambra_storage_encryption" {
  bucket = aws_s3_bucket.alhambra_storage.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "alhambra_cluster" {
  name = "alhambra-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# Application Load Balancer
resource "aws_lb" "alhambra_alb" {
  name               = "alhambra-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb_sg.id]
  subnets            = [aws_subnet.public_subnet_1.id, aws_subnet.public_subnet_2.id]

  enable_deletion_protection = false

  tags = {
    Name = "alhambra-alb"
  }
}
```

### 2. Docker Configuration

#### Frontend Dockerfile
```dockerfile
# Dockerfile.frontend
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Backend Dockerfile
```dockerfile
# Dockerfile.backend
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 5000

CMD ["node", "src/app.js"]
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    environment:
      - REACT_APP_API_URL=http://backend:5000/api
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://username:password@db:5432/alhambra_bank
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=your-jwt-secret
      - AWS_REGION=us-east-1
      - S3_BUCKET=alhambra-bank-storage
    depends_on:
      - db
      - redis

  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=alhambra_bank
      - POSTGRES_USER=username
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 3. ECS Task Definitions

#### Frontend Task Definition
```json
{
  "family": "alhambra-frontend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "alhambra-frontend",
      "image": "ACCOUNT.dkr.ecr.REGION.amazonaws.com/alhambra-frontend:latest",
      "portMappings": [
        {
          "containerPort": 80,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/alhambra-frontend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### Backend Task Definition
```json
{
  "family": "alhambra-backend",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::ACCOUNT:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "alhambra-backend",
      "image": "ACCOUNT.dkr.ecr.REGION.amazonaws.com/alhambra-backend:latest",
      "portMappings": [
        {
          "containerPort": 5000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "DATABASE_URL",
          "value": "postgresql://username:password@alhambra-db.region.rds.amazonaws.com:5432/alhambra_bank"
        },
        {
          "name": "REDIS_URL",
          "value": "redis://alhambra-redis.cache.amazonaws.com:6379"
        }
      ],
      "secrets": [
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:alhambra/jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/alhambra-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### 4. Deployment Scripts

#### deploy.sh
```bash
#!/bin/bash

set -e

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="123456789012"
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
CLUSTER_NAME="alhambra-cluster"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Alhambra Bank deployment...${NC}"

# Login to ECR
echo -e "${YELLOW}Logging in to ECR...${NC}"
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}

# Build and push frontend
echo -e "${YELLOW}Building and pushing frontend...${NC}"
cd frontend
docker build -t alhambra-frontend .
docker tag alhambra-frontend:latest ${ECR_REGISTRY}/alhambra-frontend:latest
docker push ${ECR_REGISTRY}/alhambra-frontend:latest
cd ..

# Build and push backend
echo -e "${YELLOW}Building and pushing backend...${NC}"
cd backend
docker build -t alhambra-backend .
docker tag alhambra-backend:latest ${ECR_REGISTRY}/alhambra-backend:latest
docker push ${ECR_REGISTRY}/alhambra-backend:latest
cd ..

# Update ECS services
echo -e "${YELLOW}Updating ECS services...${NC}"
aws ecs update-service --cluster ${CLUSTER_NAME} --service alhambra-frontend-service --force-new-deployment
aws ecs update-service --cluster ${CLUSTER_NAME} --service alhambra-backend-service --force-new-deployment

# Wait for deployment to complete
echo -e "${YELLOW}Waiting for deployment to complete...${NC}"
aws ecs wait services-stable --cluster ${CLUSTER_NAME} --services alhambra-frontend-service alhambra-backend-service

echo -e "${GREEN}Deployment completed successfully!${NC}"

# Get load balancer URL
ALB_DNS=$(aws elbv2 describe-load-balancers --names alhambra-alb --query 'LoadBalancers[0].DNSName' --output text)
echo -e "${GREEN}Application is available at: http://${ALB_DNS}${NC}"
```

## 🔧 Environment Configuration

### Frontend Environment Variables
```bash
# .env.production
REACT_APP_API_URL=https://api.alhambrabank.com
REACT_APP_ENVIRONMENT=production
REACT_APP_VERSION=1.0.0
REACT_APP_SENTRY_DSN=your-sentry-dsn
REACT_APP_GOOGLE_ANALYTICS_ID=your-ga-id
```

### Backend Environment Variables
```bash
# .env.production
NODE_ENV=production
PORT=5000

# Database
DATABASE_URL=postgresql://username:password@alhambra-db.region.rds.amazonaws.com:5432/alhambra_bank
REDIS_URL=redis://alhambra-redis.cache.amazonaws.com:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h
REFRESH_TOKEN_EXPIRES_IN=7d

# AWS
AWS_REGION=us-east-1
S3_BUCKET=alhambra-bank-storage
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key

# IBOSS Integration
IBOSS_API_URL=https://api.iboss.com
IBOSS_API_KEY=your-iboss-api-key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@alhambrabank.com
SMTP_PASS=your-email-password

# Video KYC
VIDEO_KYC_API_URL=https://api.videokyc.com
VIDEO_KYC_API_KEY=your-video-kyc-key

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

## 🔒 Security Implementation

### 1. Authentication & Authorization
```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'Invalid or inactive user' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

module.exports = { authenticateToken, authorizeRoles };
```

### 2. Input Validation
```javascript
// middleware/validation.js
const Joi = require('joi');

const validatePortfolioLogin = (req, res, next) => {
  const schema = Joi.object({
    bankCredentials: Joi.object({
      username: Joi.string().alphanum().min(3).max(30).required(),
      password: Joi.string().min(6).required()
    }).required(),
    ibossCredentials: Joi.object({
      username: Joi.string().alphanum().min(3).max(30).required(),
      password: Joi.string().min(6).required()
    }).required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

module.exports = { validatePortfolioLogin };
```

### 3. Rate Limiting & Security Headers
```javascript
// Security configuration in app.js
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts'
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.iboss.com"]
    }
  }
}));
```

## 📊 Monitoring & Maintenance

### 1. CloudWatch Configuration
```javascript
// utils/logger.js
const winston = require('winston');
const CloudWatchTransport = require('winston-cloudwatch');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new CloudWatchTransport({
      logGroupName: '/aws/ecs/alhambra-backend',
      logStreamName: 'application-logs',
      awsRegion: process.env.AWS_REGION
    })
  ]
});

module.exports = logger;
```

### 2. Health Checks
```javascript
// routes/health.js
const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const redis = require('../utils/redis');

router.get('/health', async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {}
  };

  try {
    // Check database
    await db.raw('SELECT 1');
    health.services.database = 'OK';
  } catch (error) {
    health.services.database = 'ERROR';
    health.status = 'ERROR';
  }

  try {
    // Check Redis
    await redis.ping();
    health.services.redis = 'OK';
  } catch (error) {
    health.services.redis = 'ERROR';
    health.status = 'ERROR';
  }

  const statusCode = health.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(health);
});

module.exports = router;
```

### 3. Performance Monitoring
```javascript
// middleware/metrics.js
const prometheus = require('prom-client');

// Create metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestTotal = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const labels = {
      method: req.method,
      route: req.route?.path || req.path,
      status_code: res.statusCode
    };
    
    httpRequestDuration.observe(labels, duration);
    httpRequestTotal.inc(labels);
  });
  
  next();
};

module.exports = { metricsMiddleware, register: prometheus.register };
```

## 🚀 Deployment Commands

### Initial Setup
```bash
# 1. Clone repository
git clone https://github.com/alhambrabank/alhambra-bank-trust.git
cd alhambra-bank-trust

# 2. Install dependencies
cd frontend && npm install && cd ..
cd backend && npm install && cd ..

# 3. Set up environment variables
cp frontend/.env.example frontend/.env.production
cp backend/.env.example backend/.env.production

# 4. Initialize Terraform
cd terraform
terraform init
terraform plan
terraform apply

# 5. Create ECR repositories
aws ecr create-repository --repository-name alhambra-frontend
aws ecr create-repository --repository-name alhambra-backend

# 6. Deploy application
./deploy.sh
```

### Continuous Deployment
```bash
# Update application
git pull origin main
./deploy.sh

# Rollback if needed
aws ecs update-service --cluster alhambra-cluster --service alhambra-backend-service --task-definition alhambra-backend:PREVIOUS_REVISION
```

This comprehensive documentation provides everything needed to build, deploy, and maintain the Alhambra Bank & Trust application on AWS with full frontend-backend integration.
