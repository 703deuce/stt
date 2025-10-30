'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { 
  Upload, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Play,
  Pause,
  Settings,
  Download,
  Users,
  Clock,
  FileText,
  AlertCircle,
  Info
} from 'lucide-react';

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  content: React.ReactNode;
  tips?: string[];
}

export default function TranscriptionTutorial() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const steps: TutorialStep[] = [
    {
      id: 1,
      title: "Getting Started",
      description: "Learn the basics of transcription upload",
      content: (
        <div className="space-y-6">
          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-r-lg">
            <div className="flex items-center mb-3">
              <Info className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-blue-800">What is Transcription?</h3>
            </div>
            <p className="text-blue-700">
              Transcription converts your audio files into written text with speaker identification, 
              timestamps, and high accuracy using advanced AI technology.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <Upload className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h4 className="font-semibold text-gray-900 mb-2">Upload Audio</h4>
              <p className="text-gray-600 text-sm">Support for MP3, WAV, M4A files up to 2GB</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <Users className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h4 className="font-semibold text-gray-900 mb-2">Speaker Detection</h4>
              <p className="text-gray-600 text-sm">Automatically identifies different speakers</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-lg text-center">
              <Clock className="w-12 h-12 text-purple-500 mx-auto mb-4" />
              <h4 className="font-semibold text-gray-900 mb-2">Timestamps</h4>
              <p className="text-gray-600 text-sm">Word-level timing for precise navigation</p>
            </div>
          </div>
        </div>
      ),
      tips: [
        "Audio quality affects transcription accuracy - use clear recordings when possible",
        "Longer files take more time to process but provide better context",
        "You can upload multiple files simultaneously"
      ]
    },
    {
      id: 2,
      title: "Upload Your Audio",
      description: "Step-by-step file upload process",
      content: (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Upload Process</h3>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1">1</div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Click Upload Button</h4>
                  <p className="text-gray-600">On the main dashboard, click the "Upload Audio" button</p>
                  <div className="bg-gray-100 p-3 rounded-lg mt-2">
                    <code className="text-sm text-gray-700">📁 Upload Audio File</code>
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1">2</div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Select Your File</h4>
                  <p className="text-gray-600">Choose your audio file from your device</p>
                  <div className="bg-gray-100 p-3 rounded-lg mt-2">
                    <code className="text-sm text-gray-700">Supported: MP3, WAV, M4A (max 2GB)</code>
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1">3</div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">File Processing</h4>
                  <p className="text-gray-600">The system will validate and prepare your file</p>
                  <div className="bg-gray-100 p-3 rounded-lg mt-2">
                    <code className="text-sm text-gray-700">✓ File validated ✓ Ready for transcription</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      tips: [
        "Drag and drop files directly onto the upload area for faster uploads",
        "Check your internet connection for large file uploads",
        "You'll see a progress bar during the upload process"
      ]
    },
    {
      id: 3,
      title: "Configure Settings",
      description: "Customize your transcription settings",
      content: (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Transcription Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Users className="w-5 h-5 text-blue-500 mr-2" />
                    Speaker Diarization
                  </h4>
                  <p className="text-gray-600 text-sm mb-3">Automatically identify different speakers</p>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="checkbox" defaultChecked className="mr-2" />
                      <span className="text-sm">Enable speaker detection</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span className="text-sm">Single speaker mode</span>
                    </label>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Clock className="w-5 h-5 text-green-500 mr-2" />
                    Timestamps
                  </h4>
                  <p className="text-gray-600 text-sm mb-3">Include timing information</p>
                  <label className="flex items-center">
                    <input type="checkbox" defaultChecked className="mr-2" />
                    <span className="text-sm">Include word-level timestamps</span>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <Settings className="w-5 h-5 text-purple-500 mr-2" />
                    Advanced Settings
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Speakers</label>
                      <select className="w-full border rounded-lg px-3 py-2 text-sm">
                        <option>Auto-detect</option>
                        <option>2 speakers</option>
                        <option>3 speakers</option>
                        <option>4 speakers</option>
                        <option>5+ speakers</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Speaker Threshold</label>
                      <input type="range" min="0.1" max="1" step="0.1" defaultValue="0.5" className="w-full" />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Low</span>
                        <span>High</span>
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
        "Enable speaker diarization for interviews, meetings, or multi-person conversations",
        "Single speaker mode is faster for podcasts or monologues",
        "Higher speaker threshold = fewer false speaker changes"
      ]
    },
    {
      id: 4,
      title: "Start Processing",
      description: "Begin the transcription process",
      content: (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Starting Transcription</h3>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1">1</div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Review Settings</h4>
                  <p className="text-gray-600">Double-check your configuration before starting</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1">2</div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Click "Start Transcription"</h4>
                  <p className="text-gray-600">Begin the AI processing</p>
                  <div className="bg-gray-100 p-3 rounded-lg mt-2">
                    <code className="text-sm text-gray-700">🚀 Start Transcription</code>
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1">3</div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Monitor Progress</h4>
                  <p className="text-gray-600">Watch the real-time processing status</p>
                  <div className="bg-gray-100 p-3 rounded-lg mt-2">
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                      <code className="text-sm text-gray-700">Processing... 45% complete</code>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-r-lg">
              <div className="flex items-center mb-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                <h4 className="text-lg font-semibold text-yellow-800">Processing Time</h4>
              </div>
              <p className="text-yellow-700">
                Processing time depends on file length and complexity. A 10-minute audio file typically takes 2-3 minutes to process.
              </p>
            </div>
          </div>
        </div>
      ),
      tips: [
        "You can navigate away from the page - processing continues in the background",
        "You'll receive notifications when processing is complete",
        "Check your email for completion notifications"
      ]
    },
    {
      id: 5,
      title: "View Results",
      description: "Access and review your transcription",
      content: (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Transcription Results</h3>
            
            <div className="space-y-6">
              <div className="border rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="w-5 h-5 text-blue-500 mr-2" />
                  Transcript View
                </h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium mr-3 mt-1">Speaker 1</span>
                      <p className="text-gray-700">Hello everyone, welcome to today's meeting. Let's start by reviewing our quarterly results.</p>
                    </div>
                    <div className="flex items-start">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium mr-3 mt-1">Speaker 2</span>
                      <p className="text-gray-700">Thank you. I have the financial reports ready to share.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600 mb-1">1,247</div>
                  <div className="text-sm text-blue-700">Words</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600 mb-1">3</div>
                  <div className="text-sm text-green-700">Speakers</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-purple-600 mb-1">12:34</div>
                  <div className="text-sm text-purple-700">Duration</div>
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
                    📊 CSV
                  </button>
                  <button className="bg-purple-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-600 transition-colors">
                    📋 SRT
                  </button>
                  <button className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600 transition-colors">
                    📝 DOCX
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      tips: [
        "Click on any speaker name to rename them (e.g., Speaker_00 → John Smith)",
        "Use the search function to find specific words or phrases",
        "Export in different formats for different use cases"
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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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
                  📤 Transcription Upload & Processing
                </h1>
                <p className="text-gray-600">Learn how to upload and process audio files</p>
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
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
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
                            ? 'bg-blue-500 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                            index === currentStep ? 'bg-white text-blue-500' : 'bg-gray-200 text-gray-600'
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
                            index === currentStep ? 'bg-blue-500' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>

                    {currentStep === steps.length - 1 ? (
                      <button
                        onClick={() => router.push('/tutorials/ai-summary')}
                        className="flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-blue-700 transition-all duration-300"
                      >
                        Next Tutorial
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </button>
                    ) : (
                      <button
                        onClick={nextStep}
                        className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300"
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
