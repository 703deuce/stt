# Firestore Database Setup Guide

This guide explains how to set up and configure Firestore (Firebase's NoSQL database) for your Transovo AI application.

## Overview

Firestore will store all the metadata, transcripts, and user information, while Firebase Storage handles the actual audio files. This separation provides:
- **Fast queries** for transcripts and metadata
- **Efficient storage** for large audio files
- **User isolation** and security
- **Scalability** for many users

## Database Structure

### Collection Hierarchy
```
users/{userId}/
├── profile/
│   └── {profileId} - User profile and preferences
├── stt/
│   ├── {audioId1} - Speech-to-Text record
│   ├── {audioId2} - Speech-to-Text record
│   └── ...
└── tts/
    ├── {ttsId1} - Text-to-Speech record
    ├── {ttsId2} - Text-to-Speech record
    └── ...
```

### Data Models

#### STT Record (Speech-to-Text)
```json
{
  "user_id": "user123",
  "audio_id": "user_user123_20241230_123456_abc123.wav",
  "file_url": "https://firebasestorage.googleapis.com/...",
  "transcript": "Hello, welcome to the demo.",
  "timestamp": "2024-12-30T12:34:56Z",
  "duration": 12.5,
  "confidence": 0.97,
  "language": "en",
  "status": "completed",
  "type": "stt",
  "tags": ["demo", "welcome"],
  "metadata": {
    "speaker_count": 1,
    "audio_quality": "high"
  }
}
```

#### TTS Record (Text-to-Speech)
```json
{
  "user_id": "user123",
  "tts_id": "user_user123_tts_voice1_20241230_123456_abc123.wav",
  "input_text": "This is a text-to-speech test.",
  "audio_url": "https://firebasestorage.googleapis.com/...",
  "timestamp": "2024-12-30T12:35:00Z",
  "voice": "female_en_us",
  "language": "en",
  "status": "completed",
  "type": "tts",
  "duration": 8.2,
  "settings": {
    "speed": 1.0,
    "pitch": 1.0
  }
}
```

#### User Profile
```json
{
  "user_id": "user123",
  "email": "user@example.com",
  "display_name": "John Doe",
  "created_at": "2024-12-30T10:00:00Z",
  "last_login": "2024-12-30T12:00:00Z",
  "preferences": {
    "default_language": "en",
    "default_voice": "female_en_us",
    "auto_save": true
  },
  "usage_stats": {
    "total_transcriptions": 25,
    "total_tts_generations": 15,
    "total_audio_duration": 180.5
  }
}
```

## Firebase Console Setup

### 1. Enable Firestore Database
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`aitts-d4c6d`)
3. Navigate to **Firestore Database** in the left sidebar
4. Click **Create Database**
5. Choose **Start in test mode** (we'll add security rules later)
6. Select a location (choose the closest to your users)
7. Click **Done**

### 2. Configure Security Rules
Replace the default rules with these secure rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 3. Create Indexes (Optional)
For better query performance, create these composite indexes:

1. **STT Records by Status and Timestamp**
   - Collection: `users/{userId}/stt`
   - Fields: `status` (Ascending), `timestamp` (Descending)

2. **TTS Records by Status and Timestamp**
   - Collection: `users/{userId}/tts`
   - Fields: `status` (Ascending), `timestamp` (Descending)

3. **Records by Date Range**
   - Collection: `users/{userId}/stt` and `users/{userId}/tts`
   - Fields: `timestamp` (Ascending), `timestamp` (Descending)

## Code Integration

### 1. Database Service
The `databaseService.ts` file provides all the CRUD operations:

```typescript
import { databaseService } from '../services/databaseService';

// Create STT record
const recordId = await databaseService.createSTTRecord({
  audio_id: 'filename.wav',
  file_url: 'https://storage.googleapis.com/...',
  transcript: 'Hello world',
  duration: 5.2,
  language: 'en',
  status: 'completed'
});

// Get user's STT records
const records = await databaseService.getSTTRecords(50);

// Search transcripts
const searchResults = await databaseService.searchSTTRecords('hello');
```

### 2. Firebase Service Integration
The `firebaseService.ts` now automatically creates database records:

```typescript
// Upload audio file
const result = await firebaseService.uploadAudioFile(file);
if (result.success && result.recordId) {
  // File uploaded and database record created
  console.log('Record ID:', result.recordId);
}

// Update with transcription results
await firebaseService.updateSTTRecord(
  result.recordId!, 
  transcript, 
  duration, 
  confidence
);
```

## Storage Organization

### File Structure
```
transcription_uploads/
├── user123/
│   ├── stt/
│   │   ├── user_user123_20241230_123456_abc123.wav
│   │   └── user_user123_20241230_123457_def456.wav
│   ├── tts/
│   │   ├── user_user123_tts_voice1_20241230_123500_ghi789.wav
│   │   └── user_user123_tts_voice2_20241230_123501_jkl012.wav
│   └── transcripts/
│       ├── user_user123_20241230_123456_abc123_transcript.txt
│       └── user_user123_20241230_123457_def456_transcript.txt
└── user456/
    ├── stt/
    └── tts/
```

### Benefits of This Structure
- **User Isolation**: Each user has their own folder
- **Type Separation**: STT and TTS files are clearly separated
- **Easy Cleanup**: Can delete entire user folders when needed
- **Scalable**: No limit on number of users or files

## Usage Examples

### 1. Complete Transcription Flow
```typescript
// 1. Upload audio file
const uploadResult = await firebaseService.uploadAudioFile(audioFile);

// 2. Process with Whisper API
const transcript = await whisperAPI.transcribe(uploadResult.url!);

// 3. Update database record
await firebaseService.updateSTTRecord(
  uploadResult.recordId!,
  transcript.text,
  transcript.duration,
  transcript.confidence
);

// 4. Upload transcript text file
await firebaseService.uploadTranscriptionText(
  transcript.text, 
  uploadResult.filename!
);
```

### 2. Complete TTS Flow
```typescript
// 1. Generate TTS audio
const audioBlob = await ttsAPI.generate(text, voice);

// 2. Upload to Firebase Storage and create database record
const result = await firebaseService.uploadTTSAudio(
  audioBlob, 
  text, 
  voice
);

// 3. Audio is now stored and linked in database
console.log('TTS generated:', result.recordId);
```

### 3. User Dashboard Data
```typescript
// Get user statistics
const stats = await databaseService.getUserStats();
console.log('Total transcriptions:', stats.total_transcriptions);
console.log('Total TTS generations:', stats.total_tts_generations);
console.log('Total audio duration:', stats.total_audio_duration);

// Get recent activity
const recentActivity = stats.recent_activity;
recentActivity.forEach(record => {
  if (record.type === 'stt') {
    console.log('STT:', record.transcript);
  } else {
    console.log('TTS:', record.input_text);
  }
});
```

## Security Features

### 1. User Authentication Required
- All database operations require Firebase Auth
- Users can only access their own data
- No cross-user data access possible

### 2. Data Validation
- All records include user_id for verification
- Timestamps are server-generated
- File URLs are validated before storage

### 3. Access Control
- Firestore rules enforce user isolation
- Storage rules prevent unauthorized access
- API endpoints require authentication

## Performance Optimization

### 1. Indexing Strategy
- Index on `status` and `timestamp` for fast queries
- Use compound queries sparingly
- Limit query results with `limit()`

### 2. Data Pagination
```typescript
// Get first 20 records
const firstPage = await databaseService.getSTTRecords(20);

// For next page, use the last document as cursor
const lastDoc = firstPage[firstPage.length - 1];
// Implement cursor-based pagination
```

### 3. Caching Strategy
- Cache frequently accessed user profiles
- Store recent records in local state
- Use React Query or SWR for data fetching

## Monitoring and Analytics

### 1. Firestore Usage
- Monitor read/write operations
- Track storage costs
- Set up alerts for high usage

### 2. User Analytics
- Track transcription counts per user
- Monitor TTS generation patterns
- Analyze audio duration trends

### 3. Performance Metrics
- Query response times
- Storage upload/download speeds
- Error rates and types

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Check Firestore security rules
   - Verify user authentication
   - Ensure user_id matches auth.uid

2. **Missing Indexes**
   - Check Firebase console for index errors
   - Create required composite indexes
   - Wait for index building to complete

3. **Large Query Results**
   - Use `limit()` to restrict results
   - Implement pagination
   - Consider data archiving for old records

### Debug Mode
Enable detailed logging in development:

```typescript
// In databaseService.ts
console.log('🔍 Database operation:', {
  operation: 'createSTTRecord',
  userId,
  data: { audio_id, file_url, transcript }
});
```

## Next Steps

### 1. Immediate Actions
- [ ] Enable Firestore in Firebase Console
- [ ] Set up security rules
- [ ] Test basic CRUD operations
- [ ] Verify user isolation

### 2. Advanced Features
- [ ] Implement search functionality
- [ ] Add data export/import
- [ ] Set up automated backups
- [ ] Add data analytics dashboard

### 3. Production Considerations
- [ ] Set up monitoring and alerts
- [ ] Implement rate limiting
- [ ] Add data retention policies
- [ ] Plan for data migration

## Support

If you encounter issues:
1. Check Firebase Console for errors
2. Verify security rules configuration
3. Test with simple queries first
4. Check browser console for detailed errors
5. Review Firestore documentation for best practices

The database is now fully integrated with your authentication and storage systems, providing a robust foundation for your Transovo AI application!
