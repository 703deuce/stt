'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { CreditCard, CheckCircle, Calendar, Download, ArrowRight } from 'lucide-react';
import { trialService } from '@/services/trialService';

export default function BillingPage() {
  const { user } = useAuth();
  const [trialStatus, setTrialStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadTrialStatus();
    }
  }, [user]);

  const loadTrialStatus = async () => {
    try {
      setLoading(true);
      const status = await trialService.getTrialStatus();
      setTrialStatus(status);
    } catch (error) {
      console.error('Error loading trial status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    window.location.href = '/signup';
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="p-4 sm:p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Billing & Plans</h1>
              <p className="text-sm sm:text-base text-gray-600">Manage your subscription and billing information</p>
            </div>

            {/* Current Plan Card */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="w-5 h-5 text-orange-500" />
                    <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
                  </div>
                  {trialStatus && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      trialStatus.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {trialStatus.isActive ? 'Active' : 'Expired'}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-4 sm:p-6">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                  </div>
                ) : trialStatus ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Plan Type</div>
                      <div className="text-xl font-bold text-gray-900">
                        {trialStatus.isActive ? 'Free Trial' : 'No Active Plan'}
                      </div>
                    </div>
                    
                    {trialStatus.isActive && (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                          <div>
                            <div className="text-sm text-gray-500 mb-1">Minutes Used</div>
                            <div className="text-lg font-semibold text-gray-900">
                              {trialStatus.minutesUsed || 0} / {trialStatus.totalMinutes || 0}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500 mb-1">Expires On</div>
                            <div className="text-lg font-semibold text-gray-900">
                              {trialStatus.expiresAt 
                                ? new Date(trialStatus.expiresAt).toLocaleDateString()
                                : 'N/A'}
                            </div>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">Upgrade to unlock unlimited features</div>
                              <div className="text-sm text-gray-500 mt-1">
                                Get more minutes, priority support, and advanced features
                              </div>
                            </div>
                            <button
                              onClick={handleUpgrade}
                              className="ml-4 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-teal-500 text-white rounded-lg hover:from-purple-700 hover:to-teal-600 transition-all font-medium flex items-center space-x-2"
                            >
                              <span>Upgrade Now</span>
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {!trialStatus.isActive && (
                      <div className="pt-4">
                        <button
                          onClick={handleUpgrade}
                          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-teal-500 text-white rounded-lg hover:from-purple-700 hover:to-teal-600 transition-all font-medium"
                        >
                          Choose a Plan
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Unable to load billing information
                  </div>
                )}
              </div>
            </div>

            {/* Available Plans */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Available Plans</h2>
              </div>
              <div className="p-4 sm:p-6">
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">View and select from available subscription plans</p>
                  <a
                    href="/signup"
                    className="inline-flex items-center px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
                  >
                    View Plans
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

