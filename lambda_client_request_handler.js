// Alhambra Bank & Trust - Lambda Client Request Handler
// Account: 600043382145
// Secure Lambda functions for client requests with isolated infrastructure

const AWS = require('aws-sdk');
const AlhambraCognitoAuth = require('./aws_cognito_auth_system');

// Configure AWS SDK
AWS.config.update({ region: 'us-east-1' });

const dynamodb = new AWS.DynamoDB.DocumentClient();
const secretsManager = new AWS.SecretsManager();
const lambda = new AWS.Lambda();

class LambdaClientRequestHandler {
    constructor() {
        this.auth = new AlhambraCognitoAuth();
        this.allowedOrigins = [
            'https://alhambrabank.com',
            'https://www.alhambrabank.com',
            'https://portal.alhambrabank.com'
        ];
    }

    /**
     * Main Lambda handler for client authentication requests
     */
    async handleAuthRequest(event, context) {
        try {
            // CORS headers
            const headers = this.getCORSHeaders(event);
            
            // Parse request
            const { httpMethod, path, body, headers: requestHeaders } = event;
            const requestBody = body ? JSON.parse(body) : {};

            console.log(`Auth request: ${httpMethod} ${path}`);

            // Route to appropriate handler
            switch (path) {
                case '/auth/register':
                    return await this.handleRegistration(requestBody, headers);
                
                case '/auth/login':
                    return await this.handleLogin(requestBody, headers);
                
                case '/auth/verify-otp':
                    return await this.handleOTPVerification(requestBody, headers);
                
                case '/auth/logout':
                    return await this.handleLogout(requestHeaders, headers);
                
                case '/auth/validate-session':
                    return await this.handleSessionValidation(requestHeaders, headers);
                
                default:
                    return this.createResponse(404, { error: 'Endpoint not found' }, headers);
            }

        } catch (error) {
            console.error('Auth request error:', error);
            return this.createResponse(500, { 
                error: 'Internal server error',
                requestId: context.awsRequestId 
            }, this.getCORSHeaders(event));
        }
    }

    /**
     * Lambda handler for secure client portfolio requests
     */
    async handlePortfolioRequest(event, context) {
        try {
            const headers = this.getCORSHeaders(event);
            const { httpMethod, path, body, headers: requestHeaders } = event;
            const requestBody = body ? JSON.parse(body) : {};

            // Validate session first
            const sessionValidation = await this.validateClientSession(requestHeaders);
            if (!sessionValidation.valid) {
                return this.createResponse(401, { error: 'Unauthorized' }, headers);
            }

            console.log(`Portfolio request from client: ${sessionValidation.user.email}`);

            // Route to appropriate portfolio handler
            switch (path) {
                case '/portfolio/summary':
                    return await this.getPortfolioSummary(sessionValidation.user, headers);
                
                case '/portfolio/holdings':
                    return await this.getPortfolioHoldings(sessionValidation.user, headers);
                
                case '/portfolio/performance':
                    return await this.getPortfolioPerformance(sessionValidation.user, headers);
                
                case '/portfolio/transactions':
                    return await this.getTransactionHistory(sessionValidation.user, headers);
                
                case '/portfolio/statements':
                    return await this.getStatements(sessionValidation.user, headers);
                
                default:
                    return this.createResponse(404, { error: 'Endpoint not found' }, headers);
            }

        } catch (error) {
            console.error('Portfolio request error:', error);
            return this.createResponse(500, { 
                error: 'Internal server error',
                requestId: context.awsRequestId 
            }, this.getCORSHeaders(event));
        }
    }

    /**
     * Lambda handler for client service requests (non-portfolio)
     */
    async handleClientServiceRequest(event, context) {
        try {
            const headers = this.getCORSHeaders(event);
            const { httpMethod, path, body, headers: requestHeaders } = event;
            const requestBody = body ? JSON.parse(body) : {};

            // Validate session
            const sessionValidation = await this.validateClientSession(requestHeaders);
            if (!sessionValidation.valid) {
                return this.createResponse(401, { error: 'Unauthorized' }, headers);
            }

            console.log(`Service request from client: ${sessionValidation.user.email}`);

            // Route to appropriate service handler
            switch (path) {
                case '/services/account-info':
                    return await this.getAccountInfo(sessionValidation.user, headers);
                
                case '/services/contact-advisor':
                    return await this.contactAdvisor(sessionValidation.user, requestBody, headers);
                
                case '/services/document-request':
                    return await this.requestDocument(sessionValidation.user, requestBody, headers);
                
                case '/services/support-ticket':
                    return await this.createSupportTicket(sessionValidation.user, requestBody, headers);
                
                case '/services/profile-update':
                    return await this.updateProfile(sessionValidation.user, requestBody, headers);
                
                default:
                    return this.createResponse(404, { error: 'Endpoint not found' }, headers);
            }

        } catch (error) {
            console.error('Service request error:', error);
            return this.createResponse(500, { 
                error: 'Internal server error',
                requestId: context.awsRequestId 
            }, this.getCORSHeaders(event));
        }
    }

    // Authentication handlers
    async handleRegistration(requestBody, headers) {
        try {
            const result = await this.auth.registerClient(requestBody);
            return this.createResponse(200, result, headers);
        } catch (error) {
            return this.createResponse(400, { error: error.message }, headers);
        }
    }

    async handleLogin(requestBody, headers) {
        try {
            const { email, password, deviceInfo } = requestBody;
            const result = await this.auth.clientLogin(email, password, deviceInfo);
            return this.createResponse(200, result, headers);
        } catch (error) {
            return this.createResponse(400, { error: error.message }, headers);
        }
    }

    async handleOTPVerification(requestBody, headers) {
        try {
            const { tempSessionId, otpCode } = requestBody;
            const result = await this.auth.verifyOTPAndLogin(tempSessionId, otpCode);
            return this.createResponse(200, result, headers);
        } catch (error) {
            return this.createResponse(400, { error: error.message }, headers);
        }
    }

    async handleLogout(requestHeaders, headers) {
        try {
            const sessionToken = this.extractSessionToken(requestHeaders);
            const result = await this.auth.logout(sessionToken);
            return this.createResponse(200, result, headers);
        } catch (error) {
            return this.createResponse(400, { error: error.message }, headers);
        }
    }

    async handleSessionValidation(requestHeaders, headers) {
        try {
            const sessionToken = this.extractSessionToken(requestHeaders);
            const result = await this.auth.validateSession(sessionToken);
            return this.createResponse(200, result, headers);
        } catch (error) {
            return this.createResponse(400, { error: error.message }, headers);
        }
    }

    // Portfolio handlers (secure, isolated from internal infrastructure)
    async getPortfolioSummary(user, headers) {
        try {
            // Get client portfolio data from secure client database
            const portfolioData = await this.getClientPortfolioData(user.email);
            
            if (!portfolioData) {
                return this.createResponse(404, { error: 'Portfolio not found' }, headers);
            }

            // Return sanitized portfolio summary
            const summary = {
                totalValue: portfolioData.totalValue,
                dayChange: portfolioData.dayChange,
                dayChangePercent: portfolioData.dayChangePercent,
                availableCash: portfolioData.availableCash,
                lastUpdated: portfolioData.lastUpdated,
                accountNumber: this.maskAccountNumber(portfolioData.accountNumber)
            };

            return this.createResponse(200, { success: true, data: summary }, headers);

        } catch (error) {
            console.error('Portfolio summary error:', error);
            return this.createResponse(500, { error: 'Failed to retrieve portfolio summary' }, headers);
        }
    }

    async getPortfolioHoldings(user, headers) {
        try {
            const holdings = await this.getClientHoldings(user.email);
            
            // Sanitize holdings data
            const sanitizedHoldings = holdings.map(holding => ({
                symbol: holding.symbol,
                companyName: holding.companyName,
                shares: holding.shares,
                currentPrice: holding.currentPrice,
                marketValue: holding.marketValue,
                dayChange: holding.dayChange,
                dayChangePercent: holding.dayChangePercent,
                costBasis: holding.costBasis,
                unrealizedGainLoss: holding.unrealizedGainLoss
            }));

            return this.createResponse(200, { 
                success: true, 
                data: sanitizedHoldings,
                count: sanitizedHoldings.length 
            }, headers);

        } catch (error) {
            console.error('Portfolio holdings error:', error);
            return this.createResponse(500, { error: 'Failed to retrieve holdings' }, headers);
        }
    }

    async getPortfolioPerformance(user, headers) {
        try {
            const performance = await this.getClientPerformance(user.email);
            
            return this.createResponse(200, { 
                success: true, 
                data: {
                    oneDay: performance.oneDay,
                    oneWeek: performance.oneWeek,
                    oneMonth: performance.oneMonth,
                    threeMonth: performance.threeMonth,
                    sixMonth: performance.sixMonth,
                    oneYear: performance.oneYear,
                    ytd: performance.ytd,
                    inception: performance.inception
                }
            }, headers);

        } catch (error) {
            console.error('Portfolio performance error:', error);
            return this.createResponse(500, { error: 'Failed to retrieve performance data' }, headers);
        }
    }

    async getTransactionHistory(user, headers) {
        try {
            const transactions = await this.getClientTransactions(user.email);
            
            // Sanitize transaction data
            const sanitizedTransactions = transactions.map(tx => ({
                id: tx.id,
                date: tx.date,
                type: tx.type,
                symbol: tx.symbol,
                quantity: tx.quantity,
                price: tx.price,
                amount: tx.amount,
                status: tx.status
            }));

            return this.createResponse(200, { 
                success: true, 
                data: sanitizedTransactions,
                count: sanitizedTransactions.length 
            }, headers);

        } catch (error) {
            console.error('Transaction history error:', error);
            return this.createResponse(500, { error: 'Failed to retrieve transactions' }, headers);
        }
    }

    async getStatements(user, headers) {
        try {
            const statements = await this.getClientStatements(user.email);
            
            return this.createResponse(200, { 
                success: true, 
                data: statements.map(stmt => ({
                    id: stmt.id,
                    period: stmt.period,
                    type: stmt.type,
                    downloadUrl: stmt.downloadUrl,
                    generatedDate: stmt.generatedDate
                }))
            }, headers);

        } catch (error) {
            console.error('Statements error:', error);
            return this.createResponse(500, { error: 'Failed to retrieve statements' }, headers);
        }
    }

    // Service handlers
    async getAccountInfo(user, headers) {
        try {
            const accountInfo = await this.getClientAccountInfo(user.email);
            
            // Return sanitized account info
            const sanitizedInfo = {
                accountNumber: this.maskAccountNumber(accountInfo.accountNumber),
                accountType: accountInfo.accountType,
                openDate: accountInfo.openDate,
                status: accountInfo.status,
                primaryContact: {
                    name: accountInfo.primaryContact.name,
                    email: accountInfo.primaryContact.email,
                    phone: this.maskPhoneNumber(accountInfo.primaryContact.phone)
                }
            };

            return this.createResponse(200, { success: true, data: sanitizedInfo }, headers);

        } catch (error) {
            console.error('Account info error:', error);
            return this.createResponse(500, { error: 'Failed to retrieve account information' }, headers);
        }
    }

    async contactAdvisor(user, requestBody, headers) {
        try {
            const { message, requestType, preferredContactMethod } = requestBody;
            
            // Create advisor contact request
            const requestId = await this.createAdvisorRequest({
                clientEmail: user.email,
                message,
                requestType,
                preferredContactMethod,
                createdAt: new Date().toISOString(),
                status: 'pending'
            });

            return this.createResponse(200, { 
                success: true, 
                message: 'Your request has been sent to your advisor',
                requestId 
            }, headers);

        } catch (error) {
            console.error('Contact advisor error:', error);
            return this.createResponse(500, { error: 'Failed to contact advisor' }, headers);
        }
    }

    async requestDocument(user, requestBody, headers) {
        try {
            const { documentType, year, deliveryMethod } = requestBody;
            
            const requestId = await this.createDocumentRequest({
                clientEmail: user.email,
                documentType,
                year,
                deliveryMethod,
                createdAt: new Date().toISOString(),
                status: 'processing'
            });

            return this.createResponse(200, { 
                success: true, 
                message: 'Document request submitted successfully',
                requestId,
                estimatedDelivery: '3-5 business days'
            }, headers);

        } catch (error) {
            console.error('Document request error:', error);
            return this.createResponse(500, { error: 'Failed to process document request' }, headers);
        }
    }

    async createSupportTicket(user, requestBody, headers) {
        try {
            const { subject, description, priority, category } = requestBody;
            
            const ticketId = await this.createSupportTicketRecord({
                clientEmail: user.email,
                subject,
                description,
                priority: priority || 'medium',
                category,
                createdAt: new Date().toISOString(),
                status: 'open'
            });

            return this.createResponse(200, { 
                success: true, 
                message: 'Support ticket created successfully',
                ticketId 
            }, headers);

        } catch (error) {
            console.error('Support ticket error:', error);
            return this.createResponse(500, { error: 'Failed to create support ticket' }, headers);
        }
    }

    async updateProfile(user, requestBody, headers) {
        try {
            const allowedUpdates = ['phone', 'address', 'emergencyContact', 'communicationPreferences'];
            const updates = {};
            
            // Filter allowed updates
            for (const [key, value] of Object.entries(requestBody)) {
                if (allowedUpdates.includes(key)) {
                    updates[key] = value;
                }
            }

            if (Object.keys(updates).length === 0) {
                return this.createResponse(400, { error: 'No valid updates provided' }, headers);
            }

            await this.updateClientProfile(user.email, updates);

            return this.createResponse(200, { 
                success: true, 
                message: 'Profile updated successfully' 
            }, headers);

        } catch (error) {
            console.error('Profile update error:', error);
            return this.createResponse(500, { error: 'Failed to update profile' }, headers);
        }
    }

    // Database operations (secure client database, isolated from internal systems)
    async getClientPortfolioData(email) {
        const params = {
            TableName: 'alhambra-client-portfolios',
            Key: { clientEmail: email }
        };
        const result = await dynamodb.get(params).promise();
        return result.Item;
    }

    async getClientHoldings(email) {
        const params = {
            TableName: 'alhambra-client-holdings',
            IndexName: 'ClientEmailIndex',
            KeyConditionExpression: 'clientEmail = :email',
            ExpressionAttributeValues: { ':email': email }
        };
        const result = await dynamodb.query(params).promise();
        return result.Items || [];
    }

    async getClientPerformance(email) {
        const params = {
            TableName: 'alhambra-client-performance',
            Key: { clientEmail: email }
        };
        const result = await dynamodb.get(params).promise();
        return result.Item || {};
    }

    async getClientTransactions(email) {
        const params = {
            TableName: 'alhambra-client-transactions',
            IndexName: 'ClientEmailIndex',
            KeyConditionExpression: 'clientEmail = :email',
            ExpressionAttributeValues: { ':email': email },
            ScanIndexForward: false, // Most recent first
            Limit: 100
        };
        const result = await dynamodb.query(params).promise();
        return result.Items || [];
    }

    async getClientStatements(email) {
        const params = {
            TableName: 'alhambra-client-statements',
            IndexName: 'ClientEmailIndex',
            KeyConditionExpression: 'clientEmail = :email',
            ExpressionAttributeValues: { ':email': email },
            ScanIndexForward: false
        };
        const result = await dynamodb.query(params).promise();
        return result.Items || [];
    }

    async getClientAccountInfo(email) {
        const params = {
            TableName: 'alhambra-client-accounts',
            Key: { clientEmail: email }
        };
        const result = await dynamodb.get(params).promise();
        return result.Item;
    }

    async createAdvisorRequest(requestData) {
        const requestId = `ADV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const params = {
            TableName: 'alhambra-advisor-requests',
            Item: { requestId, ...requestData }
        };
        await dynamodb.put(params).promise();
        return requestId;
    }

    async createDocumentRequest(requestData) {
        const requestId = `DOC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const params = {
            TableName: 'alhambra-document-requests',
            Item: { requestId, ...requestData }
        };
        await dynamodb.put(params).promise();
        return requestId;
    }

    async createSupportTicketRecord(ticketData) {
        const ticketId = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const params = {
            TableName: 'alhambra-support-tickets',
            Item: { ticketId, ...ticketData }
        };
        await dynamodb.put(params).promise();
        return ticketId;
    }

    async updateClientProfile(email, updates) {
        const updateExpression = [];
        const expressionAttributeValues = {};
        
        for (const [key, value] of Object.entries(updates)) {
            updateExpression.push(`${key} = :${key}`);
            expressionAttributeValues[`:${key}`] = value;
        }

        const params = {
            TableName: 'alhambra-client-profiles',
            Key: { clientEmail: email },
            UpdateExpression: `SET ${updateExpression.join(', ')}, updatedAt = :updatedAt`,
            ExpressionAttributeValues: {
                ...expressionAttributeValues,
                ':updatedAt': new Date().toISOString()
            }
        };
        
        return await dynamodb.update(params).promise();
    }

    // Utility methods
    async validateClientSession(requestHeaders) {
        try {
            const sessionToken = this.extractSessionToken(requestHeaders);
            if (!sessionToken) {
                return { valid: false, error: 'No session token provided' };
            }

            return await this.auth.validateSession(sessionToken);
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    extractSessionToken(headers) {
        const authHeader = headers.Authorization || headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        return authHeader.substring(7);
    }

    maskAccountNumber(accountNumber) {
        if (!accountNumber) return '';
        return accountNumber.replace(/\d(?=\d{4})/g, '*');
    }

    maskPhoneNumber(phoneNumber) {
        if (!phoneNumber) return '';
        return phoneNumber.replace(/(\d{3})\d{3}(\d{4})/, '$1***$2');
    }

    getCORSHeaders(event) {
        const origin = event.headers?.origin || event.headers?.Origin;
        const allowedOrigin = this.allowedOrigins.includes(origin) ? origin : this.allowedOrigins[0];

        return {
            'Access-Control-Allow-Origin': allowedOrigin,
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Credentials': 'true',
            'Content-Type': 'application/json'
        };
    }

    createResponse(statusCode, body, headers) {
        return {
            statusCode,
            headers,
            body: JSON.stringify(body)
        };
    }
}

// Lambda function exports
const handler = new LambdaClientRequestHandler();

exports.handleAuthRequest = async (event, context) => {
    return await handler.handleAuthRequest(event, context);
};

exports.handlePortfolioRequest = async (event, context) => {
    return await handler.handlePortfolioRequest(event, context);
};

exports.handleClientServiceRequest = async (event, context) => {
    return await handler.handleClientServiceRequest(event, context);
};

module.exports = { LambdaClientRequestHandler };
