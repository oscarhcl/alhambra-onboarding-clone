// Alhambra Bank & Trust - AWS Cognito Authentication System
// Account: 600043382145
// Secure client authentication with OTP verification

const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Configure AWS SDK
AWS.config.update({
    region: 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

const cognito = new AWS.CognitoIdentityServiceProvider();
const sns = new AWS.SNS();
const dynamodb = new AWS.DynamoDB.DocumentClient();

class AlhambraCognitoAuth {
    constructor() {
        this.userPoolId = process.env.COGNITO_USER_POOL_ID;
        this.clientId = process.env.COGNITO_CLIENT_ID;
        this.clientSecret = process.env.COGNITO_CLIENT_SECRET;
        this.jwtSecret = process.env.JWT_SECRET;
        
        // Security configuration
        this.maxLoginAttempts = 3;
        this.otpExpiryMinutes = 5;
        this.sessionTimeoutMinutes = 30;
    }

    /**
     * Initialize client registration with phone verification
     */
    async registerClient(userData) {
        try {
            const { email, phone, firstName, lastName, dateOfBirth, ssn } = userData;
            
            // Validate input data
            this.validateClientData(userData);
            
            // Create user in Cognito
            const params = {
                UserPoolId: this.userPoolId,
                Username: email,
                UserAttributes: [
                    { Name: 'email', Value: email },
                    { Name: 'phone_number', Value: phone },
                    { Name: 'given_name', Value: firstName },
                    { Name: 'family_name', Value: lastName },
                    { Name: 'custom:date_of_birth', Value: dateOfBirth },
                    { Name: 'custom:account_status', Value: 'pending_verification' },
                    { Name: 'custom:client_type', Value: 'portfolio_client' }
                ],
                TemporaryPassword: this.generateSecurePassword(),
                MessageAction: 'SUPPRESS' // We'll handle OTP manually
            };

            const result = await cognito.adminCreateUser(params).promise();
            
            // Store encrypted SSN separately in DynamoDB for KYC
            await this.storeKYCData(email, {
                ssn: this.encryptSensitiveData(ssn),
                registrationDate: new Date().toISOString(),
                verificationStatus: 'pending'
            });

            // Send OTP for phone verification
            const otpCode = await this.sendOTPVerification(phone, 'registration');
            
            return {
                success: true,
                message: 'Registration initiated. Please verify your phone number.',
                userId: result.User.Username,
                otpSent: true
            };

        } catch (error) {
            console.error('Registration error:', error);
            throw new Error(`Registration failed: ${error.message}`);
        }
    }

    /**
     * Client login with multi-factor authentication
     */
    async clientLogin(email, password, deviceInfo = {}) {
        try {
            // Check for rate limiting
            await this.checkRateLimit(email);
            
            // Initial authentication with Cognito
            const authParams = {
                AuthFlow: 'ADMIN_NO_SRP_AUTH',
                UserPoolId: this.userPoolId,
                ClientId: this.clientId,
                AuthParameters: {
                    USERNAME: email,
                    PASSWORD: password,
                    SECRET_HASH: this.calculateSecretHash(email)
                }
            };

            const authResult = await cognito.adminInitiateAuth(authParams).promise();
            
            if (authResult.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
                return {
                    success: false,
                    challenge: 'NEW_PASSWORD_REQUIRED',
                    session: authResult.Session,
                    message: 'Please set a new password'
                };
            }

            // Get user details
            const userDetails = await this.getUserDetails(email);
            
            // Send OTP for second factor authentication
            const otpCode = await this.sendOTPVerification(userDetails.phone_number, 'login');
            
            // Store temporary session
            const tempSessionId = crypto.randomUUID();
            await this.storeTempSession(tempSessionId, {
                email,
                cognitoTokens: authResult.AuthenticationResult,
                deviceInfo,
                otpRequired: true,
                expiresAt: Date.now() + (this.otpExpiryMinutes * 60 * 1000)
            });

            return {
                success: true,
                message: 'OTP sent to your registered phone number',
                tempSessionId,
                otpRequired: true,
                expiresIn: this.otpExpiryMinutes * 60
            };

        } catch (error) {
            await this.recordFailedAttempt(email);
            console.error('Login error:', error);
            throw new Error(`Login failed: ${error.message}`);
        }
    }

    /**
     * Verify OTP and complete authentication
     */
    async verifyOTPAndLogin(tempSessionId, otpCode) {
        try {
            // Retrieve temporary session
            const tempSession = await this.getTempSession(tempSessionId);
            if (!tempSession || tempSession.expiresAt < Date.now()) {
                throw new Error('Session expired. Please login again.');
            }

            // Verify OTP
            const isValidOTP = await this.verifyOTP(tempSession.email, otpCode);
            if (!isValidOTP) {
                throw new Error('Invalid OTP code');
            }

            // Create secure session token
            const sessionToken = this.createSecureSessionToken({
                email: tempSession.email,
                sessionId: crypto.randomUUID(),
                loginTime: new Date().toISOString(),
                deviceInfo: tempSession.deviceInfo
            });

            // Store active session
            await this.storeActiveSession(sessionToken.sessionId, {
                email: tempSession.email,
                cognitoTokens: tempSession.cognitoTokens,
                loginTime: new Date().toISOString(),
                lastActivity: new Date().toISOString(),
                deviceInfo: tempSession.deviceInfo,
                expiresAt: Date.now() + (this.sessionTimeoutMinutes * 60 * 1000)
            });

            // Clean up temporary session
            await this.deleteTempSession(tempSessionId);
            
            // Reset failed attempts
            await this.resetFailedAttempts(tempSession.email);

            return {
                success: true,
                message: 'Authentication successful',
                sessionToken: sessionToken.token,
                expiresIn: this.sessionTimeoutMinutes * 60,
                user: {
                    email: tempSession.email,
                    sessionId: sessionToken.sessionId
                }
            };

        } catch (error) {
            console.error('OTP verification error:', error);
            throw new Error(`OTP verification failed: ${error.message}`);
        }
    }

    /**
     * Send OTP via SMS
     */
    async sendOTPVerification(phoneNumber, purpose = 'login') {
        try {
            const otpCode = this.generateOTPCode();
            
            // Store OTP in DynamoDB with expiry
            await this.storeOTP(phoneNumber, otpCode, purpose);
            
            // Send SMS via SNS
            const message = `Alhambra Bank & Trust: Your verification code is ${otpCode}. Valid for ${this.otpExpiryMinutes} minutes. Do not share this code.`;
            
            const smsParams = {
                PhoneNumber: phoneNumber,
                Message: message,
                MessageAttributes: {
                    'AWS.SNS.SMS.SenderID': {
                        DataType: 'String',
                        StringValue: 'AlhambraBank'
                    },
                    'AWS.SNS.SMS.SMSType': {
                        DataType: 'String',
                        StringValue: 'Transactional'
                    }
                }
            };

            await sns.publish(smsParams).promise();
            
            console.log(`OTP sent to ${phoneNumber} for ${purpose}`);
            return otpCode; // Only for testing, remove in production

        } catch (error) {
            console.error('OTP sending error:', error);
            throw new Error('Failed to send OTP');
        }
    }

    /**
     * Verify OTP code
     */
    async verifyOTP(identifier, providedOTP) {
        try {
            const storedOTP = await this.getStoredOTP(identifier);
            
            if (!storedOTP || storedOTP.expiresAt < Date.now()) {
                return false;
            }

            const isValid = storedOTP.code === providedOTP;
            
            if (isValid) {
                // Delete used OTP
                await this.deleteOTP(identifier);
            }

            return isValid;

        } catch (error) {
            console.error('OTP verification error:', error);
            return false;
        }
    }

    /**
     * Validate session token and return user info
     */
    async validateSession(sessionToken) {
        try {
            // Verify JWT token
            const decoded = jwt.verify(sessionToken, this.jwtSecret);
            
            // Check active session in DynamoDB
            const session = await this.getActiveSession(decoded.sessionId);
            
            if (!session || session.expiresAt < Date.now()) {
                throw new Error('Session expired');
            }

            // Update last activity
            await this.updateSessionActivity(decoded.sessionId);

            return {
                valid: true,
                user: {
                    email: session.email,
                    sessionId: decoded.sessionId,
                    loginTime: session.loginTime
                }
            };

        } catch (error) {
            console.error('Session validation error:', error);
            return { valid: false, error: error.message };
        }
    }

    /**
     * Logout and invalidate session
     */
    async logout(sessionToken) {
        try {
            const decoded = jwt.verify(sessionToken, this.jwtSecret);
            await this.deleteActiveSession(decoded.sessionId);
            
            return { success: true, message: 'Logged out successfully' };

        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: error.message };
        }
    }

    // Helper methods
    validateClientData(userData) {
        const required = ['email', 'phone', 'firstName', 'lastName', 'dateOfBirth', 'ssn'];
        for (const field of required) {
            if (!userData[field]) {
                throw new Error(`${field} is required`);
            }
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
            throw new Error('Invalid email format');
        }

        // Phone validation (US format)
        const phoneRegex = /^\+1[0-9]{10}$/;
        if (!phoneRegex.test(userData.phone)) {
            throw new Error('Phone number must be in format +1XXXXXXXXXX');
        }

        // SSN validation (basic)
        const ssnRegex = /^\d{3}-\d{2}-\d{4}$/;
        if (!ssnRegex.test(userData.ssn)) {
            throw new Error('SSN must be in format XXX-XX-XXXX');
        }
    }

    generateSecurePassword() {
        const length = 12;
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return password;
    }

    generateOTPCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    calculateSecretHash(username) {
        return crypto
            .createHmac('SHA256', this.clientSecret)
            .update(username + this.clientId)
            .digest('base64');
    }

    createSecureSessionToken(payload) {
        const sessionId = crypto.randomUUID();
        const token = jwt.sign(
            { ...payload, sessionId },
            this.jwtSecret,
            { expiresIn: `${this.sessionTimeoutMinutes}m` }
        );
        return { token, sessionId };
    }

    encryptSensitiveData(data) {
        const algorithm = 'aes-256-gcm';
        const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipher(algorithm, key);
        
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        return {
            encrypted,
            iv: iv.toString('hex'),
            tag: cipher.getAuthTag().toString('hex')
        };
    }

    // DynamoDB operations
    async storeKYCData(email, kycData) {
        const params = {
            TableName: 'alhambra-kyc-data',
            Item: {
                email,
                ...kycData,
                createdAt: new Date().toISOString()
            }
        };
        return await dynamodb.put(params).promise();
    }

    async storeOTP(identifier, code, purpose) {
        const params = {
            TableName: 'alhambra-otp-codes',
            Item: {
                identifier,
                code,
                purpose,
                createdAt: Date.now(),
                expiresAt: Date.now() + (this.otpExpiryMinutes * 60 * 1000)
            },
            ConditionExpression: 'attribute_not_exists(identifier)'
        };
        return await dynamodb.put(params).promise();
    }

    async getStoredOTP(identifier) {
        const params = {
            TableName: 'alhambra-otp-codes',
            Key: { identifier }
        };
        const result = await dynamodb.get(params).promise();
        return result.Item;
    }

    async deleteOTP(identifier) {
        const params = {
            TableName: 'alhambra-otp-codes',
            Key: { identifier }
        };
        return await dynamodb.delete(params).promise();
    }

    async storeTempSession(sessionId, sessionData) {
        const params = {
            TableName: 'alhambra-temp-sessions',
            Item: {
                sessionId,
                ...sessionData,
                createdAt: Date.now()
            }
        };
        return await dynamodb.put(params).promise();
    }

    async getTempSession(sessionId) {
        const params = {
            TableName: 'alhambra-temp-sessions',
            Key: { sessionId }
        };
        const result = await dynamodb.get(params).promise();
        return result.Item;
    }

    async deleteTempSession(sessionId) {
        const params = {
            TableName: 'alhambra-temp-sessions',
            Key: { sessionId }
        };
        return await dynamodb.delete(params).promise();
    }

    async storeActiveSession(sessionId, sessionData) {
        const params = {
            TableName: 'alhambra-active-sessions',
            Item: {
                sessionId,
                ...sessionData,
                createdAt: Date.now()
            }
        };
        return await dynamodb.put(params).promise();
    }

    async getActiveSession(sessionId) {
        const params = {
            TableName: 'alhambra-active-sessions',
            Key: { sessionId }
        };
        const result = await dynamodb.get(params).promise();
        return result.Item;
    }

    async updateSessionActivity(sessionId) {
        const params = {
            TableName: 'alhambra-active-sessions',
            Key: { sessionId },
            UpdateExpression: 'SET lastActivity = :timestamp, expiresAt = :expiresAt',
            ExpressionAttributeValues: {
                ':timestamp': new Date().toISOString(),
                ':expiresAt': Date.now() + (this.sessionTimeoutMinutes * 60 * 1000)
            }
        };
        return await dynamodb.update(params).promise();
    }

    async deleteActiveSession(sessionId) {
        const params = {
            TableName: 'alhambra-active-sessions',
            Key: { sessionId }
        };
        return await dynamodb.delete(params).promise();
    }

    async checkRateLimit(email) {
        const params = {
            TableName: 'alhambra-login-attempts',
            Key: { email }
        };
        const result = await dynamodb.get(params).promise();
        
        if (result.Item && result.Item.attempts >= this.maxLoginAttempts) {
            const lockoutTime = 15 * 60 * 1000; // 15 minutes
            if (Date.now() - result.Item.lastAttempt < lockoutTime) {
                throw new Error('Account temporarily locked due to multiple failed attempts');
            }
        }
    }

    async recordFailedAttempt(email) {
        const params = {
            TableName: 'alhambra-login-attempts',
            Key: { email },
            UpdateExpression: 'ADD attempts :inc SET lastAttempt = :timestamp',
            ExpressionAttributeValues: {
                ':inc': 1,
                ':timestamp': Date.now()
            }
        };
        return await dynamodb.update(params).promise();
    }

    async resetFailedAttempts(email) {
        const params = {
            TableName: 'alhambra-login-attempts',
            Key: { email }
        };
        return await dynamodb.delete(params).promise();
    }

    async getUserDetails(email) {
        const params = {
            UserPoolId: this.userPoolId,
            Username: email
        };
        const result = await cognito.adminGetUser(params).promise();
        
        const attributes = {};
        result.UserAttributes.forEach(attr => {
            attributes[attr.Name] = attr.Value;
        });
        
        return attributes;
    }
}

module.exports = AlhambraCognitoAuth;
