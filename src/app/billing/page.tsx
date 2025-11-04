'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { CreditCard, CheckCircle, Calendar, Download, ArrowRight, X, Loader2 } from 'lucide-react';
import { trialService } from '@/services/trialService';
import CheckoutButton from '@/components/CheckoutButton';

interface SubscriptionInfo {
  subscriptionStatus: string;
  subscriptionPlan: string | null;
  monthlyWordLimit: number;
  wordsUsedThisMonth: number;
  boostWords: number;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd: number;
    cancelAtPeriodEnd: boolean;
    items: Array<{ priceId: string; plan: string }>;
  } | null;
}

export default function BillingPage() {
  const { user } = useAuth();
  const [trialStatus, setTrialStatus] = useState<any>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [changingPlan, setChangingPlan] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [trial, subscription] = await Promise.all([
        trialService.getTrialStatus(),
        loadSubscriptionInfo()
      ]);
      setTrialStatus(trial);
      setSubscriptionInfo(subscription);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptionInfo = async (): Promise<SubscriptionInfo | null> => {
    if (!user) return null;
    try {
      const response = await fetch('/api/subscription/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    }
    return null;
  };

  const handleManageBilling = async () => {
    if (!user) return;
    try {
      const response = await fetch('/api/subscription/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error opening billing portal:', error);
      alert('Failed to open billing portal. Please try again.');
    }
  };

  const handleChangePlan = async (newPlan: string) => {
    if (!user || !subscriptionInfo) return;
    
    if (subscriptionInfo.subscriptionPlan === newPlan) {
      alert('You are already on this plan.');
      return;
    }

    if (!confirm(`Are you sure you want to ${newPlan === 'transcription-only' ? 'downgrade' : 'upgrade'} to ${newPlan === 'transcription-only' ? 'Transcription Only' : 'Creator'} plan? Changes will be prorated.`)) {
      return;
    }

    try {
      setChangingPlan(newPlan);
      const response = await fetch('/api/subscription/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, newPlan }),
      });
      
      if (response.ok) {
        alert('Plan changed successfully!');
        await loadData(); // Reload subscription info
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to change plan');
      }
    } catch (error) {
      console.error('Error changing plan:', error);
      alert('Failed to change plan. Please try again.');
    } finally {
      setChangingPlan(null);
    }
  };

  const handleCancelSubscription = async (cancelImmediately: boolean = false) => {
    if (!user) return;
    
    try {
      setCancelling(true);
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, cancelImmediately }),
      });
      
      if (response.ok) {
        alert(cancelImmediately 
          ? 'Subscription cancelled immediately.' 
          : 'Subscription will be cancelled at the end of the billing period.');
        await loadData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert('Failed to cancel subscription. Please try again.');
    } finally {
      setCancelling(false);
      setShowCancelConfirm(false);
    }
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
                    <CreditCard className="w-5 h-5 text-purple-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Current Plan</h2>
                  </div>
                  {subscriptionInfo?.subscriptionStatus === 'active' && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      Active
                    </span>
                  )}
                  {subscriptionInfo?.subscription?.cancelAtPeriodEnd && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                      Cancelling at period end
                    </span>
                  )}
                  {trialStatus?.isActive && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      Free Trial
                    </span>
                  )}
                </div>
              </div>
              <div className="p-4 sm:p-6">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  </div>
                ) : subscriptionInfo?.subscriptionStatus === 'active' ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Current Plan</div>
                      <div className="text-xl font-bold text-gray-900">
                        {subscriptionInfo.subscriptionPlan === 'creator' ? 'Creator Plan' : 
                         subscriptionInfo.subscriptionPlan === 'transcription-only' ? 'Transcription Only' : 
                         subscriptionInfo.subscriptionPlan || 'Unknown'}
                      </div>
                    </div>

                    {subscriptionInfo.subscription && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                        <div>
                          <div className="text-sm text-gray-500 mb-1">Next Billing Date</div>
                          <div className="text-lg font-semibold text-gray-900">
                            {subscriptionInfo.subscription.currentPeriodEnd 
                              ? new Date(subscriptionInfo.subscription.currentPeriodEnd * 1000).toLocaleDateString()
                              : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500 mb-1">Content Words</div>
                          <div className="text-lg font-semibold text-gray-900">
                            {subscriptionInfo.monthlyWordLimit >= 999999999 
                              ? 'Unlimited' 
                              : `${subscriptionInfo.wordsUsedThisMonth || 0} / ${subscriptionInfo.monthlyWordLimit || 0}`}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleManageBilling}
                        className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
                      >
                        Manage Billing
                      </button>
                      {subscriptionInfo.subscription && !subscriptionInfo.subscription.cancelAtPeriodEnd && (
                        <button
                          onClick={() => setShowCancelConfirm(true)}
                          className="px-6 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all font-medium"
                        >
                          Cancel Subscription
                        </button>
                      )}
                      {subscriptionInfo.subscription?.cancelAtPeriodEnd && (
                        <button
                          onClick={async () => {
                            try {
                              setCancelling(true);
                              const response = await fetch('/api/subscription/cancel', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: user?.uid, cancelImmediately: false }),
                              });
                              if (response.ok) {
                                alert('Subscription reactivated successfully!');
                                await loadData();
                              } else {
                                const data = await response.json();
                                alert(data.error || 'Failed to reactivate subscription');
                              }
                            } catch (error) {
                              console.error('Error reactivating subscription:', error);
                              alert('Failed to reactivate subscription. Please try again.');
                            } finally {
                              setCancelling(false);
                            }
                          }}
                          disabled={cancelling}
                          className="px-6 py-2.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {cancelling ? 'Reactivating...' : 'Reactivate Subscription'}
                        </button>
                      )}
                    </div>
                  </div>
                ) : trialStatus?.isActive ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Plan Type</div>
                      <div className="text-xl font-bold text-gray-900">Free Trial</div>
                    </div>
                    
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
                      <div className="font-medium text-gray-900 mb-2">Upgrade to unlock unlimited features</div>
                      <p className="text-sm text-gray-500 mb-4">
                        Get unlimited transcription and content repurposing with our paid plans
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Plan Type</div>
                      <div className="text-xl font-bold text-gray-900">No Active Plan</div>
                    </div>
                    <div className="pt-4">
                      <p className="text-sm text-gray-600 mb-4">Choose a plan to get started</p>
                    </div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Transcription Only Plan */}
                  <div className={`border-2 rounded-lg p-6 ${
                    subscriptionInfo?.subscriptionPlan === 'transcription-only' 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-200'
                  }`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Transcription Only</h3>
                        <p className="text-sm text-gray-600 mt-1">Just the transcripts</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">$17.99</div>
                        <div className="text-sm text-gray-500">/month</div>
                      </div>
                    </div>
                    <ul className="space-y-2 mb-6 text-sm">
                      <li className="flex items-center text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        <span>Unlimited transcription</span>
                      </li>
                      <li className="flex items-center text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        <span>Speaker diarization</span>
                      </li>
                      <li className="flex items-center text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        <span>SRT/VTT subtitles</span>
                      </li>
                      <li className="flex items-center text-gray-400">
                        <X className="w-4 h-4 mr-2 flex-shrink-0" />
                        <span>No content generation</span>
                      </li>
                    </ul>
                    {subscriptionInfo?.subscriptionPlan === 'transcription-only' ? (
                      <div className="w-full px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-center font-medium">
                        Current Plan
                      </div>
                    ) : subscriptionInfo?.subscriptionStatus === 'active' ? (
                      <button
                        onClick={() => handleChangePlan('transcription-only')}
                        disabled={changingPlan === 'transcription-only'}
                        className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {changingPlan === 'transcription-only' ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Changing...
                          </>
                        ) : (
                          'Switch to This Plan'
                        )}
                      </button>
                    ) : (
                      <CheckoutButton plan="transcription-only" className="w-full">
                        Get Started
                      </CheckoutButton>
                    )}
                  </div>

                  {/* Creator Plan */}
                  <div className={`border-2 rounded-lg p-6 relative ${
                    subscriptionInfo?.subscriptionPlan === 'creator' 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-purple-300'
                  }`}>
                    {subscriptionInfo?.subscriptionPlan !== 'creator' && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                          MOST POPULAR
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Creator Plan</h3>
                        <p className="text-sm text-gray-600 mt-1">For content creators</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-purple-600">$34.99</div>
                        <div className="text-sm text-gray-500">/month</div>
                      </div>
                    </div>
                    <ul className="space-y-2 mb-6 text-sm">
                      <li className="flex items-center text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        <span><strong>Unlimited</strong> transcription</span>
                      </li>
                      <li className="flex items-center text-gray-700">
                        <CheckCircle className="w-4 h-4 text-purple-500 mr-2 flex-shrink-0" />
                        <span><strong>Unlimited</strong> content repurposing</span>
                      </li>
                      <li className="flex items-center text-gray-700">
                        <CheckCircle className="w-4 h-4 text-purple-500 mr-2 flex-shrink-0" />
                        <span>30+ content types</span>
                      </li>
                      <li className="flex items-center text-gray-700">
                        <CheckCircle className="w-4 h-4 text-purple-500 mr-2 flex-shrink-0" />
                        <span>All transcription features</span>
                      </li>
                    </ul>
                    {subscriptionInfo?.subscriptionPlan === 'creator' ? (
                      <div className="w-full px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-center font-medium">
                        Current Plan
                      </div>
                    ) : subscriptionInfo?.subscriptionStatus === 'active' ? (
                      <button
                        onClick={() => handleChangePlan('creator')}
                        disabled={changingPlan === 'creator'}
                        className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-teal-500 text-white rounded-lg hover:from-purple-700 hover:to-teal-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {changingPlan === 'creator' ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Changing...
                          </>
                        ) : (
                          'Switch to This Plan'
                        )}
                      </button>
                    ) : (
                      <CheckoutButton plan="creator" className="w-full">
                        Get Started
                      </CheckoutButton>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Cancel Confirmation Modal */}
            {showCancelConfirm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg max-w-md w-full p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Cancel Subscription</h3>
                  <p className="text-gray-600 mb-6">
                    Are you sure you want to cancel your subscription? You can cancel immediately or at the end of your billing period.
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={() => handleCancelSubscription(false)}
                      disabled={cancelling}
                      className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {cancelling ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Cancel at Period End'
                      )}
                    </button>
                    <button
                      onClick={() => handleCancelSubscription(true)}
                      disabled={cancelling}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {cancelling ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Cancel Immediately'
                      )}
                    </button>
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      disabled={cancelling}
                      className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-medium"
                    >
                      Keep Subscription
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

