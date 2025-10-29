'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Activity, AlertTriangle, CheckCircle, Clock, TrendingUp, XCircle } from 'lucide-react';

interface SystemHealth {
  status: 'healthy' | 'warning' | 'error';
  timestamp: string;
  responseTime: string;
  services: {
    api: string;
    database: string;
    firebase: string;
  };
}

interface JobStats {
  status: string;
  timestamp: string;
  timeWindow: string;
  transcriptions: {
    total: number;
    completed: number;
    failed: number;
    processing: number;
    failureRate: string;
    stuckJobs: number;
    avgCompletionTime: string;
  };
  content: {
    total: number;
    completed: number;
    failed: number;
    generating: number;
    failureRate: string;
    stuckJobs: number;
    avgCompletionTime: string;
  };
  alerts: Array<{
    type: string;
    severity: string;
    message: string;
    jobId?: string;
  }>;
}

export default function MonitoringPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [jobStats, setJobStats] = useState<JobStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeWindow, setTimeWindow] = useState(60);

  useEffect(() => {
    fetchMonitoringData();
  }, [timeWindow]);

  const fetchMonitoringData = async () => {
    try {
      console.log('🔄 Fetching monitoring data...');
      
      // Fetch health check
      const healthRes = await fetch('/api/health');
      const healthData = await healthRes.json();
      console.log('✅ Health data:', healthData);
      setHealth(healthData);

      // Fetch job statistics
      const jobsRes = await fetch(`/api/monitoring/jobs?window=${timeWindow}`);
      const jobsData = await jobsRes.json();
      console.log('✅ Jobs data:', jobsData);
      
      // Only set jobStats if we got valid data
      if (jobsData.status !== 'error') {
        setJobStats(jobsData);
      } else {
        console.error('❌ Jobs API returned error:', jobsData.error);
        // Set empty stats on error
        setJobStats({
          status: 'error',
          timestamp: new Date().toISOString(),
          timeWindow: `${timeWindow} minutes`,
          transcriptions: {
            total: 0,
            completed: 0,
            failed: 0,
            processing: 0,
            failureRate: '0%',
            stuckJobs: 0,
            avgCompletionTime: 'N/A'
          },
          content: {
            total: 0,
            completed: 0,
            failed: 0,
            generating: 0,
            failureRate: '0%',
            stuckJobs: 0,
            avgCompletionTime: 'N/A'
          },
          alerts: []
        });
      }

      setLoading(false);
    } catch (error) {
      console.error('❌ Failed to fetch monitoring data:', error);
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'operational':
        return 'text-green-500';
      case 'warning':
      case 'degraded':
        return 'text-yellow-500';
      case 'error':
      case 'unhealthy':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'operational':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error':
      case 'unhealthy':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading monitoring data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Activity className="w-8 h-8 text-blue-600" />
              System Monitoring
            </h1>
            <p className="mt-2 text-gray-600">System health and performance metrics</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchMonitoringData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Refresh Now
            </button>
          </div>
        </div>

        {/* System Health */}
        {health && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              {getStatusIcon(health.status)}
              System Health
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className={`text-lg font-semibold ${getStatusColor(health.status)}`}>
                  {health.status.toUpperCase()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Response Time</p>
                <p className="text-lg font-semibold">{health.responseTime}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">API</p>
                <p className={`text-lg font-semibold ${getStatusColor(health.services.api)}`}>
                  {health.services.api}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Database</p>
                <p className={`text-lg font-semibold ${getStatusColor(health.services.database)}`}>
                  {health.services.database}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Time Window Selector */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <label className="text-sm font-medium text-gray-700 mr-4">Time Window:</label>
          <select
            value={timeWindow}
            onChange={(e) => setTimeWindow(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value={30}>Last 30 minutes</option>
            <option value={60}>Last hour</option>
            <option value={180}>Last 3 hours</option>
            <option value={360}>Last 6 hours</option>
            <option value={1440}>Last 24 hours</option>
          </select>
        </div>

        {/* Job Statistics */}
        {jobStats && (
          <>
            {/* Alerts */}
            {jobStats.alerts && jobStats.alerts.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-red-800 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6" />
                  Active Alerts ({jobStats.alerts.length})
                </h2>
                <div className="space-y-3">
                  {jobStats.alerts.map((alert, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 border border-red-200">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`w-5 h-5 mt-0.5 ${
                          alert.severity === 'high' ? 'text-red-500' : 'text-yellow-500'
                        }`} />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{alert.message}</p>
                          <div className="mt-1 flex gap-4 text-sm text-gray-600">
                            <span>Type: {alert.type}</span>
                            <span>Severity: {alert.severity}</span>
                            {alert.jobId && <span>Job ID: {alert.jobId}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transcription Stats */}
            {jobStats.transcriptions && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                  Transcription Jobs
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{jobStats.transcriptions.total}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{jobStats.transcriptions.completed}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Processing</p>
                    <p className="text-2xl font-bold text-blue-600">{jobStats.transcriptions.processing}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Failed</p>
                    <p className="text-2xl font-bold text-red-600">{jobStats.transcriptions.failed}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Failure Rate</p>
                    <p className="text-lg font-semibold text-gray-900">{jobStats.transcriptions.failureRate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Stuck Jobs</p>
                    <p className={`text-lg font-semibold ${jobStats.transcriptions.stuckJobs > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {jobStats.transcriptions.stuckJobs}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Avg Completion Time</p>
                    <p className="text-lg font-semibold text-gray-900">{jobStats.transcriptions.avgCompletionTime}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Content Generation Stats */}
            {jobStats.content && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                  Content Generation Jobs
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{jobStats.content.total}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-green-600">{jobStats.content.completed}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Generating</p>
                    <p className="text-2xl font-bold text-blue-600">{jobStats.content.generating}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Failed</p>
                    <p className="text-2xl font-bold text-red-600">{jobStats.content.failed}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Failure Rate</p>
                    <p className="text-lg font-semibold text-gray-900">{jobStats.content.failureRate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Stuck Jobs</p>
                    <p className={`text-lg font-semibold ${jobStats.content.stuckJobs > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {jobStats.content.stuckJobs}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Avg Completion Time</p>
                    <p className="text-lg font-semibold text-gray-900">{jobStats.content.avgCompletionTime}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Last updated: {health?.timestamp ? new Date(health.timestamp).toLocaleString() : 'N/A'}</p>
          <p className="mt-1">Monitoring powered by Sentry • Click "Refresh Now" to update data</p>
        </div>
      </div>
    </Layout>
  );
}

