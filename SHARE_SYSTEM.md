# Share System Documentation

## Overview
Public sharing system that allows users to share transcriptions via unique links. Non-registered users can view shared transcripts and are encouraged to sign up.

## Features

### For Transcript Owners
1. **Toggle Public/Private**
   - Simple on/off switch in Share Modal
   - Instant activation of sharing link
   - Can disable sharing at any time

2. **Shareable Link**
   - Unique URL: `/shared/[transcriptionId]`
   - Copy-to-clipboard functionality
   - Preview link before sharing
   - Link works immediately when sharing is enabled

3. **Share Modal**
   - Located in transcription detail page
   - Accessible via "Share" button
   - Shows current public/private status
   - Lists what viewers can access
   - One-click link copying

### For Shared Link Viewers (No Account Required)

1. **Full Transcript Access**
   - View complete transcript with all formatting
   - Speaker labels (using owner's custom names)
   - Word-level timestamps
   - Audio playback (if audio URL is public)

2. **Download Capabilities**
   - All 5 formats available (PDF, DOCX, TXT, SRT, VTT)
   - Same advanced subtitle settings
   - No restrictions on downloads

3. **Sign-Up Encouragement**
   - **Top Banner**: Prominent purple/teal gradient banner
     - Message: "Want to create your own transcriptions?"
     - Call-to-action: "Start Free Trial" button
   - **Bottom CTA**: Large call-to-action section
     - Highlights: Free trial benefits
     - Dual buttons: "Start Free Trial" + "Learn More"
   - Non-intrusive: Doesn't block content viewing

## User Flow

### Sharing a Transcript
1. User opens any completed transcription
2. Clicks "Share" button (next to Download)
3. Share Modal opens
4. Toggle sharing ON
5. Link is generated instantly
6. Click "Copy" to copy link
7. Share link via email, social media, etc.

### Viewing a Shared Transcript
1. Anyone clicks shared link (`/shared/[id]`)
2. Page loads immediately (no login required)
3. See full transcript with:
   - Title and metadata
   - Audio player (if available)
   - Speaker segments with labels
   - Word highlighting during playback
   - Download button
4. Top banner encourages sign-up
5. Bottom CTA offers free trial

### Privacy Protection
- Only transcripts marked as `isPublic: true` are viewable
- Private transcripts show "Private Transcript" error page
- Owner can disable sharing anytime
- Disabling sharing immediately blocks access

## Technical Implementation

### Database Schema
```typescript
interface STTRecord {
  // ... existing fields
  isPublic?: boolean; // Whether transcript can be viewed by anyone with link
}
```

### Components
1. **ShareModal.tsx**
   - Toggle public/private
   - Copy shareable link
   - Preview link
   - Show sharing status

2. **shared/[id]/page.tsx**
   - Public viewer page
   - No authentication required
   - Minimal, clean design
   - Sign-up CTAs

### API/Service Methods
```typescript
// Toggle public status
databaseService.togglePublicSTTRecord(recordId, isPublic);

// Get transcript (checks isPublic)
databaseService.getSTTRecord(transcriptionId);
```

### URL Structure
- **Owner View**: `/transcriptions/[id]` (protected, requires login)
- **Public View**: `/shared/[id]` (open, no login)

## Security & Privacy

### Access Control
- Public transcripts: Anyone with link can view
- Private transcripts: Returns 404/error page
- No auth bypass: `isPublic` flag is checked server-side

### Data Protection
- Audio URLs must be publicly accessible Firebase Storage URLs
- Transcript data is served via public API endpoint
- No user data exposed (only transcript content)

### Best Practices
1. **Default**: Transcripts are private by default
2. **Explicit**: Users must explicitly enable sharing
3. **Reversible**: Can disable sharing anytime
4. **No Personal Info**: Don't include sensitive info in shared transcripts

## Marketing/Growth Features

### Sign-Up Conversion
1. **Top Banner** (Always Visible)
   - Purple/teal gradient (brand colors)
   - Clear value proposition
   - Prominent CTA button
   - Shows trial benefits

2. **Bottom CTA** (After Content)
   - Large, engaging section
   - Lists key benefits
   - Dual call-to-action buttons
   - Reinforces free trial offer

### Value Demonstration
- Viewers see professional transcription quality
- Speaker diarization impresses (especially with custom names)
- Download options show feature richness
- Audio sync demonstrates accuracy

## Usage Examples

### Example 1: Podcast Sharing
```
Podcaster transcribes episode → Enables sharing → 
Posts link on social media → Listeners read transcript → 
Some sign up for their own podcast transcriptions
```

### Example 2: Meeting Notes
```
Team lead transcribes meeting → Shares with team → 
Team members view without accounts → 
Some realize value → Sign up for team plan
```

### Example 3: Content Creation
```
YouTuber transcribes video → Shares with audience → 
Fans read transcript → Some need transcriptions → 
Sign up for their own content
```

## Future Enhancements
- [ ] Analytics: Track views, downloads, conversions
- [ ] Password protection: Optional password for shared links
- [ ] Expiration dates: Auto-disable sharing after X days
- [ ] Custom branding: Let users add logo/branding to shared page
- [ ] Social previews: Open Graph meta tags for better social sharing
- [ ] Embed option: Iframe embed code for websites
- [ ] View counter: Show "X people viewed this transcript"
- [ ] Comments: Allow viewers to leave comments (moderated)

## Benefits

### For Users
- ✅ Easy sharing with non-technical people
- ✅ No need to export and email files
- ✅ Always up-to-date (live link)
- ✅ Professional presentation
- ✅ Can disable anytime

### For Business
- ✅ Lead generation (sign-up CTAs)
- ✅ Product demonstration (quality on display)
- ✅ Viral growth potential (easy sharing)
- ✅ SEO benefit (public content indexed by Google)
- ✅ Network effects (shared links bring new users)

## Testing Checklist
- [ ] Enable sharing on transcript
- [ ] Copy and open shared link in incognito window
- [ ] Verify transcript displays correctly
- [ ] Test audio playback
- [ ] Test download functionality
- [ ] Verify sign-up CTAs work
- [ ] Disable sharing
- [ ] Verify link now shows error
- [ ] Test with long transcript (pagination/scrolling)
- [ ] Test on mobile devices

