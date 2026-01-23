# Life RPG - Changelog

## Version 1.1 - Bug Fixes & Polish (Current)

### 🐛 Bug Fixes

#### Challenge Scrolling Issue
**Problem:** The 75 Hard challenge accordion couldn't scroll to see all quests when expanded. The last quest was cut off and inaccessible.

**Solution:** 
- Changed `.challenge-accordion-body` from `max-height: 800px` to `max-height: 1000px`
- Added `overflow-y: auto` when expanded to enable scrolling
- This allows all 7 tasks in the 75 Hard challenge to be visible and accessible

**Files Modified:**
- `styles.css` (lines 2984-2993)

#### Quests Tab Visibility
**Status:** The quests tab appears to be rendering correctly. No scrolling issues found in the quest card rendering. If specific issues persist, please provide more details about when/where quests are cut off.

### ✨ New Features

#### Personalization Settings
**Added:** Character name and partner name customization

**Features:**
- **Character Name Setting**: Configure your character name in Settings
  - Updates the title from "Christina's Adventure" to "[Your Name]'s Adventure"
  - Stored in `settings.characterName`
  
- **Partner Name Setting**: Customize partner name for relationship quests
  - Updates quests like "Quality time with [Partner]"
  - Affects 3 quests: quality_time, date_night, love_surprise
  - Stored in `settings.partnerName`

**Location:**
- Settings → Personalization section
- Both settings persist across sessions
- Automatically applied to quest names

**Files Modified:**
- `index.html` (Added personalization settings section)
- `app.js` (Added updateCharacterName(), updatePartnerName(), updatePartnerQuestNames())
- `styles.css` (Added form-input and form-helper-text styles)

#### Removed Hardcoded Names
**Changed:** All instances of hardcoded "Scott" replaced with "Your Partner" as default

**Affected Quests:**
- Quality time with Your Partner (daily)
- Date night with Your Partner (weekly)
- Surprise Your Partner with something thoughtful (monthly)

**Files Modified:**
- `app.js` (4 instances replaced)

### 🔧 Technical Improvements

#### Data Structure Enhancement
**Added:** Settings object to data model
```javascript
settings: {
    characterName: 'Christina',
    partnerName: 'Your Partner',
    soundEnabled: true
}
```

#### Migration Support
- Added automatic migration for existing users
- Settings object created on first load if doesn't exist
- Partner quest names automatically updated if custom partner name exists
- Backward compatible with all existing data

**Files Modified:**
- `app.js` (getDefaultData(), migrateData(), renderSettings())

### 📚 Documentation

#### New Documents Created
1. **ROADMAP.md** - Comprehensive development roadmap
   - Detailed feature plans for versions 1.2 through 2.0
   - Technical specifications for each feature
   - Timeline estimates
   - Implementation notes

2. **ONBOARDING-GUIDE.md** - Complete onboarding implementation guide
   - Step-by-step user flow
   - HTML structure
   - CSS styling
   - JavaScript implementation
   - Gender/relationship-specific quest variations
   - Testing checklist

---

## Version 1.0 - Initial Release

### Core Features
- 10-skill system based on OSRS leveling
- 9 life paths with quest tracking
- Quest system (daily, weekly, monthly, as-needed, one-time)
- Challenge system with streak tracking
- Collection log for experiences and memories
- Photo gallery
- Achievement system
- Special badges
- Login streak tracking
- Daily progress rings
- PWA support for mobile installation

### Skills
- Athleticism
- Culinary
- Artistry
- Business
- Partnership
- Friendships
- Inner Peace
- Home Craft
- Generosity
- Influence

### Paths
- Entrepreneur (Business)
- Fitness Goddess (Athleticism)
- Culinary Master (Culinary)
- Artistic Visionary (Artistry)
- Lover Girl (Partnership)
- Soul Work (Inner Peace)
- Living Saint (Generosity)
- Secret Garden (Home Craft)
- Lifestyle Influencer (Influence)

---

## How to Update

### From GitHub Pages
1. Clear browser cache
2. Refresh the page (Ctrl+F5 or Cmd+Shift+R)
3. Reinstall PWA if using installed version

### Local Development
1. Pull latest changes
2. Clear localStorage to test fresh install
3. Or keep localStorage to test migration

---

## Known Issues

None at this time. Please report any bugs or issues on GitHub.

---

## Coming Soon (Version 1.2)

See ROADMAP.md for detailed plans:
- Personalized onboarding flow
- Character creation with profile
- Gender/relationship/family-specific quests
- Challenge pack selection on first launch
- Dynamic quest generation based on profile

---

## Feedback

We'd love to hear from you! Please submit feedback, bug reports, or feature requests via:
- GitHub Issues
- Email: [your contact]
- Social media: [your handles]

---

Last Updated: January 2026
