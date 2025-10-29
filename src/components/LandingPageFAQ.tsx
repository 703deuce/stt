'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, Shield, Sparkles, Zap, FileText } from 'lucide-react';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  icon: React.ReactNode;
}

const LANDING_FAQS: FAQ[] = [
  {
    id: '1',
    question: 'How accurate are the transcriptions?',
    answer: 'Our AI-powered transcription achieves 98.5%+ accuracy on clear audio. We use state-of-the-art speech recognition technology that handles multiple speakers, accents, and technical terminology with exceptional precision.',
    icon: <CheckCircle className="w-6 h-6 text-green-500" />
  },
  {
    id: '2',
    question: 'Can I try it before subscribing?',
    answer: 'Absolutely! New users get a free trial with credits to test all features including transcription, AI summaries, chat, and content repurposing. No credit card required to start - just sign up and begin transcribing immediately.',
    icon: <Sparkles className="w-6 h-6 text-purple-500" />
  },
  {
    id: '3',
    question: 'What file formats are supported?',
    answer: 'We support MP3, WAV, and M4A audio formats with files up to 2GB in size. Our platform handles everything from quick voice memos to full-length podcast episodes and multi-hour meetings.',
    icon: <FileText className="w-6 h-6 text-blue-500" />
  },
  {
    id: '4',
    question: 'How many content types can I generate?',
    answer: 'Transform your transcription into 37+ different content formats! Create blog posts, social media content (Facebook, Instagram, LinkedIn, Twitter), email campaigns, video scripts, meeting notes, case studies, and much more - all from a single transcription.',
    icon: <Zap className="w-6 h-6 text-orange-500" />
  },
  {
    id: '5',
    question: 'Is my data secure?',
    answer: 'Yes! All data is encrypted in transit (SSL/TLS) and at rest using enterprise-grade security. We comply with GDPR and CCPA regulations. Your files are completely private - we never share, sell, or use your data for training AI models.',
    icon: <Shield className="w-6 h-6 text-indigo-500" />
  }
];

export default function LandingPageFAQ() {
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>('1'); // First one expanded by default

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Everything you need to know about our transcription and content repurposing platform
          </p>
        </div>

        {/* FAQ List */}
        <div className="max-w-4xl mx-auto space-y-4">
          {LANDING_FAQS.map((faq, index) => {
            const isExpanded = expandedFAQ === faq.id;
            
            return (
              <div
                key={faq.id}
                className="bg-white rounded-2xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <button
                  onClick={() => toggleFAQ(faq.id)}
                  className="w-full px-6 md:px-8 py-6 flex items-start justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start flex-1 pr-4">
                    <div className="flex-shrink-0 mr-4 mt-1">
                      {faq.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-1">
                        {faq.question}
                      </h3>
                      {isExpanded && (
                        <p className="text-gray-700 leading-relaxed mt-3 pr-4">
                          {faq.answer}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isExpanded 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-gray-600 mb-6">
            Have more questions?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/faq"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 rounded-xl font-semibold border-2 border-blue-600 hover:bg-blue-50 transition-all duration-300 transform hover:scale-105"
            >
              View All FAQs
            </a>
            <a
              href="/support"
              className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Contact Support
            </a>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-1">98.5%+</div>
            <div className="text-sm text-gray-600">Accuracy</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-1">37+</div>
            <div className="text-sm text-gray-600">Content Types</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-1">10K+</div>
            <div className="text-sm text-gray-600">Happy Users</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600 mb-1">24/7</div>
            <div className="text-sm text-gray-600">Support</div>
          </div>
        </div>
      </div>
    </section>
  );
}
