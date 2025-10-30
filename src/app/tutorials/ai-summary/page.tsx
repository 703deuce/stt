'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { 
  FileText, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Sparkles,
  Clock,
  Target,
  Download,
  RefreshCw,
  Info,
  AlertCircle,
  Zap
} from 'lucide-react';

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  content: React.ReactNode;
  tips?: string[];
}

export default function AISummaryTutorial() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const steps: TutorialStep[] = [
    {
      id: 1,
      title: "Understanding AI Summaries",
      description: "Learn what AI summaries can do for you",
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-purple-400 p-6 rounded-r-lg">
            <div className="flex items-center mb-3">
              <Sparkles className="w-5 h-5 text-purple-600 mr-2" />
              <h3 className="text-lg font-semibold text-purple-800">What are AI Summaries?</h3>
            </div>
            <p className="text-purple-700">
              AI summaries use advanced language models to extract key insights, main points, and actionable items 
              from your transcriptions, saving you hours of manual work.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <FileText className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h4 className="font-semibold text-gray-900 mb-2">Brief Summary</h4>
              <p className="text-gray-600 text-sm">Quick overview in 2-3 sentences</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <Target className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h4 className="font-semibold text-gray-900 mb-2">Key Points</h4>
              <p className="text-gray-600 text-sm">Main topics and insights</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <Zap className="w-12 h-12 text-purple-500 mx-auto mb-4" />
              <h4 className="font-semibold text-gray-900 mb-2">Action Items</h4>
              <p className="text-gray-600 text-sm">Tasks and next steps</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-4">Summary Types Available</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium">Brief Summary</span>
                </div>
                <div className="flex items-center p-3 bg-green-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium">Detailed Summary</span>
                </div>
                <div className="flex items-center p-3 bg-purple-50 rounded-lg">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium">Key Points</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center p-3 bg-orange-50 rounded-lg">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium">Action Items</span>
                </div>
                <div className="flex items-center p-3 bg-pink-50 rounded-lg">
                  <div className="w-2 h-2 bg-pink-500 rounded-full mr-3"></div>
                  <span className="text-sm font-medium">Custom Prompts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      tips: [
        "AI summaries work best with clear, well-structured audio content",
        "Longer transcriptions provide more context for better summaries",
        "You can generate multiple summary types for the same transcription"
      ]
    },
    {
      id: 2,
      title: "Accessing AI Summary",
      description: "How to find and use the AI summary feature",
      content: (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Finding AI Summary</h3>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1">1</div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Go to Your Transcription</h4>
                  <p className="text-gray-600">Navigate to any completed transcription in your dashboard</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1">2</div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Look for AI Summary Panel</h4>
                  <p className="text-gray-600">Find the "AI Summary" section on the right side of the transcription view</p>
                  <div className="bg-gray-100 p-3 rounded-lg mt-2">
                    <code className="text-sm text-gray-700">🤖 AI Summary Panel</code>
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1">3</div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Click "Generate Summary"</h4>
                  <p className="text-gray-600">Start the AI processing for your selected summary type</p>
                  <div className="bg-gray-100 p-3 rounded-lg mt-2">
                    <code className="text-sm text-gray-700">✨ Generate Summary</code>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-r-lg">
            <div className="flex items-center mb-3">
              <Info className="w-5 h-5 text-yellow-600 mr-2" />
              <h4 className="text-lg font-semibold text-yellow-800">Quick Access</h4>
            </div>
            <p className="text-yellow-700">
              You can also access AI summaries from the main dashboard by clicking the summary icon next to any transcription.
            </p>
          </div>
        </div>
      ),
      tips: [
        "AI summaries are only available for completed transcriptions",
        "The summary panel appears automatically after transcription is complete",
        "You can generate summaries multiple times with different settings"
      ]
    },
    {
      id: 3,
      title: "Choose Summary Type",
      description: "Select the right summary format for your needs",
      content: (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Summary Type Options</h3>
            
            <div className="space-y-6">
              <div className="border rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mr-3">Quick</div>
                  <h4 className="font-semibold text-gray-900">Brief Summary</h4>
                </div>
                <p className="text-gray-600 mb-3">Perfect for: Quick overviews, executive summaries, meeting recaps</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 italic">
                    "The meeting covered quarterly performance metrics, discussed upcoming product launches, 
                    and identified key challenges in customer acquisition. Action items include finalizing 
                    the Q4 marketing strategy and scheduling follow-up meetings."
                  </p>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium mr-3">Detailed</div>
                  <h4 className="font-semibold text-gray-900">Detailed Summary</h4>
                </div>
                <p className="text-gray-600 mb-3">Perfect for: Comprehensive reports, detailed analysis, documentation</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-700 italic">
                    "The quarterly review meeting began with Sarah presenting the Q3 performance metrics, 
                    showing a 15% increase in revenue compared to Q2. Key highlights included successful 
                    product launches and improved customer satisfaction scores..."
                  </p>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium mr-3">Structured</div>
                  <h4 className="font-semibold text-gray-900">Key Points</h4>
                </div>
                <p className="text-gray-600 mb-3">Perfect for: Meeting notes, presentation outlines, study guides</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Q3 revenue increased by 15%</li>
                    <li>• New product launch scheduled for December</li>
                    <li>• Customer satisfaction improved to 4.2/5</li>
                    <li>• Marketing budget increased by $50K</li>
                  </ul>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium mr-3">Actionable</div>
                  <h4 className="font-semibold text-gray-900">Action Items</h4>
                </div>
                <p className="text-gray-600 mb-3">Perfect for: Task lists, follow-ups, project management</p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• [ ] Finalize Q4 marketing strategy by Friday</li>
                    <li>• [ ] Schedule follow-up meeting with design team</li>
                    <li>• [ ] Review customer feedback and create action plan</li>
                    <li>• [ ] Prepare presentation for board meeting</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      tips: [
        "Brief summaries are fastest to generate and perfect for quick overviews",
        "Detailed summaries provide more context but take longer to process",
        "Key points format is great for creating structured notes"
      ]
    },
    {
      id: 4,
      title: "Custom Prompts",
      description: "Create personalized summary prompts",
      content: (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Custom Summary Prompts</h3>
            
            <div className="space-y-6">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-r-lg">
                <h4 className="font-semibold text-blue-800 mb-3">What are Custom Prompts?</h4>
                <p className="text-blue-700">
                  Custom prompts let you specify exactly what you want the AI to focus on in your summary. 
                  This gives you more control over the output format and content.
                </p>
              </div>

              <div className="space-y-4">
                <div className="border rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Example Custom Prompts</h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Meeting Focus</label>
                      <div className="bg-gray-100 p-3 rounded-lg">
                        <code className="text-sm text-gray-700">
                          "Summarize this meeting focusing on decisions made, deadlines mentioned, and responsibilities assigned."
                        </code>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Technical Content</label>
                      <div className="bg-gray-100 p-3 rounded-lg">
                        <code className="text-sm text-gray-700">
                          "Extract all technical specifications, requirements, and implementation details mentioned."
                        </code>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Customer Feedback</label>
                      <div className="bg-gray-100 p-3 rounded-lg">
                        <code className="text-sm text-gray-700">
                          "Identify all customer complaints, suggestions, and positive feedback mentioned."
                        </code>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">How to Use Custom Prompts</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-1">1</div>
                      <div>
                        <h5 className="font-medium text-gray-900">Select "Custom Prompt"</h5>
                        <p className="text-gray-600 text-sm">Choose this option from the summary type dropdown</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-1">2</div>
                      <div>
                        <h5 className="font-medium text-gray-900">Enter Your Prompt</h5>
                        <p className="text-gray-600 text-sm">Type your specific instructions in the text area</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-1">3</div>
                      <div>
                        <h5 className="font-medium text-gray-900">Generate Summary</h5>
                        <p className="text-gray-600 text-sm">Click generate to create your custom summary</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      tips: [
        "Be specific in your custom prompts for better results",
        "Include context about what you want to focus on",
        "You can save custom prompts for future use"
      ]
    },
    {
      id: 5,
      title: "Review & Export",
      description: "Review your summaries and export them",
      content: (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Reviewing Your Summary</h3>
            
            <div className="space-y-6">
              <div className="border rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="w-5 h-5 text-blue-500 mr-2" />
                  Summary Display
                </h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Summary Type:</span>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Brief Summary</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Generated:</span>
                      <span className="text-sm text-gray-600">2 minutes ago</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Word Count:</span>
                      <span className="text-sm text-gray-600">247 words</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Summary Content</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 leading-relaxed">
                    The quarterly review meeting covered significant progress in Q3, with Sarah presenting 
                    impressive revenue growth of 15% compared to the previous quarter. Key achievements 
                    included successful product launches and improved customer satisfaction metrics. 
                    The team discussed upcoming challenges and identified action items for Q4, including 
                    finalizing marketing strategies and scheduling follow-up meetings with stakeholders.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <RefreshCw className="w-5 h-5 text-green-500 mr-2" />
                    Regenerate Options
                  </h4>
                  <div className="space-y-3">
                    <button className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors">
                      Regenerate Same Type
                    </button>
                    <button className="w-full bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 transition-colors">
                      Try Different Type
                    </button>
                    <button className="w-full bg-purple-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-600 transition-colors">
                      Custom Prompt
                    </button>
                  </div>
                </div>

                <div className="border rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                    <Download className="w-5 h-5 text-orange-500 mr-2" />
                    Export Options
                  </h4>
                  <div className="space-y-3">
                    <button className="w-full bg-gray-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-600 transition-colors">
                      Copy to Clipboard
                    </button>
                    <button className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors">
                      Download as TXT
                    </button>
                    <button className="w-full bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 transition-colors">
                      Save to Notes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border-l-4 border-green-400 p-6 rounded-r-lg">
            <div className="flex items-center mb-3">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <h4 className="text-lg font-semibold text-green-800">Pro Tip</h4>
            </div>
            <p className="text-green-700">
              You can generate multiple summary types for the same transcription and compare them. 
              This helps you find the format that works best for your specific use case.
            </p>
          </div>
        </div>
      ),
      tips: [
        "Always review AI summaries before using them in important documents",
        "You can regenerate summaries multiple times to get different perspectives",
        "Export summaries in different formats for different use cases"
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
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100">
          <div className="container mx-auto px-4 py-6 sm:py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 sm:mb-8 gap-3 flex-wrap">
              <button
                onClick={() => router.push('/tutorials')}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Tutorials
              </button>
              <div className="text-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  🤖 AI Summary Generation
                </h1>
                <p className="text-gray-600">Learn how to create intelligent summaries</p>
              </div>
              <div className="w-24"></div> {/* Spacer */}
            </div>

            {/* Progress Bar */}
            <div className="mb-6 sm:mb-8">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Step {currentStep + 1} of {steps.length}</span>
                <span>{Math.round(((currentStep + 1) / steps.length) * 100)}% Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
              {/* Sidebar Navigation */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 sticky top-8">
                  <h3 className="font-semibold text-gray-900 mb-4">Tutorial Steps</h3>
                  <nav className="space-y-2">
                    {steps.map((step, index) => (
                      <button
                        key={step.id}
                        onClick={() => goToStep(index)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          index === currentStep
                            ? 'bg-purple-500 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                            index === currentStep ? 'bg-white text-purple-500' : 'bg-gray-200 text-gray-600'
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
                <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
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
                            index === currentStep ? 'bg-purple-500' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>

                    {currentStep === steps.length - 1 ? (
                      <button
                        onClick={() => router.push('/tutorials/ai-chat')}
                        className="flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-blue-700 transition-all duration-300"
                      >
                        Next Tutorial
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </button>
                    ) : (
                      <button
                        onClick={nextStep}
                        className="flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-blue-700 transition-all duration-300"
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
