// Script to check Firestore security rules and basic connectivity
// Run this with: node src/scripts/checkFirestoreRules.js

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, serverTimestamp } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyASdf98Soi-LtMowVOQMhQvMWWVEP3KoC8",
  authDomain: "aitts-d4c6d.firebaseapp.com",
  projectId: "aitts-d4c6d",
  storageBucket: "aitts-d4c6d.firebasestorage.app",
  messagingSenderId: "927299361889",
  appId: "1:927299361889:web:13408945d50bda7a2f5e20",
  measurementId: "G-P1TK2HHBXR"
};

console.log('🔍 ===== CHECKING FIRESTORE RULES & CONNECTIVITY =====');

async function checkFirestore() {
  try {
    // Initialize Firebase
    console.log('1️⃣ Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    console.log('✅ Firebase initialized');
    console.log('🗄️ Database instance:', db);
    console.log('🔗 Project ID:', db.app.options.projectId);

    // Test 1: Try to write to a public collection (should work if rules allow)
    console.log('\n2️⃣ Testing write to public collection...');
    const publicData = {
      message: 'Public test message',
      timestamp: serverTimestamp(),
      test: true
    };

    console.log('📝 Public test data:', publicData);
    
    try {
      const docRef = await addDoc(collection(db, 'public_test'), publicData);
      console.log('✅ Public write SUCCESS! Document ID:', docRef.id);
    } catch (error) {
      console.log('❌ Public write FAILED:', error.message);
      console.log('🔒 This suggests Firestore security rules are blocking writes');
    }

    // Test 2: Try to read from the same collection
    console.log('\n3️⃣ Testing read from public collection...');
    try {
      const querySnapshot = await getDocs(collection(db, 'public_test'));
      console.log('✅ Public read SUCCESS! Found', querySnapshot.size, 'documents');
    } catch (error) {
      console.log('❌ Public read FAILED:', error.message);
      console.log('🔒 This suggests Firestore security rules are blocking reads');
    }

    // Test 3: Try to write to a protected collection (should fail)
    console.log('\n4️⃣ Testing write to protected collection...');
    const protectedData = {
      user_id: 'test_user',
      data: 'Protected test data',
      timestamp: serverTimestamp()
    };

    try {
      const docRef = await addDoc(collection(db, 'users', 'test_user', 'protected'), protectedData);
      console.log('✅ Protected write SUCCESS! Document ID:', docRef.id);
      console.log('⚠️ This might indicate rules are too permissive');
    } catch (error) {
      console.log('❌ Protected write FAILED:', error.message);
      console.log('🔒 This is expected - protected collections should require auth');
    }

    console.log('\n📊 ===== DIAGNOSIS =====');
    console.log('Based on the results above:');
    console.log('• If public write/read works: Basic connectivity is OK');
    console.log('• If public write fails: Security rules are blocking all writes');
    console.log('• If protected write works: Rules might be too permissive');
    console.log('• If protected write fails: Rules are working correctly');

  } catch (error) {
    console.error('\n❌ Firestore check failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    if (error.code === 'permission-denied') {
      console.error('🔒 This looks like a Firestore security rules issue');
    } else if (error.code === 'unavailable') {
      console.error('🌐 This looks like a network/connectivity issue');
    } else if (error.code === 'invalid-argument') {
      console.error('📝 This looks like invalid data being sent to Firestore');
    }
  }
}

// Run the check
checkFirestore();
