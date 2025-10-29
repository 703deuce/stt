# Zero-Downtime Deployment System

## ✅ What's Been Set Up

A complete migration and deployment system that allows you to:
- **Update your application while it's running** (zero downtime)
- **Preserve all user data** during updates
- **Safely add new features** without breaking existing functionality
- **Track all database changes** automatically

## 📁 New Files Created

1. **`src/services/migrationService.ts`** - Core migration system
   - Tracks all migrations in Firestore
   - Runs migrations safely (idempotent)
   - Processes in batches to avoid memory issues

2. **`src/app/api/admin/migrations/route.ts`** - Admin API endpoint
   - `GET /api/admin/migrations/status` - Check migration status
   - `POST /api/admin/migrations/run` - Run pending migrations

3. **`src/utils/auth.ts`** - Authentication utilities
   - Admin verification helper functions
   - Consistent auth checking across routes

4. **`scripts/run-migrations.ts`** - Command-line migration runner
5. **`scripts/check-migration-status.ts`** - Check migration status

6. **`ZERO_DOWNTIME_DEPLOYMENT.md`** - Complete deployment guide
7. **`MIGRATION_GUIDE.md`** - How to create migrations

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

(tsx added to devDependencies for running migration scripts)

### 2. Check Migration Status

```bash
npm run migrate:status
```

### 3. Run Migrations (when needed)

```bash
npm run migrate
```

Or via API:
```bash
curl -X POST https://your-app.vercel.app/api/admin/migrations/run \
  -H "x-user-email: your-admin@email.com"
```

## 📋 How It Works

### Deployment Flow

1. **Make changes** to your codebase
2. **Create migration** (if database changes needed)
3. **Test locally** (`npm run migrate`)
4. **Deploy to Vercel** (git push)
5. **After deployment completes**, run migrations via API or script
6. **Verify** everything works

### Migration Principles

- ✅ **Idempotent** - Safe to run multiple times
- ✅ **Backward Compatible** - Old code works with new data
- ✅ **Non-Destructive** - Never deletes user data
- ✅ **Tracked** - All migrations logged in Firestore `system_migrations` collection

## 🎯 Example: Adding a New Feature

Let's say you want to add "tags" to transcriptions:

### Step 1: Update TypeScript Interface

```typescript
// src/services/databaseService.ts
export interface STTRecord {
  // ... existing fields
  tags?: string[]; // New optional field
}
```

### Step 2: Create Migration (if needed)

Since `tags` is optional, no migration needed! Old code works fine.

But if you want to initialize it:
```typescript
// src/migrations/001_add_tags.ts
export const migration: Migration = {
  version: '001_add_tags',
  description: 'Initialize tags array for all STT records',
  up: async () => {
    // Optional: Add default empty array to existing records
    return { recordsProcessed: 0 };
  }
};
```

### Step 3: Update Code

```typescript
// Your components can now use:
const tags = sttRecord.tags || []; // Backward compatible
```

### Step 4: Deploy

```bash
git add .
git commit -m "Add tags feature"
git push origin main
# Vercel automatically deploys
# Run migrations if needed (npm run migrate)
```

## 📊 Migration Tracking

All migrations are tracked in Firestore:
- **Collection**: `system_migrations`
- **Document ID**: Migration version (e.g., `001_add_tags`)
- **Fields**: status, executedAt, recordsProcessed, error

View migration history:
```bash
npm run migrate:status
```

## 🔒 Admin Access

Migrations require admin access. Admin emails are configured via:
- Environment variable: `ADMIN_EMAILS` (comma-separated)
- Default: `703deuce@gmail.com`

## 📖 Full Documentation

- **`ZERO_DOWNTIME_DEPLOYMENT.md`** - Complete deployment process
- **`MIGRATION_GUIDE.md`** - How to create and run migrations

## ✨ Benefits

1. **No Downtime** - Deploy while users are active
2. **Data Safety** - All user data preserved
3. **Version Control** - Track all database changes
4. **Rollback Ready** - Can mark migrations as failed if needed
5. **Developer Friendly** - Simple API and CLI tools

## 🎉 You're Ready!

Your application now supports safe, zero-downtime updates while preserving all user data. Every migration is tracked and can be safely re-run if needed.

---

**Next Steps:**
1. Read `ZERO_DOWNTIME_DEPLOYMENT.md` for detailed process
2. Read `MIGRATION_GUIDE.md` when you need to create migrations
3. Test the system with a small migration first

