'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { 
  Users, 
  Search, 
  FileText, 
  Sparkles, 
  ChevronDown, 
  ChevronRight, 
  Eye, 
  Calendar, 
  Clock,
  Plus,
  Edit,
  Trash2,
  Filter,
  ArrowUpDown,
  UserPlus,
  Settings,
  Mail,
  Shield,
  Crown,
  Zap,
  Key,
  Send
} from 'lucide-react';

interface User {
  userId: string;
  email: string;
  displayName: string;
  createdAt: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  minutesUsed: number;
  minutesLimit: number;
  wordsUsedThisMonth: number;
  monthlyWordLimit: number;
  boostWords: number;
  trial?: {
    minutes: number;
    used: number;
  };
  stats: {
    transcriptions: {
      total: number;
      recent: number;
      completed: number;
      failed: number;
      processing: number;
    };
    content: {
      total: number;
      completed: number;
    };
  };
  recentActivity: Array<{
    id: string;
    filename: string;
    status: string;
    createdAt: string;
  }>;
}

interface UserTranscription {
  id: string;
  name: string;
  status: string;
  timestamp: string;
  duration: number;
  userId: string;
}

interface UserContent {
  id: string;
  title: string;
  status: string;
  timestamp: string;
  content_type_name: string;
  word_count: number;
  userId: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userTranscriptions, setUserTranscriptions] = useState<Record<string, UserTranscription[]>>({});
  const [userContent, setUserContent] = useState<Record<string, UserContent[]>>({});
  const [loadingUserData, setLoadingUserData] = useState<Record<string, boolean>>({});
  
  // Filtering and sorting
  const [sortBy, setSortBy] = useState<'email' | 'createdAt' | 'subscriptionStatus' | 'transcriptions' | 'content' | 'wordsUsed'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'trial' | 'active' | 'cancelled' | 'expired'>('all');
  const [filterPlan, setFilterPlan] = useState<'all' | 'trial' | 'transcription-only' | 'creator' | 'pro' | 'studio'>('all');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [showEmailResetModal, setShowEmailResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/monitoring/users?window=43200'); // Last 30 days
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.users);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    if (loadingUserData[userId]) return;
    
    setLoadingUserData(prev => ({ ...prev, [userId]: true }));
    
    try {
      // Fetch user's transcriptions
      const transResponse = await fetch(`/api/admin/user-transcriptions?userId=${userId}`);
      const transData = await transResponse.json();
      
      if (transData.success) {
        setUserTranscriptions(prev => ({ ...prev, [userId]: transData.transcriptions }));
      }
      
      // Fetch user's content
      const contentResponse = await fetch(`/api/admin/user-content?userId=${userId}`);
      const contentData = await contentResponse.json();
      
      if (contentData.success) {
        setUserContent(prev => ({ ...prev, [userId]: contentData.content }));
      }
      
    } catch (error) {
      console.error('Failed to fetch user details:', error);
    } finally {
      setLoadingUserData(prev => ({ ...prev, [userId]: false }));
    }
  };

  const toggleUserExpand = (userId: string) => {
    if (expandedUser === userId) {
      setExpandedUser(null);
    } else {
      setExpandedUser(userId);
      if (!userTranscriptions[userId] && !userContent[userId]) {
        fetchUserDetails(userId);
      }
    }
  };

  const viewTranscription = (userId: string, transcriptionId: string) => {
    // Open in new tab to avoid losing the admin view
    window.open(`/admin/view-transcription?userId=${userId}&id=${transcriptionId}`, '_blank');
  };

  const viewContent = (userId: string, contentId: string) => {
    // Open in new tab
    window.open(`/admin/view-content?userId=${userId}&id=${contentId}`, '_blank');
  };

  // CRUD Operations
  const createUser = async (userData: any) => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      
      if (response.ok) {
        await fetchUsers(); // Refresh the list
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const updateUser = async (userId: string, userData: any) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      
      if (response.ok) {
        await fetchUsers(); // Refresh the list
        setShowEditModal(false);
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchUsers(); // Refresh the list
        setShowDeleteModal(false);
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const openPasswordResetModal = (user: User) => {
    setSelectedUser(user);
    setShowPasswordResetModal(true);
  };

  const openEmailResetModal = (user: User) => {
    setSelectedUser(user);
    setShowEmailResetModal(true);
  };

  // Password reset operations
  const resetPasswordDirect = async (userId: string, newPassword: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });
      
      if (response.ok) {
        setShowPasswordResetModal(false);
        setSelectedUser(null);
        alert('Password reset successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to reset password: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to reset password:', error);
      alert('Failed to reset password');
    }
  };

  const sendPasswordResetEmail = async (userId: string, email: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/send-reset-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      if (response.ok) {
        setShowEmailResetModal(false);
        setSelectedUser(null);
        alert('Password reset email sent successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to send reset email: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to send reset email:', error);
      alert('Failed to send reset email');
    }
  };

  // Filtering and sorting logic
  const filteredUsers = users
    .filter(user => {
      // Search filter
      const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.userId.includes(searchTerm);
      
      // Status filter
      const matchesStatus = filterStatus === 'all' || 
                           (filterStatus === 'trial' && user.subscriptionStatus === 'trial') ||
                           (filterStatus === 'active' && user.subscriptionStatus === 'active') ||
                           (filterStatus === 'cancelled' && user.subscriptionStatus === 'cancelled') ||
                           (filterStatus === 'expired' && user.subscriptionStatus === 'expired');
      
      // Plan filter
      const matchesPlan = filterPlan === 'all' || 
                         (filterPlan === 'trial' && user.subscriptionStatus === 'trial') ||
                         (filterPlan === user.subscriptionPlan);
      
      return matchesSearch && matchesStatus && matchesPlan;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'email':
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'subscriptionStatus':
          aValue = a.subscriptionStatus;
          bValue = b.subscriptionStatus;
          break;
        case 'transcriptions':
          aValue = a.stats.transcriptions.total;
          bValue = b.stats.transcriptions.total;
          break;
        case 'content':
          aValue = a.stats.content.total;
          bValue = b.stats.content.total;
          break;
        case 'wordsUsed':
          aValue = a.wordsUsedThisMonth;
          bValue = b.wordsUsedThisMonth;
          break;
        default:
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading users...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-purple-600" />
            User Management
          </h1>
          <p className="mt-2 text-gray-600">View and manage all users, their transcriptions, and generated content</p>
        </div>

        {/* Search and Controls */}
        <div className="mb-6 bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by email, name, or user ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  showFilters 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Create User
              </button>
              <button
                onClick={fetchUsers}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="createdAt">Join Date</option>
                    <option value="email">Email</option>
                    <option value="subscriptionStatus">Status</option>
                    <option value="transcriptions">Transcriptions</option>
                    <option value="content">Content</option>
                    <option value="wordsUsed">Words Used</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Statuses</option>
                    <option value="trial">Trial</option>
                    <option value="active">Active</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Plan</label>
                  <select
                    value={filterPlan}
                    onChange={(e) => setFilterPlan(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Plans</option>
                    <option value="trial">Trial</option>
                    <option value="transcription-only">Transcription Only</option>
                    <option value="creator">Creator</option>
                    <option value="pro">Pro</option>
                    <option value="studio">Studio</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              <p className="text-sm text-gray-600">Total Users</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {users.filter(u => u.subscriptionStatus === 'active' || u.subscriptionStatus === 'trial').length}
              </p>
              <p className="text-sm text-gray-600">Active Users</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {users.reduce((sum, u) => sum + u.stats.transcriptions.total, 0)}
              </p>
              <p className="text-sm text-gray-600">Total Transcriptions</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {users.reduce((sum, u) => sum + u.stats.content.total, 0)}
              </p>
              <p className="text-sm text-gray-600">Total Content</p>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="space-y-4">
          {filteredUsers.map((user) => (
            <div key={user.userId} className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* User Header */}
              <div 
                className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleUserExpand(user.userId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {user.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">{user.email}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.subscriptionStatus === 'active' 
                            ? 'bg-green-100 text-green-800'
                            : user.subscriptionStatus === 'trial'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.subscriptionStatus === 'trial' ? 'Trial' : user.subscriptionPlan}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        ID: {user.userId} • Joined: {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{user.stats.transcriptions.total}</p>
                      <p className="text-xs text-gray-600">Transcriptions</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">{user.stats.content.total}</p>
                      <p className="text-xs text-gray-600">Content</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700">
                        {user.wordsUsedThisMonth.toLocaleString()} / {user.monthlyWordLimit.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-600">Words Used</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(user);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit User"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openPasswordResetModal(user);
                        }}
                        className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Reset Password"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEmailResetModal(user);
                        }}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Send Reset Email"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteModal(user);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {expandedUser === user.userId ? (
                        <ChevronDown className="w-6 h-6 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded User Details */}
              {expandedUser === user.userId && (
                <div className="border-t border-gray-200 bg-gray-50 p-6">
                  {loadingUserData[user.userId] ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">Loading user data...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Transcriptions */}
                      <div>
                        <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <FileText className="w-5 h-5 text-blue-600" />
                          Transcriptions ({userTranscriptions[user.userId]?.length || 0})
                        </h4>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {userTranscriptions[user.userId]?.length > 0 ? (
                            userTranscriptions[user.userId].map((trans) => (
                              <div
                                key={trans.id}
                                className="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h5 className="font-medium text-gray-900">{trans.name}</h5>
                                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        {new Date(trans.timestamp).toLocaleString()}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        {Math.round(trans.duration / 60)}m
                                      </span>
                                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                        trans.status === 'completed' 
                                          ? 'bg-green-100 text-green-800'
                                          : trans.status === 'processing'
                                          ? 'bg-blue-100 text-blue-800'
                                          : 'bg-red-100 text-red-800'
                                      }`}>
                                        {trans.status}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => viewTranscription(user.userId, trans.id)}
                                    className="ml-4 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                                  >
                                    <Eye className="w-4 h-4" />
                                    View
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-500 text-center py-8">No transcriptions yet</p>
                          )}
                        </div>
                      </div>

                      {/* Generated Content */}
                      <div>
                        <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-purple-600" />
                          Generated Content ({userContent[user.userId]?.length || 0})
                        </h4>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {userContent[user.userId]?.length > 0 ? (
                            userContent[user.userId].map((content) => (
                              <div
                                key={content.id}
                                className="bg-white rounded-lg p-4 border border-gray-200 hover:border-purple-300 transition-colors"
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h5 className="font-medium text-gray-900">{content.title}</h5>
                                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        {new Date(content.timestamp).toLocaleString()}
                                      </span>
                                      <span className="text-purple-600 font-medium">
                                        {content.content_type_name}
                                      </span>
                                      <span>{content.word_count} words</span>
                                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                        content.status === 'completed' 
                                          ? 'bg-green-100 text-green-800'
                                          : content.status === 'generating'
                                          ? 'bg-blue-100 text-blue-800'
                                          : 'bg-red-100 text-red-800'
                                      }`}>
                                        {content.status}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => viewContent(user.userId, content.id)}
                                    className="ml-4 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1"
                                  >
                                    <Eye className="w-4 h-4" />
                                    View
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-500 text-center py-8">No content generated yet</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredUsers.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No users found matching "{searchTerm}"</p>
          </div>
        )}

        {/* Create User Modal */}
        {showCreateModal && (
          <CreateUserModal
            onClose={() => setShowCreateModal(false)}
            onCreate={createUser}
          />
        )}

        {/* Edit User Modal */}
        {showEditModal && selectedUser && (
          <EditUserModal
            user={selectedUser}
            onClose={() => {
              setShowEditModal(false);
              setSelectedUser(null);
            }}
            onUpdate={updateUser}
          />
        )}

        {/* Delete User Modal */}
        {showDeleteModal && selectedUser && (
          <DeleteUserModal
            user={selectedUser}
            onClose={() => {
              setShowDeleteModal(false);
              setSelectedUser(null);
            }}
            onDelete={deleteUser}
          />
        )}

        {/* Password Reset Modal */}
        {showPasswordResetModal && selectedUser && (
          <PasswordResetModal
            user={selectedUser}
            onClose={() => {
              setShowPasswordResetModal(false);
              setSelectedUser(null);
            }}
            onReset={resetPasswordDirect}
          />
        )}

        {/* Email Reset Modal */}
        {showEmailResetModal && selectedUser && (
          <EmailResetModal
            user={selectedUser}
            onClose={() => {
              setShowEmailResetModal(false);
              setSelectedUser(null);
            }}
            onSend={sendPasswordResetEmail}
          />
        )}
      </div>
    </Layout>
  );
}

// Create User Modal Component
function CreateUserModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: any) => void }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    subscriptionPlan: 'trial',
    subscriptionStatus: 'trial',
    monthlyWordLimit: 0,
    boostWords: 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <UserPlus className="w-6 h-6 text-green-600" />
          Create New User
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Plan</label>
            <select
              value={formData.subscriptionPlan}
              onChange={(e) => setFormData({ ...formData, subscriptionPlan: e.target.value, subscriptionStatus: e.target.value === 'trial' ? 'trial' : 'active' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="trial">Trial</option>
              <option value="transcription-only">Transcription Only</option>
              <option value="creator">Creator</option>
              <option value="pro">Pro</option>
              <option value="studio">Studio</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Word Limit</label>
            <input
              type="number"
              value={formData.monthlyWordLimit}
              onChange={(e) => setFormData({ ...formData, monthlyWordLimit: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Boost Words</label>
            <input
              type="number"
              value={formData.boostWords}
              onChange={(e) => setFormData({ ...formData, boostWords: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Create User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit User Modal Component
function EditUserModal({ user, onClose, onUpdate }: { user: User; onClose: () => void; onUpdate: (userId: string, data: any) => void }) {
  const [formData, setFormData] = useState({
    email: user.email,
    displayName: user.displayName || '',
    subscriptionPlan: user.subscriptionPlan,
    subscriptionStatus: user.subscriptionStatus,
    monthlyWordLimit: user.monthlyWordLimit,
    boostWords: user.boostWords,
    wordsUsedThisMonth: user.wordsUsedThisMonth
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(user.userId, formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Edit className="w-6 h-6 text-blue-600" />
          Edit User
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input
              type="text"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Plan</label>
            <select
              value={formData.subscriptionPlan}
              onChange={(e) => setFormData({ ...formData, subscriptionPlan: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="trial">Trial</option>
              <option value="transcription-only">Transcription Only</option>
              <option value="creator">Creator</option>
              <option value="pro">Pro</option>
              <option value="studio">Studio</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Status</label>
            <select
              value={formData.subscriptionStatus}
              onChange={(e) => setFormData({ ...formData, subscriptionStatus: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="trial">Trial</option>
              <option value="active">Active</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Word Limit</label>
            <input
              type="number"
              value={formData.monthlyWordLimit}
              onChange={(e) => setFormData({ ...formData, monthlyWordLimit: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Words Used This Month</label>
            <input
              type="number"
              value={formData.wordsUsedThisMonth}
              onChange={(e) => setFormData({ ...formData, wordsUsedThisMonth: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Boost Words</label>
            <input
              type="number"
              value={formData.boostWords}
              onChange={(e) => setFormData({ ...formData, boostWords: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Update User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete User Modal Component
function DeleteUserModal({ user, onClose, onDelete }: { user: User; onClose: () => void; onDelete: (userId: string) => void }) {
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = () => {
    if (confirmText === 'DELETE') {
      onDelete(user.userId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-600">
          <Trash2 className="w-6 h-6" />
          Delete User
        </h2>
        <div className="mb-4">
          <p className="text-gray-700 mb-2">
            Are you sure you want to delete this user? This action cannot be undone.
          </p>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="font-medium">{user.email}</p>
            <p className="text-sm text-gray-600">ID: {user.userId}</p>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type <span className="font-bold text-red-600">DELETE</span> to confirm:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            placeholder="DELETE"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={confirmText !== 'DELETE'}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Delete User
          </button>
        </div>
      </div>
    </div>
  );
}

// Password Reset Modal Component
function PasswordResetModal({ user, onClose, onReset }: { user: User; onClose: () => void; onReset: (userId: string, newPassword: string) => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    onReset(user.userId, newPassword);
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
    setConfirmPassword(password);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-orange-600">
          <Key className="w-6 h-6" />
          Reset Password
        </h2>
        <div className="mb-4">
          <p className="text-gray-700 mb-2">
            Reset password for:
          </p>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="font-medium">{user.email}</p>
            <p className="text-sm text-gray-600">ID: {user.userId}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              placeholder="Confirm new password"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={generatePassword}
              className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              Generate Secure Password
            </button>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Reset Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Email Reset Modal Component
function EmailResetModal({ user, onClose, onSend }: { user: User; onClose: () => void; onSend: (userId: string, email: string) => void }) {
  const [email, setEmail] = useState(user.email);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSend(user.userId, email);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-green-600">
          <Send className="w-6 h-6" />
          Send Password Reset Email
        </h2>
        <div className="mb-4">
          <p className="text-gray-700 mb-2">
            Send a password reset email to:
          </p>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="font-medium">{user.email}</p>
            <p className="text-sm text-gray-600">ID: {user.userId}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Enter email address"
            />
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This will send a password reset email to the user. They will need to click the link in the email to reset their password.
            </p>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Send Reset Email
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

