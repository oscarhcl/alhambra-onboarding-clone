-- Alhambra Bank & Trust Admin Dashboard Database Schema
-- AWS Account: 600043382145
-- Version: 1.0.0

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin', 'manager', 'analyst')),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_number VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    ssn_encrypted TEXT,
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(10),
    country VARCHAR(50) DEFAULT 'US',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'closed')),
    portfolio_value DECIMAL(15,2) DEFAULT 0.00,
    risk_score INTEGER CHECK (risk_score >= 1 AND risk_score <= 10),
    kyc_status VARCHAR(20) DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'in_review', 'approved', 'rejected')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- KYC requests table
CREATE TABLE IF NOT EXISTS kyc_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected')),
    documents_uploaded TEXT[], -- Array of document names
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewer_id UUID REFERENCES admin_users(id),
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    compliance_score INTEGER CHECK (compliance_score >= 1 AND compliance_score <= 100),
    risk_flags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fund transfers table
CREATE TABLE IF NOT EXISTS fund_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    transfer_type VARCHAR(20) NOT NULL CHECK (transfer_type IN ('wire', 'ach', 'internal')),
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    from_account VARCHAR(50) NOT NULL,
    to_account VARCHAR(50) NOT NULL,
    routing_number VARCHAR(20),
    beneficiary_name VARCHAR(255),
    beneficiary_address TEXT,
    purpose VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed', 'failed')),
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approver_id UUID REFERENCES admin_users(id),
    approved_at TIMESTAMP,
    processed_at TIMESTAMP,
    transaction_id VARCHAR(100),
    fees DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Communications table
CREATE TABLE IF NOT EXISTS communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    channel VARCHAR(20) DEFAULT 'email' CHECK (channel IN ('email', 'phone', 'chat', 'portal')),
    status VARCHAR(20) DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied', 'archived')),
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    admin_id UUID REFERENCES admin_users(id),
    attachments TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by UUID REFERENCES admin_users(id),
    reviewed_at TIMESTAMP,
    s3_bucket VARCHAR(100),
    s3_key VARCHAR(500),
    encryption_key_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES admin_users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Portfolio holdings table (for IBOSS integration)
CREATE TABLE IF NOT EXISTS portfolio_holdings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    symbol VARCHAR(10) NOT NULL,
    quantity DECIMAL(15,4) NOT NULL,
    average_cost DECIMAL(10,4) NOT NULL,
    current_price DECIMAL(10,4),
    market_value DECIMAL(15,2),
    unrealized_gain_loss DECIMAL(15,2),
    percentage_of_portfolio DECIMAL(5,2),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Account balances table (for IBOSS integration)
CREATE TABLE IF NOT EXISTS account_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    account_type VARCHAR(50) NOT NULL,
    cash_balance DECIMAL(15,2) DEFAULT 0.00,
    equity_value DECIMAL(15,2) DEFAULT 0.00,
    total_value DECIMAL(15,2) DEFAULT 0.00,
    buying_power DECIMAL(15,2) DEFAULT 0.00,
    day_trading_buying_power DECIMAL(15,2) DEFAULT 0.00,
    maintenance_requirement DECIMAL(15,2) DEFAULT 0.00,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    period VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
    return_percentage DECIMAL(8,4),
    benchmark_return DECIMAL(8,4),
    alpha DECIMAL(8,4),
    beta DECIMAL(8,4),
    sharpe_ratio DECIMAL(8,4),
    volatility DECIMAL(8,4),
    max_drawdown DECIMAL(8,4),
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_account_number ON clients(account_number);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_kyc_requests_client_id ON kyc_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_kyc_requests_status ON kyc_requests(status);
CREATE INDEX IF NOT EXISTS idx_fund_transfers_client_id ON fund_transfers(client_id);
CREATE INDEX IF NOT EXISTS idx_fund_transfers_status ON fund_transfers(status);
CREATE INDEX IF NOT EXISTS idx_communications_client_id ON communications(client_id);
CREATE INDEX IF NOT EXISTS idx_communications_status ON communications(status);
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_client_id ON portfolio_holdings(client_id);
CREATE INDEX IF NOT EXISTS idx_account_balances_client_id ON account_balances(client_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_client_id ON performance_metrics(client_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kyc_requests_updated_at BEFORE UPDATE ON kyc_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fund_transfers_updated_at BEFORE UPDATE ON fund_transfers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_communications_updated_at BEFORE UPDATE ON communications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: RafiRamzi2025!!)
INSERT INTO admin_users (username, email, password_hash, role, first_name, last_name) 
VALUES (
    'admin',
    'awm@awmga.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', -- RafiRamzi2025!!
    'admin',
    'Admin',
    'User'
) ON CONFLICT (username) DO NOTHING;

-- Insert sample data for testing
INSERT INTO clients (account_number, first_name, last_name, email, phone, status, portfolio_value, risk_score) VALUES
('ALH-001001', 'John', 'Smith', 'john.smith@email.com', '+1-555-0101', 'active', 125750.50, 7),
('ALH-001002', 'Sarah', 'Johnson', 'sarah.johnson@email.com', '+1-555-0102', 'active', 89250.75, 5),
('ALH-001003', 'Michael', 'Brown', 'michael.brown@email.com', '+1-555-0103', 'pending', 0.00, 6),
('ALH-001004', 'Emily', 'Davis', 'emily.davis@email.com', '+1-555-0104', 'active', 234500.25, 8),
('ALH-001005', 'Robert', 'Wilson', 'robert.wilson@email.com', '+1-555-0105', 'active', 156780.00, 4)
ON CONFLICT (account_number) DO NOTHING;

-- Insert sample KYC requests
INSERT INTO kyc_requests (client_id, request_type, status, documents_uploaded) 
SELECT id, 'identity_verification', 'pending', ARRAY['passport.pdf', 'utility_bill.pdf']
FROM clients WHERE account_number = 'ALH-001003'
ON CONFLICT DO NOTHING;

-- Insert sample fund transfers
INSERT INTO fund_transfers (client_id, transfer_type, amount, from_account, to_account, status)
SELECT id, 'wire', 50000.00, 'ALH-001001', '123456789', 'pending'
FROM clients WHERE account_number = 'ALH-001001'
ON CONFLICT DO NOTHING;

-- Insert sample communications
INSERT INTO communications (client_id, subject, message, direction, status)
SELECT id, 'Account Opening Inquiry', 'I would like to open a new investment account.', 'inbound', 'unread'
FROM clients WHERE account_number = 'ALH-001003'
ON CONFLICT DO NOTHING;

-- Insert sample documents
INSERT INTO documents (client_id, document_name, document_type, file_path, file_size, mime_type)
SELECT id, 'passport_scan.pdf', 'identity', '/uploads/passport_scan.pdf', 2048576, 'application/pdf'
FROM clients WHERE account_number = 'ALH-001003'
ON CONFLICT DO NOTHING;

-- Create views for reporting
CREATE OR REPLACE VIEW client_summary AS
SELECT 
    c.id,
    c.account_number,
    c.first_name || ' ' || c.last_name as full_name,
    c.email,
    c.status,
    c.portfolio_value,
    c.risk_score,
    COUNT(DISTINCT kr.id) as kyc_requests_count,
    COUNT(DISTINCT ft.id) as fund_transfers_count,
    COUNT(DISTINCT comm.id) as communications_count,
    COUNT(DISTINCT d.id) as documents_count,
    c.created_at
FROM clients c
LEFT JOIN kyc_requests kr ON c.id = kr.client_id
LEFT JOIN fund_transfers ft ON c.id = ft.client_id
LEFT JOIN communications comm ON c.id = comm.client_id
LEFT JOIN documents d ON c.id = d.client_id
GROUP BY c.id, c.account_number, c.first_name, c.last_name, c.email, c.status, c.portfolio_value, c.risk_score, c.created_at;

-- Grant permissions (adjust as needed for your security requirements)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO admin_dashboard_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO admin_dashboard_user;
