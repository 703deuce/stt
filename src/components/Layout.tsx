'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, 
  FileText, 
  Mic, 
  Upload, 
  Menu,
  Bell,
  HelpCircle,
  ChevronDown,
  Filter,
  LogOut,
  Shield,
  Sparkles,
  Activity,
  Users,
  BookOpen,
  Settings,
  CreditCard,
  User,
  BarChart3,
  Key,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import UpgradeModal from './UpgradeModal';
import BackgroundJobsIndicator from './BackgroundJobsIndicator';
import { useProgressNotification } from '../context/ProgressNotificationContext';
import ProgressNotification from './ProgressNotification';
import { contentLimitService } from '../services/contentLimitService';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { notification } = useProgressNotification();
  const [wordLimitStatus, setWordLimitStatus] = useState<{
    totalAvailable: number;
    monthlyLimit: number;
    wordsUsed: number;
    boostWords: number;
  } | null>(null);

  // Load word limits when user is available
  useEffect(() => {
    if (user) {
      loadWordLimits();
      
      // Refresh word limits every 30 seconds
      const interval = setInterval(loadWordLimits, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadWordLimits = async () => {
    try {
      const status = await contentLimitService.getWordLimitStatus();
      setWordLimitStatus({
        totalAvailable: status.totalAvailable,
        monthlyLimit: status.monthlyLimit,
        wordsUsed: status.wordsUsed,
        boostWords: status.boostWords,
      });
    } catch (err) {
      console.error('❌ Error loading word limits:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const sidebarItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard', section: 'main' },
    { icon: Upload, label: 'New Transcription', href: '/transcriptions', section: 'transcription', badge: 'ENHANCED' },
    { icon: FileText, label: 'My Transcriptions', href: '/all-transcriptions', section: 'transcription' },
    { icon: Upload, label: 'Batch Upload', href: '/batch-upload', section: 'transcription' },
    { icon: Sparkles, label: 'Content Repurposing', href: '/content-repurposing', section: 'content', badge: 'NEW' },
    { icon: FileText, label: 'My Content', href: '/my-content', section: 'content' },
    { icon: BookOpen, label: 'Tutorials', href: '/tutorials', section: 'help', badge: 'LEARN' },
    { icon: HelpCircle, label: 'FAQ', href: '/faq', section: 'help' },
    { icon: HelpCircle, label: 'Support', href: '/support', section: 'help' },
  ];


  // Check if user is admin (using environment variable if available)
  const ADMIN_EMAILS = typeof window !== 'undefined' 
    ? (process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || ['703deuce@gmail.com'])
    : ['703deuce@gmail.com'];
  const isAdmin = user?.email ? ADMIN_EMAILS.includes(user.email.toLowerCase()) : false;
  

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-16'} bg-white border-r border-gray-200 transition-all duration-300 flex flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-teal-500 rounded-xl flex items-center justify-center shadow-sm">
                <Mic className="w-5 h-5 text-white" />
              </div>
              {sidebarOpen && (
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Transovo AI</h1>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 rounded-md hover:bg-gray-100"
            >
              <Menu className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* User Info */}
        {sidebarOpen && user && (
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-teal-500 rounded-full flex items-center justify-center shadow-sm">
                <span className="text-white text-sm font-medium">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.email}
                </p>
                <p className="text-xs text-gray-500">Signed in</p>
              </div>
            </div>
          </div>
        )}

        {/* Word Count Display */}
        {sidebarOpen && user && wordLimitStatus && wordLimitStatus.totalAvailable > 0 && (
          <div className="px-4 pt-4 pb-2">
            <div className="bg-gradient-to-br from-purple-50 to-teal-50 border border-purple-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-semibold text-purple-900">Content Words</span>
                </div>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                >
                  + Add
                </button>
              </div>
              <div className="mb-2">
                <div className="text-2xl font-bold text-purple-900">
                  {wordLimitStatus.totalAvailable.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600">words available</div>
              </div>
              {wordLimitStatus.monthlyLimit > 0 && (
                <div className="pt-2 border-t border-purple-200">
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Monthly</span>
                    <span className="font-medium">
                      {(wordLimitStatus.monthlyLimit - wordLimitStatus.wordsUsed).toLocaleString()} / {wordLimitStatus.monthlyLimit.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-1.5">
                    <div 
                      className="bg-gradient-to-r from-purple-600 to-teal-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min(100, ((wordLimitStatus.monthlyLimit - wordLimitStatus.wordsUsed) / wordLimitStatus.monthlyLimit) * 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              )}
              {wordLimitStatus.boostWords > 0 && (
                <div className="flex justify-between text-xs text-gray-600 mt-2">
                  <span>Boost words</span>
                  <span className="font-medium text-teal-600">
                    +{wordLimitStatus.boostWords.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}


        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1">
          {/* Main Section */}
          <div className="space-y-1">
            {sidebarItems.filter(item => item.section === 'main').map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 group"
              >
                <item.icon className="w-5 h-5 mr-3 text-gray-400 group-hover:text-gray-500" />
                {sidebarOpen && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </a>
            ))}
          </div>

          {/* Transcription Section */}
          {sidebarOpen && (
            <div className="pt-6">
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                TRANSCRIPTION
              </h3>
              <div className="mt-2 space-y-1">
                {sidebarItems.filter(item => item.section === 'transcription').map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 group"
                  >
                    <item.icon className="w-5 h-5 mr-3 text-gray-400 group-hover:text-gray-500" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </a>
                ))}
                <a href="/archived" className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100">
                  <FileText className="w-5 h-5 mr-3 text-gray-400" />
                  Archived
                </a>
                <a href="/favorites" className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100">
                  <FileText className="w-5 h-5 mr-3 text-gray-400" />
                  Favorites
                </a>
              </div>
            </div>
          )}

          {/* Content Section */}
          {sidebarOpen && (
            <div className="pt-6">
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                CONTENT
                </h3>
              <div className="mt-2 space-y-1">
                {sidebarItems.filter(item => item.section === 'content').map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 group"
                  >
                    <item.icon className="w-5 h-5 mr-3 text-gray-400 group-hover:text-gray-500" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Help & Learning Section */}
          {sidebarOpen && (
            <div className="pt-6">
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                HELP & LEARNING
              </h3>
              <div className="mt-2 space-y-1">
                {sidebarItems.filter(item => item.section === 'help').map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-blue-50 group"
                  >
                    <item.icon className="w-5 h-5 mr-3 text-blue-500 group-hover:text-blue-600" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                        {item.badge}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Admin Section */}
          {sidebarOpen && isAdmin && (
            <div className="pt-6">
              <div className="flex items-center justify-between px-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  ADMIN
                </h3>
                <div className="flex items-center">
                  <Shield className="w-4 h-4 text-purple-600" />
                </div>
              </div>
              <div className="mt-2 space-y-1">
                <a
                  href="/admin"
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-purple-50 hover:text-purple-700 transition-colors"
                >
                  <Shield className="w-5 h-5 mr-3 text-purple-600" />
                  <span>Admin Dashboard</span>
                </a>
                <a
                  href="/admin/users"
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-purple-50 hover:text-purple-700 transition-colors"
                >
                  <Users className="w-5 h-5 mr-3 text-purple-600" />
                  <span>User Management</span>
                </a>
                <a
                  href="/monitoring"
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  <Activity className="w-5 h-5 mr-3 text-blue-600" />
                  <span>System Monitoring</span>
                </a>
              </div>
            </div>
          )}

          {/* Sign Out Button */}
          {sidebarOpen && user && (
            <div className="pt-6 mt-auto">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50"
              >
                <LogOut className="w-5 h-5 mr-3" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navigation */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">My Transcriptions</h2>
            </div>
            
            <div className="flex items-center space-x-3 sm:space-x-4">
              {/* Filter */}
              <button className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Filter className="w-4 h-4 text-gray-500" />
              </button>
              
              {/* User Menu */}
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button className="p-2 rounded-lg hover:bg-gray-100">
                  <Bell className="w-5 h-5 text-gray-500" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                </button>
                
                <button className="p-2 rounded-lg hover:bg-gray-100">
                  <HelpCircle className="w-5 h-5 text-gray-500" />
                </button>
                
                {user && (
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                      className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-teal-500 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-white text-sm font-medium">
                        {user.email?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {user.email?.split('@')[0] || 'User'}
                    </span>
                      <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* User Dropdown Menu */}
                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50">
                        {/* User Info Section */}
                        <div className="px-4 py-3 border-b border-gray-100">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-teal-500 rounded-full flex items-center justify-center shadow-sm">
                              <span className="text-white text-lg font-medium">
                                {user.email?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {user.email?.split('@')[0] || 'User'}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Menu Items */}
                        <div className="py-2">
                          {/* Account Section */}
                          <a
                            href="/profile"
                            className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <User className="w-5 h-5 mr-3 text-gray-400" />
                            <div className="flex-1">
                              <div className="font-medium">My Profile</div>
                              <div className="text-xs text-gray-500">View and edit profile</div>
                            </div>
                          </a>

                          <a
                            href="/settings"
                            className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Settings className="w-5 h-5 mr-3 text-gray-400" />
                            <div className="flex-1">
                              <div className="font-medium">Settings</div>
                              <div className="text-xs text-gray-500">Preferences & notifications</div>
                            </div>
                          </a>

                        </div>

                        <div className="border-t border-gray-100 py-2">
                          {/* Billing Section */}
                          <a
                            href="/billing"
                            className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <CreditCard className="w-5 h-5 mr-3 text-gray-400" />
                            <div className="flex-1">
                              <div className="font-medium">Billing & Plans</div>
                              <div className="text-xs text-gray-500">Manage subscription</div>
                            </div>
                          </a>

                          <a
                            href="/usage"
                            className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <BarChart3 className="w-5 h-5 mr-3 text-gray-400" />
                            <div className="flex-1">
                              <div className="font-medium">Usage & Stats</div>
                              <div className="text-xs text-gray-500">View your activity</div>
                            </div>
                          </a>
                        </div>

                        <div className="border-t border-gray-100 py-2">
                          {/* Help Section */}
                          <a
                            href="/tutorials"
                            className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <BookOpen className="w-5 h-5 mr-3 text-blue-500" />
                            <div className="flex-1">
                              <div className="font-medium">Tutorials</div>
                              <div className="text-xs text-gray-500">Learn how to use features</div>
                            </div>
                          </a>

                          <a
                            href="/faq"
                            className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <HelpCircle className="w-5 h-5 mr-3 text-blue-500" />
                            <div className="flex-1">
                              <div className="font-medium">FAQ</div>
                              <div className="text-xs text-gray-500">Common questions</div>
                            </div>
                          </a>

                          <a
                            href="/support"
                            className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <MessageSquare className="w-5 h-5 mr-3 text-blue-500" />
                            <div className="flex-1">
                              <div className="font-medium">Support</div>
                              <div className="text-xs text-gray-500">Get help from our team</div>
                            </div>
                          </a>
                        </div>

                        {/* Sign Out */}
                        <div className="border-t border-gray-100 py-2">
                          <button
                            onClick={() => {
                              setUserMenuOpen(false);
                              handleSignOut();
                            }}
                            className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <LogOut className="w-5 h-5 mr-3" />
                            <div className="flex-1 text-left">
                              <div className="font-medium">Sign Out</div>
                              <div className="text-xs text-red-500">Log out of your account</div>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <button 
                  onClick={() => setShowUpgradeModal(true)}
                  className="bg-gradient-to-r from-purple-600 to-teal-500 text-white px-3 sm:px-4 py-2 rounded-xl hover:from-purple-700 hover:to-teal-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Upgrade
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1">
          {children}
        </main>
      </div>
      
      {/* Upgrade Modal */}
      <UpgradeModal 
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="Choose a plan to continue transcribing unlimited audio!"
      />
      
      {/* Background Jobs Indicator */}
      <BackgroundJobsIndicator />
      
      {/* Global Progress Notification */}
      <ProgressNotification
        isVisible={notification.isVisible}
        fileName={notification.fileName}
        status={notification.status}
        progress={notification.progress}
        error={notification.error}
        onClose={() => {}}
      />
    </div>
  );
};

export default Layout;
