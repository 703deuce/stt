'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { User, Mail, Calendar, Edit2, Save, X } from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { auth } from '@/config/firebase';

export default function ProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || user.email?.split('@')[0] || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!user || !auth.currentUser) return;
    
    try {
      setLoading(true);
      await updateProfile(auth.currentUser, {
        displayName: displayName.trim()
      });
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(user?.displayName || user?.email?.split('@')[0] || '');
    setIsEditing(false);
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="p-4 sm:p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Profile</h1>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Profile
                  </button>
                )}
              </div>
              <p className="text-sm sm:text-base text-gray-600">Manage your account information</p>
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-4 sm:p-6">
                {/* Avatar Section */}
                <div className="flex items-center space-x-4 mb-6 sm:mb-8">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-purple-600 to-teal-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-2xl sm:text-3xl font-medium">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="flex-1">
                    {isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Display Name
                          </label>
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full sm:max-w-md border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Enter your name"
                          />
                        </div>
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={handleSave}
                            disabled={loading}
                            className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium disabled:opacity-50"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </button>
                          <button
                            onClick={handleCancel}
                            className="inline-flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                          {user?.displayName || user?.email?.split('@')[0] || 'User'}
                        </h2>
                        <p className="text-gray-600">{user?.email}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Profile Information */}
                <div className="space-y-4 sm:space-y-6">
                  <div className="flex items-start space-x-3 sm:space-x-4 p-4 bg-gray-50 rounded-lg">
                    <Mail className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-500 mb-1">Email Address</div>
                      <div className="text-base text-gray-900 break-all">{user?.email}</div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 sm:space-x-4 p-4 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-500 mb-1">Account Created</div>
                      <div className="text-base text-gray-900">
                        {user?.metadata?.creationTime 
                          ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                          : 'Unknown'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 sm:space-x-4 p-4 bg-gray-50 rounded-lg">
                    <User className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-500 mb-1">User ID</div>
                      <div className="text-xs sm:text-sm text-gray-600 font-mono break-all">{user?.uid}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

