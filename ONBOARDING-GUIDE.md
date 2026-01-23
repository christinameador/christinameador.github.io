# Onboarding Implementation Guide

## Overview
This guide outlines how to implement the personalized onboarding flow for the Life RPG app. This is a priority feature for Version 1.2.

## User Flow

### Step 1: Welcome Screen
- Display when no saved data exists (first-time users)
- Show app logo/branding
- Brief explanation: "Welcome to Life RPG - Your life, gamified!"
- Button: "Get Started"

### Step 2: Character Creation
**Fields to collect:**
1. **Character Name** (required)
   - Text input
   - Default: empty
   - Example: "Christina", "Alex", "Jordan"
   - Will be used as "[Name]'s Adventure"

2. **Gender** (optional)
   - Buttons/Radio: Male / Female / Non-binary / Prefer not to say
   - Affects default quest language

3. **Relationship Status** (optional)
   - Buttons/Radio: Single / Married / In a relationship / It's complicated
   - If "Married" or "In a relationship":
     - Sub-field: Partner Name (text input)
     - Used to personalize relationship quests

4. **Family Status** (optional)
   - Checkbox: Has children
   - Affects default quests (adds child-related activities)

5. **Work/Life Stage** (optional)
   - Buttons/Radio: Working / Student / Stay-at-home / Retired / Other
   - Affects available time-based quests

### Step 3: Choose Starting Challenge
**Display challenge packs:**
- Show 3-5 recommended starting challenges
- Each card shows:
  - Icon and name
  - Brief description
  - Number of quests
  - Time commitment
  - Preview first 3 quests

**Recommended starters:**
1. **Wellness Basics** (Daily habit building)
2. **75 Hard** (For the ambitious)
3. **Monthly Path Challenge** (Pick one life path to focus on)
4. **Quick Start** (3 simple daily quests)

**Can skip:** "I'll set up my own quests" button

### Step 4: Preview & Confirm
- Show:
  - Character name: "[Name]'s Adventure"
  - Selected challenge with all quests listed
  - Quick stats: "X quests, Y skills"
- Button: "Start My Adventure!"

### Step 5: Welcome Notification
- Animated "Level 1 Achieved!" modal
- Brief tutorial tooltips:
  - "Complete quests to earn XP"
  - "Level up skills"
  - "Track progress in Paths"
  - "Collection Log captures memories"
- Button: "Let's Go!"

---

## Technical Implementation

### 1. HTML Structure

```html
<!-- Add to index.html before app-container -->
<div id="onboarding-overlay" class="onboarding-overlay">
    <div class="onboarding-container">
        <!-- Step 1: Welcome -->
        <div class="onboarding-step" data-step="1">
            <div class="onboarding-logo">🎮</div>
            <h1>Welcome to Life RPG</h1>
            <p>Transform your daily goals into an epic adventure</p>
            <button class="primary-btn" onclick="app.nextOnboardingStep()">Get Started</button>
        </div>

        <!-- Step 2: Character Creation -->
        <div class="onboarding-step" data-step="2" style="display: none;">
            <h2>Create Your Character</h2>
            
            <div class="form-group">
                <label for="onboarding-name">Character Name *</label>
                <input type="text" id="onboarding-name" placeholder="Enter your name" required>
            </div>

            <div class="form-group">
                <label>Gender (optional)</label>
                <div class="button-group">
                    <button class="select-btn" data-value="male">Male</button>
                    <button class="select-btn" data-value="female">Female</button>
                    <button class="select-btn" data-value="non-binary">Non-binary</button>
                    <button class="select-btn" data-value="other">Other</button>
                </div>
            </div>

            <div class="form-group">
                <label>Relationship Status (optional)</label>
                <div class="button-group">
                    <button class="select-btn" data-value="single">Single</button>
                    <button class="select-btn" data-value="relationship">In a Relationship</button>
                    <button class="select-btn" data-value="married">Married</button>
                </div>
                <input type="text" id="onboarding-partner-name" 
                       placeholder="Partner's name (optional)" 
                       style="display: none; margin-top: 0.5rem;">
            </div>

            <div class="form-group">
                <label>Life Stage (optional)</label>
                <div class="button-group">
                    <button class="select-btn" data-value="working">Working</button>
                    <button class="select-btn" data-value="student">Student</button>
                    <button class="select-btn" data-value="stay-at-home">Stay at Home</button>
                    <button class="select-btn" data-value="retired">Retired</button>
                </div>
            </div>

            <div class="form-group">
                <label class="checkbox-label">
                    <input type="checkbox" id="onboarding-has-children">
                    <span>I have children</span>
                </label>
            </div>

            <div class="onboarding-actions">
                <button class="secondary-btn" onclick="app.prevOnboardingStep()">Back</button>
                <button class="primary-btn" onclick="app.nextOnboardingStep()">Continue</button>
            </div>
        </div>

        <!-- Step 3: Choose Challenge -->
        <div class="onboarding-step" data-step="3" style="display: none;">
            <h2>Choose Your Starting Challenge</h2>
            <p class="step-subtitle">Select a challenge pack to begin your journey</p>
            
            <div class="challenge-pack-grid" id="onboarding-challenges">
                <!-- Populated by JavaScript -->
            </div>

            <div class="onboarding-actions">
                <button class="secondary-btn" onclick="app.prevOnboardingStep()">Back</button>
                <button class="tertiary-btn" onclick="app.skipChallenge()">Skip - Set up my own</button>
            </div>
        </div>

        <!-- Step 4: Confirm -->
        <div class="onboarding-step" data-step="4" style="display: none;">
            <h2>Ready to Begin?</h2>
            
            <div class="onboarding-summary">
                <div class="summary-item">
                    <strong>Your Adventure:</strong>
                    <span id="onboarding-summary-name">Christina's Adventure</span>
                </div>
                <div class="summary-item">
                    <strong>Starting Challenge:</strong>
                    <span id="onboarding-summary-challenge">None selected</span>
                </div>
                <div id="onboarding-summary-quests">
                    <!-- Quest list -->
                </div>
            </div>

            <div class="onboarding-actions">
                <button class="secondary-btn" onclick="app.prevOnboardingStep()">Back</button>
                <button class="primary-btn large" onclick="app.completeOnboarding()">
                    🎮 Start My Adventure!
                </button>
            </div>
        </div>
    </div>
</div>
```

### 2. CSS Styles

```css
/* Add to styles.css */

.onboarding-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--osrs-bg);
    z-index: 3000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
}

.onboarding-overlay.hidden {
    display: none;
}

.onboarding-container {
    background: var(--osrs-brown);
    border: 4px solid var(--osrs-gold);
    border-radius: 12px;
    padding: 2rem;
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
}

.onboarding-logo {
    font-size: 4rem;
    text-align: center;
    margin-bottom: 1rem;
}

.onboarding-step h1,
.onboarding-step h2 {
    color: var(--osrs-gold);
    text-align: center;
    margin-bottom: 1rem;
}

.step-subtitle {
    text-align: center;
    color: var(--osrs-tan);
    opacity: 0.8;
    margin-bottom: 2rem;
}

.button-group {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 0.5rem;
}

.select-btn {
    background: var(--osrs-dark);
    border: 2px solid var(--osrs-border);
    color: var(--osrs-tan);
    padding: 0.75rem;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
}

.select-btn:hover {
    border-color: var(--osrs-gold);
}

.select-btn.selected {
    background: var(--osrs-tan);
    color: var(--osrs-dark);
    border-color: var(--osrs-gold);
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--osrs-tan);
    cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
    width: 20px;
    height: 20px;
}

.onboarding-actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
}

.onboarding-actions button {
    flex: 1;
}

.challenge-pack-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
}

.challenge-pack-card {
    background: var(--osrs-dark);
    border: 3px solid var(--osrs-border);
    border-radius: 8px;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.2s;
}

.challenge-pack-card:hover {
    border-color: var(--osrs-gold);
    transform: translateY(-2px);
}

.challenge-pack-card.selected {
    border-color: var(--osrs-gold);
    background: rgba(255, 215, 0, 0.1);
}

.challenge-pack-icon {
    font-size: 2.5rem;
    text-align: center;
    margin-bottom: 0.5rem;
}

.challenge-pack-name {
    color: var(--osrs-gold);
    font-weight: bold;
    font-size: 1.2rem;
    text-align: center;
    margin-bottom: 0.5rem;
}

.challenge-pack-desc {
    color: var(--osrs-tan);
    font-size: 0.9rem;
    text-align: center;
    margin-bottom: 1rem;
}

.challenge-pack-stats {
    display: flex;
    justify-content: space-around;
    font-size: 0.85rem;
    color: var(--osrs-tan);
    opacity: 0.8;
}

.onboarding-summary {
    background: var(--osrs-dark);
    border: 2px solid var(--osrs-border);
    border-radius: 8px;
    padding: 1.5rem;
}

.summary-item {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--osrs-border);
    color: var(--osrs-tan);
}

.summary-item:last-child {
    border-bottom: none;
}

.primary-btn.large {
    font-size: 1.2rem;
    padding: 1rem 2rem;
}

.tertiary-btn {
    background: transparent;
    color: var(--osrs-tan);
    border: 2px solid var(--osrs-border);
    padding: 0.5rem 1rem;
    font-size: 1rem;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;
}

.tertiary-btn:hover {
    background: var(--osrs-dark);
}
```

### 3. JavaScript Functions

```javascript
// Add to app.js in the LifeRPG class

// Onboarding state
this.onboardingData = {
    currentStep: 1,
    characterName: '',
    gender: null,
    relationshipStatus: null,
    partnerName: '',
    lifeStage: null,
    hasChildren: false,
    selectedChallenge: null
};

checkFirstTime() {
    const hasData = localStorage.getItem('lifeRPGData');
    if (!hasData) {
        this.showOnboarding();
    }
}

showOnboarding() {
    const overlay = document.getElementById('onboarding-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        this.renderOnboardingStep(1);
    }
}

hideOnboarding() {
    const overlay = document.getElementById('onboarding-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

nextOnboardingStep() {
    // Validate current step
    if (this.onboardingData.currentStep === 2) {
        const nameInput = document.getElementById('onboarding-name');
        if (!nameInput || !nameInput.value.trim()) {
            alert('Please enter your character name');
            return;
        }
        this.onboardingData.characterName = nameInput.value.trim();
    }

    this.onboardingData.currentStep++;
    this.renderOnboardingStep(this.onboardingData.currentStep);
}

prevOnboardingStep() {
    this.onboardingData.currentStep--;
    this.renderOnboardingStep(this.onboardingData.currentStep);
}

renderOnboardingStep(step) {
    // Hide all steps
    document.querySelectorAll('.onboarding-step').forEach(el => {
        el.style.display = 'none';
    });

    // Show current step
    const currentStep = document.querySelector(`.onboarding-step[data-step="${step}"]`);
    if (currentStep) {
        currentStep.style.display = 'block';
    }

    // Special rendering for step 3 (challenges)
    if (step === 3) {
        this.renderChallengePacksOnboarding();
    }

    // Special rendering for step 4 (summary)
    if (step === 4) {
        this.renderOnboardingSummary();
    }
}

renderChallengePacksOnboarding() {
    const container = document.getElementById('onboarding-challenges');
    if (!container) return;

    const packs = [
        {
            id: 'wellness-basics',
            icon: '🌱',
            name: 'Wellness Basics',
            description: 'Build healthy daily habits',
            quests: 3,
            time: '15 min/day'
        },
        {
            id: '75-hard',
            icon: '⚔️',
            name: '75 Hard',
            description: 'Ultimate discipline challenge',
            quests: 7,
            time: '2 hours/day'
        },
        {
            id: 'quick-start',
            icon: '⚡',
            name: 'Quick Start',
            description: 'Simple daily routine',
            quests: 3,
            time: '10 min/day'
        },
        {
            id: 'fitness-focus',
            icon: '💪',
            name: 'Fitness Focus',
            description: 'Monthly fitness challenge',
            quests: 3,
            time: '30 min/day'
        }
    ];

    container.innerHTML = packs.map(pack => `
        <div class="challenge-pack-card" onclick="app.selectChallengePack('${pack.id}')">
            <div class="challenge-pack-icon">${pack.icon}</div>
            <div class="challenge-pack-name">${pack.name}</div>
            <div class="challenge-pack-desc">${pack.description}</div>
            <div class="challenge-pack-stats">
                <span>${pack.quests} quests</span>
                <span>${pack.time}</span>
            </div>
        </div>
    `).join('');
}

selectChallengePack(packId) {
    this.onboardingData.selectedChallenge = packId;
    
    // Update UI
    document.querySelectorAll('.challenge-pack-card').forEach(card => {
        card.classList.remove('selected');
    });
    event.target.closest('.challenge-pack-card').classList.add('selected');

    // Auto-advance after selection
    setTimeout(() => {
        this.nextOnboardingStep();
    }, 500);
}

skipChallenge() {
    this.onboardingData.selectedChallenge = null;
    this.nextOnboardingStep();
}

renderOnboardingSummary() {
    const nameEl = document.getElementById('onboarding-summary-name');
    const challengeEl = document.getElementById('onboarding-summary-challenge');
    
    if (nameEl) {
        nameEl.textContent = `${this.onboardingData.characterName}'s Adventure`;
    }
    
    if (challengeEl) {
        challengeEl.textContent = this.onboardingData.selectedChallenge || 'None - Custom setup';
    }
}

completeOnboarding() {
    // Apply settings
    this.data.settings.characterName = this.onboardingData.characterName;
    
    if (this.onboardingData.partnerName) {
        this.data.settings.partnerName = this.onboardingData.partnerName;
        this.updatePartnerQuestNames();
    }

    // Start selected challenge if any
    if (this.onboardingData.selectedChallenge) {
        // Implementation depends on challenge pack structure
        this.startChallengeFromPack(this.onboardingData.selectedChallenge);
    }

    // Save and hide onboarding
    this.saveData();
    this.hideOnboarding();
    this.renderAll();

    // Show welcome modal
    this.showLevelUpModal(`Welcome, ${this.data.settings.characterName}!`, 
                          'Your adventure begins now. Complete quests to level up!');
}

// Call checkFirstTime in init()
// Add after this.loadData(); in init():
// this.checkFirstTime();
```

---

## Gender-Specific Quest Variations

### Implementation Strategy

Create quest template variations based on gender:

```javascript
getGenderSpecificQuestName(baseId, gender) {
    const variations = {
        'workout': {
            male: 'Strength training',
            female: 'Workout session',
            'non-binary': 'Strength training',
            other: 'Workout session'
        },
        'self_care': {
            male: 'Grooming & self-care',
            female: 'Self-care routine',
            'non-binary': 'Self-care routine',
            other: 'Self-care routine'
        }
        // Add more as needed
    };

    return variations[baseId]?.[gender] || variations[baseId]?.other;
}
```

### Relationship-Specific Quests

```javascript
getRelationshipQuests(relationshipStatus, partnerName) {
    if (relationshipStatus === 'single') {
        return [
            { id: 'social_time', name: 'Quality time with friends', ... },
            { id: 'self_date', name: 'Take yourself on a date', ... }
        ];
    } else {
        return [
            { id: 'quality_time', name: `Quality time with ${partnerName}`, ... },
            { id: 'date_night', name: `Date night with ${partnerName}`, ... }
        ];
    }
}
```

### Family-Specific Quests

```javascript
getFamilyQuests(hasChildren) {
    if (hasChildren) {
        return [
            { id: 'family_time', name: 'Quality time with kids', ... },
            { id: 'family_activity', name: 'Family activity or outing', ... }
        ];
    }
    return [];
}
```

---

## Storage Structure

```javascript
{
    version: 3,
    settings: {
        characterName: 'Christina',
        partnerName: 'Scott',
        soundEnabled: true,
        onboardingCompleted: true,
        profile: {
            gender: 'female',
            relationshipStatus: 'married',
            lifeStage: 'working',
            hasChildren: false
        }
    },
    // ... rest of data
}
```

---

## Testing Checklist

- [ ] First-time user sees onboarding
- [ ] Character name updates title
- [ ] Partner name updates quest names
- [ ] Gender affects quest selection (if implemented)
- [ ] Relationship status adds/removes quests
- [ ] Family status adds child-related quests
- [ ] Can skip challenge selection
- [ ] Can go back through steps
- [ ] Summary shows all selections
- [ ] Data persists after onboarding
- [ ] Onboarding doesn't show again after completion

---

## Future Enhancements

1. **Profile Photos**: Allow users to upload avatar
2. **Interest Tags**: Select interests to personalize quest recommendations
3. **Goal Setting**: Set initial goals during onboarding
4. **Tutorial Tooltips**: Interactive tutorial after onboarding
5. **Profile Editing**: Allow users to update profile later in settings
6. **Progressive Onboarding**: Split into multiple sessions to avoid overwhelm

---

## Notes

- Keep onboarding under 2 minutes
- Make all optional fields truly optional
- Provide sensible defaults
- Allow users to edit profile later
- Consider A/B testing different onboarding flows
- Track completion rates and drop-off points
