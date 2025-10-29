# Backup and Restore System

Complete backup and restore system for your Firestore database. Ensures you can always roll back if something goes wrong.

## 🎯 Features

- ✅ **Full backups** - Complete database snapshot
- ✅ **Automated backups** - Schedule regular backups
- ✅ **Manual backups** - Create backups on demand
- ✅ **Restore capability** - Roll back to any backup
- ✅ **Backup management** - List, view, and delete backups
- ✅ **Safe restore** - Dry-run mode to preview changes

## 📋 Quick Start

### Create a Backup

```bash
# Via command line
npm run backup

# Via API
curl -X POST https://your-app.vercel.app/api/admin/backups \
  -H "x-user-email: admin@email.com" \
  -H "Content-Type: application/json" \
  -d '{"action": "create"}'
```

### List Backups

```bash
# Via command line
npm run list-backups

# Via API
curl https://your-app.vercel.app/api/admin/backups?stats=true \
  -H "x-user-email: admin@email.com"
```

### Restore from Backup

```bash
# Dry run first (recommended)
npm run restore -- backup_1234567890 --dry-run

# Actual restore (will overwrite data!)
npm run restore -- backup_1234567890

# Via API
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
      "restoreSystem": false,
      "dryRun": false
    }
  }'
```

## 🔄 Automated Backups

### Option 1: Cron Job (Server/CI)

Set up a cron job to run backups automatically:

```bash
# Daily backup at 2 AM
0 2 * * * cd /path/to/transcription-app && npm run backup
```

### Option 2: Vercel Cron (Recommended)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/admin/backups",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Then create `src/app/api/cron/backups/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/services/backupService';

export async function GET(request: NextRequest) {
  // Verify cron secret (recommended)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const backup = await backupService.createFullBackup();
    return NextResponse.json({ success: true, backup });
  } catch (error) {
    return NextResponse.json(
      { error: 'Backup failed', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
```

### Option 3: GitHub Actions

Create `.github/workflows/backup.yml`:

```yaml
name: Daily Backup

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:  # Manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run backup
        env:
          FIREBASE_CONFIG: ${{ secrets.FIREBASE_CONFIG }}
```

## 📊 Backup Contents

Each backup includes:

- **All user accounts** (user profiles, settings)
- **All STT records** (transcriptions)
- **All TTS records** (generated audio)
- **System data** (migrations, voice clones, etc.)

Backups are stored in:
- **Firestore**: `system_backups` collection (metadata)
- **Firebase Storage**: `backups/backup_*.json` (actual data)

## 🛡️ Restore Process

### Before Restoring

1. **Always test in staging first**
2. **Create a backup of current state** before restoring
3. **Use dry-run mode** to preview changes

### Restore Options

```typescript
{
  restoreUsers: true,      // Restore user accounts
  restoreSTT: true,        // Restore transcriptions
  restoreTTS: true,        // Restore generated audio
  restoreSystem: false,    // Restore system collections (usually skip)
  dryRun: true            // Preview without making changes
}
```

### Step-by-Step Restore

```bash
# 1. List available backups
npm run list-backups

# 2. Dry run to preview
npm run restore -- backup_1234567890 --dry-run

# 3. Create backup of current state (safety)
npm run backup

# 4. Perform actual restore
npm run restore -- backup_1234567890
```

## 🧹 Cleanup Old Backups

Automatically clean up old backups, keeping only the most recent N:

```bash
# Via API
curl -X POST https://your-app.vercel.app/api/admin/backups \
  -H "x-user-email: admin@email.com" \
  -H "Content-Type: application/json" \
  -d '{"action": "cleanup", "keepRecent": 10}'
```

Recommended: Keep last 10-30 backups depending on storage costs.

## 📈 Backup Best Practices

### Frequency

- **Production**: Daily backups (minimum)
- **High traffic**: Twice daily or more
- **Before major updates**: Always create a backup first

### Retention

- **Daily backups**: Keep for 30 days
- **Weekly backups**: Keep for 3 months
- **Monthly backups**: Keep for 1 year
- **Before major changes**: Keep indefinitely (or until next major change)

### Testing

Test your restore process regularly:

1. Restore to a test environment
2. Verify data integrity
3. Test application functionality

### Monitoring

Set up alerts for:
- Failed backups
- Backup size anomalies
- Storage quota warnings

## 🚨 Emergency Rollback

If something goes wrong:

### Immediate Steps

1. **Stop accepting new data** (if possible)
2. **Identify the issue** - What broke?
3. **Find the last good backup** before the problem
4. **Restore in staging first** to verify
5. **Restore to production** during low-traffic period
6. **Monitor closely** after restore

### Rollback Checklist

- [ ] Document what went wrong
- [ ] Create backup of current (broken) state
- [ ] Identify last known good backup
- [ ] Test restore in staging
- [ ] Notify users (if needed)
- [ ] Perform production restore
- [ ] Verify data integrity
- [ ] Monitor application
- [ ] Document lessons learned

## 💾 Storage Considerations

### Size Estimates

- Small app (< 100 users): ~10-50 MB per backup
- Medium app (100-1000 users): ~50-500 MB per backup
- Large app (> 1000 users): ~500 MB+ per backup

### Storage Management

- Monitor Firebase Storage usage
- Set up alerts for quota warnings
- Regularly clean up old backups
- Consider compression for very large backups (future enhancement)

## 🔐 Security

- Backups contain all user data - treat with care
- Store backup access keys securely
- Limit who can trigger restores
- Audit backup access logs
- Consider encrypting backups at rest (Firebase handles this)

## 📝 API Reference

### Create Backup

```http
POST /api/admin/backups
Content-Type: application/json
x-user-email: admin@email.com

{
  "action": "create"
}
```

### List Backups

```http
GET /api/admin/backups?limit=20&stats=true
x-user-email: admin@email.com
```

### Get Backup Details

```http
GET /api/admin/backups/[backupId]
x-user-email: admin@email.com
```

### Restore from Backup

```http
POST /api/admin/backups
Content-Type: application/json
x-user-email: admin@email.com

{
  "action": "restore",
  "backupId": "backup_1234567890",
  "options": {
    "restoreUsers": true,
    "restoreSTT": true,
    "restoreTTS": true,
    "restoreSystem": false,
    "dryRun": false
  }
}
```

### Cleanup Old Backups

```http
POST /api/admin/backups
Content-Type: application/json
x-user-email: admin@email.com

{
  "action": "cleanup",
  "keepRecent": 10
}
```

## 🎯 Integration with Deployment

### Best Practice Workflow

1. **Before deploying**:
   ```bash
   npm run backup  # Create backup
   ```

2. **Deploy changes**:
   ```bash
   git push origin main
   ```

3. **After deployment**:
   - Monitor for issues
   - If problems occur, restore from backup

4. **Success confirmation**:
   - Keep the pre-deployment backup for 7 days
   - Then clean up if everything is stable

## ✅ Success Criteria

Your backup system is working correctly if:

- [ ] Backups complete without errors
- [ ] Backup size is reasonable for your data volume
- [ ] Restores work in test environment
- [ ] Backup frequency meets your needs
- [ ] Storage costs are manageable
- [ ] You've tested the restore process

## 🆘 Troubleshooting

### Backup Fails

- Check Firebase Storage quota
- Verify Firebase permissions
- Check network connectivity
- Review error logs

### Restore Fails

- Verify backup ID is correct
- Check Firebase write permissions
- Ensure sufficient storage space
- Check for data conflicts

### Backups Too Large

- Consider incremental backups (future feature)
- Archive old data separately
- Compress backups (future enhancement)
- Split by collection type

---

**Remember**: Regular backups are your safety net. Test your restore process before you need it!

