# Data Storage Guide

## 📊 Where Your Data is Stored

All user data, trial minutes, and content words are stored in **Firestore** (Firebase's NoSQL database).

---

## 🎯 Trial Minutes Storage

### Location
**Firestore Collection**: `users`
**Document**: `users/{userId}`
**Field Path**: `trial.minutesUsed`

### Structure
```typescript
users/{userId} {
  email: string,
  subscriptionStatus: 'trial' | 'active' | 'cancelled',
  trial: {
    isActive: boolean,           // Is trial currently active
    startDate: Timestamp,       // When trial started
    endDate: Timestamp,         // When trial expires (7 days from start)
    minutesUsed: number,        // Minutes used so far (incremented)
    minutesTotal: number,       // Total minutes in trial (default: 90)
    hasEnded: boolean,          // Has trial ended
    // Content generation trial words:
    contentWords: number,       // Total trial content words (default: 2000)
    contentWordsUsed: number   // Trial content words used (incremented)
  },
  updatedAt: Timestamp
}
```

### How It Works

1. **Initialization**: When a user signs up, trial is initialized in `AuthForm.tsx`:
   ```typescript
   trial: {
     isActive: true,
     startDate: Timestamp.now(),
     endDate: Timestamp.fromDate(endDate),
     minutesUsed: 0,
     minutesTotal: 90,
     hasEnded: false,
     contentWords: 2000,
     contentWordsUsed: 0
   }
   ```

2. **Deduction**: After transcription completes:
   - **File**: `src/services/trialService.ts` → `deductMinutesForUser()`
   - **Updates**: `trial.minutesUsed` using Firestore `increment()`
   - **Location**: `users/{userId}.trial.minutesUsed`

3. **Reading**: 
   - **File**: `src/services/trialService.ts` → `getTrialStatus()`
   - **Reads from**: `users/{userId}.trial`

---

## 📝 Content Words Storage

### Location
**Firestore Collection**: `users`
**Document**: `users/{userId}`
**Fields**: Multiple fields at root level

### Structure
```typescript
users/{userId} {
  // Monthly subscription limits:
  monthlyWordLimit: number,      // Based on subscription plan (e.g., 50000 for Solo)
  wordsUsedThisMonth: number,    // Words used this month (incremented, resets monthly)
  boostWords: number,            // Purchased word boosts (decremented)
  
  // Trial content words (if on trial):
  trial: {
    contentWords: number,         // Total trial words (default: 2000)
    contentWordsUsed: number     // Trial words used (incremented)
  },
  
  subscriptionPlan: 'solo' | 'team' | 'agency' | 'transcription-only',
  subscriptionStatus: 'trial' | 'active' | 'cancelled',
  updatedAt: Timestamp
}
```

### How It Works

1. **Initialization**: Set when user signs up or subscribes:
   - `monthlyWordLimit` - Based on subscription plan
   - `wordsUsedThisMonth` - Starts at 0
   - `boostWords` - Starts at 0 (or purchased amount)

2. **Deduction Priority** (File: `src/services/contentLimitService.ts`):
   - **Priority 1**: Trial words (if in trial) → `trial.contentWordsUsed`
   - **Priority 2**: Monthly allocation → `wordsUsedThisMonth`
   - **Priority 3**: Boost words → `boostWords` (decremented)

3. **Reading**: 
   - **File**: `src/services/contentLimitService.ts` → `checkCanGenerate()`
   - **Reads from**: `users/{userId}` document

---

## 🗄️ Complete User Document Structure

```typescript
users/{userId} {
  // Authentication
  email: string,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  
  // Subscription
  subscriptionStatus: 'trial' | 'active' | 'cancelled' | 'expired',
  subscriptionPlan: 'solo' | 'team' | 'agency' | 'transcription-only',
  stripeCustomerId?: string,
  stripeSubscriptionId?: string,
  
  // Trial (transcription minutes)
  trial: {
    isActive: boolean,
    startDate: Timestamp,
    endDate: Timestamp,
    minutesUsed: number,        // ← Trial transcription minutes used
    minutesTotal: number,       // Default: 90
    hasEnded: boolean,
    contentWords: number,       // ← Trial content words total (default: 2000)
    contentWordsUsed: number   // ← Trial content words used
  },
  
  // Content generation limits
  monthlyWordLimit: number,     // ← Monthly subscription word limit
  wordsUsedThisMonth: number,   // ← Words used this month (resets monthly)
  boostWords: number,          // ← Purchased word boosts (one-time use)
  
  // Profile (optional subcollection)
  profile: {
    // Stored in subcollection: users/{userId}/profile/{profileId}
  }
}
```

---

## 📍 Where Each Value is Updated

### Trial Minutes

**Update Location**: `users/{userId}.trial.minutesUsed`
**Update Method**: Firestore `increment()`
**Updated By**:
- `src/services/trialService.ts` → `deductMinutesForUser()`
- Called from:
  - `src/app/api/webhooks/runpod/route.ts` (after transcription completes)
  - `src/components/TranscriptionUpload.tsx` (frontend deduction)
  - `src/services/backgroundProcessingService.ts` (background jobs)

### Content Words

**Update Locations**: 
- `users/{userId}.wordsUsedThisMonth` (monthly limit)
- `users/{userId}.boostWords` (boost words)
- `users/{userId}.trial.contentWordsUsed` (trial words)

**Update Method**: Firestore `updateDoc()`
**Updated By**:
- `src/services/contentLimitService.ts` → `deductWords()`
- Called from:
  - `src/components/ContentRepurposingPanel.tsx` (after content generation)
  - `src/app/api/background-content/route.ts` (background jobs)

---

## 🔍 How to View/Query This Data

### Via Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Firestore Database**
4. Open `users` collection
5. Click on a user's document (their user ID)
6. View fields:
   - `trial.minutesUsed` - Trial minutes used
   - `wordsUsedThisMonth` - Content words used this month
   - `boostWords` - Remaining boost words
   - `trial.contentWordsUsed` - Trial content words used

### Via Code

```typescript
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

// Get user data
const userDoc = await getDoc(doc(db, 'users', userId));
const userData = userDoc.data();

// Trial minutes
const minutesUsed = userData?.trial?.minutesUsed || 0;
const minutesTotal = userData?.trial?.minutesTotal || 90;
const minutesRemaining = minutesTotal - minutesUsed;

// Content words
const wordsUsed = userData?.wordsUsedThisMonth || 0;
const monthlyLimit = userData?.monthlyWordLimit || 0;
const boostWords = userData?.boostWords || 0;
const trialWordsUsed = userData?.trial?.contentWordsUsed || 0;
```

---

## 🔄 Monthly Reset

### Content Words

**Monthly reset** happens on the 1st of each month:
- `wordsUsedThisMonth` → Reset to 0
- `boostWords` → Stays as is (doesn't reset)
- `trial.contentWordsUsed` → Only applies during trial period

**Implementation**: Can be done via:
- Firebase Cloud Function (scheduled)
- Cron job
- Manual reset via admin dashboard

### Trial Minutes

**No monthly reset** - Trial is:
- **Time-based**: Expires after 7 days (`trial.endDate`)
- **Usage-based**: Ends when 90 minutes are used
- **One-time**: Doesn't reset monthly

---

## 🛡️ Backup Considerations

When backing up data (using `npm run backup`), these values are included:

1. **All user documents** in `users` collection
2. **Trial data**: `trial.minutesUsed`, `trial.contentWordsUsed`
3. **Content limits**: `wordsUsedThisMonth`, `boostWords`, `monthlyWordLimit`

**Restoration**: All values are restored when you restore from backup.

---

## 📊 Summary

| Data Type | Storage Location | Field Path |
|-----------|-----------------|------------|
| **Trial Minutes Used** | Firestore `users/{userId}` | `trial.minutesUsed` |
| **Trial Minutes Total** | Firestore `users/{userId}` | `trial.minutesTotal` |
| **Content Words Used (Monthly)** | Firestore `users/{userId}` | `wordsUsedThisMonth` |
| **Monthly Word Limit** | Firestore `users/{userId}` | `monthlyWordLimit` |
| **Boost Words** | Firestore `users/{userId}` | `boostWords` |
| **Trial Content Words Used** | Firestore `users/{userId}` | `trial.contentWordsUsed` |
| **Trial Content Words Total** | Firestore `users/{userId}` | `trial.contentWords` |

**All data is stored in Firestore** - No local storage, no cookies, no session storage. Everything is in Firebase's cloud database.

