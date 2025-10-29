# Download System Documentation

## Overview
Comprehensive download system for transcription exports with support for multiple formats and advanced subtitle customization.

## Supported Formats

### 1. **TXT (Plain Text)**
- Simple text format compatible with all text editors
- Options:
  - Include/exclude metadata (title, duration)
  - Include/exclude speaker names
  - Include/exclude timestamps
- Best for: Quick sharing, editing, or archiving

### 2. **PDF (Portable Document Format)**
- Professional formatted PDF with styling
- Features:
  - Title and metadata header
  - Color-coded speaker labels (blue)
  - Proper pagination
  - Timestamps if enabled
- Best for: Professional reports, presentations, archiving

### 3. **DOCX (Microsoft Word)**
- Fully editable Word document
- Features:
  - Formatted headings
  - Color-coded speakers
  - Proper paragraph spacing
  - Editable content
- Best for: Further editing, collaboration, professional documentation

### 4. **SRT (SubRip Subtitle)**
- Standard subtitle format for video players
- Features:
  - Sequential numbering
  - Precise timing (hours:minutes:seconds,milliseconds)
  - Intelligent segmentation
  - Optional speaker labels
- Best for: Video subtitles, VLC, YouTube, most video players

### 5. **VTT (WebVTT)**
- Web Video Text Tracks format
- Features:
  - Web-optimized subtitle format
  - HTML5 video compatibility
  - Same segmentation as SRT
  - Optional speaker labels
- Best for: Web videos, HTML5 players, modern browsers

## Advanced Subtitle Settings

### Segmentation Controls

#### **Max Words Per Segment**
- Range: 5-30 words
- Default: 15 words
- Controls how many words appear in each subtitle segment
- Lower values = shorter, more frequent captions
- Higher values = longer, less frequent captions

#### **Max Duration Per Segment**
- Range: 2-10 seconds
- Default: 5 seconds
- Maximum time a single subtitle stays on screen
- Prevents overly long segments
- Ensures readability

#### **Max Characters Per Segment**
- Range: 20-100 characters
- Default: 42 characters
- Controls visual line length
- Industry standard: 42 characters
- Prevents text overflow on screens

#### **Sentence-Aware Segmentation**
- Toggle: On/Off
- Default: On
- When enabled:
  - New sentences always start a new segment
  - Prevents sentences from being split across segments
  - Improves natural reading flow
- When disabled:
  - Segments break only on word/duration/character limits
  - More compact subtitles

## How Segmentation Works

The subtitle generation algorithm:

1. **Processes each speaker segment** from the diarized transcript
2. **Extracts word-level timestamps** for precise timing
3. **Builds segments** by adding words until any limit is hit:
   - Word count reaches `maxWordsPerSegment`
   - Duration reaches `maxDurationPerSegment`
   - Character count reaches `maxCharsPerSegment`
   - Sentence ending detected (if sentence-aware is enabled)
4. **Creates new segment** when limit is reached
5. **Outputs** formatted SRT or VTT with proper timing

## Speaker Name Integration

All download formats support the speaker mapping system:
- Uses custom speaker names set via "Rename Speakers" feature
- Falls back to default names (Speaker_00, Speaker_01) if not mapped
- Consistent across all formats

## Usage

### From Transcription Detail Page
1. Click "Download Transcript" button
2. Select desired format (TXT, PDF, DOCX, SRT, VTT)
3. Configure options:
   - For documents: metadata, speakers, timestamps
   - For subtitles: segmentation settings
4. Click "Download [FORMAT]"

### From Transcription Results Component
1. Click "Download" button in metadata section
2. Same modal and options as above

## Technical Implementation

### Dependencies
- **jsPDF**: PDF generation
- **docx**: Microsoft Word document generation
- **file-saver**: Client-side file downloads

### Key Components
- `DownloadModal.tsx`: Main modal component with all logic
- Integrated into:
  - `/transcriptions/[id]/page.tsx` (detail view)
  - `TranscriptionResults.tsx` (results component)

### Time Formatting
- **SRT**: `HH:MM:SS,mmm` (e.g., `00:01:23,456`)
- **VTT**: `HH:MM:SS.mmm` (e.g., `00:01:23.456`)
- **Display**: `M:SS` (e.g., `1:23`)

## Best Practices

### For Video Subtitles (SRT/VTT)
- **Max Words**: 12-15 (easier to read)
- **Max Duration**: 3-5 seconds (standard for video)
- **Max Characters**: 42 (industry standard)
- **Sentence-Aware**: ON (natural flow)

### For Professional Documents (PDF/DOCX)
- **Include Metadata**: ON (context and credibility)
- **Include Speakers**: ON (clarity)
- **Include Timestamps**: Based on use case
  - Meeting notes: ON
  - General transcript: Optional

### For Quick Sharing (TXT)
- **Include Speakers**: ON
- **Include Timestamps**: Optional
- **Include Metadata**: Optional (cleaner look without)

## Future Enhancements
- [ ] JSON export with full metadata
- [ ] SBV (YouTube subtitle) format
- [ ] Custom styling for PDF/DOCX
- [ ] Batch download multiple transcriptions
- [ ] Email delivery option
- [ ] Cloud storage integration (Google Drive, Dropbox)

