'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { 
  Users, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Edit,
  Save,
  RefreshCw,
  Download,
  Info,
  Sparkles,
  UserCheck,
  AlertCircle
} from 'lucide-react';

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  content: React.ReactNode;
  tips?: string[];
}

export default function SpeakerMappingTutorial() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const steps: TutorialStep[] = [
    {
      id: 1,
      title: "Understanding Speaker Mapping",
      description: "Learn how to customize speaker names",
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-l-4 border-indigo-400 p-6 rounded-r-lg">
            <div className="flex items-center mb-3">
              <Users className="w-5 h-5 text-indigo-600 mr-2" />
              <h3 className="text-lg font-semibold text-indigo-800">What is Speaker Mapping?</h3>
            </div>
            <p className="text-indigo-700">
              Speaker mapping lets you rename generic speaker labels (like "Speaker_00", "Speaker_01") 
              to actual names (like "John Smith", "Sarah Johnson"). This makes your transcriptions 
              more readable and professional.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                Before Mapping
              </h4>
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="flex items-start">
                  <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-medium mr-3 mt-1">Speaker_00</span>
                  <p className="text-gray-600 text-sm">Let's discuss the quarterly results.</p>
                </div>
                <div className="flex items-start">
                  <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-medium mr-3 mt-1">Speaker_01</span>
                  <p className="text-gray-600 text-sm">I have the financial reports ready.</p>
                </div>
                <div className="flex items-start">
                  <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-medium mr-3 mt-1">Speaker_02</span>
                  <p className="text-gray-600 text-sm">Great, let's review them now.</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                After Mapping
              </h4>
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <div className="flex items-start">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium mr-3 mt-1">John Smith</span>
                  <p className="text-gray-600 text-sm">Let's discuss the quarterly results.</p>
                </div>
                <div className="flex items-start">
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium mr-3 mt-1">Sarah Johnson</span>
                  <p className="text-gray-600 text-sm">I have the financial reports ready.</p>
                </div>
                <div className="flex items-start">
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium mr-3 mt-1">Mike Davis</span>
                  <p className="text-gray-600 text-sm">Great, let's review them now.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-4">Benefits of Speaker Mapping</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center p-3 bg-blue-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-500 mr-3" />
                <span className="text-sm">More readable transcriptions</span>
              </div>
              <div className="flex items-center p-3 bg-green-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
                <span className="text-sm">Professional documentation</span>
              </div>
              <div className="flex items-center p-3 bg-purple-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-purple-500 mr-3" />
                <span className="text-sm">Easier to follow conversations</span>
              </div>
              <div className="flex items-center p-3 bg-orange-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-orange-500 mr-3" />
                <span className="text-sm">Better for sharing</span>
              </div>
            </div>
          </div>
        </div>
      ),
      tips: [
        "Speaker mapping is automatic - the system detects speakers for you",
        "You only need to rename them once per transcription",
        "Mapped names appear throughout the entire transcription"
      ]
    },
    {
      id: 2,
      title: "Accessing Speaker Settings",
      description: "Find and open the speaker mapping interface",
      content: (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Finding Speaker Settings</h3>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="bg-indigo-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1">1</div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Open Your Transcription</h4>
                  <p className="text-gray-600">Navigate to any completed transcription with multiple speakers</p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-indigo-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1">2</div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Look for Speaker Labels</h4>
                  <p className="text-gray-600">You'll see speaker labels like "Speaker_00", "Speaker_01" next to each dialogue</p>
                  <div className="bg-gray-100 p-3 rounded-lg mt-2">
                    <div className="flex items-center">
                      <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-medium mr-3">Speaker_00</span>
                      <span className="text-sm text-gray-600">Hello everyone...</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-indigo-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 mt-1">3</div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Click on Speaker Label</h4>
                  <p className="text-gray-600">Click any speaker label to open the editing interface</p>
                  <div className="bg-gray-100 p-3 rounded-lg mt-2">
                    <button className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-medium hover:bg-gray-300 transition-colors flex items-center">
                      Speaker_00
                      <Edit className="w-3 h-3 ml-2" />
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
              You can also access speaker mapping from the transcription settings menu by clicking 
              the settings icon and selecting "Manage Speakers".
            </p>
          </div>
        </div>
      ),
      tips: [
        "Speaker mapping is only available for transcriptions with diarization enabled",
        "The system automatically detects the number of speakers",
        "You can edit speaker names at any time"
      ]
    },
    {
      id: 3,
      title: "Renaming Speakers",
      description: "Change speaker labels to actual names",
      content: (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">How to Rename Speakers</h3>
            
            <div className="space-y-6">
              <div className="border rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Step-by-Step Process</h4>
                
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-1">1</div>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 mb-2">Click Speaker Label</h5>
                      <p className="text-gray-600 text-sm mb-2">Click on the speaker label you want to rename</p>
                      <div className="bg-gray-100 p-3 rounded-lg">
                        <button className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-medium">
                          Speaker_00 ✏️
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-1">2</div>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 mb-2">Enter New Name</h5>
                      <p className="text-gray-600 text-sm mb-2">Type the actual person's name</p>
                      <div className="bg-gray-100 p-3 rounded-lg">
                        <input 
                          type="text" 
                          placeholder="Enter speaker name..." 
                          defaultValue="John Smith"
                          className="w-full bg-white border rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3 mt-1">3</div>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 mb-2">Save Changes</h5>
                      <p className="text-gray-600 text-sm mb-2">Click save to apply the new name</p>
                      <div className="bg-gray-100 p-3 rounded-lg">
                        <button className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors flex items-center">
                          <Save className="w-4 h-4 mr-2" />
                          Save Name
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Bulk Rename</h4>
                <p className="text-gray-600 mb-4">Rename all speakers at once using the speaker management panel</p>
                
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-medium mr-3">Speaker_00</span>
                      <input 
                        type="text" 
                        placeholder="Enter name..." 
                        className="bg-white border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <button className="text-blue-500 text-sm">Save</button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-medium mr-3">Speaker_01</span>
                      <input 
                        type="text" 
                        placeholder="Enter name..." 
                        className="bg-white border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <button className="text-blue-500 text-sm">Save</button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-medium mr-3">Speaker_02</span>
                      <input 
                        type="text" 
                        placeholder="Enter name..." 
                        className="bg-white border rounded px-2 py-1 text-sm"
                      />
                    </div>
                    <button className="text-blue-500 text-sm">Save</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      tips: [
        "Use full names for professional documents (e.g., 'John Smith' not 'John')",
        "Changes apply immediately throughout the transcription",
        "You can change names multiple times if needed"
      ]
    },
    {
      id: 4,
      title: "Managing Multiple Speakers",
      description: "Handle conversations with many participants",
      content: (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Working with Multiple Speakers</h3>
            
            <div className="space-y-6">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-r-lg">
                <h4 className="font-semibold text-blue-800 mb-3">Speaker Detection</h4>
                <p className="text-blue-700">
                  The AI automatically detects different speakers based on voice characteristics. 
                  The number of speakers detected depends on your transcription settings and the 
                  audio quality.
                </p>
              </div>

              <div className="border rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Users className="w-5 h-5 text-green-500 mr-2" />
                  Speaker Overview Panel
                </h4>
                
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="font-medium text-gray-900">Detected Speakers: 4</h5>
                    <button className="text-blue-500 text-sm flex items-center">
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Refresh
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="bg-white p-3 rounded-lg flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold mr-3">
                          JS
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">John Smith</p>
                          <p className="text-xs text-gray-500">47 segments</p>
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="bg-white p-3 rounded-lg flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-xs font-bold mr-3">
                          SJ
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Sarah Johnson</p>
                          <p className="text-xs text-gray-500">32 segments</p>
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="bg-white p-3 rounded-lg flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-purple-100 text-purple-800 rounded-full flex items-center justify-center text-xs font-bold mr-3">
                          MD
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Mike Davis</p>
                          <p className="text-xs text-gray-500">28 segments</p>
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="bg-white p-3 rounded-lg flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-orange-100 text-orange-800 rounded-full flex items-center justify-center text-xs font-bold mr-3">
                          EM
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Emily Martinez</p>
                          <p className="text-xs text-gray-500">19 segments</p>
                        </div>
                      </div>
                      <button className="text-gray-400 hover:text-gray-600">
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Best Practices</h4>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-1" />
                      <div>
                        <h5 className="font-medium text-gray-900 text-sm">Use Consistent Names</h5>
                        <p className="text-xs text-gray-600">Keep the same format for all speakers</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-1" />
                      <div>
                        <h5 className="font-medium text-gray-900 text-sm">Add Titles if Needed</h5>
                        <p className="text-xs text-gray-600">e.g., "Dr. John Smith" or "CEO Sarah Johnson"</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-1" />
                      <div>
                        <h5 className="font-medium text-gray-900 text-sm">Review Before Sharing</h5>
                        <p className="text-xs text-gray-600">Double-check all names are correct</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Common Issues</h4>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <AlertCircle className="w-5 h-5 text-orange-500 mr-3 mt-1" />
                      <div>
                        <h5 className="font-medium text-gray-900 text-sm">Too Many Speakers</h5>
                        <p className="text-xs text-gray-600">AI may split one person into multiple speakers</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <AlertCircle className="w-5 h-5 text-orange-500 mr-3 mt-1" />
                      <div>
                        <h5 className="font-medium text-gray-900 text-sm">Speaker Mix-ups</h5>
                        <p className="text-xs text-gray-600">Adjust speaker threshold in settings</p>
                      </div>
                    </div>
                    <div className="flex items-start">
                      <AlertCircle className="w-5 h-5 text-orange-500 mr-3 mt-1" />
                      <div>
                        <h5 className="font-medium text-gray-900 text-sm">Background Noise</h5>
                        <p className="text-xs text-gray-600">May be detected as additional speakers</p>
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
        "The system shows how many segments each speaker has",
        "You can merge speakers if the AI split one person incorrectly",
        "Speaker colors help distinguish between participants visually"
      ]
    },
    {
      id: 5,
      title: "Exporting with Names",
      description: "Save and share your mapped transcriptions",
      content: (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Exporting Your Transcription</h3>
            
            <div className="space-y-6">
              <div className="border rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Download className="w-5 h-5 text-blue-500 mr-2" />
                  Export Formats
                </h4>
                <p className="text-gray-600 mb-4">
                  All export formats include your custom speaker names automatically
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button className="bg-blue-500 text-white px-4 py-3 rounded-lg text-sm hover:bg-blue-600 transition-colors">
                    <div className="text-2xl mb-1">📄</div>
                    TXT
                  </button>
                  <button className="bg-green-500 text-white px-4 py-3 rounded-lg text-sm hover:bg-green-600 transition-colors">
                    <div className="text-2xl mb-1">📊</div>
                    CSV
                  </button>
                  <button className="bg-purple-500 text-white px-4 py-3 rounded-lg text-sm hover:bg-purple-600 transition-colors">
                    <div className="text-2xl mb-1">📋</div>
                    SRT
                  </button>
                  <button className="bg-orange-500 text-white px-4 py-3 rounded-lg text-sm hover:bg-orange-600 transition-colors">
                    <div className="text-2xl mb-1">📝</div>
                    DOCX
                  </button>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Example Export</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">TXT Format:</p>
                      <div className="bg-white p-3 rounded border text-sm font-mono text-gray-700">
                        <p><strong>John Smith:</strong> Let's discuss the quarterly results.</p>
                        <p><strong>Sarah Johnson:</strong> I have the financial reports ready.</p>
                        <p><strong>Mike Davis:</strong> Great, let's review them now.</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">SRT Format (with timestamps):</p>
                      <div className="bg-white p-3 rounded border text-sm font-mono text-gray-700">
                        <p>1</p>
                        <p>00:00:00,000 --&gt; 00:00:03,500</p>
                        <p>[John Smith] Let's discuss the quarterly results.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <UserCheck className="w-5 h-5 text-green-500 mr-2" />
                  Sharing Options
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <button className="w-full bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors flex items-center justify-center">
                      <Download className="w-4 h-4 mr-2" />
                      Download File
                    </button>
                    <button className="w-full bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 transition-colors flex items-center justify-center">
                      📧 Email Transcript
                    </button>
                  </div>
                  <div className="space-y-3">
                    <button className="w-full bg-purple-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-600 transition-colors flex items-center justify-center">
                      🔗 Share Link
                    </button>
                    <button className="w-full bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600 transition-colors flex items-center justify-center">
                      📋 Copy to Clipboard
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-blue-50 border-l-4 border-green-400 p-6 rounded-r-lg">
                <div className="flex items-center mb-3">
                  <Sparkles className="w-5 h-5 text-green-600 mr-2" />
                  <h4 className="text-lg font-semibold text-green-800">Congratulations!</h4>
                </div>
                <p className="text-green-700">
                  You've completed all tutorials! You now know how to use every feature of the 
                  transcription platform. Start creating amazing content from your audio files!
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
      tips: [
        "Speaker names are preserved in all export formats",
        "You can re-export anytime if you change speaker names",
        "Shared links automatically show updated speaker names"
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
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100">
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
                  👥 Speaker Mapping
                </h1>
                <p className="text-gray-600">Learn how to customize speaker names</p>
              </div>
              <div className="w-24"></div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6 sm:mb-8">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Step {currentStep + 1} of {steps.length}</span>
                <span>{Math.round(((currentStep + 1) / steps.length) * 100)}% Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-blue-600 h-2 rounded-full transition-all duration-300"
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
                            ? 'bg-indigo-500 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                            index === currentStep ? 'bg-white text-indigo-500' : 'bg-gray-200 text-gray-600'
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
                            index === currentStep ? 'bg-indigo-500' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>

                    {currentStep === steps.length - 1 ? (
                      <button
                        onClick={() => router.push('/tutorials')}
                        className="flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-blue-700 transition-all duration-300"
                      >
                        🎉 Complete!
                      </button>
                    ) : (
                      <button
                        onClick={nextStep}
                        className="flex items-center px-6 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-lg font-semibold hover:from-indigo-600 hover:to-blue-700 transition-all duration-300"
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
