// Alhambra Bank & Trust - Client Website Integration with AWS Cognito
// Account: 600043382145
// Secure client authentication and portfolio access

import React, { useState, useEffect, useContext, createContext } from 'react';
import axios from 'axios';

// Authentication Context
const AuthContext = createContext();

// AWS Cognito Configuration
const COGNITO_CONFIG = {
    userPoolId: process.env.REACT_APP_COGNITO_USER_POOL_ID,
    clientId: process.env.REACT_APP_COGNITO_CLIENT_ID,
    region: 'us-east-1'
};

// API Configuration
const API_CONFIG = {
    baseURL: process.env.REACT_APP_API_BASE_URL || 'https://api.alhambrabank.com',
    timeout: 30000
};

// Create axios instance with interceptors
const apiClient = axios.create(API_CONFIG);

// Request interceptor to add auth token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('alhambra_session_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('alhambra_session_token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Authentication Provider Component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            const token = localStorage.getItem('alhambra_session_token');
            if (!token) {
                setLoading(false);
                return;
            }

            const response = await apiClient.get('/auth/validate-session');
            if (response.data.valid) {
                setUser(response.data.user);
                setIsAuthenticated(true);
            } else {
                localStorage.removeItem('alhambra_session_token');
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('alhambra_session_token');
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password, deviceInfo = {}) => {
        try {
            const response = await apiClient.post('/auth/login', {
                email,
                password,
                deviceInfo: {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    language: navigator.language,
                    ...deviceInfo
                }
            });

            if (response.data.success && response.data.otpRequired) {
                return {
                    success: true,
                    otpRequired: true,
                    tempSessionId: response.data.tempSessionId,
                    message: response.data.message
                };
            }

            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Login failed');
        }
    };

    const verifyOTP = async (tempSessionId, otpCode) => {
        try {
            const response = await apiClient.post('/auth/verify-otp', {
                tempSessionId,
                otpCode
            });

            if (response.data.success) {
                localStorage.setItem('alhambra_session_token', response.data.sessionToken);
                setUser(response.data.user);
                setIsAuthenticated(true);
            }

            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.error || 'OTP verification failed');
        }
    };

    const register = async (userData) => {
        try {
            const response = await apiClient.post('/auth/register', userData);
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Registration failed');
        }
    };

    const logout = async () => {
        try {
            await apiClient.post('/auth/logout');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('alhambra_session_token');
            setUser(null);
            setIsAuthenticated(false);
            window.location.href = '/';
        }
    };

    const value = {
        user,
        isAuthenticated,
        loading,
        login,
        verifyOTP,
        register,
        logout,
        checkAuthStatus
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Hook to use auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Login Component
export const LoginForm = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [otpData, setOtpData] = useState({
        tempSessionId: '',
        otpCode: '',
        showOTP: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const { login, verifyOTP } = useAuth();

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleOTPChange = (e) => {
        const { value } = e.target;
        setOtpData(prev => ({
            ...prev,
            otpCode: value.replace(/\D/g, '').slice(0, 6)
        }));
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const result = await login(formData.email, formData.password);
            
            if (result.otpRequired) {
                setOtpData({
                    tempSessionId: result.tempSessionId,
                    otpCode: '',
                    showOTP: true
                });
                setMessage(result.message);
            } else if (result.success) {
                window.location.href = '/dashboard';
            }
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOTPSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const result = await verifyOTP(otpData.tempSessionId, otpData.otpCode);
            
            if (result.success) {
                window.location.href = '/dashboard';
            }
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                {/* Alhambra Bank Logo */}
                <div className="text-center">
                    <div className="mx-auto h-16 w-16 bg-gradient-to-br from-red-800 to-red-900 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-2xl font-bold text-white">A</span>
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        Alhambra Bank & Trust
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Secure Client Portal Access
                    </p>
                </div>

                {!otpData.showOTP ? (
                    /* Login Form */
                    <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                        Email Address
                                    </label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm"
                                        placeholder="Enter your email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                        Password
                                    </label>
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm"
                                        placeholder="Enter your password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                                    <span className="block sm:inline">{error}</span>
                                </div>
                            )}

                            {message && (
                                <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative">
                                    <span className="block sm:inline">{message}</span>
                                </div>
                            )}

                            <div className="mt-6">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-800 hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <div className="flex items-center">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Signing In...
                                        </div>
                                    ) : (
                                        'Sign In'
                                    )}
                                </button>
                            </div>
                        </div>
                    </form>
                ) : (
                    /* OTP Verification Form */
                    <form className="mt-8 space-y-6" onSubmit={handleOTPSubmit}>
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <div className="text-center mb-4">
                                <div className="mx-auto h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <h3 className="mt-2 text-lg font-medium text-gray-900">
                                    Verify Your Identity
                                </h3>
                                <p className="mt-1 text-sm text-gray-600">
                                    Enter the 6-digit code sent to your registered phone number
                                </p>
                            </div>

                            <div>
                                <label htmlFor="otpCode" className="block text-sm font-medium text-gray-700 text-center">
                                    Verification Code
                                </label>
                                <input
                                    id="otpCode"
                                    name="otpCode"
                                    type="text"
                                    required
                                    maxLength="6"
                                    className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500 text-center text-lg tracking-widest sm:text-xl"
                                    placeholder="000000"
                                    value={otpData.otpCode}
                                    onChange={handleOTPChange}
                                />
                            </div>

                            {error && (
                                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                                    <span className="block sm:inline">{error}</span>
                                </div>
                            )}

                            <div className="mt-6 space-y-3">
                                <button
                                    type="submit"
                                    disabled={loading || otpData.otpCode.length !== 6}
                                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-800 hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <div className="flex items-center">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                            Verifying...
                                        </div>
                                    ) : (
                                        'Verify & Continue'
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setOtpData({ tempSessionId: '', otpCode: '', showOTP: false })}
                                    className="w-full text-sm text-red-600 hover:text-red-500"
                                >
                                    ← Back to Login
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                {/* Security Notice */}
                <div className="text-center">
                    <p className="text-xs text-gray-500">
                        🔒 Your connection is secured with bank-grade encryption
                    </p>
                </div>
            </div>
        </div>
    );
};

// Registration Component
export const RegistrationForm = () => {
    const [formData, setFormData] = useState({
        email: '',
        phone: '',
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        ssn: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const { register } = useAuth();

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const result = await register(formData);
            if (result.success) {
                setSuccess(true);
            }
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center py-12 px-4">
                <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
                    <div className="mx-auto h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Registration Successful!</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Please verify your phone number with the code we sent you.
                    </p>
                    <a
                        href="/login"
                        className="inline-flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-800 hover:bg-red-900"
                    >
                        Continue to Login
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center py-12 px-4">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <div className="mx-auto h-16 w-16 bg-gradient-to-br from-red-800 to-red-900 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-2xl font-bold text-white">A</span>
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        Open Your Account
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Join Alhambra Bank & Trust
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                                    <input
                                        name="firstName"
                                        type="text"
                                        required
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                                        value={formData.firstName}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
                                    <input
                                        name="lastName"
                                        type="text"
                                        required
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                                        value={formData.lastName}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                                <input
                                    name="phone"
                                    type="tel"
                                    required
                                    placeholder="+1XXXXXXXXXX"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                                <input
                                    name="dateOfBirth"
                                    type="date"
                                    required
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                                    value={formData.dateOfBirth}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Social Security Number</label>
                                <input
                                    name="ssn"
                                    type="text"
                                    required
                                    placeholder="XXX-XX-XXXX"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                                    value={formData.ssn}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}

                        <div className="mt-6">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-800 hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                            >
                                {loading ? 'Creating Account...' : 'Create Account'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Protected Route Component
export const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-800"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        window.location.href = '/login';
        return null;
    }

    return children;
};

// Portfolio Service Hook
export const usePortfolio = () => {
    const [portfolioData, setPortfolioData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchPortfolioSummary = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiClient.get('/portfolio/summary');
            setPortfolioData(response.data.data);
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to fetch portfolio data');
        } finally {
            setLoading(false);
        }
    };

    const fetchHoldings = async () => {
        try {
            const response = await apiClient.get('/portfolio/holdings');
            return response.data.data;
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to fetch holdings');
        }
    };

    const fetchPerformance = async () => {
        try {
            const response = await apiClient.get('/portfolio/performance');
            return response.data.data;
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to fetch performance data');
        }
    };

    const fetchTransactions = async () => {
        try {
            const response = await apiClient.get('/portfolio/transactions');
            return response.data.data;
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to fetch transactions');
        }
    };

    return {
        portfolioData,
        loading,
        error,
        fetchPortfolioSummary,
        fetchHoldings,
        fetchPerformance,
        fetchTransactions
    };
};

// Client Services Hook
export const useClientServices = () => {
    const contactAdvisor = async (message, requestType, preferredContactMethod) => {
        try {
            const response = await apiClient.post('/services/contact-advisor', {
                message,
                requestType,
                preferredContactMethod
            });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to contact advisor');
        }
    };

    const requestDocument = async (documentType, year, deliveryMethod) => {
        try {
            const response = await apiClient.post('/services/document-request', {
                documentType,
                year,
                deliveryMethod
            });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to request document');
        }
    };

    const createSupportTicket = async (subject, description, priority, category) => {
        try {
            const response = await apiClient.post('/services/support-ticket', {
                subject,
                description,
                priority,
                category
            });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Failed to create support ticket');
        }
    };

    return {
        contactAdvisor,
        requestDocument,
        createSupportTicket
    };
};

export default {
    AuthProvider,
    useAuth,
    LoginForm,
    RegistrationForm,
    ProtectedRoute,
    usePortfolio,
    useClientServices
};
