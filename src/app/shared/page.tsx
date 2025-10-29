'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { FileText, Users, Share2, Download, Eye, Clock, User, Search, Filter } from 'lucide-react';

interface SharedTranscription {
  id: string;
  title: string;
  sharedBy: string;
  sharedAt: string;
  duration: string;
  status: 'completed' | 'processing' | 'failed';
  permissions: 'view' | 'edit' | 'admin';
  teamName: string;
  lastAccessed?: string;
}

export default function SharedTranscriptionsPage() {
  const { user, loading } = useAuth();
  const [transcriptions, setTranscriptions] = useState<SharedTranscription[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'processing' | 'failed'>('all');
  const [filterPermission, setFilterPermission] = useState<'all' | 'view' | 'edit' | 'admin'>('all');

  // Mock data - replace with actual API call
  useEffect(() => {
    const mockData: SharedTranscription[] = [
      {
        id: '1',
        title: 'Team Meeting - Q4 Planning',
        sharedBy: 'John Smith',
        sharedAt: '2024-01-15T10:30:00Z',
        duration: '45:32',
        status: 'completed',
        permissions: 'edit',
        teamName: 'Product Team',
        lastAccessed: '2024-01-16T09:15:00Z'
      },
      {
        id: '2',
        title: 'Client Interview - User Research',
        sharedBy: 'Sarah Johnson',
        sharedAt: '2024-01-14T14:20:00Z',
        duration: '32:18',
        status: 'completed',
        permissions: 'view',
        teamName: 'UX Research',
        lastAccessed: '2024-01-15T11:45:00Z'
      },
      {
        id: '3',
        title: 'Sales Call - Enterprise Demo',
        sharedBy: 'Mike Wilson',
        sharedAt: '2024-01-13T16:45:00Z',
        duration: '28:45',
        status: 'processing',
        permissions: 'admin',
        teamName: 'Sales Team'
      }
    ];
    setTranscriptions(mockData);
  }, []);

  const filteredTranscriptions = transcriptions.filter(transcript => {
    const matchesSearch = transcript.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transcript.sharedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transcript.teamName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || transcript.status === filterStatus;
    const matchesPermission = filterPermission === 'all' || transcript.permissions === filterPermission;
    
    return matchesSearch && matchesStatus && matchesPermission;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPermissionColor = (permission: string) => {
    switch (permission) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'edit': return 'bg-blue-100 text-blue-800';
      case 'view': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Please sign in</h2>
            <p className="text-gray-600">You need to be signed in to access shared transcriptions.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Share2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Shared Transcriptions</h1>
              <p className="text-gray-600">Transcriptions shared with you by team members</p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search transcriptions, people, or teams..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="sm:w-40">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Permission Filter */}
            <div className="sm:w-40">
              <select
                value={filterPermission}
                onChange={(e) => setFilterPermission(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Permissions</option>
                <option value="admin">Admin</option>
                <option value="edit">Edit</option>
                <option value="view">View Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Transcriptions List */}
        <div className="space-y-4">
          {filteredTranscriptions.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No shared transcriptions found</h3>
              <p className="text-gray-600">
                {searchTerm || filterStatus !== 'all' || filterPermission !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Transcriptions shared with you will appear here'
                }
              </p>
            </div>
          ) : (
            filteredTranscriptions.map((transcript) => (
              <div key={transcript.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{transcript.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transcript.status)}`}>
                        {transcript.status}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPermissionColor(transcript.permissions)}`}>
                        {transcript.permissions}
                      </span>
                    </div>

                    <div className="flex items-center space-x-6 text-sm text-gray-600 mb-3">
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span>{transcript.sharedBy}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{transcript.teamName}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{transcript.duration}</span>
                      </div>
                    </div>

                    <div className="text-sm text-gray-500">
                      <span>Shared {formatDate(transcript.sharedAt)}</span>
                      {transcript.lastAccessed && (
                        <span className="ml-4">Last accessed {formatDate(transcript.lastAccessed)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary Stats */}
        {filteredTranscriptions.length > 0 && (
          <div className="mt-8 bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-900">{filteredTranscriptions.length}</div>
                <div className="text-sm text-gray-600">Total Shared</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {filteredTranscriptions.filter(t => t.status === 'completed').length}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {filteredTranscriptions.filter(t => t.permissions === 'edit' || t.permissions === 'admin').length}
                </div>
                <div className="text-sm text-gray-600">Editable</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {new Set(filteredTranscriptions.map(t => t.teamName)).size}
                </div>
                <div className="text-sm text-gray-600">Teams</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
