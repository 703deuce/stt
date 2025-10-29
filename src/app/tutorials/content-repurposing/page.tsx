'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { 
  Share2, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  FileText,
  MessageSquare,
  Video,
  Book,
  Users,
  Lightbulb,
  Download,
  Info,
  Sparkles,
  Zap,
  Target
} from 'lucide-react';

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  content: React.ReactNode;
  tips?: string[];
}

export default function ContentRepurposingTutorial() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const steps: TutorialStep[] = [
    {
      id: 1,
      title: "What is Content Repurposing?",
      description: "Transform one transcription into 37+ content formats",
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-l-4 border-pink-400 p-6 rounded-r-lg">
            <div className="flex items-center mb-3">
              <Sparkles className="w-5 h-5 text-pink-600 mr-2" />
              <h3 className="text-lg font-semibold text-pink-800">The Power of Content Repurposing</h3>
            </div>
            <p className="text-pink-700">
              Turn a single transcription into 37+ different content formats using AI-powered frameworks. 
              Create blog posts, social media content, marketing materials, video scripts, and more - 
              all from one source!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">37+</div>
              <h4 className="font-semibold text-gray-900 mb-2">Content Types</h4>
              <p className="text-gray-600 text-sm">From blogs to social posts</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">10+</div>
              <h4 className="font-semibold text-gray-900 mb-2">AI Frameworks</h4>
              <p className="text-gray-600 text-sm">AIDA, BAB, PAS, and more</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">1-Click</div>
              <h4 className="font-semibold text-gray-900 mb-2">Generation</h4>
              <p className="text-gray-600 text-sm">Instant content creation</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-4">Content Categories</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-500 mr-3" />
                  <span className="text-sm font-medium">Long-Form Written (5 types)</span>
                </div>
                <div className="flex items-center p-3 bg-pink-50 rounded-lg">
                  <Share2 className="w-5 h-5 text-pink-500 mr-3" />
                  <span className="text-sm font-medium">Social Media (6 types)</span>
                </div>
                <div className="flex items-center p-3 bg-green-50 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-sm font-medium">Marketing (4 types)</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-red-50 rounded-lg">
                  <Video className="w-5 h-5 text-red-500 mr-3" />
                  <span className="text-sm font-medium">Video & Multimedia (3 types)</span>
                </div>
                <div className="flex items-center p-3 bg-purple-50 rounded-lg">
                  <Book className="w-5 h-5 text-purple-500 mr-3" />
                  <span className="text-sm font-medium">Knowledge (4 types)</span>
                </div>
                <div className="flex items-center p-3 bg-orange-50 rounded-lg">
                  <Lightbulb className="w-5 h-5 text-orange-500 mr-3" />
                  <span className="text-sm font-medium">Creative & More (15+ types)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      tips: [
        "One transcription can create content for an entire month",
        "All content uses professional marketing frameworks",
        "Content is generated based on YOUR transcription - no generic filler"
      ]
    },
    {
      id: 2,
      title: "Accessing Content Repurposing",
      description: "Navigate to the content repurposing feature",
      content: (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Getting Started</h3>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-pink-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1">1</div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Go to Content Repurposing Page</h4>
                  <p className="text-gray-600">Click "Content Repurposing" in the main navigation menu</p>
                  <div className="bg-gray-100 p-3 rounded-lg mt-2">
                    <code className="text-sm text-gray-700">🔄 Content Repurposing</code>
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-pink-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1">2</div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Select a Transcription</h4>
                  <p className="text-gray-600">Choose which transcription you want to repurpose</p>
                  <div className="bg-gray-100 p-3 rounded-lg mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">📄 My Meeting Transcript</span>
                      <button className="bg-blue-500 text-white px-3 py-1 rounded text-xs">Select</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-pink-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1">3</div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Browse Content Types</h4>
                  <p className="text-gray-600">Explore 37+ content types organized by category</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-r-lg">
            <div className="flex items-center mb-3">
              <Info className="w-5 h-5 text-blue-600 mr-2" />
              <h4 className="text-lg font-semibold text-blue-800">Quick Access</h4>
            </div>
            <p className="text-blue-700">
              You can also access content repurposing directly from any transcription detail page 
              by clicking the "Repurpose Content" button.
            </p>
          </div>
        </div>
      ),
      tips: [
        "Content repurposing is only available for completed transcriptions",
        "You can generate multiple content types from the same transcription",
        "All generated content is saved to your content library"
      ]
    },
    {
      id: 3,
      title: "Choosing Content Types",
      description: "Explore the 37+ content formats available",
      content: (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Content Type Categories</h3>
            
            <div className="space-y-6">
              <div className="border rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <FileText className="w-6 h-6 text-blue-500 mr-3" />
                  <h4 className="font-semibold text-gray-900">Long-Form Written Content</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">Short Blog Post</p>
                    <p className="text-xs text-gray-600">500-800 words • AIDA Framework</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">Long Blog Post</p>
                    <p className="text-xs text-gray-600">1500-2000 words • AIDA Framework</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">Show Notes</p>
                    <p className="text-xs text-gray-600">800 words • ACCA Framework</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">Newsletter</p>
                    <p className="text-xs text-gray-600">600 words • AIDA Framework</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">Case Study</p>
                    <p className="text-xs text-gray-600">1200 words • 4Ps Framework</p>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <Share2 className="w-6 h-6 text-pink-500 mr-3" />
                  <h4 className="font-semibold text-gray-900">Social Media Content</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">LinkedIn Post</p>
                    <p className="text-xs text-gray-600">200 words • BAB Framework</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">Facebook Post</p>
                    <p className="text-xs text-gray-600">150 words • BAB Framework</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">Instagram Caption</p>
                    <p className="text-xs text-gray-600">150 words • BAB Framework</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">Twitter Thread</p>
                    <p className="text-xs text-gray-600">300 words • Hook-Story-Offer</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">TikTok Script</p>
                    <p className="text-xs text-gray-600">120 words • 4Cs Framework</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">Quote Graphics</p>
                    <p className="text-xs text-gray-600">5 shareable quotes</p>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <MessageSquare className="w-6 h-6 text-green-500 mr-3" />
                  <h4 className="font-semibold text-gray-900">Marketing & Outreach</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">Email Campaign</p>
                    <p className="text-xs text-gray-600">400 words • AIDA Framework</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">Sales Outreach</p>
                    <p className="text-xs text-gray-600">200 words • PAS Framework</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">Ad Copy</p>
                    <p className="text-xs text-gray-600">150 words • AIDA Framework</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">Landing Page</p>
                    <p className="text-xs text-gray-600">400 words • AIDA + QUEST</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">+ 24 More Content Types!</h4>
                <p className="text-gray-600 text-sm">
                  Including video scripts, meeting notes, tutorials, presentations, infographics, 
                  and much more. Each optimized with professional frameworks.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
      tips: [
        "Each content type uses a proven marketing framework",
        "Content is tailored to the platform and audience",
        "You can customize any content type with custom instructions"
      ]
    },
    {
      id: 4,
      title: "Understanding Frameworks",
      description: "Learn about the AI frameworks powering your content",
      content: (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Marketing Frameworks Explained</h3>
            
            <div className="space-y-6">
              <div className="border rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mr-3">Popular</div>
                  <h4 className="font-semibold text-gray-900">AIDA Framework</h4>
                </div>
                <p className="text-gray-600 mb-4">Attention → Interest → Desire → Action</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Used in:</strong> Blog posts, email campaigns, ad copy, newsletters<br/>
                    <strong>Best for:</strong> Persuasive content that drives action
                  </p>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium mr-3">Social</div>
                  <h4 className="font-semibold text-gray-900">BAB Framework</h4>
                </div>
                <p className="text-gray-600 mb-4">Before → After → Bridge</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Used in:</strong> Social media posts (Facebook, Instagram, LinkedIn)<br/>
                    <strong>Best for:</strong> Transformation stories and engaging content
                  </p>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium mr-3">Sales</div>
                  <h4 className="font-semibold text-gray-900">PAS Framework</h4>
                </div>
                <p className="text-gray-600 mb-4">Problem → Agitate → Solve</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Used in:</strong> Sales outreach emails<br/>
                    <strong>Best for:</strong> Problem-solution content that converts
                  </p>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium mr-3">Video</div>
                  <h4 className="font-semibold text-gray-900">4Cs Framework</h4>
                </div>
                <p className="text-gray-600 mb-4">Clear → Concise → Compelling → Credible</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Used in:</strong> TikTok/Reels scripts<br/>
                    <strong>Best for:</strong> Short-form video content that engages
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-400 p-6 rounded-r-lg">
                <h4 className="font-semibold text-blue-800 mb-3">Why Frameworks Matter</h4>
                <p className="text-blue-700">
                  Frameworks provide proven structures that professional marketers use. They ensure 
                  your content is persuasive, engaging, and effective - but the AI fills them with 
                  YOUR transcription content, not generic templates.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
      tips: [
        "Frameworks are invisible in the final content - you only see polished results",
        "Each content type uses the framework best suited for that format",
        "The AI applies frameworks to YOUR content, not generic templates"
      ]
    },
    {
      id: 5,
      title: "Generating Content",
      description: "Create your first repurposed content",
      content: (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Content Generation Process</h3>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1">1</div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Select Content Type</h4>
                  <p className="text-gray-600">Click on any content type card to select it</p>
                  <div className="bg-gray-100 p-3 rounded-lg mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">📘 Facebook Post</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">150 words</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1">2</div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Add Custom Instructions (Optional)</h4>
                  <p className="text-gray-600">Customize the tone, style, or focus</p>
                  <div className="bg-gray-100 p-3 rounded-lg mt-2">
                    <textarea 
                      placeholder="e.g., 'Make it more casual and add emojis'"
                      className="w-full bg-white border rounded-lg px-3 py-2 text-sm"
                      rows={2}
                      disabled
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1">3</div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Click "Generate Content"</h4>
                  <p className="text-gray-600">AI will create your content in seconds</p>
                  <div className="bg-gray-100 p-3 rounded-lg mt-2">
                    <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg text-sm font-semibold">
                      ✨ Generate Content
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1">4</div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Review & Export</h4>
                  <p className="text-gray-600">View your generated content and export it</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Example Generated Content</h3>
            
            <div className="border rounded-lg p-6 bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900">Facebook Post</h4>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">✓ Generated</span>
              </div>
              <div className="bg-white p-4 rounded-lg mb-4">
                <p className="text-gray-700 leading-relaxed">
                  Ever feel stuck trying to turn your audio content into written posts? 📝<br/><br/>
                  
                  Imagine having 37+ different content formats created from a single transcription - 
                  blog posts, social media content, marketing materials, all in seconds! ✨<br/><br/>
                  
                  That's the power of AI-powered content repurposing. Your transcription becomes 
                  the foundation for an entire content strategy, saving you hours of work.<br/><br/>
                  
                  What content format would you create first? 👇
                </p>
              </div>
              <div className="flex gap-3">
                <button className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors">
                  Copy
                </button>
                <button className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 transition-colors">
                  Download
                </button>
                <button className="bg-purple-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-600 transition-colors">
                  Regenerate
                </button>
              </div>
            </div>
          </div>
        </div>
      ),
      tips: [
        "Generation typically takes 5-15 seconds depending on content length",
        "You can regenerate content if you want a different version",
        "All generated content is saved to your content library"
      ]
    },
    {
      id: 6,
      title: "Managing Your Content",
      description: "Organize, export, and reuse your generated content",
      content: (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Content Library</h3>
            
            <div className="space-y-6">
              <div className="border rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Book className="w-5 h-5 text-blue-500 mr-2" />
                  Your Content Library
                </h4>
                <p className="text-gray-600 mb-4">
                  All generated content is automatically saved to your content library. 
                  Access it anytime from the "My Content" page.
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Facebook Post - Meeting Summary</p>
                        <p className="text-xs text-gray-500">Generated 2 hours ago • 147 words</p>
                      </div>
                      <button className="text-blue-500 text-sm">View</button>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Blog Post - Product Launch</p>
                        <p className="text-xs text-gray-500">Generated yesterday • 823 words</p>
                      </div>
                      <button className="text-blue-500 text-sm">View</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Download className="w-5 h-5 text-green-500 mr-2" />
                  Export Options
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors">
                    📄 TXT
                  </button>
                  <button className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 transition-colors">
                    📝 DOCX
                  </button>
                  <button className="bg-purple-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-600 transition-colors">
                    📋 Copy
                  </button>
                  <button className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600 transition-colors">
                    📧 Email
                  </button>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Target className="w-5 h-5 text-purple-500 mr-2" />
                  Content Strategy Tips
                </h4>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <Zap className="w-5 h-5 text-yellow-500 mr-3 mt-1" />
                    <div>
                      <h5 className="font-medium text-gray-900">Create a Content Calendar</h5>
                      <p className="text-sm text-gray-600">Generate multiple formats and schedule them throughout the month</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Zap className="w-5 h-5 text-yellow-500 mr-3 mt-1" />
                    <div>
                      <h5 className="font-medium text-gray-900">Repurpose Across Platforms</h5>
                      <p className="text-sm text-gray-600">Use the same transcription for blog, social media, and email</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <Zap className="w-5 h-5 text-yellow-500 mr-3 mt-1" />
                    <div>
                      <h5 className="font-medium text-gray-900">Test Different Formats</h5>
                      <p className="text-sm text-gray-600">Try various content types to see what resonates with your audience</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-green-400 p-6 rounded-r-lg">
                <div className="flex items-center mb-3">
                  <Sparkles className="w-5 h-5 text-green-600 mr-2" />
                  <h4 className="text-lg font-semibold text-green-800">Pro Strategy</h4>
                </div>
                <p className="text-green-700">
                  Record one podcast episode or meeting, transcribe it, then generate: 
                  1 blog post, 5 social media posts, 1 email newsletter, 1 video script, 
                  and 1 case study. That's 9+ pieces of content from one source!
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
      tips: [
        "Organize content by campaign or topic for easy access",
        "Regenerate content anytime if you want different variations",
        "Use custom instructions to match your brand voice"
      ]
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-100">
          <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => router.push('/tutorials')}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Tutorials
              </button>
              <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  🔄 Content Repurposing
                </h1>
                <p className="text-gray-600">Transform one transcription into 37+ formats</p>
              </div>
              <div className="w-24"></div>
            </div>

            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Step {currentStep + 1} of {steps.length}</span>
                <span>{Math.round(((currentStep + 1) / steps.length) * 100)}% Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-pink-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Sidebar Navigation */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-lg p-6 sticky top-8">
                  <h3 className="font-semibold text-gray-900 mb-4">Tutorial Steps</h3>
                  <nav className="space-y-2">
                    {steps.map((step, index) => (
                      <button
                        key={step.id}
                        onClick={() => goToStep(index)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          index === currentStep
                            ? 'bg-pink-500 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                            index === currentStep ? 'bg-white text-pink-500' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {index < currentStep ? <CheckCircle className="w-4 h-4" /> : step.id}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{step.title}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </nav>
                </div>
              </div>

              {/* Main Content */}
              <div className="lg:col-span-3">
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {steps[currentStep].title}
                    </h2>
                    <p className="text-gray-600">{steps[currentStep].description}</p>
                  </div>

                  <div className="mb-8">
                    {steps[currentStep].content}
                  </div>

                  {/* Tips */}
                  {steps[currentStep].tips && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-r-lg mb-8">
                      <h4 className="font-semibold text-yellow-800 mb-3 flex items-center">
                        💡 Pro Tips
                      </h4>
                      <ul className="space-y-2">
                        {steps[currentStep].tips!.map((tip, index) => (
                          <li key={index} className="text-yellow-700 text-sm flex items-start">
                            <span className="text-yellow-500 mr-2">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex justify-between items-center pt-6 border-t">
                    <button
                      onClick={prevStep}
                      disabled={currentStep === 0}
                      className={`flex items-center px-6 py-3 rounded-lg font-semibold transition-colors ${
                        currentStep === 0
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-500 text-white hover:bg-gray-600'
                      }`}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Previous
                    </button>

                    <div className="flex space-x-2">
                      {steps.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => goToStep(index)}
                          className={`w-3 h-3 rounded-full transition-colors ${
                            index === currentStep ? 'bg-pink-500' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>

                    {currentStep === steps.length - 1 ? (
                      <button
                        onClick={() => router.push('/tutorials/speaker-mapping')}
                        className="flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-blue-700 transition-all duration-300"
                      >
                        Next Tutorial
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </button>
                    ) : (
                      <button
                        onClick={nextStep}
                        className="flex items-center px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300"
                      >
                        Next
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
