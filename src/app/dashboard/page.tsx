'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import RecentTranscriptions from '@/components/RecentTranscriptions';
import RecentContent from '@/components/RecentContent';
import UserStats from '@/components/UserStats';
import TrialStatusBanner from '@/components/TrialStatusBanner';
import { 
  Upload,
  ArrowRight
} from 'lucide-react';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect to landing page if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="p-6 max-w-6xl mx-auto">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back, {user.email?.split('@')[0]}!
            </h1>
            <p className="text-gray-600">Here's your transcription activity overview</p>
          </div>

          {/* Trial Status Banner */}
          <TrialStatusBanner />

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-3xl mx-auto">
            <a 
              href="/transcriptions"
              className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow group relative"
            >
              <div className="absolute top-2 right-2">
                <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-medium">
                  ENHANCED
                </span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center group-hover:from-purple-200 group-hover:to-purple-300 transition-all duration-200">
                  <Upload className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">New Transcription</h3>
                  <p className="text-gray-600 text-sm">Upload audio or video files</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
            </a>

            <a 
              href="/batch-upload"
              className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow group"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-teal-100 to-teal-200 rounded-xl flex items-center justify-center group-hover:from-teal-200 group-hover:to-teal-300 transition-all duration-200">
                  <Upload className="w-6 h-6 text-teal-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">Batch Upload</h3>
                  <p className="text-gray-600 text-sm">Process multiple files at once</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </div>
            </a>
          </div>
          
          {/* Recent Activity */}
          <div className="space-y-6">
            <UserStats />
            <RecentTranscriptions />
            <RecentContent />
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

