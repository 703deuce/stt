# Transovo AI 🎤

A comprehensive Next.js application for AI-powered voice transcription, text-to-speech generation, and voice cloning using Firebase Storage and external APIs.

## ✨ Features

### 🎯 **Transcription**
- Upload WAV audio files directly to Firebase Storage
- Automatic transcription using RunPod API
- Real-time progress tracking and status updates
- Support for various audio formats and configurations

### 🗣️ **Text-to-Speech (TTS)**
- 169+ pre-built AI voices across multiple categories
- Custom cloned voice integration
- Multi-speaker combinations
- Advanced generation settings (temperature, top_p, top_k)
- Audio preview and download capabilities

### 🎭 **Voice Cloning**
- Upload custom WAV files for voice cloning
- Automatic transcription of cloned voices
- Firebase Storage integration for secure file management
- Voice metadata management and organization

### 🎨 **Voice Gallery**
- Browse and search through all available voices
- Category-based organization and filtering
- Gender and language filters
- Audio previews for regular voices
- Quick navigation to TTS generation

## 🚀 Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS 3
- **Storage**: Firebase Storage
- **APIs**: RunPod (Transcription), Higgs Audio V2 (TTS)
- **Icons**: Lucide React
- **State Management**: React Hooks

## 📁 Project Structure

```
transcription-app/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Dashboard
│   │   ├── transcriptions/    # Transcription page
│   │   ├── tts/              # TTS generation page
│   │   ├── voice-clone/      # Voice cloning page
│   │   └── voice-gallery/    # Voice gallery page
│   ├── components/            # Reusable UI components
│   │   ├── Layout.tsx        # Main layout with sidebar
│   │   ├── TranscriptionUpload.tsx
│   │   ├── TTSGenerator.tsx
│   │   └── VoiceCloningInterface.tsx
│   ├── services/             # API and business logic
│   │   ├── transcriptionService.ts
│   │   ├── ttsService.ts
│   │   └── voiceCloningService.ts
│   ├── hooks/                # Custom React hooks
│   │   └── useTTS.ts
│   ├── data/                 # Static data and configurations
│   │   └── voices.ts
│   └── config/               # Configuration files
│       └── firebase.ts
├── public/                   # Static assets
│   └── voices/              # Voice preview audio files
└── package.json
```

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/703deuce/tts.git
   cd tts/transcription-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Update `src/config/firebase.ts` with your Firebase credentials
   - Ensure Firebase Storage is enabled

4. **Configure API Keys**
   - Set up RunPod API for transcription
   - Configure Higgs Audio V2 API for TTS

5. **Start development server**
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Firebase Setup
```typescript
// src/config/firebase.ts
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-domain.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-bucket.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### API Configuration
- **RunPod**: Configure transcription endpoint and API key
- **Higgs Audio V2**: Set up TTS API credentials

## 📱 Usage

### Transcription
1. Navigate to `/transcriptions`
2. Upload a WAV file
3. Configure transcription settings
4. Start transcription and monitor progress

### TTS Generation
1. Go to `/tts`
2. Select a voice (regular or custom)
3. Enter your text
4. Configure generation parameters
5. Generate and download audio

### Voice Cloning
1. Visit `/voice-clone`
2. Upload a WAV file
3. Provide voice name and description
4. Monitor upload and transcription progress
5. Use cloned voice in TTS generation

### Voice Gallery
1. Browse `/voice-gallery`
2. Filter by category, gender, or search
3. Preview voices (regular voices only)
4. Use voices directly in TTS generation

## 🔒 Security Features

- Firebase Storage for secure file management
- Environment variable protection for API keys
- Input validation and sanitization
- Secure file upload restrictions

## 🚀 Deployment

### Quick Deploy to Vercel
```bash
npm run build
vercel --prod
```

### Comprehensive Deployment Guide
📖 **[See README_DEPLOYMENT.md](./README_DEPLOYMENT.md)** for complete deployment, backup, and rollback procedures.

Includes:
- ✅ Zero-downtime deployment process
- ✅ Automated backup system
- ✅ Safe database migration workflow
- ✅ Rollback procedures
- ✅ Vercel + Firebase integration guide

### Backup System
The app includes an automated backup system:

```bash
npm run backup          # Create manual backup
npm run list-backups    # List all backups
npm run restore -- <id> # Restore from backup
```

**Daily automated backups** are configured via Vercel Cron.

### Other Platforms
```bash
npm run build
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 🛡️ Backup & Deployment

This application includes:
- **Automated daily backups** of all Firestore data
- **Zero-downtime deployments** with Vercel
- **Database migration system** for safe schema updates
- **Instant rollback** capabilities for code and data

See **[README_DEPLOYMENT.md](./README_DEPLOYMENT.md)** for complete documentation.

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
- Check the [Issues](https://github.com/703deuce/tts/issues) page
- Review the documentation above
- Ensure all dependencies are properly installed

## 🎉 Acknowledgments

- Next.js team for the amazing framework
- Firebase for secure storage solutions
- RunPod for transcription capabilities
- Higgs Audio V2 for TTS generation
- Tailwind CSS for beautiful styling

---

**Transovo AI** - Empowering creators with AI-powered voice technology 🎤✨
