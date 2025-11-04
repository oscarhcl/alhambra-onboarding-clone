# IBOSS Portfolio Tracker Database Integration Documentation

## Overview

This document provides comprehensive documentation for the enhanced IBOSS Portfolio Tracker with full database integration for Alhambra Bank & Trust. The system now includes real-time data persistence, comprehensive API field mappings based on the IBOSS evaluation file, and support for both MySQL and PostgreSQL databases.

## Architecture

### System Components

1. **Frontend**: React-based portfolio tracker with real-time updates
2. **Backend API**: Node.js/Express server with comprehensive IBOSS integration
3. **Database**: MySQL/PostgreSQL with optimized schema for portfolio data
4. **IBOSS Integration**: Complete API field mapping based on evaluation file
5. **Authentication**: JWT-based secure authentication system
6. **Caching**: Redis integration for performance optimization

### Database Schema

The database schema includes 12 main tables designed to store all IBOSS API data:

#### Core Tables

1. **users** - User authentication and profile information
2. **account_info** - IBOSS GetAccountInfo API data storage
3. **account_balance** - IBOSS GetAccountBalance API data storage
4. **account_commission** - IBOSS GetAccountCommission API data storage
5. **portfolio_holdings** - Individual security holdings and positions
6. **portfolio_performance** - Performance metrics across different time periods
7. **risk_metrics** - Risk analysis and portfolio assessment metrics
8. **transaction_history** - Complete transaction history and trade records
9. **portfolio_allocation** - Portfolio allocation breakdown by categories
10. **iboss_api_log** - API call logging for debugging and monitoring
11. **market_data** - Market data and benchmark information
12. **portfolio_alerts** - Portfolio alerts and notifications system

## IBOSS API Field Mappings

Based on the evaluation file analysis, the system implements comprehensive field mappings for three main IBOSS API operations:

### GetAccountInfo Fields
- `account_number` → `Account` (string, available)
- `account_name` → `AccountName` (string, available)
- `main_account` → `MainAccount` (string, available)
- `account_type` → `AccountType` (int, available)
- `account_enabled` → `AccountEnable` (int, available)

### GetAccountBalance Fields
- `total_equity` → `TotalEquity` (double, available)
- `cash_balance` → `CashBalance` (double, available)
- `long_market_value` → `LongMarketValue` (double, available)
- `short_market_value` → `ShortMarketValue` (double, available)
- `day_buying_power` → `DBP` (double, available)
- `overnight_buying_power` → `OBP` (double, available)
- `currency` → `Currency` (string, available)
- `as_of_date` → `DateAsof` (string, available)

### GetAccountCommission Fields
- `per_ticket` → `PerTicket` (double, available)
- `per_share` → `PerShare` (double, available)
- `per_principal` → `PerPrincipal` (double, available)
- `per_option` → `PerOption` (double, available)
- `per_contract` → `PerContract` (double, available)

### Calculated Fields
- `net_liquidation_value` - Calculated from TotalEquity
- `equity_with_loan_value` - TotalEquity + CashBalance
- `available_funds` - CashBalance (if positive)
- `excess_liquidity` - DBP - used_buying_power
- `cash_allocation_percent` - (CashBalance / TotalEquity) * 100
- `equity_allocation_percent` - ((LongMarketValue - ShortMarketValue) / TotalEquity) * 100

## Installation and Setup

### Prerequisites

- Node.js 16+ and npm 8+
- MySQL 8.0+ or PostgreSQL 12+
- Redis (optional, for caching)

### Database Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Setup Database**
   ```bash
   node database_setup.js
   ```

4. **Start the API Server**
   ```bash
   npm start
   # or for development
   npm run dev
   ```

### Environment Configuration

Key environment variables:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=alhambra_bank

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key

# IBOSS API Configuration
IBOSS_API_URL=https://api.iboss.com/v1
IBOSS_API_KEY=your-iboss-api-key
```

## API Endpoints

### Authentication

- `POST /api/auth/login` - User login with bank and IBOSS credentials
- `POST /api/auth/register` - Register new user

### Portfolio Data

- `GET /api/portfolio/summary` - Get portfolio summary
- `GET /api/portfolio/holdings` - Get current holdings
- `GET /api/portfolio/performance` - Get performance metrics
- `GET /api/portfolio/risk` - Get risk analysis
- `POST /api/portfolio/refresh` - Refresh portfolio data from IBOSS

### System

- `GET /api/health` - Health check endpoint

## Frontend Integration

The React frontend component (`DatabaseIntegratedPortfolioTracker`) provides:

### Features

1. **Secure Authentication** - JWT-based login with bank and IBOSS credentials
2. **Real-time Data** - Live portfolio data from database
3. **Comprehensive Metrics** - All IBOSS fields displayed with calculations
4. **Performance Analytics** - Multi-period performance analysis
5. **Risk Assessment** - Complete risk metrics dashboard
6. **Holdings Management** - Detailed holdings view with real-time updates
7. **Auto-refresh** - Configurable data refresh intervals

### Usage

```jsx
import DatabaseIntegratedPortfolioTracker from './database_integrated_portfolio_tracker';

function App() {
  return (
    <div className="App">
      <DatabaseIntegratedPortfolioTracker />
    </div>
  );
}
```

## Database Performance Optimization

### Indexes

The system includes optimized indexes for:

- User lookups by username
- Portfolio data by user and date
- Holdings by symbol and date
- Transaction history by date
- API logs by operation and timestamp

### Caching Strategy

- Redis caching for frequently accessed data
- API response caching with configurable TTL
- Database query result caching
- Real-time data refresh with cache invalidation

## Security Features

### Authentication & Authorization

- JWT-based authentication with configurable expiration
- Bcrypt password hashing with configurable rounds
- Rate limiting on API endpoints
- CORS configuration for cross-origin requests

### Data Protection

- SQL injection prevention with parameterized queries
- Input validation and sanitization
- Secure password storage
- API key encryption
- Audit logging for all API calls

## Monitoring and Logging

### API Logging

All IBOSS API calls are logged with:

- Request/response data
- Execution time
- Error messages
- User context
- Timestamp information

### Performance Monitoring

- Database query performance tracking
- API response time monitoring
- Error rate tracking
- User activity logging

## Error Handling

### Database Errors

- Connection pool management
- Automatic retry logic
- Graceful degradation
- Error logging and alerting

### API Errors

- IBOSS API timeout handling
- Rate limit management
- Authentication error handling
- Data validation errors

## Deployment

### Production Configuration

1. **Environment Setup**
   ```env
   NODE_ENV=production
   DEBUG=false
   JWT_SECRET=production-secret-key
   ```

2. **Database Optimization**
   - Connection pooling configuration
   - Index optimization
   - Query performance tuning

3. **Security Hardening**
   - HTTPS enforcement
   - Security headers
   - Rate limiting
   - Input validation

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

## Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:integration
```

### API Testing

```bash
# Health check
curl http://localhost:3001/api/health

# Login test
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"bankUsername":"demo_user","bankPassword":"demo_pass","ibossUsername":"iboss_demo","ibossPassword":"iboss_pass"}'
```

## Maintenance

### Database Maintenance

- Regular backup procedures
- Index maintenance
- Performance monitoring
- Data archiving strategies

### API Maintenance

- Log rotation
- Cache cleanup
- Performance optimization
- Security updates

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check database credentials
   - Verify database server status
   - Check network connectivity

2. **IBOSS API Errors**
   - Verify API credentials
   - Check API endpoint availability
   - Review rate limiting

3. **Authentication Issues**
   - Verify JWT secret configuration
   - Check token expiration
   - Review user credentials

### Debug Mode

Enable debug logging:

```env
DEBUG=true
LOG_LEVEL=debug
```

## Support and Documentation

### Additional Resources

- IBOSS API Documentation
- Database Schema Diagrams
- API Endpoint Documentation
- Frontend Component Documentation

### Contact Information

For technical support or questions:
- Email: tech-support@alhambrabank.ky
- Documentation: https://docs.alhambrabank.ky
- GitHub: https://github.com/alhambra-bank/iboss-portfolio-tracker

---

## Conclusion

The enhanced IBOSS Portfolio Tracker with database integration provides a comprehensive, scalable, and secure solution for portfolio management at Alhambra Bank & Trust. The system leverages all available IBOSS API fields, provides real-time data persistence, and offers a modern, responsive user interface for portfolio analytics and management.

The database-first approach ensures data integrity, performance, and scalability while maintaining the flexibility to adapt to future IBOSS API changes and business requirements.
