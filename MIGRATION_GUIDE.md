# Database Migration Guide

## Quick Start

### Running Migrations

```bash
# Development
npm run migrate

# Production (via API endpoint)
POST /api/admin/migrations/run

# Check status
GET /api/admin/migrations/status
```

## Creating a New Migration

### Step 1: Create Migration File

Create a new file in `src/migrations/`:

```typescript
// src/migrations/004_your_migration_name.ts
import { Migration, MigrationFunction } from '@/services/migrationService';
import { db } from '@/config/firebase';
import { collection, getDocs, writeBatch, Timestamp } from 'firebase/firestore';

export const migration: Migration = {
  version: '004_your_migration_name',
  description: 'Brief description of what this migration does',
  
  up: async (batch) => {
    // Your migration logic here
    // Must be idempotent (safe to run multiple times)
    
    let processed = 0;
    
    // Example: Add a field to all STT records
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    for (const userDoc of usersSnapshot.docs) {
      const sttRef = collection(userDoc.ref, 'stt');
      const sttSnapshot = await getDocs(sttRef);
      
      const migrationBatch = batch || writeBatch(db);
      
      for (const sttDoc of sttSnapshot.docs) {
        const data = sttDoc.data();
        
        // Only update if field doesn't exist (idempotent check)
        if (!data.your_new_field) {
          migrationBatch.update(sttDoc.ref, {
            your_new_field: 'default_value',
            _migrated_at: Timestamp.now()
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

### Step 2: Register Migration

Add to `src/services/migrationService.ts`:

```typescript
import { migration as migration004 } from '../migrations/004_your_migration_name';

const migrations: Migration[] = [
  // ... existing migrations
  migration004,
];
```

### Step 3: Test Locally

```bash
npm run migrate
```

### Step 4: Deploy and Run

Follow the [Zero-Downtime Deployment Guide](./ZERO_DOWNTIME_DEPLOYMENT.md)

## Migration Best Practices

### ✅ DO:

1. **Always check if field exists before adding:**
```typescript
if (!data.new_field) {
  batch.update(ref, { new_field: 'value' });
}
```

2. **Use timestamps to track migrations:**
```typescript
batch.update(ref, {
  new_field: 'value',
  _migrated_at: Timestamp.now()
});
```

3. **Process in batches for large datasets:**
```typescript
// Use migrationService.processBatch helper
await migrationService.processBatch(items, async (chunk, batch) => {
  // Process chunk
});
```

4. **Return accurate record counts:**
```typescript
return { recordsProcessed: actualCount };
```

### ❌ DON'T:

1. **Don't delete fields or data:**
```typescript
// ❌ BAD
batch.update(ref, { old_field: null }); // Don't remove immediately

// ✅ GOOD
// Keep old field during transition, read from new field first
const value = data.new_field || data.old_field;
```

2. **Don't break backward compatibility:**
```typescript
// ❌ BAD - breaks old code
batch.update(ref, { field: newComplexStructure });

// ✅ GOOD - add as optional field, old code still works
batch.update(ref, { new_field: newValue });
```

3. **Don't process everything in one batch:**
```typescript
// ❌ BAD - may exceed Firestore 500 doc limit
const hugeBatch = writeBatch(db);
// ... add thousands of updates
await hugeBatch.commit();

// ✅ GOOD - process in chunks
for (const chunk of chunks) {
  const batch = writeBatch(db);
  // ... process chunk
  await batch.commit();
}
```

## Common Patterns

### Pattern 1: Add Optional Field with Default

```typescript
up: async () => {
  let count = 0;
  const usersSnapshot = await getDocs(collection(db, 'users'));
  
  for (const userDoc of usersSnapshot.docs) {
    const sttSnapshot = await getDocs(collection(userDoc.ref, 'stt'));
    const batch = writeBatch(db);
    
    for (const doc of sttSnapshot.docs) {
      if (!doc.data().tags) {
        batch.update(doc.ref, { 
          tags: [],
          _migrated_at: Timestamp.now()
        });
        count++;
      }
    }
    
    await batch.commit();
  }
  
  return { recordsProcessed: count };
}
```

### Pattern 2: Migrate Field Format

```typescript
up: async () => {
  let count = 0;
  const usersSnapshot = await getDocs(collection(db, 'users'));
  
  for (const userDoc of usersSnapshot.docs) {
    const sttSnapshot = await getDocs(collection(userDoc.ref, 'stt'));
    
    for (const doc of sttSnapshot.docs) {
      const data = doc.data();
      // Only migrate if old format exists and new format doesn't
      if (data.old_format && !data.new_format) {
        const batch = writeBatch(db);
        batch.update(doc.ref, {
          new_format: transformData(data.old_format),
          // Keep old_format for safety during transition
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

### Pattern 3: Initialize Missing Collections/Documents

```typescript
up: async () => {
  let count = 0;
  const usersSnapshot = await getDocs(collection(db, 'users'));
  const batch = writeBatch(db);
  
  for (const userDoc of usersSnapshot.docs) {
    const profileRef = doc(userDoc.ref, 'profile', 'settings');
    const profileDoc = await getDoc(profileRef);
    
    if (!profileDoc.exists()) {
      batch.set(profileRef, {
        created_at: Timestamp.now(),
        preferences: {},
        settings: {}
      });
      count++;
    }
  }
  
  await batch.commit();
  return { recordsProcessed: count };
}
```

## Migration Troubleshooting

### Migration Fails

1. **Check error message** in Firestore `system_migrations` collection
2. **Review code** for potential issues
3. **Test locally** with same data structure
4. **Fix and redeploy** - migrations are idempotent, can re-run safely

### Migration Runs but No Records Processed

- Check if migration already ran (check `system_migrations` collection)
- Verify the condition in your migration (e.g., `if (!data.field)`)
- Check Firestore query is correct
- Add console.log for debugging

### Migration Takes Too Long

- Use batch processing (already handled by service)
- Process in smaller chunks
- Consider background job for very large migrations (100k+ records)

## Migration Versioning

Use format: `XXX_description` where XXX is a 3-digit number:

- `001_initial_schema`
- `002_add_tags_field`
- `003_update_user_profiles`
- etc.

Always increment the number, never reuse.

## Safety Checklist

Before deploying a migration:

- [ ] Migration is idempotent (safe to run multiple times)
- [ ] Migration doesn't delete or modify critical data
- [ ] Migration preserves backward compatibility
- [ ] Migration tested locally
- [ ] Migration handles edge cases (empty collections, missing fields, etc.)
- [ ] Error handling included (try/catch)
- [ ] Migration returns accurate `recordsProcessed` count

---

For deployment process, see [Zero-Downtime Deployment Guide](./ZERO_DOWNTIME_DEPLOYMENT.md)

