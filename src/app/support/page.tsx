'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  Send,
  CheckCircle,
  Clock,
  HelpCircle,
  BookOpen,
  Zap,
  AlertCircle,
  FileText,
  Video,
  Bug,
  Lightbulb
} from 'lucide-react';

interface SupportCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
}

const SUPPORT_CATEGORIES: SupportCategory[] = [
  {
    id: 'technical',
    name: 'Technical Issue',
    icon: <Bug className="w-5 h-5" />,
    description: 'Problems with transcription, processing, or features'
  },
  {
    id: 'billing',
    name: 'Billing & Account',
    icon: <FileText className="w-5 h-5" />,
    description: 'Questions about pricing, payments, or account settings'
  },
  {
    id: 'feature',
    name: 'Feature Request',
    icon: <Lightbulb className="w-5 h-5" />,
    description: 'Suggest new features or improvements'
  },
  {
    id: 'general',
    name: 'General Question',
    icon: <HelpCircle className="w-5 h-5" />,
    description: 'Any other questions or feedback'
  }
];

export default function SupportPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.displayName || '',
    email: user?.email || '',
    category: '',
    subject: '',
    message: '',
    priority: 'normal'
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    setSubmitted(true);
    setSubmitting(false);

    // Reset form after 3 seconds
    setTimeout(() => {
      setSubmitted(false);
      setFormData({
        name: user?.displayName || '',
        email: user?.email || '',
        category: '',
        subject: '',
        message: '',
        priority: 'normal'
      });
    }, 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100">
          <div className="container mx-auto px-4 py-6 sm:py-8">
            {/* Header */}
            <div className="text-center mb-8 sm:mb-12">
              <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
                💬 Support Center
              </h1>
              <p className="text-base sm:text-xl text-gray-600 max-w-2xl mx-auto">
                We're here to help! Get in touch with our support team and we'll respond as soon as possible.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {/* Contact Form - Main Content */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
                  {!submitted ? (
                    <>
                      <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a message</h2>
                      
                      <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Name and Email */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Your Name *
                            </label>
                            <input
                              type="text"
                              name="name"
                              value={formData.name}
                              onChange={handleChange}
                              required
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="John Smith"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Email Address *
                            </label>
                            <input
                              type="email"
                              name="email"
                              value={formData.email}
                              onChange={handleChange}
                              required
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="john@example.com"
                            />
                          </div>
                        </div>

                        {/* Category Selection */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            What can we help you with? *
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {SUPPORT_CATEGORIES.map((category) => (
                              <button
                                key={category.id}
                                type="button"
                                onClick={() => setFormData({ ...formData, category: category.id })}
                                className={`flex items-start p-4 border-2 rounded-lg transition-all ${
                                  formData.category === category.id
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-blue-300'
                                }`}
                              >
                                <div className={`${
                                  formData.category === category.id ? 'text-blue-600' : 'text-gray-400'
                                } mr-3 mt-1`}>
                                  {category.icon}
                                </div>
                                <div className="text-left">
                                  <div className="font-semibold text-gray-900">{category.name}</div>
                                  <div className="text-xs text-gray-500 mt-1">{category.description}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Priority */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Priority Level
                          </label>
                          <select
                            name="priority"
                            value={formData.priority}
                            onChange={handleChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="low">Low - General inquiry</option>
                            <option value="normal">Normal - Standard support</option>
                            <option value="high">High - Urgent issue</option>
                            <option value="critical">Critical - Service down</option>
                          </select>
                        </div>

                        {/* Subject */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Subject *
                          </label>
                          <input
                            type="text"
                            name="subject"
                            value={formData.subject}
                            onChange={handleChange}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Brief description of your issue"
                          />
                        </div>

                        {/* Message */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Message *
                          </label>
                          <textarea
                            name="message"
                            value={formData.message}
                            onChange={handleChange}
                            required
                            rows={6}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Please provide as much detail as possible about your issue or question..."
                          />
                          <p className="text-xs text-gray-500 mt-2">
                            Include any error messages, steps to reproduce, or relevant details
                          </p>
                        </div>

                        {/* Submit Button */}
                        <button
                          type="submit"
                          disabled={submitting || !formData.category}
                          className={`w-full py-4 rounded-lg font-semibold text-white transition-all duration-300 flex items-center justify-center ${
                            submitting || !formData.category
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transform hover:scale-105'
                          }`}
                        >
                          {submitting ? (
                            <>
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="w-5 h-5 mr-2" />
                              Send Message
                            </>
                          )}
                        </button>
                      </form>
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                      <p className="text-gray-600 mb-6">
                        Thank you for contacting us. We've received your message and will respond within 24 hours.
                      </p>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                        <p className="text-sm text-blue-800">
                          <strong>Ticket ID:</strong> #{Math.random().toString(36).substring(2, 9).toUpperCase()}
                        </p>
                        <p className="text-xs text-blue-600 mt-2">
                          We've sent a confirmation email to {formData.email}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar - Contact Info & Quick Links */}
              <div className="lg:col-span-1 space-y-6">
                {/* Response Time */}
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <div className="flex items-center mb-4">
                    <Clock className="w-6 h-6 text-blue-500 mr-3" />
                    <h3 className="text-lg font-bold text-gray-900">Response Time</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Critical</span>
                      <span className="text-sm font-bold text-green-600">1-2 hours</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">High</span>
                      <span className="text-sm font-bold text-blue-600">4-6 hours</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Normal</span>
                      <span className="text-sm font-bold text-gray-600">12-24 hours</span>
                    </div>
                  </div>
                </div>

                {/* Contact Methods */}
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Other Ways to Reach Us</h3>
                  <div className="space-y-4">
                    <a href="mailto:support@example.com" className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <Mail className="w-5 h-5 text-blue-500 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Email</div>
                        <div className="text-xs text-gray-500">support@example.com</div>
                      </div>
                    </a>
                    <a href="#" className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <MessageSquare className="w-5 h-5 text-green-500 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Live Chat</div>
                        <div className="text-xs text-gray-500">Available 9am-5pm EST</div>
                      </div>
                    </a>
                    <a href="tel:+1234567890" className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <Phone className="w-5 h-5 text-purple-500 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">Phone</div>
                        <div className="text-xs text-gray-500">+1 (234) 567-890</div>
                      </div>
                    </a>
                  </div>
                </div>

                {/* Quick Links */}
                <div className="bg-white rounded-2xl shadow-xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Links</h3>
                  <div className="space-y-2">
                    <a href="/tutorials" className="flex items-center p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                      <BookOpen className="w-5 h-5 text-blue-500 mr-3" />
                      <span className="text-sm font-medium text-gray-900">Tutorials</span>
                    </a>
                    <a href="/faq" className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <HelpCircle className="w-5 h-5 text-gray-500 mr-3" />
                      <span className="text-sm font-medium text-gray-900">FAQ</span>
                    </a>
                    <a href="/status" className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <Zap className="w-5 h-5 text-gray-500 mr-3" />
                      <span className="text-sm font-medium text-gray-900">System Status</span>
                    </a>
                  </div>
                </div>

                {/* Common Issues */}
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-2xl p-6">
                  <div className="flex items-center mb-3">
                    <AlertCircle className="w-5 h-5 text-purple-600 mr-2" />
                    <h3 className="text-lg font-bold text-purple-900">Before You Contact</h3>
                  </div>
                  <p className="text-sm text-purple-700 mb-4">
                    Check our resources for quick answers to common questions:
                  </p>
                  <div className="space-y-2 mb-4">
                    <a 
                      href="/faq" 
                      className="flex items-center p-3 bg-white rounded-lg hover:bg-purple-50 transition-colors"
                    >
                      <HelpCircle className="w-5 h-5 text-purple-500 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-purple-900">FAQ</div>
                        <div className="text-xs text-purple-600">30+ answered questions</div>
                      </div>
                    </a>
                    <a 
                      href="/tutorials" 
                      className="flex items-center p-3 bg-white rounded-lg hover:bg-purple-50 transition-colors"
                    >
                      <BookOpen className="w-5 h-5 text-purple-500 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-purple-900">Tutorials</div>
                        <div className="text-xs text-purple-600">Step-by-step guides</div>
                      </div>
                    </a>
                  </div>
                  <p className="text-xs text-purple-600">
                    💡 Most questions are answered in our FAQ - check there first!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
