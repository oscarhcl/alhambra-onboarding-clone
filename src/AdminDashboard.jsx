import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('clients');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // State for different sections
  const [clients, setClients] = useState([]);
  const [kycRequests, setKycRequests] = useState([]);
  const [fundTransfers, setFundTransfers] = useState([]);
  const [communications, setCommunications] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [statistics, setStatistics] = useState({});

  // Login form state
  const [loginForm, setLoginForm] = useState({
    username: 'admin',
    password: ''
  });

  // API configuration
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // Add auth token to requests
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Handle auth errors
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('adminToken');
        setIsAuthenticated(false);
        setUser(null);
      }
      return Promise.reject(error);
    }
  );

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      verifyToken(token);
    }
  }, []);

  // Load data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated]);

  const verifyToken = async (token) => {
    try {
      const response = await api.get('/auth/verify');
      setIsAuthenticated(true);
      setUser(response.data.user);
    } catch (error) {
      localStorage.removeItem('adminToken');
      setIsAuthenticated(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', loginForm);
      const { token, user } = response.data;
      
      localStorage.setItem('adminToken', token);
      setIsAuthenticated(true);
      setUser(user);
      setSuccess('Login successful!');
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
    setUser(null);
    setActiveTab('clients');
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [
        statsResponse,
        clientsResponse,
        kycResponse,
        transfersResponse,
        communicationsResponse,
        documentsResponse
      ] = await Promise.all([
        api.get('/dashboard/statistics'),
        api.get('/clients'),
        api.get('/kyc-requests'),
        api.get('/fund-transfers'),
        api.get('/communications'),
        api.get('/documents')
      ]);

      setStatistics(statsResponse.data);
      setClients(clientsResponse.data);
      setKycRequests(kycResponse.data);
      setFundTransfers(transfersResponse.data);
      setCommunications(communicationsResponse.data);
      setDocuments(documentsResponse.data);
    } catch (error) {
      setError('Failed to load dashboard data');
      console.error('Dashboard data loading error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateClientStatus = async (clientId, status) => {
    try {
      await api.patch(`/clients/${clientId}`, { status });
      await loadDashboardData();
      setSuccess('Client status updated successfully');
    } catch (error) {
      setError('Failed to update client status');
    }
  };

  const approveKycRequest = async (requestId) => {
    try {
      await api.patch(`/kyc-requests/${requestId}`, { 
        status: 'approved',
        reviewer_id: user.id,
        reviewed_at: new Date().toISOString()
      });
      await loadDashboardData();
      setSuccess('KYC request approved successfully');
    } catch (error) {
      setError('Failed to approve KYC request');
    }
  };

  const rejectKycRequest = async (requestId) => {
    try {
      await api.patch(`/kyc-requests/${requestId}`, { 
        status: 'rejected',
        reviewer_id: user.id,
        reviewed_at: new Date().toISOString()
      });
      await loadDashboardData();
      setSuccess('KYC request rejected');
    } catch (error) {
      setError('Failed to reject KYC request');
    }
  };

  const approveFundTransfer = async (transferId) => {
    try {
      await api.patch(`/fund-transfers/${transferId}`, { 
        status: 'approved',
        approver_id: user.id,
        approved_at: new Date().toISOString()
      });
      await loadDashboardData();
      setSuccess('Fund transfer approved successfully');
    } catch (error) {
      setError('Failed to approve fund transfer');
    }
  };

  const rejectFundTransfer = async (transferId) => {
    try {
      await api.patch(`/fund-transfers/${transferId}`, { 
        status: 'rejected',
        approver_id: user.id,
        approved_at: new Date().toISOString()
      });
      await loadDashboardData();
      setSuccess('Fund transfer rejected');
    } catch (error) {
      setError('Failed to reject fund transfer');
    }
  };

  const markCommunicationRead = async (commId) => {
    try {
      await api.patch(`/communications/${commId}`, { 
        status: 'read',
        admin_id: user.id
      });
      await loadDashboardData();
    } catch (error) {
      setError('Failed to mark communication as read');
    }
  };

  // Login form component
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-red-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-red-800 to-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">A</span>
            </div>
            <h1 className="text-2xl font-bold text-red-900 mb-2">Admin Dashboard</h1>
            <p className="text-gray-600">Internal Management System</p>
            <p className="text-sm text-gray-500 mt-2">AWS Account: 600043382145</p>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-800 text-white py-2 px-4 rounded-md hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
            >
              {loading ? 'Signing In...' : 'Access Dashboard'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">🔒 Secure Internal Access Only</p>
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard component
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-red-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mr-3">
                <span className="text-red-800 text-lg font-bold">A</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">Admin Dashboard</h1>
                <p className="text-red-200 text-sm">Internal Management System - AWS Account: 600043382145</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-red-200">Welcome, {user?.username}</span>
              <button
                onClick={handleLogout}
                className="bg-red-700 hover:bg-red-600 px-4 py-2 rounded-md text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Statistics Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Clients</p>
                <p className="text-2xl font-bold text-red-900">{statistics.totalClients || 1247}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending KYC</p>
                <p className="text-2xl font-bold text-red-900">{statistics.pendingKyc || 23}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Fund Transfers</p>
                <p className="text-2xl font-bold text-red-900">{statistics.fundTransfers || 8}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">New Messages</p>
                <p className="text-2xl font-bold text-red-900">{statistics.newMessages || 15}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'clients', name: 'Clients', icon: '👥' },
                { id: 'kyc', name: 'KYC Requests', icon: '📋' },
                { id: 'transfers', name: 'Fund Transfers', icon: '💰' },
                { id: 'communications', name: 'Communications', icon: '💬' },
                { id: 'documents', name: 'Documents', icon: '📄' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                {success}
              </div>
            )}

            {/* Clients Tab */}
            {activeTab === 'clients' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Client Management</h2>
                  <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
                    Add Client
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Portfolio Value</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {clients.map((client) => (
                        <tr key={client.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {client.first_name} {client.last_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{client.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              client.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {client.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${client.portfolio_value?.toLocaleString() || '0.00'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-blue-600 hover:text-blue-900 mr-3">View</button>
                            <button className="text-green-600 hover:text-green-900">Edit</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* KYC Requests Tab */}
            {activeTab === 'kyc' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">KYC Request Management</h2>
                  <div className="space-x-2">
                    <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
                      Approve Selected
                    </button>
                    <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
                      Reject Selected
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {kycRequests.map((request) => (
                    <div key={request.id} className="bg-gray-50 rounded-lg p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {request.client_name} - {request.request_type}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Submitted: {new Date(request.submitted_at).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600">
                            Documents: {request.documents_uploaded?.join(', ') || 'None'}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                            Review
                          </button>
                          <button 
                            onClick={() => approveKycRequest(request.id)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => rejectKycRequest(request.id)}
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fund Transfers Tab */}
            {activeTab === 'transfers' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Fund Transfer Authorization</h2>
                  <div className="space-x-2">
                    <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700">
                      Approve All
                    </button>
                    <button className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700">
                      Hold for Review
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {fundTransfers.map((transfer) => (
                    <div key={transfer.id} className="bg-gray-50 rounded-lg p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {transfer.transfer_type.toUpperCase()} Transfer - ${transfer.amount?.toLocaleString()}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            From: {transfer.client_name} ({transfer.from_account})
                          </p>
                          <p className="text-sm text-gray-600">
                            To: {transfer.to_account}
                          </p>
                          <p className="text-sm text-gray-600">
                            Requested: {new Date(transfer.requested_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => approveFundTransfer(transfer.id)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button 
                            onClick={() => rejectFundTransfer(transfer.id)}
                            className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                          >
                            Reject
                          </button>
                          <button className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700">
                            Hold
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Communications Tab */}
            {activeTab === 'communications' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Client Communications</h2>
                  <div className="space-x-2">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                      Mark All Read
                    </button>
                    <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
                      Compose Message
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {communications.map((comm) => (
                    <div key={comm.id} className={`rounded-lg p-6 border-l-4 ${
                      comm.status === 'unread' 
                        ? 'bg-blue-50 border-blue-400' 
                        : 'bg-gray-50 border-gray-300'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{comm.subject}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            From: {comm.client_email}
                          </p>
                          <p className="text-sm text-gray-700 mt-2">{comm.message}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            Received: {new Date(comm.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => markCommunicationRead(comm.id)}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                          >
                            Reply
                          </button>
                          <button className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700">
                            Archive
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Document Management</h2>
                  <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
                    Upload Document
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {documents.map((doc) => (
                        <tr key={doc.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{doc.document_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{doc.client_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{doc.document_type}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              doc.status === 'approved' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {doc.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(doc.uploaded_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button className="text-blue-600 hover:text-blue-900 mr-3">View</button>
                            <button className="text-green-600 hover:text-green-900 mr-3">Download</button>
                            <button className="text-red-600 hover:text-red-900">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
