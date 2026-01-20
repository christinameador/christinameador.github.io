# Quick Start Guide

## Get It Running NOW

### Step 1: Test Locally
```bash
# If you have Python 3:
cd /home/claude/life-rpg
python3 -m http.server 8080

# If you have Node.js:
npx http-server -p 8080

# If you have PHP:
php -S localhost:8080
```

Then open your browser to: `http://localhost:8080`

### Step 2: Test on Your Phone
1. Find your computer's local IP address:
   - **Mac/Linux**: Run `ifconfig` or `ip addr` and look for something like `192.168.1.xxx`
   - **Windows**: Run `ipconfig` and look for "IPv4 Address"

2. Make sure your phone is on the same WiFi network as your computer

3. On your phone's browser, go to: `http://YOUR_IP:8080`
   (e.g., `http://192.168.1.100:8080`)

### Step 3: Install as PWA on Your Phone

**iPhone:**
1. Open the app in Safari
2. Tap the Share button (box with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" in the top right

**Android:**
1. Open the app in Chrome
2. Tap the menu (three dots)
3. Tap "Add to Home screen" or "Install app"
4. Tap "Add" or "Install"

### Step 4: Start Questing!
1. Complete your first quest (tap "Complete Quest")
2. Watch your XP bar fill up
3. Build that streak!
4. Work toward your Grandmaster Quest: Launch Moonshot Dev and make your first sale

## Deploy to the Web

Once you want to deploy this permanently so you can access it from anywhere:

### Option A: GitHub Pages (Free)
```bash
# Create a GitHub repo and push your code
git init
git add .
git commit -m "Initial commit - Life RPG"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main

# Enable GitHub Pages in your repo settings
# Your app will be live at: https://yourusername.github.io/life-rpg/
```

### Option B: Netlify (Free)
1. Go to https://netlify.com
2. Drag and drop your `life-rpg` folder
3. Your app will be live instantly
4. Get a custom URL like `yourname-life-rpg.netlify.app`

### Option C: Vercel (Free)
1. Go to https://vercel.com
2. Import your GitHub repo
3. Deploy in seconds

## Customizing Your App

### Add Custom Quests
Edit `app.js`, find the `getDefaultQuests()` function, and add:

```javascript
{
    id: 'my_custom_quest',
    name: 'My Custom Quest Name',
    xp: 50,  // How much XP it's worth
    skill: 'intelligence',  // Which skill it levels
    type: 'daily',  // daily, weekly, or business
    category: 'daily'  // For filtering
}
```

### Change XP Values
In the same `getDefaultQuests()` function, just change the `xp:` value for any quest.

### Add Custom Achievements
Edit the `getDefaultAchievements()` function in `app.js`:

```javascript
{
    id: 'my_achievement',
    name: 'Achievement Name',
    description: 'What you need to do',
    completed: false,
    date: null
}
```

### Change Colors
Edit `styles.css` and modify the `:root` variables at the top.

## Troubleshooting

**App won't install on phone:**
- Make sure you're using HTTPS (required for PWA)
- Try a different browser
- Check that manifest.json is loading properly

**Icons not showing:**
- Open `icon-generator.html` in your browser
- Right-click and save each icon as PNG
- Replace the placeholder icons

**Data disappeared:**
- Data is stored in browser's localStorage
- Clearing browser data will delete your progress
- Use the same browser to maintain your data
- Future version will add cloud sync

**Quest not completing:**
- Make sure you're clicking the green "Complete Quest" button
- Check the browser console for errors (F12)
- Try refreshing the page

## Pro Tips

1. **Don't track EVERYTHING at once** - Start with 3-5 quests you actually want to do daily
2. **The business quests are ordered** - Follow them in sequence for best results
3. **Use the photo feature** - Visual progress is incredibly motivating
4. **Streaks are powerful** - Even one day counts, focus on consistency
5. **Level up notifications** - Don't skip them, celebrate your wins!

## Next Steps

- [ ] Test the app locally
- [ ] Install on your phone
- [ ] Complete your first quest
- [ ] Customize quest XP values to your preferences
- [ ] Deploy to the web when ready
- [ ] Start working through the business path quests
- [ ] Build toward that Grandmaster Quest! 🎯

---

**You're all set! Time to level up your life! ⚔️**
