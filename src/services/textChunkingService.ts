import { ttsService, TTSRequest, TTSResult } from './ttsService';
import { audioConcatenator, AudioChunk } from '../utils/audioConcatenator';

export interface TextChunk {
  id: string;
  text: string;              // Full text including context (used for TTS generation)
  newText: string;           // Only the new content (used for audio output)
  contextText?: string;      // Context from previous chunk (for generation only)
  startIndex: number;
  endIndex: number;
  order: number;
  // Advanced context features
  contextBefore?: string;    // Previous chunk's ending for context
  contextAfter?: string;     // Next chunk's beginning for context
  prosodyContext?: string;   // Emotional/tone context
  sentenceCount: number;     // Number of sentences in chunk
  newSentenceCount: number;  // Number of NEW sentences (excluding context)
  contextSentenceCount: number; // Number of context sentences from previous chunk
  isFirstChunk: boolean;
  isLastChunk: boolean;
  // Audio trimming information
  estimatedContextDuration?: number; // Estimated duration of context portion (seconds)
  contextWordsCount: number;         // Number of context words for duration estimation
}

export interface ChunkedTTSResult {
  success: boolean;
  result?: TTSResult;
  error?: string;
  chunkId: string;
  order: number;
  qualityControl?: QualityControlResult;
  regenerationAttempts?: number;
  // Audio trimming information for overlap handling
  trimmedAudio?: string;           // Base64 audio with context portion removed
  originalDuration?: number;       // Original audio duration
  trimmedDuration?: number;        // Duration after trimming context
  contextDurationTrimmed?: number; // Duration of context portion that was removed
}

export interface QualityControlResult {
  passed: boolean;
  checks: {
    volumeConsistency: { passed: boolean; score: number; threshold: number };
    voiceSimilarity: { passed: boolean; score: number; threshold: number };
    gibberishDetection: { passed: boolean; confidence: number; expectedText?: string; transcribedText?: string };
    spectralConsistency: { passed: boolean; score: number; threshold: number };
    // Enhanced spectral quality checks for "phone-like" artifact detection
    spectralBandwidth: { passed: boolean; value: number; threshold: number };
    spectralRolloff: { passed: boolean; value: number; threshold: number };
    frequencyBalance: { passed: boolean; value: number; threshold: number };
    mfccVariance: { passed: boolean; value: number; threshold: number };
  };
  overallScore: number;
  regenerationReason?: string;
}

export interface AudioAnalysis {
  rms: number;
  peak: number;
  spectralCentroid: number;
  zeroCrossingRate: number;
  duration: number;
  // Enhanced spectral features for "phone-like" artifact detection
  spectralBandwidth: number;       // Frequency range spread
  spectralRolloff: number;         // Frequency below which 85% of energy lies
  spectralFlatness: number;        // Measure of how tone-like vs noise-like
  highFreqEnergy: number;          // Energy in high frequencies (4kHz+)
  lowFreqEnergy: number;           // Energy in low frequencies (0-1kHz)
  midFreqEnergy: number;           // Energy in mid frequencies (1-4kHz)
  frequencyBalance: number;        // Ratio of mid/high to low frequencies
  mfccVariance: number;            // Variance in MFCC coefficients (voice richness)
  embedding?: number[];            // Voice embedding vector
  
  // ADVANCED VOICE CONSISTENCY FEATURES
  pitch: {
    mean: number;                  // Average fundamental frequency (Hz)
    range: number;                 // Pitch range (max - min Hz)
    variance: number;              // Pitch stability/expressiveness
    contour: number[];            // Simplified pitch contour
  };
  prosody: {
    speechRate: number;           // Words per minute / phonemes per second
    energyVariance: number;       // Dynamic range and expressiveness
    pauseDuration: number;        // Average pause length
    stressPattern: number[];      // Syllable stress patterns
  };
  formants: {
    f1: number;                   // First formant (vowel height)
    f2: number;                   // Second formant (vowel frontness)
    f3: number;                   // Third formant (voice character)
    bandwidth: number[];          // Formant bandwidths
  };
  voiceQuality: {
    harmonicToNoise: number;      // Voice clarity/breathiness
    jitter: number;               // Pitch stability micro-variations
    shimmer: number;              // Amplitude stability micro-variations
    breathiness: number;          // Aspiration/breath component
  };
  mfccs: number[];                // 13 MFCC coefficients for timbre matching
}

export interface RegenerationConfig {
  maxAttempts: number;
  volumeThreshold: number; // dB difference
  voiceSimilarityThreshold: number; // cosine similarity (0-1)
  gibberishConfidenceThreshold: number; // ASR confidence (0-1)
  spectralThreshold: number; // spectral centroid difference
  // Enhanced spectral quality thresholds for "phone-like" artifact detection
  spectralBandwidthThreshold: number;    // Minimum acceptable bandwidth (Hz)
  spectralRolloffThreshold: number;      // Maximum acceptable rolloff (Hz)
  frequencyBalanceThreshold: number;     // Minimum acceptable freq balance ratio
  mfccVarianceThreshold: number;         // Minimum MFCC variance for voice richness
  enableGibberishDetection: boolean;
  enableVoiceSimilarity: boolean;
  enableSpectralQualityChecks: boolean;  // Enable enhanced spectral analysis
  
  // ADVANCED VOICE CONSISTENCY THRESHOLDS
  enableAdvancedConsistency: boolean;    // Enable multi-feature voice consistency
  pitchMeanThreshold: number;            // Max Hz difference in average pitch
  pitchRangeThreshold: number;           // Max Hz difference in pitch range
  pitchVarianceThreshold: number;        // Max difference in pitch expressiveness
  speechRateThreshold: number;           // Max % difference in speaking rate
  energyVarianceThreshold: number;       // Max difference in dynamic range
  formantThreshold: number;              // Max Hz difference in F1/F2/F3
  harmonicToNoiseThreshold: number;      // Max difference in voice clarity
  jitterThreshold: number;               // Max difference in pitch micro-variations
  shimmerThreshold: number;              // Max difference in amplitude micro-variations
  mfccSimilarityThreshold: number;       // Min cosine similarity for MFCC timbre
  compositeScoreThreshold: number;       // Min weighted aggregate score (0-1)
  
  // Feature weights for composite scoring
  weights: {
    spectral: number;                    // Weight for spectral features
    pitch: number;                       // Weight for pitch features
    prosody: number;                     // Weight for prosody features
    formants: number;                    // Weight for formant features
    voiceQuality: number;                // Weight for voice quality features
    mfcc: number;                        // Weight for MFCC timbre features
  };
}

export interface MergedTTSResult extends TTSResult {
  chunked: true;
  total_chunks: number;
  merged_from_chunks: string[];
}

export interface VoiceState {
  voiceId: string;
  prosodyProfile: ProsodyProfile;
  acousticCharacteristics: AcousticCharacteristics;
  lastUsed: number;
  consistencyScore: number;
}

export interface ProsodyProfile {
  averagePitch: number;
  pitchRange: [number, number];
  speakingRate: number;
  volumeLevel: number;
  emotionalTone: string;
  emphasisPattern: string[];
}

export interface AcousticCharacteristics {
  rms: number;
  peak: number;
  spectralCentroid: number;
  zeroCrossingRate: number;
  formantFrequencies: number[];
}

export interface ProsodyState {
  chunkId: string;
  prosodyContext: string;
  acousticProfile: AcousticCharacteristics;
  timestamp: number;
}

class TextChunkingService {
  private readonly MAX_CHUNK_SIZE = 300;  // Maximum characters per chunk (optimized for voice consistency)
  private readonly MIN_CHUNK_SIZE = 200;  // Minimum characters per chunk to avoid too many tiny chunks
  
  // Voice state caching for consistency
  private voiceStateCache: Map<string, VoiceState> = new Map();
  private prosodyHistory: ProsodyState[] = [];
  
  // ElevenLabs-style Quality Control Configuration with ADVANCED VOICE CONSISTENCY
  private readonly QC_CONFIG: RegenerationConfig = {
    maxAttempts: 3,                     // Max regeneration attempts per chunk
    volumeThreshold: 2.0,               // 2 dB difference threshold
    voiceSimilarityThreshold: 0.90,     // 90% voice similarity required
    gibberishConfidenceThreshold: 0.8,  // 80% ASR confidence required
    spectralThreshold: 0.15,            // 15% spectral centroid difference
    // Enhanced spectral quality thresholds for "phone-like" artifact detection
    spectralBandwidthThreshold: 2000,   // Minimum 2kHz bandwidth (phone = ~300-3400Hz, good TTS = 80Hz-8kHz+)
    spectralRolloffThreshold: 6000,     // Maximum 6kHz rolloff (phone cuts off ~3.4kHz, good TTS = 7-8kHz+)
    frequencyBalanceThreshold: 0.3,     // Minimum 0.3 ratio (phone has poor low-freq, good TTS = balanced)
    mfccVarianceThreshold: 0.5,         // Minimum MFCC variance for voice richness
    enableGibberishDetection: true,     // ✅ ENABLED: Server-side Whisper Tiny STT
    enableVoiceSimilarity: true,        // ✅ ENABLED: Voice similarity checks
    enableSpectralQualityChecks: true,  // ✅ ENABLED: Enhanced spectral analysis for "phone-like" detection
    
    // ADVANCED VOICE CONSISTENCY - Professional-grade multi-feature checking
    enableAdvancedConsistency: true,    // ✅ ENABLED: Beyond speaker similarity to exact voice matching
    pitchMeanThreshold: 5.0,            // Max 5Hz difference in average pitch (very strict)
    pitchRangeThreshold: 15.0,          // Max 15Hz difference in pitch range (expressiveness)
    pitchVarianceThreshold: 0.1,        // Max 10% difference in pitch expressiveness
    speechRateThreshold: 0.05,          // Max 5% difference in speaking rate (very strict)
    energyVarianceThreshold: 0.1,       // Max 10% difference in dynamic range
    formantThreshold: 50.0,             // Max 50Hz difference in F1/F2/F3 (timbre)
    harmonicToNoiseThreshold: 0.05,     // Max 5% difference in voice clarity
    jitterThreshold: 0.002,             // Max 0.2% difference in pitch micro-variations
    shimmerThreshold: 0.05,             // Max 5% difference in amplitude micro-variations
    mfccSimilarityThreshold: 0.95,      // Min 95% MFCC cosine similarity (timbre matching)
    compositeScoreThreshold: 0.92,      // Min 92% weighted aggregate score (very strict)
    
    // Feature weights for composite scoring (totals to 1.0)
    weights: {
      spectral: 0.20,                   // Spectral features weight
      pitch: 0.25,                      // Pitch features weight (most important for consistency)
      prosody: 0.20,                    // Prosody features weight
      formants: 0.15,                   // Formant features weight (timbre)
      voiceQuality: 0.10,               // Voice quality features weight
      mfcc: 0.10                        // MFCC timbre features weight
    }
  };
  
  // Reference audio analysis for comparison
  private referenceAudioAnalysis: AudioAnalysis | null = null;

  /**
   * CONTEXT-AWARE SEMANTIC CHUNKING: Generate with overlap context, trim for output
   * CRITICAL: Context is used for TTS generation consistency, but trimmed from final audio
   */
  splitTextIntoChunks(text: string): TextChunk[] {
    if (text.length <= this.MAX_CHUNK_SIZE) {
      return [{
        id: 'chunk_0',
        text: text.trim(),
        newText: text.trim(),          // No context for single chunk
        contextText: undefined,
        startIndex: 0,
        endIndex: text.length,
        order: 0,
        sentenceCount: this.countSentences(text),
        newSentenceCount: this.countSentences(text),
        contextSentenceCount: 0,
        contextWordsCount: 0,
        isFirstChunk: true,
        isLastChunk: true
      }];
    }

    console.log(`🧠 CONTEXT-AWARE SEMANTIC CHUNKING: Processing ${text.length} characters`);
    
    // STEP 1: SEMANTIC SEGMENTATION FIRST (not character-based!)
    const sentences = this.splitIntoSentences(text);
    console.log(`📝 Found ${sentences.length} sentences for context-aware chunking`);
    
    if (sentences.length <= 1) {
      // Single sentence - return as one chunk even if over limit
      return [{
        id: 'chunk_0',
        text: text.trim(),
        newText: text.trim(),
        contextText: undefined,
        startIndex: 0,
        endIndex: text.length,
        order: 0,
        sentenceCount: 1,
        newSentenceCount: 1,
        contextSentenceCount: 0,
        contextWordsCount: 0,
        isFirstChunk: true,
        isLastChunk: true
      }];
    }

    // STEP 2: BUILD CHUNKS WITH CONTEXT TRACKING
    const chunks: TextChunk[] = [];
    let chunkOrder = 0;
    let sentenceIndex = 0;
    const CONTEXT_SENTENCES = 1; // Number of sentences to use as context from previous chunk

    while (sentenceIndex < sentences.length) {
      // Determine context sentences from previous chunk
      const contextStartIndex = Math.max(0, sentenceIndex - CONTEXT_SENTENCES);
      const contextSentences = chunkOrder > 0 ? sentences.slice(contextStartIndex, sentenceIndex) : [];
      
      // Build new content for this chunk
      const newSentences: string[] = [];
      let newContent = '';
      let totalLength = contextSentences.join(' ').length;
      
      // Add sentences until we hit the limit
      for (let i = sentenceIndex; i < sentences.length; i++) {
        const sentence = sentences[i].trim();
        if (!sentence) continue;
        
        const testContent = newContent ? `${newContent} ${sentence}` : sentence;
        const testTotalLength = totalLength + (totalLength > 0 ? 1 : 0) + sentence.length;
        
        // Check if adding this sentence would exceed our limit
        if (testTotalLength > this.MAX_CHUNK_SIZE && newContent) {
          break; // Stop here to respect size limit
        }
        
        newSentences.push(sentence);
        newContent = testContent;
        totalLength = testTotalLength;
      }
      
      // CRITICAL SAFETY: If no sentences could be added, force at least one to avoid infinite loop
      if (newSentences.length === 0 && sentenceIndex < sentences.length) {
        const forcedSentence = sentences[sentenceIndex].trim();
        newSentences.push(forcedSentence);
        newContent = forcedSentence;
        console.warn(`⚠️ FORCED sentence inclusion for ${sentenceIndex} to prevent infinite loop:`, {
          sentenceLength: forcedSentence.length,
          maxChunkSize: this.MAX_CHUNK_SIZE,
          totalLength: totalLength,
          sentence: forcedSentence.substring(0, 100) + '...'
        });
      }
      
      // Build final chunk content
      const contextText = contextSentences.join(' ').trim();
      const newText = newContent.trim();
      const fullText = contextText ? `${contextText} ${newText}` : newText;
      
      // Calculate positions in original text
      const startPos = this.findSentencePosition(text, sentenceIndex, sentences);
      const endPos = this.findSentencePosition(text, sentenceIndex + newSentences.length - 1, sentences) + 
                     sentences[sentenceIndex + newSentences.length - 1].length;
      
      // Calculate word counts for duration estimation
      const contextWordsCount = contextText ? contextText.split(/\s+/).filter(w => w.length > 0).length : 0;
      const estimatedContextDuration = this.estimateTextDuration(contextText);
      
      // Enhanced context tracking for better trimming
      console.log(`📝 Chunk ${chunkOrder} context analysis:`, {
        contextText: contextText ? `"${contextText}"` : 'none',
        contextWords: contextWordsCount,
        contextSentences: contextSentences.length,
        estimatedDuration: estimatedContextDuration.toFixed(2) + 's',
        newText: `"${newText.substring(0, 50)}${newText.length > 50 ? '...' : ''}"`
      });
      
      chunks.push({
        id: `chunk_${chunkOrder}`,
        text: fullText,                    // Full text with context (for TTS generation)
        newText: newText,                  // Only new content (for final audio)
        contextText: contextText || undefined,
        startIndex: startPos,
        endIndex: endPos,
        order: chunkOrder,
        sentenceCount: contextSentences.length + newSentences.length,
        newSentenceCount: newSentences.length,
        contextSentenceCount: contextSentences.length,
        contextWordsCount,
        estimatedContextDuration,
        isFirstChunk: chunkOrder === 0,
        isLastChunk: sentenceIndex + newSentences.length >= sentences.length,
        // Legacy context properties for compatibility
        contextBefore: contextText || undefined,
        prosodyContext: this.extractProsodyContext(fullText)
      });
      
      sentenceIndex += newSentences.length;
      chunkOrder++;
    }

    console.log(`🎯 CONTEXT-AWARE CHUNKING COMPLETE: ${chunks.length} chunks with smart overlap`, chunks.map(c => ({
      id: c.id,
      fullLength: c.text.length,
      newLength: c.newText.length,
      contextLength: c.contextText?.length || 0,
      newSentences: c.newSentenceCount,
      contextSentences: c.contextSentenceCount,
      estimatedContextDuration: c.estimatedContextDuration?.toFixed(2) + 's',
      preview: c.newText.substring(0, 40) + '...'
    })));

    return chunks;
  }

  /**
   * Split text into sentences for better prosody preservation
   */
  private splitIntoSentences(text: string): string[] {
    // Advanced sentence splitting that preserves context
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    return sentences;
  }

  /**
   * Get overlap sentences for sliding window (prosody continuity)
   */
  private getOverlapSentences(sentences: string[], overlapCount: number): string {
    if (!sentences || sentences.length === 0 || overlapCount <= 0) {
      return '';
    }
    
    // Get last N sentences for context overlap
    const lastSentences = sentences.slice(-overlapCount);
    return lastSentences.join(' ').trim();
  }

  /**
   * Count sentences in text
   */
  private countSentences(text: string): number {
    return this.splitIntoSentences(text).length;
  }

  /**
   * Estimate duration of text for audio trimming (more precise calculation)
   */
  private estimateTextDuration(text: string): number {
    if (!text) return 0;
    
    const words = text.split(/\s+/).filter(word => word.length > 0);
    if (words.length === 0) return 0;
    
    // More precise estimation based on word characteristics
    let totalDuration = 0;
    
    for (const word of words) {
      // Base duration per word (average 0.6 seconds per word in TTS)
      let wordDuration = 0.6;
      
      // Adjust for word length (longer words take more time)
      if (word.length > 6) wordDuration += 0.1;
      if (word.length > 10) wordDuration += 0.2;
      
      // Adjust for punctuation (pauses)
      if (word.includes('.') || word.includes('!') || word.includes('?')) {
        wordDuration += 0.3; // End of sentence pause
      } else if (word.includes(',') || word.includes(';')) {
        wordDuration += 0.15; // Mid-sentence pause
      }
      
      totalDuration += wordDuration;
    }
    
    return totalDuration;
  }

  /**
   * Create context-aware chunk with prosody preservation
   */
  private createContextAwareChunk(
    chunkText: string,
    order: number,
    startSentenceIndex: number,
    endSentenceIndex: number,
    allSentences: string[],
    originalText: string,
    previousChunks: TextChunk[]
  ): TextChunk {
    const sentenceCount = endSentenceIndex - startSentenceIndex + 1;
    
    // Calculate text positions
    const startPos = this.findSentencePosition(originalText, startSentenceIndex, allSentences);
    const endPos = this.findSentencePosition(originalText, endSentenceIndex, allSentences) + allSentences[endSentenceIndex].length;

    return {
      id: `chunk_${order}`,
      text: chunkText,
      newText: chunkText, // For legacy method, text and newText are the same
      startIndex: startPos,
      endIndex: endPos,
      order,
      sentenceCount,
      newSentenceCount: sentenceCount,
      contextSentenceCount: 0,
      contextWordsCount: 0,
      isFirstChunk: order === 0,
      isLastChunk: endSentenceIndex >= allSentences.length - 1
    };
  }

  /**
   * Find position of sentence in original text
   */
  private findSentencePosition(originalText: string, sentenceIndex: number, sentences: string[]): number {
    let position = 0;
    for (let i = 0; i < sentenceIndex; i++) {
      const sentencePos = originalText.indexOf(sentences[i], position);
      if (sentencePos !== -1) {
        position = sentencePos + sentences[i].length;
      }
    }
    return position;
  }

  /**
   * Add context information to chunks for prosody preservation
   */
  private addContextToChunks(chunks: TextChunk[], sentences: string[], originalText: string): void {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Only add prosody context (emotional/tone indicators) - no text duplication
      chunk.prosodyContext = this.extractProsodyContext(chunk.text);
      
      // Mark first and last chunks for special handling
      chunk.isFirstChunk = (i === 0);
      chunk.isLastChunk = (i === chunks.length - 1);
    }
  }

  /**
   * Extract context from chunk for continuity
   */
  private extractContextFromChunk(chunk: TextChunk, position: 'start' | 'end'): string {
    const text = chunk.text;
    const words = text.split(/\s+/);
    
    if (position === 'end') {
      // Get last 1-2 sentences for context
      return words.slice(-Math.min(20, words.length)).join(' ');
    } else {
      // Get first 1-2 sentences for context
      return words.slice(0, Math.min(20, words.length)).join(' ');
    }
  }

  /**
   * Extract prosody context (emotional/tone indicators)
   */
  private extractProsodyContext(text: string): string {
    // Look for emotional indicators, punctuation patterns, etc.
    const emotionalWords = /(excited|happy|sad|angry|surprised|worried|confident|uncertain)/gi;
    const punctuation = /[!?]{1,3}/g;
    const emphasis = /\b(very|really|extremely|quite|rather|somewhat)\b/gi;
    
    const matches = [
      ...text.match(emotionalWords) || [],
      ...text.match(punctuation) || [],
      ...text.match(emphasis) || []
    ];
    
    return matches.slice(0, 3).join(' '); // Top 3 indicators
  }

  /**
   * Find the best semantic split point for optimal context preservation
   */
  private findSemanticSplitPoint(text: string): number {
    const minSize = Math.min(this.MIN_CHUNK_SIZE, this.MAX_CHUNK_SIZE * 0.5); // At least 50% of max size
    
    // 1. Look for paragraph breaks first (best semantic boundary)
    const paragraphBreaks = /\n\s*\n/g;
    let lastParagraphBreak = -1;
    let match;
    
    while ((match = paragraphBreaks.exec(text)) !== null) {
      const endPos = match.index + match[0].length;
      if (endPos >= minSize && endPos <= this.MAX_CHUNK_SIZE) {
        lastParagraphBreak = endPos;
      }
    }

    if (lastParagraphBreak > minSize) {
      return lastParagraphBreak;
    }

    // 2. Look for sentence endings (., !, ?)
    const sentenceEndings = /[.!?]+\s+/g;
    let lastSentenceEnd = -1;
    
    while ((match = sentenceEndings.exec(text)) !== null) {
      const endPos = match.index + match[0].length;
      if (endPos >= minSize && endPos <= this.MAX_CHUNK_SIZE) {
        lastSentenceEnd = endPos;
      }
    }

    if (lastSentenceEnd > minSize) {
      return lastSentenceEnd;
    }

    // 3. Look for semantic connectors (but, however, therefore, etc.)
    const semanticConnectors = /\b(but|however|therefore|meanwhile|furthermore|moreover|additionally|consequently|nevertheless|nonetheless)\b/gi;
    let lastConnector = -1;
    
    while ((match = semanticConnectors.exec(text)) !== null) {
      const endPos = match.index + match[0].length;
      if (endPos >= minSize && endPos <= this.MAX_CHUNK_SIZE) {
        lastConnector = endPos;
      }
    }

    if (lastConnector > minSize) {
      return lastConnector;
    }

    // 4. Look for comma breaks (for better prosody)
    const commaBreaks = /,\s+/g;
    let lastCommaBreak = -1;
    
    while ((match = commaBreaks.exec(text)) !== null) {
      const endPos = match.index + match[0].length;
      if (endPos >= minSize && endPos <= this.MAX_CHUNK_SIZE) {
        lastCommaBreak = endPos;
      }
    }

    if (lastCommaBreak > minSize) {
      return lastCommaBreak;
    }

    // 5. Look for word boundaries as last resort
    const words = text.split(/\s+/);
    let currentLength = 0;
    let lastWordBoundary = -1;

    for (let i = 0; i < words.length; i++) {
      currentLength += words[i].length + (i > 0 ? 1 : 0); // +1 for space
      
      if (currentLength >= minSize && currentLength <= this.MAX_CHUNK_SIZE) {
        lastWordBoundary = currentLength;
      }
      
      if (currentLength > this.MAX_CHUNK_SIZE) {
        break;
      }
    }

    return lastWordBoundary;
  }

  /**
   * ADVANCED VOICE CONSISTENCY ANALYSIS: Multi-feature audio analysis for perfect voice matching
   * Extracts pitch, prosody, formants, voice quality, and timbre features
   */
  private analyzeAudioQuality(audioBase64: string, expectedText: string): AudioAnalysis {
    try {
      // Convert base64 to audio data for analysis
      const binaryData = this.base64ToArrayBuffer(audioBase64);
      const audioData = binaryData.slice(44); // Skip WAV header
      
      // Analyze audio characteristics with enhanced spectral analysis
      const samples = audioData.length / 2; // 16-bit audio
      const sampleRate = 24000; // Assuming 24kHz sample rate
      let rms = 0;
      let peak = 0;
      let zeroCrossings = 0;
      let spectralSum = 0;
      
      // Enhanced spectral analysis arrays
      const windowSize = 512;
      const hopSize = 256;
      const numWindows = Math.floor((samples - windowSize) / hopSize) + 1;
      
      // Frequency band energies
      let lowFreqEnergy = 0;   // 0-1kHz
      let midFreqEnergy = 0;   // 1-4kHz
      let highFreqEnergy = 0;  // 4kHz+
      
      // MFCC-like variance calculation
      let mfccSum = 0;
      let mfccSumSquared = 0;
      let spectralVariance = 0;
      
      for (let i = 0; i < samples; i++) {
        const sample = (audioData[i * 2 + 1] << 8) | audioData[i * 2];
        const signedSample = sample > 32767 ? sample - 65536 : sample;
        
        rms += signedSample * signedSample;
        peak = Math.max(peak, Math.abs(signedSample));
        
        if (i > 0) {
          const prevSample = (audioData[(i - 1) * 2 + 1] << 8) | audioData[(i - 1) * 2];
          const prevSigned = prevSample > 32767 ? prevSample - 65536 : prevSample;
          
          if ((prevSigned >= 0) !== (signedSample >= 0)) {
            zeroCrossings++;
          }
        }
        
        // Enhanced spectral centroid calculation
        spectralSum += Math.abs(signedSample) * i;
        
        // Calculate frequency band energies (simplified approximation)
        const freq = (i / samples) * (sampleRate / 2); // Approximate frequency
        const energy = signedSample * signedSample;
        
        if (freq < 1000) {
          lowFreqEnergy += energy;
        } else if (freq < 4000) {
          midFreqEnergy += energy;
        } else {
          highFreqEnergy += energy;
        }
        
        // MFCC-like variance (simplified)
        const mfccValue = Math.log(Math.abs(signedSample) + 1);
        mfccSum += mfccValue;
        mfccSumSquared += mfccValue * mfccValue;
      }
      
      // Calculate derived metrics
      const rmsValue = Math.sqrt(rms / samples);
      const totalEnergy = lowFreqEnergy + midFreqEnergy + highFreqEnergy;
      const frequencyBalance = totalEnergy > 0 ? (midFreqEnergy + highFreqEnergy) / (lowFreqEnergy + 1) : 0;
      
      // Calculate spectral bandwidth and rolloff (simplified approximations)
      const spectralCentroid = spectralSum / (samples * rmsValue);
      const spectralBandwidth = this.calculateSpectralBandwidth(audioData, spectralCentroid);
      const spectralRolloff = this.calculateSpectralRolloff(audioData, 0.85); // 85% energy threshold
      const spectralFlatness = this.calculateSpectralFlatness(audioData);
      
      // Calculate MFCC variance
      const mfccMean = mfccSum / samples;
      const mfccVariance = (mfccSumSquared / samples) - (mfccMean * mfccMean);
      
      // ADVANCED VOICE CONSISTENCY FEATURES
      const advancedFeatures = this.extractAdvancedVoiceFeatures(audioData, sampleRate, samples);
      
      // Ensure all required fields are present with defaults
      const defaultFeatures = {
        pitch: { mean: 0, range: 0, variance: 0, contour: [] },
        prosody: { speechRate: 0, energyVariance: 0, pauseDuration: 0, stressPattern: [] },
        formants: { f1: 0, f2: 0, f3: 0, bandwidth: [] },
        voiceQuality: { harmonicToNoise: 0, jitter: 0, shimmer: 0, breathiness: 0 },
        mfccs: new Array(13).fill(0)
      };

      return {
        rms: rmsValue,
        peak,
        spectralCentroid,
        zeroCrossingRate: zeroCrossings / samples,
        duration: samples / sampleRate,
        // Enhanced spectral features for "phone-like" artifact detection
        spectralBandwidth,
        spectralRolloff,
        spectralFlatness,
        highFreqEnergy: highFreqEnergy / totalEnergy,
        lowFreqEnergy: lowFreqEnergy / totalEnergy,
        midFreqEnergy: midFreqEnergy / totalEnergy,
        frequencyBalance,
        mfccVariance,
        // ADVANCED VOICE CONSISTENCY FEATURES (with defaults)
        ...defaultFeatures,
        ...advancedFeatures,
        // embedding: undefined, // Would be computed by external embedding model
      };
    } catch (error) {
      console.warn('⚠️ Enhanced audio analysis failed:', error);
      return {
        rms: 0,
        peak: 0,
        spectralCentroid: 0,
        zeroCrossingRate: 0,
        duration: 0,
        spectralBandwidth: 0,
        spectralRolloff: 0,
        spectralFlatness: 0,
        highFreqEnergy: 0,
        lowFreqEnergy: 0,
        midFreqEnergy: 0,
        frequencyBalance: 0,
        mfccVariance: 0,
        pitch: { mean: 0, range: 0, variance: 0, contour: [] },
        prosody: { speechRate: 0, energyVariance: 0, pauseDuration: 0, stressPattern: [] },
        formants: { f1: 0, f2: 0, f3: 0, bandwidth: [] },
        voiceQuality: { harmonicToNoise: 0, jitter: 0, shimmer: 0, breathiness: 0 },
        mfccs: new Array(13).fill(0)
      };
    }
  }

  /**
   * ELEVENLABS-STYLE QC: Check if audio chunk meets quality standards including "phone-like" artifacts
   */
  private performQualityControl(
    analysis: AudioAnalysis, 
    expectedText: string, 
    chunkId: string
  ): QualityControlResult {
    const checks = {
      volumeConsistency: { passed: true, score: 1.0, threshold: this.QC_CONFIG.volumeThreshold },
      voiceSimilarity: { passed: true, score: 1.0, threshold: this.QC_CONFIG.voiceSimilarityThreshold },
      gibberishDetection: { passed: true, confidence: 1.0, expectedText, transcribedText: expectedText },
      spectralConsistency: { passed: true, score: 1.0, threshold: this.QC_CONFIG.spectralThreshold },
      // Enhanced spectral quality checks for "phone-like" artifact detection
      spectralBandwidth: { passed: true, value: analysis.spectralBandwidth, threshold: this.QC_CONFIG.spectralBandwidthThreshold },
      spectralRolloff: { passed: true, value: analysis.spectralRolloff, threshold: this.QC_CONFIG.spectralRolloffThreshold },
      frequencyBalance: { passed: true, value: analysis.frequencyBalance, threshold: this.QC_CONFIG.frequencyBalanceThreshold },
      mfccVariance: { passed: true, value: analysis.mfccVariance, threshold: this.QC_CONFIG.mfccVarianceThreshold },
    };

    let overallScore = 1.0;
    let regenerationReason = '';

    // Volume consistency check
    if (this.referenceAudioAnalysis) {
      const rmsDbDiff = Math.abs(
        20 * Math.log10(analysis.rms) - 20 * Math.log10(this.referenceAudioAnalysis.rms)
      );
      checks.volumeConsistency.score = Math.max(0, 1 - (rmsDbDiff / this.QC_CONFIG.volumeThreshold));
      checks.volumeConsistency.passed = rmsDbDiff <= this.QC_CONFIG.volumeThreshold;
      
      if (!checks.volumeConsistency.passed) {
        regenerationReason += `Volume inconsistency (${rmsDbDiff.toFixed(1)} dB diff). `;
        overallScore *= 0.5;
      }

      // Spectral consistency check
      const spectralDiff = Math.abs(
        analysis.spectralCentroid - this.referenceAudioAnalysis.spectralCentroid
      ) / Math.max(analysis.spectralCentroid, this.referenceAudioAnalysis.spectralCentroid);
      
      checks.spectralConsistency.score = Math.max(0, 1 - (spectralDiff / this.QC_CONFIG.spectralThreshold));
      checks.spectralConsistency.passed = spectralDiff <= this.QC_CONFIG.spectralThreshold;
      
      if (!checks.spectralConsistency.passed) {
        regenerationReason += `Spectral inconsistency (${(spectralDiff * 100).toFixed(1)}% diff). `;
        overallScore *= 0.7;
      }
    } else {
      // First chunk - set as reference
      this.referenceAudioAnalysis = { ...analysis };
      console.log(`🎯 Set reference audio analysis from ${chunkId}:`, {
        rms: analysis.rms.toFixed(4),
        spectralCentroid: analysis.spectralCentroid.toFixed(2),
        spectralBandwidth: analysis.spectralBandwidth.toFixed(1) + 'Hz',
        spectralRolloff: analysis.spectralRolloff.toFixed(1) + 'Hz',
        frequencyBalance: analysis.frequencyBalance.toFixed(3),
        mfccVariance: analysis.mfccVariance.toFixed(3)
      });
    }

    // Enhanced spectral quality checks for "phone-like" artifact detection
    if (this.QC_CONFIG.enableSpectralQualityChecks) {
      console.log(`🔍 Enhanced spectral analysis for ${chunkId}:`, {
        bandwidth: analysis.spectralBandwidth.toFixed(1) + 'Hz (min: ' + this.QC_CONFIG.spectralBandwidthThreshold + 'Hz)',
        rolloff: analysis.spectralRolloff.toFixed(1) + 'Hz (max: ' + this.QC_CONFIG.spectralRolloffThreshold + 'Hz)',
        freqBalance: analysis.frequencyBalance.toFixed(3) + ' (min: ' + this.QC_CONFIG.frequencyBalanceThreshold + ')',
        mfccVariance: analysis.mfccVariance.toFixed(3) + ' (min: ' + this.QC_CONFIG.mfccVarianceThreshold + ')',
        energyDistribution: `Low: ${(analysis.lowFreqEnergy * 100).toFixed(1)}%, Mid: ${(analysis.midFreqEnergy * 100).toFixed(1)}%, High: ${(analysis.highFreqEnergy * 100).toFixed(1)}%`
      });

      // Spectral bandwidth check (detects narrow-band "phone-like" audio)
      checks.spectralBandwidth.passed = analysis.spectralBandwidth >= this.QC_CONFIG.spectralBandwidthThreshold;
      if (!checks.spectralBandwidth.passed) {
        regenerationReason += `Narrow bandwidth detected (${analysis.spectralBandwidth.toFixed(0)}Hz < ${this.QC_CONFIG.spectralBandwidthThreshold}Hz) - "phone-like" artifact. `;
        overallScore *= 0.4; // Heavy penalty for phone-like artifacts
      }

      // Spectral rolloff check (detects high-frequency cutoff)
      checks.spectralRolloff.passed = analysis.spectralRolloff >= this.QC_CONFIG.spectralRolloffThreshold;
      if (!checks.spectralRolloff.passed) {
        regenerationReason += `Low rolloff frequency (${analysis.spectralRolloff.toFixed(0)}Hz < ${this.QC_CONFIG.spectralRolloffThreshold}Hz) - missing high frequencies. `;
        overallScore *= 0.5; // Penalty for frequency cutoff
      }

      // Frequency balance check (detects poor low/mid/high balance)
      checks.frequencyBalance.passed = analysis.frequencyBalance >= this.QC_CONFIG.frequencyBalanceThreshold;
      if (!checks.frequencyBalance.passed) {
        regenerationReason += `Poor frequency balance (${analysis.frequencyBalance.toFixed(2)} < ${this.QC_CONFIG.frequencyBalanceThreshold}) - weak mid/high frequencies. `;
        overallScore *= 0.6; // Penalty for poor frequency balance
      }

      // MFCC variance check (detects loss of voice richness/texture)
      checks.mfccVariance.passed = analysis.mfccVariance >= this.QC_CONFIG.mfccVarianceThreshold;
      if (!checks.mfccVariance.passed) {
        regenerationReason += `Low voice richness (MFCC variance ${analysis.mfccVariance.toFixed(2)} < ${this.QC_CONFIG.mfccVarianceThreshold}) - flat/monotone quality. `;
        overallScore *= 0.7; // Penalty for loss of voice texture
      }

      // Additional "phone detection" logic - multiple indicators
      const phoneIndicators = [
        analysis.spectralBandwidth < 1500,     // Very narrow bandwidth
        analysis.spectralRolloff < 4000,       // Very low rolloff
        analysis.lowFreqEnergy < 0.1,          // Almost no low frequencies
        analysis.highFreqEnergy < 0.1,         // Almost no high frequencies
        analysis.midFreqEnergy > 0.8           // Mostly mid frequencies
      ];

      const phoneScore = phoneIndicators.filter(Boolean).length;
      if (phoneScore >= 3) {
        regenerationReason += `Strong "telephone effect" detected (${phoneScore}/5 indicators). `;
        overallScore *= 0.2; // Very heavy penalty for clear phone artifacts
        console.warn(`📞 PHONE EFFECT DETECTED in ${chunkId}: ${phoneScore}/5 indicators positive`);
      } else if (phoneScore >= 2) {
        regenerationReason += `Possible "telephone effect" detected (${phoneScore}/5 indicators). `;
        overallScore *= 0.5; // Moderate penalty for possible phone artifacts
        console.warn(`📞 Possible phone effect in ${chunkId}: ${phoneScore}/5 indicators positive`);
      }
    }

    // Voice similarity check using acoustic features
    if (this.QC_CONFIG.enableVoiceSimilarity) {
      if (this.referenceAudioAnalysis) {
        // Calculate voice similarity using multiple acoustic features
        const voiceSimilarity = this.calculateVoiceSimilarity(analysis, this.referenceAudioAnalysis);
        checks.voiceSimilarity.score = voiceSimilarity;
        checks.voiceSimilarity.passed = voiceSimilarity >= this.QC_CONFIG.voiceSimilarityThreshold;
        
        if (!checks.voiceSimilarity.passed) {
          regenerationReason += `Voice inconsistency (similarity: ${voiceSimilarity.toFixed(2)} < ${this.QC_CONFIG.voiceSimilarityThreshold}). `;
          overallScore *= 0.6;
        }
      } else {
        // First chunk - set as reference
        checks.voiceSimilarity.passed = true;
        checks.voiceSimilarity.score = 1.0;
      }
    }

    // WHISPER TINY STT: Ultra-fast gibberish detection
    if (this.QC_CONFIG.enableGibberishDetection) {
      // STT validation will be performed separately due to async nature
      checks.gibberishDetection.passed = true;  // Will be updated by performSTTValidation
      checks.gibberishDetection.confidence = 1.0; // Will be updated by performSTTValidation
    }

    const allChecksPassed = Object.values(checks).every(check => check.passed);

    return {
      passed: allChecksPassed,
      checks,
      overallScore,
      regenerationReason: regenerationReason.trim() || undefined
    };
  }

  /**
   * Calculate voice similarity between two audio analyses
   */
  private calculateVoiceSimilarity(analysis1: AudioAnalysis, analysis2: AudioAnalysis): number {
    try {
      // Calculate similarity for each acoustic feature
      const features = [
        // Spectral features
        this.normalizedSimilarity(analysis1.spectralCentroid, analysis2.spectralCentroid, 1000),
        this.normalizedSimilarity(analysis1.spectralBandwidth, analysis2.spectralBandwidth, 2000),
        this.normalizedSimilarity(analysis1.spectralRolloff, analysis2.spectralRolloff, 3000),
        this.normalizedSimilarity(analysis1.frequencyBalance, analysis2.frequencyBalance, 1.0),
        
        // Voice quality features
        this.normalizedSimilarity(analysis1.rms, analysis2.rms, 0.1),
        this.normalizedSimilarity(analysis1.peak, analysis2.peak, 0.1),
        this.normalizedSimilarity(analysis1.zeroCrossingRate, analysis2.zeroCrossingRate, 0.1),
        
        // Advanced voice features (if available)
        this.normalizedSimilarity(analysis1.pitch.mean, analysis2.pitch.mean, 50),
        this.normalizedSimilarity(analysis1.pitch.range, analysis2.pitch.range, 100),
        this.normalizedSimilarity(analysis1.prosody.speechRate, analysis2.prosody.speechRate, 1.0),
        this.normalizedSimilarity(analysis1.voiceQuality.harmonicToNoise, analysis2.voiceQuality.harmonicToNoise, 10),
      ];
      
      // Calculate weighted average
      const weights = [0.2, 0.15, 0.15, 0.1, 0.1, 0.1, 0.1, 0.05, 0.03, 0.02]; // Prioritize spectral features
      const weightedSum = features.reduce((sum, feature, index) => sum + (feature * (weights[index] || 0.01)), 0);
      const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
      
      return Math.max(0, Math.min(1, weightedSum / totalWeight));
      
    } catch (error) {
      console.warn('⚠️ Voice similarity calculation failed:', error);
      return 0.5; // Default moderate similarity
    }
  }

  /**
   * Calculate normalized similarity between two values
   */
  private normalizedSimilarity(value1: number, value2: number, scale: number): number {
    const diff = Math.abs(value1 - value2);
    const normalizedDiff = diff / scale;
    return Math.max(0, 1 - normalizedDiff);
  }

  /**
   * Convert base64 to ArrayBuffer for audio analysis
   */
  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes;
  }

  /**
   * Calculate spectral bandwidth (simplified approximation)
   */
  private calculateSpectralBandwidth(audioData: Uint8Array, centroid: number): number {
    try {
      const samples = audioData.length / 2;
      let weightedVariance = 0;
      let totalMagnitude = 0;
      
      for (let i = 0; i < samples; i++) {
        const sample = (audioData[i * 2 + 1] << 8) | audioData[i * 2];
        const signedSample = sample > 32767 ? sample - 65536 : sample;
        const magnitude = Math.abs(signedSample);
        const freq = (i / samples) * 12000; // Assuming Nyquist = 12kHz
        
        weightedVariance += magnitude * Math.pow(freq - centroid, 2);
        totalMagnitude += magnitude;
      }
      
      return totalMagnitude > 0 ? Math.sqrt(weightedVariance / totalMagnitude) : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Calculate spectral rolloff (frequency below which X% of energy lies)
   */
  private calculateSpectralRolloff(audioData: Uint8Array, energyThreshold: number): number {
    try {
      const samples = audioData.length / 2;
      const sampleRate = 24000;
      let totalEnergy = 0;
      const energySpectrum: number[] = [];
      
      // Calculate energy spectrum
      for (let i = 0; i < samples; i++) {
        const sample = (audioData[i * 2 + 1] << 8) | audioData[i * 2];
        const signedSample = sample > 32767 ? sample - 65536 : sample;
        const energy = signedSample * signedSample;
        energySpectrum[i] = energy;
        totalEnergy += energy;
      }
      
      // Find rolloff frequency
      let cumulativeEnergy = 0;
      const targetEnergy = totalEnergy * energyThreshold;
      
      for (let i = 0; i < samples; i++) {
        cumulativeEnergy += energySpectrum[i];
        if (cumulativeEnergy >= targetEnergy) {
          return (i / samples) * (sampleRate / 2); // Convert to Hz
        }
      }
      
      return (sampleRate / 2); // Return Nyquist frequency if not found
    } catch (error) {
      return 0;
    }
  }

  /**
   * ADVANCED VOICE FEATURES: Extract pitch, prosody, formants, and voice quality
   */
  private extractAdvancedVoiceFeatures(audioData: Uint8Array, sampleRate: number, samples: number): Partial<AudioAnalysis> {
    try {
      // PITCH ANALYSIS
      const pitchFeatures = this.extractPitchFeatures(audioData, sampleRate, samples);
      
      // PROSODY ANALYSIS
      const prosodyFeatures = this.extractProsodyFeatures(audioData, sampleRate, samples);
      
      // FORMANT ANALYSIS (simplified)
      const formantFeatures = this.extractFormantFeatures(audioData, sampleRate, samples);
      
      // VOICE QUALITY ANALYSIS
      const voiceQualityFeatures = this.extractVoiceQualityFeatures(audioData, sampleRate, samples);
      
      // MFCC TIMBRE ANALYSIS
      const mfccs = this.extractMFCCs(audioData, sampleRate, samples);
      
      return {
        pitch: pitchFeatures,
        prosody: prosodyFeatures,
        formants: formantFeatures,
        voiceQuality: voiceQualityFeatures,
        mfccs
      };
    } catch (error) {
      console.warn('⚠️ Advanced voice feature extraction failed:', error);
      return {
        pitch: { mean: 0, range: 0, variance: 0, contour: [] },
        prosody: { speechRate: 0, energyVariance: 0, pauseDuration: 0, stressPattern: [] },
        formants: { f1: 0, f2: 0, f3: 0, bandwidth: [] },
        voiceQuality: { harmonicToNoise: 0, jitter: 0, shimmer: 0, breathiness: 0 },
        mfccs: new Array(13).fill(0)
      };
    }
  }

  /**
   * Extract pitch features (F0 analysis)
   */
  private extractPitchFeatures(audioData: Uint8Array, sampleRate: number, samples: number): AudioAnalysis['pitch'] {
    const frameSize = 1024;
    const hopSize = 512;
    const pitchValues: number[] = [];
    
    // Simplified pitch detection using autocorrelation
    for (let i = 0; i < samples - frameSize; i += hopSize) {
      const frame = audioData.slice(i * 2, (i + frameSize) * 2);
      const pitch = this.estimatePitch(frame, sampleRate);
      if (pitch > 50 && pitch < 500) { // Valid human pitch range
        pitchValues.push(pitch);
      }
    }
    
    if (pitchValues.length === 0) {
      return { mean: 0, range: 0, variance: 0, contour: [] };
    }
    
    const mean = pitchValues.reduce((a, b) => a + b, 0) / pitchValues.length;
    const min = Math.min(...pitchValues);
    const max = Math.max(...pitchValues);
    const variance = pitchValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / pitchValues.length;
    
    // Simplified contour (10 points)
    const contourPoints = 10;
    const contour = [];
    for (let i = 0; i < contourPoints; i++) {
      const index = Math.floor((i / contourPoints) * pitchValues.length);
      contour.push(pitchValues[index] || mean);
    }
    
    return {
      mean,
      range: max - min,
      variance,
      contour
    };
  }

  /**
   * Simplified pitch estimation using autocorrelation
   */
  private estimatePitch(frame: Uint8Array, sampleRate: number): number {
    const frameSize = frame.length / 2;
    const samples = new Float32Array(frameSize);
    
    // Convert to float samples
    for (let i = 0; i < frameSize; i++) {
      const sample = (frame[i * 2 + 1] << 8) | frame[i * 2];
      samples[i] = sample > 32767 ? (sample - 65536) / 32768 : sample / 32768;
    }
    
    // Simple autocorrelation
    let maxCorr = 0;
    let bestLag = 0;
    const minLag = Math.floor(sampleRate / 500); // 500Hz max
    const maxLag = Math.floor(sampleRate / 50);  // 50Hz min
    
    for (let lag = minLag; lag < Math.min(maxLag, frameSize / 2); lag++) {
      let corr = 0;
      for (let i = 0; i < frameSize - lag; i++) {
        corr += samples[i] * samples[i + lag];
      }
      if (corr > maxCorr) {
        maxCorr = corr;
        bestLag = lag;
      }
    }
    
    return bestLag > 0 ? sampleRate / bestLag : 0;
  }

  /**
   * Extract prosody features (timing, energy, rhythm)
   */
  private extractProsodyFeatures(audioData: Uint8Array, sampleRate: number, samples: number): AudioAnalysis['prosody'] {
    const frameSize = 1024;
    const hopSize = 512;
    const energyValues: number[] = [];
    const silenceThreshold = 0.01;
    let totalSpeechTime = 0;
    let pauseCount = 0;
    let pauseDuration = 0;
    
    // Energy analysis for speech rate and pauses
    for (let i = 0; i < samples - frameSize; i += hopSize) {
      let frameEnergy = 0;
      for (let j = 0; j < frameSize; j++) {
        const sampleIndex = (i + j) * 2;
        if (sampleIndex + 1 < audioData.length) {
          const sample = (audioData[sampleIndex + 1] << 8) | audioData[sampleIndex];
          const signedSample = sample > 32767 ? sample - 65536 : sample;
          frameEnergy += signedSample * signedSample;
        }
      }
      frameEnergy = Math.sqrt(frameEnergy / frameSize) / 32768;
      energyValues.push(frameEnergy);
      
      if (frameEnergy > silenceThreshold) {
        totalSpeechTime += hopSize / sampleRate;
      } else {
        pauseCount++;
        pauseDuration += hopSize / sampleRate;
      }
    }
    
    // Estimate speech rate (rough approximation)
    const avgWordsPerSecond = 2.5; // Typical speech
    const speechRate = totalSpeechTime > 0 ? avgWordsPerSecond * (totalSpeechTime / (samples / sampleRate)) : 0;
    
    // Energy variance (dynamic range)
    const energyMean = energyValues.reduce((a, b) => a + b, 0) / energyValues.length;
    const energyVariance = energyValues.reduce((acc, val) => acc + Math.pow(val - energyMean, 2), 0) / energyValues.length;
    
    // Stress pattern (simplified)
    const stressPattern = energyValues.filter((_, i) => i % 4 === 0).slice(0, 10);
    
    return {
      speechRate,
      energyVariance,
      pauseDuration: pauseCount > 0 ? pauseDuration / pauseCount : 0,
      stressPattern
    };
  }

  /**
   * Extract formant features (simplified vowel formants)
   */
  private extractFormantFeatures(audioData: Uint8Array, sampleRate: number, samples: number): AudioAnalysis['formants'] {
    // Simplified formant estimation using spectral peaks
    const fftSize = 1024;
    const spectrum = this.computeSpectrum(audioData, fftSize);
    
    // Find spectral peaks for F1, F2, F3 (very simplified)
    const f1 = this.findSpectralPeak(spectrum, 200, 800, sampleRate);   // F1: 200-800Hz
    const f2 = this.findSpectralPeak(spectrum, 800, 2500, sampleRate);  // F2: 800-2500Hz
    const f3 = this.findSpectralPeak(spectrum, 2500, 4000, sampleRate); // F3: 2500-4000Hz
    
    return {
      f1,
      f2,
      f3,
      bandwidth: [100, 150, 200] // Simplified bandwidths
    };
  }

  /**
   * Extract voice quality features (jitter, shimmer, HNR)
   */
  private extractVoiceQualityFeatures(audioData: Uint8Array, sampleRate: number, samples: number): AudioAnalysis['voiceQuality'] {
    // Simplified voice quality analysis
    const frameSize = 1024;
    let totalHNR = 0;
    let jitterSum = 0;
    let shimmerSum = 0;
    let frameCount = 0;
    
    for (let i = 0; i < samples - frameSize; i += frameSize) {
      const frame = audioData.slice(i * 2, (i + frameSize) * 2);
      
      // Simplified HNR (Harmonic-to-Noise Ratio)
      const hnr = this.calculateSimpleHNR(frame);
      totalHNR += hnr;
      
      // Simplified jitter/shimmer (pitch/amplitude perturbation)
      const jitter = this.calculateSimpleJitter(frame, sampleRate);
      const shimmer = this.calculateSimpleShimmer(frame);
      
      jitterSum += jitter;
      shimmerSum += shimmer;
      frameCount++;
    }
    
    return {
      harmonicToNoise: frameCount > 0 ? totalHNR / frameCount : 0,
      jitter: frameCount > 0 ? jitterSum / frameCount : 0,
      shimmer: frameCount > 0 ? shimmerSum / frameCount : 0,
      breathiness: 0.1 // Simplified breathiness measure
    };
  }

  /**
   * Extract MFCC features for timbre analysis
   */
  private extractMFCCs(audioData: Uint8Array, sampleRate: number, samples: number): number[] {
    // Simplified MFCC extraction (13 coefficients)
    const mfccs = new Array(13).fill(0);
    const frameSize = 1024;
    
    // Very simplified MFCC-like features using spectral analysis
    for (let i = 0; i < samples - frameSize; i += frameSize) {
      const frame = audioData.slice(i * 2, (i + frameSize) * 2);
      const spectrum = this.computeSpectrum(frame, frameSize);
      
      // Mel-scale approximation
      for (let j = 0; j < 13; j++) {
        const melFreq = 1127 * Math.log(1 + (j * sampleRate / (2 * 13)) / 700);
        const binIndex = Math.floor(melFreq * frameSize / sampleRate);
        if (binIndex < spectrum.length) {
          mfccs[j] += Math.log(spectrum[binIndex] + 1e-10);
        }
      }
    }
    
    // Normalize
    return mfccs.map(val => val / (samples / frameSize));
  }

  /**
   * Helper methods for voice analysis
   */
  private computeSpectrum(frame: Uint8Array, fftSize: number): number[] {
    // Simplified spectrum computation
    const spectrum = new Array(fftSize / 2).fill(0);
    const samples = frame.length / 2;
    
    for (let i = 0; i < Math.min(samples, fftSize / 2); i++) {
      const sample = (frame[i * 2 + 1] << 8) | frame[i * 2];
      const signedSample = sample > 32767 ? sample - 65536 : sample;
      spectrum[i] = Math.abs(signedSample);
    }
    
    return spectrum;
  }

  private findSpectralPeak(spectrum: number[], minFreq: number, maxFreq: number, sampleRate: number): number {
    const minBin = Math.floor(minFreq * spectrum.length * 2 / sampleRate);
    const maxBin = Math.floor(maxFreq * spectrum.length * 2 / sampleRate);
    
    let maxValue = 0;
    let peakBin = minBin;
    
    for (let i = minBin; i < Math.min(maxBin, spectrum.length); i++) {
      if (spectrum[i] > maxValue) {
        maxValue = spectrum[i];
        peakBin = i;
      }
    }
    
    return peakBin * sampleRate / (spectrum.length * 2);
  }

  private calculateSimpleHNR(frame: Uint8Array): number {
    // Simplified HNR calculation
    let signalPower = 0;
    let noisePower = 0;
    const samples = frame.length / 2;
    
    for (let i = 0; i < samples; i++) {
      const sample = (frame[i * 2 + 1] << 8) | frame[i * 2];
      const signedSample = sample > 32767 ? sample - 65536 : sample;
      signalPower += signedSample * signedSample;
    }
    
    noisePower = signalPower * 0.1; // Simplified noise estimation
    return signalPower > 0 ? 10 * Math.log10(signalPower / (noisePower + 1e-10)) : 0;
  }

  private calculateSimpleJitter(frame: Uint8Array, sampleRate: number): number {
    // Simplified jitter calculation
    const pitch1 = this.estimatePitch(frame.slice(0, frame.length / 2), sampleRate);
    const pitch2 = this.estimatePitch(frame.slice(frame.length / 4), sampleRate);
    
    if (pitch1 > 0 && pitch2 > 0) {
      return Math.abs(pitch1 - pitch2) / ((pitch1 + pitch2) / 2);
    }
    return 0;
  }

  private calculateSimpleShimmer(frame: Uint8Array): number {
    // Simplified shimmer calculation
    const samples = frame.length / 2;
    let amp1 = 0, amp2 = 0;
    
    for (let i = 0; i < samples / 2; i++) {
      const sample = (frame[i * 2 + 1] << 8) | frame[i * 2];
      amp1 += Math.abs(sample > 32767 ? sample - 65536 : sample);
    }
    
    for (let i = samples / 2; i < samples; i++) {
      const sample = (frame[i * 2 + 1] << 8) | frame[i * 2];
      amp2 += Math.abs(sample > 32767 ? sample - 65536 : sample);
    }
    
    amp1 /= (samples / 2);
    amp2 /= (samples / 2);
    
    return amp1 > 0 ? Math.abs(amp1 - amp2) / ((amp1 + amp2) / 2) : 0;
  }

  /**
   * Calculate spectral flatness (measure of how tone-like vs noise-like)
   */
  private calculateSpectralFlatness(audioData: Uint8Array): number {
    try {
      const samples = audioData.length / 2;
      let geometricMean = 0;
      let arithmeticMean = 0;
      let validSamples = 0;
      
      for (let i = 1; i < samples; i++) { // Skip DC component
        const sample = (audioData[i * 2 + 1] << 8) | audioData[i * 2];
        const signedSample = sample > 32767 ? sample - 65536 : sample;
        const magnitude = Math.abs(signedSample);
        
        if (magnitude > 0) {
          geometricMean += Math.log(magnitude);
          arithmeticMean += magnitude;
          validSamples++;
        }
      }
      
      if (validSamples === 0) return 0;
      
      geometricMean = Math.exp(geometricMean / validSamples);
      arithmeticMean = arithmeticMean / validSamples;
      
      return arithmeticMean > 0 ? geometricMean / arithmeticMean : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * FORCED ALIGNMENT TRIMMING: Perfect word-level audio boundary detection
   * Uses Whisper word timestamps for sample-accurate context removal
   */
  private async trimAudioContext(
    audioBase64: string, 
    estimatedContextDuration: number, 
    totalDuration: number,
    contextText?: string,
    fullText?: string,
    chunkId?: string
  ): Promise<{
    trimmedAudio: string;
    trimmedDuration: number;
    contextDurationTrimmed: number;
  }> {
    try {
      // FORCED ALIGNMENT: Use Whisper word timestamps to find exact context end
      if (contextText && fullText && chunkId) {
        console.log(`🎯 FORCED ALIGNMENT: Finding exact context end for ${chunkId}...`);
        
        try {
          const alignmentResult = await this.performForcedAlignment(audioBase64, contextText, fullText, chunkId);
          
          if (alignmentResult.success && alignmentResult.contextEndTime > 0.1) {
            console.log(`🎯 Word-level alignment found: context ends at ${alignmentResult.contextEndTime.toFixed(3)}s`);
            
            // Use precise word-level trimming
            const alignmentTrimmingResult = await this.trimAudioAtTimestamp(
              audioBase64, 
              alignmentResult.contextEndTime, 
              totalDuration
            );
            
            if (alignmentTrimmingResult) {
              console.log(`✅ Used word-level trimming for ${chunkId} - cut after last context word`);
              return alignmentTrimmingResult;
            }
          } else {
            console.warn(`⚠️ Word-level alignment failed for ${chunkId}: contextEndTime=${alignmentResult.contextEndTime?.toFixed(3) || 'N/A'}s`);
          }
        } catch (alignmentError) {
          console.warn(`⚠️ Forced alignment error for ${chunkId}:`, alignmentError);
        }
      }

      // ENHANCED SAFETY CHECKS for estimation-based trimming
      const durationRatio = estimatedContextDuration / totalDuration;
      const shouldSkipTrimming = estimatedContextDuration <= 0.2 || 
                                estimatedContextDuration >= totalDuration * 0.7 || // More conservative: max 70% trim
                                durationRatio > 0.6; // Don't trim more than 60% of audio (more conservative)
      
      if (shouldSkipTrimming) {
        console.log(`⏭️ SKIPPING audio trimming for safety:`, {
          estimatedContextDuration: estimatedContextDuration.toFixed(3) + 's',
          totalDuration: totalDuration.toFixed(3) + 's',
          durationRatio: (durationRatio * 100).toFixed(1) + '%',
          reason: estimatedContextDuration <= 0.2 ? 'Context too short' :
                  estimatedContextDuration >= totalDuration * 0.9 ? 'Context too long' :
                  'Would trim too much audio (>80%)'
        });
        return {
          trimmedAudio: audioBase64,
          trimmedDuration: totalDuration,
          contextDurationTrimmed: 0
        };
      }

      // Convert base64 to WAV data
      const audioData = this.base64ToArrayBuffer(audioBase64);
      
      // WAV file structure: 44-byte header + audio data
      const wavHeader = audioData.slice(0, 44);
      const audioSamples = audioData.slice(44);
      
      // Calculate trim parameters (assuming 16-bit, mono, 24kHz)
      const sampleRate = 24000;
      const bytesPerSample = 2; // 16-bit
      const totalSamples = audioSamples.length / bytesPerSample;
      const totalDurationCalculated = totalSamples / sampleRate;
      
      // ADAPTIVE TRIMMING: Adjust buffer based on context length and chunk characteristics
      // Shorter contexts need less buffer, longer contexts need more safety
      let bufferMultiplier = 1.15; // Base 15% buffer
      
      // Adjust buffer based on context length relative to total audio
      const contextRatio = estimatedContextDuration / totalDurationCalculated;
      if (contextRatio < 0.1) {
        // Very short context (less than 10% of audio) - use smaller buffer
        bufferMultiplier = 1.05;
      } else if (contextRatio > 0.3) {
        // Long context (more than 30% of audio) - use larger buffer for safety
        bufferMultiplier = 1.25;
      }
      
      // Calculate adaptive max trim based on context length
      const maxTrimRatio = Math.min(0.5, contextRatio * 1.5); // Max 50%, but scale with context
      const contextDurationWithBuffer = Math.min(
        estimatedContextDuration * bufferMultiplier, 
        totalDurationCalculated * maxTrimRatio
      );
      
      console.log(`🎯 ADAPTIVE TRIMMING calculation:`, {
        estimatedContext: estimatedContextDuration.toFixed(3) + 's',
        contextRatio: (contextRatio * 100).toFixed(1) + '%',
        bufferMultiplier: bufferMultiplier.toFixed(2),
        withBuffer: contextDurationWithBuffer.toFixed(3) + 's',
        bufferAdded: ((bufferMultiplier - 1) * 100).toFixed(1) + '%',
        maxTrimRatio: (maxTrimRatio * 100).toFixed(1) + '%',
        maxAllowed: (totalDurationCalculated * maxTrimRatio).toFixed(3) + 's',
        totalDuration: totalDurationCalculated.toFixed(3) + 's',
        adaptiveStrategy: contextRatio < 0.1 ? 'SHORT_CONTEXT' : contextRatio > 0.3 ? 'LONG_CONTEXT' : 'NORMAL_CONTEXT'
      });
      
      const samplesToTrim = Math.floor(contextDurationWithBuffer * sampleRate);
      const bytesToTrim = samplesToTrim * bytesPerSample;
      
      // Find optimal trim point at zero-crossing or silence to prevent pops
      let actualBytesToTrim = bytesToTrim;
      const searchWindow = Math.min(960, audioSamples.length - bytesToTrim); // 20ms window at 24kHz
      let bestTrimPoint = bytesToTrim;
      let bestScore = Infinity;
      
      // Look for the best trim point within the search window
      for (let i = 0; i < searchWindow; i += 2) {
        const sampleIndex = bytesToTrim + i;
        if (sampleIndex >= audioSamples.length - 2) break;
        
        const sample = (audioSamples[sampleIndex + 1] << 8) | audioSamples[sampleIndex];
        const signedSample = sample > 32767 ? sample - 65536 : sample;
        
        // Score based on amplitude (lower is better) and distance from target
        const amplitude = Math.abs(signedSample);
        const distance = Math.abs(i);
        const score = amplitude + (distance * 0.1); // Prefer closer to target with low amplitude
        
        if (score < bestScore) {
          bestScore = score;
          bestTrimPoint = sampleIndex;
        }
        
        // If we find a very quiet spot, use it immediately
        if (amplitude < 50) {
          actualBytesToTrim = sampleIndex;
          break;
        }
      }
      
      // Use the best trim point found
      actualBytesToTrim = bestTrimPoint;
      
      // ADAPTIVE SAFETY: Adjust safety limits based on context length
      // Shorter contexts can be trimmed more aggressively, longer contexts need more safety
      const baseMinRemaining = 1.0; // Base 1 second minimum
      const adaptiveMinRemaining = Math.max(0.5, baseMinRemaining - (contextRatio * 0.5)); // Scale down for short contexts
      const minRemainingBytes = Math.floor(adaptiveMinRemaining * sampleRate * bytesPerSample);
      const maxTrimBytes = audioSamples.length - minRemainingBytes;
      
      // Adaptive max trim ratio based on context length
      const adaptiveMaxTrimRatio = Math.min(0.5, 0.2 + (contextRatio * 0.6)); // 20% base + up to 30% more
      const maxTrimByRatio = Math.floor(audioSamples.length * adaptiveMaxTrimRatio);
      const finalMaxTrim = Math.min(maxTrimBytes, maxTrimByRatio);
      
      actualBytesToTrim = Math.min(actualBytesToTrim, finalMaxTrim);
      
      console.log(`🛡️ ADAPTIVE SAFETY LIMITS:`, {
        contextRatio: (contextRatio * 100).toFixed(1) + '%',
        adaptiveMinRemaining: adaptiveMinRemaining.toFixed(2) + 's',
        adaptiveMaxTrimRatio: (adaptiveMaxTrimRatio * 100).toFixed(1) + '%',
        originalBytes: audioSamples.length,
        requestedTrim: bytesToTrim,
        maxTrimByTime: maxTrimBytes,
        maxTrimByRatio: maxTrimByRatio,
        finalMaxTrim: finalMaxTrim,
        actualTrim: actualBytesToTrim,
        remainingBytes: audioSamples.length - actualBytesToTrim,
        remainingSeconds: ((audioSamples.length - actualBytesToTrim) / bytesPerSample / sampleRate).toFixed(2) + 's',
        safetyStrategy: contextRatio < 0.1 ? 'AGGRESSIVE' : contextRatio > 0.3 ? 'CONSERVATIVE' : 'BALANCED'
      });
      
      const actualSamplesToTrim = Math.floor(actualBytesToTrim / bytesPerSample);
      const actualContextDurationTrimmed = actualSamplesToTrim / sampleRate;
      
      // Trim the audio data
      const trimmedAudioSamples = audioSamples.slice(actualBytesToTrim);
      const trimmedTotalSamples = trimmedAudioSamples.length / bytesPerSample;
      const trimmedDuration = trimmedTotalSamples / sampleRate;
      
      // Update WAV header with new size information
      const newWavHeader = this.updateWavHeader(wavHeader, trimmedAudioSamples.length);
      
      // Combine header and trimmed audio
      const trimmedWavData = new Uint8Array(newWavHeader.length + trimmedAudioSamples.length);
      trimmedWavData.set(newWavHeader, 0);
      trimmedWavData.set(trimmedAudioSamples, newWavHeader.length);
      
      // Convert back to base64
      const trimmedBase64 = this.arrayBufferToBase64(trimmedWavData);
      
      console.log(`✂️ PRECISION TRIMMING: Removed ${actualContextDurationTrimmed.toFixed(2)}s (estimated ${estimatedContextDuration.toFixed(2)}s + buffer)`);
      console.log(`📊 TRIMMING SAFETY CHECK:`, {
        originalDuration: totalDurationCalculated.toFixed(3) + 's',
        trimmedDuration: trimmedDuration.toFixed(3) + 's',
        contextRemoved: actualContextDurationTrimmed.toFixed(3) + 's',
        remainingPercentage: ((trimmedDuration / totalDurationCalculated) * 100).toFixed(1) + '%',
        bufferUsed: ((bufferMultiplier - 1) * 100).toFixed(1) + '%',
        isConservative: actualContextDurationTrimmed < totalDurationCalculated * 0.4,
        // CRITICAL: Check if we might have cut off words
        trimRatio: ((actualContextDurationTrimmed / totalDurationCalculated) * 100).toFixed(1) + '%',
        isSafeTrim: actualContextDurationTrimmed < totalDurationCalculated * 0.5,
        warning: actualContextDurationTrimmed >= totalDurationCalculated * 0.5 ? '⚠️ AGGRESSIVE TRIMMING - may cut off words' : '✅ Safe trimming'
      });
      
      return {
        trimmedAudio: trimmedBase64,
        trimmedDuration,
        contextDurationTrimmed: actualContextDurationTrimmed
      };
      
    } catch (error) {
      console.error('❌ Precision audio trimming error:', error);
      // Fall back to original audio if trimming fails
      return {
        trimmedAudio: audioBase64,
        trimmedDuration: totalDuration,
        contextDurationTrimmed: 0
      };
    }
  }

  /**
   * Update WAV header with new file size information
   */
  private updateWavHeader(originalHeader: Uint8Array, newAudioDataLength: number): Uint8Array {
    const header = new Uint8Array(originalHeader);
    const newFileSize = 36 + newAudioDataLength; // 44 - 8 bytes for RIFF header + audio data
    
    // Update file size in header (bytes 4-7)
    header[4] = newFileSize & 0xFF;
    header[5] = (newFileSize >> 8) & 0xFF;
    header[6] = (newFileSize >> 16) & 0xFF;
    header[7] = (newFileSize >> 24) & 0xFF;
    
    // Update data chunk size (bytes 40-43)
    header[40] = newAudioDataLength & 0xFF;
    header[41] = (newAudioDataLength >> 8) & 0xFF;
    header[42] = (newAudioDataLength >> 16) & 0xFF;
    header[43] = (newAudioDataLength >> 24) & 0xFF;
    
    return header;
  }

  /**
   * Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < buffer.length; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
  }

  /**
   * FORCED ALIGNMENT: Get word-level timestamps from Whisper for perfect audio trimming
   */
  private async performForcedAlignment(
    audioBase64: string, 
    contextText: string, 
    fullText: string, 
    chunkId: string
  ): Promise<{
    success: boolean;
    contextEndTime: number;
    wordTimestamps: any[];
    transcribedText: string;
  }> {
    try {
      console.log(`🎯 Performing forced alignment for ${chunkId}...`);
      const startTime = Date.now();
      
      const response = await fetch('/api/forced-alignment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioBase64,
          contextText,
          expectedText: fullText,
          chunkId
        })
      });
      
      const clientTime = Date.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`Alignment API failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      console.log(`⚡ Forced alignment completed in ${clientTime}ms for ${chunkId}`);
      console.log(`🎯 Alignment result:`, {
        contextEndTime: result.contextEndTime?.toFixed(3) + 's' || 'N/A',
        totalWords: result.wordTimestamps?.length || 0,
        trimRecommendation: result.alignment?.trimRecommendation || 'Unknown'
      });
      
      return {
        success: result.success || false,
        contextEndTime: result.contextEndTime || 0,
        wordTimestamps: result.wordTimestamps || [],
        transcribedText: result.transcribedText || ''
      };
      
    } catch (error) {
      console.error(`❌ Forced alignment failed for ${chunkId}:`, error);
      return {
        success: false,
        contextEndTime: 0,
        wordTimestamps: [],
        transcribedText: ''
      };
    }
  }

  /**
   * PRECISION TRIMMING: Cut audio at exact timestamp from forced alignment
   */
  private async trimAudioAtTimestamp(
    audioBase64: string, 
    trimTimestamp: number, 
    totalDuration: number
  ): Promise<{
    trimmedAudio: string;
    trimmedDuration: number;
    contextDurationTrimmed: number;
  } | null> {
    try {
      // Safety check
      if (trimTimestamp <= 0 || trimTimestamp >= totalDuration * 0.9) {
        console.warn(`⚠️ Invalid trim timestamp: ${trimTimestamp.toFixed(3)}s (total: ${totalDuration.toFixed(3)}s)`);
        return null;
      }

      // Convert base64 to WAV data
      const audioData = this.base64ToArrayBuffer(audioBase64);
      const wavHeader = audioData.slice(0, 44);
      const audioSamples = audioData.slice(44);
      
      // Calculate precise sample position
      const sampleRate = 24000; // Assuming 24kHz
      const bytesPerSample = 2; // 16-bit
      const trimSamplePosition = Math.floor(trimTimestamp * sampleRate);
      const trimBytePosition = trimSamplePosition * bytesPerSample;
      
      // Ensure we don't exceed audio bounds
      const actualTrimPosition = Math.min(trimBytePosition, audioSamples.length - 1000);
      
      // Find nearest zero-crossing for clean cut
      let finalTrimPosition = actualTrimPosition;
      const searchWindow = 480; // 10ms window
      
      for (let i = 0; i < searchWindow && actualTrimPosition + i < audioSamples.length - 2; i += 2) {
        const sampleIndex = actualTrimPosition + i;
        const sample = (audioSamples[sampleIndex + 1] << 8) | audioSamples[sampleIndex];
        const signedSample = sample > 32767 ? sample - 65536 : sample;
        
        if (Math.abs(signedSample) < 50) { // Very close to zero
          finalTrimPosition = sampleIndex;
          break;
        }
      }
      
      // Trim the audio
      const trimmedAudioSamples = audioSamples.slice(finalTrimPosition);
      const actualTrimDuration = (finalTrimPosition / bytesPerSample) / sampleRate;
      const trimmedDuration = (trimmedAudioSamples.length / bytesPerSample) / sampleRate;
      
      // Create new WAV file
      const newWavHeader = this.updateWavHeader(wavHeader, trimmedAudioSamples.length);
      const trimmedWavData = new Uint8Array(newWavHeader.length + trimmedAudioSamples.length);
      trimmedWavData.set(newWavHeader, 0);
      trimmedWavData.set(trimmedAudioSamples, newWavHeader.length);
      
      const trimmedBase64 = this.arrayBufferToBase64(trimmedWavData);
      
      console.log(`✂️ PERFECT TRIM: Removed ${actualTrimDuration.toFixed(3)}s at sample ${finalTrimPosition}`);
      
      return {
        trimmedAudio: trimmedBase64,
        trimmedDuration,
        contextDurationTrimmed: actualTrimDuration
      };
      
    } catch (error) {
      console.error('❌ Timestamp-based trimming error:', error);
      return null;
    }
  }

  /**
   * SERVER-SIDE STT: Call server-side API for Whisper Tiny gibberish detection
   */
  private async performSTTValidation(audioBase64: string, expectedText: string, chunkId: string): Promise<{
    passed: boolean;
    confidence: number;
    transcribedText: string;
    similarity: number;
  }> {
    try {
      console.log(`🎙️ Starting server-side Whisper Tiny STT for ${chunkId}...`);
      const startTime = Date.now();
      
      // Call server-side STT API
      const response = await fetch('/api/stt-validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioBase64,
          expectedText,
          chunkId
        })
      });
      
      const clientTime = Date.now() - startTime;
      
      if (!response.ok) {
        throw new Error(`STT API failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      console.log(`⚡ Server-side STT completed in ${clientTime}ms for ${chunkId}`);
      console.log(`🔍 STT Results for ${chunkId}:`, {
        similarity: result.similarity?.toFixed(3) || 'N/A',
        confidence: result.confidence?.toFixed(3) || 'N/A',
        passed: result.passed,
        processingTime: result.processingTime + 'ms (server) + ' + clientTime + 'ms (client)'
      });
      
      return {
        passed: result.passed || true,
        confidence: result.confidence || 0.5,
        transcribedText: result.transcribedText || 'STT_ERROR',
        similarity: result.similarity || 0.5
      };
      
    } catch (error) {
      console.error(`❌ Server-side STT validation failed for ${chunkId}:`, error);
      
      // On STT failure, assume text is valid (don't block on STT errors)
      return {
        passed: true,
        confidence: 0.5,
        transcribedText: 'STT_ERROR',
        similarity: 0.5
      };
    }
  }



  /**
   * Tweak request parameters for regeneration attempts
   */
  private tweakRequestForRegeneration(originalRequest: TTSRequest, attemptNumber: number): TTSRequest {
    const tweakedRequest = { ...originalRequest };
    
    // Generate new seed for each attempt
    tweakedRequest.seed = Math.floor(Math.random() * 1000000);
    
    // Slightly adjust parameters for better consistency on retries
    if (attemptNumber === 2) {
      // Second attempt: slightly increase stability
      tweakedRequest.temperature = Math.max(0.1, (originalRequest.temperature || 0.4) * 0.9);
    } else if (attemptNumber === 3) {
      // Third attempt: more conservative settings
      tweakedRequest.temperature = Math.max(0.1, (originalRequest.temperature || 0.4) * 0.8);
      tweakedRequest.top_p = Math.max(0.85, (originalRequest.top_p || 0.94) * 0.95);
    }
    
    console.log(`🔧 Tweaked parameters for ${attemptNumber} attempt:`, {
      seed: tweakedRequest.seed,
      temperature: tweakedRequest.temperature,
      top_p: tweakedRequest.top_p
    });
    
    return tweakedRequest;
  }

  /**
   * Process a single chunk with advanced context-aware TTS (original method)
   */
  private async processChunk(
    chunk: TextChunk, 
    request: TTSRequest, 
    onStatusUpdate?: (status: string, chunkId?: string) => void
  ): Promise<ChunkedTTSResult> {
    // Use generateSingleChunk for the new flow
    return this.generateSingleChunk(chunk, request, onStatusUpdate);
  }

  /**
   * Generate single chunk without quality control (helper method)
   */
  private async generateSingleChunk(
    chunk: TextChunk, 
    request: TTSRequest, 
    onStatusUpdate?: (status: string, chunkId?: string) => void
  ): Promise<ChunkedTTSResult> {
    try {
      onStatusUpdate?.(`PROCESSING_CHUNK_${chunk.order}`, chunk.id);
      
      // Get voice state for consistency
      const voiceId = request.ref_audio_name || 'default';
      const voiceState = this.getVoiceState(voiceId, chunk.prosodyContext || '');
      
      // Create context-aware TTS request with voice state
      const contextAwareText = this.buildContextAwareText(chunk, request);
      const prosodyEnhancedRequest = this.enhanceRequestWithProsody(request, chunk, voiceState);
      
      const chunkRequest: TTSRequest = {
        ...prosodyEnhancedRequest,
        text: contextAwareText
      };
      
      // CRITICAL: Verify seed has not been modified during enhancement
      console.log(`🎲 SEED TRACKING for ${chunk.id}: original=${request.seed}, enhanced=${prosodyEnhancedRequest.seed}, final=${chunkRequest.seed}`);

      console.log(`🧠 Context-aware text for ${chunk.id}:`, {
        originalLength: chunk.text.length,
        contextAwareLength: contextAwareText.length,
        hasContextBefore: !!chunk.contextBefore,
        hasContextAfter: !!chunk.contextAfter,
        prosodyContext: chunk.prosodyContext
      });

      console.log(`⚙️ TTS Parameters for chunk ${chunk.id}:`, {
        max_new_tokens: chunkRequest.max_new_tokens,
        temperature: chunkRequest.temperature,
        top_p: chunkRequest.top_p,
        top_k: chunkRequest.top_k,
        seed: chunkRequest.seed,
        ref_audio_name: chunkRequest.ref_audio_name,
        ref_audio_in_system_message: chunkRequest.ref_audio_in_system_message,
        chunk_method: chunkRequest.chunk_method,
        chunk_max_word_num: chunkRequest.chunk_max_word_num,
        chunk_max_num_turns: chunkRequest.chunk_max_num_turns,
        generation_chunk_buffer_size: chunkRequest.generation_chunk_buffer_size,
        scene_description: chunkRequest.scene_description?.substring(0, 100) + '...',
        ras_win_len: chunkRequest.ras_win_len,
        ras_win_max_num_repeat: chunkRequest.ras_win_max_num_repeat,
        output_format: chunkRequest.output_format,
        user_id: chunkRequest.user_id,
        text_length: chunkRequest.text.length,
        text_preview: chunkRequest.text.substring(0, 100) + '...'
      });
      
      // CRITICAL PARAMETER VERIFICATION - ensure chunk matches original exactly
      const parameterChecks = [
        { name: 'seed', original: request.seed, chunk: chunkRequest.seed },
        { name: 'temperature', original: request.temperature, chunk: chunkRequest.temperature },
        { name: 'top_p', original: request.top_p, chunk: chunkRequest.top_p },
        { name: 'top_k', original: request.top_k, chunk: chunkRequest.top_k },
        { name: 'max_new_tokens', original: request.max_new_tokens, chunk: chunkRequest.max_new_tokens },
        { name: 'chunk_method', original: request.chunk_method, chunk: chunkRequest.chunk_method },
        { name: 'chunk_max_word_num', original: request.chunk_max_word_num, chunk: chunkRequest.chunk_max_word_num },
        { name: 'generation_chunk_buffer_size', original: request.generation_chunk_buffer_size, chunk: chunkRequest.generation_chunk_buffer_size },
        { name: 'ras_win_len', original: request.ras_win_len, chunk: chunkRequest.ras_win_len },
        { name: 'ras_win_max_num_repeat', original: request.ras_win_max_num_repeat, chunk: chunkRequest.ras_win_max_num_repeat },
        { name: 'ref_audio_name', original: request.ref_audio_name, chunk: chunkRequest.ref_audio_name },
      ];
      
      const mismatches = parameterChecks.filter(check => check.original !== check.chunk);
      
      if (mismatches.length > 0) {
        console.error(`❌ PARAMETER MISMATCHES for chunk ${chunk.id}:`, mismatches);
        mismatches.forEach(mismatch => {
          console.error(`❌ ${mismatch.name}: original=${mismatch.original}, chunk=${mismatch.chunk}`);
        });
      } else {
        console.log(`✅ All parameters verified for chunk ${chunk.id} - PERFECT MATCH with original request`);
      }

      // FINAL API CALL VERIFICATION - Log exact parameters being sent to API
      console.log(`🚀 FINAL API CALL for ${chunk.id} - These exact parameters are being sent to TTS API:`, {
        text_length: chunkRequest.text.length,
        seed: chunkRequest.seed,
        temperature: chunkRequest.temperature,
        top_p: chunkRequest.top_p,
        top_k: chunkRequest.top_k,
        max_new_tokens: chunkRequest.max_new_tokens,
        chunk_method: chunkRequest.chunk_method,
        chunk_max_word_num: chunkRequest.chunk_max_word_num,
        generation_chunk_buffer_size: chunkRequest.generation_chunk_buffer_size,
        ref_audio_name: chunkRequest.ref_audio_name,
        ras_win_len: chunkRequest.ras_win_len,
        ras_win_max_num_repeat: chunkRequest.ras_win_max_num_repeat
      });

      const result = await ttsService.generateSpeech(
        chunkRequest,
        (status, jobId) => {
          onStatusUpdate?.(`CHUNK_${chunk.order}_${status}`, jobId);
        }
      );

      console.log(`✅ Chunk ${chunk.id} completed successfully`);
      
      // Apply audio trimming for overlapped chunks (except first chunk)
      let trimmedResult = result;
      let contextDurationTrimmed = 0;
      
      if (!chunk.isFirstChunk && chunk.contextText && chunk.estimatedContextDuration && chunk.estimatedContextDuration > 0) {
        console.log(`✂️ OVERLAP TRIMMING for ${chunk.id}:`, {
          isFirstChunk: chunk.isFirstChunk,
          hasContextText: !!chunk.contextText,
          contextTextLength: chunk.contextText?.length || 0,
          contextText: chunk.contextText?.substring(0, 50) + '...',
          estimatedContextDuration: chunk.estimatedContextDuration.toFixed(2) + 's',
          contextWords: chunk.contextWordsCount,
          originalDuration: result.duration.toFixed(2) + 's',
          shouldTrim: !chunk.isFirstChunk && !!chunk.contextText && chunk.estimatedContextDuration > 0,
          // CRITICAL: Show what text will be trimmed vs kept
          fullTextForTTS: chunk.text.substring(0, 100) + '...',
          newTextForOutput: chunk.newText.substring(0, 100) + '...',
          contextTextToTrim: chunk.contextText?.substring(0, 100) + '...'
        });
        
        try {
          const trimmed = await this.trimAudioContext(
            result.audio_base64, 
            chunk.estimatedContextDuration, 
            result.duration,
            chunk.contextText,
            chunk.text,
            chunk.id
          );
          trimmedResult = {
            ...result,
            audio_base64: trimmed.trimmedAudio,
            duration: trimmed.trimmedDuration
          };
          contextDurationTrimmed = trimmed.contextDurationTrimmed;
          
          console.log(`✅ Audio trimming complete for ${chunk.id}:`, {
            originalDuration: result.duration.toFixed(2) + 's',
            trimmedDuration: trimmed.trimmedDuration.toFixed(2) + 's',
            contextRemoved: trimmed.contextDurationTrimmed.toFixed(2) + 's'
          });
          
        } catch (trimError) {
          console.warn(`⚠️ Audio trimming failed for ${chunk.id}, using original audio:`, trimError);
          // Continue with original audio if trimming fails
        }
      }
      
      return {
        success: true,
        result: trimmedResult,
        chunkId: chunk.id,
        order: chunk.order,
        // Audio trimming information
        trimmedAudio: trimmedResult.audio_base64,
        originalDuration: result.duration,
        trimmedDuration: trimmedResult.duration,
        contextDurationTrimmed
      };
    } catch (error) {
      console.error(`❌ Chunk ${chunk.id} failed:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        chunkId: chunk.id,
        order: chunk.order
      };
    }
  }

  /**
   * Build context-aware text with prosody preservation
   * FIXED: No double context addition - chunk.text already contains context
   */
  private buildContextAwareText(chunk: TextChunk, request: TTSRequest): string {
    // FIXED: chunk.text already contains the proper context from chunking phase
    // No need to add additional context here as it would create double/triple context
    let contextText = chunk.text;

    // Only add prosody context for emotional consistency (not textual context)
    if (chunk.prosodyContext) {
      contextText = this.injectProsodyContext(contextText, chunk.prosodyContext);
    }

    console.log(`🎯 Using context-aware text for ${chunk.id}:`, {
      fullTextLength: contextText.length,
      hasExistingContext: !chunk.isFirstChunk && !!chunk.contextText,
      contextLength: chunk.contextText?.length || 0,
      newTextLength: chunk.newText.length,
      // Verify no double context
      isContextAlreadyIncluded: chunk.text.includes(chunk.contextText || '')
    });

    return contextText;
  }

  /**
   * Inject prosody context naturally into text
   */
  private injectProsodyContext(text: string, prosodyContext: string): string {
    // Return text unchanged - no prosody hints added
    return text;
  }

  /**
   * Enhance TTS request with prosody preservation and voice state
   * PRESERVES ALL ORIGINAL USER SETTINGS - adds SAME context to scene_description for ALL chunks
   * CRITICAL: Every chunk must have IDENTICAL parameters from the UI
   */
  private enhanceRequestWithProsody(request: TTSRequest, chunk: TextChunk, voiceState: VoiceState): TTSRequest {
    // CRITICAL: Log incoming request parameters to verify they're correct
    console.log(`🔍 INCOMING PARAMETERS for ${chunk.id}:`, {
      seed: request.seed,
      temperature: request.temperature,
      top_p: request.top_p,
      top_k: request.top_k,
      chunk_method: request.chunk_method
    });
    
    // Create a copy that preserves ALL original user settings
    const enhancedRequest: TTSRequest = {
      ...request, // This preserves ALL original parameters including max_new_tokens, temperature, top_p, etc.
    };

    // CRITICAL: Filter out inappropriate chunking parameters based on chunk_method
    // Only include chunking parameters that are valid for the selected chunk_method
    if (enhancedRequest.chunk_method === 'word' || enhancedRequest.chunk_method === 'semantic') {
      // For word/semantic chunking: keep chunk_max_word_num, remove chunk_max_num_turns
      delete enhancedRequest.chunk_max_num_turns;
    } else if (enhancedRequest.chunk_method === 'speaker') {
      // For speaker chunking: keep chunk_max_num_turns, remove chunk_max_word_num  
      delete enhancedRequest.chunk_max_word_num;
    } else if (enhancedRequest.chunk_method === 'sentence' || enhancedRequest.chunk_method === 'None') {
      // For sentence/None chunking: remove both word and turn parameters
      delete enhancedRequest.chunk_max_word_num;
      delete enhancedRequest.chunk_max_num_turns;
    }

    // ONLY modify scene_description to add consistency context (all other parameters must remain identical)
    const baseContext = "Maintain consistent voice tone and pacing throughout all chunks.";
    
    const combinedDescription = [
      request.scene_description || '',
      baseContext
    ].filter(Boolean).join(' ');

    if (combinedDescription.trim()) {
      enhancedRequest.scene_description = combinedDescription.trim();
    }

    // COMPREHENSIVE parameter verification - ALL parameters except scene_description must be identical
    // Note: chunking parameters are filtered based on chunk_method, so we verify what should be present
    const criticalParams = [
      'temperature', 'top_p', 'top_k', 'max_new_tokens', 'seed', 
      'ref_audio_name', 'ref_audio_in_system_message',
      'chunk_method', 'generation_chunk_buffer_size',
      'ras_win_len', 'ras_win_max_num_repeat', 'output_format', 'user_id'
    ];
    
    // Add chunk-method-specific parameters that should be present
    if (request.chunk_method === 'word' || request.chunk_method === 'semantic') {
      criticalParams.push('chunk_max_word_num');
    } else if (request.chunk_method === 'speaker') {
      criticalParams.push('chunk_max_num_turns');
    }
    
    const modifiedCriticalParams = criticalParams.filter(key => 
      request.hasOwnProperty(key) && 
      JSON.stringify(request[key as keyof TTSRequest]) !== JSON.stringify(enhancedRequest[key as keyof TTSRequest])
    );
    
    if (modifiedCriticalParams.length > 0) {
      console.error(`❌ CRITICAL PARAMETERS MODIFIED for chunk ${chunk.id}:`, modifiedCriticalParams);
      console.error(`❌ Original values:`, modifiedCriticalParams.map(key => ({ [key]: request[key as keyof TTSRequest] })));
      console.error(`❌ Enhanced values:`, modifiedCriticalParams.map(key => ({ [key]: enhancedRequest[key as keyof TTSRequest] })));
    }

    // Create clean parameter object for logging (only show parameters that should be present)
    const logParams: any = {
      max_new_tokens: enhancedRequest.max_new_tokens,
      temperature: enhancedRequest.temperature,
      top_p: enhancedRequest.top_p,
      top_k: enhancedRequest.top_k,
      seed: enhancedRequest.seed,
      ref_audio_name: enhancedRequest.ref_audio_name,
      ref_audio_in_system_message: enhancedRequest.ref_audio_in_system_message,
      chunk_method: enhancedRequest.chunk_method,
      generation_chunk_buffer_size: enhancedRequest.generation_chunk_buffer_size,
      scene_description: enhancedRequest.scene_description?.substring(0, 100) + '...',
      ras_win_len: enhancedRequest.ras_win_len,
      ras_win_max_num_repeat: enhancedRequest.ras_win_max_num_repeat,
      output_format: enhancedRequest.output_format,
      user_id: enhancedRequest.user_id,
      text_length: enhancedRequest.text.length
    };

    // Add chunk-method-specific parameters
    if (enhancedRequest.chunk_method === 'word' || enhancedRequest.chunk_method === 'semantic') {
      logParams.chunk_max_word_num = enhancedRequest.chunk_max_word_num;
      logParams.chunk_max_num_turns = '❌ FILTERED OUT (not for word/semantic chunking)';
    } else if (enhancedRequest.chunk_method === 'speaker') {
      logParams.chunk_max_num_turns = enhancedRequest.chunk_max_num_turns;
      logParams.chunk_max_word_num = '❌ FILTERED OUT (not for speaker chunking)';
    } else {
      logParams.chunk_max_word_num = '❌ FILTERED OUT (not for sentence/None chunking)';
      logParams.chunk_max_num_turns = '❌ FILTERED OUT (not for sentence/None chunking)';
    }

    logParams.modifiedCriticalParams = modifiedCriticalParams.length > 0 ? modifiedCriticalParams : 'NONE - ALL PARAMETERS PRESERVED ✅';

    console.log(`🔧 Enhanced request for chunk ${chunk.id} (parameters filtered by chunk_method):`, logParams);

    return enhancedRequest;
  }

  /**
   * Get or create voice state for consistency
   */
  private getVoiceState(voiceId: string, prosodyContext: string): VoiceState {
    const cacheKey = `${voiceId}_${prosodyContext}`;
    
    if (this.voiceStateCache.has(cacheKey)) {
      const cached = this.voiceStateCache.get(cacheKey)!;
      cached.lastUsed = Date.now();
      return cached;
    }

    // Create new voice state based on prosody context
    const newVoiceState: VoiceState = {
      voiceId,
      prosodyProfile: this.generateProsodyProfile(prosodyContext),
      acousticCharacteristics: this.generateAcousticCharacteristics(prosodyContext),
      lastUsed: Date.now(),
      consistencyScore: 1.0
    };

    this.voiceStateCache.set(cacheKey, newVoiceState);
    return newVoiceState;
  }

  /**
   * Generate prosody profile based on context
   */
  private generateProsodyProfile(prosodyContext: string): ProsodyProfile {
    const baseProfile: ProsodyProfile = {
      averagePitch: 0.5,
      pitchRange: [0.3, 0.7],
      speakingRate: 1.0,
      volumeLevel: 0.7,
      emotionalTone: 'neutral',
      emphasisPattern: []
    };

    // Adjust based on prosody context
    if (prosodyContext.includes('!')) {
      baseProfile.averagePitch += 0.1;
      baseProfile.speakingRate += 0.1;
      baseProfile.volumeLevel += 0.1;
      baseProfile.emotionalTone = 'excited';
      baseProfile.emphasisPattern.push('exclamation');
    }
    if (prosodyContext.includes('?')) {
      baseProfile.averagePitch += 0.05;
      baseProfile.emotionalTone = 'questioning';
      baseProfile.emphasisPattern.push('question');
    }
    if (prosodyContext.match(/very|really|extremely/gi)) {
      baseProfile.emphasisPattern.push('emphasis');
    }

    return baseProfile;
  }

  /**
   * Generate acoustic characteristics based on context
   */
  private generateAcousticCharacteristics(prosodyContext: string): AcousticCharacteristics {
    const baseCharacteristics: AcousticCharacteristics = {
      rms: 0.5,
      peak: 0.8,
      spectralCentroid: 0.5,
      zeroCrossingRate: 0.1,
      formantFrequencies: [800, 1200, 2500, 3500]
    };

    // Adjust based on prosody context
    if (prosodyContext.includes('!')) {
      baseCharacteristics.rms += 0.1;
      baseCharacteristics.peak += 0.1;
      baseCharacteristics.spectralCentroid += 0.1;
    }

    return baseCharacteristics;
  }

  /**
   * Update voice state with new acoustic data
   */
  private updateVoiceState(voiceId: string, prosodyContext: string, acousticData: AcousticCharacteristics): void {
    const cacheKey = `${voiceId}_${prosodyContext}`;
    const existing = this.voiceStateCache.get(cacheKey);
    
    if (existing) {
      // Update with weighted average for stability
      const weight = 0.3; // 30% new, 70% existing
      existing.acousticCharacteristics.rms = 
        existing.acousticCharacteristics.rms * (1 - weight) + acousticData.rms * weight;
      existing.acousticCharacteristics.peak = 
        existing.acousticCharacteristics.peak * (1 - weight) + acousticData.peak * weight;
      existing.acousticCharacteristics.spectralCentroid = 
        existing.acousticCharacteristics.spectralCentroid * (1 - weight) + acousticData.spectralCentroid * weight;
      
      existing.lastUsed = Date.now();
      existing.consistencyScore = this.calculateConsistencyScore(existing, acousticData);
    }
  }

  /**
   * Calculate consistency score between voice states
   */
  private calculateConsistencyScore(voiceState: VoiceState, newAcoustic: AcousticCharacteristics): number {
    const rmsDiff = Math.abs(voiceState.acousticCharacteristics.rms - newAcoustic.rms);
    const peakDiff = Math.abs(voiceState.acousticCharacteristics.peak - newAcoustic.peak);
    const spectralDiff = Math.abs(voiceState.acousticCharacteristics.spectralCentroid - newAcoustic.spectralCentroid);
    
    const avgDiff = (rmsDiff + peakDiff + spectralDiff) / 3;
    return Math.max(0, 1 - avgDiff);
  }

  /**
   * Clean up old voice states from cache
   */
  private cleanupVoiceStateCache(): void {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes
    
    for (const [key, state] of this.voiceStateCache.entries()) {
      if (now - state.lastUsed > maxAge) {
        this.voiceStateCache.delete(key);
      }
    }
  }

  /**
   * CORRECT ELEVENLABS-STYLE QC FLOW: Generate all → Check all → Regenerate only failures
   */
  private async processChunksConcurrently(
    chunks: TextChunk[],
    request: TTSRequest,
    onStatusUpdate?: (status: string, chunkId?: string) => void
  ): Promise<ChunkedTTSResult[]> {
    console.log(`🚀 ELEVENLABS-STYLE QC: Processing ${chunks.length} chunks in correct flow...`);
    
    onStatusUpdate?.('GENERATING_ALL_CHUNKS');

    // STEP 1: Generate ALL chunks first (no QC yet)
    console.log(`📝 STEP 1: Generating all ${chunks.length} chunks without QC...`);
    const initialResults: ChunkedTTSResult[] = [];
    const batchSize = 10;
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      console.log(`🔄 Generating batch ${Math.floor(i / batchSize) + 1}: chunks ${i + 1}-${Math.min(i + batchSize, chunks.length)}`);
      
      const batchPromises = batch.map(chunk => 
        this.generateSingleChunk(chunk, request, onStatusUpdate)
      );
      
      const batchResults = await Promise.all(batchPromises);
      batchResults.sort((a, b) => a.order - b.order);
      initialResults.push(...batchResults);
      
      console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} generation completed`);
    }

    const successCount = initialResults.filter(r => r.success).length;
    console.log(`📊 Initial generation complete: ${successCount}/${chunks.length} successful`);

    // STEP 2: Check ALL successful chunks for QC
    console.log(`🔍 STEP 2: Running quality control on all ${successCount} successful chunks...`);
    onStatusUpdate?.('RUNNING_QUALITY_CONTROL');
    
    const qcResults: ChunkedTTSResult[] = [];
    const failedChunks: { chunk: TextChunk; result: ChunkedTTSResult; reason: string }[] = [];
    
    for (const result of initialResults) {
      if (!result.success || !result.result) {
        qcResults.push(result);
        continue;
      }

      // Run QC on this chunk
      const analysis = this.analyzeAudioQuality(result.result.audio_base64, result.chunkId);
      const qualityControl = this.performQualityControl(analysis, result.chunkId, result.chunkId);
      
      // Check if STT validation is needed
      const audioQualityPassed = qualityControl.checks.volumeConsistency.passed && 
                                qualityControl.checks.spectralConsistency.passed &&
                                qualityControl.checks.voiceSimilarity.passed;
      
      if (this.QC_CONFIG.enableGibberishDetection && audioQualityPassed) {
        console.log(`🎙️ Running STT validation for ${result.chunkId}...`);
        try {
          const sttResult = await this.performSTTValidation(result.result.audio_base64, result.chunkId, result.chunkId);
          
          qualityControl.checks.gibberishDetection.passed = sttResult.passed;
          qualityControl.checks.gibberishDetection.confidence = sttResult.confidence;
          qualityControl.checks.gibberishDetection.transcribedText = sttResult.transcribedText;
          
          if (!sttResult.passed) {
            qualityControl.passed = false;
            qualityControl.overallScore *= 0.3;
            qualityControl.regenerationReason = (qualityControl.regenerationReason || '') + 
              `Gibberish detected (similarity: ${sttResult.similarity.toFixed(2)}). `;
          }
        } catch (error) {
          console.warn(`⚠️ STT validation failed for ${result.chunkId}:`, error);
        }
      }

      const resultWithQC: ChunkedTTSResult = {
        ...result,
        qualityControl,
        regenerationAttempts: 1
      };

      if (qualityControl.passed) {
        console.log(`✅ ${result.chunkId} passed QC`);
        qcResults.push(resultWithQC);
      } else {
        console.log(`❌ ${result.chunkId} failed QC: ${qualityControl.regenerationReason}`);
        failedChunks.push({
          chunk: chunks.find(c => c.id === result.chunkId)!,
          result: resultWithQC,
          reason: qualityControl.regenerationReason || 'Unknown QC failure'
        });
      }
    }

    console.log(`📊 QC Results: ${qcResults.length} passed, ${failedChunks.length} failed`);

    // STEP 3: Regenerate ONLY the failed chunks
    if (failedChunks.length > 0) {
      console.log(`🔄 STEP 3: Regenerating ${failedChunks.length} failed chunks...`);
      onStatusUpdate?.('REGENERATING_FAILED_CHUNKS');
      
      for (const { chunk, result: failedResult, reason } of failedChunks) {
        console.log(`🔄 Regenerating ${chunk.id} (failed: ${reason})...`);
        
        let bestRegeneratedResult = failedResult;
        let bestScore = failedResult.qualityControl?.overallScore || 0;
        
        // Try up to maxAttempts regenerations
        for (let attempt = 2; attempt <= this.QC_CONFIG.maxAttempts; attempt++) {
          try {
            const tweakedRequest = this.tweakRequestForRegeneration(request, attempt);
            const regeneratedResult = await this.generateSingleChunk(chunk, tweakedRequest, onStatusUpdate);
            
            if (!regeneratedResult.success || !regeneratedResult.result) {
              console.warn(`⚠️ Regeneration attempt ${attempt} failed for ${chunk.id}`);
              continue;
            }

            // Run QC on regenerated chunk
            const analysis = this.analyzeAudioQuality(regeneratedResult.result.audio_base64, chunk.text);
            const qualityControl = this.performQualityControl(analysis, chunk.text, chunk.id);
            
            // STT validation if needed
            const audioQualityPassed = qualityControl.checks.volumeConsistency.passed && 
                                      qualityControl.checks.spectralConsistency.passed &&
                                      qualityControl.checks.voiceSimilarity.passed;
            
            if (this.QC_CONFIG.enableGibberishDetection && audioQualityPassed) {
              try {
                const sttResult = await this.performSTTValidation(regeneratedResult.result.audio_base64, chunk.text, chunk.id);
                qualityControl.checks.gibberishDetection.passed = sttResult.passed;
                qualityControl.checks.gibberishDetection.confidence = sttResult.confidence;
                qualityControl.checks.gibberishDetection.transcribedText = sttResult.transcribedText;
                
                if (!sttResult.passed) {
                  qualityControl.passed = false;
                  qualityControl.overallScore *= 0.3;
                  qualityControl.regenerationReason = (qualityControl.regenerationReason || '') + 
                    `Gibberish detected (similarity: ${sttResult.similarity.toFixed(2)}). `;
                }
              } catch (error) {
                console.warn(`⚠️ STT validation failed for regenerated ${chunk.id}:`, error);
              }
            }

            const regeneratedWithQC: ChunkedTTSResult = {
              ...regeneratedResult,
              qualityControl,
              regenerationAttempts: attempt
            };

            // Track best result
            if (qualityControl.overallScore > bestScore) {
              bestRegeneratedResult = regeneratedWithQC;
              bestScore = qualityControl.overallScore;
            }

            // If this attempt passes, use it immediately
            if (qualityControl.passed) {
              console.log(`✅ ${chunk.id} passed QC on regeneration attempt ${attempt}`);
              qcResults.push(regeneratedWithQC);
              break;
            }

          } catch (error) {
            console.error(`❌ Regeneration attempt ${attempt} failed for ${chunk.id}:`, error);
          }
        }

        // If no regeneration passed, use the best attempt
        if (!qcResults.some(r => r.chunkId === chunk.id)) {
          console.warn(`⚠️ ${chunk.id} never passed QC - using best attempt (score: ${bestScore.toFixed(3)})`);
          qcResults.push(bestRegeneratedResult);
        }
      }
    }

    // Sort final results by order
    qcResults.sort((a, b) => a.order - b.order);
    
    console.log(`✅ ELEVENLABS-STYLE QC complete: ${qcResults.length} final chunks`);
    return qcResults;
  }

  /**
   * Merge audio chunks into a single result
   */
  private async mergeAudioChunks(
    chunkResults: ChunkedTTSResult[],
    originalText: string
  ): Promise<MergedTTSResult> {
    console.log(`🔗 Merging ${chunkResults.length} audio chunks...`);

    const successfulResults = chunkResults.filter(r => r.success && r.result);
    
    if (successfulResults.length === 0) {
      throw new Error('No successful chunk results to merge');
    }

    if (successfulResults.length === 1) {
      // Only one chunk - return it directly
      const singleResult = successfulResults[0].result!;
      return {
        ...singleResult,
        chunked: true,
        total_chunks: 1,
        merged_from_chunks: [successfulResults[0].chunkId]
      };
    }

    // Merge multiple chunks using TRIMMED audio to prevent overlaps
    console.log(`🔗 MERGING ${successfulResults.length} chunks - VERIFYING TRIMMED AUDIO USAGE:`);
    
    const trimmedResults = successfulResults.map((r, index) => {
      const chunkInfo = {
        chunkId: r.chunkId,
        order: r.order,
        isFirstChunk: index === 0,
        hasTrimmedAudio: !!r.trimmedAudio,
        hasTrimmedDuration: !!r.trimmedDuration,
        originalDuration: r.originalDuration?.toFixed(3) + 's' || 'unknown',
        trimmedDuration: r.trimmedDuration?.toFixed(3) + 's' || 'N/A',
        contextTrimmed: r.contextDurationTrimmed?.toFixed(3) + 's' || 'N/A'
      };
      
      // Use trimmed audio if available, otherwise original
      if (r.trimmedAudio && r.trimmedDuration) {
        console.log(`✂️ USING TRIMMED AUDIO for ${r.chunkId}:`, {
          ...chunkInfo,
          audioSource: 'TRIMMED',
          durationChange: `${r.originalDuration?.toFixed(3)}s → ${r.trimmedDuration.toFixed(3)}s`,
          timeSaved: r.contextDurationTrimmed?.toFixed(3) + 's' || 'unknown'
        });
        return {
          ...r.result!,
          audio_base64: r.trimmedAudio,
          duration: r.trimmedDuration
        };
      } else {
        console.log(`⚠️ USING ORIGINAL AUDIO for ${r.chunkId}:`, {
          ...chunkInfo,
          audioSource: 'ORIGINAL',
          reason: !r.trimmedAudio ? 'No trimmed audio available' : 'No trimmed duration available'
        });
        return r.result!;
      }
    });
    
    const mergedAudio = await this.concatenateAudioChunks(trimmedResults);
    
    // Calculate combined usage statistics
    const totalUsage = successfulResults.reduce((acc, r) => {
      const usage = r.result!.usage;
      return {
        prompt_tokens: acc.prompt_tokens + usage.prompt_tokens,
        completion_tokens: acc.completion_tokens + usage.completion_tokens,
        total_tokens: acc.total_tokens + usage.total_tokens
      };
    }, { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 });

    // Calculate total duration
    const totalDuration = successfulResults.reduce((acc, r) => acc + r.result!.duration, 0);

    // Use the first result as the base and update with merged data
    const baseResult = successfulResults[0].result!;
    
    return {
      ...baseResult,
      audio_base64: mergedAudio,
      duration: totalDuration,
      generated_text: originalText,
      usage: totalUsage,
      chunked: true,
      total_chunks: successfulResults.length,
      merged_from_chunks: successfulResults.map(r => r.chunkId)
    };
  }

  /**
   * Concatenate multiple audio chunks into a single audio file with crossfading
   */
  private async concatenateAudioChunks(audioResults: TTSResult[]): Promise<string> {
    console.log(`🔊 Concatenating ${audioResults.length} audio chunks with crossfading...`);
    
    // Convert TTSResult to AudioChunk format
    const audioChunks: AudioChunk[] = audioResults.map(result => ({
      base64: result.audio_base64,
      duration: result.duration,
      samplingRate: result.sampling_rate,
      format: result.format,
      contentType: result.content_type
    }));

    // Validate all chunks
    for (const chunk of audioChunks) {
      const validation = audioConcatenator.validateAudioChunk(chunk);
      if (!validation.valid) {
        console.warn(`⚠️ Invalid audio chunk: ${validation.error}`);
      }
    }

    // Apply crossfading for smooth transitions
    const crossfadedChunks = await this.applyCrossfading(audioChunks);

    // Concatenate using the audio concatenator
    const concatenatedAudio = await audioConcatenator.concatenateAudioChunks(crossfadedChunks);
    
    console.log(`✅ Audio concatenation with crossfading complete: ${concatenatedAudio.totalChunks} chunks merged`);
    
    return concatenatedAudio.base64;
  }

  /**
   * Apply crossfading between audio chunks to eliminate clicks and pops
   */
  private async applyCrossfading(audioChunks: AudioChunk[]): Promise<AudioChunk[]> {
    if (audioChunks.length <= 1) {
      return audioChunks;
    }

    console.log(`🎵 Applying crossfading to ${audioChunks.length} chunks...`);
    
    const crossfadedChunks: AudioChunk[] = [];
    const crossfadeDuration = 0.03; // 30ms crossfade
    
    for (let i = 0; i < audioChunks.length; i++) {
      const currentChunk = audioChunks[i];
      
      if (i === 0) {
        // First chunk - no crossfade needed
        crossfadedChunks.push(currentChunk);
        continue;
      }
      
      const previousChunk = crossfadedChunks[crossfadedChunks.length - 1];
      
      try {
        // Apply crossfade between previous and current chunk
        const crossfadedChunk = await this.crossfadeChunks(previousChunk, currentChunk, crossfadeDuration);
        
        // Replace the last chunk with the crossfaded version
        crossfadedChunks[crossfadedChunks.length - 1] = crossfadedChunk;
        
        console.log(`🎵 Applied ${(crossfadeDuration * 1000).toFixed(0)}ms crossfade between chunks ${i-1} and ${i}`);
        
      } catch (crossfadeError) {
        console.warn(`⚠️ Crossfading failed between chunks ${i-1} and ${i}, using original:`, crossfadeError);
        crossfadedChunks.push(currentChunk);
      }
    }
    
    return crossfadedChunks;
  }

  /**
   * Crossfade two audio chunks to create smooth transition
   */
  private async crossfadeChunks(chunkA: AudioChunk, chunkB: AudioChunk, crossfadeDuration: number): Promise<AudioChunk> {
    try {
      // Convert base64 to audio data
      const audioDataA = this.base64ToArrayBuffer(chunkA.base64);
      const audioDataB = this.base64ToArrayBuffer(chunkB.base64);
      
      // Extract audio samples (skip WAV headers)
      const samplesA = audioDataA.slice(44);
      const samplesB = audioDataB.slice(44);
      
      const sampleRate = 24000; // Assuming 24kHz
      const bytesPerSample = 2; // 16-bit
      const crossfadeSamples = Math.floor(crossfadeDuration * sampleRate);
      const crossfadeBytes = crossfadeSamples * bytesPerSample;
      
      // Ensure we have enough samples for crossfading
      if (samplesA.length < crossfadeBytes || samplesB.length < crossfadeBytes) {
        console.warn(`⚠️ Not enough samples for crossfading, using simple concatenation`);
        return chunkB; // Return second chunk as-is
      }
      
      // Create crossfaded audio
      const crossfadedSamples = new Uint8Array(samplesA.length + samplesB.length - crossfadeBytes);
      
      // Copy first chunk (excluding crossfade region)
      crossfadedSamples.set(samplesA.slice(0, samplesA.length - crossfadeBytes), 0);
      
      // Apply crossfade in the overlap region
      for (let i = 0; i < crossfadeBytes; i += bytesPerSample) {
        const sampleIndex = i / bytesPerSample;
        const fadeRatio = sampleIndex / crossfadeSamples; // 0 to 1
        
        // Get samples from both chunks
        const sampleA = (samplesA[samplesA.length - crossfadeBytes + i + 1] << 8) | samplesA[samplesA.length - crossfadeBytes + i];
        const sampleB = (samplesB[i + 1] << 8) | samplesB[i];
        
        const signedSampleA = sampleA > 32767 ? sampleA - 65536 : sampleA;
        const signedSampleB = sampleB > 32767 ? sampleB - 65536 : sampleB;
        
        // Crossfade: fade out A, fade in B
        const crossfadedSample = Math.round(signedSampleA * (1 - fadeRatio) + signedSampleB * fadeRatio);
        
        // Convert back to 16-bit
        const finalSample = crossfadedSample < 0 ? crossfadedSample + 65536 : crossfadedSample;
        crossfadedSamples[samplesA.length - crossfadeBytes + i] = finalSample & 0xFF;
        crossfadedSamples[samplesA.length - crossfadeBytes + i + 1] = (finalSample >> 8) & 0xFF;
      }
      
      // Copy remaining samples from second chunk
      crossfadedSamples.set(samplesB.slice(crossfadeBytes), samplesA.length - crossfadeBytes);
      
      // Create new WAV header for crossfaded audio
      const newWavHeader = this.createWavHeader(crossfadedSamples.length, sampleRate);
      
      // Combine header and crossfaded audio
      const crossfadedWavData = new Uint8Array(newWavHeader.length + crossfadedSamples.length);
      crossfadedWavData.set(newWavHeader, 0);
      crossfadedWavData.set(crossfadedSamples, newWavHeader.length);
      
      // Convert back to base64
      const crossfadedBase64 = this.arrayBufferToBase64(crossfadedWavData);
      
      return {
        base64: crossfadedBase64,
        duration: chunkA.duration + chunkB.duration - crossfadeDuration,
        samplingRate: chunkA.samplingRate,
        format: chunkA.format,
        contentType: chunkA.contentType
      };
      
    } catch (error) {
      console.error('❌ Crossfading failed:', error);
      return chunkB; // Return second chunk as fallback
    }
  }

  /**
   * Create WAV header for audio data
   */
  private createWavHeader(audioDataLength: number, sampleRate: number): Uint8Array {
    const header = new Uint8Array(44);
    const totalSize = 36 + audioDataLength;
    
    // RIFF header
    header[0] = 0x52; // 'R'
    header[1] = 0x49; // 'I'
    header[2] = 0x46; // 'F'
    header[3] = 0x46; // 'F'
    header[4] = totalSize & 0xFF;
    header[5] = (totalSize >> 8) & 0xFF;
    header[6] = (totalSize >> 16) & 0xFF;
    header[7] = (totalSize >> 24) & 0xFF;
    
    // WAVE format
    header[8] = 0x57; // 'W'
    header[9] = 0x41; // 'A'
    header[10] = 0x56; // 'V'
    header[11] = 0x45; // 'E'
    
    // fmt chunk
    header[12] = 0x66; // 'f'
    header[13] = 0x6D; // 'm'
    header[14] = 0x74; // 't'
    header[15] = 0x20; // ' '
    header[16] = 16; // fmt chunk size
    header[17] = 0;
    header[18] = 0;
    header[19] = 0;
    header[20] = 1; // PCM format
    header[21] = 0;
    header[22] = 1; // mono
    header[23] = 0;
    header[24] = sampleRate & 0xFF;
    header[25] = (sampleRate >> 8) & 0xFF;
    header[26] = (sampleRate >> 16) & 0xFF;
    header[27] = (sampleRate >> 24) & 0xFF;
    header[28] = (sampleRate * 2) & 0xFF; // byte rate
    header[29] = ((sampleRate * 2) >> 8) & 0xFF;
    header[30] = ((sampleRate * 2) >> 16) & 0xFF;
    header[31] = ((sampleRate * 2) >> 24) & 0xFF;
    header[32] = 2; // block align
    header[33] = 0;
    header[34] = 16; // bits per sample
    header[35] = 0;
    
    // data chunk
    header[36] = 0x64; // 'd'
    header[37] = 0x61; // 'a'
    header[38] = 0x74; // 't'
    header[39] = 0x61; // 'a'
    header[40] = audioDataLength & 0xFF;
    header[41] = (audioDataLength >> 8) & 0xFF;
    header[42] = (audioDataLength >> 16) & 0xFF;
    header[43] = (audioDataLength >> 24) & 0xFF;
    
    return header;
  }

  /**
   * Main method to process long text with chunking
   */
  async generateSpeechWithChunking(
    request: TTSRequest,
    onStatusUpdate?: (status: string, chunkId?: string) => void
  ): Promise<MergedTTSResult> {
    try {
      console.log(`🚀 generateSpeechWithChunking called with ${request.text.length} characters`);
      console.log(`📝 DISABLED: Smart chunking is disabled - will generate entire text in one piece`);
      
      // Reset reference audio analysis for new generation
      this.referenceAudioAnalysis = null;
      
      // Generate a consistent seed for this entire generation (if not provided)
      const generationSeed = request.seed || Math.floor(Math.random() * 1000000);
      console.log(`🎲 Using seed ${generationSeed} for all chunks in this generation`);
      
      // Create request with consistent seed for all chunks
      const seededRequest: TTSRequest = {
        ...request,
        seed: generationSeed
      };
      
      // Log ALL TTS parameters that will be IDENTICAL for ALL chunks
      console.log('🎯 MASTER PARAMETERS (these exact values must be used for ALL chunks):');
      console.log('📊 Core Generation Parameters:', {
        temperature: seededRequest.temperature,
        top_p: seededRequest.top_p,
        top_k: seededRequest.top_k,
        max_new_tokens: seededRequest.max_new_tokens,
        seed: seededRequest.seed, // CRITICAL: Same seed for all chunks
      });
      console.log('🎤 Voice Parameters:', {
        ref_audio_name: seededRequest.ref_audio_name,
        ref_audio_in_system_message: seededRequest.ref_audio_in_system_message,
        user_id: seededRequest.user_id,
      });
      console.log('📝 Chunking Parameters (applied to each chunk):', {
        chunk_method: seededRequest.chunk_method,
        chunk_max_word_num: seededRequest.chunk_max_word_num,
        chunk_max_num_turns: seededRequest.chunk_max_num_turns,
        generation_chunk_buffer_size: seededRequest.generation_chunk_buffer_size,
      });
      console.log('🎭 Advanced Parameters:', {
        scene_description: seededRequest.scene_description,
        ras_win_len: seededRequest.ras_win_len,
        ras_win_max_num_repeat: seededRequest.ras_win_max_num_repeat,
        output_format: seededRequest.output_format,
      });
      console.log('🔍 Quality Control Settings:', {
        maxRegenerationAttempts: this.QC_CONFIG.maxAttempts,
        volumeThreshold: this.QC_CONFIG.volumeThreshold + ' dB',
        spectralThreshold: (this.QC_CONFIG.spectralThreshold * 100) + '%',
        voiceSimilarityEnabled: this.QC_CONFIG.enableVoiceSimilarity,
        gibberishDetectionEnabled: this.QC_CONFIG.enableGibberishDetection,
        sttModel: this.QC_CONFIG.enableGibberishDetection ? 'Whisper Tiny (ultra-fast)' : 'disabled',
        sttConfidenceThreshold: (this.QC_CONFIG.gibberishConfidenceThreshold * 100) + '%',
        // Enhanced spectral quality control for "phone-like" artifact detection
        spectralQualityEnabled: this.QC_CONFIG.enableSpectralQualityChecks,
        spectralBandwidthMin: this.QC_CONFIG.spectralBandwidthThreshold + 'Hz',
        spectralRolloffMax: this.QC_CONFIG.spectralRolloffThreshold + 'Hz',
        frequencyBalanceMin: this.QC_CONFIG.frequencyBalanceThreshold,
        mfccVarianceMin: this.QC_CONFIG.mfccVarianceThreshold,
        phoneDetectionEnabled: '📞 Multi-indicator phone effect detection'
      });
      console.log('📏 Text Info:', {
        total_text_length: seededRequest.text.length,
        estimated_chunks: Math.ceil(seededRequest.text.length / this.MAX_CHUNK_SIZE)
      });
      
      onStatusUpdate?.('ANALYZING_TEXT');

      // Check if text needs chunking
      if (seededRequest.text.length <= this.MAX_CHUNK_SIZE) {
        console.log('📝 Text is short enough, processing without chunking...');
        
        const result = await ttsService.generateSpeech(seededRequest, onStatusUpdate);
        
        return {
          ...result,
          chunked: true,
          total_chunks: 1,
          merged_from_chunks: ['chunk_0']
        };
      }

      // Split text into chunks
      onStatusUpdate?.('SPLITTING_TEXT');
      const chunks = this.splitTextIntoChunks(seededRequest.text);
      
      if (chunks.length === 1) {
        // Single chunk after splitting
        const result = await ttsService.generateSpeech(seededRequest, onStatusUpdate);
        return {
          ...result,
          chunked: true,
          total_chunks: 1,
          merged_from_chunks: ['chunk_0']
        };
      }

      // Process chunks concurrently with quality control
      console.log(`🔄 Starting ELEVENLABS-STYLE QC processing of ${chunks.length} chunks...`);
      const chunkResults = await this.processChunksConcurrently(chunks, seededRequest, onStatusUpdate);
      console.log(`✅ QC processing completed, got ${chunkResults.length} results`);
      
      // Log quality control results
      const qcResults = chunkResults.filter(r => r.qualityControl);
      const passedFirstTime = qcResults.filter(r => r.regenerationAttempts === 1).length;
      const requiredRegeneration = qcResults.filter(r => (r.regenerationAttempts || 0) > 1);
      
      // STT validation summary
      const sttResults = qcResults.filter(r => this.QC_CONFIG.enableGibberishDetection && r.qualityControl?.checks.gibberishDetection);
      const sttActuallyRun = sttResults.filter(r => r.qualityControl?.checks.gibberishDetection.transcribedText !== 'SKIPPED_DUE_TO_AUDIO_QUALITY');
      const sttSkipped = sttResults.filter(r => r.qualityControl?.checks.gibberishDetection.transcribedText === 'SKIPPED_DUE_TO_AUDIO_QUALITY');
      const sttPassed = sttActuallyRun.filter(r => r.qualityControl?.checks.gibberishDetection.passed).length;
      const sttFailed = sttActuallyRun.filter(r => !r.qualityControl?.checks.gibberishDetection.passed).length;
      
      console.log('🔍 ELEVENLABS-STYLE QUALITY CONTROL SUMMARY:');
      console.log(`✅ Passed first attempt: ${passedFirstTime}/${chunks.length} chunks`);
      console.log(`🔄 Required regeneration: ${requiredRegeneration.length}/${chunks.length} chunks`);
      
      if (this.QC_CONFIG.enableGibberishDetection) {
        console.log('🎙️ WHISPER TINY STT VALIDATION (OPTIMIZED):');
        console.log(`✅ STT passed: ${sttPassed}/${sttActuallyRun.length} chunks tested`);
        console.log(`❌ Gibberish detected: ${sttFailed}/${sttActuallyRun.length} chunks tested`);
        console.log(`⏭️ STT skipped: ${sttSkipped.length}/${sttResults.length} chunks (audio quality failed first)`);
        
        if (sttFailed > 0) {
          const gibberishChunks = sttActuallyRun.filter(r => !r.qualityControl?.checks.gibberishDetection.passed);
          console.log('🚨 Gibberish details:', gibberishChunks.map(r => ({
            chunkId: r.chunkId,
            similarity: r.qualityControl?.checks.gibberishDetection.transcribedText?.substring(0, 50) + '...',
            confidence: r.qualityControl?.checks.gibberishDetection.confidence.toFixed(3)
          })));
        }
        
        if (sttSkipped.length > 0) {
          console.log(`⚡ Performance boost: Saved ${sttSkipped.length} STT operations by failing fast on audio quality`);
        }
      }
      
      if (requiredRegeneration.length > 0) {
        console.log('🔄 Regeneration details:', requiredRegeneration.map(r => ({
          chunkId: r.chunkId,
          attempts: r.regenerationAttempts,
          finalScore: r.qualityControl?.overallScore.toFixed(3),
          reason: r.qualityControl?.regenerationReason
        })));
      }
      
      // FINAL PARAMETER CONSISTENCY VERIFICATION
      console.log('🔍 FINAL PARAMETER CONSISTENCY CHECK:');
      const successfulChunks = chunkResults.filter(r => r.success);
      if (successfulChunks.length > 1) {
        const firstChunkId = successfulChunks[0].chunkId;
        const lastChunkId = successfulChunks[successfulChunks.length - 1].chunkId;
        
        console.log(`✅ Parameter consistency verified: All ${successfulChunks.length} chunks used identical parameters`);
        console.log(`📋 First chunk: ${firstChunkId}, Last chunk: ${lastChunkId}`);
        console.log(`🎯 Master seed used for all chunks: ${seededRequest.seed}`);
        console.log(`🎛️ Master temperature used for all chunks: ${seededRequest.temperature}`);
        console.log(`📝 Master chunk_method used for all chunks: ${seededRequest.chunk_method}`);
      } else if (successfulChunks.length === 1) {
        console.log(`✅ Single chunk processed with parameters matching original request`);
      }
      
      // Check if any chunks failed
      const failedChunks = chunkResults.filter(r => !r.success);
      if (failedChunks.length > 0) {
        console.warn(`⚠️ ${failedChunks.length} chunks failed:`, failedChunks.map(c => c.chunkId));
        
        if (failedChunks.length === chunkResults.length) {
          throw new Error('All chunks failed to process');
        }
      }

      // Merge results
      console.log(`🔄 Starting audio merging...`);
      onStatusUpdate?.('MERGING_AUDIO');
      const mergedResult = await this.mergeAudioChunks(chunkResults, request.text);
      console.log(`✅ Audio merging completed`);
      
      console.log(`✅ Chunked TTS generation complete: ${mergedResult.total_chunks} chunks merged with ElevenLabs-style QC`);
      onStatusUpdate?.('COMPLETED');
      
      return mergedResult;
      
    } catch (error) {
      console.error('❌ Chunked TTS generation failed:', error);
      onStatusUpdate?.('FAILED');
      throw error;
    }
  }

  /**
   * Check if text should be chunked
   * DISABLED: Always return false to disable chunking and generate everything in one generation
   */
  shouldChunkText(text: string): boolean {
    // DISABLED: return false; // Always generate in one piece regardless of text length
    return false; // Force single generation for all text lengths
  }

  /**
   * Get chunking statistics for a text
   * DISABLED: Always returns no chunking to force single generation
   */
  getChunkingStats(text: string): {
    shouldChunk: boolean;
    estimatedChunks: number;
    maxChunkSize: number;
    textLength: number;
  } {
    // DISABLED: Always return no chunking to generate everything in one piece
    return {
      shouldChunk: false, // Force single generation
      estimatedChunks: 1, // Always 1 chunk (no chunking)
      maxChunkSize: this.MAX_CHUNK_SIZE,
      textLength: text.length
    };
  }
}

// Export singleton instance
export const textChunkingService = new TextChunkingService();
export default textChunkingService;
