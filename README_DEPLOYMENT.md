# Deployment, Backup, and Data Protection Guide

Complete guide to safely deploying updates, backing up data, and protecting your Firebase database while using Vercel for hosting.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Backup System](#backup-system)
3. [Safe Deployment Process](#safe-deployment-process)
4. [Vercel Deployment](#vercel-deployment)
5. [Firebase Backups](#firebase-backups)
6. [Rollback Procedures](#rollback-procedures)
7. [Database Migrations](#database-migrations)
8. [Quick Reference](#quick-reference)

---

## Overview

Your application uses:
- **Vercel** - Hosting (frontend/backend code)
- **Firebase** - Database, Auth, Storage (user data, transcripts, files)

**Key Principle**: Your code (Vercel) and data (Firebase) are **completely separate**. Deploying code updates doesn't affect your database.

---

## Backup System

### Built-in Backup System

This application includes a complete backup system that backs up all Firestore data.

#### Quick Commands

```bash
# Create a backup
npm run backup

# List all backups
npm run list-backups

# Restore from backup (dry-run first!)
npm run restore -- backup_1234567890 --dry-run
npm run restore -- backup_1234567890
```

#### Automated Backups

**Already configured**: Daily backups at 2 AM via Vercel Cron.

The system automatically:
- Backs up all user data, transcripts, TTS records
- Stores backups in Firebase Storage
- Tracks backup metadata in Firestore
- Allows instant restore if needed

See `BACKUP_AND_RESTORE.md` for complete backup documentation.

---

## Safe Deployment Process

### Standard Workflow

#### 1. **Before Deployment**

```bash
# Create a backup (recommended before major changes)
npm run backup

# Test locally
npm run dev

# Check migration status
npm run migrate:status
```

#### 2. **Deploy with Preview**

```bash
# Push to feature branch (creates preview deployment)
git checkout -b feature/my-update
git add .
git commit -m "Add new feature"
git push origin feature/my-update
```

Vercel automatically:
- Creates a preview URL
- Builds and deploys your branch
- Keeps production untouched

**Test the preview URL** before merging!

#### 3. **Deploy to Production**

```bash
# Merge to main (triggers production deployment)
git checkout main
git merge feature/my-update
git push origin main
```

Vercel automatically:
- Builds new production version
- Deploys with **zero downtime**
- Keeps old deployment available for rollback

#### 4. **After Deployment**

```bash
# Run any pending migrations
npm run migrate

# Or via API
curl -X POST https://your-app.vercel.app/api/admin/migrations/run \
  -H "x-user-email: admin@email.com"
```

---

## Vercel Deployment

### How Vercel Works

Vercel provides **zero-downtime deployments** by default:

1. **New build runs in background** while old deployment stays live
2. **Atomic cutover** - instant switch when build succeeds
3. **Previous deployments remain accessible** - rollback in seconds

### Vercel Automatic Features

- ✅ **Git Integration** - Every push creates a deployment
- ✅ **Preview URLs** - Test changes before production
- ✅ **Instant Rollback** - Click previous deployment → Promote to Production
- ✅ **Environment Variables** - Stored securely, versioned with deployments
- ✅ **Deployment History** - All versions accessible

### Rollback in Vercel (If Needed)

1. Go to Vercel Dashboard → Your Project → Deployments
2. Find the last working deployment
3. Click "..." menu → "Promote to Production"
4. Takes ~10 seconds, zero data loss

**Your Firebase data is unaffected** - rollback only affects code.

---

## Firebase Backups

### Multiple Backup Layers

#### Layer 1: Built-in Automated Backups ✅

**Already configured** - Daily backups via `src/app/api/cron/backups/route.ts`

- Stores in Firebase Storage (`backups/backup_*.json`)
- Tracks in Firestore (`system_backups` collection)
- Includes all user data, transcripts, TTS records

#### Layer 2: Firebase Native Backups

If you're on Firebase Blaze plan:

**Firestore Backups:**
- Go to Firebase Console → Firestore Database → Backups tab
- Schedule daily/weekly automated backups
- Stored in Google Cloud Storage
- Incremental and cost-efficient

**Setup:**
```bash
# Enable automated backups via gcloud
gcloud firestore export gs://YOUR_BUCKET_NAME --async
```

**Manual Export:**
```bash
# Export entire Firestore database
gcloud firestore export gs://YOUR_BUCKET_NAME
```

#### Layer 3: Firebase Auth Backup

Export user accounts periodically:

```javascript
// Via Firebase Admin SDK (run as scheduled job)
const admin = require('firebase-admin');
const users = await admin.auth().listUsers();
// Save users list to backup storage
```

#### Layer 4: Firebase Storage Backup

Backup audio files and transcripts:

```bash
# Sync Firebase Storage to Cloud Storage bucket
gsutil -m cp -r gs://YOUR_FIREBASE_STORAGE/* gs://YOUR_BACKUP_BUCKET/
```

### Recommended Backup Strategy

**Daily:** Use built-in automated backups (already configured)
**Weekly:** Run Firebase native backup export
**Before Major Updates:** Create manual backup (`npm run backup`)

---

## Rollback Procedures

### If Deployment Goes Wrong

#### Quick Rollback (Code Only)

**In Vercel Dashboard:**
1. Go to Deployments tab
2. Find last working deployment
3. Click "Promote to Production"
4. Done in ~10 seconds

#### Full Data Rollback

**If you need to restore database:**

```bash
# 1. List available backups
npm run list-backups

# 2. Preview restore (see what will change)
npm run restore -- backup_1234567890 --dry-run

# 3. Restore from backup
npm run restore -- backup_1234567890
```

**Via API:**
```bash
curl -X POST https://your-app.vercel.app/api/admin/backups \
  -H "x-user-email: admin@email.com" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "restore",
    "backupId": "backup_1234567890",
    "options": {
      "restoreUsers": true,
      "restoreSTT": true,
      "restoreTTS": true,
      "dryRun": false
    }
  }'
```

### Emergency Rollback Checklist

- [ ] Stop accepting new data (if possible)
- [ ] Document what went wrong
- [ ] Create backup of current state
- [ ] Identify last known good backup
- [ ] Test restore in staging (if possible)
- [ ] Perform production restore
- [ ] Monitor application
- [ ] Document lessons learned

---

## Database Migrations

### Safe Migration Process

When adding new database fields or changing schema:

#### Step 1: Make Code Backward Compatible

```typescript
// Read both old and new fields
const value = doc.data().newField || doc.data().oldField;
```

#### Step 2: Create Migration

```typescript
// src/migrations/001_add_new_field.ts
export const migration: Migration = {
  version: '001_add_new_field',
  description: 'Add new_field to all records',
  up: async () => {
    // Add new field to existing records
    // Only update if field doesn't exist (idempotent)
    return { recordsProcessed: count };
  }
};
```

#### Step 3: Deploy Code

```bash
git push origin main  # Deploys new code
```

#### Step 4: Run Migration

```bash
npm run migrate
# Or via API endpoint
```

#### Step 5: Update Code (Later)

After migration completes, you can simplify code to only use new field.

### Migration Best Practices

- ✅ **Additive only** - Never remove fields immediately
- ✅ **Idempotent** - Safe to run multiple times
- ✅ **Backward compatible** - Old code works with new data
- ✅ **Test first** - Always test migrations in staging

See `MIGRATION_GUIDE.md` for detailed migration examples.

---

## Quick Reference

### Before Every Deployment

```bash
# 1. Create backup
npm run backup

# 2. Test locally
npm run dev

# 3. Check migrations
npm run migrate:status

# 4. Push to feature branch (for preview)
git push origin feature-branch

# 5. Test preview URL

# 6. Merge to main (deploys to production)
git push origin main

# 7. Run migrations if needed
npm run migrate
```

### Backup Commands

```bash
npm run backup          # Create backup
npm run list-backups    # List all backups
npm run restore -- <id> # Restore from backup
```

### Migration Commands

```bash
npm run migrate:status  # Check migration status
npm run migrate         # Run pending migrations
```

### API Endpoints

**Backups:**
- `GET /api/admin/backups` - List backups
- `POST /api/admin/backups` - Create/restore/cleanup
- `GET /api/admin/backups/[id]` - Get backup details

**Migrations:**
- `GET /api/admin/migrations/status` - Check status
- `POST /api/admin/migrations/run` - Run migrations

---

## Summary

### Your Protection Layers

1. **Code Versioning** - Git repository (primary backup)
2. **Deployment History** - Vercel keeps all deployments (instant rollback)
3. **Built-in Backups** - Daily automated Firestore backups
4. **Firebase Native** - Additional backup options (Blaze plan)
5. **Migration System** - Safe database schema updates
6. **Manual Backups** - On-demand backups before major changes

### Key Principles

✅ **Code and data are separate** - Vercel (code) vs Firebase (data)
✅ **Zero downtime deployments** - Vercel handles this automatically
✅ **Always test on preview** - Before merging to production
✅ **Backup before major changes** - Use `npm run backup`
✅ **Migrations are additive** - Never remove fields immediately
✅ **Instant rollback available** - Both code (Vercel) and data (backup system)

### Emergency Contacts

- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **Firebase Support**: [firebase.google.com/support](https://firebase.google.com/support)

---

## Related Documentation

- `ZERO_DOWNTIME_DEPLOYMENT.md` - Detailed deployment guide
- `BACKUP_AND_RESTORE.md` - Complete backup system docs
- `MIGRATION_GUIDE.md` - How to create migrations
- `DEPLOYMENT_SUMMARY.md` - Migration system overview

---

**Your users, transcripts, and data are protected** - Multiple backup layers ensure you can always recover. The built-in backup system provides automated daily backups, and Vercel's deployment system ensures zero-downtime updates.

