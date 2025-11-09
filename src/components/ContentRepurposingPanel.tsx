'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { contentLimitService } from '@/services/contentLimitService';
import { databaseService } from '@/services/databaseService';
import { useAuth } from '@/context/AuthContext';
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
  RefreshCw
} from 'lucide-react';

interface ContentType {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  prompt: string;
  estimatedWords?: number; // Estimated word count for this content type
}

interface ContentRepurposingPanelProps {
  transcriptionText: string;
  transcriptionId: string;
  className?: string;
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
    prompt: 'Transform this transcript into a short blog post (500-800 words) using the AIDA framework. USE ONLY THE CONTENT FROM THE TRANSCRIPT - do not add new topics or advice. Format with: # Main Title (based on transcript topic), ## Introduction section with hook paragraph, ## 2-3 Body Sections with H2 headings and multiple paragraphs each (expand on points discussed in transcript), ## Conclusion. Use **bold** for key points, proper paragraphs with line breaks. Stay true to the transcript subject matter. Do NOT mention "AIDA" - just reformat the transcript content into proper blog structure.'
  },
  {
    id: 'blog-long',
    name: 'Long Blog Post',
    description: '1500-2000 word detailed article',
    category: 'Long-Form Written',
    icon: <FileText className="w-4 h-4" />,
    prompt: 'Transform this transcript into a comprehensive blog post (1500-2000 words) using the AIDA framework. USE ONLY THE CONTENT AND TOPICS FROM THE TRANSCRIPT - expand and elaborate on what was discussed, but do not introduce new subjects. Format with: # Main Title (based on transcript topic), ## Introduction (2-3 paragraphs based on transcript opening), ## 4-6 Body Sections with ## H2 and ### H3 subheadings (organize the transcript content into logical sections), use **bold** for emphasis, bullet points for key points discussed, proper paragraph breaks. ## Conclusion based on transcript ending. Stay true to the transcript subject matter. Do NOT mention "AIDA" - just reformat the transcript content into professional blog structure.'
  },
  {
    id: 'show-notes',
    name: 'Show Notes',
    description: 'Podcast/video show notes',
    category: 'Long-Form Written',
    icon: <FileText className="w-4 h-4" />,
    prompt: 'Transform this transcript into comprehensive show notes using the ACCA framework. USE ONLY CONTENT FROM THE TRANSCRIPT. Format with: # Episode Title (based on transcript topic), ## Overview (summarize what was discussed), ## Key Topics (extract topics actually discussed with approximate timestamps if available), ## Notable Quotes (> pull actual quotes from transcript), ## Main Insights (extract insights from transcript), ## Key Takeaways (based on transcript conclusions). Use proper markdown formatting. Do NOT add new topics - only organize and present what is in the transcript.'
  },
  {
    id: 'newsletter',
    name: 'Newsletter',
    description: 'Email newsletter format',
    category: 'Long-Form Written',
    icon: <FileText className="w-4 h-4" />,
    prompt: 'Transform this transcript into an engaging email newsletter. USE ONLY CONTENT FROM THE TRANSCRIPT. Format with: **Subject Line:** [3 options based on transcript topic], **Preview Text:** [hook from transcript], # Main Headline (transcript topic), Opening paragraph (introduce transcript topic), ## Key Points section with bullet points (main points discussed), ## Main Content (elaborate on transcript discussion with short paragraphs), Closing paragraph, **Call-to-Action** (related to transcript topic). Use proper email formatting with clear sections, short paragraphs, bullet points. Do NOT add new topics - only reformat the transcript content.'
  },
  {
    id: 'case-study',
    name: 'Case Study',
    description: 'Professional case study format',
    category: 'Long-Form Written',
    icon: <FileText className="w-4 h-4" />,
    prompt: 'Transform this transcript into a professional case study using the 4Ps framework. USE ONLY CONTENT FROM THE TRANSCRIPT. Format with: # Case Study Title (based on transcript topic), ## Executive Summary (overview of what was discussed), ## The Challenge/Situation (context from transcript), ## The Approach/Solution (methods/solutions discussed in transcript), ## Results & Outcomes (results mentioned in transcript - use bullet points), ## Key Learnings (insights from transcript - numbered list), ## Conclusion. Use **bold**, bullet points, proper sections. Do NOT add new information - only organize what is in the transcript into case study format.'
  },

  // Social Media Formats
  {
    id: 'linkedin-post',
    name: 'LinkedIn Post',
    description: 'Professional LinkedIn post',
    category: 'Social Media',
    icon: <Share2 className="w-4 h-4" />,
    prompt: 'Transform this transcript into a professional LinkedIn post using the BAB framework. USE ONLY CONTENT FROM THE TRANSCRIPT. If the transcript discusses a problem/challenge (Before), solution/outcome (After), and insights (Bridge), structure it that way. Otherwise, adapt the transcript content to: opening hook, main points discussed, key insight, engagement question. Use line breaks for readability. Max 1300 characters. Do NOT add new topics - only reformat what is in the transcript.'
  },
  {
    id: 'twitter-thread',
    name: 'Twitter/X Thread',
    description: '5-10 tweet thread',
    category: 'Social Media',
    icon: <Share2 className="w-4 h-4" />,
    prompt: 'Transform this transcript into a Twitter/X thread (5-10 tweets). USE ONLY CONTENT FROM THE TRANSCRIPT. Break down the main points discussed into individual tweets. Tweet 1: Hook based on transcript opening, Tweets 2-8: Key points from transcript (one point per tweet), Final tweet: Conclusion from transcript. Each tweet max 280 chars. Use emojis and line breaks. Number each tweet. Do NOT add new topics - only break down what is in the transcript.'
  },
  {
    id: 'instagram-caption',
    name: 'Instagram Caption',
    description: 'Engaging Instagram caption',
    category: 'Social Media',
    icon: <Share2 className="w-4 h-4" />,
    prompt: 'Create an Instagram caption using BAB framework: Start with relatable Before scenario (hook), describe inspiring After outcome, then Bridge with the key insight from transcript. Include 8-12 relevant hashtags and CTA. Make it conversational and visual. Do NOT mention "BAB" - just apply it naturally.'
  },
  {
    id: 'facebook-post',
    name: 'Facebook Post',
    description: 'Facebook post with engagement',
    category: 'Social Media',
    icon: <Share2 className="w-4 h-4" />,
    prompt: 'Create a Facebook post using BAB framework: Open with the Before (relatable problem), show the After (transformation/solution), Bridge with key insights. Use emojis strategically, keep conversational, end with engagement question. Do NOT mention "BAB" - just apply it naturally.'
  },
  {
    id: 'tiktok-script',
    name: 'TikTok/Reels Script',
    description: '30-60 second video script',
    category: 'Social Media',
    icon: <Video className="w-4 h-4" />,
    prompt: 'Create a 30-60 second TikTok/Reels script using the 4Cs framework: Clear (simple message), Concise (tight pacing), Compelling (hook + story), Credible (authority/proof). Include: 3-second hook, main points with [visual cues], and CTA. Make it punchy and fast-paced. Do NOT mention "4Cs" - just apply it naturally.'
  },
  {
    id: 'quote-graphics',
    name: 'Quote Graphics',
    description: '5 shareable quotes',
    category: 'Social Media',
    icon: <Share2 className="w-4 h-4" />,
    prompt: 'Extract 5 powerful, shareable quotes from this transcript. Each quote should be impactful, standalone, and under 150 characters. Focus on transformation, wisdom, or actionable insights. Perfect for quote graphics.'
  },

  // Marketing and Outreach
  {
    id: 'email-campaign',
    name: 'Email Campaign',
    description: 'Promotional email',
    category: 'Marketing',
    icon: <MessageSquare className="w-4 h-4" />,
    prompt: 'Create a promotional email using FAB + PAS framework: Highlight Features, explain Advantages, show Benefits, then identify the Problem, Agitate the pain, and present the Solution. Include: 3 subject line options, preview text, engaging body, and clear CTA. Do NOT mention the frameworks - just apply them naturally.'
  },
  {
    id: 'sales-outreach',
    name: 'Sales Outreach',
    description: 'Personalized sales email',
    category: 'Marketing',
    icon: <MessageSquare className="w-4 h-4" />,
    prompt: 'Create a sales outreach email using PAS framework: Identify the Problem (pain point), Agitate it (consequences/urgency), offer the Solution (value from transcript). Keep concise, personalized, soft CTA. Max 200 words. Do NOT mention "PAS" - just apply it naturally.'
  },
  {
    id: 'ad-copy',
    name: 'Ad Copy',
    description: 'Short-form ad copy',
    category: 'Marketing',
    icon: <MessageSquare className="w-4 h-4" />,
    prompt: 'Create ad copy using PAS framework: Problem-focused headlines, Agitate in descriptions, Solution in CTA. Provide: 3 headlines (max 30 chars), 3 descriptions (max 90 chars), 2 CTAs. Make them benefit-driven and urgent. Do NOT mention "PAS" - just apply it naturally.'
  },
  {
    id: 'landing-page',
    name: 'Landing Page Copy',
    description: 'Hero text and CTAs',
    category: 'Marketing',
    icon: <MessageSquare className="w-4 h-4" />,
    prompt: 'Create landing page copy using AIDA + QUEST framework: Attention (hero headline), Interest (subheadline), Desire (value props), Action (CTA), plus Qualify, Understand, Educate, Stimulate, Transition sections. Include social proof elements. Do NOT mention the frameworks - just apply them naturally.'
  },

  // Video & Multimedia
  {
    id: 'youtube-description',
    name: 'YouTube Description',
    description: 'Optimized video description',
    category: 'Video & Multimedia',
    icon: <Video className="w-4 h-4" />,
    prompt: 'Transform this transcript into a YouTube description. USE ONLY CONTENT FROM THE TRANSCRIPT. Format with: Opening paragraph (describe what was discussed in video), Main points paragraph (key topics covered). ## Timestamps: Create based on topic changes (0:00 Intro, 2:15 [First Topic], etc), ## Resources: List any resources/tools/links mentioned in transcript, Hashtags based on transcript topics. Use proper line breaks, emojis strategically. Do NOT add new topics - only organize the transcript content into YouTube description format.'
  },
  {
    id: 'video-script',
    name: 'Video Script',
    description: 'Full video narration script',
    category: 'Video & Multimedia',
    icon: <Video className="w-4 h-4" />,
    prompt: 'Transform this transcript into a video script. USE ONLY CONTENT FROM THE TRANSCRIPT. Format with: **INTRO (0-10 sec):** [Hook based on transcript opening] [Visual cue], **MAIN CONTENT:** Organize transcript content into sections with natural voice-over language and [Visual cues in brackets], **TRANSITIONS:** between topic changes, **OUTRO:** Recap key points from transcript + [End screen visual]. Use conversational language, proper punctuation for pauses. Include timing estimates. Do NOT add new topics - only reformat the transcript content into script format.'
  },
  {
    id: 'chapter-timestamps',
    name: 'Chapter Timestamps',
    description: 'Video chapters with titles',
    category: 'Video & Multimedia',
    icon: <Video className="w-4 h-4" />,
    prompt: 'Create chapter timestamps from this transcript. List each major section with timestamp and descriptive, benefit-driven title. Format: 00:00 - Introduction, 02:15 - [Main Benefit/Topic], etc.'
  },

  // Knowledge & Productivity
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description: 'Structured meeting summary',
    category: 'Knowledge',
    icon: <Book className="w-4 h-4" />,
    prompt: 'Transform this transcript into meeting notes. USE ONLY CONTENT FROM THE TRANSCRIPT. Format with: # Meeting Title (based on transcript topic), **Date:** [if mentioned], **Attendees:** [if mentioned], ## Context (what was discussed), ## Key Discussion Points (organize transcript content by topic with bullet points), ## Decisions Made (if mentioned), ## Outcomes (if discussed), ## Action Items: List tasks mentioned with owner/deadline if stated. Use proper markdown formatting. Do NOT add new information - only organize the transcript content into meeting notes format.'
  },
  {
    id: 'action-items',
    name: 'Action Items',
    description: 'Extract actionable tasks',
    category: 'Knowledge',
    icon: <Book className="w-4 h-4" />,
    prompt: 'Extract action items from this transcript. For each: task description, owner (if mentioned), priority (high/medium/low), deadline (if mentioned). Format as clear checklist with checkboxes.'
  },
  {
    id: 'faq',
    name: 'FAQ Document',
    description: 'Questions and answers',
    category: 'Knowledge',
    icon: <Book className="w-4 h-4" />,
    prompt: 'Transform this transcript into an FAQ document. USE ONLY CONTENT FROM THE TRANSCRIPT. Generate 8-12 questions based on topics and points actually discussed in the transcript, with answers derived from the transcript content. Format: ## Question 1?, Answer paragraph. Organize by topic/category if the transcript covers multiple subjects. Do NOT add questions about topics not in the transcript.'
  },
  {
    id: 'key-takeaways',
    name: 'Key Takeaways',
    description: 'Main points and insights',
    category: 'Knowledge',
    icon: <Book className="w-4 h-4" />,
    prompt: 'Extract ONLY the key takeaways, main points, and conclusions from this transcript. List 5-10 insights that were actually discussed or concluded in the transcript (1-2 sentences each). Format as numbered list. Do NOT add new insights - only extract what is in the transcript.'
  },

  // Community & Engagement
  {
    id: 'discussion-topics',
    name: 'Discussion Topics',
    description: 'Community discussion prompts',
    category: 'Community',
    icon: <Users className="w-4 h-4" />,
    prompt: 'Create 5-7 discussion prompts from this transcript. Each should be thought-provoking, open-ended, and encourage diverse perspectives. Perfect for community forums, Discord, or course discussions.'
  },
  {
    id: 'course-outline',
    name: 'Course Outline',
    description: 'Educational module structure',
    category: 'Community',
    icon: <Users className="w-4 h-4" />,
    prompt: 'Create a course outline from this transcript. Include: compelling course title, clear learning objectives, logical module breakdown (4-8 modules), key topics per module, suggested activities/exercises.'
  },

  // Creative & Insights
  {
    id: 'infographic-text',
    name: 'Infographic Text',
    description: 'Data points and stats',
    category: 'Creative',
    icon: <Lightbulb className="w-4 h-4" />,
    prompt: 'Transform this transcript into infographic text. USE ONLY CONTENT FROM THE TRANSCRIPT. Extract 5-8 key facts, statistics, or main points from the transcript. Format each as: ## [HEADLINE based on point], **Stat/Number if mentioned**, Supporting text (2-3 lines from transcript). Use **bold** for emphasis and numbers. Make each section scannable. Suggest relevant icons in [brackets]. Do NOT add new facts - only extract and format what is in the transcript.'
  },
  {
    id: 'presentation-outline',
    name: 'Presentation Outline',
    description: 'Slide deck structure',
    category: 'Creative',
    icon: <Lightbulb className="w-4 h-4" />,
    prompt: 'Create a presentation outline from this transcript. Format with: ## Slide 1: Title + Subtitle, ## Slide 2: Agenda (bullet points), ## Slides 3-12: Each slide as ## Slide X: [Title], followed by 3-5 bullet points with sub-bullets if needed, ## Conclusion Slide: Key takeaways (numbered), ## Final Slide: Call-to-Action. Use **bold** for emphasis, keep bullets concise. Ready for PowerPoint/Google Slides.'
  },
  {
    id: 'tutorial-guide',
    name: 'Tutorial Guide',
    description: 'Step-by-step how-to',
    category: 'Creative',
    icon: <Lightbulb className="w-4 h-4" />,
    prompt: 'Transform this transcript into a tutorial guide. USE ONLY CONTENT FROM THE TRANSCRIPT. If the transcript is instructional, format with: # Tutorial Title (based on transcript topic), ## What You Will Learn (bullet points from transcript), ## Step-by-Step Instructions: Extract and organize steps actually mentioned in transcript, add **Tips** and **Warnings** if discussed, ## Expected Results (if mentioned). If transcript is not instructional, create a how-to guide based on the concepts discussed. Use proper markdown. Do NOT add new steps - only organize what is in the transcript.'
  }
];

// Group content types by category
const CATEGORIES = [
  { id: 'Long-Form Written', name: 'Long-Form Written', icon: <FileText className="w-5 h-5" /> },
  { id: 'Social Media', name: 'Social Media', icon: <Share2 className="w-5 h-5" /> },
  { id: 'Marketing', name: 'Marketing & Outreach', icon: <MessageSquare className="w-5 h-5" /> },
  { id: 'Video & Multimedia', name: 'Video & Multimedia', icon: <Video className="w-5 h-5" /> },
  { id: 'Knowledge', name: 'Knowledge & Productivity', icon: <Book className="w-5 h-5" /> },
  { id: 'Community', name: 'Community & Learning', icon: <Users className="w-5 h-5" /> },
  { id: 'Creative', name: 'Creative & Insights', icon: <Lightbulb className="w-5 h-5" /> }
];

export default function ContentRepurposingPanel({ 
  transcriptionText, 
  transcriptionId,
  className = '' 
}: ContentRepurposingPanelProps) {
  const { user } = useAuth();
  const [fullTranscriptionText, setFullTranscriptionText] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedContentType, setSelectedContentType] = useState<ContentType | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contentCache, setContentCache] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [showCustomInstructions, setShowCustomInstructions] = useState(false);

  // Fetch full transcription text on mount
  useEffect(() => {
    const fetchFullTranscriptionText = async () => {
      if (!user || !transcriptionId) return;
      
      try {
        console.log('🔍 [ContentRepurposingPanel] Fetching full transcription text...');
        
        // Get the transcription record to access transcription_data_url
        const transcriptionRecord = await databaseService.getSTTRecordById(transcriptionId, user.uid);
        
        if (transcriptionRecord?.transcription_data_url) {
          console.log('📥 [ContentRepurposingPanel] Found transcription_data_url, fetching full text...');
          const fullData = await databaseService.getFullTranscriptionData(transcriptionRecord.transcription_data_url);
          
          if (fullData.transcript) {
            console.log('✅ [ContentRepurposingPanel] Full transcription text loaded:', {
              length: fullData.transcript.length,
              preview: fullData.transcript.substring(0, 100) + '...'
            });
            setFullTranscriptionText(fullData.transcript);
          } else {
            console.warn('⚠️ [ContentRepurposingPanel] No transcript found in full data, using provided text');
            setFullTranscriptionText(transcriptionText);
          }
        } else {
          console.warn('⚠️ [ContentRepurposingPanel] No transcription_data_url found, using provided text');
          setFullTranscriptionText(transcriptionText);
        }
      } catch (error) {
        console.error('❌ [ContentRepurposingPanel] Error fetching full transcription text:', error);
        console.warn('⚠️ [ContentRepurposingPanel] Falling back to provided transcription text');
        setFullTranscriptionText(transcriptionText);
      }
    };

    fetchFullTranscriptionText();
  }, [user, transcriptionId, transcriptionText]);

  const filteredContentTypes = selectedCategory
    ? CONTENT_TYPES.filter(ct => ct.category === selectedCategory)
    : [];

  const generateContent = async (contentType: ContentType) => {
    // Check cache first
    if (contentCache[contentType.id]) {
      setGeneratedContent(contentCache[contentType.id]);
      setSelectedContentType(contentType);
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedContentType(contentType);

    try {
      // Check word limits BEFORE generating content
      console.log('🔍 Checking word limits...');
      const estimatedWords = contentType.estimatedWords || 500; // Default estimate if not specified
      const limitStatus = await contentLimitService.checkCanGenerate(1); // Check if user has ANY words
      
      if (!limitStatus.canGenerate) {
        console.log('❌ Cannot generate content:', limitStatus.reason);
        setError(limitStatus.reason || 'You have reached your word limit.');
        setLoading(false);
        return;
      }

      // Calculate actual word limit for generation
      const availableWords = limitStatus.totalAvailable;
      const actualWordLimit = Math.min(estimatedWords, availableWords);

      console.log(`✅ Word limit check passed. Requested: ${estimatedWords} words, Available: ${availableWords} words, Generating: ${actualWordLimit} words`);
      console.log('🤖 Generating content with DeepSeek...');
      
      // Build the prompt with optional custom instructions and word limit
      let finalPrompt = contentType.prompt;
      
      // Add word limit constraint
      finalPrompt = `${finalPrompt}\n\nIMPORTANT WORD LIMIT: Generate MAXIMUM ${actualWordLimit} words. Keep it concise and within this limit.`;
      console.log(`📏 Setting word limit: ${actualWordLimit} words`);
      
      if (customInstructions.trim()) {
        console.log('🎨 Using custom instructions:', customInstructions);
        // Custom instructions should guide what the content is ABOUT (topic/direction)
        // The regular prompt already tells the TYPE to make (Facebook post, formula, etc.)
        finalPrompt = `${finalPrompt}\n\nCUSTOM TOPIC DIRECTION:\n${customInstructions.trim()}\n\nCRITICAL: The custom instructions above guide which aspects or topics from the transcript to emphasize. However, ALL information MUST come from the transcript below. Do NOT add any information, facts, or content that is not in the transcript. The custom instructions only guide which parts of the transcript to focus on or highlight - they do not allow adding new information. Use the content type format (defined above) while following the topic/direction to emphasize specific aspects FROM THE TRANSCRIPT ONLY.`;
      }
      
      // Always emphasize that transcript is the ONLY source, regardless of custom instructions
      finalPrompt = `${finalPrompt}\n\nTRANSCRIPT (USE THIS AS YOUR ONLY SOURCE OF INFORMATION):`;
      
      console.log('🎯 [ContentRepurposing] Generating content:', {
        contentType: contentType.name,
        fullTranscriptionTextLength: fullTranscriptionText.length,
        transcriptionTextLength: transcriptionText.length,
        textToUseLength: (fullTranscriptionText || transcriptionText).length,
        usingFullText: !!fullTranscriptionText,
        textPreview: (fullTranscriptionText || transcriptionText).substring(0, 200) + '...',
        finalPromptPreview: finalPrompt.substring(0, 300) + '...'
      });
      
      // Use axios to call DeepSeek API directly (same as AI Summary)
      const axios = (await import('axios')).default;
      
      const apiEndpoint = process.env.NEXT_PUBLIC_DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions';
      const response = await axios.post(apiEndpoint, {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `You are a content formatter who ONLY reformats existing content. You are NOT allowed to create new content, add information, or make up anything.

ABSOLUTE RULES - NO EXCEPTIONS:
1. You MUST use ONLY the exact information, topics, facts, and details from the provided transcript
2. You are FORBIDDEN from adding ANY information not explicitly stated in the transcript
3. You are FORBIDDEN from making up examples, stories, scenarios, or advice
4. You are FORBIDDEN from adding generic content, motivational quotes, or filler text
5. If the transcript is about "Once upon a time", your content MUST be about "Once upon a time"
6. If the transcript is about "testing voice samples", your content MUST be about "testing voice samples"
7. If the transcript mentions specific names, dates, or facts, use ONLY those exact details
8. Your ONLY job is to reformat the transcript content into the requested format - nothing more

WORD LIMIT: Your response must be MAXIMUM ${actualWordLimit} words. Count carefully and stop at exactly ${actualWordLimit} words or less.

Return ONLY the formatted content without any preamble, explanations, or remarks. Start directly with the content itself.`
          },
          {
            role: 'user',
            content: `${finalPrompt}\n\n=== TRANSCRIPT (YOUR ONLY SOURCE OF INFORMATION) ===\n${fullTranscriptionText || transcriptionText}\n=== END OF TRANSCRIPT ===\n\nCRITICAL REQUIREMENTS:\n1. Use ONLY information from the transcript above - NOTHING ELSE\n2. Do NOT add any information, facts, examples, or advice not in the transcript\n3. Do NOT make up content or use generic filler text\n4. If custom instructions are provided, they only guide which parts of the transcript to emphasize - they do NOT allow adding new information\n5. Return ONLY the final content without any preamble or meta-commentary\n6. Start with the actual content immediately\n7. MAXIMUM ${actualWordLimit} WORDS\n\nNow reformat the transcript above into the requested format, using ONLY the information provided in the transcript:`
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || ''}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status !== 200) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const content = response.data.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content generated');
      }

      console.log('✅ Content generated successfully');
      const trimmedContent = content.trim();
      
      // Calculate word count and deduct from user's limit
      const wordCount = trimmedContent.split(/\s+/).filter(Boolean).length;
      console.log(`📊 Generated content: ${wordCount} words`);

      try {
        await contentLimitService.deductWords(wordCount);
        console.log(`💳 Deducted ${wordCount} words from user limit`);
      } catch (deductError) {
        console.error('⚠️ Warning: Could not deduct words from limit:', deductError);
        // Continue anyway - content was generated successfully
      }
      
      setGeneratedContent(trimmedContent);
      setContentCache(prev => ({ ...prev, [contentType.id]: trimmedContent }));
    } catch (err) {
      console.error('❌ Error generating content:', err);
      setError(`Failed to generate content: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const regenerateContent = async () => {
    if (!selectedContentType) return;
    
    // Clear cache for this content type to force regeneration
    setContentCache(prev => {
      const newCache = { ...prev };
      delete newCache[selectedContentType.id];
      return newCache;
    });
    
    await generateContent(selectedContentType);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadContent = () => {
    if (!selectedContentType) return;
    
    const blob = new Blob([generatedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedContentType.name.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-2 mb-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Content Repurposing</h3>
        </div>
        <p className="text-sm text-gray-600">
          Transform your transcript into 30+ content types
        </p>
      </div>

      <div className="p-6">
        {!selectedCategory ? (
          // Category Selection
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 mb-4">Select a content category:</p>
            {CATEGORIES.map(category => {
              const categoryCount = CONTENT_TYPES.filter(ct => ct.category === category.id).length;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-gray-400 group-hover:text-purple-600 transition-colors">
                      {category.icon}
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900">{category.name}</div>
                      <div className="text-xs text-gray-500">{categoryCount} content types</div>
                    </div>
                  </div>
                  <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-purple-600" />
                </button>
              );
            })}
          </div>
        ) : !selectedContentType ? (
          // Content Type Selection
          <div className="space-y-4">
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
            <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <button
                onClick={() => setShowCustomInstructions(!showCustomInstructions)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-medium text-purple-900">
                    Custom Instructions (Optional)
                  </span>
                </div>
                {showCustomInstructions ? <ChevronUp className="w-3 h-3 text-purple-600" /> : <ChevronDown className="w-3 h-3 text-purple-600" />}
              </button>
              
              {showCustomInstructions && (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="Example: 'Focus on the marketing strategy discussed', 'Emphasize the customer success story', 'Highlight technical details', etc."
                    className="w-full px-2 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs"
                    rows={2}
                  />
                  <p className="text-xs text-purple-700">
                    💡 Guide what the content should be about (topic/direction). The content type sets the format, while your instructions guide which aspects from the transcript to emphasize.
                  </p>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {filteredContentTypes.map(contentType => (
                <button
                  key={contentType.id}
                  onClick={() => generateContent(contentType)}
                  disabled={loading}
                  className="flex items-start p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-gray-400 group-hover:text-purple-600 mt-0.5 mr-3">
                    {contentType.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 mb-1">{contentType.name}</div>
                    <div className="text-xs text-gray-500">{contentType.description}</div>
                  </div>
                  {contentCache[contentType.id] && (
                    <CheckCircle className="w-4 h-4 text-green-500 ml-2 mt-1" />
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Generated Content Display
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  setSelectedContentType(null);
                  setGeneratedContent('');
                  setError(null);
                }}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium"
              >
                ← Back to formats
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
                disabled={loading}
                className="text-purple-600 hover:text-purple-700 disabled:opacity-50"
                title="Regenerate"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-3" />
                  <p className="text-sm text-gray-600">Generating content...</p>
                </div>
              </div>
            )}

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
            {!loading && generatedContent && (
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-6 border border-gray-200 max-h-96 overflow-y-auto">
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-4" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-xl font-bold text-gray-900 mt-5 mb-3" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-lg font-bold text-gray-900 mt-4 mb-2" {...props} />,
                        p: ({node, ...props}) => <p className="text-gray-800 mb-4 leading-relaxed" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 space-y-2" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />,
                        li: ({node, ...props}) => <li className="text-gray-800" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-gray-900" {...props} />,
                        em: ({node, ...props}) => <em className="italic text-gray-800" {...props} />,
                        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-purple-500 pl-4 italic my-4" {...props} />,
                      }}
                    >
                      {generatedContent}
                    </ReactMarkdown>
                  </div>
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
  );
}

