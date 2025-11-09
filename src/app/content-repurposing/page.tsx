'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/context/AuthContext';
import { usePageOnboarding } from '@/hooks/usePageOnboarding';
import { databaseService, STTRecord } from '@/services/databaseService';
import { backgroundContentService } from '@/services/backgroundContentService';
import { contentLimitService } from '@/services/contentLimitService';
import { 
  FileText, 
  Share2, 
  MessageSquare, 
  Video, 
  Book, 
  Users, 
  Lightbulb,
  Copy,
  Download,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RefreshCw,
  Search,
  Calendar,
  Clock
} from 'lucide-react';

interface ContentType {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  prompt: string;
  estimatedWords: number; // Estimated word count for this content type
}

// All content types organized by category
const CONTENT_TYPES: ContentType[] = [
  // Long-Form Written Content
  {
    id: 'blog-short',
    name: 'Short Blog Post',
    description: '500-800 word blog post',
    category: 'Long-Form Written',
    icon: <FileText className="w-4 h-4" />,
    prompt: 'Transform this transcript into a short blog post (500-800 words) using the AIDA framework. USE ONLY THE CONTENT FROM THE TRANSCRIPT - do not add new topics or advice. Format with: # Main Title (based on transcript topic), ## Introduction section with hook paragraph, ## 2-3 Body Sections with H2 headings and multiple paragraphs each (expand on points discussed in transcript), ## Conclusion. Use **bold** for key points, proper paragraphs with line breaks. Stay true to the transcript subject matter. Do NOT mention "AIDA" - just reformat the transcript content into proper blog structure.',
    estimatedWords: 700
  },
  {
    id: 'blog-long',
    name: 'Long Blog Post',
    description: '1500-2000 word detailed article',
    category: 'Long-Form Written',
    icon: <FileText className="w-4 h-4" />,
    prompt: 'Transform this transcript into a comprehensive blog post (1500-2000 words) using the AIDA framework. USE ONLY THE CONTENT AND TOPICS FROM THE TRANSCRIPT - expand and elaborate on what was discussed, but do not introduce new subjects. Format with: # Main Title (based on transcript topic), ## Introduction (2-3 paragraphs based on transcript opening), ## 4-6 Body Sections with ## H2 and ### H3 subheadings (organize the transcript content into logical sections), use **bold** for emphasis, bullet points for key points discussed, proper paragraph breaks. ## Conclusion based on transcript ending. Stay true to the transcript subject matter. Do NOT mention "AIDA" - just reformat the transcript content into professional blog structure.',
    estimatedWords: 1800
  },
  {
    id: 'show-notes',
    name: 'Show Notes',
    description: 'Podcast/video show notes',
    category: 'Long-Form Written',
    icon: <FileText className="w-4 h-4" />,
    prompt: 'Transform this transcript into comprehensive show notes using the ACCA framework. USE ONLY CONTENT FROM THE TRANSCRIPT. Format with: # Episode Title (based on transcript topic), ## Overview (summarize what was discussed), ## Key Topics (extract topics actually discussed with approximate timestamps if available), ## Notable Quotes (> pull actual quotes from transcript), ## Main Insights (extract insights from transcript), ## Key Takeaways (based on transcript conclusions). Use proper markdown formatting. Do NOT add new topics - only organize and present what is in the transcript.',
    estimatedWords: 800
  },
  {
    id: 'newsletter',
    name: 'Newsletter',
    description: 'Email newsletter format',
    category: 'Long-Form Written',
    icon: <FileText className="w-4 h-4" />,
    prompt: 'Create an engaging email newsletter using the AIDA framework structure: Start with attention-grabbing subject lines based on transcript topic, build interest with preview text hook from transcript, create desire with value propositions from transcript insights, include action CTA related to transcript topic. Format with: **Subject Line:** [3 options], **Preview Text:** [hook], # Main Headline (transcript topic), Opening paragraph (introduce transcript topic), ## Key Points section with bullet points (main points discussed), ## Main Content (elaborate on transcript discussion with short paragraphs), Closing paragraph, **Call-to-Action** (related to transcript topic). Do NOT include framework labels like "Attention/Interest/Desire/Action" in the final content - just apply the structure invisibly to the transcript content.',
    estimatedWords: 600
  },
  {
    id: 'case-study',
    name: 'Case Study',
    description: 'Professional case study format',
    category: 'Long-Form Written',
    icon: <FileText className="w-4 h-4" />,
    prompt: 'Transform this transcript into a professional case study using the 4Ps framework. USE ONLY CONTENT FROM THE TRANSCRIPT. Format with: # Case Study Title (based on transcript topic), ## Executive Summary (overview of what was discussed), ## The Challenge/Situation (context from transcript), ## The Approach/Solution (methods/solutions discussed in transcript), ## Results & Outcomes (results mentioned in transcript - use bullet points), ## Key Learnings (insights from transcript - numbered list), ## Conclusion. Use **bold**, bullet points, proper sections. Do NOT add new information - only organize what is in the transcript into case study format.',
    estimatedWords: 1200
  },

  // Social Media Formats
  {
    id: 'linkedin-post',
    name: 'LinkedIn Post',
    description: 'Professional LinkedIn post',
    category: 'Social Media',
    icon: <Share2 className="w-4 h-4" />,
    prompt: 'Create a professional LinkedIn post using BAB framework structure: Start with a relatable problem/challenge from transcript, then show the solution/outcome from transcript, bridge with key insights from transcript. If transcript doesn\'t follow this pattern, adapt to: opening hook from transcript, main points discussed in transcript, key insight from transcript, engagement question about transcript topic. Use line breaks for readability. Max 1300 characters. Do NOT include framework labels like "Before/After/Bridge" in the final content - just apply the structure invisibly to the transcript content.',
    estimatedWords: 200
  },
  {
    id: 'twitter-thread',
    name: 'Twitter/X Thread',
    description: '5-10 tweet thread',
    category: 'Social Media',
    icon: <Share2 className="w-4 h-4" />,
    prompt: 'Create a Twitter/X thread using the HOOK-STORY-OFFER framework structure: Start with hook tweet based on transcript opening, build story through key points from transcript (one point per tweet), end with offer/conclusion from transcript. Format: Tweet 1: Hook from transcript opening, Tweets 2-8: Key points from transcript (one point per tweet), Final tweet: Conclusion from transcript. Each tweet max 280 chars. Use emojis and line breaks. Number each tweet. Do NOT include framework labels like "Hook/Story/Offer" in the final content - just apply the structure invisibly to the transcript content.',
    estimatedWords: 300
  },
  {
    id: 'instagram-caption',
    name: 'Instagram Caption',
    description: 'Engaging Instagram caption',
    category: 'Social Media',
    icon: <Share2 className="w-4 h-4" />,
    prompt: 'Create an Instagram caption using BAB framework structure: Start with a relatable scenario from the transcript, then show the inspiring outcome from the transcript, bridge with key insight from the transcript. Include 8-12 relevant hashtags based on transcript topics and CTA related to transcript content. Do NOT include framework labels like "Before/After/Bridge" in the final content - just apply the structure invisibly to the transcript content.',
    estimatedWords: 150
  },
  {
    id: 'facebook-post',
    name: 'Facebook Post',
    description: 'Facebook post with engagement',
    category: 'Social Media',
    icon: <Share2 className="w-4 h-4" />,
    prompt: 'Create a Facebook post using BAB framework structure: Start with a relatable problem from the transcript, then show the transformation/solution from the transcript, bridge with key insights from the transcript. Use emojis strategically, keep conversational, end with engagement question about the transcript topic. Do NOT include framework labels like "Before/After/Bridge" in the final content - just apply the structure invisibly to the transcript content.',
    estimatedWords: 150
  },
  {
    id: 'tiktok-script',
    name: 'TikTok/Reels Script',
    description: '30-60 second video script',
    category: 'Social Media',
    icon: <Video className="w-4 h-4" />,
    prompt: 'Create a 30-60 second TikTok/Reels script using 4Cs framework structure: Make it clear with simple message from transcript, concise with tight pacing, compelling with hook + story from transcript, credible with authority/proof from transcript. Include: 3-second hook based on transcript opening, main points from transcript with [visual cues], and CTA related to transcript topic. Do NOT include framework labels like "Clear/Concise/Compelling/Credible" in the final content - just apply the structure invisibly to the transcript content.',
    estimatedWords: 120
  },
  {
    id: 'quote-graphics',
    name: 'Quote Graphics',
    description: '5 shareable quotes',
    category: 'Social Media',
    icon: <Share2 className="w-4 h-4" />,
    prompt: 'Extract 5 powerful, shareable quotes from this transcript. USE ONLY ACTUAL QUOTES FROM THE TRANSCRIPT. Each quote should be impactful, standalone, and under 150 characters. If the transcript doesn\'t contain 5 quotable statements, extract the most meaningful phrases. Do NOT create new quotes - only extract what is actually said in the transcript.',
    estimatedWords: 100
  },

  // Marketing and Outreach
  {
    id: 'email-campaign',
    name: 'Email Campaign',
    description: 'Promotional email',
    category: 'Marketing',
    icon: <MessageSquare className="w-4 h-4" />,
    prompt: 'Create a promotional email using AIDA framework structure: Start with attention-grabbing subject lines based on transcript topic, build interest with preview text hook from transcript, create desire with value propositions from transcript insights, include action CTA related to transcript topic. Format with: **Subject Lines:** [3 options], **Preview Text:** [hook], Email body with sections covering main points from transcript, organized in logical flow with bullet points. Do NOT include framework labels like "Attention/Interest/Desire/Action" in the final content - just apply the structure invisibly to the transcript content.',
    estimatedWords: 400
  },
  {
    id: 'sales-outreach',
    name: 'Sales Outreach',
    description: 'Personalized sales email',
    category: 'Marketing',
    icon: <MessageSquare className="w-4 h-4" />,
    prompt: 'Create a sales outreach email using PAS framework structure: Start with problem identification from transcript, agitate the pain points discussed in transcript, solve with solutions/insights from transcript. Format as: Opening (reference transcript topic), Main paragraph (key points from transcript), Value proposition (based on transcript insights), soft CTA (related to transcript subject). Keep concise, personalized. Max 200 words. Do NOT include framework labels like "Problem/Agitate/Solve" in the final content - just apply the structure invisibly to the transcript content.',
    estimatedWords: 200
  },
  {
    id: 'ad-copy',
    name: 'Ad Copy',
    description: 'Short-form ad copy',
    category: 'Marketing',
    icon: <MessageSquare className="w-4 h-4" />,
    prompt: 'Create ad copy variations using AIDA framework structure: Start with attention-grabbing headlines based on transcript topic, build interest with descriptions summarizing key points from transcript, create desire with value propositions from transcript insights, include action CTAs related to transcript subject. Create: 3 headlines capturing transcript main topic (max 30 chars), 3 descriptions summarizing key points (max 90 chars), 2 CTAs related to transcript subject. Do NOT include framework labels like "Attention/Interest/Desire/Action" in the final content - just apply the structure invisibly to the transcript content.',
    estimatedWords: 150
  },
  {
    id: 'landing-page',
    name: 'Landing Page Copy',
    description: 'Hero text and CTAs',
    category: 'Marketing',
    icon: <MessageSquare className="w-4 h-4" />,
    prompt: 'Create landing page copy using AIDA + QUEST framework structure: Start with attention-grabbing headline from transcript topic, build interest with subheadline from transcript, create desire with value props from transcript insights, include action CTA related to transcript, plus qualify, understand, educate, stimulate, and transition sections based on transcript content. Do NOT include framework labels like "Attention/Interest/Desire/Action" or "Qualify/Understand/Educate" in the final content - just apply the structure invisibly to the transcript content.',
    estimatedWords: 400
  },

  // Video & Multimedia
  {
    id: 'youtube-description',
    name: 'YouTube Description',
    description: 'Optimized video description',
    category: 'Video & Multimedia',
    icon: <Video className="w-4 h-4" />,
    prompt: 'Create a YouTube description using the HOOK-VALUE-ACTION framework structure: Start with hook paragraph describing what was discussed in video, provide value with main points and key topics from transcript, include action with timestamps and resources. Format with: Opening paragraph (describe what was discussed in video), Main points paragraph (key topics covered). ## Timestamps: Create based on topic changes (0:00 Intro, 2:15 [First Topic], etc), ## Resources: List any resources/tools/links mentioned in transcript, Hashtags based on transcript topics. Do NOT include framework labels like "Hook/Value/Action" in the final content - just apply the structure invisibly to the transcript content.',
    estimatedWords: 250
  },
  {
    id: 'video-script',
    name: 'Video Script',
    description: 'Full video narration script',
    category: 'Video & Multimedia',
    icon: <Video className="w-4 h-4" />,
    prompt: 'Create a video script using the HOOK-STORY-CLOSE framework structure: Start with hook intro based on transcript opening, build story through main content from transcript, close with outro recap from transcript. Format with: **INTRO (0-10 sec):** [Hook based on transcript opening] [Visual cue], **MAIN CONTENT:** Organize transcript content into sections with natural voice-over language and [Visual cues in brackets], **TRANSITIONS:** between topic changes, **OUTRO:** Recap key points from transcript + [End screen visual]. Use conversational language, proper punctuation for pauses. Include timing estimates. Do NOT include framework labels like "Hook/Story/Close" in the final content - just apply the structure invisibly to the transcript content.',
    estimatedWords: 400
  },
  {
    id: 'chapter-timestamps',
    name: 'Chapter Timestamps',
    description: 'Video chapters with titles',
    category: 'Video & Multimedia',
    icon: <Video className="w-4 h-4" />,
    prompt: 'Create chapter timestamps from this transcript. USE ONLY CONTENT FROM THE TRANSCRIPT. List each major section with timestamp and descriptive title based on what was actually discussed. Format: 00:00 - Introduction, 02:15 - [Topic discussed], etc. Do NOT add topics not in the transcript.',
    estimatedWords: 100
  },

  // Knowledge & Productivity
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description: 'Structured meeting summary',
    category: 'Knowledge',
    icon: <Book className="w-4 h-4" />,
    prompt: 'Create meeting notes using the SOAP framework structure: Start with subjective observations from transcript, include objective data points from transcript, assess the situation discussed in transcript, plan next steps from transcript. Format with: # Meeting Title (based on transcript topic), **Date:** [if mentioned], **Attendees:** [if mentioned], ## Context (what was discussed), ## Key Discussion Points (organize transcript content by topic with bullet points), ## Decisions Made (if mentioned), ## Outcomes (if discussed), ## Action Items: List tasks mentioned with owner/deadline if stated. Do NOT include framework labels like "Subjective/Objective/Assessment/Plan" in the final content - just apply the structure invisibly to the transcript content.',
    estimatedWords: 500
  },
  {
    id: 'action-items',
    name: 'Action Items',
    description: 'Extract actionable tasks',
    category: 'Knowledge',
    icon: <Book className="w-4 h-4" />,
    prompt: 'Extract ONLY the action items, tasks, and to-dos actually mentioned in this transcript. List each one with: - [ ] Task description, Owner: [if mentioned], Priority: [if mentioned], Deadline: [if mentioned]. If no explicit action items exist in the transcript, extract implied next steps or recommendations that were discussed. Do NOT invent new action items - only extract what is in the transcript.',
    estimatedWords: 150
  },
  {
    id: 'faq',
    name: 'FAQ Document',
    description: 'Questions and answers',
    category: 'Knowledge',
    icon: <Book className="w-4 h-4" />,
    prompt: 'Transform this transcript into an FAQ document. USE ONLY CONTENT FROM THE TRANSCRIPT. Generate 8-12 questions based on topics and points actually discussed in the transcript, with answers derived from the transcript content. Format: ## Question 1?, Answer paragraph. Organize by topic/category if the transcript covers multiple subjects. Do NOT add questions about topics not in the transcript.',
    estimatedWords: 600
  },
  {
    id: 'key-takeaways',
    name: 'Key Takeaways',
    description: 'Main points and insights',
    category: 'Knowledge',
    icon: <Book className="w-4 h-4" />,
    prompt: 'Extract ONLY the key takeaways, main points, and conclusions from this transcript. List 5-10 insights that were actually discussed or concluded in the transcript (1-2 sentences each). Format as numbered list. Do NOT add new insights - only extract what is in the transcript.',
    estimatedWords: 200
  },

  // Community & Engagement
  {
    id: 'discussion-topics',
    name: 'Discussion Topics',
    description: 'Community discussion prompts',
    category: 'Community',
    icon: <Users className="w-4 h-4" />,
    prompt: 'Create 5-7 discussion prompts from this transcript. USE ONLY CONTENT FROM THE TRANSCRIPT. Generate thought-provoking, open-ended questions based on topics and points actually discussed in the transcript. Each prompt should encourage diverse perspectives about the transcript content. Do NOT add questions about topics not in the transcript.',
    estimatedWords: 150
  },
  {
    id: 'course-outline',
    name: 'Course Outline',
    description: 'Educational module structure',
    category: 'Community',
    icon: <Users className="w-4 h-4" />,
    prompt: 'Create a course outline using the ADDIE framework structure: Analyze transcript content for learning needs, Design course structure from transcript topics, Develop learning objectives from transcript insights, Implement module breakdown from transcript discussion, Evaluate with activities from transcript content. Include: Course title based on transcript topic, learning objectives from transcript content, logical module breakdown (4-8 modules) organizing transcript topics, key topics per module from transcript discussion, suggested activities/exercises related to transcript content. Do NOT include framework labels like "Analyze/Design/Develop/Implement/Evaluate" in the final content - just apply the structure invisibly to the transcript content.',
    estimatedWords: 400
  },

  // Creative & Insights
  {
    id: 'infographic-text',
    name: 'Infographic Text',
    description: 'Data points and stats',
    category: 'Creative',
    icon: <Lightbulb className="w-4 h-4" />,
    prompt: 'Create infographic text using the DATA-STORY-VISUAL framework structure: Start with data points from transcript, build story around key facts from transcript, suggest visuals for transcript content. Extract 5-8 key facts, statistics, or main points from the transcript. Format each as: ## [HEADLINE based on point], **Stat/Number if mentioned**, Supporting text (2-3 lines from transcript). Use **bold** for emphasis and numbers. Make each section scannable. Suggest relevant icons in [brackets]. Do NOT include framework labels like "Data/Story/Visual" in the final content - just apply the structure invisibly to the transcript content.',
    estimatedWords: 300
  },
  {
    id: 'presentation-outline',
    name: 'Presentation Outline',
    description: 'Slide deck structure',
    category: 'Creative',
    icon: <Lightbulb className="w-4 h-4" />,
    prompt: 'Create a presentation outline using the TELL-SHOW-TELL framework structure: Start with tell (introduction from transcript), show (main content from transcript), tell (conclusion from transcript). Format with: ## Slide 1: Title + Subtitle (based on transcript topic), ## Slide 2: Agenda (bullet points from transcript topics), ## Slides 3-12: Each slide as ## Slide X: [Title from transcript content], followed by 3-5 bullet points with sub-bullets from transcript discussion, ## Conclusion Slide: Key takeaways from transcript (numbered), ## Final Slide: Call-to-Action related to transcript topic. Use **bold** for emphasis, keep bullets concise. Ready for PowerPoint/Google Slides. Do NOT include framework labels like "Tell/Show/Tell" in the final content - just apply the structure invisibly to the transcript content.',
    estimatedWords: 500
  },
  {
    id: 'tutorial-guide',
    name: 'Tutorial Guide',
    description: 'Step-by-step how-to',
    category: 'Creative',
    icon: <Lightbulb className="w-4 h-4" />,
    prompt: 'Create a tutorial guide using the PREP framework structure: Start with point from transcript, provide reason from transcript, give example from transcript, restate point from transcript. If the transcript is instructional, format with: # Tutorial Title (based on transcript topic), ## What You Will Learn (bullet points from transcript), ## Step-by-Step Instructions: Extract and organize steps actually mentioned in transcript, add **Tips** and **Warnings** if discussed, ## Expected Results (if mentioned). If transcript is not instructional, create a how-to guide based on the concepts discussed. Use proper markdown. Do NOT include framework labels like "Point/Reason/Example/Point" in the final content - just apply the structure invisibly to the transcript content.',
    estimatedWords: 600
  }
];

// Group content types by category
const CATEGORIES = [
  { id: 'Long-Form Written', name: 'Long-Form Written', icon: <FileText className="w-5 h-5" />, color: 'bg-blue-500' },
  { id: 'Social Media', name: 'Social Media', icon: <Share2 className="w-5 h-5" />, color: 'bg-pink-500' },
  { id: 'Marketing', name: 'Marketing & Outreach', icon: <MessageSquare className="w-5 h-5" />, color: 'bg-green-500' },
  { id: 'Video & Multimedia', name: 'Video & Multimedia', icon: <Video className="w-5 h-5" />, color: 'bg-red-500' },
  { id: 'Knowledge', name: 'Knowledge & Productivity', icon: <Book className="w-5 h-5" />, color: 'bg-purple-500' },
  { id: 'Community', name: 'Community & Learning', icon: <Users className="w-5 h-5" />, color: 'bg-teal-500' },
  { id: 'Creative', name: 'Creative & Insights', icon: <Lightbulb className="w-5 h-5" />, color: 'bg-orange-500' }
];

export default function ContentRepurposingPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [transcriptions, setTranscriptions] = useState<STTRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTranscription, setSelectedTranscription] = useState<STTRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedContentType, setSelectedContentType] = useState<ContentType | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [showCustomInstructions, setShowCustomInstructions] = useState(false);
  
  // Onboarding for content repurposing page
  const { OnboardingComponent } = usePageOnboarding({
    pageId: 'content-repurposing',
    steps: [
      {
        id: 'select-transcription',
        targetId: 'transcription-selector',
        title: 'Select a Transcription',
        description: 'Choose a completed transcription from the list on the left. Only transcriptions with completed status are available for content generation.',
        position: 'right'
      },
      {
        id: 'select-category',
        targetId: 'content-category-selector',
        title: 'Choose Content Category',
        description: 'Select a category (Social Media, Long-Form Written, etc.) to see available content types. Each category offers different formats like blog posts, social media posts, and more.',
        position: 'bottom'
      },
      {
        id: 'select-type',
        targetId: 'content-type-selector',
        title: 'Pick a Content Type',
        description: 'Choose the specific format you want to create. Each type uses a proven framework (AIDA, BAB, etc.) to structure your content professionally.',
        position: 'bottom'
      },
      {
        id: 'custom-instructions',
        targetId: 'custom-instructions-toggle',
        title: 'Add Custom Instructions (Optional)',
        description: 'Guide what the content should focus on. For example, "Focus on the marketing strategy" or "Emphasize customer benefits". This helps tailor the generated content to your specific needs.',
        position: 'top'
      }
    ]
  });
  
  const [wordLimitStatus, setWordLimitStatus] = useState<{
    totalAvailable: number;
    monthlyLimit: number;
    wordsUsed: number;
    boostWords: number;
  } | null>(null);

  useEffect(() => {
    if (user) {
      loadTranscriptions();
      loadWordLimits();
    }
  }, [user]);

  const loadWordLimits = async () => {
    try {
      const status = await contentLimitService.getWordLimitStatus();
      setWordLimitStatus({
        totalAvailable: status.totalAvailable,
        monthlyLimit: status.monthlyLimit,
        wordsUsed: status.wordsUsed,
        boostWords: status.boostWords,
      });
    } catch (err) {
      console.error('❌ Error loading word limits:', err);
    }
  };

  const extractTranscriptFromData = (data: any): string => {
    if (!data) return '';

    const normalize = (value: string) =>
      value.replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n');

    const candidates = [
      data?.transcript,
      data?.merged_text,
      data?.text,
      data?.runpod_output?.transcript,
      data?.runpod_output?.merged_text,
      data?.runpod_output?.text,
      data?.runpod_output?.formatted_transcript,
      data?.runpod_output?.final_transcript,
      data?.runpod_output?.metadata?.full_transcript,
      data?.runpod_output?.metadata?.formatted_transcript,
      data?.fullText,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string') {
        const normalized = normalize(candidate);
        if (normalized.trim().length > 0) {
          return normalized;
        }
      }
    }

    return '';
  };

  const loadTranscriptions = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setLoadError(null);
      console.log('📋 Loading transcriptions for content repurposing...');
      const records = await databaseService.getSTTRecords(1000); // Load up to 1000 records
      console.log('📊 Loaded records:', records.length);
      
      // Only show completed transcriptions with transcript text
      const completedRecords = records.filter(r => {
        const isCompleted = r.status === 'completed';
        const hasTranscript = r.transcript && r.transcript.length > 0;
        console.log(`Record ${r.id}: status=${r.status}, hasTranscript=${hasTranscript}`);
        return isCompleted && hasTranscript;
      });
      
      console.log('✅ Filtered to completed records:', completedRecords.length);
      setTranscriptions(completedRecords);
    } catch (err) {
      console.error('❌ Error loading transcriptions:', err);
      setLoadError('Failed to load transcriptions. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTranscriptions = transcriptions.filter(t => 
    t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.audio_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContentTypes = selectedCategory
    ? CONTENT_TYPES.filter(ct => ct.category === selectedCategory)
    : [];

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    try {
      const date = timestamp instanceof Date ? timestamp : timestamp.toDate();
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch (err) {
      return 'Unknown';
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const generateContent = async (contentType: ContentType) => {
    if (!selectedTranscription || !user) return;

    setGenerating(true);
    setError(null);
    setSelectedContentType(contentType);

    try {
      // Check word limits BEFORE generating content
      console.log('🔍 Checking word limits...');
      const estimatedWords = contentType.estimatedWords || 500;
      const limitStatus = await contentLimitService.checkCanGenerate(1); // Check if user has ANY words
      
      if (!limitStatus.canGenerate) {
        console.log('❌ Cannot generate content:', limitStatus.reason);
        setError(limitStatus.reason || 'You have reached your word limit.');
        setGenerating(false);
        return;
      }

      // Calculate actual word limit for generation
      const availableWords = limitStatus.totalAvailable;
      const actualWordLimit = Math.min(estimatedWords, availableWords);
      
      console.log(`✅ Word limit check passed. Requested: ${estimatedWords} words, Available: ${availableWords} words, Generating: ${actualWordLimit} words`);
      console.log('🚀 Starting background content generation...');
      
      // Get full transcription text from Storage if available
      let fullTranscriptionText = selectedTranscription.transcript?.replace(/\r\n/g, '\n') || '';
      if (selectedTranscription.transcription_data_url) {
        try {
          console.log('📥 Fetching full transcription text for content generation...');
          const fullData = await databaseService.getFullTranscriptionData(selectedTranscription.transcription_data_url);
          console.log('🧾 [ContentRepurposingPage] Full transcription data keys:', Object.keys(fullData || {}));
          if (fullData?.runpod_output) {
            console.log('🧾 [ContentRepurposingPage] runpod_output keys:', Object.keys(fullData.runpod_output));
            console.log('🧾 [ContentRepurposingPage] runpod_output.transcript preview:', typeof fullData.runpod_output.transcript === 'string' ? fullData.runpod_output.transcript.substring(0, 100) : fullData.runpod_output.transcript);
          }

          const fullTranscript = extractTranscriptFromData(fullData);

          console.log('🧾 [ContentRepurposingPage] Selected transcript diagnostics:', {
            type: typeof fullTranscript,
            length: fullTranscript.length,
            firstChars: fullTranscript.substring(0, 100),
            charCodes: Array.from(fullTranscript.substring(0, 20)).map(ch => ch.charCodeAt(0))
          });

          if (fullTranscript.trim().length > 0) {
            fullTranscriptionText = fullTranscript;
            console.log('✅ Using full transcription text:', {
              length: fullTranscriptionText.length,
              preview: fullTranscriptionText.substring(0, 100) + '...'
            });
          } else {
            console.warn('⚠️ Full transcription data did not contain usable transcript. Using preview text instead.');
          }
        } catch (error) {
          console.warn('⚠️ Failed to fetch full transcription text, using preview:', error);
        }
      }

      const transcriptSource = fullTranscriptionText && fullTranscriptionText.trim().length > 0
        ? fullTranscriptionText
        : selectedTranscription.transcript?.replace(/\r\n/g, '\n') || '';

      if (!transcriptSource || transcriptSource.trim().length === 0) {
        console.error('❌ Transcript content is empty. Aborting generation.');
        setError('Transcript content is not available yet. Please wait for the transcription to finish processing and try again.');
        setGenerating(false);
        return;
      }

      // Start background generation using the new DeepSeek system
      const contentId = await backgroundContentService.startContentGenerationNew({
        transcriptionId: selectedTranscription.id!,
        transcriptionName: selectedTranscription.name || 'Untitled',
        transcriptionText: transcriptSource, // Use full text instead of truncated preview
        contentTypeId: contentType.id,
        contentTypeName: contentType.name,
        contentCategory: contentType.category,
        prompt: contentType.prompt,
        customInstructions: customInstructions.trim() || undefined,
        userId: user.uid,
        maxWords: actualWordLimit // Pass the actual word limit to the generator
      });

      console.log('✅ Content generation started with ID:', contentId);
      
      // Reload word limits to show updated count
      await loadWordLimits();
      
      // Redirect to My Content page immediately
      router.push('/my-content');
    } catch (err) {
      console.error('❌ Error starting content generation:', err);
      setError(`Failed to start content generation: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setGenerating(false);
    }
  };

  const regenerateContent = async () => {
    if (!selectedContentType) return;
    await generateContent(selectedContentType);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadContent = () => {
    if (!selectedContentType || !selectedTranscription) return;
    
    const blob = new Blob([generatedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTranscription.name || 'transcript'}_${selectedContentType.name.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetSelection = () => {
    setSelectedCategory(null);
    setSelectedContentType(null);
    setGeneratedContent('');
    setError(null);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="p-6">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading transcriptions...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <OnboardingComponent />
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
              <div className="flex items-center space-x-3">
                <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-purple-600" />
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Content Repurposing</h1>
              </div>
              
              {/* Word Limit Display */}
              {wordLimitStatus && (
                <div className="bg-gradient-to-r from-purple-50 to-teal-50 border border-purple-200 rounded-lg px-3 sm:px-4 py-2">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <div className="text-sm">
                      <span className="font-bold text-purple-900">
                        {wordLimitStatus.totalAvailable.toLocaleString()}
                      </span>
                      <span className="text-gray-600"> words available</span>
                    </div>
                  </div>
                  {wordLimitStatus.boostWords > 0 && (
                    <div className="text-[11px] sm:text-xs text-gray-500 mt-1">
                      {wordLimitStatus.monthlyLimit > 0 && (
                        <span>Monthly: {(wordLimitStatus.monthlyLimit - wordLimitStatus.wordsUsed).toLocaleString()} • </span>
                      )}
                      Boost: {wordLimitStatus.boostWords.toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-gray-600">
              Transform your transcriptions into 30+ content types for social media, marketing, and more
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            {/* Left Panel - Transcription Selection */}
            <div className="lg:col-span-1">
              <div id="transcription-selector" className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Select Transcription</h2>
                  
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search transcriptions..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>

                {/* Transcription List */}
                <div className="max-h-[60vh] lg:max-h-[600px] overflow-y-auto">
                  {loadError ? (
                    <div className="p-6 text-center">
                      <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
                      <p className="text-sm text-red-600 mb-3">{loadError}</p>
                      <button
                        onClick={loadTranscriptions}
                        className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : filteredTranscriptions.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">
                        {searchQuery ? 'No transcriptions found' : 'No completed transcriptions yet'}
                      </p>
                      {!searchQuery && transcriptions.length === 0 && (
                        <p className="text-xs text-gray-400 mt-2">
                          Create a transcription first to use content repurposing
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {filteredTranscriptions.map(transcription => (
                        <button
                          key={transcription.id}
                          onClick={() => {
                            setSelectedTranscription(transcription);
                            resetSelection();
                          }}
                          className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                            selectedTranscription?.id === transcription.id
                              ? 'bg-purple-50 border-l-4 border-l-purple-600'
                              : ''
                          }`}
                        >
                          <h3 className="font-medium text-gray-900 mb-1 truncate">
                            {transcription.name || transcription.audio_id?.split('/').pop()?.split('?')[0] || 'Untitled'}
                          </h3>
                          <div className="flex items-center space-x-3 text-xs text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(transcription.timestamp)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatDuration(transcription.duration)}</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Panel - Content Generation */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-4 sm:p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 mb-1">Generate Content</h2>
                  <p className="text-sm text-gray-600">
                    {selectedTranscription 
                      ? `Creating content from: ${selectedTranscription.name || 'Untitled'}`
                      : 'Select a transcription to get started'}
                  </p>
                </div>

                <div className="p-4 sm:p-6">
                  {!selectedTranscription ? (
                    // No transcription selected
                    <div className="text-center py-12">
                      <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Repurpose?</h3>
                      <p className="text-gray-600 max-w-md mx-auto">
                        Select a transcription from the left panel to start generating content
                      </p>
                    </div>
                  ) : !selectedCategory ? (
                    // Category Selection
                    <div id="content-category-selector" className="space-y-3">
                      <p className="text-sm font-medium text-gray-700 mb-4">Select a content category:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {CATEGORIES.map(category => {
                          const categoryCount = CONTENT_TYPES.filter(ct => ct.category === category.id).length;
                          return (
                            <button
                              key={category.id}
                              onClick={() => setSelectedCategory(category.id)}
                              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group"
                            >
                              <div className="flex items-center space-x-3">
                                <div className={`w-10 h-10 ${category.color} rounded-lg flex items-center justify-center text-white`}>
                                  {category.icon}
                                </div>
                                <div className="text-left">
                                  <div className="font-medium text-gray-900 text-sm">{category.name}</div>
                                  <div className="text-xs text-gray-500">{categoryCount} types</div>
                                </div>
                              </div>
                              <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-purple-600" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : !selectedContentType || !generatedContent ? (
                    // Content Type Selection
                    <div id="content-type-selector" className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <button
                          onClick={() => setSelectedCategory(null)}
                          className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                        >
                          ← Back to categories
                        </button>
                      </div>
                      
                      <p className="text-sm font-medium text-gray-700 mb-4">
                        Choose a {CATEGORIES.find(c => c.id === selectedCategory)?.name} format:
                      </p>

                      {/* Custom Instructions Toggle */}
                      <div id="custom-instructions-toggle" className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <button
                          onClick={() => setShowCustomInstructions(!showCustomInstructions)}
                          className="flex items-center justify-between w-full text-left"
                        >
                          <div className="flex items-center space-x-2">
                            <Sparkles className="w-4 h-4 text-purple-600" />
                            <span className="text-sm font-medium text-purple-900">
                              Custom Instructions (Optional)
                            </span>
                          </div>
                          {showCustomInstructions ? <ChevronUp className="w-4 h-4 text-purple-600" /> : <ChevronDown className="w-4 h-4 text-purple-600" />}
                        </button>
                        
                        {showCustomInstructions && (
                          <div className="mt-3 space-y-2">
                            <textarea
                              value={customInstructions}
                              onChange={(e) => setCustomInstructions(e.target.value)}
                              placeholder="Example: 'Focus on the marketing strategy discussed', 'Emphasize the customer success story', 'Highlight the technical implementation details', 'Make it about the product launch', etc."
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                              rows={3}
                            />
                            <p className="text-xs text-purple-700">
                              💡 Guide what the content should be about (topic/direction). The content type above sets the format (Facebook post, blog, etc.), while your instructions here guide which aspects or topics from the transcript to emphasize.
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {filteredContentTypes.map(contentType => (
                          <button
                            key={contentType.id}
                            onClick={() => generateContent(contentType)}
                            disabled={generating}
                            className="flex items-start p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <div className="text-gray-400 group-hover:text-purple-600 mt-0.5 mr-3">
                              {contentType.icon}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 mb-1 text-sm">{contentType.name}</div>
                              <div className="text-xs text-gray-500">{contentType.description}</div>
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* Loading State */}
                      {generating && (
                        <div className="flex items-center justify-center py-12 mt-6 border-t border-gray-200">
                          <div className="text-center">
                            <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-3" />
                            <p className="text-sm text-gray-600">Generating {selectedContentType?.name}...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Generated Content Display
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <button
                          onClick={resetSelection}
                          className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                        >
                          ← Create different content
                        </button>
                      </div>

                      {/* Content Type Header */}
                      <div className="flex items-start justify-between p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-start space-x-3">
                          <div className="text-purple-600 mt-0.5">
                            {selectedContentType.icon}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{selectedContentType.name}</h4>
                            <p className="text-sm text-gray-600">{selectedContentType.description}</p>
                          </div>
                        </div>
                        <button
                          onClick={regenerateContent}
                          disabled={generating}
                          className="text-purple-600 hover:text-purple-700 disabled:opacity-50"
                          title="Regenerate"
                        >
                          <RefreshCw className={`w-5 h-5 ${generating ? 'animate-spin' : ''}`} />
                        </button>
                      </div>

                      {/* Error State */}
                      {error && (
                        <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-red-800">{error}</p>
                          </div>
                        </div>
                      )}

                      {/* Generated Content */}
                      {!generating && generatedContent && (
                        <div className="space-y-4">
                          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 max-h-96 overflow-y-auto">
                            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                              {generatedContent}
                            </pre>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={copyToClipboard}
                              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                            >
                              {copied ? (
                                <>
                                  <CheckCircle className="w-4 h-4" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-4 h-4" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                            <button
                              onClick={downloadContent}
                              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                            >
                              <Download className="w-4 h-4" />
                              <span>Download</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

