'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { 
  Upload, 
  FileText, 
  MessageSquare, 
  Share2, 
  Users,
  Play,
  ArrowRight,
  CheckCircle,
  Clock,
  Target
} from 'lucide-react';

interface TutorialCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  estimatedTime: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  features: string[];
  route: string;
}

const TUTORIALS: TutorialCard[] = [
  {
    id: 'transcription',
    title: 'Transcription Upload & Processing',
    description: 'Learn how to upload audio files and get accurate transcriptions with speaker identification.',
    icon: <Upload className="w-8 h-8" />,
    estimatedTime: '5 minutes',
    difficulty: 'Beginner',
    features: [
      'Upload audio files (MP3, WAV, M4A)',
      'Configure transcription settings',
      'Enable speaker diarization',
      'Monitor processing status',
      'Download results'
    ],
    route: '/tutorials/transcription'
  },
  {
    id: 'ai-summary',
    title: 'AI Summary Generation',
    description: 'Generate intelligent summaries of your transcriptions using AI-powered analysis.',
    icon: <FileText className="w-8 h-8" />,
    estimatedTime: '3 minutes',
    difficulty: 'Beginner',
    features: [
      'Brief, detailed, and key points summaries',
      'Action items extraction',
      'Custom summary prompts',
      'Real-time generation',
      'Export summaries'
    ],
    route: '/tutorials/ai-summary'
  },
  {
    id: 'ai-chat',
    title: 'AI Chat Functionality',
    description: 'Chat with your transcriptions using AI to ask questions and get insights.',
    icon: <MessageSquare className="w-8 h-8" />,
    estimatedTime: '4 minutes',
    difficulty: 'Intermediate',
    features: [
      'Ask questions about your content',
      'Get specific insights',
      'Find key information quickly',
      'Contextual AI responses',
      'Chat history tracking'
    ],
    route: '/tutorials/ai-chat'
  },
  {
    id: 'content-repurposing',
    title: 'Content Repurposing',
    description: 'Transform your transcriptions into 37+ different content formats using AI frameworks.',
    icon: <Share2 className="w-8 h-8" />,
    estimatedTime: '6 minutes',
    difficulty: 'Intermediate',
    features: [
      '37+ content types available',
      'Social media posts (Facebook, Instagram, LinkedIn)',
      'Blog posts and articles',
      'Marketing materials',
      'Video scripts and descriptions',
      'Professional frameworks (AIDA, BAB, etc.)'
    ],
    route: '/tutorials/content-repurposing'
  },
  {
    id: 'speaker-mapping',
    title: 'Speaker Mapping & Management',
    description: 'Customize speaker names and manage multiple speakers in your transcriptions.',
    icon: <Users className="w-8 h-8" />,
    estimatedTime: '3 minutes',
    difficulty: 'Beginner',
    features: [
      'Rename speakers (Speaker_00 → John Smith)',
      'Manage multiple speakers',
      'Bulk speaker updates',
      'Speaker-specific insights',
      'Export with custom names'
    ],
    route: '/tutorials/speaker-mapping'
  }
];

const DIFFICULTY_COLORS = {
  Beginner: 'bg-green-100 text-green-800',
  Intermediate: 'bg-yellow-100 text-yellow-800',
  Advanced: 'bg-red-100 text-red-800'
};

export default function TutorialsPage() {
  const router = useRouter();

  const handleTutorialClick = (route: string) => {
    router.push(route);
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                📚 Tutorial Center
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Master every feature of our transcription platform with step-by-step tutorials. 
                From basic transcription to advanced AI-powered content creation.
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white rounded-xl p-6 shadow-lg text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">5</div>
                <div className="text-gray-600">Core Features</div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-lg text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">37+</div>
                <div className="text-gray-600">Content Types</div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-lg text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">21</div>
                <div className="text-gray-600">Minutes Total</div>
              </div>
            </div>

            {/* Tutorial Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {TUTORIALS.map((tutorial) => (
                <div
                  key={tutorial.id}
                  className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer group"
                  onClick={() => handleTutorialClick(tutorial.route)}
                >
                  <div className="p-8">
                    {/* Icon and Header */}
                    <div className="flex items-center mb-6">
                      <div className="bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-xl p-3 mr-4 group-hover:scale-110 transition-transform duration-300">
                        {tutorial.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {tutorial.title}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            {tutorial.estimatedTime}
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${DIFFICULTY_COLORS[tutorial.difficulty]}`}>
                            {tutorial.difficulty}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      {tutorial.description}
                    </p>

                    {/* Features */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                        <Target className="w-4 h-4 mr-2" />
                        What You'll Learn:
                      </h4>
                      <ul className="space-y-2">
                        {tutorial.features.map((feature, index) => (
                          <li key={index} className="flex items-start text-sm text-gray-600">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* CTA Button */}
                    <div className="flex items-center justify-between">
                      <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 flex items-center group-hover:scale-105">
                        Start Tutorial
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </button>
                      <Play className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors duration-300" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer CTA */}
            <div className="text-center mt-16">
              <div className="bg-white rounded-2xl p-8 shadow-lg max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Ready to Get Started?
                </h2>
                <p className="text-gray-600 mb-6">
                  Follow our tutorials to master every feature and unlock the full potential of your transcriptions.
                </p>
                <button
                  onClick={() => router.push('/tutorials/transcription')}
                  className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-green-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105"
                >
                  Start with Transcription Tutorial
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
