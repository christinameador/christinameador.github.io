# Life RPG Development Roadmap

## Version 1.1 - UI Fixes & Polish (Current Sprint)
**Status**: In Progress

### Completed
- ✅ Fix 75 Hard challenge scrolling issue
- ✅ Fix quest list visibility issues
- ✅ Replace hardcoded partner name with configurable variable
- ✅ Clean up UI/UX clunky elements

---

## Version 1.2 - Personalization & Onboarding (Next Sprint)
**Timeline**: 2-3 weeks

### Features
1. **Initial Setup Screen**
   - Welcome screen with character creation
   - Choose starting challenge pack
   - Configure personal details:
     - Character name (for "[Character]'s Adventure")
     - Gender (Male/Female/Non-binary/Custom)
     - Life stage (Single/Married/Partnered)
     - Family status (No children/Has children)
     - Work status (Working/Student/Retired/Other)
   - Show preview of chosen challenge pack with pre-determined quests

2. **Dynamic Quest Customization**
   - Gender-specific quest variations
   - Family-status specific quests
   - Relationship-status specific quests
   - Generate appropriate default quests based on profile

3. **Configuration Storage**
   - Save user profile to localStorage
   - Allow profile editing in settings
   - Dynamic title updates based on character name

---

## Version 1.3 - Daily Journal System (Sprint 3)
**Timeline**: 2-3 weeks

### Features
1. **Journal Core**
   - Daily journal entry interface
   - Rich text editor for entries
   - Date-based navigation
   - Entry search functionality (full-text search)
   - Tags and categories for entries

2. **Prompt System**
   - Generic daily prompts library
   - Prompt pack system (downloadable/importable JSON)
   - Prompt categories:
     - Gratitude prompts
     - Reflection prompts
     - Goal-setting prompts
     - Creative prompts
     - Spiritual/mindfulness prompts
   - Random prompt generator
   - Favorite prompts system

3. **Prompt Pack Manager**
   - Browse available prompt packs
   - Import custom prompt packs (JSON format)
   - Export/share custom prompt packs
   - Community prompt pack repository (future consideration)

**Technical Implementation**:
```javascript
// Journal entry structure
{
  id: 'journal_2024_01_23',
  date: '2024-01-23',
  prompt: 'What am I grateful for today?',
  entry: 'Today I am grateful for...',
  tags: ['gratitude', 'morning'],
  mood: 'positive',
  photos: []
}

// Prompt pack structure
{
  id: 'gratitude-pack-v1',
  name: 'Daily Gratitude Prompts',
  description: 'Focus on thankfulness and appreciation',
  prompts: [
    'What are three things you are grateful for today?',
    'Who made your day better and how?',
    // ... more prompts
  ],
  category: 'gratitude'
}
```

---

## Version 1.4 - Social Media Integration (Sprint 4)
**Timeline**: 3-4 weeks

### Features
1. **Daily Affirmations**
   - Beautiful card designs with aesthetic backgrounds
   - Affirmation library organized by category:
     - Self-love
     - Motivation
     - Success
     - Relationships
     - Spiritual
   - Custom affirmation creation
   - Share to social media (formatted images)
   - Daily affirmation notifications
   - Affirmation history/favorites

2. **Bible Verses & Spiritual Content**
   - Daily Bible verse feature
   - Beautiful card designs
   - Verse of the day
   - Searchable verse library
   - Share formatted verse cards
   - Personal verse collections
   - Reflection notes on verses

3. **Shareable Content System**
   - Generate Instagram-ready images (1080x1080)
   - Generate Story-format images (1080x1920)
   - Watermark with app branding (optional)
   - Custom design templates
   - Color scheme customization
   - Font selection

**Technical Implementation**:
- Use HTML Canvas API for image generation
- Pre-designed templates with background images
- Export as PNG/JPG for sharing
- Integration with Web Share API

**Design Considerations**:
- 5-10 aesthetic background templates per category
- Typography focused on readability
- Brand colors: earth tones matching OSRS theme
- Optional user-uploaded backgrounds

---

## Version 1.5 - Enhanced Workout System (Sprint 5)
**Timeline**: 3-4 weeks

### Features
1. **Exercise Video Library**
   - Short instructional videos (30-60 seconds)
   - Organized by:
     - Muscle group
     - Equipment needed
     - Difficulty level
   - Video playback within app
   - Favorite exercises
   - Create custom workout routines

2. **Workout Logging**
   - Log sets, reps, weight for each exercise
   - Track personal records (PRs)
   - Progression graphs and charts
   - Workout history calendar
   - Rest timer between sets
   - Pre-built workout templates

3. **Workout Stats Dashboard**
   - Total workouts completed
   - Favorite exercises
   - PRs by exercise
   - Volume tracking (total weight lifted)
   - Body measurements tracking
   - Progress photos

**Technical Implementation**:
```javascript
// Workout log structure
{
  id: 'workout_2024_01_23',
  date: '2024-01-23',
  exercises: [
    {
      exerciseId: 'squat',
      sets: [
        { reps: 10, weight: 135, notes: 'Felt strong' },
        { reps: 8, weight: 155 },
        { reps: 6, weight: 175 }
      ]
    }
  ],
  duration: 45, // minutes
  notes: 'Great leg day!'
}

// Exercise video structure
{
  id: 'squat',
  name: 'Barbell Back Squat',
  videoUrl: 'videos/squat.mp4',
  muscleGroups: ['legs', 'glutes', 'core'],
  equipment: ['barbell', 'rack'],
  difficulty: 'intermediate',
  instructions: '1. Place bar on upper back...'
}
```

**Video Source Options**:
1. Self-hosted short clips
2. YouTube embed integration
3. Link to external resources
4. Partner with fitness content creators

---

## Version 1.6 - External Integrations (Sprint 6)
**Timeline**: 4-5 weeks

### Features
1. **Pinterest Integration**
   - OAuth authentication
   - "Monthly Craft" feature:
     - Browse trending crafts
     - Filter by category (knitting, sewing, home decor, etc.)
     - Save pins to "Craft Ideas" board
     - Track crafts you want to try
     - Mark crafts as completed
   - Inspiration board within app

2. **Goodreads Integration**
   - OAuth authentication
   - Sync reading goals
   - Current reading status
   - Book progress tracking
   - Reading challenge progress
   - Book recommendations
   - Reading statistics

**Technical Implementation**:
- Pinterest API for fetching trending pins
- Goodreads API (or web scraping if API unavailable)
- OAuth 2.0 flow for authentication
- Periodic sync of reading data
- Fallback to manual entry if APIs unavailable

**API Considerations**:
- Pinterest API: Check current availability and terms
- Goodreads API: Deprecated, may need alternative solution (StoryGraph, LibraryThing)
- Consider web scraping with user consent
- Build manual backup systems

---

## Version 2.0 - Social & Community Features (Future)
**Timeline**: 3-6 months

### Potential Features
1. **Friend System**
   - Add friends
   - View friend progress
   - Friendly competition/leaderboards
   - Send encouragement

2. **Challenge Sharing**
   - Share custom challenges
   - Browse community challenges
   - Challenge templates marketplace

3. **Achievement Sharing**
   - Share milestones on social media
   - Monthly recaps
   - Year in review feature

4. **Group Challenges**
   - Team-based challenges
   - Family challenges
   - Accountability partners

---

## Technical Debt & Infrastructure

### Ongoing Improvements
- **Performance Optimization**
  - Lazy loading for images
  - Efficient localStorage usage
  - Optimize rendering for large datasets
  
- **Data Management**
  - Export/import functionality
  - Cloud backup integration (optional)
  - Data migration tools
  
- **Code Quality**
  - Modularize JavaScript code
  - Implement TypeScript (consideration)
  - Unit testing framework
  - End-to-end testing
  
- **Accessibility**
  - ARIA labels
  - Keyboard navigation
  - Screen reader optimization
  - Color contrast improvements
  
- **PWA Enhancements**
  - Offline mode improvements
  - Background sync
  - Push notifications
  - Install prompts

---

## Feature Prioritization Matrix

### High Priority (Next 3 Months)
1. ✅ UI fixes and polish
2. Personalization & onboarding
3. Daily journal system

### Medium Priority (3-6 Months)
4. Social media integration
5. Enhanced workout system
6. External integrations

### Low Priority (6+ Months)
7. Social & community features
8. Advanced analytics
9. Gamification enhancements

---

## Design System Considerations

### Visual Identity
- **Color Palette**: OSRS-inspired earth tones
- **Typography**: Clear, readable fonts
- **Imagery**: Aesthetic, lifestyle-focused
- **Iconography**: Consistent emoji + custom icons

### User Experience Principles
1. **Simplicity**: One-tap actions wherever possible
2. **Delight**: Celebrate wins with animations
3. **Clarity**: Clear progress indicators
4. **Flexibility**: Customizable to user's life
5. **Motivation**: Positive reinforcement, not guilt

---

## Marketing & Launch Strategy (Future Consideration)

### App Store Presence
- Optimized app store listing
- Screenshots showcasing features
- Video demo
- User testimonials

### Content Marketing
- Blog about gamification
- Social media presence
- User success stories
- Feature tutorials

### Monetization Options (Future)
- Premium features
- Prompt pack marketplace
- Custom themes
- Ad-free experience
- Workout video library subscriptions

---

## Notes & Ideas Parking Lot

### Additional Feature Ideas
- Habit streak protection/freeze
- Monthly challenge calendar view
- Seasonal challenges
- Weather-based quest suggestions
- Location-based achievements
- Voice journal entries
- Mood tracking integration
- Sleep tracking integration
- Nutrition tracking (simple)
- Financial goals tracking
- Learning/course progress tracking
- Pet care tracking
- Plant care tracking
- Medication reminders
- Water intake tracking

### Integration Wishlist
- Spotify (workout playlists)
- Apple Health / Google Fit
- Calendar apps (auto-schedule quests)
- Recipe apps (for culinary path)
- Fitness trackers
- Meditation apps (for soul work path)

---

## Development Principles

1. **Mobile-First**: Design for phone usage primarily
2. **Progressive Enhancement**: Core features work offline
3. **Data Privacy**: User data stays local by default
4. **Accessibility**: Usable by everyone
5. **Performance**: Fast and responsive
6. **Maintainability**: Clean, documented code

---

Last Updated: January 2026
