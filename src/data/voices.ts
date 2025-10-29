export interface Voice {
  id: string;
  name: string;
  description: string;
  language: string;
  gender: string;
  category: string;
  isMultiSpeaker?: boolean;
  downloadURL?: string; // Firebase download URL for custom voices
}

/**
 * Function to map existing granular categories to new consolidated categories
 */
function mapToConsolidatedCategory(oldCategory: string): string {
  const categoryMap: { [key: string]: string } = {
    // Business & Professional
    'Corporate': 'Business',
    'Finance': 'Business',
    'Commercial': 'Business',
    'Professional': 'Professional',
    'Customer Service': 'Business',
    'Hospitality': 'Business',
    
    // Entertainment & Media
    'Podcast': 'Entertainment',
    'Radio': 'Entertainment',
    'TV': 'Entertainment',
    'Comedy': 'Entertainment',
    'Entertainment': 'Entertainment',
    'ASMR': 'Entertainment',
    'Fantasy': 'Entertainment',
    'Suspense': 'Entertainment',
    'Parody': 'Entertainment',
    'Satirist': 'Entertainment',
    'Improv': 'Entertainment',
    'Observational': 'Entertainment',
    'Prank': 'Entertainment',
    'Commentary': 'Entertainment',
    
    // Education & Learning
    'Educational': 'Education',
    'Philosophy': 'Education',
    'Science': 'Education',
    'Documentary': 'Education',
    'Storytelling': 'Education',
    'Literary': 'Education',
    'Narration': 'Education',
    
    // News & Media
    'News': 'News & Media',
    'Current Affairs': 'News & Media',
    'True Crime': 'News & Media',
    'Debate': 'News & Media',
    'Panel': 'News & Media',
    'Activism': 'News & Media',
    'Political': 'News & Media',
    
    // Health & Wellness
    'Wellness': 'Health & Wellness',
    'Medical': 'Health & Wellness',
    'Therapy': 'Health & Wellness',
    'Meditation': 'Health & Wellness',
    'Mindfulness': 'Health & Wellness',
    'Motivational': 'Health & Wellness',
    'Inspirational': 'Health & Wellness',
    
    // Technology
    'Technology': 'Technology',
    'Synthetic': 'Technology',
    'AI': 'Technology',
    
    // Sports & Fitness
    'Sports': 'Sports & Fitness',
    'Fitness': 'Sports & Fitness',
    'Activity': 'Sports & Fitness',
    
    // Travel & Culture
    'Travel': 'Travel & Culture',
    'Cultural': 'Travel & Culture',
    'Regional': 'Travel & Culture',
    'Urban': 'Travel & Culture',
    
    // Creative Arts
    'Creative': 'Creative Arts',
    'Music': 'Creative Arts',
    'Art': 'Creative Arts',
    'Design': 'Creative Arts',
    'Fashion': 'Creative Arts',
    'Beauty': 'Creative Arts',
    
    // Lifestyle
    'Lifestyle': 'Lifestyle',
    'Cooking': 'Lifestyle',
    'Parenting': 'Lifestyle',
    'Youth': 'Lifestyle',
    'Elderly': 'Lifestyle',
    'Casual': 'Lifestyle',
    'Energetic': 'Lifestyle',
    'Mystical': 'Lifestyle',
    
    // Community & Social
    'Community': 'Community',
    'Social Media': 'Community',
    'Influencer': 'Community',
    'Reviews': 'Community',
    'Support': 'Community',
    
    // Character & Voice Types
    'Character': 'Creative Arts',
    'Emotional': 'Creative Arts',
    'Neutral': 'Professional',
    'Male': 'Professional',
    'Female': 'Professional',
  };
  
  return categoryMap[oldCategory] || 'Professional';
}

/**
 * ALL 100+ voices from both VOICE_MASTER_LIST.txt and PODCAST_WAV_MASTER_LIST.txt
 * Updated with consolidated categories
 */
export const ALL_VOICES: Voice[] = [
  // === PODCAST/INFLUENCER WAV VOICE COLLECTION (75 voices) ===
  
  // Energetic Podcast Hosts (1-10)
  { id: 'Blake_Sports_Podcast_Host', name: 'Blake - Sports Podcast Host', description: 'Upbeat millennial male host, fast-paced, inviting, sports podcast.', language: 'English', gender: 'Male', category: 'Entertainment' },
  { id: 'Luna_Music_Review_Host', name: 'Luna - Music Review Host', description: 'Cool, laid-back female host, moderate energy, music review show.', language: 'English', gender: 'Female', category: 'Entertainment' },
  { id: 'Zack_Gaming_Enthusiast', name: 'Zack - Gaming Enthusiast', description: 'Enthusiastic young gamer male host, lively, quick tempo, gaming podcast.', language: 'English', gender: 'Male', category: 'Entertainment' },
  { id: 'Maya_Pop_Culture_Queen', name: 'Maya - Pop Culture Queen', description: 'Witty Gen Z female host, playful, rapid exchanges, pop culture podcast.', language: 'English', gender: 'Female', category: 'Entertainment' },
  { id: 'Professor_Crime_Analyst', name: 'Professor - Crime Analyst', description: 'Intellectual older male, deep voice, measured but dynamic, true crime podcast.', language: 'English', gender: 'Male', category: 'News & Media' },
  { id: 'Sofia_Relationship_Coach', name: 'Sofia - Relationship Coach', description: 'Warm, vibrant Latina female, quick delivery, relationship advice podcast.', language: 'English', gender: 'Female', category: 'Health & Wellness' },
  { id: 'Benedict_Current_Affairs', name: 'Benedict - Current Affairs', description: 'Assertive British male host, confident, expressive, current affairs roundtable.', language: 'English', gender: 'Male', category: 'News & Media' },
  { id: 'Scarlett_Comedy_Southern', name: 'Scarlett - Comedy Southern', description: 'Sassy, humorous Southern female, energetic, comedy podcast.', language: 'English', gender: 'Female', category: 'Entertainment' },
  { id: 'Marcus_Mindfulness_Guide', name: 'Marcus - Mindfulness Guide', description: 'Friendly Gen X male, steady pace, thoughtful, mindfulness podcast.', language: 'English', gender: 'Male', category: 'Health & Wellness' },
  { id: 'Zara_Beauty_Influencer', name: 'Zara - Beauty Influencer', description: 'Charismatic young Black female host, animated, beauty/fashion influencer.', language: 'English', gender: 'Female', category: 'Creative Arts' },

  // Radio Personalities & TV Presenters (11-20)
  { id: 'Rocco_Classic_Rock_DJ', name: 'Rocco - Classic Rock DJ', description: 'Gravelly voiced classic rock DJ, American accent, energetic, radio.', language: 'English', gender: 'Male', category: 'Entertainment' },
  { id: 'Tony_NYC_Morning_Radio', name: 'Tony - NYC Morning Radio', description: 'Slick, spirited NYC morning radio host, brisk, high-energy.', language: 'English', gender: 'Male', category: 'Entertainment' },
  { id: 'Grace_Weather_Forecaster', name: 'Grace - Weather Forecaster', description: 'Calm, trusted weather forecaster, gentle pace, reassuring, TV.', language: 'English', gender: 'Female', category: 'News & Media' },
  { id: 'Veronica_TV_News_Anchor', name: 'Veronica - TV News Anchor', description: 'Energetic TV news anchor (female), engaging tone, rapid headline delivery.', language: 'English', gender: 'Female', category: 'News & Media' },
  { id: 'Retro_Radio_Pirate', name: 'Retro - Radio Pirate', description: 'Nostalgic 80s pirate radio host, lively, storytelling.', language: 'English', gender: 'Male', category: 'Entertainment' },
  { id: 'Cyrus_Sarcastic_Critic', name: 'Cyrus - Sarcastic Critic', description: 'Sarcastic TV critic, deadpan delivery, snarky tone.', language: 'English', gender: 'Male', category: 'Entertainment' },
  { id: 'Amelie_French_Culture', name: 'Amelie - French Culture', description: 'Elegant French culture presenter, articulate, moderate speed.', language: 'French', gender: 'Female', category: 'Travel & Culture' },
  { id: 'Aussie_Variety_Host', name: 'Aussie - Variety Host', description: 'Expressive Australian variety show host, dynamic, upbeat.', language: 'English', gender: 'Male', category: 'Entertainment' },
  { id: 'Seamus_Irish_Phone_Host', name: 'Seamus - Irish Phone Host', description: 'Wry Irish late-night phone-in host, conversational, relaxed.', language: 'English', gender: 'Male', category: 'Entertainment' },
  { id: 'Dr_Maple_Science_Radio', name: 'Dr. Maple - Science Radio', description: 'Eccentric Canadian radio scientist, fast, exciting explanations.', language: 'English', gender: 'Male', category: 'Education' },

  // Influencer & Content Creator Styles (21-25)
  { id: 'Tessa_TikTok_Star', name: 'Tessa - TikTok Star', description: 'Lively TikTok influencer (female), expressive, rapid-fire.', language: 'English', gender: 'Female', category: 'Community' },
  { id: 'Adventure_Vlog_Jake', name: 'Jake - Adventure Vlogger', description: 'Vlog-style energetic male, upbeat, natural, travel content.', language: 'English', gender: 'Male', category: 'Travel & Culture' },
  { id: 'Inspire_Coach_Mia', name: 'Mia - Inspiration Coach', description: 'Motivational Instagram coach, female, inspiring, quick tempo.', language: 'English', gender: 'Female', category: 'Health & Wellness' },
  { id: 'Wellness_Creator_Sage', name: 'Sage - Wellness Creator', description: 'Nurturing YouTube creator, gentle, moderate pace, wellness vlogs.', language: 'English', gender: 'Female', category: 'Health & Wellness' },
  { id: 'Explorer_Outdoors_Max', name: 'Max - Outdoor Explorer', description: 'Adventurous outdoorsman host, dynamic, vivid, YouTube expeditions.', language: 'English', gender: 'Male', category: 'Travel & Culture' },

  // Emotional Presence & Personality (27-36)
  { id: 'Motivator_Joy_Speaker', name: 'Joy - Motivational Speaker', description: 'Joyful motivational speaker (male), vibrant, expressive.', language: 'English', gender: 'Male', category: 'Health & Wellness' },
  { id: 'Sincere_Apology_Voice', name: 'Sincere - Apology Voice', description: 'Sincere apology tone, gentle, moderate pace, influencer address.', language: 'English', gender: 'Neutral', category: 'Professional' },
  { id: 'Zen_Meditation_Master', name: 'Zen - Meditation Master', description: 'Calm, meditative guide (gender-neutral), soothing, tranquil.', language: 'English', gender: 'Neutral', category: 'Health & Wellness' },
  { id: 'Bestie_Social_Bubbly', name: 'Bestie - Social Bubbly', description: 'Playful best friend voice, bubbly, fast-paced, social podcast.', language: 'English', gender: 'Female', category: 'Community' },
  { id: 'Honest_Confessional_Raw', name: 'Raw - Honest Confessional', description: 'Vulnerable, slightly shaky but real, honest influencer confessional.', language: 'English', gender: 'Neutral', category: 'Community' },
  { id: 'Celebration_Party_Host', name: 'Party - Celebration Host', description: 'Bold, celebratory host, cheers and applause in speech.', language: 'English', gender: 'Neutral', category: 'Entertainment' },
  { id: 'Surprise_Panel_Reactor', name: 'Reactor - Surprise Panel', description: 'Surprised, quick, animated responder, panel show.', language: 'English', gender: 'Neutral', category: 'Entertainment' },

  // Niche Podcast Genres (37-46)
  { id: 'GameNight_Sports_Recap', name: 'GameNight - Sports Recap', description: 'Dramatic sports recap announcer (male), intense, game-night energy.', language: 'English', gender: 'Male', category: 'Sports & Fitness' },
  { id: 'Whisper_ASMR_Gentle', name: 'Whisper - ASMR Gentle', description: 'Gentle ASMR podcaster (female), whisper-soft, slow, serene.', language: 'English', gender: 'Female', category: 'Entertainment' },
  { id: 'Fantasy_Lore_Keeper', name: 'Lore - Fantasy Keeper', description: 'Animated fantasy lore storyteller, magical tone, swift.', language: 'English', gender: 'Neutral', category: 'Creative Arts' },
  { id: 'Homey_Cooking_Chef', name: 'Chef - Homey Cooking', description: 'Relaxed food/cooking host (male), warm, moderate, homey.', language: 'English', gender: 'Male', category: 'Lifestyle' },
  { id: 'Philosophy_Deep_Thinker', name: 'Thinker - Philosophy Deep', description: 'Introspective philosophy podcast host, thoughtful, moderate, reflective.', language: 'English', gender: 'Neutral', category: 'Education' },
  { id: 'TrueCrime_Team_Energy', name: 'Team - True Crime Energy', description: 'Lively true crime team, energetic group exchanges, multi-speaker style.', language: 'English', gender: 'Neutral', category: 'News & Media' },
  { id: 'Travel_Couple_Casual', name: 'Couple - Travel Casual', description: 'Relaxed travel couple voice, alternating style, casual, conversational.', language: 'English', gender: 'Neutral', category: 'Travel & Culture' },
  { id: 'Debate_Sharp_Moderator', name: 'Moderator - Debate Sharp', description: 'Intense debate moderator, fast, sharp, strong transitions.', language: 'English', gender: 'Neutral', category: 'News & Media' },
  { id: 'Finance_Tips_Expert', name: 'Expert - Finance Tips', description: 'Personal finance tips host (female), sharp, engaging.', language: 'English', gender: 'Female', category: 'Business' },
  { id: 'Victory_Sports_Ecstatic', name: 'Victory - Sports Ecstatic', description: 'Ecstatic sports victory commentator, raised tempo.', language: 'English', gender: 'Neutral', category: 'Sports & Fitness' },

  // Social/Community Voice Styles (47-51)
  { id: 'Community_Call_Helper', name: 'Helper - Community Call', description: 'Community call-in show, empathetic host, patient, caring.', language: 'English', gender: 'Neutral', category: 'Community' },
  { id: 'Humor_Debate_Panelist', name: 'Panelist - Humor Debate', description: 'Humorous debate show panelist (male), witty, quick, banter.', language: 'English', gender: 'Male', category: 'Entertainment' },
  { id: 'TownHall_Compassionate', name: 'TownHall - Compassionate', description: 'Sensitive, compassionate town hall moderator (female).', language: 'English', gender: 'Female', category: 'Community' },
  { id: 'Parent_Talk_Supportive', name: 'Parent - Talk Supportive', description: 'Friendly, supportive parent talk show host, gentle.', language: 'English', gender: 'Neutral', category: 'Lifestyle' },
  { id: 'Honest_Review_Critical', name: 'Review - Honest Critical', description: 'Honest, no-nonsense reviewer, critical, firm but fair.', language: 'English', gender: 'Neutral', category: 'Community' },

  // Regional/Accent Diversity (52-60)
  { id: 'NewYork_Fast_Talker', name: 'NewYork - Fast Talker', description: 'Fast-talking New Yorker podcast host, classic accent.', language: 'English', gender: 'Neutral', category: 'Travel & Culture' },
  { id: 'Southern_Radio_Drawl', name: 'Southern - Radio Drawl', description: 'Southern US talk radio male, animated, drawl.', language: 'English', gender: 'Male', category: 'Entertainment' },
  { id: 'London_Urban_Podcast', name: 'London - Urban Podcast', description: 'Fast-paced urban London podcast voice, energetic.', language: 'English', gender: 'Neutral', category: 'Travel & Culture' },
  { id: 'Scottish_Story_Warm', name: 'Scottish - Story Warm', description: 'Relaxed Scottish storytelling host, warm, playful.', language: 'English', gender: 'Neutral', category: 'Creative Arts' },
  { id: 'Toronto_News_Clipped', name: 'Toronto - News Clipped', description: 'Abrupt Toronto news podcaster, clipped but lively.', language: 'English', gender: 'Neutral', category: 'News & Media' },
  { id: 'Dublin_Quick_Wit', name: 'Dublin - Quick Wit', description: 'Quick-witted Dublin podcaster (female), musical voice.', language: 'English', gender: 'Female', category: 'Entertainment' },
  { id: 'Berlin_Energetic_Voice', name: 'Berlin - Energetic Voice', description: 'Energetic Berlin influencer (male), quick, expressive.', language: 'German', gender: 'Male', category: 'Community' },
  { id: 'Tokyo_Panel_Poised', name: 'Tokyo - Panel Poised', description: 'Poised Tokyo TV panel host, brisk, respectful.', language: 'Japanese', gender: 'Neutral', category: 'News & Media' },
  { id: 'Mumbai_Youth_Dynamic', name: 'Mumbai - Youth Dynamic', description: 'Upbeat Mumbai youth radio, lively, dynamic.', language: 'English', gender: 'Neutral', category: 'Lifestyle' },

  // Comedic & Satirical Styles (61-65)
  { id: 'Parody_Exaggerated_Host', name: 'Parody - Exaggerated Host', description: 'Over-the-top parody host, exaggerated delivery.', language: 'English', gender: 'Neutral', category: 'Entertainment' },
  { id: 'Deadpan_Satirist_Dry', name: 'Deadpan - Satirist Dry', description: 'Deadpan satirist, dry, slow, subtle humor.', language: 'English', gender: 'Neutral', category: 'Entertainment' },
  { id: 'Improv_Zany_Comedian', name: 'Improv - Zany Comedian', description: 'Zany improv comedian (male), rapid, offbeat.', language: 'English', gender: 'Male', category: 'Entertainment' },
  { id: 'Observational_Comedy_Live', name: 'Observational - Comedy Live', description: 'Observational comedian (female), animated, lively.', language: 'English', gender: 'Female', category: 'Entertainment' },
  { id: 'Prank_Mischief_Announcer', name: 'Prank - Mischief Announcer', description: 'Prank show announcer, high energy, mischief.', language: 'English', gender: 'Neutral', category: 'Entertainment' },

  // Emotional Shifted Styles (66-70)
  { id: 'Outrage_Commentary_Sharp', name: 'Outrage - Commentary Sharp', description: 'Outraged commentator host, sharp, rapid.', language: 'English', gender: 'Neutral', category: 'News & Media' },
  { id: 'Disappointed_Gentle_Host', name: 'Disappointed - Gentle Host', description: 'Disappointed host, sad undertone, gentle.', language: 'English', gender: 'Neutral', category: 'Creative Arts' },
  { id: 'Anticipation_Suspense_Build', name: 'Anticipation - Suspense Build', description: 'Eager anticipation, heightened pace, suspenseful.', language: 'English', gender: 'Neutral', category: 'Entertainment' },
  { id: 'Frustrated_Complaint_Reader', name: 'Frustrated - Complaint Reader', description: 'Frustrated customer complaint reader, animated.', language: 'English', gender: 'Neutral', category: 'Business' },
  { id: 'Heartfelt_Thank_You', name: 'Heartfelt - Thank You', description: 'Heartfelt thank you message, warm, slow, sincere.', language: 'English', gender: 'Neutral', category: 'Creative Arts' },

  // Thoughtful/Educational (71-75)
  { id: 'Science_Passion_Explainer', name: 'Science - Passion Explainer', description: 'Passionate science explainer, fast but clear.', language: 'English', gender: 'Neutral', category: 'Education' },
  { id: 'History_Methodical_Voice', name: 'History - Methodical Voice', description: 'Methodical historian voice, careful, moderate tempo.', language: 'English', gender: 'Neutral', category: 'Education' },
  { id: 'PopCulture_Fun_Explainer', name: 'PopCulture - Fun Explainer', description: 'Playful pop culture explainer, quick, fun.', language: 'English', gender: 'Neutral', category: 'Entertainment' },
  { id: 'Literary_Poetic_Critic', name: 'Literary - Poetic Critic', description: 'Emotional literary critic, poetic, varied pace.', language: 'English', gender: 'Neutral', category: 'Creative Arts' },
  { id: 'Tech_Analytical_Reviewer', name: 'Tech - Analytical Reviewer', description: 'Detailed technology reviewer, analytical, crisp, moderate-fast.', language: 'English', gender: 'Neutral', category: 'Technology' },

  // Additional Generated Voices (76-87)
  { id: 'Yoga_Mindful_Center', name: 'Yoga - Mindful Center', description: 'Mindful yoga podcast host, centered, slow, deliberate.', language: 'English', gender: 'Neutral', category: 'Health & Wellness' },
  { id: 'Yoga_Mindful_Center_Alt', name: 'Yoga - Mindful Center Alt', description: 'Alternative version of mindful yoga podcast host.', language: 'English', gender: 'Neutral', category: 'Health & Wellness' },
  { id: 'Couples_Therapy_Banter', name: 'Couples - Therapy Banter', description: 'Fast-paced couples therapy podcast, playful banter.', language: 'English', gender: 'Neutral', category: 'Health & Wellness' },
  { id: 'Couples_Therapy_Banter_Alt', name: 'Couples - Therapy Banter Alt', description: 'Alternative version of couples therapy podcast host.', language: 'English', gender: 'Neutral', category: 'Health & Wellness' },

  // === AI SAAS VOICE COLLECTION (94 voices) ===
  
  // Narration & Audiobook (1-5)
  { id: 'Sophia_British_Narrator', name: 'Sophia - British Narrator', description: 'Warm, friendly female voice with a slight British accent, moderately fast, perfect for audiobook narration.', language: 'English', gender: 'Female', category: 'Creative Arts' },
  { id: 'Marcus_Bedtime_Storyteller', name: 'Marcus - Bedtime Storyteller', description: 'Deep, soothing male voice with a neutral American accent, slow pace, ideal for bedtime stories.', language: 'English', gender: 'Male', category: 'Creative Arts' },
  { id: 'Eileen_Irish_Grandmother', name: 'Eileen - Irish Grandmother', description: 'Soft-spoken elderly woman with gentle Irish lilt, slow and tender, suited for children\'s books.', language: 'English', gender: 'Female', category: 'Creative Arts' },
  { id: 'Hamish_Scottish_Fantasy', name: 'Hamish - Scottish Fantasy', description: 'Lively Scottish male voice, energetic and quick, for fantasy tales.', language: 'English', gender: 'Male', category: 'Creative Arts' },
  { id: 'Olivia_Australian_Educator', name: 'Olivia - Australian Educator', description: 'Clear, engaging young woman with Australian accent, average speed, for non-fiction narration.', language: 'English', gender: 'Female', category: 'Education' },

  // Documentary & Announcer (6-10)
  { id: 'David_Documentary_Voice', name: 'David - Documentary Voice', description: 'Deep, authoritative male voice with confidence and gravitas, steady pace, ideal for documentary voiceovers.', language: 'English', gender: 'Male', category: 'Education' },
  { id: 'Rachel_News_Reporter', name: 'Rachel - News Reporter', description: 'Bright, articulate female voice with midwestern US accent, fast-paced, for news reporting.', language: 'English', gender: 'Female', category: 'News & Media' },
  { id: 'Winston_History_Narrator', name: 'Winston - History Narrator', description: 'Mature, formal British male, with RP accent, poised and measured, suited for history documentaries.', language: 'English', gender: 'Male', category: 'Education' },
  { id: 'Victoria_Breaking_News', name: 'Victoria - Breaking News', description: 'Determined, no-nonsense American woman, rapid delivery, for breaking news updates.', language: 'English', gender: 'Female', category: 'News & Media' },
  { id: 'Connor_Nature_Guide', name: 'Connor - Nature Guide', description: 'Resonant Canadian male, calm and unhurried, for nature documentaries.', language: 'English', gender: 'Male', category: 'Education' },

  // Educational & Instructional (11-15)
  { id: 'Emma_Educational_Coach', name: 'Emma - Educational Coach', description: 'Cheerful, energetic young voice with enthusiasm and clarity, moderate speed, great for educational content.', language: 'English', gender: 'Female', category: 'Education' },
  { id: 'Priya_Indian_Teacher', name: 'Priya - Indian Teacher', description: 'Clear-spoken Indian female teacher, warm tone, steady pace, ideal for e-learning.', language: 'English', gender: 'Female', category: 'Education' },
  { id: 'Hiroshi_Japanese_Instructor', name: 'Hiroshi - Japanese Instructor', description: 'Patient, friendly Japanese male educator, coaching tone, moderate speed.', language: 'English', gender: 'Male', category: 'Education' },
  { id: 'Tyler_STEM_Explainer', name: 'Tyler - STEM Explainer', description: 'Animated US teen, upbeat and lively, quick delivery, for STEM explainer videos.', language: 'English', gender: 'Male', category: 'Education' },
  { id: 'Margaret_British_Tutor', name: 'Margaret - British Tutor', description: 'Encouraging older female instructor, gentle British accent, slow to moderate speed.', language: 'English', gender: 'Female', category: 'Education' },

  // Corporate & Professional (16-20)
  { id: 'James_Corporate_Executive', name: 'James - Corporate Executive', description: 'Confident American male executive, persuasive tone, moderately fast, for corporate presentations.', language: 'English', gender: 'Male', category: 'Business' },
  { id: 'Ingrid_German_Professional', name: 'Ingrid - German Professional', description: 'Sleek, professional German woman, precise diction, brisk speed, for business narration.', language: 'German', gender: 'Female', category: 'Professional' },
  { id: 'Nomsa_South_African_HR', name: 'Nomsa - South African HR', description: 'Warm, accepting HR manager voice, South African accent, moderate and friendly.', language: 'English', gender: 'Female', category: 'Business' },
  { id: 'Wei_Singapore_Analyst', name: 'Wei - Singapore Analyst', description: 'Clear, analytical Singaporean male, sharp delivery, for finance briefings.', language: 'English', gender: 'Male', category: 'Business' },
  { id: 'Camille_French_Entrepreneur', name: 'Camille - French Entrepreneur', description: 'Assertive French female, expressive and inspiring, for entrepreneurship podcasts.', language: 'French', gender: 'Female', category: 'Business' },

  // Customer Service (21-25)
  { id: 'Ashley_Customer_Service', name: 'Ashley - Customer Service', description: 'Friendly, helpful US female, varied energy, fast-paced for customer service.', language: 'English', gender: 'Female', category: 'Business' },
  { id: 'Oliver_British_Support', name: 'Oliver - British Support', description: 'Calm British male, patient and measured, for support interactions.', language: 'English', gender: 'Male', category: 'Business' },
  { id: 'Maria_Filipino_Agent', name: 'Maria - Filipino Agent', description: 'Lively Filipino woman, enthusiastic, moderate speed for call center use.', language: 'English', gender: 'Female', category: 'Business' },
  { id: 'Dr_Robert_Medical_Advisor', name: 'Dr. Robert - Medical Advisor', description: 'Gentle, empathetic elderly man, slow pace, perfect for medical advice lines.', language: 'English', gender: 'Male', category: 'Health & Wellness' },
  { id: 'Isabella_Brazilian_Travel', name: 'Isabella - Brazilian Travel', description: 'Youthful, clear Brazilian woman, energetic, for travel booking.', language: 'Portuguese', gender: 'Female', category: 'Travel & Culture' },

  // Acting & Character Voices (26-30)
  { id: 'Giovanni_Italian_Actor', name: 'Giovanni - Italian Actor', description: 'Dramatic Italian male, theatrical, energetic and intense, for monologue acting.', language: 'Italian', gender: 'Male', category: 'Creative Arts' },
  { id: 'Celeste_French_Performer', name: 'Celeste - French Performer', description: 'Playful French female, animated and charming, swift delivery for children\'s entertainment.', language: 'French', gender: 'Female', category: 'Creative Arts' },
  { id: 'Samantha_Sarcastic_Host', name: 'Samantha - Sarcastic Host', description: 'Sarcastic, witty American woman, lively, fast-paced, for satirical podcasts.', language: 'English', gender: 'Female', category: 'Entertainment' },
  { id: 'Dmitri_Russian_Philosopher', name: 'Dmitri - Russian Philosopher', description: 'Thoughtful Russian male, introspective tone, slow and contemplative.', language: 'Russian', gender: 'Male', category: 'Education' },
  { id: 'Carmen_Spanish_Celebrant', name: 'Carmen - Spanish Celebrant', description: 'Excited Spanish woman, rapid, passionate, for celebration scenarios.', language: 'Spanish', gender: 'Female', category: 'Entertainment' },

  // Elderly Voices (36-40)
  { id: 'Grandpa_William_Wise', name: 'Grandpa William - Wise', description: 'Wise, kind elderly male, slow and reassuring, classic US accent.', language: 'English', gender: 'Male', category: 'Lifestyle' },
  { id: 'Nana_Irish_Storyteller', name: 'Nana - Irish Storyteller', description: 'Grandmotherly Irish woman, warm, gentle, and measured.', language: 'English', gender: 'Female', category: 'Lifestyle' },
  { id: 'Heinrich_German_Elder', name: 'Heinrich - German Elder', description: 'Strong elderly German man, clear and deliberate, slow pace.', language: 'German', gender: 'Male', category: 'Lifestyle' },
  { id: 'Astrid_Danish_Comfort', name: 'Astrid - Danish Comfort', description: 'Soft Danish woman, comforting, moderate speed.', language: 'Danish', gender: 'Female', category: 'Lifestyle' },
  { id: 'Angus_Scottish_Grandpa', name: 'Angus - Scottish Grandpa', description: 'Jovial Scottish grandfather, robust and fast-paced.', language: 'English', gender: 'Male', category: 'Lifestyle' },

  // Global Accents (41-50)
  { id: 'Raj_Indian_Tech_Support', name: 'Raj - Indian Tech Support', description: 'Upbeat Indian male, clear, energetic, for tech support.', language: 'English', gender: 'Male', category: 'Professional' },
  { id: 'Adanna_Nigerian_Speaker', name: 'Adanna - Nigerian Speaker', description: 'Calm Nigerian female, expressive, moderate speed.', language: 'English', gender: 'Female', category: 'Professional' },
  { id: 'Chen_Chinese_Instructor', name: 'Chen - Chinese Instructor', description: 'Animated Chinese male, lively, varied pace, for instruction.', language: 'Chinese', gender: 'Male', category: 'Education' },
  { id: 'Katya_Russian_Professional', name: 'Katya - Russian Professional', description: 'Enthusiastic Russian female, precise, moderately fast.', language: 'Russian', gender: 'Female', category: 'Professional' },
  { id: 'Diego_Mexican_Guide', name: 'Diego - Mexican Guide', description: 'Friendly Mexican male, bright, brisk speed.', language: 'Spanish', gender: 'Male', category: 'Travel & Culture' },
  { id: 'Min_Korean_Confident', name: 'Min - Korean Confident', description: 'Assertive Korean woman, quick, confident tone.', language: 'Korean', gender: 'Female', category: 'Professional' },
  { id: 'Lars_Swedish_Calm', name: 'Lars - Swedish Calm', description: 'Gentle Swedish man, relaxed, slow pace.', language: 'Swedish', gender: 'Male', category: 'Health & Wellness' },
  { id: 'Sophia_Greek_Spirited', name: 'Sophia - Greek Spirited', description: 'Spirited Greek woman, melodic, rapid-fire delivery.', language: 'Greek', gender: 'Female', category: 'Entertainment' },
  { id: 'Omar_Arabic_Professional', name: 'Omar - Arabic Professional', description: 'Neutral Arabic male, professional, moderate speed.', language: 'Arabic', gender: 'Male', category: 'Professional' },
  { id: 'Ayse_Turkish_Energetic', name: 'Ayse - Turkish Energetic', description: 'Energetic Turkish female, lively, moderately fast.', language: 'Turkish', gender: 'Female', category: 'Entertainment' },

  // Specialized Occupations (51-60)
  { id: 'Anderson_News_Anchor', name: 'Anderson - News Anchor', description: 'Serious news anchor (male), authoritative, quick, US accent.', language: 'English', gender: 'Male', category: 'News & Media' },
  { id: 'Dr_Sarah_Psychologist', name: 'Dr. Sarah - Psychologist', description: 'Calm psychologist (female), soothing, slow, empathetic tone.', language: 'English', gender: 'Female', category: 'Health & Wellness' },
  { id: 'Mike_Sports_Commentator', name: 'Mike - Sports Commentator', description: 'Animated sports commentator (male), lively, rapid for play-by-play.', language: 'English', gender: 'Male', category: 'Sports & Fitness' },
  { id: 'Nurse_Jennifer_Caring', name: 'Jennifer - Caring Nurse', description: 'Caring nurse (female), gentle, reassuring, moderate speed.', language: 'English', gender: 'Female', category: 'Health & Wellness' },
  { id: 'Zoe_Travel_Vlogger', name: 'Zoe - Travel Vlogger', description: 'Excited travel vlogger (female), upbeat, varied tempo.', language: 'English', gender: 'Female', category: 'Travel & Culture' },
  { id: 'Professor_Cambridge_Scientist', name: 'Professor Cambridge - Scientist', description: 'Analytical scientist (male), precise, moderately fast, British accent.', language: 'English', gender: 'Male', category: 'Education' },
  { id: 'Luna_Creative_Artist', name: 'Luna - Creative Artist', description: 'Creative artist (female), expressive, passionate, moderate speed.', language: 'English', gender: 'Female', category: 'Creative Arts' },
  { id: 'Chef_Antonio_Italian', name: 'Chef Antonio - Italian', description: 'Fun chef (male), playful, dynamic, Italian accent.', language: 'Italian', gender: 'Male', category: 'Entertainment' },
  { id: 'Coach_Michelle_Inspiring', name: 'Coach Michelle - Inspiring', description: 'Inspiring coach (female), energizing, quick, American accent.', language: 'English', gender: 'Female', category: 'Health & Wellness' },
  { id: 'Barrister_James_Australian', name: 'Barrister James - Australian', description: 'Keen lawyer (male), serious, measured, Australian accent.', language: 'English', gender: 'Male', category: 'Professional' },

  // Age & Energy Variety (61-65)
  { id: 'Jake_Laid_Back_Millennial', name: 'Jake - Laid Back Millennial', description: 'Young adult male, laid-back, casual, slightly slower.', language: 'English', gender: 'Male', category: 'Lifestyle' },
  { id: 'Chloe_Bubbly_Young_Adult', name: 'Chloe - Bubbly Young Adult', description: 'Young adult female, bubbly and energetic, punctual.', language: 'English', gender: 'Female', category: 'Lifestyle' },
  { id: 'Richard_Middle_Aged_Steady', name: 'Richard - Middle Aged Steady', description: 'Middle-aged male, mature, steady pace, American accent.', language: 'English', gender: 'Male', category: 'Professional' },
  { id: 'Patricia_Reserved_Professional', name: 'Patricia - Reserved Professional', description: 'Middle-aged female, reserved, knowledgeable, moderate speed.', language: 'English', gender: 'Female', category: 'Professional' },
  { id: 'Edgar_Contemplative_Elder', name: 'Edgar - Contemplative Elder', description: 'Elderly male, contemplative, slow, poetic delivery.', language: 'English', gender: 'Male', category: 'Lifestyle' },

  // Over-the-Top & Comic (66-70)
  { id: 'Villain_Maximilian_Dark', name: 'Maximilian - Dark Villain', description: 'Cartoon villain voice (male), exaggerated, deep, rapid-fire.', language: 'English', gender: 'Male', category: 'Creative Arts' },
  { id: 'Giggles_Comic_Relief', name: 'Giggles - Comic Relief', description: 'Comic relief (female), high-pitched, energetic, playful.', language: 'English', gender: 'Female', category: 'Entertainment' },
  { id: 'AIDEN_Robot_Voice', name: 'AIDEN - Robot Voice', description: 'Robot voice (neutral), synthetic, consistent fast, monotone.', language: 'English', gender: 'Neutral', category: 'Technology' },
  { id: 'Lyralei_Fantasy_Elf', name: 'Lyralei - Fantasy Elf', description: 'Fantasy elf (female), melodic, moderate speed.', language: 'English', gender: 'Female', category: 'Creative Arts' },
  { id: 'Captain_Blackbeard_Pirate', name: 'Captain Blackbeard - Pirate', description: 'Pirate voice (male), raspy, lively, quick tempo.', language: 'English', gender: 'Male', category: 'Creative Arts' },

  // Podcast Hosts (71-75)
  { id: 'Ryan_Lifestyle_Host', name: 'Ryan - Lifestyle Host', description: 'Friendly male host, comfortable pace, engaging tone, for lifestyle podcasts.', language: 'English', gender: 'Male', category: 'Entertainment' },
  { id: 'Jess_Comedy_Podcaster', name: 'Jess - Comedy Podcaster', description: 'Sarcastic female host, witty, brisk, for comedy podcasts.', language: 'English', gender: 'Female', category: 'Entertainment' },
  { id: 'Alex_Chill_Teen_Host', name: 'Alex - Chill Teen Host', description: 'Chill teen host, relaxed, conversational, moderate speed.', language: 'English', gender: 'Neutral', category: 'Lifestyle' },
  { id: 'Brad_Sports_Enthusiast', name: 'Brad - Sports Enthusiast', description: 'Energetic sports host (male), excited, fast-paced.', language: 'English', gender: 'Male', category: 'Sports & Fitness' },
  { id: 'Sophia_Culture_Critic', name: 'Sophia - Culture Critic', description: 'Thoughtful culture host (female), reflective, slow to moderate.', language: 'English', gender: 'Female', category: 'Travel & Culture' },

  // Music-Related (76-80)
  { id: 'Melody_Pop_Singer', name: 'Melody - Pop Singer', description: 'Pop singer (female), expressive, dynamic, for lyric breakdowns.', language: 'English', gender: 'Female', category: 'Creative Arts' },
  { id: 'Maestro_Classical_Voice', name: 'Maestro - Classical Voice', description: 'Classical singer (male), warm, controlled, slow.', language: 'English', gender: 'Male', category: 'Creative Arts' },
  { id: 'Rex_Rock_Vocalist', name: 'Rex - Rock Vocalist', description: 'Rock band member (male), gritty, energetic, fast.', language: 'English', gender: 'Male', category: 'Creative Arts' },
  { id: 'Jazz_Velvet_Crooner', name: 'Jazz - Velvet Crooner', description: 'Jazz crooner (female), smooth, playful, moderate.', language: 'English', gender: 'Female', category: 'Creative Arts' },
  { id: 'Aria_Opera_Narrator', name: 'Aria - Opera Narrator', description: 'Opera narrator (male), dramatic, slow and expressive.', language: 'English', gender: 'Male', category: 'Creative Arts' },

  // Emotion Profiles (81-90)
  { id: 'Joy_Bubbly_Energy', name: 'Joy - Bubbly Energy', description: 'Joyful, bubbly young woman, fast, high energy.', language: 'English', gender: 'Female', category: 'Lifestyle' },
  { id: 'Melvin_Sorrowful_Gentle', name: 'Melvin - Sorrowful Gentle', description: 'Sorrowful, soft-spoken elderly man, slow, gentle.', language: 'English', gender: 'Male', category: 'Creative Arts' },
  { id: 'Victor_Angry_Forceful', name: 'Victor - Angry Forceful', description: 'Angry middle-aged male, forceful, brisk.', language: 'English', gender: 'Male', category: 'Creative Arts' },
  { id: 'Nervous_Nellie_Anxious', name: 'Nellie - Nervous Anxious', description: 'Nervous young female, shaky, quick-paced.', language: 'English', gender: 'Female', category: 'Creative Arts' },
  { id: 'CEO_Alexander_Confident', name: 'Alexander - CEO Confident', description: 'Confident CEO voice (male), clear, moderate, inspiring.', language: 'English', gender: 'Male', category: 'Business' },
  { id: 'Grandma_Rose_Loving', name: 'Rose - Loving Grandma', description: 'Loving grandmother voice, calm, slow pace.', language: 'English', gender: 'Female', category: 'Lifestyle' },
  { id: 'Student_Sam_Anxious', name: 'Sam - Anxious Student', description: 'Anxious student voice, rapid, uneven.', language: 'English', gender: 'Neutral', category: 'Lifestyle' },
  { id: 'Zen_Meditation_Guide', name: 'Zen - Meditation Guide', description: 'Peaceful meditation guide (female), slow, soothing.', language: 'English', gender: 'Female', category: 'Health & Wellness' },
  { id: 'Thriller_Vincent_Suspense', name: 'Vincent - Thriller Suspense', description: 'Suspenseful thriller narrator (male), deliberate, slow.', language: 'English', gender: 'Male', category: 'Entertainment' },

  // Commercial/Promo (91-95)
  { id: 'Pitch_Perfect_Pete', name: 'Pete - Pitch Perfect', description: 'Slick advertising pitchman (male), enthusiastic, brisk, US accent.', language: 'English', gender: 'Male', category: 'Business' },
  { id: 'Luxury_Grace_Ambassador', name: 'Grace - Luxury Ambassador', description: 'Calm luxury brand ambassador (female), smooth, measured.', language: 'English', gender: 'Female', category: 'Business' },
  { id: 'Review_Rick_Enthusiastic', name: 'Rick - Enthusiastic Reviewer', description: 'Ebullient product reviewer (male), engaging, fast-paced.', language: 'English', gender: 'Male', category: 'Business' },
  { id: 'Fitness_Fiona_Motivator', name: 'Fiona - Fitness Motivator', description: 'Aspirational fitness coach (female), motivating, dynamic.', language: 'English', gender: 'Female', category: 'Sports & Fitness' },
  { id: 'Advisor_Trust_Financial', name: 'Trust - Financial Advisor', description: 'Trustworthy financial advisor (male), measured, professional.', language: 'English', gender: 'Male', category: 'Business' },

  // Miscellaneous (96-100)
  { id: 'Storyteller_Magnus_Epic', name: 'Magnus - Epic Storyteller', description: 'Dramatic storyteller (male), suspenseful, variable speed.', language: 'English', gender: 'Male', category: 'Creative Arts' },
  { id: 'Cafe_Brigitte_French', name: 'Brigitte - French Cafe', description: 'Charming French café server (female), warm, rhythmic.', language: 'French', gender: 'Female', category: 'Business' },
  { id: 'Politician_Young_Driven', name: 'Young Politician - Driven', description: 'Driven young politician (male), passionate, rapid.', language: 'English', gender: 'Male', category: 'News & Media' },
  { id: 'Mystic_Luna_Healer', name: 'Luna - Mystic Healer', description: 'Mystic healer (female), calm, slow, mysterious.', language: 'English', gender: 'Female', category: 'Creative Arts' },
  { id: 'Startup_Phoenix_Founder', name: 'Phoenix - Startup Founder', description: 'Tech startup founder (gender-neutral), energetic, modern, slightly fast.', language: 'English', gender: 'Neutral', category: 'Technology' }
];
