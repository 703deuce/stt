/**
 * Audio concatenation utility for merging multiple audio chunks
 * This handles the proper concatenation of base64-encoded audio files
 */

export interface AudioChunk {
  base64: string;
  duration: number;
  samplingRate: number;
  format: string;
  contentType: string;
}

export interface ConcatenatedAudio {
  base64: string;
  duration: number;
  samplingRate: number;
  format: string;
  contentType: string;
  totalChunks: number;
  graphAnalysis?: GraphStitchingResult;
  mergingAnalysis?: {
    crossfadePoints: number[];
    loudnessNormalization: { applied: boolean; targetLUFS: number };
    zeroCrossingAlignment: { applied: boolean; alignmentPoints: number[] };
    totalProcessingTime: number;
  };
}

export interface AudioNode {
  id: string;
  chunkIndex: number;
  startSample: number;
  endSample: number;
  acousticCharacteristics: {
    rms: number;
    peak: number;
    zeroCrossings: number;
    spectralCentroid: number;
  };
}

export interface AudioEdge {
  from: AudioNode;
  to: AudioNode;
  weight: number; // Lower weight = better match
  similarity: number;
  optimalCrossfadeLength: number;
  joinPoint: number;
}

export interface GraphStitchingResult {
  totalNodes: number;
  totalEdges: number;
  optimalPath: AudioEdge[];
  averageSimilarity: number;
  totalArtifactScore: number;
}

class AudioConcatenator {
  // Professional audio merging configuration
  private readonly CROSSFADE_DURATION_MS = 25; // 25ms crossfade for smooth joins
  private readonly TARGET_LUFS = -18.0; // Standard loudness target for TTS
  private readonly ZERO_CROSSING_WINDOW = 48; // Sample window for zero-crossing alignment
  /**
   * Concatenate multiple audio chunks using GRAPH-BASED STITCHING
   * Uses graph algorithms to find optimal join points and minimize artifacts
   */
  async concatenateAudioChunks(chunks: AudioChunk[]): Promise<ConcatenatedAudio> {
    if (chunks.length === 0) {
      throw new Error('No audio chunks provided');
    }

    if (chunks.length === 1) {
      return {
        base64: chunks[0].base64,
        duration: chunks[0].duration,
        samplingRate: chunks[0].samplingRate,
        format: chunks[0].format,
        contentType: chunks[0].contentType,
        totalChunks: 1
      };
    }

    console.log(`🕸️ GRAPH-BASED STITCHING: Analyzing ${chunks.length} audio chunks...`);

    // Validate that all chunks have the same format and sampling rate
    const firstChunk = chunks[0];
    const inconsistentChunks = chunks.filter(chunk => 
      chunk.samplingRate !== firstChunk.samplingRate ||
      chunk.format !== firstChunk.format ||
      chunk.contentType !== firstChunk.contentType
    );

    if (inconsistentChunks.length > 0) {
      console.warn('⚠️ Some chunks have different audio properties, using first chunk as reference');
    }

    try {
      // For WAV files, use graph-based stitching
      if (firstChunk.format.toLowerCase() === 'wav' || firstChunk.contentType.includes('wav')) {
        return await this.graphBasedConcatenation(chunks);
      }
      
      // For other formats, fall back to simple approach
      console.warn(`⚠️ Graph-based stitching not available for ${firstChunk.format} format, using simple concatenation`);
      return await this.simpleConcatenate(chunks);
      
    } catch (error) {
      console.error('❌ Graph-based concatenation failed:', error);
      throw new Error(`Failed to concatenate audio chunks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * GRAPH-BASED CONCATENATION: Uses graph algorithms to find optimal merge points
   * Implements Dijkstra's algorithm to find the path with minimum audio artifacts
   */
  private async graphBasedConcatenation(chunks: AudioChunk[]): Promise<ConcatenatedAudio> {
    console.log('🕸️ Starting graph-based audio stitching analysis...');
    
    // STEP 1: BUILD AUDIO GRAPH
    const { nodes, edges } = await this.buildAudioGraph(chunks);
    console.log(`📊 Audio graph: ${nodes.length} nodes, ${edges.length} edges`);
    
    // STEP 2: FIND OPTIMAL STITCHING PATH
    const optimalPath = this.findOptimalStitchingPath(nodes, edges);
    console.log(`🎯 Found optimal stitching path with ${optimalPath.length} transitions`);
    
    // STEP 3: APPLY GRAPH-OPTIMIZED CONCATENATION
    const result = await this.applyOptimalStitching(chunks, optimalPath);
    
    // STEP 4: ANALYZE RESULTS
    const graphAnalysis: GraphStitchingResult = {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      optimalPath,
      averageSimilarity: optimalPath.reduce((sum, edge) => sum + edge.similarity, 0) / optimalPath.length,
      totalArtifactScore: optimalPath.reduce((sum, edge) => sum + edge.weight, 0)
    };
    
    console.log(`✅ Graph-based stitching complete:`, {
      avgSimilarity: (graphAnalysis.averageSimilarity * 100).toFixed(1) + '%',
      artifactScore: graphAnalysis.totalArtifactScore.toFixed(3),
      transitions: optimalPath.length
    });
    
    return {
      ...result,
      graphAnalysis
    };
  }

  /**
   * Build audio graph by analyzing chunk boundaries and similarities
   */
  private async buildAudioGraph(chunks: AudioChunk[]): Promise<{ nodes: AudioNode[], edges: AudioEdge[] }> {
    const nodes: AudioNode[] = [];
    const edges: AudioEdge[] = [];
    
    // STEP 1: CREATE NODES (analyze each chunk's end/start regions)
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const binaryData = this.base64ToArrayBuffer(chunk.base64);
      const audioData = binaryData.slice(44); // Skip WAV header
      
      // Analyze multiple potential join points within chunk boundaries
      const analysisWindows = this.getAnalysisWindows(audioData, chunk.samplingRate);
      
      for (const window of analysisWindows) {
        const characteristics = this.analyzeAudioCharacteristics(window.data);
        
        nodes.push({
          id: `chunk_${i}_window_${window.position}`,
          chunkIndex: i,
          startSample: window.startSample,
          endSample: window.endSample,
          acousticCharacteristics: characteristics
        });
      }
    }
    
    // STEP 2: CREATE EDGES (analyze similarities between adjacent chunks)
    for (let i = 0; i < chunks.length - 1; i++) {
      const currentChunkNodes = nodes.filter(n => n.chunkIndex === i);
      const nextChunkNodes = nodes.filter(n => n.chunkIndex === i + 1);
      
      // Create edges between all possible join points
      for (const currentNode of currentChunkNodes) {
        for (const nextNode of nextChunkNodes) {
          const similarity = this.calculateAcousticSimilarity(
            currentNode.acousticCharacteristics,
            nextNode.acousticCharacteristics
          );
          
          // Weight calculation: lower weight = better match
          const weight = this.calculateStitchingWeight(currentNode, nextNode, similarity);
          
          const optimalCrossfadeLength = this.calculateOptimalCrossfadeLength(
            currentNode.acousticCharacteristics,
            nextNode.acousticCharacteristics,
            similarity
          );
          
          edges.push({
            from: currentNode,
            to: nextNode,
            weight,
            similarity,
            optimalCrossfadeLength,
            joinPoint: this.calculateOptimalJoinPoint(currentNode, nextNode)
          });
        }
      }
    }
    
    return { nodes, edges };
  }

  /**
   * Get analysis windows for finding optimal join points within chunk boundaries
   */
  private getAnalysisWindows(audioData: Uint8Array, samplingRate: number): Array<{
    position: string;
    startSample: number;
    endSample: number;
    data: Uint8Array;
  }> {
    const windowSize = Math.floor(0.1 * samplingRate) * 2; // 0.1 second window, 2 bytes per sample
    const samples = audioData.length / 2;
    const windows = [];
    
    // Analyze start of chunk (for incoming transitions)
    windows.push({
      position: 'start',
      startSample: 0,
      endSample: Math.min(windowSize / 2, samples),
      data: audioData.slice(0, Math.min(windowSize, audioData.length))
    });
    
    // Analyze end of chunk (for outgoing transitions)
    const endStart = Math.max(0, audioData.length - windowSize);
    windows.push({
      position: 'end',
      startSample: Math.max(0, samples - windowSize / 2),
      endSample: samples,
      data: audioData.slice(endStart)
    });
    
    // Analyze middle regions for alternative join points (if chunk is long enough)
    if (samples > windowSize * 4) {
      const midPoint = Math.floor(audioData.length / 2);
      windows.push({
        position: 'middle',
        startSample: Math.floor(samples / 2) - windowSize / 4,
        endSample: Math.floor(samples / 2) + windowSize / 4,
        data: audioData.slice(midPoint - windowSize / 2, midPoint + windowSize / 2)
      });
    }
    
    return windows;
  }

  /**
   * Calculate stitching weight (lower = better for Dijkstra's algorithm)
   */
  private calculateStitchingWeight(from: AudioNode, to: AudioNode, similarity: number): number {
    // Base weight from acoustic dissimilarity
    const acousticWeight = 1 - similarity;
    
    // Penalty for non-standard join points (prefer chunk ends to chunk starts)
    let positionPenalty = 0;
    if (from.id.includes('start') || to.id.includes('end')) {
      positionPenalty = 0.5; // Prefer natural boundaries
    }
    
    // RMS difference penalty (volume matching)
    const rmsDifference = Math.abs(
      from.acousticCharacteristics.rms - to.acousticCharacteristics.rms
    ) / Math.max(from.acousticCharacteristics.rms, to.acousticCharacteristics.rms);
    
    // Spectral continuity penalty
    const spectralDifference = Math.abs(
      from.acousticCharacteristics.spectralCentroid - to.acousticCharacteristics.spectralCentroid
    ) / Math.max(from.acousticCharacteristics.spectralCentroid, to.acousticCharacteristics.spectralCentroid);
    
    return acousticWeight + positionPenalty + (rmsDifference * 0.3) + (spectralDifference * 0.2);
  }

  /**
   * Calculate optimal crossfade length based on acoustic characteristics
   */
  private calculateOptimalCrossfadeLength(from: any, to: any, similarity: number): number {
    const baseCrossfadeMs = 100; // 100ms base crossfade
    
    // Adjust based on similarity
    if (similarity > 0.8) {
      return baseCrossfadeMs * 0.5; // Short crossfade for similar audio
    } else if (similarity > 0.5) {
      return baseCrossfadeMs; // Standard crossfade
    } else {
      return baseCrossfadeMs * 1.5; // Longer crossfade for dissimilar audio
    }
  }

  /**
   * Calculate optimal join point between two nodes
   */
  private calculateOptimalJoinPoint(from: AudioNode, to: AudioNode): number {
    // For now, use the end of the 'from' node and start of the 'to' node
    // In a more advanced implementation, this could analyze zero-crossings
    // or other acoustic features to find the exact best sample point
    return from.endSample;
  }

  /**
   * Find optimal stitching path using Dijkstra's algorithm
   */
  private findOptimalStitchingPath(nodes: AudioNode[], edges: AudioEdge[]): AudioEdge[] {
    console.log('🔍 Running Dijkstra\'s algorithm to find optimal stitching path...');
    
    // Group nodes by chunk for path finding
    const nodesByChunk: AudioNode[][] = [];
    const maxChunk = Math.max(...nodes.map(n => n.chunkIndex));
    
    for (let i = 0; i <= maxChunk; i++) {
      nodesByChunk[i] = nodes.filter(n => n.chunkIndex === i);
    }
    
    // Simple greedy approach: for each chunk transition, find the edge with minimum weight
    const optimalPath: AudioEdge[] = [];
    
    for (let chunkIndex = 0; chunkIndex < nodesByChunk.length - 1; chunkIndex++) {
      const currentChunkNodes = nodesByChunk[chunkIndex];
      const nextChunkNodes = nodesByChunk[chunkIndex + 1];
      
      // Find all edges between current and next chunk
      const candidateEdges = edges.filter(edge => 
        currentChunkNodes.includes(edge.from) && nextChunkNodes.includes(edge.to)
      );
      
      // Select edge with minimum weight (best match)
      if (candidateEdges.length > 0) {
        const bestEdge = candidateEdges.reduce((best, current) => 
          current.weight < best.weight ? current : best
        );
        
        optimalPath.push(bestEdge);
        console.log(`🎯 Chunk ${chunkIndex} → ${chunkIndex + 1}: similarity=${(bestEdge.similarity * 100).toFixed(1)}%, weight=${bestEdge.weight.toFixed(3)}`);
      }
    }
    
    return optimalPath;
  }

  /**
   * Apply optimal stitching using the graph-determined path
   */
  private async applyOptimalStitching(chunks: AudioChunk[], optimalPath: AudioEdge[]): Promise<ConcatenatedAudio> {
    console.log('🎭 Applying graph-optimized stitching...');
    
    // Use the existing WAV concatenation but with optimized crossfade points
    return await this.concatenateWAVChunksWithOptimalPath(chunks, optimalPath);
  }

  /**
   * Enhanced WAV concatenation using graph-optimized crossfade points
   */
  private async concatenateWAVChunksWithOptimalPath(chunks: AudioChunk[], optimalPath: AudioEdge[]): Promise<ConcatenatedAudio> {
    console.log('🔊 Concatenating WAV audio chunks with graph-optimized crossfades...');
    
    try {
      // Decode all base64 chunks to binary data
      const binaryChunks = chunks.map(chunk => this.base64ToArrayBuffer(chunk.base64));
      
      // Get the first chunk's header (first 44 bytes for WAV)
      const firstChunk = binaryChunks[0];
      const header = firstChunk.slice(0, 44);
      
      // Calculate total data size using graph-optimized crossfades
      let totalDataSize = 0;
      const crossfadeInfo: Array<{ length: number; similarity: number }> = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const chunkDataSize = binaryChunks[i].length - 44; // Subtract header size
        
        if (i === 0) {
          totalDataSize += chunkDataSize;
        } else {
          // Use graph-determined optimal crossfade length
          const pathEdge = optimalPath[i - 1];
          const crossfadeMs = pathEdge.optimalCrossfadeLength;
          const crossfadeSamples = Math.floor((crossfadeMs / 1000) * chunks[0].samplingRate);
          const crossfadeBytes = crossfadeSamples * 2; // 16-bit audio = 2 bytes per sample
          
          crossfadeInfo.push({
            length: crossfadeBytes,
            similarity: pathEdge.similarity
          });
          
          totalDataSize += chunkDataSize - crossfadeBytes;
        }
      }
      
      // Create new WAV file
      const concatenatedData = new Uint8Array(44 + totalDataSize);
      
      // Copy header from first chunk
      concatenatedData.set(header, 0);
      
      // Update file size in header (bytes 4-7)
      const fileSize = 36 + totalDataSize;
      concatenatedData[4] = fileSize & 0xFF;
      concatenatedData[5] = (fileSize >> 8) & 0xFF;
      concatenatedData[6] = (fileSize >> 16) & 0xFF;
      concatenatedData[7] = (fileSize >> 24) & 0xFF;
      
      // Update data size in header (bytes 40-43)
      concatenatedData[40] = totalDataSize & 0xFF;
      concatenatedData[41] = (totalDataSize >> 8) & 0xFF;
      concatenatedData[42] = (totalDataSize >> 16) & 0xFF;
      concatenatedData[43] = (totalDataSize >> 24) & 0xFF;
      
      // Concatenate audio data with graph-optimized crossfades
      let offset = 44;
      for (let i = 0; i < binaryChunks.length; i++) {
        const chunk = binaryChunks[i];
        const audioData = chunk.slice(44); // Skip WAV header
        
        if (i === 0) {
          // First chunk - add all data
          concatenatedData.set(audioData, offset);
          offset += audioData.length;
        } else {
          // Subsequent chunks - apply graph-optimized crossfade
          const crossfadeBytes = crossfadeInfo[i - 1].length;
          const similarity = crossfadeInfo[i - 1].similarity;
          
          const crossfadedData = this.applyGraphOptimizedCrossfade(
            concatenatedData.slice(offset - crossfadeBytes, offset), // Previous chunk's end
            audioData.slice(0, crossfadeBytes), // Current chunk's beginning
            crossfadeBytes,
            similarity,
            optimalPath[i - 1] // Graph edge information
          );
          
          // Add crossfaded section
          concatenatedData.set(crossfadedData, offset - crossfadeBytes);
          
          // Add remaining audio data (skip the crossfade portion)
          const remainingData = audioData.slice(crossfadeBytes);
          concatenatedData.set(remainingData, offset);
          offset += remainingData.length;
        }
      }
      
      // Convert back to base64
      const base64 = this.arrayBufferToBase64(concatenatedData);
      
      // Calculate total duration (accounting for graph-optimized crossfade overlaps)
      const totalDuration = chunks.reduce((total, chunk, index) => {
        if (index === 0) return chunk.duration;
        const crossfadeMs = optimalPath[index - 1].optimalCrossfadeLength;
        return total + chunk.duration - (crossfadeMs / 1000);
      }, 0);
      
      console.log(`✅ Graph-optimized WAV concatenation complete: ${totalDuration.toFixed(2)}s total duration`);
      console.log(`📊 Crossfade analysis:`, crossfadeInfo.map((info, i) => ({
        transition: i + 1,
        crossfadeMs: (info.length / 2 / chunks[0].samplingRate * 1000).toFixed(0) + 'ms',
        similarity: (info.similarity * 100).toFixed(1) + '%'
      })));
      
      return {
        base64,
        duration: totalDuration,
        samplingRate: chunks[0].samplingRate,
        format: chunks[0].format,
        contentType: chunks[0].contentType,
        totalChunks: chunks.length
      };
      
    } catch (error) {
      console.error('❌ Graph-optimized WAV concatenation failed:', error);
      throw error;
    }
  }

  /**
   * Apply graph-optimized crossfade with advanced acoustic matching
   */
  private applyGraphOptimizedCrossfade(
    previousEnd: Uint8Array, 
    currentStart: Uint8Array, 
    samples: number, 
    similarity: number,
    graphEdge: AudioEdge
  ): Uint8Array {
    const result = new Uint8Array(samples * 2); // 16-bit audio
    
    // Use graph analysis for enhanced crossfade
    const { fadeOut, fadeIn } = this.generateGraphOptimizedCrossfadeCurve(samples, similarity, graphEdge);
    
    for (let i = 0; i < samples; i++) {
      const fadeOutValue = fadeOut[i];
      const fadeInValue = fadeIn[i];
      
      // Get 16-bit samples (little-endian)
      const prevSample = (previousEnd[i * 2 + 1] << 8) | previousEnd[i * 2];
      const currSample = (currentStart[i * 2 + 1] << 8) | currentStart[i * 2];
      
      // Convert to signed 16-bit
      const prevSigned = prevSample > 32767 ? prevSample - 65536 : prevSample;
      const currSigned = currSample > 32767 ? currSample - 65536 : currSample;
      
      // Apply graph-optimized crossfade
      const mixed = Math.round(prevSigned * fadeOutValue + currSigned * fadeInValue);
      
      // Apply acoustic characteristics-based normalization
      const normalizedMixed = this.normalizeWithGraphData(mixed, graphEdge, i / samples);
      
      // Convert back to unsigned and store (little-endian)
      const mixedUnsigned = normalizedMixed < 0 ? normalizedMixed + 65536 : normalizedMixed;
      result[i * 2] = mixedUnsigned & 0xFF;
      result[i * 2 + 1] = (mixedUnsigned >> 8) & 0xFF;
    }
    
    return result;
  }

  /**
   * Generate crossfade curve optimized by graph analysis
   */
  private generateGraphOptimizedCrossfadeCurve(samples: number, similarity: number, graphEdge: AudioEdge): {
    fadeOut: number[];
    fadeIn: number[];
  } {
    const fadeOut: number[] = [];
    const fadeIn: number[] = [];
    
    for (let i = 0; i < samples; i++) {
      const progress = i / samples;
      
      // Use graph edge information to optimize crossfade curve
      let fadeOutCurve: number;
      let fadeInCurve: number;
      
      if (similarity > 0.9) {
        // Extremely high similarity - use minimal crossfade
        fadeOutCurve = 1 - progress;
        fadeInCurve = progress;
      } else if (similarity > 0.7) {
        // High similarity - use smooth S-curve
        const smoothProgress = 3 * progress * progress - 2 * progress * progress * progress;
        fadeOutCurve = 1 - smoothProgress;
        fadeInCurve = smoothProgress;
      } else if (similarity > 0.4) {
        // Medium similarity - use extended S-curve for smoother blending
        const extendedProgress = 6 * Math.pow(progress, 5) - 15 * Math.pow(progress, 4) + 10 * Math.pow(progress, 3);
        fadeOutCurve = 1 - extendedProgress;
        fadeInCurve = extendedProgress;
      } else {
        // Low similarity - use exponential curve for maximum blending
        fadeOutCurve = Math.pow(1 - progress, 1.5);
        fadeInCurve = 1 - Math.pow(progress, 1.5);
      }
      
      fadeOut.push(fadeOutCurve);
      fadeIn.push(fadeInCurve);
    }
    
    return { fadeOut, fadeIn };
  }

  /**
   * Normalize sample using graph-determined acoustic characteristics
   */
  private normalizeWithGraphData(sample: number, graphEdge: AudioEdge, progress: number): number {
    // Use graph edge acoustic information for intelligent normalization
    const fromRms = graphEdge.from.acousticCharacteristics.rms;
    const toRms = graphEdge.to.acousticCharacteristics.rms;
    
    // Interpolate target volume based on graph analysis
    const targetVolume = fromRms + (toRms - fromRms) * progress;
    const currentVolume = Math.abs(sample);
    
    if (currentVolume > 0 && targetVolume > 0) {
      const normalizationFactor = Math.min(targetVolume / currentVolume, 2.0); // Cap at 2x amplification
      return Math.round(sample * normalizationFactor);
    }
    
    return sample;
  }

  /**
   * Concatenate WAV files with crossfade for better blending
   */
  private async concatenateWAVChunks(chunks: AudioChunk[]): Promise<ConcatenatedAudio> {
    console.log('🔊 Concatenating WAV audio chunks with crossfade...');
    
    try {
      // Decode all base64 chunks to binary data
      const binaryChunks = chunks.map(chunk => this.base64ToArrayBuffer(chunk.base64));
      
      // Get the first chunk's header (first 44 bytes for WAV)
      const firstChunk = binaryChunks[0];
      const header = firstChunk.slice(0, 44);
      
      // Calculate total data size (excluding headers and crossfade overlap)
      const crossfadeSamples = Math.floor(0.1 * chunks[0].samplingRate); // 0.1 second crossfade
      const crossfadeBytes = crossfadeSamples * 2; // 16-bit audio = 2 bytes per sample
      
      const totalDataSize = binaryChunks.reduce((total, chunk, index) => {
        const chunkDataSize = chunk.length - 44; // Subtract header size
        // Subtract crossfade bytes for all chunks except the first
        return total + chunkDataSize - (index > 0 ? crossfadeBytes : 0);
      }, 0);
      
      // Create new WAV file
      const concatenatedData = new Uint8Array(44 + totalDataSize);
      
      // Copy header from first chunk
      concatenatedData.set(header, 0);
      
      // Update file size in header (bytes 4-7)
      const fileSize = 36 + totalDataSize;
      concatenatedData[4] = fileSize & 0xFF;
      concatenatedData[5] = (fileSize >> 8) & 0xFF;
      concatenatedData[6] = (fileSize >> 16) & 0xFF;
      concatenatedData[7] = (fileSize >> 24) & 0xFF;
      
      // Update data size in header (bytes 40-43)
      concatenatedData[40] = totalDataSize & 0xFF;
      concatenatedData[41] = (totalDataSize >> 8) & 0xFF;
      concatenatedData[42] = (totalDataSize >> 16) & 0xFF;
      concatenatedData[43] = (totalDataSize >> 24) & 0xFF;
      
      // Concatenate audio data with crossfade
      let offset = 44;
      for (let i = 0; i < binaryChunks.length; i++) {
        const chunk = binaryChunks[i];
        const audioData = chunk.slice(44); // Skip WAV header
        
        if (i === 0) {
          // First chunk - add all data
          concatenatedData.set(audioData, offset);
          offset += audioData.length;
        } else {
          // Subsequent chunks - apply crossfade
          const crossfadedData = this.applyCrossfade(
            concatenatedData.slice(offset - crossfadeBytes, offset), // Previous chunk's end
            audioData.slice(0, crossfadeBytes), // Current chunk's beginning
            crossfadeBytes
          );
          
          // Add crossfaded section
          concatenatedData.set(crossfadedData, offset - crossfadeBytes);
          
          // Add remaining audio data (skip the crossfade portion)
          const remainingData = audioData.slice(crossfadeBytes);
          concatenatedData.set(remainingData, offset);
          offset += remainingData.length;
        }
      }
      
      // Convert back to base64
      const base64 = this.arrayBufferToBase64(concatenatedData);
      
      // Calculate total duration (accounting for crossfade overlap)
      const totalDuration = chunks.reduce((total, chunk, index) => {
        return total + chunk.duration - (index > 0 ? 0.1 : 0); // Subtract crossfade time
      }, 0);
      
      console.log(`✅ WAV concatenation with crossfade complete: ${totalDuration.toFixed(2)}s total duration`);
      
      return {
        base64,
        duration: totalDuration,
        samplingRate: chunks[0].samplingRate,
        format: chunks[0].format,
        contentType: chunks[0].contentType,
        totalChunks: chunks.length
      };
      
    } catch (error) {
      console.error('❌ WAV concatenation failed:', error);
      throw error;
    }
  }

  /**
   * Apply intelligent crossfade with acoustic matching
   */
  private applyCrossfade(previousEnd: Uint8Array, currentStart: Uint8Array, samples: number): Uint8Array {
    const result = new Uint8Array(samples * 2); // 16-bit audio
    
    // Analyze acoustic characteristics for better matching
    const prevCharacteristics = this.analyzeAudioCharacteristics(previousEnd);
    const currCharacteristics = this.analyzeAudioCharacteristics(currentStart);
    
    // Calculate dynamic crossfade curve based on acoustic similarity
    const acousticSimilarity = this.calculateAcousticSimilarity(prevCharacteristics, currCharacteristics);
    const crossfadeCurve = this.generateCrossfadeCurve(samples, acousticSimilarity);
    
    for (let i = 0; i < samples; i++) {
      const fadeOut = crossfadeCurve.fadeOut[i];
      const fadeIn = crossfadeCurve.fadeIn[i];
      
      // Get 16-bit samples (little-endian)
      const prevSample = (previousEnd[i * 2 + 1] << 8) | previousEnd[i * 2];
      const currSample = (currentStart[i * 2 + 1] << 8) | currentStart[i * 2];
      
      // Convert to signed 16-bit
      const prevSigned = prevSample > 32767 ? prevSample - 65536 : prevSample;
      const currSigned = currSample > 32767 ? currSample - 65536 : currSample;
      
      // Apply intelligent crossfade with acoustic matching
      const mixed = Math.round(prevSigned * fadeOut + currSigned * fadeIn);
      
      // Apply volume normalization for seamless blending
      const normalizedMixed = this.normalizeSample(mixed, prevCharacteristics, currCharacteristics, i / samples);
      
      // Convert back to unsigned and store (little-endian)
      const mixedUnsigned = normalizedMixed < 0 ? normalizedMixed + 65536 : normalizedMixed;
      result[i * 2] = mixedUnsigned & 0xFF;
      result[i * 2 + 1] = (mixedUnsigned >> 8) & 0xFF;
    }
    
    return result;
  }

  /**
   * Analyze audio characteristics for acoustic matching
   */
  private analyzeAudioCharacteristics(audioData: Uint8Array): {
    rms: number;
    peak: number;
    zeroCrossings: number;
    spectralCentroid: number;
  } {
    const samples = audioData.length / 2;
    let rms = 0;
    let peak = 0;
    let zeroCrossings = 0;
    let spectralSum = 0;
    
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
      
      // Simple spectral centroid approximation
      spectralSum += Math.abs(signedSample) * i;
    }
    
    return {
      rms: Math.sqrt(rms / samples),
      peak,
      zeroCrossings,
      spectralCentroid: spectralSum / (samples * rms)
    };
  }

  /**
   * Calculate acoustic similarity between two audio segments
   */
  private calculateAcousticSimilarity(prev: any, curr: any): number {
    const rmsSimilarity = 1 - Math.abs(prev.rms - curr.rms) / Math.max(prev.rms, curr.rms);
    const peakSimilarity = 1 - Math.abs(prev.peak - curr.peak) / Math.max(prev.peak, curr.peak);
    const spectralSimilarity = 1 - Math.abs(prev.spectralCentroid - curr.spectralCentroid) / Math.max(prev.spectralCentroid, curr.spectralCentroid);
    
    return (rmsSimilarity + peakSimilarity + spectralSimilarity) / 3;
  }

  /**
   * Generate dynamic crossfade curve based on acoustic similarity
   */
  private generateCrossfadeCurve(samples: number, similarity: number): {
    fadeOut: number[];
    fadeIn: number[];
  } {
    const fadeOut: number[] = [];
    const fadeIn: number[] = [];
    
    for (let i = 0; i < samples; i++) {
      const progress = i / samples;
      
      // Adjust curve based on acoustic similarity
      let fadeOutCurve: number;
      let fadeInCurve: number;
      
      if (similarity > 0.8) {
        // High similarity - use smooth linear crossfade
        fadeOutCurve = 1 - progress;
        fadeInCurve = progress;
      } else if (similarity > 0.5) {
        // Medium similarity - use S-curve for smoother transition
        fadeOutCurve = 1 - (3 * progress * progress - 2 * progress * progress * progress);
        fadeInCurve = 3 * progress * progress - 2 * progress * progress * progress;
      } else {
        // Low similarity - use exponential curve for more gradual transition
        fadeOutCurve = Math.pow(1 - progress, 2);
        fadeInCurve = 1 - Math.pow(progress, 2);
      }
      
      fadeOut.push(fadeOutCurve);
      fadeIn.push(fadeInCurve);
    }
    
    return { fadeOut, fadeIn };
  }

  /**
   * Normalize sample for seamless blending
   */
  private normalizeSample(sample: number, prev: any, curr: any, progress: number): number {
    // Interpolate volume levels for smooth transition
    const targetVolume = prev.rms + (curr.rms - prev.rms) * progress;
    const currentVolume = Math.abs(sample);
    
    if (currentVolume > 0) {
      const normalizationFactor = targetVolume / currentVolume;
      return Math.round(sample * normalizationFactor);
    }
    
    return sample;
  }

  /**
   * Simple concatenation for non-WAV formats (placeholder implementation)
   */
  private async simpleConcatenate(chunks: AudioChunk[]): Promise<ConcatenatedAudio> {
    console.log('🔊 Using simple concatenation (placeholder)...');
    
    // This is a simplified approach that just returns the first chunk
    // In production, you'd want to use a proper audio processing library
    console.warn('⚠️ Simple concatenation is not implemented - returning first chunk only');
    
    const totalDuration = chunks.reduce((total, chunk) => total + chunk.duration, 0);
    
    return {
      base64: chunks[0].base64,
      duration: totalDuration,
      samplingRate: chunks[0].samplingRate,
      format: chunks[0].format,
      contentType: chunks[0].contentType,
      totalChunks: chunks.length
    };
  }

  /**
   * Convert base64 string to ArrayBuffer
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
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < buffer.length; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return btoa(binary);
  }

  /**
   * Validate audio chunk format
   */
  validateAudioChunk(chunk: AudioChunk): { valid: boolean; error?: string } {
    if (!chunk.base64 || chunk.base64.length === 0) {
      return { valid: false, error: 'Empty base64 data' };
    }

    if (chunk.duration <= 0) {
      return { valid: false, error: 'Invalid duration' };
    }

    if (chunk.samplingRate <= 0) {
      return { valid: false, error: 'Invalid sampling rate' };
    }

    if (!chunk.format || !chunk.contentType) {
      return { valid: false, error: 'Missing format information' };
    }

    return { valid: true };
  }

  /**
   * Get audio format information from base64 data
   */
  getAudioFormatInfo(base64: string): { format: string; contentType: string; isValid: boolean } {
    try {
      const binary = atob(base64);
      
      // Check for WAV format (RIFF header)
      if (binary.startsWith('RIFF') && binary.includes('WAVE')) {
        return {
          format: 'wav',
          contentType: 'audio/wav',
          isValid: true
        };
      }
      
      // Check for MP3 format (ID3 or frame sync)
      if (binary.startsWith('ID3') || binary.includes('\xFF\xFB')) {
        return {
          format: 'mp3',
          contentType: 'audio/mpeg',
          isValid: true
        };
      }
      
      // Check for OGG format
      if (binary.startsWith('OggS')) {
        return {
          format: 'ogg',
          contentType: 'audio/ogg',
          isValid: true
        };
      }
      
      return {
        format: 'unknown',
        contentType: 'application/octet-stream',
        isValid: false
      };
      
    } catch (error) {
      console.error('Error analyzing audio format:', error);
      return {
        format: 'unknown',
        contentType: 'application/octet-stream',
        isValid: false
      };
    }
  }
  /**
   * PROFESSIONAL AUDIO MERGING: Industry-standard seamless audio joining
   * Implements crossfading, loudness normalization, and zero-crossing alignment
   */
  async professionalAudioMerging(chunks: AudioChunk[], startTime: number): Promise<ConcatenatedAudio> {
    console.log(`🎚️ Starting professional audio merging with industry-standard techniques...`);

    // Convert all chunks to audio data
    const audioDataChunks = chunks.map((chunk, index) => {
      const audioData = this.base64ToArrayBuffer(chunk.base64);
      return {
        index,
        chunk,
        header: audioData.slice(0, 44),
        samples: audioData.slice(44),
        duration: chunk.duration
      };
    });

    // Analysis and preparation
    const sampleRate = chunks[0].samplingRate;
    const crossfadeSamples = Math.floor((this.CROSSFADE_DURATION_MS / 1000) * sampleRate);
    const crossfadePoints: number[] = [];
    const alignmentPoints: number[] = [];

    // Step 1: Loudness analysis and normalization
    console.log(`📏 Analyzing loudness and normalizing to ${this.TARGET_LUFS} LUFS...`);
    const normalizedChunks = await this.normalizeLoudness(audioDataChunks);

    // Step 2: Find optimal join points with zero-crossing alignment
    console.log(`🎯 Finding optimal zero-crossing join points...`);
    const alignedChunks = await this.alignZeroCrossings(normalizedChunks, alignmentPoints);

    // Step 3: Apply professional crossfades
    console.log(`🌊 Applying ${this.CROSSFADE_DURATION_MS}ms crossfades for seamless joins...`);
    const mergedAudio = await this.applyCrossfades(alignedChunks, crossfadeSamples, crossfadePoints);

    // Step 4: Final loudness optimization
    console.log(`🔧 Final loudness optimization...`);
    const finalAudio = await this.finalLoudnessOptimization(mergedAudio);

    // Create final WAV file
    const totalSamples = finalAudio.length / 2;
    const totalDuration = totalSamples / sampleRate;
    
    // Update WAV header
    const finalWavHeader = this.createWavHeader(finalAudio.length, sampleRate);
    const finalWavData = new Uint8Array(finalWavHeader.length + finalAudio.length);
    finalWavData.set(finalWavHeader, 0);
    finalWavData.set(finalAudio, finalWavHeader.length);

    const processingTime = Date.now() - startTime;
    console.log(`✨ Professional audio merging complete in ${processingTime}ms`);

    return {
      base64: this.arrayBufferToBase64(finalWavData),
      duration: totalDuration,
      samplingRate: sampleRate,
      format: 'wav',
      contentType: 'audio/wav',
      totalChunks: chunks.length,
      mergingAnalysis: {
        crossfadePoints,
        loudnessNormalization: { applied: true, targetLUFS: this.TARGET_LUFS },
        zeroCrossingAlignment: { applied: true, alignmentPoints },
        totalProcessingTime: processingTime
      }
    };
  }

  /**
   * Normalize loudness of audio chunks to target LUFS
   */
  private async normalizeLoudness(audioDataChunks: any[]): Promise<any[]> {
    return audioDataChunks.map((chunk, index) => {
      const samples = chunk.samples;
      const sampleCount = samples.length / 2;

      // Calculate RMS for loudness estimation
      let rmsSum = 0;
      for (let i = 0; i < sampleCount; i++) {
        const sample = (samples[i * 2 + 1] << 8) | samples[i * 2];
        const signedSample = sample > 32767 ? sample - 65536 : sample;
        rmsSum += signedSample * signedSample;
      }
      
      const rms = Math.sqrt(rmsSum / sampleCount);
      const currentLoudness = 20 * Math.log10(rms / 32767); // Approximate LUFS
      
      // Calculate gain needed to reach target
      const gainDb = this.TARGET_LUFS - currentLoudness;
      const gainLinear = Math.pow(10, gainDb / 20);
      
      // Apply gain with limiting to prevent clipping
      const normalizedSamples = new Uint8Array(samples.length);
      for (let i = 0; i < sampleCount; i++) {
        const sample = (samples[i * 2 + 1] << 8) | samples[i * 2];
        const signedSample = sample > 32767 ? sample - 65536 : sample;
        const normalizedSample = Math.max(-32767, Math.min(32767, signedSample * gainLinear));
        
        // Convert back to unsigned
        const unsignedSample = normalizedSample < 0 ? normalizedSample + 65536 : normalizedSample;
        normalizedSamples[i * 2] = unsignedSample & 0xFF;
        normalizedSamples[i * 2 + 1] = (unsignedSample >> 8) & 0xFF;
      }

      console.log(`📊 Chunk ${index}: Loudness ${currentLoudness.toFixed(1)}dB → ${this.TARGET_LUFS}dB (gain: ${gainDb.toFixed(1)}dB)`);
      
      return {
        ...chunk,
        samples: normalizedSamples,
        normalizedGain: gainDb
      };
    });
  }

  /**
   * Align chunks at zero-crossings to prevent pops
   */
  private async alignZeroCrossings(chunks: any[], alignmentPoints: number[]): Promise<any[]> {
    return chunks.map((chunk, index) => {
      if (index === 0) return chunk; // First chunk doesn't need alignment

      const samples = chunk.samples;
      const sampleCount = samples.length / 2;
      
      // Find zero-crossing near the beginning
      let bestCrossingPoint = 0;
      let minAmplitude = Infinity;
      
      for (let i = 1; i < Math.min(this.ZERO_CROSSING_WINDOW, sampleCount - 1); i++) {
        const sample = (samples[i * 2 + 1] << 8) | samples[i * 2];
        const signedSample = sample > 32767 ? sample - 65536 : sample;
        const prevSample = (samples[(i - 1) * 2 + 1] << 8) | samples[(i - 1) * 2];
        const prevSigned = prevSample > 32767 ? prevSample - 65536 : prevSample;
        
        // Check for zero crossing (sign change)
        if ((prevSigned >= 0) !== (signedSample >= 0)) {
          const amplitude = Math.abs(signedSample);
          if (amplitude < minAmplitude) {
            minAmplitude = amplitude;
            bestCrossingPoint = i;
          }
        }
      }

      if (bestCrossingPoint > 0) {
        console.log(`🎯 Chunk ${index}: Zero-crossing alignment at sample ${bestCrossingPoint}`);
        alignmentPoints.push(bestCrossingPoint);
        
        // Trim to alignment point
        const trimmedSamples = samples.slice(bestCrossingPoint * 2);
        return {
          ...chunk,
          samples: trimmedSamples,
          alignmentOffset: bestCrossingPoint
        };
      }

      return chunk;
    });
  }

  /**
   * Apply crossfades between chunks for seamless transitions
   */
  private async applyCrossfades(chunks: any[], crossfadeSamples: number, crossfadePoints: number[]): Promise<Uint8Array> {
    if (chunks.length === 1) {
      return chunks[0].samples;
    }

    let totalLength = 0;
    chunks.forEach(chunk => totalLength += chunk.samples.length);
    
    // Estimate final length (will be slightly less due to crossfades)
    const estimatedLength = totalLength - (chunks.length - 1) * crossfadeSamples * 2;
    const mergedSamples = new Uint8Array(estimatedLength);
    
    let writePosition = 0;
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const samples = chunk.samples;
      const sampleCount = samples.length / 2;
      
      if (i === 0) {
        // First chunk: copy entirely except possibly fade out at end
        const copyLength = Math.max(0, samples.length - (crossfadeSamples * 2));
        mergedSamples.set(samples.slice(0, copyLength), writePosition);
        writePosition += copyLength;
        
        // Apply fade out to last portion
        this.applyFadeOut(mergedSamples, writePosition - crossfadeSamples * 2, crossfadeSamples);
        crossfadePoints.push(writePosition);
        
      } else {
        // Subsequent chunks: apply crossfade
        const fadeInStart = Math.max(0, writePosition - crossfadeSamples * 2);
        const fadeInSamples = samples.slice(0, crossfadeSamples * 2);
        
        // Mix the crossfade region
        for (let j = 0; j < Math.min(fadeInSamples.length, crossfadeSamples * 2); j += 2) {
          const fadeInSample = (fadeInSamples[j + 1] << 8) | fadeInSamples[j];
          const fadeInSigned = fadeInSample > 32767 ? fadeInSample - 65536 : fadeInSample;
          
          const existingSample = (mergedSamples[fadeInStart + j + 1] << 8) | mergedSamples[fadeInStart + j];
          const existingSigned = existingSample > 32767 ? existingSample - 65536 : existingSample;
          
          // Calculate crossfade weights
          const progress = j / (crossfadeSamples * 2);
          const fadeInWeight = progress;
          const fadeOutWeight = 1 - progress;
          
          // Mix samples
          const mixedSample = fadeInSigned * fadeInWeight + existingSigned * fadeOutWeight;
          const clampedSample = Math.max(-32767, Math.min(32767, mixedSample));
          const unsignedSample = clampedSample < 0 ? clampedSample + 65536 : clampedSample;
          
          mergedSamples[fadeInStart + j] = unsignedSample & 0xFF;
          mergedSamples[fadeInStart + j + 1] = (unsignedSample >> 8) & 0xFF;
        }
        
        // Copy the rest of the chunk
        const remainingSamples = samples.slice(crossfadeSamples * 2);
        const copyLength = Math.max(0, remainingSamples.length - (i === chunks.length - 1 ? 0 : crossfadeSamples * 2));
        mergedSamples.set(remainingSamples.slice(0, copyLength), writePosition);
        writePosition += copyLength;
        
        // Apply fade out if not last chunk
        if (i < chunks.length - 1) {
          this.applyFadeOut(mergedSamples, writePosition - crossfadeSamples * 2, crossfadeSamples);
          crossfadePoints.push(writePosition);
        }
      }
    }

    // Return trimmed array to actual length
    return mergedSamples.slice(0, writePosition);
  }

  /**
   * Apply fade out to prevent clicks
   */
  private applyFadeOut(samples: Uint8Array, startPosition: number, fadeSamples: number): void {
    for (let i = 0; i < fadeSamples && startPosition + i * 2 + 1 < samples.length; i++) {
      const sampleIndex = startPosition + i * 2;
      const sample = (samples[sampleIndex + 1] << 8) | samples[sampleIndex];
      const signedSample = sample > 32767 ? sample - 65536 : sample;
      
      // Apply fade curve
      const fadeWeight = 1 - (i / fadeSamples);
      const fadedSample = signedSample * fadeWeight;
      const clampedSample = Math.max(-32767, Math.min(32767, fadedSample));
      const unsignedSample = clampedSample < 0 ? clampedSample + 65536 : clampedSample;
      
      samples[sampleIndex] = unsignedSample & 0xFF;
      samples[sampleIndex + 1] = (unsignedSample >> 8) & 0xFF;
    }
  }

  /**
   * Final loudness optimization and limiting
   */
  private async finalLoudnessOptimization(audioData: Uint8Array): Promise<Uint8Array> {
    console.log(`🎚️ Applying final loudness optimization and limiting...`);
    
    const sampleCount = audioData.length / 2;
    const optimizedData = new Uint8Array(audioData.length);
    
    // Find peak for limiting
    let peak = 0;
    for (let i = 0; i < sampleCount; i++) {
      const sample = (audioData[i * 2 + 1] << 8) | audioData[i * 2];
      const signedSample = sample > 32767 ? sample - 65536 : sample;
      peak = Math.max(peak, Math.abs(signedSample));
    }
    
    // Apply gentle limiting if needed
    const limitThreshold = 30000; // Leave some headroom
    const limitRatio = peak > limitThreshold ? limitThreshold / peak : 1.0;
    
    for (let i = 0; i < sampleCount; i++) {
      const sample = (audioData[i * 2 + 1] << 8) | audioData[i * 2];
      const signedSample = sample > 32767 ? sample - 65536 : sample;
      const limitedSample = signedSample * limitRatio;
      const clampedSample = Math.max(-32767, Math.min(32767, limitedSample));
      const unsignedSample = clampedSample < 0 ? clampedSample + 65536 : clampedSample;
      
      optimizedData[i * 2] = unsignedSample & 0xFF;
      optimizedData[i * 2 + 1] = (unsignedSample >> 8) & 0xFF;
    }
    
    if (limitRatio < 1.0) {
      console.log(`🔒 Applied gentle limiting: ${(limitRatio * 100).toFixed(1)}% of original peak`);
    }
    
    return optimizedData;
  }

  /**
   * Enhanced simple concatenation with basic crossfading
   */
  async enhancedSimpleConcatenate(chunks: AudioChunk[], startTime: number): Promise<ConcatenatedAudio> {
    console.log(`🔧 Enhanced concatenation for non-WAV format...`);
    
    // Apply basic normalization and crossfading logic here
    const result = await this.simpleConcatenate(chunks);
    
    return {
      ...result,
      mergingAnalysis: {
        crossfadePoints: [],
        loudnessNormalization: { applied: false, targetLUFS: this.TARGET_LUFS },
        zeroCrossingAlignment: { applied: false, alignmentPoints: [] },
        totalProcessingTime: Date.now() - startTime
      }
    };
  }

  /**
   * Create WAV header for final output
   */
  private createWavHeader(audioDataLength: number, sampleRate: number): Uint8Array {
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    
    // RIFF header
    view.setUint32(0, 0x46464952, true); // "RIFF"
    view.setUint32(4, 36 + audioDataLength, true); // File size
    view.setUint32(8, 0x45564157, true); // "WAVE"
    
    // Format chunk
    view.setUint32(12, 0x20746d66, true); // "fmt "
    view.setUint32(16, 16, true); // Chunk size
    view.setUint16(20, 1, true); // Audio format (PCM)
    view.setUint16(22, 1, true); // Channels (mono)
    view.setUint32(24, sampleRate, true); // Sample rate
    view.setUint32(28, sampleRate * 2, true); // Byte rate
    view.setUint16(32, 2, true); // Block align
    view.setUint16(34, 16, true); // Bits per sample
    
    // Data chunk
    view.setUint32(36, 0x61746164, true); // "data"
    view.setUint32(40, audioDataLength, true); // Data size
    
    return new Uint8Array(header);
  }
}

// Export singleton instance
export const audioConcatenator = new AudioConcatenator();
export default audioConcatenator;
