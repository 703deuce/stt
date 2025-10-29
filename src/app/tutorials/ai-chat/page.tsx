'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { 
  MessageSquare, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Send,
  Search,
  Lightbulb,
  History,
  Download,
  Info,
  AlertCircle,
  Zap,
  Brain
} from 'lucide-react';

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  content: React.ReactNode;
  tips?: string[];
}

export default function AIChatTutorial() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const steps: TutorialStep[] = [
    {
      id: 1,
      title: "Understanding AI Chat",
      description: "Learn how to chat with your transcriptions",
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-green-400 p-6 rounded-r-lg">
            <div className="flex items-center mb-3">
              <Brain className="w-5 h-5 text-green-600 mr-2" />
              <h3 className="text-lg font-semibold text-green-800">What is AI Chat?</h3>
            </div>
            <p className="text-green-700">
              AI Chat lets you have a conversation with your transcription content. Ask questions, 
              get insights, find specific information, and explore your content in a natural, 
              conversational way using advanced AI technology.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <Search className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h4 className="font-semibold text-gray-900 mb-2">Find Information</h4>
              <p className="text-gray-600 text-sm">Quickly locate specific details</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <Lightbulb className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h4 className="font-semibold text-gray-900 mb-2">Get Insights</h4>
              <p className="text-gray-600 text-sm">Discover patterns and key points</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <MessageSquare className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h4 className="font-semibold text-gray-900 mb-2">Ask Questions</h4>
              <p className="text-gray-600 text-sm">Natural conversation interface</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-4">What You Can Do with AI Chat</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-blue-500 mr-3" />
                  <span className="text-sm">Ask specific questions</span>
                </div>
                <div className="flex items-center p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                  <span className="text-sm">Find key information quickly</span>
                </div>
                <div className="flex items-center p-3 bg-purple-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-purple-500 mr-3" />
                  <span className="text-sm">Get clarification on topics</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-orange-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-orange-500 mr-3" />
                  <span className="text-sm">Extract specific details</span>
                </div>
                <div className="flex items-center p-3 bg-pink-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-pink-500 mr-3" />
                  <span className="text-sm">Explore related concepts</span>
                </div>
                <div className="flex items-center p-3 bg-indigo-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-indigo-500 mr-3" />
                  <span className="text-sm">Review chat history</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      tips: [
        "AI Chat works best with clear, specific questions",
        "The AI has access to your entire transcription for context",
        "You can ask follow-up questions to dive deeper into topics"
      ]
    },
    {
      id: 2,
      title: "Accessing AI Chat",
      description: "How to start a chat with your transcription",
      content: (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Starting AI Chat</h3>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1">1</div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Open Your Transcription</h4>
                  <p className="text-gray-600">Navigate to any completed transcription in your dashboard</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1">2</div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Find AI Chat Panel</h4>
                  <p className="text-gray-600">Look for the "AI Chat" section on the right side of the page</p>
                  <div className="bg-gray-100 p-3 rounded-lg mt-2">
                    <code className="text-sm text-gray-700">💬 AI Chat Panel</code>
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1">3</div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Type Your Question</h4>
                  <p className="text-gray-600">Enter your question in the chat input box</p>
                  <div className="bg-gray-100 p-3 rounded-lg mt-2 flex items-center">
                    <input 
                      type="text" 
                      placeholder="Ask a question about this transcription..." 
                      className="flex-1 bg-white border rounded-lg px-3 py-2 text-sm mr-2"
                      disabled
                    />
                    <button className="bg-blue-500 text-white p-2 rounded-lg">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
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
              You can also access AI Chat from the main dashboard by clicking the chat icon next to any transcription.
            </p>
          </div>
        </div>
      ),
      tips: [
        "AI Chat is only available for completed transcriptions",
        "The chat panel opens automatically when you view a transcription",
        "Your chat history is saved for each transcription"
      ]
    },
    {
      id: 3,
      title: "Asking Effective Questions",
      description: "Learn how to get the best answers",
      content: (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Question Examples</h3>
            
            <div className="space-y-6">
              <div className="border rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mr-3">Specific</div>
                  <h4 className="font-semibold text-gray-900">Finding Specific Information</h4>
                </div>
                <div className="space-y-3">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Question:</p>
                    <p className="text-sm text-gray-600 italic">"What was the revenue figure mentioned in the meeting?"</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-blue-700 mb-2">AI Response:</p>
                    <p className="text-sm text-blue-600">"The revenue figure mentioned was $2.5 million for Q3, representing a 15% increase from Q2."</p>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium mr-3">Summary</div>
                  <h4 className="font-semibold text-gray-900">Getting Summaries</h4>
                </div>
                <div className="space-y-3">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Question:</p>
                    <p className="text-sm text-gray-600 italic">"What were the main topics discussed?"</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-green-700 mb-2">AI Response:</p>
                    <p className="text-sm text-green-600">"The main topics were: 1) Q3 financial results, 2) Product launch timeline, 3) Marketing strategy for Q4, and 4) Team expansion plans."</p>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium mr-3">Analysis</div>
                  <h4 className="font-semibold text-gray-900">Asking for Analysis</h4>
                </div>
                <div className="space-y-3">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Question:</p>
                    <p className="text-sm text-gray-600 italic">"What concerns were raised about the product launch?"</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-purple-700 mb-2">AI Response:</p>
                    <p className="text-sm text-purple-600">"Three main concerns were raised: 1) Timeline constraints with the December deadline, 2) Resource allocation for the marketing team, and 3) Potential supply chain issues."</p>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium mr-3">Action</div>
                  <h4 className="font-semibold text-gray-900">Extracting Action Items</h4>
                </div>
                <div className="space-y-3">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Question:</p>
                    <p className="text-sm text-gray-600 italic">"What tasks were assigned to the marketing team?"</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-orange-700 mb-2">AI Response:</p>
                    <p className="text-sm text-orange-600">"The marketing team was assigned: 1) Finalize Q4 campaign strategy by Friday, 2) Create social media content calendar, and 3) Schedule meetings with design team."</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      tips: [
        "Be specific - the more precise your question, the better the answer",
        "Ask one question at a time for clearer responses",
        "You can ask follow-up questions to get more details"
      ]
    },
    {
      id: 4,
      title: "Chat History & Context",
      description: "Managing your conversation history",
      content: (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Understanding Chat History</h3>
            
            <div className="space-y-6">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-r-lg">
                <h4 className="font-semibold text-blue-800 mb-3">Contextual Conversations</h4>
                <p className="text-blue-700">
                  The AI remembers your entire conversation history within each transcription. 
                  This means you can ask follow-up questions and the AI will understand the context.
                </p>
              </div>

              <div className="border rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <History className="w-5 h-5 text-green-500 mr-2" />
                  Example Conversation Flow
                </h4>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="bg-blue-500 text-white rounded-lg p-3 max-w-md">
                      <p className="text-sm">What was the main topic of the meeting?</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start justify-end">
                    <div className="bg-gray-100 rounded-lg p-3 max-w-md">
                      <p className="text-sm text-gray-700">The main topic was the Q3 financial review and planning for Q4 initiatives.</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-blue-500 text-white rounded-lg p-3 max-w-md">
                      <p className="text-sm">What specific initiatives were mentioned?</p>
                    </div>
                  </div>

                  <div className="flex items-start justify-end">
                    <div className="bg-gray-100 rounded-lg p-3 max-w-md">
                      <p className="text-sm text-gray-700">Three initiatives: 1) New product launch in December, 2) Marketing campaign expansion, and 3) Team hiring for customer support.</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-blue-500 text-white rounded-lg p-3 max-w-md">
                      <p className="text-sm">Tell me more about the product launch</p>
                    </div>
                  </div>

                  <div className="flex items-start justify-end">
                    <div className="bg-gray-100 rounded-lg p-3 max-w-md">
                      <p className="text-sm text-gray-700">The product launch is scheduled for mid-December, with a focus on the enterprise market. The team discussed timeline concerns and resource allocation.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Chat Features</h4>
                  <div className="space-y-3">
                    <div className="flex items-center p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                      <span className="text-sm">Persistent history</span>
                    </div>
                    <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-blue-500 mr-3" />
                      <span className="text-sm">Contextual responses</span>
                    </div>
                    <div className="flex items-center p-3 bg-purple-50 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-purple-500 mr-3" />
                      <span className="text-sm">Follow-up questions</span>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Management Options</h4>
                  <div className="space-y-3">
                    <button className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors">
                      View Full History
                    </button>
                    <button className="w-full bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 transition-colors">
                      Export Chat
                    </button>
                    <button className="w-full bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600 transition-colors">
                      Clear History
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      tips: [
        "Chat history is saved per transcription - each file has its own conversation",
        "Use follow-up questions to dive deeper into specific topics",
        "You can export chat history for documentation purposes"
      ]
    },
    {
      id: 5,
      title: "Advanced Tips & Tricks",
      description: "Get the most out of AI Chat",
      content: (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Power User Tips</h3>
            
            <div className="space-y-6">
              <div className="border rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Zap className="w-5 h-5 text-yellow-500 mr-2" />
                  Quick Commands
                </h4>
                <div className="space-y-3">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">List all speakers:</p>
                    <code className="text-sm text-blue-600">"Who are all the speakers in this transcription?"</code>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Find timestamps:</p>
                    <code className="text-sm text-blue-600">"When was [topic] discussed?"</code>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Compare topics:</p>
                    <code className="text-sm text-blue-600">"What's the difference between [topic A] and [topic B]?"</code>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Lightbulb className="w-5 h-5 text-orange-500 mr-2" />
                  Best Practices
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h5 className="font-medium text-green-800 mb-2">✅ DO</h5>
                      <ul className="text-sm text-green-700 space-y-1">
                        <li>• Ask specific questions</li>
                        <li>• Use follow-up questions</li>
                        <li>• Reference speakers by name</li>
                        <li>• Ask for clarification</li>
                      </ul>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h5 className="font-medium text-red-800 mb-2">❌ DON'T</h5>
                      <ul className="text-sm text-red-700 space-y-1">
                        <li>• Ask multiple questions at once</li>
                        <li>• Use vague language</li>
                        <li>• Expect info not in transcript</li>
                        <li>• Skip context in new chats</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Download className="w-5 h-5 text-blue-500 mr-2" />
                  Export & Share
                </h4>
                <p className="text-gray-600 mb-4">Save your AI chat conversations for future reference or share insights with your team.</p>
                <div className="grid grid-cols-2 gap-3">
                  <button className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors">
                    📄 Export as TXT
                  </button>
                  <button className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 transition-colors">
                    📋 Copy to Clipboard
                  </button>
                  <button className="bg-purple-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-600 transition-colors">
                    📧 Email Chat
                  </button>
                  <button className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600 transition-colors">
                    🔗 Share Link
                  </button>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-400 p-6 rounded-r-lg">
                <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Pro Tip: Combine with Other Features
                </h4>
                <p className="text-blue-700">
                  Use AI Chat alongside AI Summaries and Content Repurposing for a complete workflow. 
                  Ask questions to understand your content, generate summaries for quick reference, 
                  and repurpose into multiple formats - all from the same transcription!
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
      tips: [
        "The AI can only answer based on what's in the transcription",
        "More specific questions lead to more accurate answers",
        "Save important chat conversations for future reference"
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
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100">
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
                  💬 AI Chat Functionality
                </h1>
                <p className="text-gray-600">Learn how to chat with your transcriptions</p>
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
                  className="bg-gradient-to-r from-green-500 to-blue-600 h-2 rounded-full transition-all duration-300"
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
                            ? 'bg-green-500 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                            index === currentStep ? 'bg-white text-green-500' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {index < currentStep ? <CheckCircle className="w-4 h-4" /> : step.id}
                          </div>
                          <div>
                            <div className="font-medium">{step.title}</div>
                            <div className="text-xs opacity-75">{step.description}</div>
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
                            index === currentStep ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>

                    {currentStep === steps.length - 1 ? (
                      <button
                        onClick={() => router.push('/tutorials/content-repurposing')}
                        className="flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-blue-700 transition-all duration-300"
                      >
                        Next Tutorial
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </button>
                    ) : (
                      <button
                        onClick={nextStep}
                        className="flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-blue-700 transition-all duration-300"
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
