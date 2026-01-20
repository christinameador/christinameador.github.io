# Life RPG - OSRS-Inspired Life Gamification App

A Progressive Web App that gamifies your life with Old School RuneScape (OSRS) inspired mechanics. Track your real-life "skills" through daily quests, earn XP, unlock achievements, and work toward your Grandmaster Quest: launching Moonshot Dev and making your first sale!

## Features

### 🎮 Core RPG Mechanics
- **6 Skills**: Strength, Creativity, Intelligence, Charisma, Wisdom, Constitution
- **OSRS XP System**: Authentic XP curve with levels 1-99
- **Quest System**: Daily, weekly, monthly, and as-needed quests
- **Path Tags**: Track multiple Grandmaster goals simultaneously
- **Achievement Diaries**: Beginner → Medium → Hard → Elite → Grandmaster tiers
- **Streak Tracking**: Build and maintain daily streaks for each skill
- **Photo Collection**: Document your progress with categorized photos

### 🎯 Grandmaster Paths
Progress toward multiple life goals at once:
- **🚀 Business Path**: Launch Moonshot Dev and make your first sale
- **🍳 Culinary Master**: Master cooking techniques and create memorable meals
- **🎨 Artistic Visionary**: Create and share beautiful art projects
- **📸 Lifestyle Influencer**: Build your personal brand and engage your community

Quests can have multiple path tags, so the same quest can count toward multiple goals!

### 🔥 Special Features
- **75 Hard Integration**: Built-in 75 Hard challenge tracker with daily checklist
- **Business Path**: Quests designed to lead you to launching Moonshot Dev
- **Grandmaster Quest**: First sale achievement unlocks ultimate completion
- **Level-Up Celebrations**: Visual notifications when you gain levels
- **Achievement Unlocks**: Satisfying popups when you hit milestones

### 📱 PWA Benefits
- Install on your phone like a native app
- Works offline
- No app store required
- Updates automatically

## Installation

### On iPhone (iOS)
1. Open Safari and navigate to the app URL
2. Tap the Share button (square with arrow pointing up)
3. Scroll down and tap "Add to Home Screen"
4. Name it "Life RPG" and tap "Add"
5. The app icon will appear on your home screen

### On Android
1. Open Chrome and navigate to the app URL
2. Tap the menu (three dots) in the top right
3. Tap "Add to Home screen" or "Install app"
4. Confirm by tapping "Add" or "Install"
5. The app icon will appear on your home screen

### Testing Locally
1. Install a local server (if you don't have one):
   ```bash
   npm install -g http-server
   ```

2. Navigate to the project folder and run:
   ```bash
   http-server -p 8080
   ```

3. Open your browser to `http://localhost:8080`

4. On mobile, you can access it via your local network:
   - Find your computer's local IP (e.g., 192.168.1.100)
   - On your phone, navigate to `http://192.168.1.100:8080`

## How to Use

### Character Sheet View
- See all 6 skills with current levels and XP progress
- View streak indicators for each skill
- Monitor your total level and daily XP

### Quests View
- Filter by Type: Daily, Weekly, Monthly, or As-Needed
- Filter by Path: Business, Culinary, Artistic, Lifestyle, or Untagged
- Tap "Complete Quest" to earn XP and update streaks
- Add photos to document your accomplishments
- Create custom quests with your own XP values and path tags

### Paths View
- Track progress toward each Grandmaster goal
- See how many quests completed in each path
- View total XP earned per path
- Visual progress bars show your journey
- Click "View Quests" to jump to filtered quest list

### Achievements View
- Track progress across 5 tiers of achievements
- See what you've unlocked and what's next
- Work toward the ultimate Grandmaster Quest

### Challenges View
- Start and track 75 Hard challenge
- Daily checklist with all 7 requirements
- Auto-resets if you miss a day
- Massive XP reward for completion

## Quest Types & Paths

### Quest Types
- **Daily**: Repeatable every day (e.g., running, cross stitch, dev work)
- **Weekly**: Once per week (e.g., date nights, meal prep, 5K runs)
- **Monthly**: Once per month (e.g., master a new recipe, complete art project)
- **As-Needed**: One-time or irregular quests (e.g., business milestones, learning new skills)

### Path Tags
Quests can be tagged with multiple paths to track progress toward different goals:

**🚀 Business Path** (Grandmaster: Make first sale)
- Market research, website development, plugin creation, marketing strategy, social media building

**🍳 Culinary Master** (Grandmaster: TBD)
- Cooking meals, meal prep, trying new techniques, themed dinners, plating/presentation

**🎨 Artistic Visionary** (Grandmaster: TBD)
- Cross stitch, art projects, learning techniques, sharing work

**📸 Lifestyle Influencer** (Grandmaster: TBD)
- Content creation, community engagement, photo shoots, reels/videos

Quests can have no tags (general life improvement) or multiple tags (building social media presence helps both Business Path and Lifestyle Influencer!)

## Achievements

### Beginner
- First Quest
- 3-day streak
- Multi-class (all skills in one week)
- Level 5 in any skill

### Medium
- 7-day running streak
- 10 hours dev work in a week
- Social Butterfly
- Level 20 in any skill
- Business Foundation (launch website)

### Hard
- 30-day streak
- Complete 75 Hard
- Run 15 times in a month
- Level 50 in any skill
- Plugin Master (complete plugin)

### Elite
- Skill Cape (Level 99)
- Quest Cape (all achievements)
- Completionist (all 99s)

### Grandmaster
- **Entrepreneur**: Launch Moonshot Dev and make first sale

## Data Storage

All data is stored locally in your browser's localStorage:
- Skills and XP
- Quest completions
- Achievements
- Photos (as base64)
- 75 Hard progress

**Important**: Data is tied to your browser. If you clear browser data or use a different browser, you'll lose your progress. Future versions may add cloud sync.

## Customization

You can easily customize quests and XP values by editing the `getDefaultQuests()` function in `app.js`:

```javascript
{ 
  id: 'my_quest', 
  name: 'My Custom Quest', 
  xp: 50, 
  skill: 'intelligence', 
  type: 'daily', 
  category: 'daily' 
}
```

## Tips for Success

1. **Start Small**: Don't try to complete every quest every day. Pick 2-3 to focus on.
2. **Build Streaks**: Consistency > intensity. A 7-day streak beats sporadic big efforts.
3. **Use Photos**: Visual progress is incredibly motivating.
4. **Business Path**: These quests are intentionally ordered - follow the path!
5. **Celebrate Wins**: When you level up or unlock achievements, take a moment to appreciate it.

## Future Enhancements

Potential features to add:
- Cloud sync / account system
- Custom quest builder in the UI
- More detailed analytics and graphs
- Social features (compete with friends)
- Rewards/penalties system
- Daily/weekly challenges
- Export data to bullet journal format

## Technical Details

- **Framework**: Vanilla JavaScript (no dependencies)
- **Storage**: localStorage
- **Offline**: Service Worker for PWA functionality
- **Styling**: Custom CSS with OSRS-inspired color scheme
- **XP Formula**: Authentic OSRS algorithm

## License

Personal project - use and modify as you wish!

---

**Ready to level up your life? Install the app and start your adventure!** 🎮✨
