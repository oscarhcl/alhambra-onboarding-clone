-- Alhambra Bank & Trust - Internal Admin Database Schema
-- Account: 600043382145
-- Complete database schema for internal admin dashboard, CRM, KYC, and document management

-- ============================================================================
-- ADMIN USERS AND AUTHENTICATION
-- ============================================================================

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    permissions TEXT[] DEFAULT ARRAY[]::TEXT[],
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(255),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    created_by INTEGER REFERENCES admin_users(id),
    
    CONSTRAINT valid_role CHECK (role IN ('super_admin', 'admin', 'manager', 'analyst', 'support'))
);

-- Admin sessions table
CREATE TABLE IF NOT EXISTS admin_sessions (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin activities log
CREATE TABLE IF NOT EXISTS admin_activities (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES admin_users(id),
    activity_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    client_id INTEGER,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin notifications
CREATE TABLE IF NOT EXISTS admin_notifications (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admin_users(id), -- NULL for system-wide notifications
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    priority VARCHAR(20) NOT NULL DEFAULT 'normal',
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_type CHECK (type IN ('info', 'warning', 'error', 'success')),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- ============================================================================
-- CLIENTS AND ACCOUNTS
-- ============================================================================

-- Clients table (enhanced for admin management)
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE,
    ssn_encrypted VARCHAR(255), -- Encrypted SSN
    address JSONB, -- Full address object
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    kyc_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    risk_profile VARCHAR(20) DEFAULT 'medium',
    client_type VARCHAR(20) DEFAULT 'individual',
    source VARCHAR(50), -- How they found us
    assigned_advisor INTEGER REFERENCES admin_users(id),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    
    CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'suspended', 'closed')),
    CONSTRAINT valid_kyc_status CHECK (kyc_status IN ('pending', 'in_review', 'approved', 'rejected')),
    CONSTRAINT valid_risk_profile CHECK (risk_profile IN ('low', 'medium', 'high')),
    CONSTRAINT valid_client_type CHECK (client_type IN ('individual', 'joint', 'corporate', 'trust'))
);

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    account_number VARCHAR(20) UNIQUE NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    opening_balance DECIMAL(15,2) DEFAULT 0.00,
    current_balance DECIMAL(15,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_account_type CHECK (account_type IN ('checking', 'savings', 'investment', 'retirement')),
    CONSTRAINT valid_account_status CHECK (status IN ('active', 'suspended', 'closed'))
);

-- Portfolios table
CREATE TABLE IF NOT EXISTS portfolios (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    total_value DECIMAL(15,2) DEFAULT 0.00,
    cash_balance DECIMAL(15,2) DEFAULT 0.00,
    invested_amount DECIMAL(15,2) DEFAULT 0.00,
    unrealized_gain_loss DECIMAL(15,2) DEFAULT 0.00,
    performance_ytd DECIMAL(5,2) DEFAULT 0.00,
    performance_1y DECIMAL(5,2) DEFAULT 0.00,
    risk_score DECIMAL(3,1) DEFAULT 5.0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- KYC MANAGEMENT
-- ============================================================================

-- KYC requests table
CREATE TABLE IF NOT EXISTS kyc_requests (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL DEFAULT 'initial',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    risk_level VARCHAR(20) NOT NULL DEFAULT 'medium',
    request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    documents_uploaded BOOLEAN DEFAULT false,
    identity_verified BOOLEAN DEFAULT false,
    address_verified BOOLEAN DEFAULT false,
    income_verified BOOLEAN DEFAULT false,
    source_of_funds_verified BOOLEAN DEFAULT false,
    pep_check BOOLEAN DEFAULT false,
    sanctions_check BOOLEAN DEFAULT false,
    adverse_media_check BOOLEAN DEFAULT false,
    notes TEXT,
    reviewed_by INTEGER REFERENCES admin_users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    CONSTRAINT valid_request_type CHECK (request_type IN ('initial', 'periodic_review', 'enhanced_due_diligence')),
    CONSTRAINT valid_kyc_status CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'expired')),
    CONSTRAINT valid_risk_level CHECK (risk_level IN ('low', 'medium', 'high'))
);

-- KYC documents table
CREATE TABLE IF NOT EXISTS kyc_documents (
    id SERIAL PRIMARY KEY,
    kyc_request_id INTEGER NOT NULL REFERENCES kyc_requests(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    file_url TEXT NOT NULL,
    file_hash VARCHAR(64), -- SHA-256 hash for integrity
    document_status VARCHAR(20) DEFAULT 'pending',
    verified_by INTEGER REFERENCES admin_users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_document_type CHECK (document_type IN (
        'passport', 'drivers_license', 'national_id', 'utility_bill', 
        'bank_statement', 'tax_return', 'employment_letter', 'other'
    )),
    CONSTRAINT valid_document_status CHECK (document_status IN ('pending', 'approved', 'rejected', 'expired'))
);

-- ============================================================================
-- FUND TRANSFERS MANAGEMENT
-- ============================================================================

-- Fund transfers table
CREATE TABLE IF NOT EXISTS fund_transfers (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    transfer_type VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    from_account VARCHAR(100),
    to_account VARCHAR(100),
    from_account_id INTEGER REFERENCES accounts(id),
    to_account_id INTEGER REFERENCES accounts(id),
    routing_number VARCHAR(20),
    swift_code VARCHAR(20),
    reference_number VARCHAR(50) UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_date TIMESTAMP WITH TIME ZONE,
    processed_date TIMESTAMP WITH TIME ZONE,
    completed_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    internal_notes TEXT, -- Admin-only notes
    reviewed_by INTEGER REFERENCES admin_users(id),
    processed_by INTEGER REFERENCES admin_users(id),
    fee_amount DECIMAL(10,2) DEFAULT 0.00,
    exchange_rate DECIMAL(10,6),
    
    CONSTRAINT valid_transfer_type CHECK (transfer_type IN (
        'wire_domestic', 'wire_international', 'ach_credit', 'ach_debit', 
        'internal_transfer', 'check', 'deposit', 'withdrawal'
    )),
    CONSTRAINT valid_transfer_status CHECK (status IN (
        'pending', 'approved', 'rejected', 'processing', 'completed', 'failed', 'cancelled'
    )),
    CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Transfer approvals workflow
CREATE TABLE IF NOT EXISTS transfer_approvals (
    id SERIAL PRIMARY KEY,
    transfer_id INTEGER NOT NULL REFERENCES fund_transfers(id) ON DELETE CASCADE,
    approver_id INTEGER NOT NULL REFERENCES admin_users(id),
    approval_level INTEGER NOT NULL, -- 1st level, 2nd level, etc.
    status VARCHAR(20) NOT NULL,
    notes TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_approval_status CHECK (status IN ('pending', 'approved', 'rejected')),
    UNIQUE(transfer_id, approval_level)
);

-- ============================================================================
-- COMMUNICATIONS MANAGEMENT
-- ============================================================================

-- Client communications table
CREATE TABLE IF NOT EXISTS client_communications (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    communication_type VARCHAR(50) NOT NULL,
    direction VARCHAR(10) NOT NULL, -- 'inbound' or 'outbound'
    channel VARCHAR(20) NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    status VARCHAR(20) DEFAULT 'unread',
    category VARCHAR(50),
    tags TEXT[],
    admin_reply TEXT,
    responded_by INTEGER REFERENCES admin_users(id),
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_communication_type CHECK (communication_type IN (
        'inquiry', 'complaint', 'request', 'feedback', 'support', 'marketing'
    )),
    CONSTRAINT valid_direction CHECK (direction IN ('inbound', 'outbound')),
    CONSTRAINT valid_channel CHECK (channel IN ('email', 'phone', 'chat', 'sms', 'mail', 'in_person')),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    CONSTRAINT valid_comm_status CHECK (status IN ('unread', 'read', 'responded', 'closed', 'escalated'))
);

-- Communication attachments
CREATE TABLE IF NOT EXISTS communication_attachments (
    id SERIAL PRIMARY KEY,
    communication_id INTEGER NOT NULL REFERENCES client_communications(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    file_url TEXT NOT NULL,
    file_type VARCHAR(50),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- DOCUMENT MANAGEMENT
-- ============================================================================

-- Documents table (general document storage)
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    category VARCHAR(50),
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    file_url TEXT NOT NULL,
    file_hash VARCHAR(64),
    mime_type VARCHAR(100),
    description TEXT,
    tags TEXT[],
    access_level VARCHAR(20) DEFAULT 'internal', -- 'public', 'client', 'internal', 'restricted'
    uploaded_by_admin INTEGER REFERENCES admin_users(id),
    uploaded_by_client INTEGER REFERENCES clients(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    version INTEGER DEFAULT 1,
    parent_document_id INTEGER REFERENCES documents(id),
    
    CONSTRAINT valid_access_level CHECK (access_level IN ('public', 'client', 'internal', 'restricted'))
);

-- Document access log
CREATE TABLE IF NOT EXISTS document_access_log (
    id SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    accessed_by_admin INTEGER REFERENCES admin_users(id),
    accessed_by_client INTEGER REFERENCES clients(id),
    access_type VARCHAR(20) NOT NULL, -- 'view', 'download', 'edit', 'delete'
    ip_address INET,
    user_agent TEXT,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_access_type CHECK (access_type IN ('view', 'download', 'edit', 'delete'))
);

-- ============================================================================
-- CRM SYSTEM
-- ============================================================================

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    company VARCHAR(255),
    source VARCHAR(50), -- 'website', 'referral', 'advertising', etc.
    status VARCHAR(20) DEFAULT 'new',
    lead_score INTEGER DEFAULT 0,
    assigned_to INTEGER REFERENCES admin_users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    converted_at TIMESTAMP WITH TIME ZONE,
    converted_to_client_id INTEGER REFERENCES clients(id),
    
    CONSTRAINT valid_lead_status CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'converted', 'lost'))
);

-- Opportunities table
CREATE TABLE IF NOT EXISTS opportunities (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    lead_id INTEGER REFERENCES leads(id),
    opportunity_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    value DECIMAL(15,2),
    probability INTEGER DEFAULT 50, -- Percentage
    stage VARCHAR(50) DEFAULT 'prospecting',
    assigned_to INTEGER REFERENCES admin_users(id),
    expected_close_date DATE,
    actual_close_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_opportunity_type CHECK (opportunity_type IN (
        'investment_account', 'loan', 'mortgage', 'insurance', 'wealth_management', 'other'
    )),
    CONSTRAINT valid_stage CHECK (stage IN (
        'prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'
    )),
    CONSTRAINT valid_probability CHECK (probability >= 0 AND probability <= 100)
);

-- CRM activities table
CREATE TABLE IF NOT EXISTS crm_activities (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    lead_id INTEGER REFERENCES leads(id),
    opportunity_id INTEGER REFERENCES opportunities(id),
    activity_type VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'completed',
    priority VARCHAR(20) DEFAULT 'normal',
    assigned_to INTEGER REFERENCES admin_users(id),
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_activity_type CHECK (activity_type IN (
        'call', 'email', 'meeting', 'task', 'note', 'follow_up'
    )),
    CONSTRAINT valid_activity_status CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    CONSTRAINT valid_activity_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- ============================================================================
-- SYSTEM SETTINGS
-- ============================================================================

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    updated_by INTEGER REFERENCES admin_users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- AUDIT AND COMPLIANCE
-- ============================================================================

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    old_values JSONB,
    new_values JSONB,
    changed_by_admin INTEGER REFERENCES admin_users(id),
    changed_by_client INTEGER REFERENCES clients(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT valid_action CHECK (action IN ('INSERT', 'UPDATE', 'DELETE'))
);

-- Compliance checks table
CREATE TABLE IF NOT EXISTS compliance_checks (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    check_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    result JSONB,
    performed_by INTEGER REFERENCES admin_users(id),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    CONSTRAINT valid_check_type CHECK (check_type IN (
        'aml_screening', 'sanctions_check', 'pep_check', 'adverse_media', 'credit_check'
    )),
    CONSTRAINT valid_compliance_status CHECK (status IN ('pending', 'passed', 'failed', 'manual_review'))
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Admin users indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(active);

-- Admin sessions indexes
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

-- Admin activities indexes
CREATE INDEX IF NOT EXISTS idx_admin_activities_admin_id ON admin_activities(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activities_type ON admin_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_admin_activities_created ON admin_activities(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_activities_client_id ON admin_activities(client_id);

-- Clients indexes
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_kyc_status ON clients(kyc_status);
CREATE INDEX IF NOT EXISTS idx_clients_created ON clients(created_at);
CREATE INDEX IF NOT EXISTS idx_clients_advisor ON clients(assigned_advisor);

-- Accounts indexes
CREATE INDEX IF NOT EXISTS idx_accounts_client_id ON accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_accounts_number ON accounts(account_number);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);

-- KYC requests indexes
CREATE INDEX IF NOT EXISTS idx_kyc_requests_client_id ON kyc_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_kyc_requests_status ON kyc_requests(status);
CREATE INDEX IF NOT EXISTS idx_kyc_requests_date ON kyc_requests(request_date);
CREATE INDEX IF NOT EXISTS idx_kyc_requests_reviewed_by ON kyc_requests(reviewed_by);

-- Fund transfers indexes
CREATE INDEX IF NOT EXISTS idx_fund_transfers_client_id ON fund_transfers(client_id);
CREATE INDEX IF NOT EXISTS idx_fund_transfers_status ON fund_transfers(status);
CREATE INDEX IF NOT EXISTS idx_fund_transfers_date ON fund_transfers(request_date);
CREATE INDEX IF NOT EXISTS idx_fund_transfers_reference ON fund_transfers(reference_number);

-- Communications indexes
CREATE INDEX IF NOT EXISTS idx_communications_client_id ON client_communications(client_id);
CREATE INDEX IF NOT EXISTS idx_communications_status ON client_communications(status);
CREATE INDEX IF NOT EXISTS idx_communications_type ON client_communications(communication_type);
CREATE INDEX IF NOT EXISTS idx_communications_created ON client_communications(created_at);

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded ON documents(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_documents_access_level ON documents(access_level);

-- CRM indexes
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_opportunities_client_id ON opportunities(client_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_assigned ON opportunities(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_activities_client_id ON crm_activities(client_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_type ON crm_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_crm_activities_assigned ON crm_activities(assigned_to);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON audit_log(changed_by_admin);

-- ============================================================================
-- INITIAL DATA SETUP
-- ============================================================================

-- Insert default admin user (password: RafiRamzi2025!!)
INSERT INTO admin_users (username, email, password_hash, full_name, role, permissions, active) 
VALUES (
    'admin',
    'admin@alhambrabank.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.gSUadW', -- bcrypt hash of 'RafiRamzi2025!!'
    'System Administrator',
    'super_admin',
    ARRAY['super_admin'],
    true
) ON CONFLICT (username) DO NOTHING;

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description, category) VALUES
('kyc_auto_approval', 'false', 'Enable automatic KYC approval for low-risk clients', 'kyc'),
('transfer_daily_limit', '50000', 'Daily transfer limit in USD', 'transfers'),
('transfer_monthly_limit', '500000', 'Monthly transfer limit in USD', 'transfers'),
('notification_email_enabled', 'true', 'Enable email notifications', 'notifications'),
('notification_sms_enabled', 'false', 'Enable SMS notifications', 'notifications'),
('session_timeout_hours', '8', 'Admin session timeout in hours', 'security'),
('password_min_length', '12', 'Minimum password length', 'security'),
('mfa_required', 'false', 'Require MFA for all admin users', 'security')
ON CONFLICT (setting_key) DO NOTHING;

-- Insert sample notification
INSERT INTO admin_notifications (title, message, type, priority) VALUES
('Welcome to Alhambra Bank Admin Dashboard', 'The internal admin dashboard is now ready for use. You can manage clients, KYC requests, fund transfers, and more.', 'info', 'normal')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SAMPLE DATA FOR TESTING
-- ============================================================================

-- Insert sample client
INSERT INTO clients (email, phone, first_name, last_name, date_of_birth, status, kyc_status) VALUES
('john.doe@example.com', '+1234567890', 'John', 'Doe', '1985-06-15', 'active', 'approved'),
('jane.smith@example.com', '+1234567891', 'Jane', 'Smith', '1990-03-22', 'pending', 'pending')
ON CONFLICT (email) DO NOTHING;

-- Insert sample account
INSERT INTO accounts (client_id, account_number, account_type, current_balance) 
SELECT c.id, 'ACC' || LPAD(c.id::text, 10, '0'), 'investment', 125750.50
FROM clients c WHERE c.email = 'john.doe@example.com'
ON CONFLICT (account_number) DO NOTHING;

-- Insert sample portfolio
INSERT INTO portfolios (client_id, account_id, total_value, cash_balance, invested_amount, performance_ytd)
SELECT c.id, a.id, 125750.50, 15250.75, 110499.75, 8.5
FROM clients c 
JOIN accounts a ON c.id = a.client_id 
WHERE c.email = 'john.doe@example.com'
ON CONFLICT DO NOTHING;

-- Insert sample KYC request
INSERT INTO kyc_requests (client_id, status, risk_level, documents_uploaded)
SELECT c.id, 'pending', 'medium', true
FROM clients c WHERE c.email = 'jane.smith@example.com'
ON CONFLICT DO NOTHING;

-- Insert sample communication
INSERT INTO client_communications (client_id, communication_type, direction, channel, subject, message, status)
SELECT c.id, 'inquiry', 'inbound', 'email', 'Question about portfolio performance', 'I would like to understand my portfolio performance better. Can someone help me?', 'unread'
FROM clients c WHERE c.email = 'john.doe@example.com'
ON CONFLICT DO NOTHING;

-- Insert sample lead
INSERT INTO leads (name, email, phone, source, status, lead_score) VALUES
('Michael Johnson', 'michael.johnson@example.com', '+1234567892', 'website', 'new', 75),
('Sarah Wilson', 'sarah.wilson@example.com', '+1234567893', 'referral', 'contacted', 85)
ON CONFLICT DO NOTHING;

-- Insert sample opportunity
INSERT INTO opportunities (client_id, opportunity_type, title, value, probability, stage)
SELECT c.id, 'wealth_management', 'Premium Wealth Management Package', 250000.00, 70, 'proposal'
FROM clients c WHERE c.email = 'john.doe@example.com'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log admin activities
CREATE OR REPLACE FUNCTION log_admin_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, action, new_values, created_at)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW), NOW());
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, created_at)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW), NOW());
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_values, created_at)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, row_to_json(OLD), NOW());
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Audit triggers for sensitive tables
CREATE TRIGGER audit_clients AFTER INSERT OR UPDATE OR DELETE ON clients FOR EACH ROW EXECUTE FUNCTION log_admin_activity();
CREATE TRIGGER audit_kyc_requests AFTER INSERT OR UPDATE OR DELETE ON kyc_requests FOR EACH ROW EXECUTE FUNCTION log_admin_activity();
CREATE TRIGGER audit_fund_transfers AFTER INSERT OR UPDATE OR DELETE ON fund_transfers FOR EACH ROW EXECUTE FUNCTION log_admin_activity();

-- ============================================================================
-- VIEWS FOR REPORTING
-- ============================================================================

-- Client summary view
CREATE OR REPLACE VIEW client_summary AS
SELECT 
    c.id,
    c.email,
    c.first_name || ' ' || c.last_name as full_name,
    c.status,
    c.kyc_status,
    c.created_at,
    a.account_number,
    p.total_value as portfolio_value,
    COUNT(cc.id) as communication_count,
    MAX(cc.created_at) as last_communication
FROM clients c
LEFT JOIN accounts a ON c.id = a.client_id
LEFT JOIN portfolios p ON c.id = p.client_id
LEFT JOIN client_communications cc ON c.id = cc.client_id
GROUP BY c.id, c.email, c.first_name, c.last_name, c.status, c.kyc_status, c.created_at, a.account_number, p.total_value;

-- KYC status summary view
CREATE OR REPLACE VIEW kyc_status_summary AS
SELECT 
    status,
    COUNT(*) as count,
    AVG(EXTRACT(EPOCH FROM (COALESCE(reviewed_at, NOW()) - request_date))/86400) as avg_processing_days
FROM kyc_requests
GROUP BY status;

-- Fund transfer summary view
CREATE OR REPLACE VIEW fund_transfer_summary AS
SELECT 
    status,
    COUNT(*) as count,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount
FROM fund_transfers
GROUP BY status;

-- ============================================================================
-- PERMISSIONS AND SECURITY
-- ============================================================================

-- Create roles for different access levels
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'alhambra_admin_readonly') THEN
        CREATE ROLE alhambra_admin_readonly;
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'alhambra_admin_readwrite') THEN
        CREATE ROLE alhambra_admin_readwrite;
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'alhambra_admin_full') THEN
        CREATE ROLE alhambra_admin_full;
    END IF;
END
$$;

-- Grant permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO alhambra_admin_readonly;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO alhambra_admin_readwrite;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO alhambra_admin_full;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO alhambra_admin_readwrite, alhambra_admin_full;

-- Row Level Security (RLS) examples
ALTER TABLE client_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Example RLS policy (can be customized based on requirements)
CREATE POLICY client_communications_policy ON client_communications
    FOR ALL TO alhambra_admin_readwrite
    USING (true); -- Admins can see all communications

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Alhambra Bank & Trust Internal Admin Database Schema Setup Complete!';
    RAISE NOTICE 'Default admin user: admin / RafiRamzi2025!!';
    RAISE NOTICE 'Database is ready for production use.';
END
$$;
