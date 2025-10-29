# Zero-Downtime Deployment Guide

This guide ensures you can update your application while keeping it running and preserving all user data.

## 🎯 Principles

1. **Never Delete User Data** - All migrations are additive only
2. **Backward Compatible** - Old code works with new data structures
3. **Idempotent** - Migrations can run multiple times safely
4. **Tracked** - All migrations are logged in Firestore

## 📋 Pre-Deployment Checklist

### Before Every Deployment:

- [ ] Review pending migrations
- [ ] Test migrations locally or in staging
- [ ] Ensure backward compatibility
- [ ] Backup critical data (Firebase exports)
- [ ] Verify environment variables
- [ ] Check build succeeds (`npm run build`)

## 🔄 Deployment Process

### Step 1: Prepare Migrations

1. **Create migration file** in `src/migrations/`:
```typescript
// src/migrations/002_add_new_field.ts
import { Migration, MigrationFunction } from '@/services/migrationService';
import { db } from '@/config/firebase';
import { collection, getDocs, writeBatch } from 'firebase/firestore';

export const migration: Migration = {
  version: '002_add_new_field',
  description: 'Add new_field to all STT records',
  up: async (batch) => {
    let processed = 0;
    
    // Get all users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    for (const userDoc of usersSnapshot.docs) {
      const sttRef = collection(userDoc.ref, 'stt');
      const sttSnapshot = await getDocs(sttRef);
      
      const migrationBatch = batch || writeBatch(db);
      
      for (const sttDoc of sttSnapshot.docs) {
        const data = sttDoc.data();
        // Only update if field doesn't exist (idempotent)
        if (!data.new_field) {
          migrationBatch.update(sttDoc.ref, {
            new_field: 'default_value',
            updated_at: new Date()
          });
          processed++;
        }
      }
      
      if (!batch) {
        await migrationBatch.commit();
      }
    }
    
    return { recordsProcessed: processed };
  }
};
```

2. **Register migration** in `migrationService.ts`:
```typescript
import { migration as migration002 } from '../migrations/002_add_new_field';

const migrations: Migration[] = [
  // ... existing migrations
  migration002,
];
```

### Step 2: Test Locally

```bash
# Build the project
npm run build

# Run migrations in test mode
npm run migrate:test
```

### Step 3: Deploy to Vercel

#### Option A: Automatic Deployment (GitHub)

1. **Push to main branch:**
```bash
git add .
git commit -m "Add new feature with migration"
git push origin main
```

2. **Vercel automatically deploys**

3. **After deployment completes, run migrations:**
```bash
# Via API (if you have admin endpoint)
curl -X POST https://your-app.vercel.app/api/admin/migrations/run \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Or via script (SSH into server if applicable)
npm run migrate
```

#### Option B: Manual Deployment

```bash
# Install Vercel CLI if not installed
npm i -g vercel

# Deploy
vercel --prod
```

### Step 4: Run Migrations in Production

**IMPORTANT:** Wait for deployment to complete, then run migrations:

```bash
# Option 1: Via Admin API (if you built the admin endpoint)
curl -X POST https://your-app.vercel.app/api/admin/migrations/run \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Option 2: Via Migration Script (if you have server access)
NODE_ENV=production npm run migrate

# Option 3: Manually via Admin Dashboard
# Visit /admin/migrations and click "Run Migrations"
```

## 🛡️ Backward Compatibility Guidelines

### DO:
- ✅ Add new optional fields
- ✅ Add new collections
- ✅ Add indexes
- ✅ Set default values for new fields
- ✅ Add new API endpoints (old ones keep working)
- ✅ Update UI features (don't break existing functionality)

### DON'T:
- ❌ Remove existing fields (deprecate instead)
- ❌ Change field types (create new field instead)
- ❌ Remove API endpoints (keep for backward compatibility)
- ❌ Break existing data structures
- ❌ Delete user data

### Field Deprecation Pattern:

```typescript
// Instead of removing 'old_field':
// 1. Keep it in schema
// 2. Read from 'old_field' if 'new_field' doesn't exist
// 3. Write to both during transition period
// 4. Eventually migrate all data and stop writing to 'old_field'

// Example:
const value = data.new_field || data.old_field; // Backward compatible read
if (data.old_field && !data.new_field) {
  // Migrate on-the-fly
  await updateDoc(ref, { new_field: data.old_field });
}
```

## 📊 Migration Monitoring

### Check Migration Status:

```bash
# Via API
curl https://your-app.vercel.app/api/admin/migrations/status

# Response:
{
  "success": true,
  "total": 5,
  "executed": 4,
  "pending": 1,
  "failed": 0,
  "migrations": [
    {
      "version": "001_initial",
      "description": "Initial schema",
      "status": "completed",
      "executedAt": "2024-01-15T10:00:00Z",
      "recordsProcessed": 0
    },
    {
      "version": "002_add_field",
      "description": "Add new field",
      "status": "pending"
    }
  ]
}
```

### View Migration History:

All migrations are tracked in Firestore:
- Collection: `system_migrations`
- Document ID: migration version
- Fields: status, executedAt, recordsProcessed, error

## 🔧 Common Migration Patterns

### Pattern 1: Add Optional Field

```typescript
up: async (batch) => {
  const batch = writeBatch(db);
  let count = 0;
  
  // Get all STT records across all users
  const usersSnapshot = await getDocs(collection(db, 'users'));
  
  for (const userDoc of usersSnapshot.docs) {
    const sttSnapshot = await getDocs(collection(userDoc.ref, 'stt'));
    
    sttSnapshot.docs.forEach(doc => {
      if (!doc.data().new_field) {
        batch.update(doc.ref, { 
          new_field: 'default',
          _migrated_at: Timestamp.now()
        });
        count++;
      }
    });
  }
  
  await batch.commit();
  return { recordsProcessed: count };
}
```

### Pattern 2: Rename Field (Safe)

```typescript
up: async () => {
  let count = 0;
  
  const usersSnapshot = await getDocs(collection(db, 'users'));
  
  for (const userDoc of usersSnapshot.docs) {
    const sttSnapshot = await getDocs(collection(userDoc.ref, 'stt'));
    
    for (const doc of sttSnapshot.docs) {
      const data = doc.data();
      if (data.old_name && !data.new_name) {
        const batch = writeBatch(db);
        batch.update(doc.ref, {
          new_name: data.old_name,
          old_name: null, // Keep for safety, remove later
          _migrated_at: Timestamp.now()
        });
        await batch.commit();
        count++;
      }
    }
  }
  
  return { recordsProcessed: count };
}
```

### Pattern 3: Initialize Missing Data

```typescript
up: async () => {
  let count = 0;
  
  const usersSnapshot = await getDocs(collection(db, 'users'));
  const batch = writeBatch(db);
  
  for (const userDoc of usersSnapshot.docs) {
    // Check if profile exists
    const profileRef = doc(userDoc.ref, 'profile', 'main');
    const profileDoc = await getDoc(profileRef);
    
    if (!profileDoc.exists()) {
      batch.set(profileRef, {
        created_at: Timestamp.now(),
        settings: {},
        preferences: {}
      });
      count++;
    }
  }
  
  await batch.commit();
  return { recordsProcessed: count };
}
```

## 🚨 Rollback Strategy

If a migration fails:

1. **Don't panic** - Failed migrations don't affect completed ones
2. **Check logs** - See what went wrong
3. **Fix the migration** - Correct the code
4. **Redeploy** - Push fix
5. **Re-run** - Run migrations again (they're idempotent)

### Emergency Rollback:

If you need to rollback a deployment:

1. **Vercel:** Use the deployment history to rollback
2. **Migrations:** Mark failed migration as "skipped" if needed
3. **Data:** Most migrations are additive, so old code works fine

## 📝 Example: Adding a New Feature

### Scenario: Add "tags" field to transcriptions

1. **Update TypeScript interface:**
```typescript
// src/services/databaseService.ts
export interface STTRecord {
  // ... existing fields
  tags?: string[]; // Add new optional field
}
```

2. **Create migration:**
```typescript
// src/migrations/003_add_tags_field.ts
export const migration: Migration = {
  version: '003_add_tags_field',
  description: 'Initialize tags array for all STT records',
  up: async () => {
    // Migration adds default empty array - no batch needed as it's optional
    // Old code works fine without this field
    return { recordsProcessed: 0 };
  }
};
```

3. **Update code to use tags:**
```typescript
// Your components can now safely use:
const tags = sttRecord.tags || []; // Backward compatible
```

4. **Deploy:**
```bash
git add .
git commit -m "Add tags feature"
git push origin main
# Wait for deployment
# Run migrations (if needed)
```

## ✅ Success Criteria

After deployment, verify:

- [ ] Application is accessible
- [ ] Existing users can log in
- [ ] Existing transcriptions are visible
- [ ] New features work
- [ ] No data loss
- [ ] Migrations completed successfully

## 🔗 Resources

- [Vercel Deployment Docs](https://vercel.com/docs/deployments)
- [Firebase Migration Guide](https://firebase.google.com/docs/firestore/manage-data/migrate-data)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

**Remember:** Always test migrations in staging first, and backup critical data before major updates!

