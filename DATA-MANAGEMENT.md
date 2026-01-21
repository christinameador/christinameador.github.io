# Data Import/Export Guide

## The Problem

When you update the app (new features, bug fixes, etc.), you want to:
1. Keep all your progress (XP, streaks, completed quests, photos)
2. Get the new quest definitions and features
3. Not lose anything you've built up!

## The Solution: Export → Update → Import

### Step 1: Export Your Data (Before Updating)

**Option A: Full Backup (Recommended)**
1. Open the app (old version)
2. Go to Settings (⚙️ tab)
3. Click "📥 Export All Data (JSON)"
4. Save the file somewhere safe (e.g., `life-rpg-backup-2025-01-20.json`)

**Option B: Quests Only**
- If you only want to update quest definitions
- Click "📥 Export Quests (CSV)"
- Edit in Excel/Sheets, save as CSV

### Step 2: Update the App

Replace the old app files with new ones:
- Copy new `index.html`, `app.js`, `styles.css`, etc.
- Or if deployed: upload new files to your server/Netlify/GitHub Pages

### Step 3: Import Your Data

**Full Backup:**
1. Open the new app version
2. Go to Settings (⚙️)
3. Click "📤 Import All Data"
4. Select your backup JSON file
5. Confirm the import
6. ✓ All your progress is back!

**Quests Only:**
1. Click "📤 Import Quests (CSV)"
2. Select your edited CSV file
3. Quest definitions update, progress preserved

## What Gets Exported/Imported

### Full Backup (JSON)
✅ All skills with XP and streaks  
✅ All quest definitions (default + custom)  
✅ Today's completed quests  
✅ All achievements and progress  
✅ 75 Hard challenge status  
✅ Collection Log entries and photos  
✅ Photo gallery  

**File size:** Can be large if you have many photos (base64 encoded)

### Quests Only (CSV)
✅ Quest definitions (id, name, xp, skill, type, tags)  
❌ No progress data  
❌ No photos  

**Use case:** Bulk editing quests in Excel, then re-importing

## CSV Format for Quests

```csv
id,name,xp,skill,type,tags,custom
"run","Go for a run",50,"strength","daily","fitness-goddess","false"
"dev_work","Moonshot Dev work (1+ hr)",50,"intelligence","daily","business-path","false"
"custom_123","My custom quest",30,"creativity","as-needed","artistic-visionary;culinary-master","true"
```

**Important:**
- Tags are semicolon-separated (e.g., `business-path;lifestyle-influencer`)
- Values with spaces/commas should be quoted
- custom column: `true` or `false`

## Editing Quests in Excel/Sheets

1. Export quests as CSV
2. Open in Excel/Google Sheets
3. Edit values:
   - Change XP values
   - Add/remove tags
   - Rename quests
   - Change quest types
4. Save as CSV
5. Import back into app

**Pro tip:** Keep a "master quests CSV" file you edit between iterations!

## Common Workflows

### Workflow 1: App Update with No Data Changes
1. Just replace app files
2. Your localStorage data persists automatically
3. No import/export needed!

### Workflow 2: App Update + New Quests
1. Export full backup (safety!)
2. Update app files
3. New default quests appear automatically
4. Your progress is preserved
5. (Optional) Import backup if something breaks

### Workflow 3: Bulk Edit Quests
1. Export quests CSV
2. Edit in Excel/Sheets
3. Import quests CSV
4. Quest definitions updated, progress kept

### Workflow 4: Moving to New Device
1. Export full backup from old device
2. Install app on new device
3. Import backup on new device
4. Everything transferred!

### Workflow 5: Sharing Quest Template
1. Reset app or use fresh install
2. Add your custom quests
3. Export quests CSV
4. Share CSV with others
5. They import to get your quest setup

## Data Safety Tips

1. **Export regularly!** Make weekly backups
2. **Name backups with dates** (e.g., `backup-2025-01-20.json`)
3. **Keep multiple versions** in case you need to rollback
4. **Test imports** on a fresh browser tab before deleting old data
5. **Store backups** in Google Drive, Dropbox, or email them to yourself

## Troubleshooting

**"Invalid data file" error**
- Make sure you're importing the right file type (JSON for full, CSV for quests)
- Check the JSON is valid (use jsonlint.com)
- Re-export if file got corrupted

**Quest import doesn't seem to work**
- Check CSV format matches expected columns
- Make sure tags use semicolons, not commas
- Verify no special characters breaking CSV parsing

**Photos not importing**
- Photos are base64 encoded in JSON
- Very large files (100+ photos) may cause issues
- Consider clearing old photos before export if file is huge

**Lost data after update**
- Check if you're on the same browser/device
- localStorage is browser-specific
- Import your backup immediately

## Advanced: Merging Data

Want to combine data from two sources? 

1. Export both as JSON
2. Use a JSON editor or write a script to merge
3. Common merge: new quest definitions + old progress
4. Import merged JSON

Example merge scenario:
- Old app has your progress
- New app has new quests
- Manually combine `quests` arrays
- Keep old `skills`, `completedToday`, etc.

## Reset Everything

If you want a fresh start:
1. Settings → Reset Everything
2. Confirms twice (it's permanent!)
3. All data deleted, app resets to defaults
4. Good for testing or starting over

---

**Remember: Always export before updating!** 📥🔒
