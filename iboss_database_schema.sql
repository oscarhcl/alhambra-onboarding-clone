-- IBOSS Portfolio Tracker Database Schema
-- Compatible with both PostgreSQL and MySQL
-- Based on IBOSS API field mappings from evaluation file

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    bank_username VARCHAR(100),
    iboss_username VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Account Information table (GetAccountInfo API)
CREATE TABLE IF NOT EXISTS account_info (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    main_account VARCHAR(100),
    account_type INT NOT NULL,
    account_enabled INT DEFAULT 1,
    currency VARCHAR(10) DEFAULT 'USD',
    as_of_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_account (user_id, account_number),
    INDEX idx_as_of_date (as_of_date)
);

-- Account Balance table (GetAccountBalance API)
CREATE TABLE IF NOT EXISTS account_balance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    total_equity DECIMAL(15,2) NOT NULL,
    cash_balance DECIMAL(15,2) NOT NULL,
    long_market_value DECIMAL(15,2) DEFAULT 0,
    short_market_value DECIMAL(15,2) DEFAULT 0,
    day_buying_power DECIMAL(15,2) DEFAULT 0,
    overnight_buying_power DECIMAL(15,2) DEFAULT 0,
    net_liquidation_value DECIMAL(15,2) NOT NULL,
    equity_with_loan_value DECIMAL(15,2) NOT NULL,
    available_funds DECIMAL(15,2) DEFAULT 0,
    excess_liquidity DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'USD',
    as_of_date DATE NOT NULL,
    last_updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_balance (user_id, account_number),
    INDEX idx_as_of_date (as_of_date),
    INDEX idx_last_updated (last_updated_date)
);

-- Commission and Fees table (GetAccountCommission API)
CREATE TABLE IF NOT EXISTS account_commission (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    per_ticket DECIMAL(10,4) DEFAULT 0,
    per_share DECIMAL(10,6) DEFAULT 0,
    per_principal DECIMAL(10,6) DEFAULT 0,
    per_option DECIMAL(10,4) DEFAULT 0,
    per_contract DECIMAL(10,4) DEFAULT 0,
    min_option_commission DECIMAL(10,4) DEFAULT 0,
    min_per_trade DECIMAL(10,4) DEFAULT 0,
    max_per_trade DECIMAL(10,4) DEFAULT 0,
    min_share_trades DECIMAL(10,4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_commission (user_id, account_number)
);

-- Portfolio Holdings table
CREATE TABLE IF NOT EXISTS portfolio_holdings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    company_name VARCHAR(255),
    shares DECIMAL(15,4) NOT NULL,
    average_cost DECIMAL(15,4) DEFAULT 0,
    current_price DECIMAL(15,4) NOT NULL,
    market_value DECIMAL(15,2) NOT NULL,
    unrealized_pnl DECIMAL(15,2) DEFAULT 0,
    realized_pnl DECIMAL(15,2) DEFAULT 0,
    day_change DECIMAL(15,4) DEFAULT 0,
    day_change_percent DECIMAL(8,4) DEFAULT 0,
    allocation_percent DECIMAL(8,4) DEFAULT 0,
    sector VARCHAR(100),
    asset_type VARCHAR(50) DEFAULT 'STOCK',
    as_of_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_holdings (user_id, account_number),
    INDEX idx_symbol (symbol),
    INDEX idx_as_of_date (as_of_date),
    UNIQUE KEY unique_user_symbol_date (user_id, account_number, symbol, as_of_date)
);

-- Portfolio Performance table
CREATE TABLE IF NOT EXISTS portfolio_performance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'three_year', 'five_year'
    return_percent DECIMAL(8,4) NOT NULL,
    return_amount DECIMAL(15,2) NOT NULL,
    benchmark_return DECIMAL(8,4) DEFAULT 0,
    alpha DECIMAL(8,4) DEFAULT 0,
    beta DECIMAL(8,4) DEFAULT 0,
    sharpe_ratio DECIMAL(8,4) DEFAULT 0,
    volatility DECIMAL(8,4) DEFAULT 0,
    max_drawdown DECIMAL(8,4) DEFAULT 0,
    as_of_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_performance (user_id, account_number),
    INDEX idx_period_type (period_type),
    INDEX idx_as_of_date (as_of_date),
    UNIQUE KEY unique_user_period_date (user_id, account_number, period_type, as_of_date)
);

-- Risk Metrics table
CREATE TABLE IF NOT EXISTS risk_metrics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    beta DECIMAL(8,4) DEFAULT 0,
    sharpe_ratio DECIMAL(8,4) DEFAULT 0,
    volatility DECIMAL(8,4) DEFAULT 0,
    max_drawdown DECIMAL(8,4) DEFAULT 0,
    var_95 DECIMAL(15,2) DEFAULT 0,
    var_99 DECIMAL(15,2) DEFAULT 0,
    risk_score DECIMAL(4,2) DEFAULT 0,
    correlation_sp500 DECIMAL(8,4) DEFAULT 0,
    tracking_error DECIMAL(8,4) DEFAULT 0,
    information_ratio DECIMAL(8,4) DEFAULT 0,
    sortino_ratio DECIMAL(8,4) DEFAULT 0,
    as_of_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_risk (user_id, account_number),
    INDEX idx_as_of_date (as_of_date),
    UNIQUE KEY unique_user_risk_date (user_id, account_number, as_of_date)
);

-- Transaction History table
CREATE TABLE IF NOT EXISTS transaction_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    symbol VARCHAR(20),
    transaction_type VARCHAR(20) NOT NULL, -- 'BUY', 'SELL', 'DIVIDEND', 'DEPOSIT', 'WITHDRAWAL'
    quantity DECIMAL(15,4) DEFAULT 0,
    price DECIMAL(15,4) DEFAULT 0,
    amount DECIMAL(15,2) NOT NULL,
    commission DECIMAL(10,4) DEFAULT 0,
    fees DECIMAL(10,4) DEFAULT 0,
    net_amount DECIMAL(15,2) NOT NULL,
    settlement_date DATE,
    trade_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_transactions (user_id, account_number),
    INDEX idx_symbol (symbol),
    INDEX idx_trade_date (trade_date),
    INDEX idx_transaction_type (transaction_type)
);

-- Portfolio Allocation table
CREATE TABLE IF NOT EXISTS portfolio_allocation (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    allocation_type VARCHAR(50) NOT NULL, -- 'sector', 'asset_class', 'geography', 'market_cap'
    allocation_name VARCHAR(100) NOT NULL,
    allocation_percent DECIMAL(8,4) NOT NULL,
    market_value DECIMAL(15,2) NOT NULL,
    target_percent DECIMAL(8,4) DEFAULT 0,
    deviation_percent DECIMAL(8,4) DEFAULT 0,
    as_of_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_allocation (user_id, account_number),
    INDEX idx_allocation_type (allocation_type),
    INDEX idx_as_of_date (as_of_date),
    UNIQUE KEY unique_user_allocation_date (user_id, account_number, allocation_type, allocation_name, as_of_date)
);

-- IBOSS API Log table for tracking API calls
CREATE TABLE IF NOT EXISTS iboss_api_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    api_operation VARCHAR(50) NOT NULL, -- 'GetAccountInfo', 'GetAccountBalance', 'GetAccountCommission'
    request_data TEXT,
    response_data TEXT,
    status_code INT DEFAULT 200,
    error_message TEXT,
    execution_time_ms INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_api_log (user_id),
    INDEX idx_api_operation (api_operation),
    INDEX idx_created_at (created_at)
);

-- Market Data table for benchmarks and market information
CREATE TABLE IF NOT EXISTS market_data (
    id INT PRIMARY KEY AUTO_INCREMENT,
    symbol VARCHAR(20) NOT NULL,
    data_type VARCHAR(50) NOT NULL, -- 'price', 'benchmark', 'sector_performance'
    value DECIMAL(15,4) NOT NULL,
    change_amount DECIMAL(15,4) DEFAULT 0,
    change_percent DECIMAL(8,4) DEFAULT 0,
    volume BIGINT DEFAULT 0,
    market_cap BIGINT DEFAULT 0,
    as_of_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_symbol (symbol),
    INDEX idx_data_type (data_type),
    INDEX idx_as_of_date (as_of_date),
    UNIQUE KEY unique_symbol_type_date (symbol, data_type, as_of_date)
);

-- User Preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    preference_key VARCHAR(100) NOT NULL,
    preference_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_preferences (user_id),
    UNIQUE KEY unique_user_preference (user_id, preference_key)
);

-- Alerts and Notifications table
CREATE TABLE IF NOT EXISTS portfolio_alerts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    alert_type VARCHAR(50) NOT NULL, -- 'price_change', 'portfolio_value', 'risk_threshold'
    symbol VARCHAR(20),
    threshold_value DECIMAL(15,4),
    current_value DECIMAL(15,4),
    alert_message TEXT NOT NULL,
    is_triggered BOOLEAN DEFAULT FALSE,
    is_read BOOLEAN DEFAULT FALSE,
    triggered_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_alerts (user_id),
    INDEX idx_alert_type (alert_type),
    INDEX idx_triggered (is_triggered),
    INDEX idx_created_at (created_at)
);

-- Insert sample data for testing
INSERT INTO users (username, email, password_hash, bank_username, iboss_username) VALUES
('demo_user', 'demo@alhambrabank.ky', '$2b$10$example_hash', 'bank_user', 'iboss_user'),
('test_user', 'test@alhambrabank.ky', '$2b$10$example_hash2', 'test_bank', 'test_iboss');

-- Insert sample account info
INSERT INTO account_info (user_id, account_number, account_name, main_account, account_type, account_enabled, currency, as_of_date) VALUES
(1, 'DEMO123456', 'Alhambra Investment Account', 'MAIN_DEMO', 1, 1, 'USD', CURDATE()),
(2, 'TEST789012', 'Test Investment Account', 'MAIN_TEST', 1, 1, 'USD', CURDATE());

-- Insert sample balance data
INSERT INTO account_balance (user_id, account_number, total_equity, cash_balance, long_market_value, short_market_value, day_buying_power, overnight_buying_power, net_liquidation_value, equity_with_loan_value, available_funds, excess_liquidity, currency, as_of_date) VALUES
(1, 'DEMO123456', 125750.50, 15250.75, 110500.25, 0, 45000.00, 42500.00, 125750.50, 141001.25, 15250.75, 20000.00, 'USD', CURDATE()),
(2, 'TEST789012', 85000.00, 10000.00, 75000.00, 0, 30000.00, 28000.00, 85000.00, 95000.00, 10000.00, 15000.00, 'USD', CURDATE());

-- Insert sample commission data
INSERT INTO account_commission (user_id, account_number, per_ticket, per_share, per_principal, per_option, per_contract, min_option_commission, min_per_trade, max_per_trade, min_share_trades) VALUES
(1, 'DEMO123456', 4.95, 0.005, 0.0025, 0.65, 1.25, 0.50, 1.00, 50.00, 1.00),
(2, 'TEST789012', 4.95, 0.005, 0.0025, 0.65, 1.25, 0.50, 1.00, 50.00, 1.00);

-- Insert sample holdings
INSERT INTO portfolio_holdings (user_id, account_number, symbol, company_name, shares, average_cost, current_price, market_value, unrealized_pnl, day_change, day_change_percent, allocation_percent, sector, asset_type, as_of_date) VALUES
(1, 'DEMO123456', 'AAPL', 'Apple Inc.', 50, 170.00, 175.25, 8762.50, 262.50, 2.15, 1.24, 6.97, 'Technology', 'STOCK', CURDATE()),
(1, 'DEMO123456', 'MSFT', 'Microsoft Corp.', 75, 330.00, 335.50, 25162.50, 412.50, -1.25, -0.37, 20.01, 'Technology', 'STOCK', CURDATE()),
(1, 'DEMO123456', 'GOOGL', 'Alphabet Inc.', 25, 140.00, 142.75, 3568.75, 68.75, 3.50, 2.51, 2.84, 'Technology', 'STOCK', CURDATE()),
(1, 'DEMO123456', 'AMZN', 'Amazon.com Inc.', 40, 142.00, 145.80, 5832.00, 152.00, 0.95, 0.66, 4.64, 'Consumer Discretionary', 'STOCK', CURDATE()),
(1, 'DEMO123456', 'TSLA', 'Tesla Inc.', 30, 250.00, 245.60, 7368.00, -132.00, -5.20, -2.07, 5.86, 'Consumer Discretionary', 'STOCK', CURDATE()),
(1, 'DEMO123456', 'NVDA', 'NVIDIA Corp.', 20, 850.00, 875.25, 17505.00, 505.00, 12.75, 1.48, 13.92, 'Technology', 'STOCK', CURDATE()),
(1, 'DEMO123456', 'META', 'Meta Platforms', 35, 470.00, 485.30, 16985.50, 535.50, 8.45, 1.77, 13.51, 'Technology', 'STOCK', CURDATE()),
(1, 'DEMO123456', 'BRK.B', 'Berkshire Hathaway', 60, 420.00, 425.75, 25545.00, 345.00, 2.30, 0.54, 20.32, 'Financial Services', 'STOCK', CURDATE());

-- Insert sample performance data
INSERT INTO portfolio_performance (user_id, account_number, period_type, return_percent, return_amount, benchmark_return, alpha, beta, sharpe_ratio, volatility, max_drawdown, as_of_date) VALUES
(1, 'DEMO123456', 'daily', 1.74, 2150.25, 1.2, 0.54, 1.15, 1.42, 18.5, -12.3, CURDATE()),
(1, 'DEMO123456', 'weekly', 3.8, 4725.50, 2.8, 1.0, 1.15, 1.42, 18.5, -12.3, CURDATE()),
(1, 'DEMO123456', 'monthly', 5.2, 6425.75, 4.1, 1.1, 1.15, 1.42, 18.5, -12.3, CURDATE()),
(1, 'DEMO123456', 'quarterly', 8.7, 10875.25, 6.5, 2.2, 1.15, 1.42, 18.5, -12.3, CURDATE()),
(1, 'DEMO123456', 'yearly', 15.8, 19650.50, 12.2, 3.6, 1.15, 1.42, 18.5, -12.3, CURDATE()),
(1, 'DEMO123456', 'three_year', 42.5, 52875.75, 35.8, 6.7, 1.15, 1.42, 18.5, -12.3, CURDATE()),
(1, 'DEMO123456', 'five_year', 85.2, 106250.25, 72.5, 12.7, 1.15, 1.42, 18.5, -12.3, CURDATE());

-- Insert sample risk metrics
INSERT INTO risk_metrics (user_id, account_number, beta, sharpe_ratio, volatility, max_drawdown, var_95, var_99, risk_score, correlation_sp500, tracking_error, information_ratio, sortino_ratio, as_of_date) VALUES
(1, 'DEMO123456', 1.15, 1.42, 18.5, -12.3, -2850.75, -4250.50, 7.2, 0.85, 5.2, 0.65, 1.85, CURDATE()),
(2, 'TEST789012', 1.05, 1.25, 16.8, -10.5, -1950.25, -2850.75, 6.8, 0.82, 4.8, 0.58, 1.65, CURDATE());

-- Insert sample allocation data
INSERT INTO portfolio_allocation (user_id, account_number, allocation_type, allocation_name, allocation_percent, market_value, target_percent, deviation_percent, as_of_date) VALUES
(1, 'DEMO123456', 'sector', 'Technology', 54.25, 68183.75, 50.00, 4.25, CURDATE()),
(1, 'DEMO123456', 'sector', 'Consumer Discretionary', 10.50, 13200.00, 15.00, -4.50, CURDATE()),
(1, 'DEMO123456', 'sector', 'Financial Services', 20.32, 25545.00, 20.00, 0.32, CURDATE()),
(1, 'DEMO123456', 'sector', 'Cash', 12.13, 15250.75, 10.00, 2.13, CURDATE()),
(1, 'DEMO123456', 'asset_class', 'Equities', 87.87, 110500.25, 85.00, 2.87, CURDATE()),
(1, 'DEMO123456', 'asset_class', 'Cash', 12.13, 15250.75, 15.00, -2.87, CURDATE());

-- Create views for easier data access
CREATE VIEW portfolio_summary AS
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
WHERE ab.as_of_date = (SELECT MAX(as_of_date) FROM account_balance WHERE user_id = u.id);

-- Create indexes for better performance
CREATE INDEX idx_portfolio_holdings_user_date ON portfolio_holdings(user_id, as_of_date);
CREATE INDEX idx_portfolio_performance_user_date ON portfolio_performance(user_id, as_of_date);
CREATE INDEX idx_risk_metrics_user_date ON risk_metrics(user_id, as_of_date);
CREATE INDEX idx_transaction_history_user_date ON transaction_history(user_id, trade_date);

-- Add comments for documentation
ALTER TABLE users COMMENT = 'User authentication and profile information';
ALTER TABLE account_info COMMENT = 'IBOSS GetAccountInfo API data storage';
ALTER TABLE account_balance COMMENT = 'IBOSS GetAccountBalance API data storage';
ALTER TABLE account_commission COMMENT = 'IBOSS GetAccountCommission API data storage';
ALTER TABLE portfolio_holdings COMMENT = 'Individual security holdings and positions';
ALTER TABLE portfolio_performance COMMENT = 'Portfolio performance metrics across different time periods';
ALTER TABLE risk_metrics COMMENT = 'Risk analysis and metrics for portfolio assessment';
ALTER TABLE transaction_history COMMENT = 'Complete transaction history and trade records';
ALTER TABLE portfolio_allocation COMMENT = 'Portfolio allocation breakdown by various categories';
ALTER TABLE iboss_api_log COMMENT = 'API call logging for debugging and monitoring';
ALTER TABLE market_data COMMENT = 'Market data and benchmark information';
ALTER TABLE user_preferences COMMENT = 'User-specific settings and preferences';
ALTER TABLE portfolio_alerts COMMENT = 'Portfolio alerts and notifications system';
