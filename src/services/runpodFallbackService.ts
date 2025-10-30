/**
 * RunPod Fallback Service
 * 
 * Implements intelligent endpoint selection with health checks and fallback logic.
 * 
 * Strategy:
 * 1. Check Endpoint 1 (with Network Volume) health first
 * 2. If workers available, use Endpoint 1 (faster - cached models)
 * 3. If no workers, check Endpoint 2 (no Network Volume) health
 * 4. Use Endpoint 2 if workers available
 * 5. If both show 0 workers, use Endpoint 2 anyway (better cold start availability)
 */

interface RunPodHealthResponse {
  jobs: {
    completed: number;
    failed: number;
    inProgress: number;
    inQueue: number;
    retried: number;
  };
  workers: {
    idle: number;      // Available workers ready to process
    running: number;   // Workers currently processing jobs
  };
}

interface EndpointConfig {
  id: string;
  name: string;
  hasNetworkVolume: boolean;
  baseUrl: string;
}

interface TranscriptionRequest {
  audio_url: string;
  audio_format?: string;
  include_timestamps?: boolean;
  use_diarization?: boolean;
  num_speakers?: number | null;
  speaker_threshold?: number;
  single_speaker_mode?: boolean;
  hf_token?: string;
  filename?: string;
}

interface TranscriptionResponse {
  success: boolean;
  jobId?: string;
  endpoint?: string;
  message?: string;
  error?: string;
}

class RunPodFallbackService {
  private apiKey: string;
  private endpoints: EndpointConfig[];

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    
    // Configure endpoints
    const endpointWithStorage = process.env.RUNPOD_ENDPOINT_WITH_STORAGE;
    const endpointNoStorage = process.env.RUNPOD_ENDPOINT_NO_STORAGE;
    const baseUrl = process.env.RUNPOD_BASE_URL || 'https://api.runpod.ai/v2';

    if (!endpointWithStorage || !endpointNoStorage) {
      throw new Error('RUNPOD_ENDPOINT_WITH_STORAGE and RUNPOD_ENDPOINT_NO_STORAGE are required');
    }

    this.endpoints = [
      {
        id: endpointWithStorage,
        name: 'Primary (with Network Volume)',
        hasNetworkVolume: true,
        baseUrl: `${baseUrl}/${endpointWithStorage}`
      },
      {
        id: endpointNoStorage,
        name: 'Backup (no Network Volume)',
        hasNetworkVolume: false,
        baseUrl: `${baseUrl}/${endpointNoStorage}`
      }
    ];

    console.log('🔧 ===== RUNPOD FALLBACK SERVICE CONFIGURATION =====');
    console.log('🔑 API Key (first 10 chars):', this.apiKey.substring(0, 10) + '...');
    console.log('📍 Endpoint 1 (Primary):', this.endpoints[0].name, '-', this.endpoints[0].baseUrl);
    console.log('📍 Endpoint 2 (Backup):', this.endpoints[1].name, '-', this.endpoints[1].baseUrl);
  }

  /**
   * Check health of a specific endpoint
   */
  private async checkEndpointHealth(endpoint: EndpointConfig): Promise<RunPodHealthResponse | null> {
    try {
      console.log(`🔍 Checking health for ${endpoint.name}...`);
      
      const healthUrl = `${endpoint.baseUrl}/health`;
      console.log(`🔗 Health check URL: ${healthUrl}`);

      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn(`⚠️ Health check failed for ${endpoint.name}: ${response.status} ${response.statusText}`);
        return null;
      }

      const healthData: RunPodHealthResponse = await response.json();
      console.log(`✅ Health check successful for ${endpoint.name}:`, {
        idle: healthData.workers.idle,
        running: healthData.workers.running,
        totalWorkers: healthData.workers.idle + healthData.workers.running,
        completedJobs: healthData.jobs.completed,
        failedJobs: healthData.jobs.failed
      });

      return healthData;
    } catch (error) {
      console.error(`❌ Health check error for ${endpoint.name}:`, error);
      return null;
    }
  }

  /**
   * Check if endpoint has available workers
   */
  private hasAvailableWorkers(healthData: RunPodHealthResponse): boolean {
    return healthData.workers.idle > 0 || healthData.workers.running > 0;
  }

  /**
   * Submit transcription request to specific endpoint
   */
  private async submitToEndpoint(endpoint: EndpointConfig, request: TranscriptionRequest, webhookUrl: string): Promise<TranscriptionResponse> {
    try {
      console.log(`📤 Submitting transcription to ${endpoint.name}...`);
      
      const payload = {
        input: request,
        webhook: webhookUrl
      };

      console.log(`🔗 Submitting to: ${endpoint.baseUrl}/run`);
      console.log(`📤 Payload:`, JSON.stringify(payload, null, 2));

      const response = await fetch(`${endpoint.baseUrl}/run`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const jobData = await response.json();
      console.log(`✅ Job submitted successfully to ${endpoint.name}:`, jobData);

      if (!jobData.id) {
        throw new Error(`No job ID returned: ${JSON.stringify(jobData)}`);
      }

      return {
        success: true,
        jobId: jobData.id,
        endpoint: endpoint.name,
        message: `Job submitted to ${endpoint.name}`
      };

    } catch (error) {
      console.error(`❌ Failed to submit to ${endpoint.name}:`, error);
      return {
        success: false,
        endpoint: endpoint.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Main transcription method with intelligent fallback
   */
  async transcribeWithFallback(request: TranscriptionRequest, webhookUrl: string): Promise<TranscriptionResponse> {
    console.log('🚀 ===== STARTING TRANSCRIPTION WITH FALLBACK =====');
    console.log('📋 Request details:', {
      audio_url: request.audio_url.substring(0, 50) + '...',
      filename: request.filename,
      use_diarization: request.use_diarization
    });

    // Step 1: Check Main Endpoint (Primary - with Network Volume) health first
    console.log('🔍 Step 1: Checking main endpoint health...');
    const mainHealth = await this.checkEndpointHealth(this.endpoints[0]);

    if (mainHealth && this.hasAvailableWorkers(mainHealth)) {
      console.log('✅ Main endpoint has available workers - using it for faster processing');
      const result = await this.submitToEndpoint(this.endpoints[0], request, webhookUrl);
      
      if (result.success) {
        console.log('🎯 Successfully submitted to main endpoint (with Network Volume)');
        return result;
      } else {
        console.warn('⚠️ Main endpoint submission failed, trying backup...');
      }
    } else {
      console.log('⚠️ Main endpoint has no available workers or health check failed');
    }

    // Step 2: Main endpoint is throttled/unavailable - use backup endpoint
    console.log('🔄 Step 2: Main endpoint unavailable - using backup endpoint');
    const result = await this.submitToEndpoint(this.endpoints[1], request, webhookUrl);
    
    if (result.success) {
      console.log('🎯 Successfully submitted to backup endpoint (no Network Volume)');
      return result;
    } else {
      console.error('❌ Both endpoints failed');
      return {
        success: false,
        error: 'All RunPod endpoints are unavailable'
      };
    }
  }

  /**
   * Get endpoint status summary for monitoring
   */
  async getEndpointStatus(): Promise<{
    primary: { name: string; health: RunPodHealthResponse | null; available: boolean };
    backup: { name: string; health: RunPodHealthResponse | null; available: boolean };
  }> {
    console.log('📊 Getting endpoint status summary...');

    const [primaryHealth, backupHealth] = await Promise.all([
      this.checkEndpointHealth(this.endpoints[0]),
      this.checkEndpointHealth(this.endpoints[1])
    ]);

    return {
      primary: {
        name: this.endpoints[0].name,
        health: primaryHealth,
        available: primaryHealth ? this.hasAvailableWorkers(primaryHealth) : false
      },
      backup: {
        name: this.endpoints[1].name,
        health: backupHealth,
        available: backupHealth ? this.hasAvailableWorkers(backupHealth) : false
      }
    };
  }

  /**
   * Test connection to both endpoints
   */
  async testConnections(): Promise<{
    primary: boolean;
    backup: boolean;
    details: any;
  }> {
    console.log('🧪 Testing connections to both endpoints...');

    const [primaryHealth, backupHealth] = await Promise.all([
      this.checkEndpointHealth(this.endpoints[0]),
      this.checkEndpointHealth(this.endpoints[1])
    ]);

    return {
      primary: primaryHealth !== null,
      backup: backupHealth !== null,
      details: {
        primary: primaryHealth,
        backup: backupHealth
      }
    };
  }
}

// Lazy singleton instance - only created when first used
// This prevents build-time errors when env vars aren't available during build
let runpodFallbackServiceInstance: RunPodFallbackService | null = null;

const getRunpodFallbackService = (): RunPodFallbackService => {
  if (!runpodFallbackServiceInstance) {
    const apiKey = process.env.RUNPOD_API_KEY;
    if (!apiKey) {
      throw new Error('RUNPOD_API_KEY environment variable is required');
    }
    runpodFallbackServiceInstance = new RunPodFallbackService(apiKey);
  }
  return runpodFallbackServiceInstance;
};

// Proxy object that lazily creates the service only when a method is called
// This prevents module-level execution during build time
export const runpodFallbackService = new Proxy({} as RunPodFallbackService, {
  get(target, prop) {
    const service = getRunpodFallbackService();
    const value = (service as any)[prop];
    if (typeof value === 'function') {
      return value.bind(service);
    }
    return value;
  }
});

export default runpodFallbackService;
