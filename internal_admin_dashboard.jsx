// Alhambra Bank & Trust - Internal Admin Dashboard
// Account: 600043382145
// Secure internal system for client management, KYC, fund transfers, and CRM

import React, { useState, useEffect, useContext, createContext } from 'react';
import axios from 'axios';

// Admin Context
const AdminContext = createContext();

// Internal API Configuration (separate from client API)
const INTERNAL_API_CONFIG = {
    baseURL: process.env.REACT_APP_INTERNAL_API_BASE_URL || 'https://internal-api.alhambrabank.com',
    timeout: 30000
};

// Create internal axios instance
const internalApiClient = axios.create(INTERNAL_API_CONFIG);

// Request interceptor for admin authentication
internalApiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('alhambra_admin_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Admin Authentication Provider
export const AdminAuthProvider = ({ children }) => {
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        checkAdminAuth();
    }, []);

    const checkAdminAuth = async () => {
        try {
            const token = localStorage.getItem('alhambra_admin_token');
            if (!token) {
                setLoading(false);
                return;
            }

            const response = await internalApiClient.get('/admin/validate-session');
            if (response.data.valid) {
                setAdmin(response.data.admin);
                setIsAuthenticated(true);
            } else {
                localStorage.removeItem('alhambra_admin_token');
            }
        } catch (error) {
            console.error('Admin auth check failed:', error);
            localStorage.removeItem('alhambra_admin_token');
        } finally {
            setLoading(false);
        }
    };

    const adminLogin = async (username, password, mfaCode = null) => {
        try {
            const response = await internalApiClient.post('/admin/login', {
                username,
                password,
                mfaCode
            });

            if (response.data.success) {
                localStorage.setItem('alhambra_admin_token', response.data.token);
                setAdmin(response.data.admin);
                setIsAuthenticated(true);
            }

            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Admin login failed');
        }
    };

    const adminLogout = async () => {
        try {
            await internalApiClient.post('/admin/logout');
        } catch (error) {
            console.error('Admin logout error:', error);
        } finally {
            localStorage.removeItem('alhambra_admin_token');
            setAdmin(null);
            setIsAuthenticated(false);
            window.location.href = '/admin/login';
        }
    };

    const value = {
        admin,
        isAuthenticated,
        loading,
        adminLogin,
        adminLogout,
        checkAdminAuth
    };

    return (
        <AdminContext.Provider value={value}>
            {children}
        </AdminContext.Provider>
    );
};

// Hook to use admin context
export const useAdmin = () => {
    const context = useContext(AdminContext);
    if (!context) {
        throw new Error('useAdmin must be used within an AdminAuthProvider');
    }
    return context;
};

// Main Admin Dashboard Component
export const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [notifications, setNotifications] = useState([]);
    const { admin } = useAdmin();

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const response = await internalApiClient.get('/admin/notifications');
            setNotifications(response.data.notifications);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    const tabs = [
        { id: 'overview', name: 'Overview', icon: '📊' },
        { id: 'clients', name: 'Client Management', icon: '👥' },
        { id: 'kyc', name: 'KYC Requests', icon: '🔍' },
        { id: 'transfers', name: 'Fund Transfers', icon: '💰' },
        { id: 'communications', name: 'Communications', icon: '💬' },
        { id: 'documents', name: 'Document Center', icon: '📄' },
        { id: 'crm', name: 'CRM', icon: '🎯' },
        { id: 'reports', name: 'Reports', icon: '📈' },
        { id: 'settings', name: 'Settings', icon: '⚙️' }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center">
                            <div className="h-10 w-10 bg-gradient-to-br from-red-800 to-red-900 rounded-lg flex items-center justify-center">
                                <span className="text-lg font-bold text-white">A</span>
                            </div>
                            <div className="ml-3">
                                <h1 className="text-xl font-semibold text-gray-900">
                                    Alhambra Bank & Trust
                                </h1>
                                <p className="text-sm text-gray-500">Internal Admin Dashboard</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                            {/* Notifications */}
                            <div className="relative">
                                <button className="p-2 text-gray-400 hover:text-gray-500">
                                    <span className="sr-only">View notifications</span>
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M9 11h.01M9 8h.01" />
                                    </svg>
                                </span>
                                {notifications.length > 0 && (
                                    <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
                                )}
                            </button>
                            
                            {/* Admin Profile */}
                            <div className="flex items-center">
                                <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-medium text-red-800">
                                        {admin?.name?.charAt(0) || 'A'}
                                    </span>
                                </div>
                                <span className="ml-2 text-sm font-medium text-gray-700">
                                    {admin?.name || 'Admin'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Navigation Tabs */}
                <div className="border-b border-gray-200 mb-8">
                    <nav className="-mb-px flex space-x-8 overflow-x-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                                    activeTab === tab.id
                                        ? 'border-red-500 text-red-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.name}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="tab-content">
                    {activeTab === 'overview' && <OverviewTab />}
                    {activeTab === 'clients' && <ClientManagementTab />}
                    {activeTab === 'kyc' && <KYCRequestsTab />}
                    {activeTab === 'transfers' && <FundTransfersTab />}
                    {activeTab === 'communications' && <CommunicationsTab />}
                    {activeTab === 'documents' && <DocumentCenterTab />}
                    {activeTab === 'crm' && <CRMTab />}
                    {activeTab === 'reports' && <ReportsTab />}
                    {activeTab === 'settings' && <SettingsTab />}
                </div>
            </div>
        </div>
    );
};

// Overview Tab Component
const OverviewTab = () => {
    const [stats, setStats] = useState({
        totalClients: 0,
        pendingKYC: 0,
        pendingTransfers: 0,
        newMessages: 0
    });

    useEffect(() => {
        fetchOverviewStats();
    }, []);

    const fetchOverviewStats = async () => {
        try {
            const response = await internalApiClient.get('/admin/overview-stats');
            setStats(response.data.stats);
        } catch (error) {
            console.error('Failed to fetch overview stats:', error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-8 w-8 bg-blue-100 rounded-md flex items-center justify-center">
                                    <span className="text-blue-600">👥</span>
                                </div>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Total Clients
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {stats.totalClients.toLocaleString()}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-8 w-8 bg-yellow-100 rounded-md flex items-center justify-center">
                                    <span className="text-yellow-600">🔍</span>
                                </div>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Pending KYC
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {stats.pendingKYC}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-8 w-8 bg-green-100 rounded-md flex items-center justify-center">
                                    <span className="text-green-600">💰</span>
                                </div>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Pending Transfers
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {stats.pendingTransfers}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="h-8 w-8 bg-red-100 rounded-md flex items-center justify-center">
                                    <span className="text-red-600">💬</span>
                                </div>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        New Messages
                                    </dt>
                                    <dd className="text-lg font-medium text-gray-900">
                                        {stats.newMessages}
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Recent Activity
                    </h3>
                    <RecentActivityList />
                </div>
            </div>
        </div>
    );
};

// Client Management Tab Component
const ClientManagementTab = () => {
    const [clients, setClients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchClients();
    }, [searchTerm, filterStatus]);

    const fetchClients = async () => {
        setLoading(true);
        try {
            const response = await internalApiClient.get('/admin/clients', {
                params: { search: searchTerm, status: filterStatus }
            });
            setClients(response.data.clients);
        } catch (error) {
            console.error('Failed to fetch clients:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-white shadow rounded-lg p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                    <div className="flex-1 max-w-lg">
                        <input
                            type="text"
                            placeholder="Search clients..."
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex space-x-4">
                        <select
                            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="suspended">Suspended</option>
                        </select>
                        <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                            Add Client
                        </button>
                    </div>
                </div>
            </div>

            {/* Clients Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                <ClientsTable clients={clients} loading={loading} />
            </div>
        </div>
    );
};

// KYC Requests Tab Component
const KYCRequestsTab = () => {
    const [kycRequests, setKycRequests] = useState([]);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchKYCRequests();
    }, []);

    const fetchKYCRequests = async () => {
        try {
            const response = await internalApiClient.get('/admin/kyc-requests');
            setKycRequests(response.data.requests);
        } catch (error) {
            console.error('Failed to fetch KYC requests:', error);
        }
    };

    const handleKYCAction = async (requestId, action, notes = '') => {
        try {
            await internalApiClient.post(`/admin/kyc-requests/${requestId}/action`, {
                action,
                notes
            });
            fetchKYCRequests();
            setShowModal(false);
        } catch (error) {
            console.error('Failed to process KYC action:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        KYC Verification Requests
                    </h3>
                    <KYCRequestsTable 
                        requests={kycRequests}
                        onViewRequest={(request) => {
                            setSelectedRequest(request);
                            setShowModal(true);
                        }}
                    />
                </div>
            </div>

            {/* KYC Review Modal */}
            {showModal && selectedRequest && (
                <KYCReviewModal
                    request={selectedRequest}
                    onClose={() => setShowModal(false)}
                    onAction={handleKYCAction}
                />
            )}
        </div>
    );
};

// Fund Transfers Tab Component
const FundTransfersTab = () => {
    const [transfers, setTransfers] = useState([]);
    const [selectedTransfer, setSelectedTransfer] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchTransfers();
    }, []);

    const fetchTransfers = async () => {
        try {
            const response = await internalApiClient.get('/admin/fund-transfers');
            setTransfers(response.data.transfers);
        } catch (error) {
            console.error('Failed to fetch transfers:', error);
        }
    };

    const handleTransferAction = async (transferId, action, notes = '') => {
        try {
            await internalApiClient.post(`/admin/fund-transfers/${transferId}/action`, {
                action,
                notes
            });
            fetchTransfers();
            setShowModal(false);
        } catch (error) {
            console.error('Failed to process transfer action:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Fund Transfer Requests
                    </h3>
                    <FundTransfersTable 
                        transfers={transfers}
                        onViewTransfer={(transfer) => {
                            setSelectedTransfer(transfer);
                            setShowModal(true);
                        }}
                    />
                </div>
            </div>

            {/* Transfer Review Modal */}
            {showModal && selectedTransfer && (
                <TransferReviewModal
                    transfer={selectedTransfer}
                    onClose={() => setShowModal(false)}
                    onAction={handleTransferAction}
                />
            )}
        </div>
    );
};

// Communications Tab Component
const CommunicationsTab = () => {
    const [communications, setCommunications] = useState([]);
    const [selectedComm, setSelectedComm] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchCommunications();
    }, []);

    const fetchCommunications = async () => {
        try {
            const response = await internalApiClient.get('/admin/communications');
            setCommunications(response.data.communications);
        } catch (error) {
            console.error('Failed to fetch communications:', error);
        }
    };

    const handleReply = async (commId, reply) => {
        try {
            await internalApiClient.post(`/admin/communications/${commId}/reply`, {
                reply
            });
            fetchCommunications();
            setShowModal(false);
        } catch (error) {
            console.error('Failed to send reply:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Client Communications
                    </h3>
                    <CommunicationsTable 
                        communications={communications}
                        onViewCommunication={(comm) => {
                            setSelectedComm(comm);
                            setShowModal(true);
                        }}
                    />
                </div>
            </div>

            {/* Communication Modal */}
            {showModal && selectedComm && (
                <CommunicationModal
                    communication={selectedComm}
                    onClose={() => setShowModal(false)}
                    onReply={handleReply}
                />
            )}
        </div>
    );
};

// Document Center Tab Component
const DocumentCenterTab = () => {
    const [documents, setDocuments] = useState([]);
    const [uploadModal, setUploadModal] = useState(false);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const response = await internalApiClient.get('/admin/documents');
            setDocuments(response.data.documents);
        } catch (error) {
            console.error('Failed to fetch documents:', error);
        }
    };

    const handleDocumentUpload = async (formData) => {
        try {
            await internalApiClient.post('/admin/documents/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            fetchDocuments();
            setUploadModal(false);
        } catch (error) {
            console.error('Failed to upload document:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                            Document Management
                        </h3>
                        <button
                            onClick={() => setUploadModal(true)}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                        >
                            Upload Document
                        </button>
                    </div>
                    <DocumentsTable documents={documents} />
                </div>
            </div>

            {/* Upload Modal */}
            {uploadModal && (
                <DocumentUploadModal
                    onClose={() => setUploadModal(false)}
                    onUpload={handleDocumentUpload}
                />
            )}
        </div>
    );
};

// CRM Tab Component
const CRMTab = () => {
    const [crmData, setCrmData] = useState({
        leads: [],
        opportunities: [],
        activities: []
    });

    useEffect(() => {
        fetchCRMData();
    }, []);

    const fetchCRMData = async () => {
        try {
            const response = await internalApiClient.get('/admin/crm');
            setCrmData(response.data);
        } catch (error) {
            console.error('Failed to fetch CRM data:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Leads */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                            Recent Leads
                        </h3>
                        <CRMLeadsList leads={crmData.leads} />
                    </div>
                </div>

                {/* Opportunities */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                            Opportunities
                        </h3>
                        <CRMOpportunitiesList opportunities={crmData.opportunities} />
                    </div>
                </div>

                {/* Activities */}
                <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                            Recent Activities
                        </h3>
                        <CRMActivitiesList activities={crmData.activities} />
                    </div>
                </div>
            </div>
        </div>
    );
};

// Reports Tab Component
const ReportsTab = () => {
    const [reportType, setReportType] = useState('client-summary');
    const [dateRange, setDateRange] = useState({
        startDate: '',
        endDate: ''
    });

    const generateReport = async () => {
        try {
            const response = await internalApiClient.post('/admin/reports/generate', {
                type: reportType,
                dateRange
            });
            
            // Handle report download
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${reportType}-report.pdf`;
            a.click();
        } catch (error) {
            console.error('Failed to generate report:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Generate Reports
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Report Type
                            </label>
                            <select
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                                value={reportType}
                                onChange={(e) => setReportType(e.target.value)}
                            >
                                <option value="client-summary">Client Summary</option>
                                <option value="kyc-status">KYC Status</option>
                                <option value="fund-transfers">Fund Transfers</option>
                                <option value="communications">Communications</option>
                                <option value="portfolio-performance">Portfolio Performance</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Date
                            </label>
                            <input
                                type="date"
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                                value={dateRange.startDate}
                                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                End Date
                            </label>
                            <input
                                type="date"
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                                value={dateRange.endDate}
                                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                            />
                        </div>
                    </div>
                    
                    <button
                        onClick={generateReport}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                        Generate Report
                    </button>
                </div>
            </div>
        </div>
    );
};

// Settings Tab Component
const SettingsTab = () => {
    const [settings, setSettings] = useState({
        kycAutoApproval: false,
        transferLimits: {
            daily: 50000,
            monthly: 500000
        },
        notificationSettings: {
            email: true,
            sms: false,
            push: true
        }
    });

    const updateSettings = async () => {
        try {
            await internalApiClient.put('/admin/settings', settings);
            alert('Settings updated successfully');
        } catch (error) {
            console.error('Failed to update settings:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        System Settings
                    </h3>
                    
                    <div className="space-y-6">
                        {/* KYC Settings */}
                        <div>
                            <h4 className="text-md font-medium text-gray-900 mb-2">KYC Settings</h4>
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    className="rounded border-gray-300 text-red-600 shadow-sm focus:border-red-300 focus:ring focus:ring-red-200 focus:ring-opacity-50"
                                    checked={settings.kycAutoApproval}
                                    onChange={(e) => setSettings(prev => ({ 
                                        ...prev, 
                                        kycAutoApproval: e.target.checked 
                                    }))}
                                />
                                <span className="ml-2 text-sm text-gray-700">
                                    Enable automatic KYC approval for low-risk clients
                                </span>
                            </label>
                        </div>

                        {/* Transfer Limits */}
                        <div>
                            <h4 className="text-md font-medium text-gray-900 mb-2">Transfer Limits</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Daily Limit ($)
                                    </label>
                                    <input
                                        type="number"
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                                        value={settings.transferLimits.daily}
                                        onChange={(e) => setSettings(prev => ({
                                            ...prev,
                                            transferLimits: { ...prev.transferLimits, daily: parseInt(e.target.value) }
                                        }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Monthly Limit ($)
                                    </label>
                                    <input
                                        type="number"
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                                        value={settings.transferLimits.monthly}
                                        onChange={(e) => setSettings(prev => ({
                                            ...prev,
                                            transferLimits: { ...prev.transferLimits, monthly: parseInt(e.target.value) }
                                        }))}
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={updateSettings}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                        >
                            Save Settings
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper Components (Tables, Modals, etc.)
const ClientsTable = ({ clients, loading }) => {
    if (loading) {
        return <div className="p-4 text-center">Loading clients...</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Client
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Account
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Portfolio Value
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {clients.map((client) => (
                        <tr key={client.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                    <div className="h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                                        <span className="text-sm font-medium text-gray-700">
                                            {client.name.charAt(0)}
                                        </span>
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-900">
                                            {client.name}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {client.email}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {client.accountNumber}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    client.status === 'active' 
                                        ? 'bg-green-100 text-green-800'
                                        : client.status === 'pending'
                                        ? 'bg-yellow-100 text-yellow-800'
                                        : 'bg-red-100 text-red-800'
                                }`}>
                                    {client.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                ${client.portfolioValue?.toLocaleString() || '0'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button className="text-red-600 hover:text-red-900 mr-3">
                                    View
                                </button>
                                <button className="text-gray-600 hover:text-gray-900">
                                    Edit
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const KYCRequestsTable = ({ requests, onViewRequest }) => (
    <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Request Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Risk Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                    </th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {requests.map((request) => (
                    <tr key={request.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                                {request.clientName}
                            </div>
                            <div className="text-sm text-gray-500">
                                {request.clientEmail}
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(request.requestDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                request.status === 'pending' 
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : request.status === 'approved'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                            }`}>
                                {request.status}
                            </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                request.riskLevel === 'low' 
                                    ? 'bg-green-100 text-green-800'
                                    : request.riskLevel === 'medium'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                            }`}>
                                {request.riskLevel}
                            </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button 
                                onClick={() => onViewRequest(request)}
                                className="text-red-600 hover:text-red-900"
                            >
                                Review
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const RecentActivityList = () => {
    const [activities, setActivities] = useState([]);

    useEffect(() => {
        // Fetch recent activities
        const fetchActivities = async () => {
            try {
                const response = await internalApiClient.get('/admin/recent-activities');
                setActivities(response.data.activities);
            } catch (error) {
                console.error('Failed to fetch activities:', error);
            }
        };
        fetchActivities();
    }, []);

    return (
        <div className="flow-root">
            <ul className="-mb-8">
                {activities.map((activity, activityIdx) => (
                    <li key={activity.id}>
                        <div className="relative pb-8">
                            {activityIdx !== activities.length - 1 ? (
                                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" />
                            ) : null}
                            <div className="relative flex space-x-3">
                                <div className="h-8 w-8 bg-gray-400 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs">{activity.type.charAt(0)}</span>
                                </div>
                                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                    <div>
                                        <p className="text-sm text-gray-500">
                                            {activity.description}
                                        </p>
                                    </div>
                                    <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                        {activity.timestamp}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

// Additional helper components would be implemented similarly...
// (KYCReviewModal, TransferReviewModal, CommunicationModal, etc.)

export default {
    AdminAuthProvider,
    useAdmin,
    AdminDashboard
};
