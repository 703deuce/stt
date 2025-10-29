# DeepSeek Background Processing System

## Overview

This document describes the new background processing system for DeepSeek API operations (AI chat, summary, content repurposing) that can handle 500+ concurrent users independently from the transcription system.

## System Architecture

### 1. **DeepSeek Job Mapping Service** (`deepseekJobMappingService.ts`)
- **Purpose**: Persistent storage of DeepSeek job metadata in Firestore
- **Key Features**:
  - Stores job mappings with user ID, job type, and parameters
  - Tracks job status (pending, processing, completed, failed)
  - Handles job resumption after server restarts
  - Automatic cleanup of old completed jobs

### 2. **DeepSeek Background Processing Service** (`deepseekBackgroundProcessingService.ts`)
- **Purpose**: Manages background processing of DeepSeek API calls
- **Key Features**:
  - Queue-based processing with configurable concurrency limits
  - Real-time job status updates via WebSocket
  - Automatic job resumption for interrupted processes
  - Rate limiting and error handling

### 3. **API Endpoints**
- **`/api/deepseek/chat`**: Start AI chat jobs
- **`/api/deepseek/summary`**: Start AI summary jobs  
- **`/api/deepseek/content-generation`**: Start content repurposing jobs
- **`/api/webhooks/deepseek`**: Job status checking and completion notifications

### 4. **Client-Side Hooks** (`useDeepSeekJobs.ts`)
- **`useDeepSeekJobs`**: Manage multiple jobs for a user
- **`useDeepSeekJob`**: Track a specific job with real-time updates

## Key Benefits

### ✅ **Scalability**
- **Concurrent Processing**: Handles up to 5 concurrent DeepSeek API calls
- **Queue Management**: Jobs are queued and processed as capacity allows
- **Rate Limiting**: Respects DeepSeek API rate limits (60 requests/minute)

### ✅ **Reliability**
- **Persistent Storage**: Jobs survive server restarts and deployments
- **Automatic Resumption**: Interrupted jobs resume automatically
- **Error Handling**: Comprehensive error handling and retry logic

### ✅ **User Experience**
- **Real-time Updates**: WebSocket notifications for job completion
- **Background Processing**: Users can leave and return to find completed jobs
- **Progress Tracking**: Real-time progress updates

### ✅ **Separation of Concerns**
- **Independent System**: Completely separate from transcription processing
- **No Interference**: DeepSeek operations don't affect transcription system
- **Modular Design**: Easy to maintain and extend

## DeepSeek API Capacity Analysis

### **Current Limits**
- **Rate Limits**: ~60 requests/minute per API key
- **Processing Time**: 2-10 seconds per request
- **Concurrent Requests**: Limited by API key

### **System Capacity**
- **Max Concurrent Jobs**: 5 (configurable)
- **Queue Capacity**: Unlimited (memory-based)
- **User Capacity**: 500+ users (jobs queued and processed as capacity allows)

### **Scaling Strategy**
1. **Horizontal Scaling**: Multiple API keys for higher throughput
2. **Queue Management**: Jobs processed in order of priority
3. **Rate Limiting**: Automatic throttling to respect API limits

## Usage Examples

### **Starting a Chat Job**
```typescript
import { useDeepSeekJobs } from '@/hooks/useDeepSeekJobs';

const { startJob } = useDeepSeekJobs({ userId: 'user123' });

const jobId = await startJob({
  jobType: 'chat',
  transcriptionId: 'trans123',
  transcriptionText: 'Full transcription text...',
  prompt: 'What are the main topics discussed?'
});
```

### **Starting a Summary Job**
```typescript
const jobId = await startJob({
  jobType: 'summary',
  transcriptionId: 'trans123',
  transcriptionText: 'Full transcription text...',
  prompt: 'brief' // or 'detailed', 'key_points', 'action_items'
});
```

### **Starting Content Generation**
```typescript
const jobId = await startJob({
  jobType: 'content_generation',
  transcriptionId: 'trans123',
  transcriptionText: 'Full transcription text...',
  prompt: 'Create a blog post from this interview',
  contentTypeId: 'blog_post',
  contentTypeName: 'Blog Post',
  contentCategory: 'marketing',
  maxWords: 500
});
```

### **Tracking Job Status**
```typescript
import { useDeepSeekJob } from '@/hooks/useDeepSeekJobs';

const { job, isLoading } = useDeepSeekJob({ 
  jobId: 'deepseek_123', 
  userId: 'user123' 
});

if (job?.status === 'completed') {
  console.log('Result:', job.result);
}
```

## Migration Strategy

### **Phase 1: Parallel Operation**
- New system runs alongside existing synchronous methods
- Gradual migration of components to use background processing
- A/B testing to ensure reliability

### **Phase 2: Full Migration**
- All DeepSeek operations use background processing
- Legacy synchronous methods marked as deprecated
- Performance monitoring and optimization

### **Phase 3: Optimization**
- Fine-tune concurrency limits based on usage patterns
- Implement advanced queue prioritization
- Add analytics and monitoring

## Configuration

### **Environment Variables**
```bash
# DeepSeek API Key
DEEPSEEK_API_KEY=sk-your-api-key-here

# Optional: Custom API endpoint
DEEPSEEK_API_ENDPOINT=https://api.deepseek.com/v1/chat/completions
```

### **Service Configuration**
```typescript
// In deepseekBackgroundProcessingService.ts
private maxConcurrentJobs = 5; // Adjust based on API limits
private refreshInterval = 5000; // Job status check interval
```

## Monitoring and Analytics

### **Key Metrics**
- **Job Success Rate**: Percentage of completed jobs
- **Average Processing Time**: Time from start to completion
- **Queue Length**: Number of pending jobs
- **API Usage**: Requests per minute, token usage

### **Error Tracking**
- **Failed Jobs**: Automatic error logging and user notification
- **API Errors**: Rate limit exceeded, authentication failures
- **System Errors**: Network issues, service unavailability

## Future Enhancements

### **Planned Features**
1. **Job Prioritization**: VIP users get priority processing
2. **Batch Processing**: Group similar jobs for efficiency
3. **Caching**: Cache common responses to reduce API calls
4. **Analytics Dashboard**: Real-time system monitoring

### **Scaling Options**
1. **Multiple API Keys**: Distribute load across multiple DeepSeek accounts
2. **Regional Processing**: Deploy processing nodes in different regions
3. **Hybrid Processing**: Combine DeepSeek with other AI providers

## Conclusion

The new DeepSeek background processing system provides a robust, scalable solution for handling AI operations at scale. It ensures that users can start jobs, leave the application, and return to find completed results, making it suitable for production use with 500+ concurrent users.

The system is designed to be completely independent from the transcription system, ensuring that both can operate at full capacity without interference.
