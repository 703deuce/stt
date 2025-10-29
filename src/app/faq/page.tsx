'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { 
  Search,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  FileText,
  Zap,
  DollarSign,
  Shield,
  MessageSquare,
  Sparkles,
  Users,
  Download,
  Clock
} from 'lucide-react';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
}

const CATEGORIES: Category[] = [
  { id: 'getting-started', name: 'Getting Started', icon: <Sparkles className="w-5 h-5" />, color: 'blue' },
  { id: 'transcription', name: 'Transcription', icon: <FileText className="w-5 h-5" />, color: 'green' },
  { id: 'content', name: 'Content Repurposing', icon: <Zap className="w-5 h-5" />, color: 'purple' },
  { id: 'billing', name: 'Billing & Pricing', icon: <DollarSign className="w-5 h-5" />, color: 'orange' },
  { id: 'technical', name: 'Technical Support', icon: <MessageSquare className="w-5 h-5" />, color: 'red' },
  { id: 'security', name: 'Security & Privacy', icon: <Shield className="w-5 h-5" />, color: 'indigo' },
];

const FAQS: FAQ[] = [
  // Getting Started
  {
    id: '1',
    question: 'How do I get started with transcription?',
    answer: 'Getting started is easy! Simply upload your audio file (MP3, WAV, or M4A), configure your transcription settings (enable speaker diarization if needed), and click "Start Transcription". Your file will be processed in minutes and you\'ll receive a notification when it\'s ready.',
    category: 'getting-started'
  },
  {
    id: '2',
    question: 'What file formats are supported?',
    answer: 'We support MP3, WAV, and M4A audio formats. Files can be up to 2GB in size. For best results, use high-quality audio recordings with minimal background noise.',
    category: 'getting-started'
  },
  {
    id: '3',
    question: 'Do I need to install any software?',
    answer: 'No! Our platform is entirely web-based. Simply log in through your browser and start transcribing. No downloads or installations required.',
    category: 'getting-started'
  },
  {
    id: '4',
    question: 'Can I try it before subscribing?',
    answer: 'Yes! New users get a free trial with credits to test all features including transcription, AI summaries, chat, and content repurposing. No credit card required to start.',
    category: 'getting-started'
  },
  {
    id: '5',
    question: 'How accurate are the transcriptions?',
    answer: 'Our AI-powered transcription achieves 98.5%+ accuracy on clear audio. Accuracy depends on audio quality, speaker clarity, and background noise. Speaker diarization helps identify different speakers automatically.',
    category: 'getting-started'
  },

  // Transcription
  {
    id: '6',
    question: 'How long does transcription take?',
    answer: 'Processing time depends on file length. Typically, a 10-minute audio file takes 2-3 minutes to transcribe. You\'ll receive a notification when your transcription is ready, and you can navigate away while it processes.',
    category: 'transcription'
  },
  {
    id: '7',
    question: 'What is speaker diarization?',
    answer: 'Speaker diarization automatically identifies and labels different speakers in your audio. Instead of one continuous transcript, you\'ll see who said what (e.g., "Speaker 1", "Speaker 2"). You can then rename these to actual names like "John Smith".',
    category: 'transcription'
  },
  {
    id: '8',
    question: 'Can I edit transcriptions after they\'re generated?',
    answer: 'Yes! You can edit any transcription directly in the interface. Click on any text to make corrections. You can also rename speakers, add timestamps, and export in multiple formats (TXT, DOCX, SRT, CSV).',
    category: 'transcription'
  },
  {
    id: '9',
    question: 'How do I rename speakers?',
    answer: 'Click on any speaker label (e.g., "Speaker_00") in your transcription to rename it. Enter the actual person\'s name and save. The name will update throughout the entire transcription automatically.',
    category: 'transcription'
  },
  {
    id: '10',
    question: 'Can I transcribe multiple files at once?',
    answer: 'Yes! Use our Batch Upload feature to upload and process multiple audio files simultaneously. Each file will be transcribed separately and saved to your library.',
    category: 'transcription'
  },

  // Content Repurposing
  {
    id: '11',
    question: 'What is content repurposing?',
    answer: 'Content repurposing transforms your transcription into 37+ different content formats using AI. Create blog posts, social media content, email campaigns, video scripts, and more - all from a single transcription!',
    category: 'content'
  },
  {
    id: '12',
    question: 'How many content types can I generate?',
    answer: 'You can generate 37+ different content types including: blog posts, social media posts (Facebook, Instagram, LinkedIn, Twitter), email campaigns, video scripts, meeting notes, case studies, tutorials, and much more.',
    category: 'content'
  },
  {
    id: '13',
    question: 'What are AI frameworks?',
    answer: 'AI frameworks like AIDA, BAB, and PAS are proven marketing structures that make content more effective. Our AI applies these frameworks to YOUR transcription content - not generic templates. The frameworks are invisible in the final output.',
    category: 'content'
  },
  {
    id: '14',
    question: 'Can I customize the generated content?',
    answer: 'Yes! You can add custom instructions to adjust tone, style, or focus. You can also regenerate content multiple times to get different variations. All generated content can be edited before exporting.',
    category: 'content'
  },
  {
    id: '15',
    question: 'Are there word limits for content generation?',
    answer: 'Yes, content generation uses word credits. Each plan includes a monthly word allowance. You can purchase additional word boosts anytime. Word usage is clearly displayed before generating content.',
    category: 'content'
  },

  // Billing & Pricing
  {
    id: '16',
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, Mastercard, American Express, Discover) and PayPal. All payments are processed securely through Stripe.',
    category: 'billing'
  },
  {
    id: '17',
    question: 'Can I cancel my subscription anytime?',
    answer: 'Yes! You can cancel your subscription at any time from your account settings. You\'ll continue to have access until the end of your billing period. No cancellation fees.',
    category: 'billing'
  },
  {
    id: '18',
    question: 'What happens if I run out of credits?',
    answer: 'If you run out of transcription or word credits, you can purchase additional credits (boosts) anytime. Your monthly credits reset at the start of each billing cycle. Unused boost credits roll over.',
    category: 'billing'
  },
  {
    id: '19',
    question: 'Do you offer refunds?',
    answer: 'We offer a 30-day money-back guarantee. If you\'re not satisfied with our service within the first 30 days, contact support for a full refund. No questions asked.',
    category: 'billing'
  },
  {
    id: '20',
    question: 'Can I upgrade or downgrade my plan?',
    answer: 'Yes! You can change your plan anytime from your account settings. Upgrades take effect immediately. Downgrades take effect at the start of your next billing cycle.',
    category: 'billing'
  },

  // Technical Support
  {
    id: '21',
    question: 'Why is my transcription taking so long?',
    answer: 'Processing time depends on file length, server load, and whether speaker diarization is enabled. If it\'s taking longer than expected, check your internet connection and refresh the page. Contact support if it exceeds 30 minutes.',
    category: 'technical'
  },
  {
    id: '22',
    question: 'What if my transcription has errors?',
    answer: 'You can edit any transcription directly in the interface. For systematic errors, try re-uploading with adjusted settings. If accuracy is consistently low, ensure your audio is clear and contact support for assistance.',
    category: 'technical'
  },
  {
    id: '23',
    question: 'Can I download my transcriptions?',
    answer: 'Yes! Export transcriptions in multiple formats: TXT (plain text), DOCX (Microsoft Word), SRT (subtitles), or CSV (spreadsheet). All exports include your custom speaker names.',
    category: 'technical'
  },
  {
    id: '24',
    question: 'Is there a mobile app?',
    answer: 'Our web platform is fully responsive and works great on mobile browsers. A dedicated mobile app is in development. You can upload, view, and edit transcriptions from any device.',
    category: 'technical'
  },
  {
    id: '25',
    question: 'What browsers are supported?',
    answer: 'We support the latest versions of Chrome, Firefox, Safari, and Edge. For the best experience, we recommend using Chrome or Firefox with JavaScript enabled.',
    category: 'technical'
  },

  // Security & Privacy
  {
    id: '26',
    question: 'Is my data secure?',
    answer: 'Yes! All data is encrypted in transit (SSL/TLS) and at rest. We use industry-standard security practices and comply with GDPR and CCPA regulations. Your files are stored securely on Firebase with enterprise-grade security.',
    category: 'security'
  },
  {
    id: '27',
    question: 'Who can see my transcriptions?',
    answer: 'Only you can see your transcriptions. We never share, sell, or use your data for training AI models. Your content is completely private and secure.',
    category: 'security'
  },
  {
    id: '28',
    question: 'How long do you keep my files?',
    answer: 'Your transcriptions and audio files are stored indefinitely as long as your account is active. You can delete files anytime from your dashboard. Deleted files are permanently removed within 30 days.',
    category: 'security'
  },
  {
    id: '29',
    question: 'Can I delete my account and data?',
    answer: 'Yes! You can delete your account and all associated data from your account settings. This action is permanent and cannot be undone. All files, transcriptions, and content will be permanently deleted.',
    category: 'security'
  },
  {
    id: '30',
    question: 'Do you comply with GDPR?',
    answer: 'Yes! We are fully GDPR compliant. You have the right to access, export, and delete your data. We provide clear privacy controls and never share your data with third parties without consent.',
    category: 'security'
  },
];

export default function FAQPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const filteredFAQs = FAQS.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const getCategoryColor = (color: string) => {
    const colors: { [key: string]: string } = {
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200',
      red: 'bg-red-100 text-red-800 border-red-200',
      indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    };
    return colors[color] || colors.blue;
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100">
          <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                ❓ Frequently Asked Questions
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Find answers to common questions about our transcription and content repurposing platform
              </p>
            </div>

            {/* Search Bar */}
            <div className="max-w-3xl mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search for answers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="max-w-5xl mx-auto mb-8">
              <div className="flex items-center justify-center flex-wrap gap-3">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    !selectedCategory
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  All Questions
                </button>
                {CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center ${
                      selectedCategory === category.id
                        ? getCategoryColor(category.color)
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-2">{category.icon}</span>
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* FAQ List - Grouped by Category */}
            <div className="max-w-4xl mx-auto">
              {filteredFAQs.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
                  <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No results found</h3>
                  <p className="text-gray-600">Try adjusting your search or browse all categories</p>
                </div>
              ) : (
                <div className="space-y-12">
                  {CATEGORIES.map((category) => {
                    const categoryFAQs = filteredFAQs.filter(faq => faq.category === category.id);
                    
                    if (categoryFAQs.length === 0) return null;
                    
                    return (
                      <div key={category.id} className="space-y-4">
                        {/* Category Header */}
                        <div className={`flex items-center p-4 rounded-xl border-2 ${getCategoryColor(category.color)}`}>
                          <div className="mr-3">
                            {category.icon}
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold">{category.name}</h2>
                            <p className="text-sm opacity-75">{categoryFAQs.length} questions</p>
                          </div>
                        </div>
                        
                        {/* Category FAQs */}
                        <div className="space-y-3">
                          {categoryFAQs.map((faq) => {
                            const isExpanded = expandedFAQ === faq.id;
                            
                            return (
                              <div
                                key={faq.id}
                                className="bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl"
                              >
                                <button
                                  onClick={() => toggleFAQ(faq.id)}
                                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                                >
                                  <div className="flex-1 pr-4">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                      {faq.question}
                                    </h3>
                                  </div>
                                  <div className="flex-shrink-0">
                                    {isExpanded ? (
                                      <ChevronUp className="w-6 h-6 text-blue-500" />
                                    ) : (
                                      <ChevronDown className="w-6 h-6 text-gray-400" />
                                    )}
                                  </div>
                                </button>
                                
                                {isExpanded && (
                                  <div className="px-6 pb-5 pt-2 border-t border-gray-100">
                                    <p className="text-gray-700 leading-relaxed">
                                      {faq.answer}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Still Need Help */}
            <div className="max-w-4xl mx-auto mt-12">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-xl p-8 text-center text-white">
                <MessageSquare className="w-12 h-12 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-3">Still have questions?</h2>
                <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
                  Can't find what you're looking for? Our support team is here to help!
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => router.push('/support')}
                    className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                  >
                    Contact Support
                  </button>
                  <button
                    onClick={() => router.push('/tutorials')}
                    className="bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors"
                  >
                    View Tutorials
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="max-w-4xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                <Clock className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                <div className="text-2xl font-bold text-gray-900 mb-1">24/7</div>
                <div className="text-sm text-gray-600">Support Available</div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                <Users className="w-8 h-8 text-green-500 mx-auto mb-3" />
                <div className="text-2xl font-bold text-gray-900 mb-1">10K+</div>
                <div className="text-sm text-gray-600">Happy Users</div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                <Download className="w-8 h-8 text-purple-500 mx-auto mb-3" />
                <div className="text-2xl font-bold text-gray-900 mb-1">1M+</div>
                <div className="text-sm text-gray-600">Transcriptions</div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
