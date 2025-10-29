import { NextResponse } from 'next/server';
import { db } from '@/config/firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

/**
 * Debug endpoint to inspect Firebase structure and find where data is stored
 */
export async function GET() {
  try {
    console.log('🔍 DEBUG: Starting comprehensive database check...');
    
    // Get all users from Firestore
    const usersRef = collection(db, 'users');
    const userDocs = await getDocs(usersRef);
    
    console.log(`✅ Found ${userDocs.size} users in Firestore`);
    
    const usersInfo = [];
    
    for (const userDoc of userDocs.docs) {
      const userData = userDoc.data();
      const userId = userDoc.id;
      
      console.log(`\n👤 Checking user: ${userId} (${userData.email || 'no email'})`);
      
      // Try different possible subcollection names
      const possibleCollections = [
        'stt',  // ✅ This is the actual collection name used by databaseService for transcriptions
        'generated_content',  // ✅ This is where content is actually stored
        'stt_records',
        'transcriptions', 
        'records',
        'content_records',
        'content'
      ];
      
      const subcollections: any = {};
      
      for (const collName of possibleCollections) {
        try {
          const subCollRef = collection(db, 'users', userId, collName);
          const subDocs = await getDocs(subCollRef);
          
          if (subDocs.size > 0) {
            console.log(`  ✅ Found ${subDocs.size} docs in users/${userId}/${collName}`);
            
            // Get first doc as sample
            const firstDoc = subDocs.docs[0];
            const firstData = firstDoc.data();
            
            subcollections[collName] = {
              count: subDocs.size,
              sampleId: firstDoc.id,
              sampleFields: Object.keys(firstData),
              sampleData: {
                status: firstData.status,
                timestamp: firstData.timestamp?.toDate?.()?.toISOString() || firstData.timestamp || firstData.createdAt?.toDate?.()?.toISOString() || firstData.createdAt || 'N/A',
                filename: firstData.name || firstData.title || firstData.original_filename || 'N/A'
              }
            };
          } else {
            console.log(`  ⚠️ No docs in users/${userId}/${collName}`);
          }
        } catch (error: any) {
          console.log(`  ❌ Error accessing users/${userId}/${collName}: ${error.message}`);
        }
      }
      
      usersInfo.push({
        userId,
        email: userData.email || 'N/A',
        subcollections,
        userDocFields: Object.keys(userData)
      });
    }
    
    // Also check for flat collections
    const flatCollections = ['stt_records', 'transcriptions', 'content_records', 'jobs'];
    const flatCollectionsInfo: any = {};
    
    for (const collName of flatCollections) {
      try {
        const collRef = collection(db, collName);
        const docs = await getDocs(collRef);
        
        flatCollectionsInfo[collName] = {
          exists: true,
          count: docs.size,
          sample: docs.size > 0 ? {
            id: docs.docs[0].id,
            fields: Object.keys(docs.docs[0].data())
          } : null
        };
        
        console.log(`\n📁 Flat collection '${collName}': ${docs.size} documents`);
      } catch (error: any) {
        flatCollectionsInfo[collName] = {
          exists: false,
          error: error.message
        };
      }
    }
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalUsers: userDocs.size,
        usersWithTranscriptions: usersInfo.filter(u => u.subcollections.stt?.count > 0).length,
        usersWithContent: usersInfo.filter(u => u.subcollections.generated_content?.count > 0).length
      },
      users: usersInfo,
      flatCollections: flatCollectionsInfo,
      instructions: {
        message: 'Check the users array to see what subcollections each user has and their document counts',
        expectedStructure: 'users/{userId}/stt/{recordId}'
      }
    });
    
  } catch (error: any) {
    console.error('❌ DEBUG: Database check failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
