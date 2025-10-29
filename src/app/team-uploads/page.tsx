'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Upload, Users, FileText, Clock, CheckCircle, AlertCircle, XCircle, Plus, Settings } from 'lucide-react';

interface TeamUpload {
  id: string;
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
  fileSize: string;
  duration?: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress?: number;
  teamName: string;
  assignedTo?: string[];
  priority: 'low' | 'medium' | 'high';
}

export default function TeamUploadsPage() {
  const { user, loading } = useAuth();
  const [uploads, setUploads] = useState<TeamUpload[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Mock data - replace with actual API call
  useEffect(() => {
    const mockData: TeamUpload[] = [
      {
        id: '1',
        fileName: 'client-meeting-2024-01-15.wav',
        uploadedBy: 'John Smith',
        uploadedAt: '2024-01-15T10:30:00Z',
        fileSize: '45.2 MB',
        duration: '32:15',
        status: 'completed',
        teamName: 'Sales Team',
        assignedTo: ['Sarah Johnson', 'Mike Wilson'],
        priority: 'high'
      },
      {
        id: '2',
        fileName: 'product-review-session.mp3',
        uploadedBy: 'Sarah Johnson',
        uploadedAt: '2024-01-15T14:20:00Z',
        fileSize: '28.7 MB',
        duration: '25:43',
        status: 'processing',
        progress: 65,
        teamName: 'Product Team',
        assignedTo: ['Alex Chen'],
        priority: 'medium'
      },
      {
        id: '3',
        fileName: 'user-interview-batch-3.wav',
        uploadedBy: 'Alex Chen',
        uploadedAt: '2024-01-15T16:45:00Z',
        fileSize: '67.8 MB',
        status: 'uploading',
        progress: 23,
        teamName: 'UX Research',
        priority: 'low'
      },
      {
        id: '4',
        fileName: 'quarterly-planning.wav',
        uploadedBy: 'Mike Wilson',
        uploadedAt: '2024-01-14T09:15:00Z',
        fileSize: '89.3 MB',
        duration: '58:32',
        status: 'failed',
        teamName: 'Management',
        priority: 'high'
      }
    ];
    setUploads(mockData);
  }, []);

  const teams = ['all', ...Array.from(new Set(uploads.map(upload => upload.teamName)))];

  const filteredUploads = uploads.filter(upload => {
    const matchesTeam = selectedTeam === 'all' || upload.teamName === selectedTeam;
    const matchesStatus = statusFilter === 'all' || upload.status === statusFilter;
    return matchesTeam && matchesStatus;
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'uploading': return <Upload className="w-5 h-5 text-blue-500" />;
      case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'uploading': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
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
            <p className="text-gray-600">You need to be signed in to access team uploads.</p>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Team Uploads</h1>
                <p className="text-gray-600">Manage and track team transcription uploads</p>
              </div>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Upload</span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Uploads</p>
                <p className="text-2xl font-bold text-gray-900">{uploads.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {uploads.filter(u => u.status === 'completed').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Processing</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {uploads.filter(u => u.status === 'processing' || u.status === 'uploading').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">
                  {uploads.filter(u => u.status === 'failed').length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="sm:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {teams.map(team => (
                  <option key={team} value={team}>
                    {team === 'all' ? 'All Teams' : team}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="uploading">Uploading</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Uploads List */}
        <div className="space-y-4">
          {filteredUploads.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No uploads found</h3>
              <p className="text-gray-600">
                {selectedTeam !== 'all' || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Team uploads will appear here'
                }
              </p>
            </div>
          ) : (
            filteredUploads.map((upload) => (
              <div key={upload.id} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      {getStatusIcon(upload.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {upload.fileName}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(upload.status)}`}>
                          {upload.status}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(upload.priority)}`}>
                          {upload.priority} priority
                        </span>
                      </div>

                      <div className="flex items-center space-x-6 text-sm text-gray-600 mb-3">
                        <span>By {upload.uploadedBy}</span>
                        <span>{upload.teamName}</span>
                        <span>{upload.fileSize}</span>
                        {upload.duration && <span>{upload.duration}</span>}
                        <span>{formatDate(upload.uploadedAt)}</span>
                      </div>

                      {upload.assignedTo && upload.assignedTo.length > 0 && (
                        <div className="flex items-center space-x-2 mb-3">
                          <span className="text-sm text-gray-600">Assigned to:</span>
                          <div className="flex space-x-1">
                            {upload.assignedTo.map((person, index) => (
                              <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                                {person}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {(upload.status === 'uploading' || upload.status === 'processing') && upload.progress && (
                        <div className="mb-2">
                          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                            <span>{upload.status === 'uploading' ? 'Uploading' : 'Processing'}</span>
                            <span>{upload.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-300 ${
                                upload.status === 'uploading' ? 'bg-blue-500' : 'bg-yellow-500'
                              }`}
                              style={{ width: `${upload.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Upload Modal Placeholder */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">New Team Upload</h3>
            <p className="text-gray-600 mb-4">Upload functionality would be implemented here.</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
