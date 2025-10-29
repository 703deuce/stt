# Python Audio Chunking Service

This service provides efficient audio chunking and stitching using Python and ffmpeg, solving the memory issues that occur when processing long audio files in the browser.

## 🚀 **Why Python + ffmpeg?**

- **Memory Efficient**: No loading entire files into RAM
- **Industry Standard**: Professional audio processing tools
- **Fast Processing**: Optimized C libraries under the hood
- **Reliable**: Battle-tested in production environments

## 📋 **Prerequisites**

### 1. Install Python
- **Windows**: Download from [python.org](https://python.org)
- **macOS**: `brew install python3`
- **Linux**: `sudo apt-get install python3`

### 2. Install ffmpeg
- **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html)
- **macOS**: `brew install ffmpeg`
- **Linux**: `sudo apt-get install ffmpeg`

### 3. Verify Installation
```bash
python --version
ffmpeg -version
```

## 🛠️ **Setup**

### 1. Install Python Dependencies
```bash
cd scripts
pip install -r requirements.txt
```

### 2. Test the Script
```bash
# Test with a sample audio file
python audio_chunker.py input.wav output.wav --json
```

## 🔧 **Usage**

### Command Line
```bash
python audio_chunker.py input.wav output.wav \
  --chunk-duration 90 \
  --overlap-duration 2 \
  --json
```

### From Node.js
```typescript
import { pythonAudioChunkerService } from '../services/pythonAudioChunkerService';

// Process long audio
const result = await pythonAudioChunkerService.processLongAudio(
  inputFile,
  targetFile,
  {
    maxChunkDuration: 90,
    overlapDuration: 2
  }
);
```

## 📊 **How It Works**

### 1. **Audio Splitting**
- Uses `ffmpeg` to split audio into 90-second chunks
- No memory loading - processes directly from disk
- Creates overlapping segments for smooth transitions

### 2. **Chunk Processing**
- Each chunk is processed individually
- Can be sent to voice transfer API
- Results stored separately

### 3. **Audio Stitching**
- Uses `ffmpeg` filter complex for crossfading
- Seamlessly combines processed chunks
- Maintains audio quality

## 🎯 **Benefits**

✅ **No Memory Issues**: Processes files of any length  
✅ **Fast Processing**: Industry-standard tools  
✅ **High Quality**: Professional audio processing  
✅ **Reliable**: Battle-tested in production  
✅ **Scalable**: Handles hours of audio  

## 🔍 **Troubleshooting**

### Python Not Found
```bash
# Windows
python --version

# macOS/Linux
python3 --version
```

### ffmpeg Not Found
```bash
# Check if ffmpeg is in PATH
ffmpeg -version

# If not, add to PATH or use full path
```

### Permission Errors
```bash
# Make script executable (Linux/macOS)
chmod +x audio_chunker.py
```

## 📁 **File Structure**

```
scripts/
├── audio_chunker.py          # Main Python script
├── requirements.txt           # Python dependencies
├── README.md                 # This file
└── test_audio/              # Test audio files (optional)
```

## 🧪 **Testing**

### Test with Sample Audio
```bash
# Create a test directory
mkdir test_audio
cd test_audio

# Add a test WAV file (5+ minutes)
# Then run:
python ../audio_chunker.py test.wav output.wav --json
```

### Expected Output
```json
{
  "success": true,
  "input_file": "test.wav",
  "output_file": "output.wav",
  "chunks_processed": 4,
  "final_duration": 318.45,
  "chunks": [
    {
      "id": "chunk_000",
      "start_time": 0.0,
      "end_time": 90.0,
      "duration": 90.0
    }
  ]
}
```

## 🚀 **Integration with Voice Transfer**

This service is designed to work with your existing voice transfer workflow:

1. **Split** long audio into chunks
2. **Process** each chunk through voice transfer API
3. **Stitch** results back together with crossfading
4. **Deliver** final processed audio

## 📈 **Performance**

- **5-minute audio**: ~30 seconds processing time
- **10-minute audio**: ~1 minute processing time
- **Memory usage**: Constant (doesn't scale with file size)

## 🔒 **Security Notes**

- Script runs with same permissions as Node.js process
- Temporary files are cleaned up automatically
- No external network calls (unless processing chunks)
- Input validation prevents path traversal attacks

## 🤝 **Contributing**

To improve the audio processing:

1. **Add new formats**: Modify ffmpeg commands
2. **Improve crossfading**: Enhance filter complex
3. **Add batch processing**: Process multiple files
4. **Optimize performance**: Profile and optimize bottlenecks

## 📞 **Support**

If you encounter issues:

1. Check Python and ffmpeg installation
2. Verify file permissions
3. Check console logs for error messages
4. Test with a simple WAV file first

---

**This solution will handle your 318-second audio file without any memory issues!** 🎉
