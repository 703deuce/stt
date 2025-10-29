'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, Play, Volume2, Star, Sparkles, RefreshCw } from 'lucide-react';
import { ttsService } from '@/services/ttsService';
import { voiceCloningService } from '@/services/voiceCloningService';
import Layout from '@/components/Layout';

interface Voice {
  id: string;
  name: string;
  gender: string;
  language: string;
  category: string;
  description: string;
  isPremium?: boolean;
  isNew?: boolean;
  downloadURL?: string;
  isMultiSpeaker?: boolean;
}

export default function VoiceGallery() {
  const router = useRouter();
  const [voices, setVoices] = useState<Voice[]>([]);
  const [filteredVoices, setFilteredVoices] = useState<Voice[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All Voices');
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Ensure voices are loaded to get latest cloned voices
    voiceCloningService.ensureVoicesLoaded();
    loadVoices();
  }, []);

  const loadVoices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all voices (regular + custom)
      const allVoices = await ttsService.getAvailableVoices();
      const allCategories = await ttsService.getAvailableCategories();
      
      setVoices(allVoices);
      setCategories(allCategories);
      setFilteredVoices(allVoices);
      
      console.log(`🎤 Loaded ${allVoices.length} voices with ${allCategories.length} categories`);
    } catch (error) {
      console.error('Error loading voices:', error);
      setError('Failed to load voices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterVoices = useCallback(() => {
    let filtered = [...voices];

    // Filter by category
    if (selectedCategory !== 'All Voices') {
      filtered = filtered.filter(voice => voice.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(voice =>
        voice.name.toLowerCase().includes(query) ||
        voice.description.toLowerCase().includes(query) ||
        voice.category.toLowerCase().includes(query)
      );
    }

    // Filter by gender
    if (genderFilter !== 'all') {
      filtered = filtered.filter(voice => voice.gender.toLowerCase() === genderFilter.toLowerCase());
    }

    setFilteredVoices(filtered);
  }, [voices, selectedCategory, searchQuery, genderFilter]);

  useEffect(() => {
    filterVoices();
  }, [filterVoices]);

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleGenderFilter = (gender: string) => {
    setGenderFilter(gender);
  };

  const handleRefresh = () => {
    loadVoices();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-2xl font-semibold text-gray-700">Loading Voices...</h2>
            <p className="text-gray-500 mt-2">Fetching your voice collection</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">Error Loading Voices</h2>
            <p className="text-gray-500 mb-6">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Voice Gallery</h1>
              <p className="text-gray-600">
                Explore our collection of {voices.length} AI voices, including professional voices and your custom cloned voices
              </p>
            </div>
            
            {/* Manual Refresh Button */}
            <button
              onClick={() => {
                voiceCloningService.refreshVoiceList();
                // Force a page reload to show updated voices
                window.location.reload();
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh Voices</span>
            </button>
          </div>
        </div>

        {/* Quick Category Navigation */}
        <div className="mb-6">
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategorySelect(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search voices by name, description, or category..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Gender Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="text-gray-400 w-5 h-5" />
              <select
                value={genderFilter}
                onChange={(e) => handleGenderFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Genders</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing {filteredVoices.length} of {voices.length} voices
            {selectedCategory !== 'All Voices' && ` in ${selectedCategory}`}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
        </div>

        {/* Voice Grid */}
        {filteredVoices.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No voices found</h3>
            <p className="text-gray-500">
              Try adjusting your search or filters to find what you're looking for.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredVoices.map((voice) => (
              <VoiceCard
                key={voice.id}
                id={voice.id}
                name={voice.name}
                gender={voice.gender}
                language={voice.language}
                category={voice.category}
                description={voice.description}
                isPremium={voice.isPremium || false}
                isNew={voice.isNew || false}
                downloadURL={voice.downloadURL}
                isMultiSpeaker={voice.isMultiSpeaker || false}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

const VoiceCard = ({ 
  id,
  name, 
  gender, 
  language, 
  category, 
  description,
  isPremium = false,
  isNew = false,
  downloadURL,
  isMultiSpeaker = false
}: {
  id: string;
  name: string;
  gender: string;
  language: string;
  category: string;
  description: string;
  isPremium?: boolean;
  isNew?: boolean;
  downloadURL?: string;
  isMultiSpeaker?: boolean;
}) => {
  const router = useRouter();
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const getAudioPath = (voiceId: string) => {
    // For custom voices, use the Firebase download URL
    if (voiceId.startsWith('cloned_') && downloadURL) {
      return downloadURL;
    }
    
    // For regular voices, try WAV first, then MP3 as fallback
    const wavPath = `/voices/${voiceId}.wav`;
    const mp3Path = `/voices/${voiceId}.mp3`;
    
    // Return WAV path - we'll handle the fallback in the preview function
    return wavPath; 
  };

  const handlePreview = async () => {
    if (isPlaying && audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    try {
      const audioPath = getAudioPath(id);
      if (!audioPath) {
        console.warn('No audio path available for voice:', id);
        return;
      }
      
      let audio: HTMLAudioElement;
      
             if (id.startsWith('cloned_') && downloadURL) {
         // For cloned voices, try to play directly first, then fallback to blob if needed
         try {
           // First try to play the Firebase URL directly
           audio = new Audio(downloadURL);
           
           // Set up event handlers
           audio.onended = () => {
             setIsPlaying(false);
             setAudioElement(null);
           };
           
           // Wait for audio to be loaded before playing
           audio.oncanplaythrough = async () => {
             console.log('Audio loaded and ready to play');
             try {
               await audio.play();
             } catch (playError) {
               console.error('Failed to play loaded audio:', playError);
               setIsPlaying(false);
             }
           };
           
           audio.onerror = async () => {
             console.log('Direct playback failed, trying blob approach...');
             
             // Fallback: fetch as blob
             try {
               const response = await fetch(downloadURL, {
                 mode: 'cors',
                 credentials: 'omit'
               });
               
               if (!response.ok) {
                 throw new Error(`Failed to fetch audio: ${response.status}`);
               }
               
               const audioBlob = await response.blob();
               const audioUrl = URL.createObjectURL(audioBlob);
               
               // Create new audio element with blob URL
               const blobAudio = new Audio(audioUrl);
               blobAudio.onended = () => {
                 setIsPlaying(false);
                 setAudioElement(null);
                 URL.revokeObjectURL(audioUrl);
               };
               
               blobAudio.onerror = () => {
                 console.error('Blob playback also failed');
                 setIsPlaying(false);
                 URL.revokeObjectURL(audioUrl);
               };
               
               blobAudio.oncanplaythrough = async () => {
                 console.log('Blob audio loaded and ready to play');
                 try {
                   await blobAudio.play();
                 } catch (playError) {
                   console.error('Failed to play blob audio:', playError);
                   setIsPlaying(false);
                   URL.revokeObjectURL(audioUrl);
                 }
               };
               
               blobAudio.onloadstart = () => setIsPlaying(true);
               setAudioElement(blobAudio);
               
             } catch (blobError) {
               console.error('Blob approach failed:', blobError);
               setIsPlaying(false);
               return;
             }
           };
           
         } catch (directError) {
           console.error('Direct audio creation failed:', directError);
           setIsPlaying(false);
           return;
         }
                    } else {
         // For regular voices, try WAV first, then MP3 as fallback
         audio = new Audio(audioPath);
         
         // Set up event handlers for regular voices
         audio.onloadstart = () => setIsPlaying(true);
         audio.onended = () => {
           setIsPlaying(false);
           setAudioElement(null);
         };
         
         // Try MP3 fallback if WAV fails
         audio.onerror = () => {
           console.log('WAV failed, trying MP3 fallback...');
           const mp3Path = `/voices/${id}.mp3`;
           audio.src = mp3Path;
         };
         
         // For regular voices, play immediately since they're local files
         setAudioElement(audio);
         try {
           await audio.play();
         } catch (playError) {
           console.error('Failed to play regular voice audio:', playError);
           setIsPlaying(false);
         }
         return; // Exit early for regular voices
       }
       
       // Only set these for cloned voices
       audio.onloadstart = () => setIsPlaying(true);
       setAudioElement(audio);
       // Don't call play() here - wait for oncanplaythrough event
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  };

  const handleUseVoice = () => {
    router.push(`/tts?voice=${encodeURIComponent(id)}`);
  };

  const isCustomVoice = id.startsWith('cloned_');

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Voice Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{name}</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              gender === 'Female' ? 'bg-pink-100 text-pink-700' : 
              gender === 'Male' ? 'bg-blue-100 text-blue-700' : 
              gender === 'Custom' ? 'bg-purple-100 text-purple-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {gender}
            </span>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {language}
            </span>
          </div>
        </div>
        
        {/* Premium/New Badges */}
        <div className="flex flex-col items-end space-y-1">
          {isPremium && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              <Star className="w-3 h-3 mr-1" />
              Premium
            </span>
          )}
          {isNew && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <Sparkles className="w-3 h-3 mr-1" />
              New
            </span>
          )}
          {isCustomVoice && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              <Sparkles className="w-3 h-3 mr-1" />
              Custom
            </span>
          )}
        </div>
      </div>

      {/* Category */}
      <div className="mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {category}
        </span>
      </div>

      {/* Description */}
      <p className="text-gray-600 text-sm mb-4 line-clamp-3">{description}</p>

      {/* Action Buttons */}
      <div className="flex items-center space-x-2">
        <button 
          onClick={handlePreview}
          disabled={isPlaying}
          className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 border border-gray-300 rounded-lg transition-colors ${
            isPlaying ? 'bg-orange-50 border-orange-300' : 
            'hover:bg-gray-50'
          }`}
          title="Preview voice"
        >
          {isPlaying ? (
            <>
              <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <span>Playing...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Preview</span>
            </>
          )}
        </button>
        <button 
          onClick={handleUseVoice}
          className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors group"
          title={`Use ${name} for TTS generation`}
        >
          <Volume2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span>Use Voice</span>
        </button>
      </div>
    </div>
  );
};
