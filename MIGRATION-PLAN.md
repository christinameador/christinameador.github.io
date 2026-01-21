# Life RPG Migration Plan

## Overview

This document outlines the step-by-step migration from the current data structure to the new model defined in `DATA-MODEL-SPEC.md`.

---

## Phase 1: Data Structure Updates

### 1.1 Quest Rewards Array

**Current:**
```javascript
{ id: 'run', skill: 'strength', xp: 50, ... }
```

**New:**
```javascript
{ id: 'run', rewards: [{ skill: 'strength', xp: 50 }], ... }
```

**Migration:**
```javascript
quest.rewards = quest.rewards || [{ skill: quest.skill, xp: quest.xp }];
delete quest.skill;
delete quest.xp;
```

### 1.2 Completion Log Structure

**Current:**
```javascript
{
  completedToday: [
    { questId, xp, skill, timestamp }
  ]
}
```

**New:**
```javascript
{
  completionLog: {
    completions: [
      { questId, timestamp, xpAwarded: [{ skill, xp }] }
    ],
    completedToday: ['questId1', 'questId2'],
    completedThisWeek: ['questId1'],
    completedThisMonth: ['questId1'],
    completedEver: ['one_time_quest_1']
  }
}
```

**Migration:**
- Convert existing `completedToday` array to new format
- Build cache arrays from completions

### 1.3 Paths as Real Entities

**Current:** Tags on quests, paths are just filters
```javascript
quest.tags = ['entrepreneurship', 'lifestyle-influencer']
```

**New:** Paths are separate entities with stages
```javascript
paths: [
  {
    id: 'entrepreneurship',
    stages: [
      { id: 'foundation', questIds: [...], satisfiedQuests: [] }
    ]
  }
]
```

**Migration:**
- Create Path entities from existing tag definitions
- Group quests into logical stages
- Keep `tags` on quests for backward compatibility during transition
- Build `satisfiedQuests` from completion history

### 1.4 Challenges Restructure

**Current:**
```javascript
challenges: [
  {
    type: '75hard',
    day: 14,
    checklist: [
      { id: '75h_workout1', text: 'First 45-minute workout', completed: false }
    ]
  }
]
```

**New:**
```javascript
challenges: [
  {
    id: '75-hard',
    questIds: ['75h_workout1', '75h_workout2', ...],
    interval: { value: 1, unit: 'days' },
    currentPeriod: { startDate, endDate, completedQuests: [] },
    currentStreak: 14,
    history: [...]
  }
]
// Plus separate quest entries:
quests: [
  { id: '75h_workout1', challengeId: '75-hard', frequency: 'daily', ... }
]
```

**Migration:**
- Convert checklist items to proper Quest entities
- Create new Challenge structure
- Preserve streak/day count in migration

### 1.5 Achievements Restructure

**Current:**
```javascript
achievements: {
  beginner: [
    { id: 'first_quest', name: '...', completed: false }
  ],
  medium: [...],
  hard: [...],
  elite: [...],
  grandmaster: [...]
}
```

**New:**
```javascript
achievements: [
  {
    id: 'first_quest',
    tier: 'beginner',
    trigger: { type: 'quest-count', questId: 'any', count: 1 },
    completed: false
  }
]
```

**Migration:**
- Flatten nested structure to array
- Add tier property
- Add trigger definitions
- Preserve completion status

---

## Phase 2: Default Data Definitions

### 2.1 Default Paths

```javascript
getDefaultPaths() {
  return [
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
          satisfiedQuests: [],
          completed: false
        },
        {
          id: 'build',
          name: 'Build',
          description: 'Create the website and first plugin',
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
          description: 'Go to market',
          questIds: ['biz_social', 'biz_launch_prep'],
          satisfiedQuests: [],
          completed: false
        }
      ],
      completionReward: {
        achievementId: 'entrepreneur_complete',
        merit: 'Entrepreneur',
        description: 'You launched Moonshot Dev!'
      },
      completed: false
    },
    {
      id: 'culinary-master',
      name: 'Culinary Master',
      icon: '🍳',
      // Define stages...
    },
    {
      id: 'artistic-visionary',
      name: 'Artistic Visionary',
      icon: '🎨',
      // Define stages...
    },
    {
      id: 'lifestyle-influencer',
      name: 'Lifestyle Influencer',
      icon: '📸',
      // Define stages...
    },
    {
      id: 'fitness-goddess',
      name: 'Fitness Goddess',
      icon: '💪',
      // Define stages...
    },
    {
      id: 'lover-girl',
      name: 'Lover Girl',
      icon: '💕',
      // Define stages...
    },
    {
      id: 'soul-work',
      name: 'Soul Work',
      icon: '🧘',
      // Define stages...
    }
  ];
}
```

### 2.2 Default Challenge Templates

```javascript
getChallengeTemplates() {
  return {
    '75-hard': {
      name: '75 Hard Challenge',
      description: 'Complete 7 daily tasks for 75 consecutive days',
      icon: '⚔️',
      interval: { value: 1, unit: 'days' },
      quests: [
        { id: '75h_workout1', name: 'First 45-min workout', rewards: [{ skill: 'strength', xp: 40 }] },
        { id: '75h_workout2', name: 'Second 45-min workout (outdoor)', rewards: [{ skill: 'strength', xp: 40 }, { skill: 'wisdom', xp: 10 }] },
        { id: '75h_water', name: 'Drink gallon of water', rewards: [{ skill: 'constitution', xp: 20 }] },
        { id: '75h_read', name: 'Read 10 pages nonfiction', rewards: [{ skill: 'intelligence', xp: 30 }] },
        { id: '75h_photo', name: 'Progress photo', rewards: [{ skill: 'constitution', xp: 10 }] },
        { id: '75h_diet', name: 'Follow diet (no cheat meals)', rewards: [{ skill: 'constitution', xp: 25 }] },
        { id: '75h_alcohol', name: 'No alcohol', rewards: [{ skill: 'wisdom', xp: 20 }] }
      ],
      completionAchievement: '75_hard_complete'
    },
    'movie-date': {
      name: 'Movie Date with Scott',
      description: 'Watch a movie together every two weeks',
      icon: '🎬',
      interval: { value: 2, unit: 'weeks' },
      questIds: ['date_night']  // Uses existing quest
    },
    'monthly-craft': {
      name: 'Monthly Craft Project',
      description: 'Complete one craft project per month',
      icon: '📌',
      interval: { value: 1, unit: 'months' },
      questIds: ['art_project']  // Uses existing quest
    }
  };
}
```

### 2.3 Default Achievements with Triggers

```javascript
getDefaultAchievements() {
  return [
    // Beginner
    { id: 'first_quest', name: 'First Quest', description: 'Complete your first quest', tier: 'beginner', trigger: { type: 'quest-count', questId: 'any', count: 1 } },
    { id: 'streak_3', name: 'Streak Starter', description: '3-day streak on any skill', tier: 'beginner', trigger: { type: 'skill-streak', skill: 'any', streak: 3 } },
    { id: 'level_5', name: 'Novice Adventurer', description: 'Reach level 5 in any skill', tier: 'beginner', trigger: { type: 'skill-level', skill: 'any', level: 5 } },
    
    // Medium
    { id: 'level_20', name: 'Skilled Adventurer', description: 'Reach level 20 in any skill', tier: 'medium', trigger: { type: 'skill-level', skill: 'any', level: 20 } },
    { id: 'streak_7', name: 'Dedicated', description: '7-day streak on any skill', tier: 'medium', trigger: { type: 'skill-streak', skill: 'any', streak: 7 } },
    { id: 'path_stage_1', name: 'Foundation Builder', description: 'Complete the first stage of any path', tier: 'medium', trigger: { type: 'path-stage', pathId: 'any', stageIndex: 0 } },
    
    // Hard
    { id: 'level_50', name: 'Expert Adventurer', description: 'Reach level 50 in any skill', tier: 'hard', trigger: { type: 'skill-level', skill: 'any', level: 50 } },
    { id: 'streak_30', name: 'Iron Will', description: '30-day streak on any skill', tier: 'hard', trigger: { type: 'skill-streak', skill: 'any', streak: 30 } },
    { id: '75_hard_complete', name: '75 Hard Survivor', description: 'Complete the full 75 Hard challenge', tier: 'hard', trigger: { type: 'challenge-complete', challengeId: '75-hard', totalPeriods: 75 } },
    
    // Elite
    { id: 'skill_cape', name: 'Skill Cape', description: 'Reach level 99 in any skill', tier: 'elite', trigger: { type: 'skill-level', skill: 'any', level: 99 } },
    { id: 'path_complete_any', name: 'Path Master', description: 'Complete any path', tier: 'elite', trigger: { type: 'path-complete', pathId: 'any' } },
    
    // Grandmaster
    { id: 'entrepreneur_complete', name: 'Entrepreneur', description: 'Complete the Entrepreneur Path', tier: 'grandmaster', trigger: { type: 'path-complete', pathId: 'entrepreneurship' }, reward: { merit: 'Entrepreneur' } },
    { id: 'all_99', name: 'Completionist', description: 'Reach level 99 in all skills', tier: 'grandmaster', trigger: { type: 'all-skills-level', level: 99 } }
  ];
}
```

---

## Phase 3: Core Logic Updates

### 3.1 Quest Completion Handler

```javascript
completeQuest(questId) {
  const quest = this.findQuest(questId);
  if (!quest || !this.canComplete(quest)) return;
  
  // 1. Award XP to all skills
  const levelUps = [];
  quest.rewards.forEach(reward => {
    const oldLevel = this.getLevelFromXP(this.data.skills[reward.skill].xp);
    this.data.skills[reward.skill].xp += reward.xp;
    const newLevel = this.getLevelFromXP(this.data.skills[reward.skill].xp);
    
    if (newLevel > oldLevel) {
      levelUps.push({ skill: reward.skill, level: newLevel });
    }
    
    // Update skill streak
    this.updateSkillStreak(reward.skill);
  });
  
  // 2. Log completion
  this.logCompletion(quest);
  
  // 3. Update paths
  this.updatePathProgress(questId);
  
  // 4. Update challenges
  this.updateChallengeProgress(questId);
  
  // 5. Check achievements
  const newAchievements = this.checkAchievements();
  
  // 6. Save and render
  this.saveData();
  this.render();
  
  // 7. Show notifications
  this.showCompletionNotifications(quest, levelUps, newAchievements);
}
```

### 3.2 Path Progress Updater

```javascript
updatePathProgress(questId) {
  this.data.paths.forEach(path => {
    path.stages.forEach((stage, index) => {
      // Only check unlocked stages
      if (index > 0 && !path.stages[index - 1].completed) return;
      
      // If quest is in this stage and not already satisfied
      if (stage.questIds.includes(questId) && !stage.satisfiedQuests.includes(questId)) {
        stage.satisfiedQuests.push(questId);
        
        // Check if stage is now complete
        if (stage.questIds.every(qId => stage.satisfiedQuests.includes(qId))) {
          stage.completed = true;
          stage.completedDate = new Date().toISOString();
          
          // Check if path is now complete
          if (path.stages.every(s => s.completed)) {
            path.completed = true;
            path.completedDate = new Date().toISOString();
          }
        }
      }
    });
  });
}
```

### 3.3 Challenge Progress Updater

```javascript
updateChallengeProgress(questId) {
  const now = new Date();
  
  this.data.challenges.forEach(challenge => {
    if (!challenge.active) return;
    if (!challenge.questIds.includes(questId)) return;
    
    // Check if already completed this period
    const alreadyDone = challenge.currentPeriod.completedQuests
      .some(cq => cq.questId === questId);
    if (alreadyDone) return;
    
    // Add to current period
    challenge.currentPeriod.completedQuests.push({
      questId,
      completedDate: now.toISOString()
    });
  });
}
```

### 3.4 Daily/Period Reset Handler

```javascript
checkResets() {
  const now = new Date();
  const today = now.toDateString();
  
  // Daily reset for completion caches
  if (this.data.lastActiveDate !== today) {
    this.rebuildCompletionCaches();
    this.data.lastActiveDate = today;
  }
  
  // Challenge period checks
  this.data.challenges.forEach(challenge => {
    if (!challenge.active) return;
    
    const periodEnd = new Date(challenge.currentPeriod.endDate);
    if (now > periodEnd) {
      this.advanceChallengePeriod(challenge);
    }
  });
  
  this.saveData();
}

advanceChallengePeriod(challenge) {
  const allCompleted = challenge.questIds.every(qId =>
    challenge.currentPeriod.completedQuests.some(cq => cq.questId === qId)
  );
  
  // Archive current period
  challenge.history.push({
    ...challenge.currentPeriod,
    success: allCompleted
  });
  
  // Update streak
  if (allCompleted) {
    challenge.currentStreak++;
    challenge.longestStreak = Math.max(challenge.longestStreak, challenge.currentStreak);
  } else {
    challenge.currentStreak = 0;
  }
  
  // Start new period
  challenge.currentPeriod = this.createNewPeriod(challenge.interval);
}
```

### 3.5 Achievement Checker

```javascript
checkAchievements() {
  const newlyUnlocked = [];
  
  this.data.achievements.forEach(achievement => {
    if (achievement.completed) return;
    
    if (this.checkTrigger(achievement.trigger)) {
      achievement.completed = true;
      achievement.completedDate = new Date().toISOString();
      newlyUnlocked.push(achievement);
      
      // Apply rewards
      if (achievement.reward?.bonusXp) {
        achievement.reward.bonusXp.forEach(bonus => {
          this.data.skills[bonus.skill].xp += bonus.xp;
        });
      }
    }
  });
  
  return newlyUnlocked;
}

checkTrigger(trigger) {
  switch (trigger.type) {
    case 'skill-level':
      return this.checkSkillLevel(trigger.skill, trigger.level);
    case 'quest-count':
      return this.checkQuestCount(trigger.questId, trigger.count);
    case 'path-complete':
      return this.checkPathComplete(trigger.pathId);
    case 'challenge-streak':
      return this.checkChallengeStreak(trigger.challengeId, trigger.streak);
    // ... etc
  }
}
```

---

## Phase 4: UI Updates

### 4.1 Quest List Filtering

```javascript
getVisibleQuests() {
  return this.data.quests.filter(quest => {
    // Hide inactive quests
    if (!quest.active) return false;
    
    // Hide challenge-scoped quests if challenge not active
    if (quest.challengeId) {
      const challenge = this.data.challenges.find(c => c.id === quest.challengeId);
      if (!challenge || !challenge.active) return false;
    }
    
    return true;
  });
}
```

### 4.2 Quest Card Display

```javascript
createQuestCard(quest) {
  const completed = this.isQuestCompleted(quest);
  const inChallenge = quest.challengeId ? this.getChallengeForQuest(quest.id) : null;
  const inPaths = this.getPathsForQuest(quest.id);
  
  // Show path indicators (greyed if satisfied in that path)
  // Show challenge indicator if part of active challenge
  // Show completion state based on frequency + challenge period
}
```

### 4.3 Paths View

```javascript
renderPaths() {
  this.data.paths.forEach(path => {
    // Show path card with:
    // - Overall progress (stages completed / total)
    // - Current stage highlighted
    // - Quests in current stage with satisfied/unsatisfied state
    // - Locked stages shown but dimmed
  });
}
```

### 4.4 Challenges View

```javascript
renderChallenges() {
  this.data.challenges.filter(c => c.active).forEach(challenge => {
    // Show challenge card with:
    // - Current streak prominently
    // - Period progress (X/Y quests this period)
    // - Quest list with completed greyed out
    // - Time remaining in period
    // - "Due soon" / "Overdue" warnings
  });
}
```

---

## Phase 5: Migration Function

```javascript
migrateData() {
  const version = this.data.version || 1;
  
  if (version < 2) {
    this.migrateToV2();
  }
  
  this.data.version = 2;
  this.saveData();
}

migrateToV2() {
  // 1. Convert quest rewards
  this.data.quests = this.data.quests.map(quest => {
    if (!quest.rewards) {
      quest.rewards = [{ skill: quest.skill, xp: quest.xp }];
      delete quest.skill;
      delete quest.xp;
    }
    quest.active = quest.active ?? true;
    return quest;
  });
  
  // 2. Build completion log from completedToday
  if (!this.data.completionLog) {
    this.data.completionLog = {
      completions: this.data.completedToday?.map(c => ({
        questId: c.questId,
        timestamp: c.timestamp,
        xpAwarded: [{ skill: c.skill, xp: c.xp }]
      })) || [],
      completedToday: [],
      completedThisWeek: [],
      completedThisMonth: [],
      completedEver: []
    };
    this.rebuildCompletionCaches();
    delete this.data.completedToday;
  }
  
  // 3. Create paths from tag definitions
  if (!this.data.paths) {
    this.data.paths = this.getDefaultPaths();
    // Populate satisfiedQuests from completion history
    this.rebuildPathProgress();
  }
  
  // 4. Convert challenges to new format
  this.data.challenges = this.data.challenges?.map(challenge => {
    if (challenge.type === '75hard' && challenge.checklist) {
      return this.convert75HardChallenge(challenge);
    }
    // Handle other challenge types...
    return challenge;
  }) || [];
  
  // 5. Convert achievements to new format
  if (Array.isArray(this.data.achievements?.beginner)) {
    this.data.achievements = this.convertAchievementsToFlat();
  }
}
```

---

## Testing Checklist

- [ ] Fresh install works with new default data
- [ ] Existing data migrates correctly
- [ ] Quest completion awards XP to multiple skills
- [ ] Path progress tracks correctly across stages
- [ ] Challenge quests auto-attribute to challenges
- [ ] Challenge streaks increment/reset correctly
- [ ] Achievements trigger on all condition types
- [ ] UI filters work for challenge-scoped quests
- [ ] Daily/weekly/monthly resets work
- [ ] Export/import preserves new data structure

---

## Rollback Plan

Keep backup of old data structure in localStorage under different key:
```javascript
localStorage.setItem('lifeRPGData_backup_v1', JSON.stringify(oldData));
```

If issues arise, can restore from backup.
