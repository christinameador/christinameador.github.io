# Life RPG Data Model Specification

## Overview

This document defines the complete data model for Life RPG, a gamification app inspired by Old School RuneScape. The model supports:

- **Quests**: Atomic units of activity that award XP
- **Paths**: Staged progressions toward major life goals
- **Challenges**: Recurring quest sets with streak tracking
- **Achievements**: Meta-rewards triggered by various conditions
- **Skills**: XP buckets with OSRS-style leveling

---

## Quest

The atomic unit. Everything flows from completing quests.

```javascript
{
  id: string,              // Unique identifier (e.g., 'run', 'biz_research', '75h_workout1')
  name: string,            // Display name
  description?: string,    // Optional longer description
  
  frequency: 'daily' | 'weekly' | 'monthly' | 'as-needed' | 'one-time',
  
  // XP awards - supports multiple skills per quest
  rewards: [
    { skill: string, xp: number }
  ],
  
  // If set, quest only appears when this challenge is active
  challengeId?: string,
  
  custom: boolean,         // User-created vs. system default
  active: boolean          // Can be "retired" without deleting
}
```

### Frequency Definitions

| Frequency | Reset | Example |
|-----------|-------|---------|
| `daily` | Every day at midnight | Go for a run, Daily dev work |
| `weekly` | Every Monday at midnight | Date night, Meal prep |
| `monthly` | First of each month | Master a new recipe |
| `as-needed` | Never (always available) | Home repair, Try new fitness class |
| `one-time` | Never (done forever once completed) | Launch website, First 5K |

### Challenge-Scoped Quests

When `challengeId` is set:
- Quest only appears in quest list when that challenge is active
- Quest visually resets based on challenge interval (not its own frequency)
- When challenge ends/is deleted, quest is hidden (not deleted)

---

## Path

Staged progression toward a major goal. Quests must be completed in stage order.

```javascript
{
  id: string,              // e.g., 'entrepreneurship', 'culinary-master'
  name: string,            // e.g., 'Entrepreneur Path'
  description: string,
  icon: string,            // Emoji
  
  stages: [
    {
      id: string,          // e.g., 'foundation', 'build', 'launch'
      name: string,
      description?: string,
      questIds: string[],  // Quests required to complete this stage
      satisfiedQuests: [], // Quest IDs that have been completed (persists)
      completed: boolean,  // Computed: all questIds in satisfiedQuests?
      completedDate?: string  // ISO date when stage was completed
    }
  ],
  
  // Reward for completing the entire path
  completionReward?: {
    achievementId?: string,  // Triggers this achievement
    merit?: string,          // Badge/title earned
    description: string      // Celebratory message
  },
  
  completed: boolean,
  completedDate?: string
}
```

### Path Rules

1. **Stage unlocking**: Stage N+1 unlocks when Stage N is completed
2. **Quest satisfaction**: Completing a quest once marks it as "satisfied" in the path (permanent)
3. **Repeatable quests**: Can be repeated for XP, but path progress doesn't change
4. **Multi-path quests**: A quest can appear in multiple paths
5. **Order within stage**: Doesn't matter - complete them in any order

### Example: Entrepreneur Path

```javascript
{
  id: 'entrepreneurship',
  name: 'Entrepreneur Path',
  description: 'Launch Moonshot Dev and make your first sale',
  icon: '🚀',
  stages: [
    {
      id: 'foundation',
      name: 'Foundation',
      description: 'Research and brand development',
      questIds: ['biz_research', 'biz_design', 'biz_brand'],
      satisfiedQuests: ['biz_research'],  // One done so far
      completed: false
    },
    {
      id: 'build',
      name: 'Build',
      description: 'Create the product',
      questIds: ['biz_website_dev', 'biz_plugin_plan', 'biz_plugin_dev'],
      satisfiedQuests: [],
      completed: false
    },
    {
      id: 'polish',
      name: 'Polish',
      description: 'Refine and document',
      questIds: ['biz_plugin_polish', 'biz_docs', 'biz_marketing_plan'],
      satisfiedQuests: [],
      completed: false
    },
    {
      id: 'launch',
      name: 'Launch',
      description: 'Go live!',
      questIds: ['biz_social', 'biz_launch_prep'],
      satisfiedQuests: [],
      completed: false
    }
  ],
  completionReward: {
    achievementId: 'first_sale',
    merit: 'Entrepreneur',
    description: 'You built and launched your first product!'
  },
  completed: false
}
```

---

## Challenge

A recurring set of quests that must ALL be completed within each interval. Tracks streaks.

```javascript
{
  id: string,
  name: string,
  description: string,
  icon: string,
  
  questIds: string[],      // ALL must be completed each period
  
  interval: {
    value: number,         // e.g., 1, 2, 4
    unit: 'days' | 'weeks' | 'months'
  },
  
  // Current tracking period
  currentPeriod: {
    startDate: string,     // ISO date
    endDate: string,       // ISO date
    completedQuests: [
      { questId: string, completedDate: string }
    ]
  },
  
  currentStreak: number,   // Consecutive successful periods
  longestStreak: number,
  
  // Historical record
  history: [
    {
      startDate: string,
      endDate: string,
      completedQuests: [{ questId: string, completedDate: string }],
      success: boolean     // All quests completed in time?
    }
  ],
  
  active: boolean
}
```

### Challenge Flow

1. **Quest completion**: When any quest is completed, system checks all active challenges
2. **Auto-attribution**: If quest is in a challenge's `questIds`, auto-add to `currentPeriod.completedQuests`
3. **Period end**: When current date > endDate:
   - If all quests completed → `success: true`, streak++, archive to history, start new period
   - If incomplete → `success: false`, streak = 0, archive to history, start new period
4. **UI display**: Challenge quests show greyed out if completed this period

### Example: 75 Hard

```javascript
{
  id: '75-hard',
  name: '75 Hard Challenge',
  description: 'Complete 7 daily tasks for 75 consecutive days',
  icon: '⚔️',
  questIds: [
    '75h_workout1', '75h_workout2', '75h_water', '75h_read',
    '75h_photo', '75h_diet', '75h_alcohol'
  ],
  interval: { value: 1, unit: 'days' },
  currentPeriod: {
    startDate: '2025-01-21',
    endDate: '2025-01-21',
    completedQuests: [
      { questId: '75h_water', completedDate: '2025-01-21T08:30:00Z' }
    ]
  },
  currentStreak: 14,
  longestStreak: 14,
  history: [...],
  active: true
}
```

### Example: Bi-Weekly Movie Date

```javascript
{
  id: 'movie-date',
  name: 'Movie Date with Scott',
  description: 'Watch a movie together every two weeks',
  icon: '🎬',
  questIds: ['date_night'],
  interval: { value: 2, unit: 'weeks' },
  currentPeriod: {
    startDate: '2025-01-13',
    endDate: '2025-01-26',
    completedQuests: []
  },
  currentStreak: 5,
  longestStreak: 5,
  history: [...],
  active: true
}
```

---

## Achievement

Meta-rewards triggered by various game conditions.

```javascript
{
  id: string,
  name: string,
  description: string,
  tier: 'beginner' | 'medium' | 'hard' | 'elite' | 'grandmaster',
  
  // Trigger condition - exactly ONE of these types
  trigger: {
    type: 'skill-level',
    skill: string,         // Skill ID or 'any'
    level: number
  } | {
    type: 'total-level',
    level: number
  } | {
    type: 'quest-count',
    questId: string,
    count: number
  } | {
    type: 'quest-sequence',
    questIds: string[],
    sameDay: boolean       // Must all be completed same day?
  } | {
    type: 'path-stage',
    pathId: string,
    stageId: string
  } | {
    type: 'path-complete',
    pathId: string
  } | {
    type: 'challenge-streak',
    challengeId: string,
    streak: number
  } | {
    type: 'challenge-complete',
    challengeId: string,
    totalPeriods: number   // e.g., 75 for 75 Hard
  } | {
    type: 'manual'         // Manually unlocked
  },
  
  // Optional reward
  reward?: {
    merit?: string,        // Title/badge
    bonusXp?: [{ skill: string, xp: number }]
  },
  
  completed: boolean,
  completedDate?: string
}
```

### Achievement Examples

```javascript
// Skill-based
{
  id: 'level_50_any',
  name: 'Expert Adventurer',
  description: 'Reach level 50 in any skill',
  tier: 'hard',
  trigger: { type: 'skill-level', skill: 'any', level: 50 },
  completed: false
}

// Path completion
{
  id: 'entrepreneur_complete',
  name: 'Entrepreneur',
  description: 'Complete the Entrepreneur Path and make your first sale',
  tier: 'grandmaster',
  trigger: { type: 'path-complete', pathId: 'entrepreneurship' },
  reward: { merit: 'Entrepreneur' },
  completed: false
}

// Challenge streak
{
  id: 'movie_streak_10',
  name: 'Film Buffs',
  description: '10 consecutive movie dates',
  tier: 'medium',
  trigger: { type: 'challenge-streak', challengeId: 'movie-date', streak: 10 },
  completed: false
}

// Quest sequence (same day)
{
  id: 'fitness_trifecta',
  name: 'Fitness Trifecta',
  description: 'Complete running, strength training, and yoga in one day',
  tier: 'beginner',
  trigger: { type: 'quest-sequence', questIds: ['run', 'workout', 'yoga'], sameDay: true },
  completed: false
}

// 75 Hard completion
{
  id: '75_hard_complete',
  name: '75 Hard Survivor',
  description: 'Complete the full 75 Hard challenge',
  tier: 'hard',
  trigger: { type: 'challenge-complete', challengeId: '75-hard', totalPeriods: 75 },
  completed: false
}
```

---

## Skill

XP bucket with OSRS-style leveling.

```javascript
{
  id: string,              // e.g., 'strength', 'intelligence'
  name: string,
  icon: string,
  
  xp: number,              // Total XP earned
  
  // Streak = consecutive days where this skill gained XP
  currentStreak: number,
  longestStreak: number,
  lastAwardedDate?: string  // ISO date (date only, not time)
}
```

### Default Skills

| ID | Name | Icon |
|----|------|------|
| strength | Strength | 💪 |
| creativity | Creativity | 🎨 |
| intelligence | Intelligence | 🧠 |
| charisma | Charisma | 💬 |
| wisdom | Wisdom | 🧘 |
| constitution | Constitution | 📋 |

### XP Formula (OSRS)

```javascript
// XP required to reach a level
getXPForLevel(level) {
  let points = 0;
  for (let i = 1; i < level; i++) {
    points += Math.floor(i + 300 * Math.pow(2, i / 7));
  }
  return Math.floor(points / 4);
}

// Level from XP
getLevelFromXP(xp) {
  let level = 1;
  while (getXPForLevel(level + 1) <= xp && level < 99) {
    level++;
  }
  return level;
}
```

---

## Completion Log

Tracks all quest completions with timestamps.

```javascript
{
  // Full history
  completions: [
    {
      questId: string,
      timestamp: string,   // ISO datetime
      xpAwarded: [{ skill: string, xp: number }]
    }
  ],
  
  // Quick lookup caches (rebuilt on app load and date change)
  completedToday: string[],      // Quest IDs
  completedThisWeek: string[],   // Quest IDs  
  completedThisMonth: string[],  // Quest IDs
  completedEver: string[]        // One-time quests that are done
}
```

### Completion Check Logic

```javascript
canComplete(quest) {
  switch (quest.frequency) {
    case 'daily':
      return !completedToday.includes(quest.id);
    case 'weekly':
      return !completedThisWeek.includes(quest.id);
    case 'monthly':
      return !completedThisMonth.includes(quest.id);
    case 'one-time':
      return !completedEver.includes(quest.id);
    case 'as-needed':
      return true;  // Always available
  }
}
```

---

## Complete Data Structure

```javascript
{
  // Core entities
  skills: {
    strength: { xp, currentStreak, longestStreak, lastAwardedDate },
    creativity: { ... },
    intelligence: { ... },
    charisma: { ... },
    wisdom: { ... },
    constitution: { ... }
  },
  
  quests: [ Quest, Quest, ... ],
  
  paths: [ Path, Path, ... ],
  
  challenges: [ Challenge, Challenge, ... ],
  
  achievements: [ Achievement, Achievement, ... ],
  
  // Completion tracking
  completionLog: {
    completions: [ ... ],
    completedToday: [],
    completedThisWeek: [],
    completedThisMonth: [],
    completedEver: []
  },
  
  // Other features
  photos: [ ... ],
  collectionLog: [ ... ],
  
  // Meta
  lastActiveDate: string,
  version: number  // For future migrations
}
```

---

## Quest Completion Flow

```
User taps "Complete Quest"
         │
         ▼
┌─────────────────────────┐
│ 1. Award XP to Skills   │
│    - For each reward    │
│    - Update skill XP    │
│    - Update streaks     │
│    - Check level up     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 2. Log Completion       │
│    - Add to completions │
│    - Update caches      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 3. Update Paths         │
│    - Find paths with    │
│      this quest         │
│    - Mark satisfied     │
│    - Check stage done   │
│    - Unlock next stage  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 4. Update Challenges    │
│    - Find active        │
│      challenges with    │
│      this quest         │
│    - Add to current     │
│      period             │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 5. Check Achievements   │
│    - Skill levels       │
│    - Quest counts       │
│    - Quest sequences    │
│    - Path progress      │
│    - Challenge streaks  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ 6. Show Notifications   │
│    - XP gained          │
│    - Level up?          │
│    - Stage complete?    │
│    - Achievement?       │
└─────────────────────────┘
```

---

## Migration Notes

When migrating from the old data structure:

1. **Quests**: Convert `skill` + `xp` to `rewards: [{ skill, xp }]`
2. **Tags → Paths**: Convert tag-based filtering to proper Path entities
3. **Challenges**: Restructure to new format with `currentPeriod`
4. **Completion tracking**: Build `completionLog` from existing `completedToday`
5. **Achievements**: Convert to new trigger-based format

Version the data structure to enable future migrations:
```javascript
{ version: 2, ... }
```
