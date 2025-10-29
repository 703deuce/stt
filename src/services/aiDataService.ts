import { databaseService } from './databaseService';
import { SummaryResponse } from './aiSummaryService';
import { ChatMessage } from './aiChatService';
import { Timestamp } from 'firebase/firestore';

export interface AIDataRecord {
  id: string;
  transcriptionId: string;
  userId: string;
  summaries?: {
    brief?: SummaryResponse;
    detailed?: SummaryResponse;
    key_points?: SummaryResponse;
    action_items?: SummaryResponse;
  };
  chatHistory?: ChatMessage[];
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

class AIDataService {
  private readonly COLLECTION_NAME = 'ai_data';

  /**
   * Save AI summary data for a transcription
   */
  async saveSummaryData(
    transcriptionId: string, 
    userId: string, 
    summaryType: 'brief' | 'detailed' | 'key_points' | 'action_items',
    summaryData: SummaryResponse
  ): Promise<void> {
    try {
      console.log('💾 Saving AI summary data...', { transcriptionId, summaryType });
      
      // Get existing AI data record
      let aiData = await this.getAIData(transcriptionId, userId);
      
      if (!aiData) {
        // Create new record
        aiData = {
          id: `${transcriptionId}_${userId}`,
          transcriptionId,
          userId,
          summaries: {},
          chatHistory: [],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };
      }
      
      // Update the specific summary type
      if (!aiData.summaries) {
        aiData.summaries = {};
      }
      
      // Force update by creating a NEW summaries object
      const updatedSummaries = {
        ...aiData.summaries,
        [summaryType]: summaryData
      };
      
      // Create completely new object to ensure Firestore detects changes
      const updatedAIData = {
        ...aiData,
        summaries: updatedSummaries,
        updatedAt: Timestamp.now()
      };
      
      // Save to database
      await databaseService.setDocument(this.COLLECTION_NAME, aiData.id, updatedAIData);
      
      console.log('✅ AI summary data saved successfully');
      
    } catch (error) {
      console.error('❌ Error saving AI summary data:', error);
      throw error;
    }
  }

  /**
   * Save all summary types at once
   */
  async saveAllSummaries(
    transcriptionId: string, 
    userId: string, 
    summaries: {
      brief: SummaryResponse;
      detailed: SummaryResponse;
      key_points: SummaryResponse;
      action_items: SummaryResponse;
    }
  ): Promise<void> {
    try {
      console.log('💾 Saving all AI summaries at once...', { transcriptionId });
      
      // Get existing AI data record
      let aiData = await this.getAIData(transcriptionId, userId);
      
      if (!aiData) {
        // Create new record
        aiData = {
          id: `${transcriptionId}_${userId}`,
          transcriptionId,
          userId,
          summaries: {},
          chatHistory: [],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };
      }
      
      // Update all summaries
      aiData.summaries = summaries;
      aiData.updatedAt = Timestamp.now();
      
      // Save to database
      await databaseService.setDocument(this.COLLECTION_NAME, aiData.id, aiData);
      
      console.log('✅ All AI summaries saved successfully');
      
    } catch (error) {
      console.error('❌ Error saving all AI summaries:', error);
      throw error;
    }
  }

  /**
   * Save chat history for a transcription
   */
  async saveChatHistory(
    transcriptionId: string, 
    userId: string, 
    chatHistory: ChatMessage[]
  ): Promise<void> {
    try {
      console.log('💾 Saving AI chat history...', { transcriptionId, messageCount: chatHistory.length });
      
      // Get existing AI data record
      let aiData = await this.getAIData(transcriptionId, userId);
      
      if (!aiData) {
        // Create new record
        aiData = {
          id: `${transcriptionId}_${userId}`,
          transcriptionId,
          userId,
          summaries: {},
          chatHistory: [],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        };
      }
      
      // Update chat history
      aiData.chatHistory = chatHistory;
      aiData.updatedAt = Timestamp.now();
      
      // Save to database
      await databaseService.setDocument(this.COLLECTION_NAME, aiData.id, aiData);
      
      console.log('✅ AI chat history saved successfully');
      
    } catch (error) {
      console.error('❌ Error saving AI chat history:', error);
      throw error;
    }
  }

  /**
   * Get AI data for a transcription
   */
  async getAIData(transcriptionId: string, userId: string): Promise<AIDataRecord | null> {
    try {
      console.log('📥 Retrieving AI data...', { transcriptionId, userId });
      
      const aiDataId = `${transcriptionId}_${userId}`;
      const aiData = await databaseService.getDocument(this.COLLECTION_NAME, aiDataId);
      
      if (aiData) {
        console.log('✅ AI data retrieved successfully', {
          hasSummaries: !!aiData.summaries,
          hasChatHistory: !!aiData.chatHistory,
          summaryTypes: aiData.summaries ? Object.keys(aiData.summaries) : [],
          chatMessageCount: aiData.chatHistory?.length || 0
        });
        
        // Convert timestamps back to Date objects for frontend use
        if (aiData.createdAt) {
          aiData.createdAt = aiData.createdAt instanceof Timestamp ? aiData.createdAt.toDate() : new Date(aiData.createdAt);
        }
        if (aiData.updatedAt) {
          aiData.updatedAt = aiData.updatedAt instanceof Timestamp ? aiData.updatedAt.toDate() : new Date(aiData.updatedAt);
        }
        
        return aiData as AIDataRecord;
      }
      
      console.log('ℹ️ No AI data found for this transcription');
      return null;
      
    } catch (error) {
      console.error('❌ Error retrieving AI data:', error);
      return null;
    }
  }

  /**
   * Delete AI data for a transcription
   */
  async deleteAIData(transcriptionId: string, userId: string): Promise<void> {
    try {
      console.log('🗑️ Deleting AI data...', { transcriptionId, userId });
      
      const aiDataId = `${transcriptionId}_${userId}`;
      await databaseService.deleteDocument(this.COLLECTION_NAME, aiDataId);
      
      console.log('✅ AI data deleted successfully');
      
    } catch (error) {
      console.error('❌ Error deleting AI data:', error);
      throw error;
    }
  }

  /**
   * Get all AI data for a user
   */
  async getUserAIData(userId: string): Promise<AIDataRecord[]> {
    try {
      console.log('📥 Retrieving all AI data for user...', { userId });
      
      const query = {
        field: 'userId',
        operator: '==' as const,
        value: userId
      };
      
      const aiDataList = await databaseService.queryDocuments(this.COLLECTION_NAME, [query]);
      
      // Convert timestamps back to Date objects
      const processedData = aiDataList.map(aiData => ({
        ...aiData,
        createdAt: aiData.createdAt instanceof Timestamp ? aiData.createdAt.toDate() : (aiData.createdAt ? new Date(aiData.createdAt) : new Date()),
        updatedAt: aiData.updatedAt instanceof Timestamp ? aiData.updatedAt.toDate() : (aiData.updatedAt ? new Date(aiData.updatedAt) : new Date())
      }));
      
      console.log('✅ User AI data retrieved successfully', { count: processedData.length });
      return processedData as AIDataRecord[];
      
    } catch (error) {
      console.error('❌ Error retrieving user AI data:', error);
      return [];
    }
  }
}

export const aiDataService = new AIDataService();
