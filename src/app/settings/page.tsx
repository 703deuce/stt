'use client';

import React, { useState } from 'react';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Bell, Mail, Globe, Moon, Sun, Check } from 'lucide-react';

export default function SettingsPage() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [transcriptionComplete, setTranscriptionComplete] = useState(true);
  const [contentReady, setContentReady] = useState(true);
  const [billingUpdates, setBillingUpdates] = useState(false);
  const [language, setLanguage] = useState('en');
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');

  const handleSave = () => {
    // Save settings logic here
    alert('Settings saved successfully!');
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="p-4 sm:p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6 sm:mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Settings</h1>
              <p className="text-sm sm:text-base text-gray-600">Manage your preferences and notifications</p>
            </div>

            {/* Notifications Section */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <Bell className="w-5 h-5 text-orange-500" />
                  <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                </div>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">Email Notifications</div>
                    <div className="text-sm text-gray-500">Receive notifications via email</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                  </label>
                </div>

                {emailNotifications && (
                  <div className="ml-6 pl-6 border-l-2 border-gray-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">Transcription Complete</div>
                        <div className="text-sm text-gray-500">Notify when transcription finishes</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={transcriptionComplete}
                          onChange={(e) => setTranscriptionComplete(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">Content Ready</div>
                        <div className="text-sm text-gray-500">Notify when repurposed content is ready</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={contentReady}
                          onChange={(e) => setContentReady(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">Billing Updates</div>
                        <div className="text-sm text-gray-500">Payment and subscription notifications</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={billingUpdates}
                          onChange={(e) => setBillingUpdates(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Preferences Section */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <Globe className="w-5 h-5 text-orange-500" />
                  <h2 className="text-lg font-semibold text-gray-900">Preferences</h2>
                </div>
              </div>
              <div className="p-4 sm:p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full sm:max-w-xs border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                  <div className="flex flex-wrap gap-3">
                    {(['light', 'dark', 'auto'] as const).map((option) => (
                      <button
                        key={option}
                        onClick={() => setTheme(option)}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                          theme === option
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {option === 'light' && <Sun className="w-4 h-4" />}
                        {option === 'dark' && <Moon className="w-4 h-4" />}
                        {option === 'auto' && <Globe className="w-4 h-4" />}
                        <span className="capitalize">{option}</span>
                        {theme === option && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                className="px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

