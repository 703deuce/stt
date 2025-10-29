'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTTS } from '@/hooks/useTTS';
import { ttsService } from '@/services/ttsService';
import { voiceCloningService } from '@/services/voiceCloningService';
import { textChunkingService } from '@/services/textChunkingService';
import { Voice } from '@/data/voices';
import { 
  Volume2, 
  Play, 
  Pause, 
  Download, 
  Copy,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Sparkles,
  Search,
  X
} from 'lucide-react';

interface TTSGeneratorProps {
  onGenerationComplete?: (result: { audio_base64: string; duration: number; generated_text: string }) => void;
  defaultVoice?: string;
}

export default function TTSGenerator({ onGenerationComplete, defaultVoice }: TTSGeneratorProps) {
  const { state, generateSpeech, setChunkedResult, reset, playAudio, pauseAudio, downloadAudio } = useTTS();
  const [text, setText] = useState('Welcome to Transovo AI! This is a demonstration of our advanced text-to-speech technology powered by Higgs Audio V2. You can create natural-sounding voices for any purpose.');
  const [selectedVoice, setSelectedVoice] = useState(defaultVoice || 'belinda');
  const [selectedPreset, setSelectedPreset] = useState('neutral_professional');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Chunking state
  const [chunkingInfo, setChunkingInfo] = useState<{
    isChunking: boolean;
    totalChunks: number;
    completedChunks: number;
    currentChunk?: string;
  } | null>(null);
  
  // Voice search and filtering
  const [voiceSearch, setVoiceSearch] = useState('');
  const [voiceFilter, setVoiceFilter] = useState('all');
  
  // Voice loading state
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(true);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  
  const [settings, setSettings] = useState({
    temperature: 0.4, // Optimal for semantic chunking natural flow
    top_p: 0.94,
    top_k: 45,
    max_new_tokens: 4096,
    scene_description: 'Speak with a clear, neutral, professional tone.',
    chunk_method: 'semantic' as 'word' | 'speaker' | 'sentence' | 'semantic' | 'None',
    chunk_max_word_num: 120, // Optimal for semantic chunking (100-150 range)
    chunk_max_num_turns: 2, // Used for speaker chunking (filtered out for word chunking)
    generation_chunk_buffer_size: 3, // Optimal for semantic chunking (not 8)
    ref_audio_in_system_message: false,
    // Experimental features
    experimental_features: {
      humming: false,
      bgm: false
    },
    ras_win_len: 7,
    ras_win_max_num_repeat: 2
  });

  // Load voices on component mount
  useEffect(() => {
    // Ensure voices are loaded to get latest cloned voices
    voiceCloningService.ensureVoicesLoaded();
    loadVoices();
  }, []);

  // Update selected voice when defaultVoice prop changes
  useEffect(() => {
    if (defaultVoice) {
      setSelectedVoice(defaultVoice);
    }
  }, [defaultVoice]);


  const loadVoices = useCallback(async () => {
    try {
      setLoadingVoices(true);
      setVoiceError(null);
      
      const allVoices = await ttsService.getAvailableVoices();
      setVoices(allVoices);
      
      console.log(`🎤 TTS Generator: Loaded ${allVoices.length} voices`);
      
      // If we have a default voice but it's not in the loaded voices, try to find it
      if (defaultVoice && !allVoices.find(v => v.id === defaultVoice)) {
        console.warn(`⚠️ Default voice "${defaultVoice}" not found in available voices`);
      }
    } catch (error) {
      console.error('Error loading voices:', error);
      setVoiceError('Failed to load voices. Please refresh the page.');
    } finally {
      setLoadingVoices(false);
    }
  }, [defaultVoice]);

  useEffect(() => {
    loadVoices();
  }, [loadVoices]);

  const presets = ttsService.getPresetConfigurations();

  // Helper function to check if a voice is custom/cloned
  const isCustomVoice = (voiceId: string) => {
    return voiceId.startsWith('cloned_');
  };


  // Filter voices based on search and filter
  const filteredVoices = voices.filter((voice) => {
    const matchesSearch = voiceSearch === '' || 
      voice.name.toLowerCase().includes(voiceSearch.toLowerCase()) ||
      voice.description.toLowerCase().includes(voiceSearch.toLowerCase()) ||
      voice.category.toLowerCase().includes(voiceSearch.toLowerCase());
    
    const matchesFilter = voiceFilter === 'all' ||
      (voiceFilter === 'regular' && !isCustomVoice(voice.id)) ||
      (voiceFilter === 'custom' && isCustomVoice(voice.id)) ||
      (voiceFilter === 'female' && voice.gender === 'Female') ||
      (voiceFilter === 'male' && voice.gender === 'Male');
    
    return matchesSearch && matchesFilter;
  });

  const handleTextChange = (newText: string) => {
    setText(newText);
    // You could show validation messages here
  };

  const handlePresetChange = (presetKey: string) => {
    setSelectedPreset(presetKey);
    const preset = presets[presetKey as keyof typeof presets];
    if (preset) {
      setSettings(prev => ({
        ...prev,
        ...preset.config
      }));
    }
  };

     const handleGenerate = async () => {
     try {
       // Build the TTS request
       const request: any = {
         text: text,
         ...settings,
         ref_audio_in_system_message: settings.ref_audio_in_system_message
       };

       // Handle different voice modes
       if (settings.experimental_features.humming) {
         // For humming mode, don't specify ref_audio_name
         request.ras_win_len = 0;
       } else if (settings.experimental_features.bgm) {
         // For BGM mode, enable ref_audio_in_system_message
         request.ref_audio_in_system_message = true;
       } else {
         // Regular voice clone mode
         request.ref_audio_name = selectedVoice;
       }

       // Add experimental feature flags
       if (settings.experimental_features.humming || settings.experimental_features.bgm) {
         request.experimental_mode = true;
       }

       console.log('🚀 TTS Request:', request);
       
       // Check if text needs chunking (DISABLED - always generates in one piece)
       const chunkingStats = textChunkingService.getChunkingStats(text);
       console.log('📊 Chunking stats (DISABLED):', chunkingStats);
       console.log(`📝 Smart chunking disabled - generating entire text (${text.length} chars) in one piece`);
       
       if (chunkingStats.shouldChunk) {
         console.log(`📝 Text is long (${text.length} chars), using chunking with ${chunkingStats.estimatedChunks} chunks`);
         
         // Set chunking state
         setChunkingInfo({
           isChunking: true,
           totalChunks: chunkingStats.estimatedChunks,
           completedChunks: 0,
           currentChunk: undefined
         });
         
         // Use chunked generation
         const chunkedResult = await textChunkingService.generateSpeechWithChunking(
           request,
           (status, chunkId) => {
             console.log(`🔄 Chunk status: ${status}${chunkId ? ` (${chunkId})` : ''}`);
             
             // Update chunking progress
             if (status.includes('COMPLETED') && chunkId) {
               setChunkingInfo(prev => prev ? {
                 ...prev,
                 completedChunks: prev.completedChunks + 1,
                 currentChunk: undefined
               } : null);
             } else if (status.includes('PROCESSING_CHUNK') && chunkId) {
               setChunkingInfo(prev => prev ? {
                 ...prev,
                 currentChunk: chunkId
               } : null);
             }
           }
         );
         
         // Clear chunking state
         setChunkingInfo(null);
         
         console.log('✅ Chunked generation complete:', chunkedResult);
         
         // Set the chunked result directly in the state
         setChunkedResult(chunkedResult);
         
         // Call onGenerationComplete with the chunked result
         if (onGenerationComplete) {
           onGenerationComplete(chunkedResult);
         }
       } else {
         // DISABLED: Always use single generation (chunking is disabled)
         // Use regular generation for all text lengths
         await generateSpeech(request);
         
         // Call onGenerationComplete for regular generation
         if (onGenerationComplete && state.result) {
           onGenerationComplete(state.result);
         }
       }
     } catch (error) {
       console.error('TTS generation failed:', error);
     }
   };

  const handlePlayPause = () => {
    if (isPlaying) {
      pauseAudio();
      setIsPlaying(false);
    } else {
      playAudio();
      setIsPlaying(true);
    }
  };

  const handleReset = () => {
    reset();
    setIsPlaying(false);
    setChunkingInfo(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusIcon = () => {
    switch (state.status) {
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'FAILED':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'SUBMITTING':
      case 'IN_QUEUE':
      case 'IN_PROGRESS':
        return <Clock className="w-5 h-5 text-orange-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getVoiceDisplayName = (voice: Voice) => {
    if (isCustomVoice(voice.id)) {
      return voice.name; // Use human-readable name for custom voices
    }
    return voice.name; // Use regular name for standard voices
  };

  if (loadingVoices) {
    return (
      <div className="space-y-6">
        <div className="text-center py-20">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-gray-700">Loading Voices...</h2>
          <p className="text-gray-500 mt-2">Fetching available voices</p>
        </div>
      </div>
    );
  }

  if (voiceError) {
    return (
      <div className="space-y-6">
        <div className="text-center py-20">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">Error Loading Voices</h2>
          <p className="text-gray-500 mb-6">{voiceError}</p>
          <button
            onClick={loadVoices}
            className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Text Input */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Text Input</h2>
          <div className="flex items-center space-x-2">
            <button 
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
              onClick={() => setText('')}
            >
              Clear
            </button>
          </div>
        </div>
        
                 <textarea
           value={text}
           onChange={(e) => handleTextChange(e.target.value)}
           placeholder="Enter your text here... This will be converted to speech using the selected voice."
           className="w-full h-40 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
         />
        
                 <div className="flex items-center justify-between mt-4">
           <div className="text-sm text-gray-500">
             Characters: <span className="font-medium">{text.length}</span>
             {(() => {
               const chunkingStats = textChunkingService.getChunkingStats(text);
               if (text.length > 1000) {
                 return (
                   <span className="ml-2 text-green-600">
                     • Smart chunking disabled - will generate entire text in one piece
                   </span>
                 );
               }
               return null;
             })()}
           </div>
           <div className="flex items-center space-x-4">
           </div>
         </div>
      </div>

      {/* Voice Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Voice Selection</h3>
        
                 <div className="space-y-4">
             <div className="flex items-center justify-between mb-4">
               <label className="block text-sm font-medium text-gray-700">
              Select Voice ({voices.length} available)
            </label>
               <div className="flex items-center space-x-2">
                 <select
                   value={voiceFilter}
                   onChange={(e) => setVoiceFilter(e.target.value)}
                   className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-500"
                 >
                   <option value="all">All Voices</option>
                   <option value="regular">Regular Voices</option>
                   <option value="custom">Custom Cloned</option>
                   <option value="female">Female</option>
                   <option value="male">Male</option>
                 </select>
               </div>
             </div>
             
             {/* Search Box */}
             <div className="mb-4">
               <div className="relative">
                 <input
                   type="text"
                   placeholder="Search voices..."
                   value={voiceSearch}
                   onChange={(e) => setVoiceSearch(e.target.value)}
                   className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                 />
                 <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                 {voiceSearch && (
                   <button
                     onClick={() => setVoiceSearch('')}
                     className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 hover:text-gray-600"
                   >
                     <X className="w-4 h-4" />
                   </button>
                 )}
               </div>
             </div>
             
             {/* Recently Used Voices */}
             {selectedVoice && (
               <div className="mb-4">
                 <h4 className="text-sm font-medium text-gray-700 mb-2">Recently Used</h4>
                 <div className="flex items-center space-x-2">
                   {voices.filter(v => v.id === selectedVoice).map((voice) => {
                     const isCustom = isCustomVoice(voice.id);
                     return (
                       <div
                         key={voice.id}
                         className="flex items-center space-x-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg"
                       >
                         <User className={`w-4 h-4 ${
                           voice.gender === 'Female' ? 'text-pink-500' : 
                           voice.gender === 'Male' ? 'text-blue-500' :
                           voice.gender === 'Custom' ? 'text-purple-500' :
                           'text-gray-500'
                         }`} />
                         <span className="text-sm font-medium text-gray-900">{getVoiceDisplayName(voice)}</span>
                         {isCustom && <Sparkles className="w-4 h-4 text-purple-500" />}
                         <span className="text-xs text-gray-500">• Currently Selected</span>
                       </div>
                     );
                   })}
                 </div>
               </div>
             )}
             
             {/* Voice Count */}
             <div className="flex items-center justify-between mb-2">
               <span className="text-sm text-gray-500">
                 Showing {filteredVoices.length} of {voices.length} voices
               </span>
               {(voiceSearch || voiceFilter !== 'all') && (
                 <button
                   onClick={() => {
                     setVoiceSearch('');
                     setVoiceFilter('all');
                   }}
                   className="text-sm text-orange-500 hover:text-orange-600"
                 >
                   Clear filters
                 </button>
               )}
             </div>
             
             {/* Voice Grid */}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
               {filteredVoices.map((voice) => {
                const isCustom = isCustomVoice(voice.id);
                const isSelected = selectedVoice === voice.id;
                
                return (
                  <button
                    key={voice.id}
                    onClick={() => setSelectedVoice(voice.id)}
                    className={`p-3 border rounded-lg text-left hover:shadow-md transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <User className={`w-4 h-4 ${
                        voice.gender === 'Female' ? 'text-pink-500' : 
                        voice.gender === 'Male' ? 'text-blue-500' :
                        voice.gender === 'Custom' ? 'text-purple-500' :
                        'text-gray-500'
                      }`} />
                      <span className="font-medium text-gray-900">{getVoiceDisplayName(voice)}</span>
                      {isCustom && <Sparkles className="w-4 h-4 text-purple-500" />}
                    </div>
                    <div className="text-xs text-gray-500 mb-1">
                      {voice.gender} • {voice.category}
                    </div>
                    <div className="text-xs text-gray-600 line-clamp-2">{voice.description}</div>
                    {isCustom && (
                      <div className="mt-2 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                        Custom Cloned Voice
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
             
             {/* No Results */}
             {filteredVoices.length === 0 && (
               <div className="text-center py-8">
                 <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                 <p className="text-gray-600">No voices found matching your search</p>
                 <button
                   onClick={() => setVoiceSearch('')}
                   className="mt-2 text-orange-500 hover:text-orange-600 text-sm"
                 >
                   Clear search
                 </button>
               </div>
             )}
          </div>
      </div>

      {/* Preset Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Style Presets</h3>
          <p className="text-sm text-gray-600">Choose from our optimized presets for stable, natural-sounding speech. These presets are carefully tuned to avoid common issues like robotic speech or inconsistent pacing.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {Object.entries(presets).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => handlePresetChange(key)}
              className={`p-4 border rounded-lg text-left hover:shadow-md transition-all ${
                selectedPreset === key
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-gray-900 mb-1">{preset.name}</div>
              <div className="text-sm text-gray-600">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Advanced Settings</h3>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-orange-500 hover:text-orange-600 font-medium"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced
          </button>
        </div>
        
        {!showAdvanced && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Manual parameter adjustment may affect speech quality</p>
                <p className="text-xs mt-1">We recommend using the presets above for best results. Only adjust these parameters if you have specific requirements.</p>
              </div>
            </div>
          </div>
        )}
        
        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperature ({settings.temperature})
              </label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => setSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                className="w-full"
              />
              <div className="text-xs text-gray-500 mt-1">Controls expressiveness</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Top P ({settings.top_p})
              </label>
              <input
                type="range"
                min="0.9"
                max="0.99"
                step="0.01"
                value={settings.top_p}
                onChange={(e) => setSettings(prev => ({ ...prev, top_p: parseFloat(e.target.value) }))}
                className="w-full"
              />
              <div className="text-xs text-gray-500 mt-1">Nucleus sampling</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Top K ({settings.top_k})
              </label>
              <input
                type="range"
                min="30"
                max="100"
                step="10"
                value={settings.top_k}
                onChange={(e) => setSettings(prev => ({ ...prev, top_k: parseInt(e.target.value) }))}
                className="w-full"
              />
              <div className="text-xs text-gray-500 mt-1">Top-k sampling</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max New Tokens</label>
              <select
                value={settings.max_new_tokens}
                onChange={(e) => setSettings(prev => ({ ...prev, max_new_tokens: parseInt(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value={512}>512</option>
                <option value={1024}>1024</option>
                <option value={1536}>1536</option>
                <option value={2048}>2048</option>
                <option value={4096}>4096</option>
              </select>
            </div>

                         <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">Chunk Method</label>
               <select
                 value={settings.chunk_method}
                 onChange={(e) => setSettings(prev => ({ ...prev, chunk_method: e.target.value as 'word' | 'speaker' | 'sentence' | 'semantic' | 'None' }))}
                 className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
               >
                 <option value="semantic">Semantic - AI-powered content-aware chunking (Recommended)</option>
                 <option value="word">Word - 50 words per chunk</option>
                 <option value="speaker">Speaker - Multi-speaker dialog</option>
                 <option value="sentence">Sentence - Per sentence chunks</option>
                 <option value="None">None - No chunking</option>
               </select>
               <div className="text-xs text-gray-500 mt-1">
                 {settings.chunk_method === 'semantic' && 'AI analyzes content meaning for optimal chunk boundaries - most efficient with 3 buffer size'}
                 {settings.chunk_method === 'word' && 'Best for single-speaker content (50 words per chunk)'}
                 {settings.chunk_method === 'sentence' && 'Stable generation per sentence'}
                 {settings.chunk_method === 'speaker' && 'For multi-speaker conversations'}
                 {settings.chunk_method === 'None' && 'No chunking - may cause issues with long content'}
               </div>
             </div>

                         {/* Conditional chunking parameters based on method */}
             {(settings.chunk_method === 'word' || settings.chunk_method === 'semantic') && (
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Max Words per Chunk ({settings.chunk_max_word_num})
                 </label>
                 <input
                   type="range"
                   min="50"
                   max="200"
                   step="10"
                   value={settings.chunk_max_word_num}
                   onChange={(e) => setSettings(prev => ({ ...prev, chunk_max_word_num: parseInt(e.target.value) }))}
                   className="w-full"
                 />
                 <div className="text-xs text-gray-500 mt-1">
                   {settings.chunk_method === 'semantic' ? 'Recommended: 120 words for semantic chunking (100-150 optimal)' : 'Recommended: 50 words for word chunking'}
                 </div>
               </div>
             )}

             {settings.chunk_method === 'speaker' && (
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Max Speaker Turns ({settings.chunk_max_num_turns})
                 </label>
                 <input
                   type="range"
                   min="1"
                   max="5"
                   step="1"
                   value={settings.chunk_max_num_turns}
                   onChange={(e) => setSettings(prev => ({ ...prev, chunk_max_num_turns: parseInt(e.target.value) }))}
                   className="w-full"
                 />
                 <div className="text-xs text-gray-500 mt-1">Recommended: 2 turns for natural conversation flow</div>
               </div>
             )}

             {(settings.chunk_method === 'word' || settings.chunk_method === 'speaker' || settings.chunk_method === 'semantic') && (
               <div>
                 <label className="text-sm font-medium text-gray-700 mb-2">
                   Chunk Buffer Size ({settings.generation_chunk_buffer_size})
                 </label>
                 <input
                   type="range"
                   min="1"
                   max="8"
                   step="1"
                   value={settings.generation_chunk_buffer_size}
                   onChange={(e) => setSettings(prev => ({ ...prev, generation_chunk_buffer_size: parseInt(e.target.value) }))}
                   className="w-full"
                 />
                 <div className="text-xs text-gray-500 mt-1">
                   {settings.chunk_method === 'semantic' ? 'Number of chunks to buffer (3 optimal for semantic chunking)' : 'Number of chunks to buffer during generation (minimum 8 recommended)'}
                 </div>
               </div>
             )}

                         <div className="md:col-span-2 lg:col-span-3">
               <label className="block text-sm font-medium text-gray-700 mb-2">Scene Description</label>
               <input
                 type="text"
                 value={settings.scene_description}
                 onChange={(e) => setSettings(prev => ({ ...prev, scene_description: e.target.value }))}
                 placeholder="e.g., Professional podcast studio with energetic hosts"
                 className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
               />
             </div>

             {/* Experimental Features */}
             <div className="md:col-span-2 lg:col-span-3">
               <h4 className="text-sm font-medium text-gray-700 mb-3">🧪 Experimental Features</h4>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-3">
                   <label className="flex items-center space-x-3">
                     <input
                       type="checkbox"
                       checked={settings.experimental_features.humming}
                       onChange={(e) => setSettings(prev => ({
                         ...prev,
                         experimental_features: {
                           ...prev.experimental_features,
                           humming: e.target.checked
                         }
                       }))}
                       className="w-4 h-4 text-orange-500 rounded"
                     />
                     <div>
                       <span className="text-sm font-medium text-gray-700">Humming Mode</span>
                       <p className="text-xs text-gray-500">Enable voice humming capabilities</p>
                     </div>
                   </label>
                   
                   <label className="flex items-center space-x-3">
                     <input
                       type="checkbox"
                       checked={settings.experimental_features.bgm}
                       onChange={(e) => setSettings(prev => ({
                         ...prev,
                         experimental_features: {
                           ...prev.experimental_features,
                           bgm: e.target.checked
                         }
                       }))}
                       className="w-4 h-4 text-orange-500 rounded"
                     />
                     <div>
                       <span className="text-sm font-medium text-gray-700">Background Music</span>
                       <p className="text-xs text-gray-500">Add background music to speech</p>
                     </div>
                   </label>
                 </div>
                 
                 <div className="space-y-3">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       RAS Window Length ({settings.ras_win_len})
                     </label>
                     <input
                       type="range"
                       min="0"
                       max="10"
                       step="1"
                       value={settings.ras_win_len}
                       onChange={(e) => setSettings(prev => ({ ...prev, ras_win_len: parseInt(e.target.value) }))}
                       className="w-full"
                     />
                     <div className="text-xs text-gray-500 mt-1">Prevents repetition in long content (7 = recommended)</div>
                   </div>
                   
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">
                       RAS Max Repeats ({settings.ras_win_max_num_repeat})
                     </label>
                     <input
                       type="range"
                       min="1"
                       max="5"
                       step="1"
                       value={settings.ras_win_max_num_repeat}
                       onChange={(e) => setSettings(prev => ({ ...prev, ras_win_max_num_repeat: parseInt(e.target.value) }))}
                       className="w-full"
                     />
                     <div className="text-xs text-gray-500 mt-1">Maximum phrase repetitions allowed (2 = recommended)</div>
                   </div>
                   
                   <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                     ⚠️ Experimental features may be unstable and are subject to change in future versions.
                   </div>
                 </div>
               </div>
             </div>
          </div>
        )}
      </div>

      {/* Processing Status */}
      {state.isLoading && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            {getStatusIcon()}
            <div>
              <div className="font-medium text-gray-900">
                {state.status === 'SUBMITTING' && 'Submitting generation job...'}
                {state.status === 'IN_QUEUE' && 'Job queued for processing...'}
                {state.status === 'IN_PROGRESS' && 'Generating audio...'}
                {chunkingInfo?.isChunking && (
                  <div className="flex items-center gap-2">
                    <span>Processing {chunkingInfo.completedChunks}/{chunkingInfo.totalChunks} chunks</span>
                    {chunkingInfo.currentChunk && (
                      <span className="text-sm text-gray-500">({chunkingInfo.currentChunk})</span>
                    )}
                  </div>
                )}
              </div>
              {state.jobId && (
                <div className="text-sm text-gray-500">Job ID: {state.jobId}</div>
              )}
              {chunkingInfo?.isChunking && (
                <div className="text-sm text-blue-600">
                  📝 Long text detected - using chunking for better quality
                </div>
              )}
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div 
              className="bg-orange-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${state.progress}%` }}
            ></div>
          </div>
          <div className="text-sm text-gray-600">{state.progress}% complete</div>
        </div>
      )}

      {/* Error Display */}
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <div className="font-medium text-red-900">Generation Failed</div>
              <div className="text-sm text-red-700 mt-1">{state.error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Results Display */}
      {state.result && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Generated Audio</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => copyToClipboard(state.audioUrl || '')}
                className="p-2 rounded hover:bg-gray-100"
                title="Copy audio URL"
              >
                <Copy className="w-4 h-4 text-gray-500" />
              </button>
              <button
                onClick={() => downloadAudio()}
                className="p-2 rounded hover:bg-gray-100"
                title="Download audio"
              >
                <Download className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Audio Player */}
          <div className="bg-gray-50 rounded-lg p-6 mb-4">
            <div className="flex items-center space-x-4 mb-4">
              <button
                onClick={handlePlayPause}
                className="w-12 h-12 bg-orange-500 text-white rounded-full flex items-center justify-center hover:bg-orange-600"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
              </button>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm font-medium text-gray-900">generated_audio.wav</span>
                  <span className="text-xs text-gray-500">{formatDuration(state.result.duration)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full" style={{width: '0%'}}></div>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                0:00 / {formatDuration(state.result.duration)}
              </div>
            </div>
            
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => downloadAudio('generated_audio.wav')}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Download className="w-4 h-4" />
                <span>Download WAV</span>
              </button>
              <button
                onClick={() => {
                  // For now, download as WAV since MP3 conversion requires additional setup
                  downloadAudio('generated_audio.wav');
                  // Show user message about format
                  alert('Downloaded as WAV file. To convert to MP3, you can use online converters like CloudConvert or desktop software like Audacity.');
                }}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-gray-50"
                title="Downloads as WAV (MP3 conversion coming soon)"
              >
                <Download className="w-4 h-4" />
                <span>Download MP3 (WAV)</span>
              </button>
            </div>
          </div>

          {/* Generation Info */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm text-gray-500">Duration</div>
              <div className="font-medium">{formatDuration(state.result.duration)}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Sample Rate</div>
              <div className="font-medium">{state.result.sampling_rate} Hz</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Token Usage</div>
              <div className="font-medium">{state.result.usage.total_tokens}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Cache Status</div>
              <div className="font-medium">
                {state.result.cache_status.cache_exists ? 'Cached' : 'New'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        {!state.isLoading && !state.result && (
          <button
            onClick={handleGenerate}
            disabled={!text.trim()}
            className="bg-orange-500 text-white px-8 py-3 rounded-lg hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center space-x-2"
          >
            <Volume2 className="w-5 h-5" />
            <span>Generate Speech</span>
          </button>
        )}

        {(state.result || state.error) && (
          <button
            onClick={handleReset}
            className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-50 font-medium"
          >
            Generate New Audio
          </button>
        )}
      </div>
    </div>
  );
}
