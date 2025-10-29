'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { 
  Users, 
  FileText, 
  DollarSign, 
  AlertCircle,
  TrendingUp,
  Calendar,
  Download,
  Search,
  Filter,
  Shield,
  Activity
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalTranscripts: number;
  totalRevenue: number;
  monthlyRevenue: number;
  trialUsers: number;
  paidUsers: number;
  totalHoursProcessed: number;
  errorRate: number;
  conversionRate: number;
}

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Check if user is admin
    const checkAdminStatus = async () => {
      if (!user || !user.email) return;
      
      try {
        const response = await fetch('/api/admin/check-role', {
          headers: {
            'x-user-email': user.email,
          },
        });
        const data = await response.json();
        
        if (!data.isAdmin) {
          router.push('/dashboard');
          return;
        }
        
        setIsAdmin(true);
        fetchDashboardStats();
      } catch (error) {
        console.error('Error checking admin status:', error);
        router.push('/dashboard');
      }
    };

    if (user) {
      checkAdminStatus();
    }
  }, [user, router]);

  const fetchDashboardStats = async () => {
    if (!user || !user.email) return;
    
    try {
      setLoadingStats(true);
      const response = await fetch(`/api/admin/stats?range=${timeRange}`, {
        headers: {
          'x-user-email': user.email,
        },
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchDashboardStats();
    }
  }, [timeRange, isAdmin]);

  if (loading || !isAdmin) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading admin dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center">
                <Shield className="w-8 h-8 text-orange-500 mr-3" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                  <p className="text-gray-600 mt-1">Transovo AI Management Console</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Time Range Selector */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="all">All time</option>
              </select>
              <button
                onClick={fetchDashboardStats}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats Grid */}
        {loadingStats ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading statistics...</p>
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Users */}
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-8 h-8 text-blue-500" />
                  <span className="text-sm text-gray-500">{timeRange === 'all' ? 'All Time' : `Last ${timeRange}`}</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{stats.totalUsers.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Total Users</div>
                <div className="mt-2 text-xs text-gray-500">
                  {stats.activeUsers} active • {stats.trialUsers} trial • {stats.paidUsers} paid
                </div>
              </div>

              {/* Total Transcripts */}
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
                <div className="flex items-center justify-between mb-2">
                  <FileText className="w-8 h-8 text-purple-500" />
                  <span className="text-sm text-gray-500">{timeRange === 'all' ? 'All Time' : `Last ${timeRange}`}</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{stats.totalTranscripts.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Transcripts Processed</div>
                <div className="mt-2 text-xs text-gray-500">
                  {stats.totalHoursProcessed.toFixed(1)} hours processed
                </div>
              </div>

              {/* Revenue */}
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-8 h-8 text-green-500" />
                  <span className="text-sm text-gray-500">{timeRange === 'all' ? 'All Time' : `Last ${timeRange}`}</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">${stats.totalRevenue.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Total Revenue</div>
                <div className="mt-2 text-xs text-gray-500">
                  ${stats.monthlyRevenue.toLocaleString()} this month
                </div>
              </div>

              {/* System Health */}
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="w-8 h-8 text-orange-500" />
                  <span className="text-sm text-gray-500">Performance</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">{(100 - stats.errorRate).toFixed(1)}%</div>
                <div className="text-sm text-gray-600">Success Rate</div>
                <div className="mt-2 text-xs text-gray-500">
                  {stats.conversionRate.toFixed(1)}% trial conversion
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <button
                onClick={() => router.push('/admin/users')}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-200 text-left group"
              >
                <div className="flex items-center justify-between mb-4">
                  <Users className="w-10 h-10 text-blue-500 group-hover:scale-110 transition-transform" />
                  <span className="text-blue-500 text-sm font-medium">View All →</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">User Management</h3>
                <p className="text-gray-600 text-sm">
                  View all users, manage subscriptions, and access user analytics
                </p>
              </button>

              <button
                onClick={() => router.push('/admin/transcripts')}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-200 text-left group"
              >
                <div className="flex items-center justify-between mb-4">
                  <FileText className="w-10 h-10 text-purple-500 group-hover:scale-110 transition-transform" />
                  <span className="text-purple-500 text-sm font-medium">View All →</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Transcript Inspector</h3>
                <p className="text-gray-600 text-sm">
                  Review transcripts, track errors, and manage flagged content
                </p>
              </button>

              <button
                onClick={() => router.push('/admin/payments')}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-200 text-left group"
              >
                <div className="flex items-center justify-between mb-4">
                  <DollarSign className="w-10 h-10 text-green-500 group-hover:scale-110 transition-transform" />
                  <span className="text-green-500 text-sm font-medium">View All →</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Financial Dashboard</h3>
                <p className="text-gray-600 text-sm">
                  Track payments, revenue analytics, and subscription metrics
                </p>
              </button>
            </div>

            {/* Additional Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center mb-4">
                  <AlertCircle className="w-6 h-6 text-red-500 mr-3" />
                  <h3 className="text-lg font-bold text-gray-900">Error Tracking</h3>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  Monitor failed transcriptions, API errors, and user-reported issues
                </p>
                <button
                  onClick={() => router.push('/admin/errors')}
                  className="text-orange-500 hover:text-orange-600 font-medium text-sm"
                >
                  View Error Logs →
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center mb-4">
                  <Download className="w-6 h-6 text-blue-500 mr-3" />
                  <h3 className="text-lg font-bold text-gray-900">Export Data</h3>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  Export analytics, user data, and financial reports for business intelligence
                </p>
                <button
                  onClick={() => router.push('/admin/exports')}
                  className="text-orange-500 hover:text-orange-600 font-medium text-sm"
                >
                  Export Tools →
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">Failed to load dashboard statistics</p>
            <button
              onClick={fetchDashboardStats}
              className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              Retry
            </button>
          </div>
        )}
      </div>
      </div>
    </Layout>
  );
}

