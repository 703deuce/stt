'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Lightbulb, 
  Copy, 
  RefreshCw, 
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Sparkles
} from 'lucide-react';
import { aiChatService, ChatMessage } from '../services/aiChatService';
import { aiDataService } from '../services/aiDataService';
import { databaseService } from '../services/databaseService';
import { useAuth } from '../context/AuthContext';
import { Timestamp } from 'firebase/firestore';

interface AIChatPanelProps {
  transcriptionText: string;
  transcriptionId: string;
  className?: string;
}

export default function AIChatPanel({ transcriptionText, transcriptionId, className = '' }: AIChatPanelProps) {
  const { user } = useAuth();
  const [fullTranscriptionText, setFullTranscriptionText] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch full transcription text on mount
  useEffect(() => {
    const fetchFullTranscriptionText = async () => {
      if (!user || !transcriptionId) return;
      
      try {
        console.log('🔍 [AIChatPanel] Fetching full transcription text...');
        
        // Get the transcription record to access transcription_data_url
        const transcriptionRecord = await databaseService.getSTTRecordById(transcriptionId, user.uid);
        
        if (transcriptionRecord?.transcription_data_url) {
          console.log('📥 [AIChatPanel] Found transcription_data_url, fetching full text...');
          const fullData = await databaseService.getFullTranscriptionData(transcriptionRecord.transcription_data_url);
          
          if (fullData.transcript) {
            console.log('✅ [AIChatPanel] Full transcription text loaded:', {
              length: fullData.transcript.length,
              preview: fullData.transcript.substring(0, 100) + '...'
            });
            setFullTranscriptionText(fullData.transcript);
          } else {
            console.warn('⚠️ [AIChatPanel] No transcript found in full data, using provided text');
            setFullTranscriptionText(transcriptionText);
          }
        } else {
          console.warn('⚠️ [AIChatPanel] No transcription_data_url found, using provided text');
          setFullTranscriptionText(transcriptionText);
        }
      } catch (error) {
        console.error('❌ [AIChatPanel] Error fetching full transcription text:', error);
        console.warn('⚠️ [AIChatPanel] Falling back to provided transcription text');
        setFullTranscriptionText(transcriptionText);
      }
    };

    fetchFullTranscriptionText();
  }, [user, transcriptionId, transcriptionText]);

  // Load existing chat history when component mounts
  useEffect(() => {
    if (user && transcriptionId) {
      loadExistingChatHistory();
    }
  }, [user, transcriptionId]);

  // Focus input when component mounts
  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [expanded]);

  // Real-time Firestore listener: Listen to chat history changes
  useEffect(() => {
    if (!user || !transcriptionId) return;

    console.log('👂 Setting up real-time Firestore listener for chat history...');
    
    let unsubscribe: (() => void) | null = null;
    
    Promise.all([
      import('@/config/firebase'),
      import('firebase/firestore')
    ]).then(([{ db }, firestore]) => {
      const { doc, onSnapshot, Timestamp } = firestore;
      // Match the document structure: ai_data/{transcriptionId}_{userId}
      const aiDataId = `${transcriptionId}_${user.uid}`;
      const aiDataRef = doc(db, 'ai_data', aiDataId);
      
      unsubscribe = onSnapshot(aiDataRef, (snapshot) => {
        console.log('📡 Firestore snapshot received for chat:', {
          exists: snapshot.exists()
        });
        
        if (snapshot.exists()) {
          const data = snapshot.data();
          console.log('📡 Chat history changed:', {
            hasChatHistory: !!data?.chatHistory,
            messageCount: data?.chatHistory?.length || 0
          });
          loadExistingChatHistory();
        } else {
          console.log('⚠️ Chat snapshot exists but is empty');
        }
      }, (error) => {
        console.error('❌ Firestore listener error:', error);
      });
      
      console.log('✅ Firestore listener successfully set up for chat history');
    });

    return () => {
      if (unsubscribe) {
        console.log('👂 Cleaning up chat history Firestore listener');
        unsubscribe();
      }
    };
  }, [user, transcriptionId]);

  const loadExistingChatHistory = async () => {
    if (!user || !transcriptionId) return;
    
    try {
      console.log('📥 Loading existing chat history...');
      const aiData = await aiDataService.getAIData(transcriptionId, user.uid);
      
      if (aiData && aiData.chatHistory && aiData.chatHistory.length > 0) {
        console.log('✅ Found existing chat history:', aiData.chatHistory.length, 'messages');
        
        // Convert timestamps back to Date objects
        const convertedMessages = aiData.chatHistory.map(message => ({
          ...message,
          timestamp: message.timestamp instanceof Timestamp ? message.timestamp.toDate() : new Date(message.timestamp)
        }));
        
        setMessages(convertedMessages);
      } else {
        console.log('ℹ️ No existing chat history found');
      }
    } catch (error) {
      console.error('❌ Error loading existing chat history:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    if (!user || !transcriptionId) {
      setError('User not authenticated or transcription ID missing');
      return;
    }

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage('');
    setLoading(true);
    setError(null);

    try {
      // Use background processing for better scalability
      const response = await fetch('/api/deepseek/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          transcriptionId,
          transcriptionText: fullTranscriptionText || transcriptionText, // Use full text
          prompt: userMessage.content,
          customInstructions: undefined // Could add system prompt here if needed
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start chat job');
      }

      const result = await response.json();
      console.log('✅ Chat job started:', result.jobId);
      
      // Save user message to database
      await aiDataService.saveChatHistory(transcriptionId, user.uid, newMessages);
      console.log('✅ Chat history saved successfully');
      
      // Note: AI response will be updated via WebSocket notifications
      // The user can check back later or we could implement real-time updates
      
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  const analyzeTranscription = async () => {
    if (analyzing) return;
    
    setAnalyzing(true);
    setError(null);
    
    try {
      const result = await aiChatService.analyzeTranscription(transcriptionText);
      setAnalysis(result);
      setShowAnalysis(true);
    } catch (err) {
      console.error('Failed to analyze transcription:', err);
      setError('Failed to analyze transcription');
    } finally {
      setAnalyzing(false);
    }
  };

  const getSuggestedQuestions = () => {
    return aiChatService.getSuggestedQuestions(transcriptionText);
  };

  const insertSuggestedQuestion = (question: string) => {
    setInputMessage(question);
    inputRef.current?.focus();
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-100';
      case 'negative': return 'text-red-600 bg-red-100';
      case 'mixed': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">AI Chat</h3>
            <p className="text-xs text-gray-500">Chat about your transcription</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={analyzeTranscription}
            disabled={analyzing}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Analyze transcription"
          >
            {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="flex flex-col h-96">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Welcome Message */}
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Bot className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">Chat with your transcription</h4>
                <p className="text-gray-600 mb-4">Ask questions, get insights, or explore the content</p>
                
                {/* Suggested Questions */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Try asking:</p>
                  <div className="grid grid-cols-1 gap-2">
                    {getSuggestedQuestions().slice(0, 4).map((question, index) => (
                      <button
                        key={index}
                        onClick={() => insertSuggestedQuestion(question)}
                        className="text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Chat Messages */}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.role === 'assistant' && (
                      <Bot className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </div>
                      <div className={`text-xs mt-2 ${
                        message.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    {message.role === 'assistant' && (
                      <button
                        onClick={() => copyToClipboard(message.content)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                        title="Copy message"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
                    <span className="text-sm text-gray-600">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex justify-start">
                <div className="bg-red-50 border border-red-200 p-3 rounded-lg max-w-[80%]">
                  <div className="flex items-center space-x-2 text-red-800">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your transcription..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center justify-between mt-3">
              <button
                onClick={clearChat}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                Clear chat
              </button>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowAnalysis(!showAnalysis)}
                  className="text-xs text-blue-600 hover:text-blue-700 transition-colors flex items-center space-x-1"
                >
                  <BarChart3 className="w-3 h-3" />
                  <span>Analysis</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Panel */}
      {showAnalysis && analysis && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Transcription Analysis</h4>
              <button
                onClick={() => setShowAnalysis(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Sentiment</div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${getSentimentColor(analysis.sentiment)}`}>
                  {analysis.sentiment}
                </div>
              </div>
              
              <div className="bg-white p-3 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Overall Tone</div>
                <div className="text-sm font-medium text-gray-900">{analysis.overallTone}</div>
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg">
              <div className="text-xs text-gray-500 mb-2">Key Themes</div>
              <div className="flex flex-wrap gap-2">
                {analysis.keyThemes.map((theme: string, index: number) => (
                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    {theme}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg">
              <div className="text-xs text-gray-500 mb-2">Speaker Dynamics</div>
              <div className="space-y-1">
                {analysis.speakerDynamics.map((dynamic: string, index: number) => (
                  <div key={index} className="text-sm text-gray-700">• {dynamic}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
