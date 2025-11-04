-- Alhambra Bank & Trust - Database Initialization Script
-- Complete database schema for production deployment

-- Create database extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    nationality VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    account_status VARCHAR(20) DEFAULT 'pending',
    kyc_status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false
);

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    account_number VARCHAR(20) UNIQUE NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- 'individual', 'corporate', 'trust'
    account_name VARCHAR(255) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    balance DECIMAL(15,2) DEFAULT 0.00,
    available_balance DECIMAL(15,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'suspended', 'closed'
    minimum_balance DECIMAL(15,2) DEFAULT 0.00,
    interest_rate DECIMAL(5,4) DEFAULT 0.0000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    opened_date DATE,
    closed_date DATE,
    branch_code VARCHAR(10),
    relationship_manager_id UUID
);

-- Portfolio holdings table
CREATE TABLE IF NOT EXISTS portfolio_holdings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(10) NOT NULL,
    name VARCHAR(255) NOT NULL,
    shares DECIMAL(15,6) NOT NULL,
    average_cost DECIMAL(15,4) NOT NULL,
    current_price DECIMAL(15,4) NOT NULL,
    market_value DECIMAL(15,2) NOT NULL,
    unrealized_pl DECIMAL(15,2) NOT NULL,
    unrealized_pl_percent DECIMAL(8,4) NOT NULL,
    sector VARCHAR(100),
    country VARCHAR(100),
    currency VARCHAR(3) DEFAULT 'USD',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Portfolio performance table
CREATE TABLE IF NOT EXISTS portfolio_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_value DECIMAL(15,2) NOT NULL,
    daily_return DECIMAL(15,2) NOT NULL,
    daily_return_percent DECIMAL(8,4) NOT NULL,
    cumulative_return DECIMAL(15,2) NOT NULL,
    cumulative_return_percent DECIMAL(8,4) NOT NULL,
    benchmark_return DECIMAL(8,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL, -- 'deposit', 'withdrawal', 'transfer', 'fee', 'interest'
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    reference_number VARCHAR(50) UNIQUE,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'cancelled'
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    value_date DATE,
    balance_after DECIMAL(15,2),
    counterparty_name VARCHAR(255),
    counterparty_account VARCHAR(50),
    counterparty_bank VARCHAR(255),
    fees DECIMAL(15,2) DEFAULT 0.00,
    exchange_rate DECIMAL(10,6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- KYC documents table
CREATE TABLE IF NOT EXISTS kyc_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL, -- 'passport', 'national_id', 'proof_of_address', 'bank_statement'
    document_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    status VARCHAR(20) DEFAULT 'uploaded', -- 'uploaded', 'verified', 'rejected'
    verification_notes TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID,
    expiry_date DATE
);

-- Video KYC sessions table
CREATE TABLE IF NOT EXISTS video_kyc_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'failed'
    scheduled_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    agent_id UUID,
    agent_notes TEXT,
    recording_url VARCHAR(500),
    verification_result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table for JWT token management
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_account_number ON accounts(account_number);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_user_id ON portfolio_holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_symbol ON portfolio_holdings(symbol);
CREATE INDEX IF NOT EXISTS idx_portfolio_performance_user_id ON portfolio_performance(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_performance_date ON portfolio_performance(date);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference_number);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_id ON kyc_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_status ON kyc_documents(status);
CREATE INDEX IF NOT EXISTS idx_video_kyc_user_id ON video_kyc_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_video_kyc_status ON video_kyc_sessions(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_kyc_updated_at BEFORE UPDATE ON video_kyc_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('site_name', 'Alhambra Bank & Trust', 'Bank name displayed on the website'),
('default_currency', 'USD', 'Default currency for new accounts'),
('minimum_deposit_individual', '500000', 'Minimum deposit for individual accounts'),
('minimum_deposit_corporate', '1000000', 'Minimum deposit for corporate accounts'),
('kyc_expiry_days', '365', 'Number of days before KYC documents expire'),
('session_timeout_minutes', '30', 'Session timeout in minutes'),
('max_login_attempts', '5', 'Maximum login attempts before account lockout'),
('password_min_length', '8', 'Minimum password length'),
('enable_2fa', 'true', 'Enable two-factor authentication'),
('maintenance_mode', 'false', 'Enable maintenance mode')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert demo user for testing
INSERT INTO users (
    email, 
    password_hash, 
    first_name, 
    last_name, 
    phone, 
    account_status, 
    kyc_status,
    email_verified,
    is_active
) VALUES (
    'demo@alhambrabank.ky',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: 'password'
    'Demo',
    'User',
    '+1-345-123-4567',
    'active',
    'verified',
    true,
    true
) ON CONFLICT (email) DO NOTHING;

-- Insert demo account
INSERT INTO accounts (
    user_id,
    account_number,
    account_type,
    account_name,
    currency,
    balance,
    available_balance,
    status,
    minimum_balance,
    opened_date
) VALUES (
    (SELECT id FROM users WHERE email = 'demo@alhambrabank.ky'),
    'ALH-001-000001',
    'individual',
    'Demo User - Individual Account',
    'USD',
    125750.50,
    125750.50,
    'active',
    500000.00,
    CURRENT_DATE
) ON CONFLICT (account_number) DO NOTHING;

-- Insert demo portfolio holdings
INSERT INTO portfolio_holdings (
    user_id,
    symbol,
    name,
    shares,
    average_cost,
    current_price,
    market_value,
    unrealized_pl,
    unrealized_pl_percent,
    sector,
    country
) VALUES 
    ((SELECT id FROM users WHERE email = 'demo@alhambrabank.ky'), 'AAPL', 'Apple Inc.', 150, 170.25, 175.50, 26325.00, 787.50, 3.08, 'Technology', 'US'),
    ((SELECT id FROM users WHERE email = 'demo@alhambrabank.ky'), 'GOOGL', 'Alphabet Inc.', 75, 145.80, 142.30, 10672.50, -262.50, -2.40, 'Technology', 'US'),
    ((SELECT id FROM users WHERE email = 'demo@alhambrabank.ky'), 'MSFT', 'Microsoft Corporation', 200, 365.20, 378.85, 75770.00, 2730.00, 3.74, 'Technology', 'US'),
    ((SELECT id FROM users WHERE email = 'demo@alhambrabank.ky'), 'TSLA', 'Tesla Inc.', 50, 258.90, 248.75, 12437.50, -507.50, -3.92, 'Consumer Discretionary', 'US'),
    ((SELECT id FROM users WHERE email = 'demo@alhambrabank.ky'), 'NVDA', 'NVIDIA Corporation', 75, 285.40, 291.75, 21881.25, 476.25, 2.22, 'Technology', 'US')
ON CONFLICT DO NOTHING;

-- Create views for reporting
CREATE OR REPLACE VIEW user_portfolio_summary AS
SELECT 
    u.id as user_id,
    u.email,
    u.first_name,
    u.last_name,
    COUNT(ph.id) as total_holdings,
    SUM(ph.market_value) as total_portfolio_value,
    SUM(ph.unrealized_pl) as total_unrealized_pl,
    CASE 
        WHEN SUM(ph.market_value - ph.unrealized_pl) > 0 
        THEN (SUM(ph.unrealized_pl) / SUM(ph.market_value - ph.unrealized_pl)) * 100
        ELSE 0 
    END as total_return_percent
FROM users u
LEFT JOIN portfolio_holdings ph ON u.id = ph.user_id
WHERE u.is_active = true
GROUP BY u.id, u.email, u.first_name, u.last_name;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO alhambra_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO alhambra_admin;
GRANT USAGE ON SCHEMA public TO alhambra_admin;
