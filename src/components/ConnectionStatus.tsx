'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { databaseService } from '../services/databaseService';
import { 
  Wifi, 
  WifiOff, 
  CheckCircle, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';

export default function ConnectionStatus() {
  const { user } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected' | 'error'>('checking');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkConnection = async () => {
    try {
      setConnectionStatus('checking');
      setErrorMessage(null);
      
      console.log('🔍 Checking Firestore connection...');
      
      // Try to fetch a single record to test connectivity
      await databaseService.getSTTRecords(1);
      
      setConnectionStatus('connected');
      setLastCheck(new Date());
      console.log('✅ Firestore connection successful');
      
    } catch (error) {
      console.error('❌ Firestore connection failed:', error);
      
      let status: 'disconnected' | 'error' = 'disconnected';
      let message = 'Connection failed';
      
      if (error instanceof Error) {
        if (error.message.includes('Network connectivity issue') || 
            error.message.includes('Could not reach Cloud Firestore backend')) {
          status = 'disconnected';
          message = 'Network connectivity issue';
        } else {
          status = 'error';
          message = error.message;
        }
      }
      
      setConnectionStatus(status);
      setErrorMessage(message);
      setLastCheck(new Date());
    }
  };

  useEffect(() => {
    if (user) {
      checkConnection();
    }
  }, [user]);

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'checking':
        return <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'disconnected':
        return <WifiOff className="w-4 h-4 text-red-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Wifi className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'checking':
        return 'Checking connection...';
      case 'connected':
        return 'Connected to Firestore';
      case 'disconnected':
        return 'Network connectivity issue';
      case 'error':
        return 'Connection error';
      default:
        return 'Unknown status';
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'checking':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'connected':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'disconnected':
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className={`border rounded-lg p-3 ${getStatusColor()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className="text-sm font-medium">{getStatusText()}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          {lastCheck && (
            <span className="text-xs opacity-75">
              Last check: {lastCheck.toLocaleTimeString()}
            </span>
          )}
          
          <button
            onClick={checkConnection}
            disabled={connectionStatus === 'checking'}
            className="text-xs px-2 py-1 rounded hover:bg-white hover:bg-opacity-20 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${connectionStatus === 'checking' ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      {errorMessage && connectionStatus !== 'connected' && (
        <div className="mt-2 text-xs opacity-75">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
