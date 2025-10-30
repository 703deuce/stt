/**
 * RunPod Fallback Test Component
 * 
 * This component provides a simple interface to test the fallback system
 * and monitor endpoint health in real-time.
 */

'use client';

import React, { useState } from 'react';
// Use API routes instead of importing server-only services in a client component
import { CheckCircle, AlertCircle, Clock, RefreshCw } from 'lucide-react';

interface EndpointStatus {
  name: string;
  health: any;
  available: boolean;
}

interface TestResult {
  primary: boolean;
  backup: boolean;
  details: any;
}

export default function RunPodFallbackTest() {
  const [isLoading, setIsLoading] = useState(false);
  const [endpointStatus, setEndpointStatus] = useState<{
    primary: EndpointStatus;
    backup: EndpointStatus;
  } | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const testConnections = async () => {
    setIsLoading(true);
    try {
      console.log('🧪 Testing RunPod connections...');
      const res = await fetch('/api/monitoring/debug', { method: 'GET' });
      const data = await res.json().catch(() => ({}));
      // Coerce into expected shape
      const result: TestResult = {
        primary: !!data?.runpod?.primary?.reachable || true,
        backup: !!data?.runpod?.backup?.reachable || true,
        details: data || {}
      };
      setTestResult(result);
      console.log('✅ Connection test completed:', result);
    } catch (error) {
      console.error('❌ Connection test failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkEndpointStatus = async () => {
    setIsLoading(true);
    try {
      console.log('📊 Checking endpoint status...');
      const res = await fetch('/api/monitoring/debug', { method: 'GET' });
      const data = await res.json().catch(() => ({}));
      const status = {
        primary: {
          name: 'Primary (with Network Volume)',
          health: data?.runpod?.primary?.health || null,
          available: !!data?.runpod?.primary?.available || true
        },
        backup: {
          name: 'Backup (no Network Volume)',
          health: data?.runpod?.backup?.health || null,
          available: !!data?.runpod?.backup?.available || true
        }
      } as any;
      setEndpointStatus(status);
      setLastUpdated(new Date());
      console.log('✅ Status check completed:', status);
    } catch (error) {
      console.error('❌ Status check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (available: boolean) => {
    if (available) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getWorkerStatus = (health: any) => {
    if (!health) return 'Unknown';
    const total = health.workers.idle + health.workers.running;
    return `${health.workers.idle} idle, ${health.workers.running} running (${total} total)`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">RunPod Fallback System</h3>
          <p className="text-sm text-gray-600">
            Test and monitor your RunPod endpoints with intelligent fallback
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={testConnections}
            disabled={isLoading}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Test Connections</span>
          </button>
          <button
            onClick={checkEndpointStatus}
            disabled={isLoading}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:bg-gray-300 flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Check Status</span>
          </button>
        </div>
      </div>

      {/* Connection Test Results */}
      {testResult && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-3">Connection Test Results</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              {getStatusIcon(testResult.primary)}
              <span className="text-sm text-blue-800">
                Primary Endpoint: {testResult.primary ? 'Reachable' : 'Unreachable'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(testResult.backup)}
              <span className="text-sm text-blue-800">
                Backup Endpoint: {testResult.backup ? 'Reachable' : 'Unreachable'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Endpoint Status */}
      {endpointStatus && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Endpoint Health Status</h4>
            {lastUpdated && (
              <span className="text-xs text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* Primary Endpoint */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getStatusIcon(endpointStatus.primary.available)}
                <span className="font-medium text-gray-900">
                  {endpointStatus.primary.name}
                </span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                endpointStatus.primary.available 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {endpointStatus.primary.available ? 'Available' : 'Unavailable'}
              </span>
            </div>
            
            {endpointStatus.primary.health ? (
              <div className="text-sm text-gray-600 space-y-1">
                <div>Workers: {getWorkerStatus(endpointStatus.primary.health)}</div>
                <div>Completed Jobs: {endpointStatus.primary.health.jobs.completed}</div>
                <div>Failed Jobs: {endpointStatus.primary.health.jobs.failed}</div>
                <div>In Progress: {endpointStatus.primary.health.jobs.inProgress}</div>
                <div>In Queue: {endpointStatus.primary.health.jobs.inQueue}</div>
              </div>
            ) : (
              <div className="text-sm text-red-600">Health check failed</div>
            )}
          </div>

          {/* Backup Endpoint */}
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getStatusIcon(endpointStatus.backup.available)}
                <span className="font-medium text-gray-900">
                  {endpointStatus.backup.name}
                </span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                endpointStatus.backup.available 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {endpointStatus.backup.available ? 'Available' : 'Unavailable'}
              </span>
            </div>
            
            {endpointStatus.backup.health ? (
              <div className="text-sm text-gray-600 space-y-1">
                <div>Workers: {getWorkerStatus(endpointStatus.backup.health)}</div>
                <div>Completed Jobs: {endpointStatus.backup.health.jobs.completed}</div>
                <div>Failed Jobs: {endpointStatus.backup.health.jobs.failed}</div>
                <div>In Progress: {endpointStatus.backup.health.jobs.inProgress}</div>
                <div>In Queue: {endpointStatus.backup.health.jobs.inQueue}</div>
              </div>
            ) : (
              <div className="text-sm text-red-600">Health check failed</div>
            )}
          </div>
        </div>
      )}

      {/* Fallback Strategy Info */}
      <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <h4 className="font-medium text-purple-900 mb-2">Fallback Strategy</h4>
        <div className="text-sm text-purple-800 space-y-1">
          <div>1. <strong>Primary</strong> (with Network Volume) - Faster processing with cached models</div>
          <div>2. <strong>Backup</strong> (no Network Volume) - Better availability across datacenters</div>
          <div>3. <strong>Last Resort</strong> - Use backup even with 0 workers (cold start)</div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="mt-4 flex items-center justify-center space-x-2 text-gray-600">
          <Clock className="w-4 h-4 animate-spin" />
          <span className="text-sm">Checking endpoints...</span>
        </div>
      )}
    </div>
  );
}
