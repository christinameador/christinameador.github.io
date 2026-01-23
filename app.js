// Life RPG v3 - New 10-skill system
// See DATA-MODEL-SPEC.md for full documentation

class LifeRPG {
    constructor() {
        this.version = 3;
        this.init();
    }

    init() {
        console.log('🚀 Init starting...');
        this.currentTypeFilter = 'all';
        this.currentPathFilter = 'all';
        this.currentStatusFilter = 'upcoming';
        this.loadData();
        this.initSoundSystem();
        this.setupEventListeners();
        
        // Check if onboarding is needed
        console.log('📋 Checking onboarding status...');
        console.log('  - Profile exists:', !!this.data.settings.profile);
        console.log('  - Onboarding completed:', this.data.settings.profile?.onboardingCompleted);
        
        if (!this.data.settings.profile || !this.data.settings.profile.onboardingCompleted) {
            console.log('✅ Onboarding needed! Showing onboarding...');
            this.showOnboarding();
            return; // Don't run normal init flow
        }
        
        console.log('⏭️ Onboarding not needed, continuing normal init...');
        this.checkResets();
        this.checkLoginStreak();
        this.checkComebackBonus();
        this.renderAll();
        this.updateProgressRings();
        this.checkSkillDecayWarnings();
        
        // Show welcome screen if appropriate
        if (this.shouldShowWelcome()) {
            setTimeout(() => this.showWelcomeScreen(), 500);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // XP & LEVELING (OSRS Formula)
    // ═══════════════════════════════════════════════════════════════

    getXPForLevel(level) {
        let points = 0;
        for (let i = 1; i < level; i++) {
            points += Math.floor(i + 300 * Math.pow(2, i / 7));
        }
        return Math.floor(points / 4);
    }

    getLevelFromXP(xp) {
        let level = 1;
        while (this.getXPForLevel(level + 1) <= xp && level < 99) {
            level++;
        }
        return level;
    }

    // ═══════════════════════════════════════════════════════════════
    // SOUND & HAPTIC SYSTEM
    // ═══════════════════════════════════════════════════════════════

    initSoundSystem() {
        this.audioContext = null;
        this.soundEnabled = this.data?.settings?.soundEnabled ?? true;
        
        // Initialize on first user interaction
        document.addEventListener('click', () => {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
        }, { once: true });
    }

    playSound(type) {
        if (!this.soundEnabled || !this.audioContext) return;
        
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        
        switch(type) {
            case 'complete':
                // Satisfying "ding" - two quick ascending notes
                this.playTone(ctx, 800, now, 0.1, 0.3);
                this.playTone(ctx, 1200, now + 0.1, 0.15, 0.3);
                break;
            case 'levelUp':
                // Fanfare - ascending arpeggio
                this.playTone(ctx, 523, now, 0.15, 0.4);        // C
                this.playTone(ctx, 659, now + 0.15, 0.15, 0.4); // E
                this.playTone(ctx, 784, now + 0.3, 0.15, 0.4);  // G
                this.playTone(ctx, 1047, now + 0.45, 0.3, 0.5); // C (octave)
                break;
            case 'achievement':
                // Grand achievement sound
                this.playTone(ctx, 440, now, 0.1, 0.3);
                this.playTone(ctx, 554, now + 0.1, 0.1, 0.3);
                this.playTone(ctx, 659, now + 0.2, 0.1, 0.3);
                this.playTone(ctx, 880, now + 0.3, 0.4, 0.5);
                break;
            case 'undo':
                // Descending tone
                this.playTone(ctx, 600, now, 0.15, 0.2);
                this.playTone(ctx, 400, now + 0.15, 0.15, 0.2);
                break;
            case 'error':
                // Low buzz
                this.playTone(ctx, 200, now, 0.2, 0.3, 'square');
                break;
        }
    }

    playTone(ctx, frequency, startTime, duration, volume = 0.3, type = 'sine') {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(volume, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    }

    triggerHaptic(type = 'light') {
        if (!navigator.vibrate) return;
        
        switch(type) {
            case 'light':
                navigator.vibrate(10);
                break;
            case 'medium':
                navigator.vibrate(25);
                break;
            case 'success':
                navigator.vibrate([10, 50, 20]);
                break;
            case 'levelUp':
                navigator.vibrate([20, 30, 20, 30, 50]);
                break;
            case 'error':
                navigator.vibrate([50, 30, 50]);
                break;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // LOGIN STREAK & COMEBACK BONUS
    // ═══════════════════════════════════════════════════════════════

    checkLoginStreak() {
        const today = new Date().toDateString();
        const lastLogin = this.data.loginStreak?.lastLoginDate;
        
        if (!this.data.loginStreak) {
            this.data.loginStreak = {
                current: 1,
                longest: 1,
                lastLoginDate: today,
                totalLogins: 1,
                streakProtectionUsed: 0,
                streakProtectionWeekStart: this.getStartOfWeek(new Date()).toISOString()
            };
            this.awardLoginBonus(true);
            this.saveData();
            return;
        }

        if (lastLogin === today) {
            // Already logged in today
            return;
        }

        const lastLoginDate = new Date(lastLogin);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        // Reset weekly streak protection
        const weekStart = this.getStartOfWeek(new Date());
        if (new Date(this.data.loginStreak.streakProtectionWeekStart) < weekStart) {
            this.data.loginStreak.streakProtectionUsed = 0;
            this.data.loginStreak.streakProtectionWeekStart = weekStart.toISOString();
        }

        if (lastLoginDate.toDateString() === yesterday.toDateString()) {
            // Consecutive day - extend streak
            this.data.loginStreak.current++;
            this.data.loginStreak.longest = Math.max(
                this.data.loginStreak.longest, 
                this.data.loginStreak.current
            );
            this.awardLoginBonus(false);
        } else if (lastLoginDate.toDateString() === twoDaysAgo.toDateString() && 
                   this.data.loginStreak.streakProtectionUsed < 1) {
            // Missed one day - use streak protection
            this.data.loginStreak.streakProtectionUsed++;
            this.data.loginStreak.current++; // Still extend the streak
            this.showToast('🛡️ Streak Protection used! Streak saved!', 'success');
            this.awardLoginBonus(false);
        } else {
            // Streak broken
            const oldStreak = this.data.loginStreak.current;
            this.data.loginStreak.current = 1;
            if (oldStreak > 3) {
                this.showToast(`Streak of ${oldStreak} days ended. Starting fresh!`, 'info');
            }
            this.awardLoginBonus(true);
        }

        this.data.loginStreak.lastLoginDate = today;
        this.data.loginStreak.totalLogins++;
        this.saveData();
        
        // Show streak protection availability
        this.updateStreakProtectionBanner();
    }

    awardLoginBonus(isNewStreak) {
        const streak = this.data.loginStreak?.current || 1;
        let bonusXP = 10; // Base login bonus
        
        // Streak multiplier
        if (streak >= 7) bonusXP = 50;
        else if (streak >= 3) bonusXP = 25;
        else if (streak >= 2) bonusXP = 15;

        // Apply comeback bonus if active
        if (this.data.comebackBonus?.active) {
            bonusXP = Math.floor(bonusXP * this.data.comebackBonus.multiplier);
        }

        // Award to a random skill or spread across all
        const skills = Object.keys(this.data.skills);
        const randomSkill = skills[Math.floor(Math.random() * skills.length)];
        this.data.skills[randomSkill].xp += bonusXP;

        const message = isNewStreak 
            ? `Welcome! +${bonusXP} XP login bonus to ${this.getSkillName(randomSkill)}!`
            : `🔥 ${streak} day streak! +${bonusXP} XP to ${this.getSkillName(randomSkill)}!`;
        
        setTimeout(() => {
            this.showToast(message, 'success');
            this.playSound('complete');
            this.triggerHaptic('success');
        }, 500);
    }

    checkComebackBonus() {
        if (!this.data.loginStreak) return;
        
        const lastLogin = new Date(this.data.loginStreak.lastLoginDate);
        const today = new Date();
        const daysMissed = Math.floor((today - lastLogin) / (1000 * 60 * 60 * 24));

        if (daysMissed >= 3 && daysMissed <= 14) {
            // Activate comeback bonus
            let multiplier = 1.5;
            if (daysMissed >= 7) multiplier = 2.0;
            
            this.data.comebackBonus = {
                active: true,
                multiplier: multiplier,
                expiresAt: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
            };
            
            document.getElementById('comeback-bonus-banner').style.display = 'block';
            document.getElementById('comeback-multiplier').textContent = multiplier + 'x';
        } else if (this.data.comebackBonus?.active) {
            // Check if bonus expired
            if (new Date(this.data.comebackBonus.expiresAt) < today) {
                this.data.comebackBonus.active = false;
            } else {
                document.getElementById('comeback-bonus-banner').style.display = 'block';
                document.getElementById('comeback-multiplier').textContent = 
                    this.data.comebackBonus.multiplier + 'x';
            }
        }
    }

    updateStreakProtectionBanner() {
        const banner = document.getElementById('streak-protection-banner');
        const countEl = document.getElementById('protection-count');
        
        if (banner && this.data.loginStreak) {
            const remaining = 1 - (this.data.loginStreak.streakProtectionUsed || 0);
            if (remaining > 0 && this.data.loginStreak.current >= 3) {
                banner.style.display = 'block';
                countEl.textContent = remaining;
            } else {
                banner.style.display = 'none';
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SKILL DECAY WARNINGS
    // ═══════════════════════════════════════════════════════════════

    checkSkillDecayWarnings() {
        const today = new Date();
        const warnings = [];

        Object.entries(this.data.skills).forEach(([skillId, skill]) => {
            if (skill.currentStreak >= 3 && skill.lastAwardedDate) {
                const lastDate = new Date(skill.lastAwardedDate);
                const daysSince = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
                
                if (daysSince === 1) {
                    warnings.push({
                        skill: skillId,
                        streak: skill.currentStreak,
                        message: `${this.getSkillEmoji(skillId)} ${this.getSkillName(skillId)} streak at risk!`
                    });
                }
            }
        });

        // Show warning for skills at risk
        if (warnings.length > 0) {
            setTimeout(() => {
                warnings.forEach((w, i) => {
                    setTimeout(() => {
                        this.showToast(w.message, 'warning');
                    }, i * 1500);
                });
            }, 2000);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // DATA LOADING & MIGRATION
    // ═══════════════════════════════════════════════════════════════

    loadData() {
        console.log('📂 Loading data...');
        const saved = localStorage.getItem('lifeRPGData');
        if (saved) {
            console.log('✅ Found saved data, parsing and migrating...');
            this.data = JSON.parse(saved);
            this.migrateData();
        } else {
            console.log('📝 No saved data, creating default data...');
            this.data = this.getDefaultData();
            console.log('Created default data. Profile exists:', !!this.data.settings.profile);
            console.log('Profile onboarding completed:', this.data.settings.profile?.onboardingCompleted);
        }
    }

    saveData() {
        try {
            localStorage.setItem('lifeRPGData', JSON.stringify(this.data));
        } catch (e) {
            console.error('Failed to save data:', e);
            // Try to free up space by removing old backups
            localStorage.removeItem('lifeRPGData_backup_v1');
            try {
                localStorage.setItem('lifeRPGData', JSON.stringify(this.data));
            } catch (e2) {
                alert('Storage full! Consider exporting your data and clearing browser storage.');
            }
        }
    }

    getDefaultData() {
        return {
            version: this.version,
            
            settings: {
                characterName: 'Christina',
                partnerName: 'Your Partner',
                soundEnabled: true,
                
                profile: {
                    // Basic Info
                    name: null,
                    
                    // Goals & Paths
                    primaryGoals: [],
                    activePaths: [],
                    
                    // Usage
                    usageFrequency: null,
                    
                    // Demographics (optional)
                    gender: null,
                    ageRange: null,
                    
                    // Relationships
                    relationshipStatus: null,
                    partnerName: null,
                    hasChildren: false,
                    numberOfChildren: 0,
                    childrenAges: [],
                    caregivingResponsibilities: [],
                    
                    // Life Situation
                    workSituation: null,
                    livingSituation: null,
                    
                    // Metadata
                    onboardingCompleted: false,
                    onboardingDate: null,
                    lastWelcomeScreen: null
                }
            },
            
            skills: {
                athleticism: { xp: 0, currentStreak: 0, longestStreak: 0, lastAwardedDate: null },
                culinary: { xp: 0, currentStreak: 0, longestStreak: 0, lastAwardedDate: null },
                artistry: { xp: 0, currentStreak: 0, longestStreak: 0, lastAwardedDate: null },
                business: { xp: 0, currentStreak: 0, longestStreak: 0, lastAwardedDate: null },
                partnership: { xp: 0, currentStreak: 0, longestStreak: 0, lastAwardedDate: null },
                friendships: { xp: 0, currentStreak: 0, longestStreak: 0, lastAwardedDate: null },
                innerPeace: { xp: 0, currentStreak: 0, longestStreak: 0, lastAwardedDate: null },
                homeCraft: { xp: 0, currentStreak: 0, longestStreak: 0, lastAwardedDate: null },
                generosity: { xp: 0, currentStreak: 0, longestStreak: 0, lastAwardedDate: null },
                influence: { xp: 0, currentStreak: 0, longestStreak: 0, lastAwardedDate: null }
            },
            
            quests: this.getDefaultQuests(),
            paths: this.getDefaultPaths(),
            challenges: [],
            achievements: this.getDefaultAchievements(),
            
            completionLog: {
                completions: [],
                completedToday: [],
                completedThisWeek: [],
                completedThisMonth: [],
                completedEver: []
            },
            
            photos: [],
            collectionLog: [],
            lastActiveDate: new Date().toDateString()
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // DEFAULT QUESTS
    // ═══════════════════════════════════════════════════════════════

    getDefaultQuests() {
        return [
            // ═══════════════════════════════════════════════════════════════
            // DAILY QUESTS
            // ═══════════════════════════════════════════════════════════════
            
            // Athleticism
            { id: 'run', name: 'Go for a run', frequency: 'daily', rewards: [{ skill: 'athleticism', xp: 50 }], challengeId: null, custom: false, active: true },
            { id: 'workout', name: 'Strength training', frequency: 'daily', rewards: [{ skill: 'athleticism', xp: 50 }], challengeId: null, custom: false, active: true },
            { id: 'yoga', name: 'Yoga/Stretching', frequency: 'daily', rewards: [{ skill: 'athleticism', xp: 20 }, { skill: 'innerPeace', xp: 15 }], challengeId: null, custom: false, active: true },
            { id: 'walk_10k', name: 'Walk 10,000 steps', frequency: 'daily', rewards: [{ skill: 'athleticism', xp: 30 }], challengeId: null, custom: false, active: true },
            
            // Culinary
            { id: 'cook_meal', name: 'Cook a meal', frequency: 'daily', rewards: [{ skill: 'culinary', xp: 30 }], challengeId: null, custom: false, active: true },
            { id: 'healthy_breakfast', name: 'Make a healthy breakfast', frequency: 'daily', rewards: [{ skill: 'culinary', xp: 20 }, { skill: 'athleticism', xp: 10 }], challengeId: null, custom: false, active: true },
            
            // Artistry
            { id: 'cross_stitch', name: 'Cross stitch (30+ min)', frequency: 'daily', rewards: [{ skill: 'artistry', xp: 35 }], challengeId: null, custom: false, active: true },
            { id: 'sketch', name: 'Sketch or doodle', frequency: 'daily', rewards: [{ skill: 'artistry', xp: 25 }], challengeId: null, custom: false, active: true },
            
            // Business
            { id: 'dev_work', name: 'Moonshot Dev work (1+ hr)', frequency: 'daily', rewards: [{ skill: 'business', xp: 50 }], challengeId: null, custom: false, active: true },
            { id: 'email_inbox', name: 'Process email inbox to zero', frequency: 'daily', rewards: [{ skill: 'business', xp: 15 }], challengeId: null, custom: false, active: true },
            
            // Partnership
            { id: 'quality_time', name: 'Quality time with Your Partner', frequency: 'daily', rewards: [{ skill: 'partnership', xp: 40 }], challengeId: null, custom: false, active: true },
            { id: 'check_in', name: 'Meaningful check-in conversation', frequency: 'daily', rewards: [{ skill: 'partnership', xp: 25 }], challengeId: null, custom: false, active: true },
            
            // Friendships
            { id: 'text_friend', name: 'Text/call a friend', frequency: 'daily', rewards: [{ skill: 'friendships', xp: 20 }], challengeId: null, custom: false, active: true },
            
            // Inner Peace
            { id: 'phone_free', name: 'Phone-free hour', frequency: 'daily', rewards: [{ skill: 'innerPeace', xp: 25 }], challengeId: null, custom: false, active: true },
            { id: 'read', name: 'Read (30+ min)', frequency: 'daily', rewards: [{ skill: 'innerPeace', xp: 30 }], challengeId: null, custom: false, active: true },
            { id: 'journal', name: 'Journal (15+ min)', frequency: 'daily', rewards: [{ skill: 'innerPeace', xp: 25 }], challengeId: null, custom: false, active: true },
            { id: 'meditate', name: 'Meditate (10+ min)', frequency: 'daily', rewards: [{ skill: 'innerPeace', xp: 30 }], challengeId: null, custom: false, active: true },
            { id: 'gratitude', name: 'Write 3 gratitudes', frequency: 'daily', rewards: [{ skill: 'innerPeace', xp: 15 }], challengeId: null, custom: false, active: true },
            
            // Home Craft
            { id: 'tidy_space', name: 'Tidy living space', frequency: 'daily', rewards: [{ skill: 'homeCraft', xp: 20 }], challengeId: null, custom: false, active: true },
            
            // Influence
            { id: 'social_post', name: 'Post on social media', frequency: 'daily', rewards: [{ skill: 'influence', xp: 25 }], challengeId: null, custom: false, active: true },
            { id: 'engage_comments', name: 'Engage with comments/DMs', frequency: 'daily', rewards: [{ skill: 'influence', xp: 15 }, { skill: 'friendships', xp: 10 }], challengeId: null, custom: false, active: true },

            // ═══════════════════════════════════════════════════════════════
            // WEEKLY QUESTS
            // ═══════════════════════════════════════════════════════════════
            
            // Athleticism
            { id: 'run_5k', name: 'Complete a 5K run', frequency: 'weekly', rewards: [{ skill: 'athleticism', xp: 150 }], challengeId: null, custom: false, active: true },
            { id: 'fitness_new_class', name: 'Try a new fitness class', frequency: 'weekly', rewards: [{ skill: 'athleticism', xp: 75 }], challengeId: null, custom: false, active: true },
            
            // Culinary
            { id: 'meal_prep', name: 'Meal prep for the week', frequency: 'weekly', rewards: [{ skill: 'culinary', xp: 50 }], challengeId: null, custom: false, active: true },
            { id: 'fancy_dinner', name: 'Cook a fancy dinner', frequency: 'weekly', rewards: [{ skill: 'culinary', xp: 60 }], challengeId: null, custom: false, active: true },
            
            // Partnership
            { id: 'date_night', name: 'Date night with Your Partner', frequency: 'weekly', rewards: [{ skill: 'partnership', xp: 75 }], challengeId: null, custom: false, active: true },
            
            // Friendships
            { id: 'social', name: 'Hang with friends', frequency: 'weekly', rewards: [{ skill: 'friendships', xp: 60 }], challengeId: null, custom: false, active: true },
            { id: 'friend_date', name: 'One-on-one friend hangout', frequency: 'weekly', rewards: [{ skill: 'friendships', xp: 75 }], challengeId: null, custom: false, active: true },
            
            // Home Craft
            { id: 'reno_task', name: 'Home renovation task', frequency: 'weekly', rewards: [{ skill: 'homeCraft', xp: 60 }], challengeId: null, custom: false, active: true },
            { id: 'deep_clean', name: 'Deep clean a room', frequency: 'weekly', rewards: [{ skill: 'homeCraft', xp: 40 }], challengeId: null, custom: false, active: true },
            
            // Influence
            { id: 'content_create', name: 'Create content for social media', frequency: 'weekly', rewards: [{ skill: 'influence', xp: 40 }, { skill: 'artistry', xp: 20 }], challengeId: null, custom: false, active: true },
            { id: 'content_plan', name: 'Plan content calendar', frequency: 'weekly', rewards: [{ skill: 'influence', xp: 30 }, { skill: 'business', xp: 20 }], challengeId: null, custom: false, active: true },
            
            // Generosity
            { id: 'help_someone', name: 'Help someone in need', frequency: 'weekly', rewards: [{ skill: 'generosity', xp: 50 }], challengeId: null, custom: false, active: true },

            // ═══════════════════════════════════════════════════════════════
            // MONTHLY QUESTS
            // ═══════════════════════════════════════════════════════════════
            
            // Athleticism
            { id: 'fitness_milestone', name: 'Hit a fitness milestone', frequency: 'monthly', rewards: [{ skill: 'athleticism', xp: 150 }], challengeId: null, custom: false, active: true },
            { id: 'fit_pr', name: 'Set a personal record', frequency: 'monthly', rewards: [{ skill: 'athleticism', xp: 100 }], challengeId: null, custom: false, active: true },
            { id: 'fit_challenge', name: 'Complete a fitness challenge', frequency: 'monthly', rewards: [{ skill: 'athleticism', xp: 75 }], challengeId: null, custom: false, active: true },
            
            // Culinary
            { id: 'new_recipe', name: 'Master a new recipe', frequency: 'monthly', rewards: [{ skill: 'culinary', xp: 100 }], challengeId: null, custom: false, active: true },
            { id: 'cul_cuisine', name: 'Cook a cuisine you\'ve never tried', frequency: 'monthly', rewards: [{ skill: 'culinary', xp: 75 }], challengeId: null, custom: false, active: true },
            { id: 'cul_dinner_party', name: 'Host a dinner for friends', frequency: 'monthly', rewards: [{ skill: 'culinary', xp: 50 }, { skill: 'friendships', xp: 50 }], challengeId: null, custom: false, active: true },
            { id: 'cul_signature', name: 'Perfect a signature dish', frequency: 'monthly', rewards: [{ skill: 'culinary', xp: 100 }], challengeId: null, custom: false, active: true },
            
            // Artistry
            { id: 'art_project', name: 'Complete a major art project', frequency: 'monthly', rewards: [{ skill: 'artistry', xp: 150 }], challengeId: null, custom: false, active: true },
            { id: 'art_new_medium', name: 'Try a new artistic medium', frequency: 'monthly', rewards: [{ skill: 'artistry', xp: 75 }], challengeId: null, custom: false, active: true },
            { id: 'art_share', name: 'Share your art publicly', frequency: 'monthly', rewards: [{ skill: 'artistry', xp: 40 }, { skill: 'influence', xp: 35 }], challengeId: null, custom: false, active: true },
            { id: 'art_gallery', name: 'Visit a gallery/museum', frequency: 'monthly', rewards: [{ skill: 'artistry', xp: 50 }, { skill: 'innerPeace', xp: 25 }], challengeId: null, custom: false, active: true },
            
            // Business
            { id: 'ent_deep_work', name: 'Deep work session (2+ hrs)', frequency: 'monthly', rewards: [{ skill: 'business', xp: 75 }], challengeId: null, custom: false, active: true },
            { id: 'ent_learn', name: 'Learn new business skill', frequency: 'monthly', rewards: [{ skill: 'business', xp: 50 }], challengeId: null, custom: false, active: true },
            { id: 'biz_revenue', name: 'Generate business revenue', frequency: 'monthly', rewards: [{ skill: 'business', xp: 200 }], challengeId: null, custom: false, active: true },
            
            // Partnership
            { id: 'love_surprise', name: 'Surprise Your Partner with something thoughtful', frequency: 'monthly', rewards: [{ skill: 'partnership', xp: 75 }], challengeId: null, custom: false, active: true },
            { id: 'love_adventure', name: 'Try something new together', frequency: 'monthly', rewards: [{ skill: 'partnership', xp: 50 }, { skill: 'friendships', xp: 25 }], challengeId: null, custom: false, active: true },
            { id: 'love_letter', name: 'Write a love letter', frequency: 'monthly', rewards: [{ skill: 'partnership', xp: 60 }], challengeId: null, custom: false, active: true },
            
            // Friendships  
            { id: 'friend_event', name: 'Plan a friend gathering', frequency: 'monthly', rewards: [{ skill: 'friendships', xp: 100 }], challengeId: null, custom: false, active: true },
            { id: 'reconnect', name: 'Reconnect with old friend', frequency: 'monthly', rewards: [{ skill: 'friendships', xp: 75 }], challengeId: null, custom: false, active: true },
            
            // Inner Peace
            { id: 'soul_retreat', name: 'Mini retreat day (phone-free)', frequency: 'monthly', rewards: [{ skill: 'innerPeace', xp: 100 }], challengeId: null, custom: false, active: true },
            { id: 'soul_meditation', name: 'Complete 10 meditation sessions', frequency: 'monthly', rewards: [{ skill: 'innerPeace', xp: 75 }], challengeId: null, custom: false, active: true },
            { id: 'soul_workshop', name: 'Attend a personal growth workshop', frequency: 'monthly', rewards: [{ skill: 'innerPeace', xp: 100 }], challengeId: null, custom: false, active: true },
            
            // Home Craft
            { id: 'garden_project', name: 'Complete a home improvement project', frequency: 'monthly', rewards: [{ skill: 'homeCraft', xp: 100 }], challengeId: null, custom: false, active: true },
            { id: 'garden_organize', name: 'Organize/beautify a space', frequency: 'monthly', rewards: [{ skill: 'homeCraft', xp: 50 }, { skill: 'innerPeace', xp: 25 }], challengeId: null, custom: false, active: true },
            { id: 'home_decor', name: 'Add new decor element', frequency: 'monthly', rewards: [{ skill: 'homeCraft', xp: 60 }, { skill: 'artistry', xp: 30 }], challengeId: null, custom: false, active: true },
            
            // Generosity
            { id: 'volunteer', name: 'Volunteer or give back', frequency: 'monthly', rewards: [{ skill: 'generosity', xp: 100 }], challengeId: null, custom: false, active: true },
            { id: 'saint_cause', name: 'Support a cause you believe in', frequency: 'monthly', rewards: [{ skill: 'generosity', xp: 75 }], challengeId: null, custom: false, active: true },
            { id: 'saint_mentor', name: 'Help someone with their goals', frequency: 'monthly', rewards: [{ skill: 'generosity', xp: 50 }, { skill: 'friendships', xp: 25 }], challengeId: null, custom: false, active: true },
            
            // Influence
            { id: 'inf_viral', name: 'Create standout content piece', frequency: 'monthly', rewards: [{ skill: 'influence', xp: 75 }, { skill: 'artistry', xp: 25 }], challengeId: null, custom: false, active: true },
            { id: 'inf_engage', name: 'Engage with your community', frequency: 'monthly', rewards: [{ skill: 'influence', xp: 50 }, { skill: 'friendships', xp: 25 }], challengeId: null, custom: false, active: true },
            { id: 'inf_collab', name: 'Collaborate with another creator', frequency: 'monthly', rewards: [{ skill: 'influence', xp: 100 }, { skill: 'friendships', xp: 50 }], challengeId: null, custom: false, active: true },

            // ═══════════════════════════════════════════════════════════════
            // AS-NEEDED QUESTS
            // ═══════════════════════════════════════════════════════════════
            
            { id: 'home_repair', name: 'Home repair/maintenance', frequency: 'as-needed', rewards: [{ skill: 'homeCraft', xp: 50 }], challengeId: null, custom: false, active: true },
            { id: 'declutter', name: 'Declutter a space', frequency: 'as-needed', rewards: [{ skill: 'homeCraft', xp: 35 }, { skill: 'innerPeace', xp: 15 }], challengeId: null, custom: false, active: true },
            { id: 'culinary_experiment', name: 'Try a new cooking technique', frequency: 'as-needed', rewards: [{ skill: 'culinary', xp: 45 }], challengeId: null, custom: false, active: true },
            { id: 'art_learn', name: 'Learn a new art technique', frequency: 'as-needed', rewards: [{ skill: 'artistry', xp: 50 }], challengeId: null, custom: false, active: true },
            { id: 'random_kindness', name: 'Random act of kindness', frequency: 'as-needed', rewards: [{ skill: 'generosity', xp: 40 }], challengeId: null, custom: false, active: true },
            { id: 'donate', name: 'Donate items or money', frequency: 'as-needed', rewards: [{ skill: 'generosity', xp: 50 }], challengeId: null, custom: false, active: true },
            { id: 'garden_work', name: 'Gardening/yard work', frequency: 'as-needed', rewards: [{ skill: 'homeCraft', xp: 40 }, { skill: 'innerPeace', xp: 10 }], challengeId: null, custom: false, active: true },
            { id: 'learn_skill', name: 'Learn something new', frequency: 'as-needed', rewards: [{ skill: 'business', xp: 40 }, { skill: 'innerPeace', xp: 20 }], challengeId: null, custom: false, active: true },
            { id: 'photo_shoot', name: 'Content photo shoot', frequency: 'as-needed', rewards: [{ skill: 'influence', xp: 50 }, { skill: 'artistry', xp: 25 }], challengeId: null, custom: false, active: true },

            // ═══════════════════════════════════════════════════════════════
            // ONE-TIME QUESTS - ENTREPRENEUR PATH
            // ═══════════════════════════════════════════════════════════════
            
            // Stage 1: Foundation
            { id: 'biz_research', name: 'Market research for plugin ideas', frequency: 'one-time', rewards: [{ skill: 'business', xp: 40 }], challengeId: null, custom: false, active: true },
            { id: 'biz_design', name: 'Design business website mockup', frequency: 'one-time', rewards: [{ skill: 'business', xp: 30 }, { skill: 'artistry', xp: 30 }], challengeId: null, custom: false, active: true },
            { id: 'biz_brand', name: 'Create brand assets (logo, colors)', frequency: 'one-time', rewards: [{ skill: 'artistry', xp: 40 }, { skill: 'business', xp: 30 }], challengeId: null, custom: false, active: true },
            
            // Stage 2: Build
            { id: 'biz_website_dev', name: 'Build Moonshot Dev website', frequency: 'one-time', rewards: [{ skill: 'business', xp: 100 }], challengeId: null, custom: false, active: true },
            { id: 'biz_plugin_plan', name: 'Plan first WordPress plugin', frequency: 'one-time', rewards: [{ skill: 'business', xp: 40 }], challengeId: null, custom: false, active: true },
            { id: 'biz_plugin_dev', name: 'Develop first plugin MVP', frequency: 'one-time', rewards: [{ skill: 'business', xp: 150 }], challengeId: null, custom: false, active: true },
            
            // Stage 3: Polish
            { id: 'biz_plugin_polish', name: 'Polish plugin for release', frequency: 'one-time', rewards: [{ skill: 'business', xp: 75 }], challengeId: null, custom: false, active: true },
            { id: 'biz_docs', name: 'Write plugin documentation', frequency: 'one-time', rewards: [{ skill: 'business', xp: 50 }], challengeId: null, custom: false, active: true },
            { id: 'biz_marketing_plan', name: 'Create marketing plan', frequency: 'one-time', rewards: [{ skill: 'business', xp: 40 }, { skill: 'influence', xp: 30 }], challengeId: null, custom: false, active: true },
            
            // Stage 4: Launch
            { id: 'biz_social', name: 'Set up business social media', frequency: 'one-time', rewards: [{ skill: 'business', xp: 30 }, { skill: 'influence', xp: 30 }], challengeId: null, custom: false, active: true },
            { id: 'biz_launch_prep', name: 'Prepare launch materials', frequency: 'one-time', rewards: [{ skill: 'business', xp: 50 }], challengeId: null, custom: false, active: true },
            { id: 'biz_first_sale', name: 'Make your first sale!', frequency: 'one-time', rewards: [{ skill: 'business', xp: 300 }], challengeId: null, custom: false, active: true },

            // ═══════════════════════════════════════════════════════════════
            // ONE-TIME QUESTS - OTHER PATH CAPSTONES
            // ═══════════════════════════════════════════════════════════════
            
            // Culinary Master - Mastery stage
            { id: 'cul_five_course', name: 'Cook a 5-course meal', frequency: 'one-time', rewards: [{ skill: 'culinary', xp: 200 }], challengeId: null, custom: false, active: true },
            { id: 'cul_teach', name: 'Teach someone to cook a dish', frequency: 'one-time', rewards: [{ skill: 'culinary', xp: 100 }, { skill: 'generosity', xp: 50 }], challengeId: null, custom: false, active: true },
            { id: 'cul_special_occasion', name: 'Cook for a special occasion', frequency: 'one-time', rewards: [{ skill: 'culinary', xp: 150 }], challengeId: null, custom: false, active: true },
            
            // Artistic Visionary - Visionary stage
            { id: 'art_exhibition', name: 'Display art in exhibition/sale', frequency: 'one-time', rewards: [{ skill: 'artistry', xp: 200 }, { skill: 'influence', xp: 50 }], challengeId: null, custom: false, active: true },
            { id: 'art_commission', name: 'Complete an art commission', frequency: 'one-time', rewards: [{ skill: 'artistry', xp: 150 }, { skill: 'business', xp: 50 }], challengeId: null, custom: false, active: true },
            { id: 'art_teach', name: 'Teach someone an art skill', frequency: 'one-time', rewards: [{ skill: 'artistry', xp: 100 }, { skill: 'generosity', xp: 50 }], challengeId: null, custom: false, active: true },
            
            // Lifestyle Influencer - Consistency & Influence stages
            { id: 'inf_30_posts', name: 'Post consistently for 30 days', frequency: 'one-time', rewards: [{ skill: 'influence', xp: 200 }], challengeId: null, custom: false, active: true },
            { id: 'inf_1k', name: 'Reach 1,000 followers', frequency: 'one-time', rewards: [{ skill: 'influence', xp: 300 }], challengeId: null, custom: false, active: true },
            { id: 'inf_brand_deal', name: 'Land a brand partnership', frequency: 'one-time', rewards: [{ skill: 'influence', xp: 250 }, { skill: 'business', xp: 100 }], challengeId: null, custom: false, active: true },
            
            // Lover Girl - Love stage
            { id: 'love_trip', name: 'Plan a couples trip', frequency: 'one-time', rewards: [{ skill: 'partnership', xp: 150 }], challengeId: null, custom: false, active: true },
            { id: 'love_tradition', name: 'Create a new couple tradition', frequency: 'one-time', rewards: [{ skill: 'partnership', xp: 100 }], challengeId: null, custom: false, active: true },
            { id: 'love_milestone', name: 'Celebrate relationship milestone', frequency: 'one-time', rewards: [{ skill: 'partnership', xp: 125 }], challengeId: null, custom: false, active: true },
            
            // Soul Work - Wisdom stage
            { id: 'soul_30_day', name: 'Complete 30-day meditation challenge', frequency: 'one-time', rewards: [{ skill: 'innerPeace', xp: 200 }], challengeId: null, custom: false, active: true },
            { id: 'soul_book', name: 'Read a life-changing book', frequency: 'one-time', rewards: [{ skill: 'innerPeace', xp: 100 }], challengeId: null, custom: false, active: true },
            { id: 'soul_practice', name: 'Establish daily spiritual practice', frequency: 'one-time', rewards: [{ skill: 'innerPeace', xp: 150 }], challengeId: null, custom: false, active: true },
            
            // Living Saint - Service stage
            { id: 'saint_ongoing', name: 'Start ongoing volunteer commitment', frequency: 'one-time', rewards: [{ skill: 'generosity', xp: 200 }], challengeId: null, custom: false, active: true },
            { id: 'saint_fundraise', name: 'Organize a fundraiser', frequency: 'one-time', rewards: [{ skill: 'generosity', xp: 150 }, { skill: 'business', xp: 50 }], challengeId: null, custom: false, active: true },
            { id: 'saint_impact', name: 'Make a measurable impact', frequency: 'one-time', rewards: [{ skill: 'generosity', xp: 200 }], challengeId: null, custom: false, active: true },
            
            // Secret Garden - Sanctuary stage
            { id: 'home_room_makeover', name: 'Complete room makeover', frequency: 'one-time', rewards: [{ skill: 'homeCraft', xp: 200 }, { skill: 'artistry', xp: 50 }], challengeId: null, custom: false, active: true },
            { id: 'home_outdoor', name: 'Create outdoor living space', frequency: 'one-time', rewards: [{ skill: 'homeCraft', xp: 150 }], challengeId: null, custom: false, active: true },
            { id: 'home_guest_ready', name: 'Make home guest-ready', frequency: 'one-time', rewards: [{ skill: 'homeCraft', xp: 100 }, { skill: 'generosity', xp: 25 }], challengeId: null, custom: false, active: true }
        ];
    }

    // ═══════════════════════════════════════════════════════════════
    // DEFAULT PATHS (9 Life Categories)
    // ═══════════════════════════════════════════════════════════════

    getDefaultPaths() {
        return [
            // 1. ENTREPRENEUR 🚀 - Business/Career
            {
                id: 'entrepreneur',
                name: 'Entrepreneur',
                description: 'Launch Moonshot Dev and build your business empire',
                icon: '🚀',
                stages: [
                    {
                        id: 'foundation',
                        name: 'Foundation',
                        description: 'Research and brand development',
                        questIds: ['biz_research', 'biz_design', 'biz_brand'],
                        satisfiedQuests: [],
                        completed: false,
                        completedDate: null
                    },
                    {
                        id: 'build',
                        name: 'Build',
                        description: 'Create the website and first plugin',
                        questIds: ['biz_website_dev', 'biz_plugin_plan', 'biz_plugin_dev'],
                        satisfiedQuests: [],
                        completed: false,
                        completedDate: null
                    },
                    {
                        id: 'polish',
                        name: 'Polish',
                        description: 'Refine and document',
                        questIds: ['biz_plugin_polish', 'biz_docs', 'biz_marketing_plan'],
                        satisfiedQuests: [],
                        completed: false,
                        completedDate: null
                    },
                    {
                        id: 'launch',
                        name: 'Launch',
                        description: 'Go to market and make your first sale',
                        questIds: ['biz_social', 'biz_launch_prep', 'biz_first_sale'],
                        satisfiedQuests: [],
                        completed: false,
                        completedDate: null
                    }
                ],
                completionReward: {
                    achievementId: 'path_entrepreneur',
                    merit: 'Entrepreneur',
                    description: 'You built and launched Moonshot Dev!'
                },
                completed: false,
                completedDate: null
            },

            // 2. CULINARY MASTER 🍳 - Food mastery
            {
                id: 'culinary-master',
                name: 'Culinary Master',
                description: 'Master the art of cooking and create memorable meals',
                icon: '🍳',
                stages: [
                    {
                        id: 'basics',
                        name: 'Kitchen Basics',
                        description: 'Build your foundation',
                        questIds: ['cook_meal', 'meal_prep', 'healthy_breakfast'],
                        satisfiedQuests: [],
                        completed: false,
                        completedDate: null
                    },
                    {
                        id: 'techniques',
                        name: 'Technique Training',
                        description: 'Learn new cooking methods',
                        questIds: ['culinary_experiment', 'new_recipe', 'cul_cuisine'],
                        satisfiedQuests: [],
                        completed: false,
                        completedDate: null
                    },
                    {
                        id: 'mastery',
                        name: 'Culinary Mastery',
                        description: 'Achieve cooking excellence',
                        questIds: ['cul_signature', 'cul_five_course', 'cul_teach'],
                        satisfiedQuests: [],
                        completed: false,
                        completedDate: null
                    }
                ],
                completionReward: {
                    achievementId: 'path_culinary',
                    merit: 'Chef',
                    description: 'You have mastered the culinary arts!'
                },
                completed: false,
                completedDate: null
            },

            // 3. ARTISTIC VISIONARY 🎨 - Creativity
            {
                id: 'artistic-visionary',
                name: 'Artistic Visionary',
                description: 'Express yourself through art and creativity',
                icon: '🎨',
                stages: [
                    {
                        id: 'dabbler',
                        name: 'Creative Dabbler',
                        description: 'Explore your creative side',
                        questIds: ['cross_stitch', 'art_learn', 'sketch'],
                        satisfiedQuests: [],
                        completed: false,
                        completedDate: null
                    },
                    {
                        id: 'creator',
                        name: 'Dedicated Creator',
                        description: 'Commit to regular creation',
                        questIds: ['art_project', 'art_new_medium', 'art_gallery'],
                        satisfiedQuests: [],
                        completed: false,
                        completedDate: null
                    },
                    {
                        id: 'visionary',
                        name: 'Artistic Visionary',
                        description: 'Develop your unique voice',
                        questIds: ['art_exhibition', 'art_commission', 'art_teach'],
                        satisfiedQuests: [],
                        completed: false,
                        completedDate: null
                    }
                ],
                completionReward: {
                    achievementId: 'path_artistic',
                    merit: 'Visionary',
                    description: 'Your creative vision inspires others!'
                },
                completed: false,
                completedDate: null
            },

            // 4. LIFESTYLE INFLUENCER 📸 - Personal brand
            {
                id: 'lifestyle-influencer',
                name: 'Lifestyle Influencer',
                description: 'Build your personal brand and inspire others',
                icon: '📸',
                stages: [
                    {
                        id: 'presence',
                        name: 'Building Presence',
                        description: 'Establish your online presence',
                        questIds: ['content_create', 'social_post', 'photo_shoot'],
                        satisfiedQuests: [],
                        completed: false,
                        completedDate: null
                    },
                    {
                        id: 'consistency',
                        name: 'Consistent Creator',
                        description: 'Develop a regular content rhythm',
                        questIds: ['content_plan', 'inf_30_posts', 'engage_comments'],
                        satisfiedQuests: [],
                        completed: false,
                        completedDate: null
                    },
                    {
                        id: 'influence',
                        name: 'True Influencer',
                        description: 'Make a real impact',
                        questIds: ['inf_1k', 'inf_collab', 'inf_brand_deal'],
                        satisfiedQuests: [],
                        completed: false,
                        completedDate: null
                    }
                ],
                completionReward: {
                    achievementId: 'path_influencer',
                    merit: 'Influencer',
                    description: 'Your lifestyle inspires thousands!'
                },
                completed: false,
                completedDate: null
            },

            // 5. FITNESS GODDESS 💪 - Health/Fitness
            {
                id: 'fitness-goddess',
                name: 'Fitness Goddess',
                description: 'Build strength, endurance, and a healthy body',
                icon: '💪',
                stages: [
                    {
                        id: 'foundation',
                        name: 'Building Foundation',
                        description: 'Establish consistent habits',
                        questIds: ['run', 'workout', 'yoga', 'walk_10k'],
                        satisfiedQuests: [],
                        completed: false,
                        completedDate: null
                    },
                    {
                        id: 'endurance',
                        name: 'Endurance Builder',
                        description: 'Push your limits',
                        questIds: ['run_5k', 'fitness_new_class', 'fit_challenge'],
                        satisfiedQuests: [],
                        completed: false,
                        completedDate: null
                    },
                    {
                        id: 'peak',
                        name: 'Peak Performance',
                        description: 'Achieve athletic excellence',
                        questIds: ['fitness_milestone', 'fit_pr'],
                        satisfiedQuests: [],
                        completed: false,
                        completedDate: null
                    }
                ],
                completionReward: {
                    achievementId: 'path_fitness',
                    merit: 'Fitness Goddess',
                    description: 'You have achieved peak physical form!'
                },
                completed: false,
                completedDate: null
            },

            // 6. LOVER GIRL 💕 - Relationships
            {
                id: 'lover-girl',
                name: 'Lover Girl',
                description: 'Nurture your relationships and spread love',
                icon: '💕',
                stages: [
                    {
                        id: 'presence',
                        name: 'Being Present',
                        description: 'Show up for the people you love',
                        questIds: ['quality_time', 'date_night', 'check_in'],
                        satisfiedQuests: [],
                        completed: false,
                        completedDate: null
                    },
                    {
                        id: 'connection',
                        name: 'Deep Connection',
                        description: 'Build meaningful bonds',
                        questIds: ['social', 'friend_date', 'love_surprise'],
                        satisfiedQuests: [],
                        completed: false,
                        completedDate: null
                    },
                    {
                        id: 'love',
                        name: 'Embodying Love',
                        description: 'Become a source of love for others',
                        questIds: ['love_trip', 'love_tradition', 'love_milestone'],
                        satisfiedQuests: [],
                        completed: false,
                        completedDate: null
                    }
                ],
                completionReward: {
                    achievementId: 'path_lover',
                    merit: 'Lover Girl',
                    description: 'Your love enriches everyone around you!'
                },
                completed: false,
                completedDate: null
            },

            // 7. SOUL WORK 🧘 - Spirituality/Growth
            {
                id: 'soul-work',
                name: 'Soul Work',
                description: 'Deepen your inner wisdom and spiritual growth',
                icon: '🧘',
                stages: [
                    {
                        id: 'awareness',
                        name: 'Building Awareness',
                        description: 'Develop mindfulness practices',
                        questIds: ['journal', 'phone_free', 'read', 'meditate'],
                        satisfiedQuests: [],
                        completed: false,
                        completedDate: null
                    },
                    {
                        id: 'reflection',
                        name: 'Deep Reflection',
                        description: 'Explore your inner landscape',
                        questIds: ['yoga', 'gratitude', 'soul_retreat'],
                        satisfiedQuests: [],
                        completed: false,
                        completedDate: null
                    },
                    {
                        id: 'wisdom',
                        name: 'Embodied Wisdom',
                        description: 'Live from a place of wisdom',
                        questIds: ['soul_30_day', 'soul_book', 'soul_practice'],
                        satisfiedQuests: [],
                        completed: false,
                        completedDate: null
                    }
                ],
                completionReward: {
                    achievementId: 'path_soul',
                    merit: 'Sage',
                    description: 'You have achieved deep inner wisdom!'
                },
                completed: false,
                completedDate: null
            },

            // 8. LIVING SAINT 🤍 - Giving/Contribution
            {
                id: 'living-saint',
                name: 'Living Saint',
                description: 'Give back and make the world a better place',
                icon: '🤍',
                stages: [
                    {
                        id: 'kindness',
                        name: 'Daily Kindness',
                        description: 'Practice small acts of kindness',
                        questIds: ['random_kindness', 'help_someone'],
                        satisfiedQuests: [],
                        completed: false,
                        completedDate: null
                    },
                    {
                        id: 'giving',
                        name: 'Generous Giving',
                        description: 'Give your time and resources',
                        questIds: ['volunteer', 'donate', 'saint_mentor'],
                        satisfiedQuests: [],
                        completed: false,
                        completedDate: null
                    },
                    {
                        id: 'service',
                        name: 'Life of Service',
                        description: 'Make contribution your way of life',
                        questIds: ['saint_ongoing', 'saint_fundraise', 'saint_impact'],
                        satisfiedQuests: [],
                        completed: false,
                        completedDate: null
                    }
                ],
                completionReward: {
                    achievementId: 'path_saint',
                    merit: 'Living Saint',
                    description: 'Your generosity transforms lives!'
                },
                completed: false,
                completedDate: null
            },

            // 9. SECRET GARDEN 🌿 - Physical Environment
            {
                id: 'secret-garden',
                name: 'Secret Garden',
                description: 'Create a beautiful, nurturing physical environment',
                icon: '🌿',
                stages: [
                    {
                        id: 'clearing',
                        name: 'Clearing Space',
                        description: 'Declutter and organize',
                        questIds: ['declutter', 'deep_clean', 'tidy_space'],
                        satisfiedQuests: [],
                        completed: false,
                        completedDate: null
                    },
                    {
                        id: 'nurturing',
                        name: 'Nurturing Space',
                        description: 'Maintain and improve your environment',
                        questIds: ['home_repair', 'reno_task', 'garden_work', 'home_decor'],
                        satisfiedQuests: [],
                        completed: false,
                        completedDate: null
                    },
                    {
                        id: 'sanctuary',
                        name: 'Creating Sanctuary',
                        description: 'Transform your space into a haven',
                        questIds: ['home_room_makeover', 'home_outdoor', 'home_guest_ready'],
                        satisfiedQuests: [],
                        completed: false,
                        completedDate: null
                    }
                ],
                completionReward: {
                    achievementId: 'path_garden',
                    merit: 'Sanctuary Keeper',
                    description: 'Your home is a beautiful sanctuary!'
                },
                completed: false,
                completedDate: null
            }
        ];
    }

    // ═══════════════════════════════════════════════════════════════
    // DEFAULT ACHIEVEMENTS
    // ═══════════════════════════════════════════════════════════════

    getDefaultAchievements() {
        return [
            // ─── BEGINNER ───────────────────────────────────────────
            {
                id: 'first_quest',
                name: 'First Quest',
                description: 'Complete your first quest',
                tier: 'beginner',
                trigger: { type: 'quest-count', questId: 'any', count: 1 },
                reward: null,
                completed: false,
                completedDate: null
            },
            {
                id: 'level_5',
                name: 'Novice Adventurer',
                description: 'Reach level 5 in any skill',
                tier: 'beginner',
                trigger: { type: 'skill-level', skill: 'any', level: 5 },
                reward: null,
                completed: false,
                completedDate: null
            },
            {
                id: 'streak_3',
                name: 'Streak Starter',
                description: '3-day streak on any skill',
                tier: 'beginner',
                trigger: { type: 'skill-streak', skill: 'any', streak: 3 },
                reward: null,
                completed: false,
                completedDate: null
            },
            {
                id: 'first_path_quest',
                name: 'Path Finder',
                description: 'Complete your first quest in any path',
                tier: 'beginner',
                trigger: { type: 'path-progress', pathId: 'any', questCount: 1 },
                reward: null,
                completed: false,
                completedDate: null
            },

            // ─── MEDIUM ─────────────────────────────────────────────
            {
                id: 'level_20',
                name: 'Skilled Adventurer',
                description: 'Reach level 20 in any skill',
                tier: 'medium',
                trigger: { type: 'skill-level', skill: 'any', level: 20 },
                reward: null,
                completed: false,
                completedDate: null
            },
            {
                id: 'streak_7',
                name: 'Dedicated',
                description: '7-day streak on any skill',
                tier: 'medium',
                trigger: { type: 'skill-streak', skill: 'any', streak: 7 },
                reward: null,
                completed: false,
                completedDate: null
            },
            {
                id: 'stage_complete',
                name: 'Stage Master',
                description: 'Complete a stage in any path',
                tier: 'medium',
                trigger: { type: 'path-stage', pathId: 'any', stageIndex: 0 },
                reward: null,
                completed: false,
                completedDate: null
            },
            {
                id: 'challenge_started',
                name: 'Challenge Accepted',
                description: 'Start your first challenge',
                tier: 'medium',
                trigger: { type: 'challenge-started', count: 1 },
                reward: null,
                completed: false,
                completedDate: null
            },

            // ─── HARD ───────────────────────────────────────────────
            {
                id: 'level_50',
                name: 'Expert Adventurer',
                description: 'Reach level 50 in any skill',
                tier: 'hard',
                trigger: { type: 'skill-level', skill: 'any', level: 50 },
                reward: null,
                completed: false,
                completedDate: null
            },
            {
                id: 'streak_30',
                name: 'Iron Will',
                description: '30-day streak on any skill',
                tier: 'hard',
                trigger: { type: 'skill-streak', skill: 'any', streak: 30 },
                reward: null,
                completed: false,
                completedDate: null
            },
            {
                id: '75_hard_complete',
                name: '75 Hard Survivor',
                description: 'Complete the full 75 Hard challenge',
                tier: 'hard',
                trigger: { type: 'challenge-complete', challengeId: '75-hard', totalPeriods: 75 },
                reward: { merit: 'Iron Mind' },
                completed: false,
                completedDate: null
            },
            {
                id: 'challenge_streak_10',
                name: 'Consistent Challenger',
                description: 'Reach a 10-period streak on any challenge',
                tier: 'hard',
                trigger: { type: 'challenge-streak', challengeId: 'any', streak: 10 },
                reward: null,
                completed: false,
                completedDate: null
            },

            // ─── ELITE ──────────────────────────────────────────────
            {
                id: 'skill_cape',
                name: 'Skill Cape',
                description: 'Reach level 99 in any skill',
                tier: 'elite',
                trigger: { type: 'skill-level', skill: 'any', level: 99 },
                reward: { merit: 'Master' },
                completed: false,
                completedDate: null
            },
            {
                id: 'path_complete_any',
                name: 'Path Master',
                description: 'Complete any path',
                tier: 'elite',
                trigger: { type: 'path-complete', pathId: 'any' },
                reward: null,
                completed: false,
                completedDate: null
            },
            {
                id: 'streak_100',
                name: 'Century Streak',
                description: '100-day streak on any skill',
                tier: 'elite',
                trigger: { type: 'skill-streak', skill: 'any', streak: 100 },
                reward: { merit: 'Unstoppable' },
                completed: false,
                completedDate: null
            },

            // ─── GRANDMASTER ────────────────────────────────────────
            {
                id: 'path_entrepreneur',
                name: 'Entrepreneur',
                description: 'Complete the Entrepreneur Path',
                tier: 'grandmaster',
                trigger: { type: 'path-complete', pathId: 'entrepreneur' },
                reward: { merit: 'Entrepreneur' },
                completed: false,
                completedDate: null
            },
            {
                id: 'path_culinary',
                name: 'Culinary Master',
                description: 'Complete the Culinary Master Path',
                tier: 'grandmaster',
                trigger: { type: 'path-complete', pathId: 'culinary-master' },
                reward: { merit: 'Chef' },
                completed: false,
                completedDate: null
            },
            {
                id: 'path_artistic',
                name: 'Artistic Visionary',
                description: 'Complete the Artistic Visionary Path',
                tier: 'grandmaster',
                trigger: { type: 'path-complete', pathId: 'artistic-visionary' },
                reward: { merit: 'Visionary' },
                completed: false,
                completedDate: null
            },
            {
                id: 'path_influencer',
                name: 'Lifestyle Influencer',
                description: 'Complete the Lifestyle Influencer Path',
                tier: 'grandmaster',
                trigger: { type: 'path-complete', pathId: 'lifestyle-influencer' },
                reward: { merit: 'Influencer' },
                completed: false,
                completedDate: null
            },
            {
                id: 'path_fitness',
                name: 'Fitness Goddess',
                description: 'Complete the Fitness Goddess Path',
                tier: 'grandmaster',
                trigger: { type: 'path-complete', pathId: 'fitness-goddess' },
                reward: { merit: 'Fitness Goddess' },
                completed: false,
                completedDate: null
            },
            {
                id: 'path_lover',
                name: 'Lover Girl',
                description: 'Complete the Lover Girl Path',
                tier: 'grandmaster',
                trigger: { type: 'path-complete', pathId: 'lover-girl' },
                reward: { merit: 'Lover Girl' },
                completed: false,
                completedDate: null
            },
            {
                id: 'path_soul',
                name: 'Soul Master',
                description: 'Complete the Soul Work Path',
                tier: 'grandmaster',
                trigger: { type: 'path-complete', pathId: 'soul-work' },
                reward: { merit: 'Sage' },
                completed: false,
                completedDate: null
            },
            {
                id: 'path_saint',
                name: 'Living Saint',
                description: 'Complete the Living Saint Path',
                tier: 'grandmaster',
                trigger: { type: 'path-complete', pathId: 'living-saint' },
                reward: { merit: 'Living Saint' },
                completed: false,
                completedDate: null
            },
            {
                id: 'path_garden',
                name: 'Sanctuary Keeper',
                description: 'Complete the Secret Garden Path',
                tier: 'grandmaster',
                trigger: { type: 'path-complete', pathId: 'secret-garden' },
                reward: { merit: 'Sanctuary Keeper' },
                completed: false,
                completedDate: null
            },
            {
                id: 'all_99',
                name: 'Completionist',
                description: 'Reach level 99 in all skills',
                tier: 'grandmaster',
                trigger: { type: 'all-skills-level', level: 99 },
                reward: { merit: 'Completionist' },
                completed: false,
                completedDate: null
            }
        ];
    }

    // ═══════════════════════════════════════════════════════════════
    // CHALLENGE TEMPLATES
    // ═══════════════════════════════════════════════════════════════

    getChallengeTemplates() {
        return {
            // ─── DAILY CHALLENGE ───────────────────────────────────────
            '75-hard': {
                name: '75 Hard Challenge',
                description: 'Complete 7 daily tasks for 75 consecutive days. Miss one? Start over.',
                icon: '⚔️',
                interval: { value: 1, unit: 'days' },
                quests: [
                    { id: '75h_workout1', name: 'First 45-min workout', frequency: 'daily', rewards: [{ skill: 'athleticism', xp: 40 }] },
                    { id: '75h_workout2', name: 'Second 45-min workout (outdoor)', frequency: 'daily', rewards: [{ skill: 'athleticism', xp: 40 }, { skill: 'innerPeace', xp: 10 }] },
                    { id: '75h_water', name: 'Drink gallon of water', frequency: 'daily', rewards: [{ skill: 'athleticism', xp: 20 }] },
                    { id: '75h_read', name: 'Read 10 pages nonfiction', frequency: 'daily', rewards: [{ skill: 'innerPeace', xp: 30 }] },
                    { id: '75h_photo', name: 'Take progress photo', frequency: 'daily', rewards: [{ skill: 'influence', xp: 15 }] },
                    { id: '75h_diet', name: 'Follow diet (no cheat meals)', frequency: 'daily', rewards: [{ skill: 'athleticism', xp: 25 }] },
                    { id: '75h_alcohol', name: 'No alcohol', frequency: 'daily', rewards: [{ skill: 'innerPeace', xp: 20 }] }
                ]
            },

            // ─── PATH CHALLENGES (Monthly, 3 quests each) ──────────────

            // 🚀 Entrepreneur Path
            'entrepreneur-monthly': {
                name: 'Moonshot Month',
                description: 'Build your business empire one month at a time',
                icon: '🚀',
                pathId: 'entrepreneur',
                interval: { value: 1, unit: 'months' },
                existingQuestIds: ['dev_work'],
                quests: [
                    { id: 'ent_deep_work', name: 'Deep work session (2+ hrs)', frequency: 'monthly', rewards: [{ skill: 'business', xp: 75 }] },
                    { id: 'ent_learn', name: 'Learn new business skill', frequency: 'monthly', rewards: [{ skill: 'business', xp: 50 }] }
                ]
            },

            // 💪 Fitness Goddess Path
            'fitness-monthly': {
                name: 'Fitness Goddess Month',
                description: 'Push your limits and build your strongest self',
                icon: '💪',
                pathId: 'fitness-goddess',
                interval: { value: 1, unit: 'months' },
                existingQuestIds: ['fitness_milestone'],
                quests: [
                    { id: 'fit_pr', name: 'Set a personal record', frequency: 'monthly', rewards: [{ skill: 'athleticism', xp: 100 }] },
                    { id: 'fit_challenge', name: 'Complete a fitness challenge', frequency: 'monthly', rewards: [{ skill: 'athleticism', xp: 75 }] }
                ]
            },

            // 🍳 Culinary Master Path
            'culinary-monthly': {
                name: 'Culinary Quest',
                description: 'Master your kitchen one dish at a time',
                icon: '🍳',
                pathId: 'culinary-master',
                interval: { value: 1, unit: 'months' },
                existingQuestIds: ['new_recipe'],
                quests: [
                    { id: 'cul_cuisine', name: 'Cook a cuisine you\'ve never tried', frequency: 'monthly', rewards: [{ skill: 'culinary', xp: 75 }] },
                    { id: 'cul_dinner_party', name: 'Host a dinner for friends', frequency: 'monthly', rewards: [{ skill: 'culinary', xp: 50 }, { skill: 'friendships', xp: 50 }] }
                ]
            },

            // 🎨 Artistic Visionary Path
            'artistic-monthly': {
                name: 'Creative Sprint',
                description: 'Express yourself through art every month',
                icon: '🎨',
                pathId: 'artistic-visionary',
                interval: { value: 1, unit: 'months' },
                existingQuestIds: ['art_project'],
                quests: [
                    { id: 'art_new_medium', name: 'Try a new artistic medium', frequency: 'monthly', rewards: [{ skill: 'artistry', xp: 75 }] },
                    { id: 'art_share', name: 'Share your art publicly', frequency: 'monthly', rewards: [{ skill: 'artistry', xp: 40 }, { skill: 'influence', xp: 35 }] }
                ]
            },

            // 💕 Lover Girl Path
            'lovergirl-monthly': {
                name: 'Love & Connection',
                description: 'Nurture your relationships every month',
                icon: '💕',
                pathId: 'lover-girl',
                interval: { value: 1, unit: 'months' },
                existingQuestIds: ['date_night'],
                quests: [
                    { id: 'love_surprise', name: 'Surprise Your Partner with something thoughtful', frequency: 'monthly', rewards: [{ skill: 'partnership', xp: 75 }] },
                    { id: 'love_adventure', name: 'Try something new together', frequency: 'monthly', rewards: [{ skill: 'partnership', xp: 50 }, { skill: 'friendships', xp: 25 }] }
                ]
            },

            // 🧘 Soul Work Path
            'soulwork-monthly': {
                name: 'Inner Journey',
                description: 'Deepen your spiritual practice monthly',
                icon: '🧘',
                pathId: 'soul-work',
                interval: { value: 1, unit: 'months' },
                existingQuestIds: ['journal'],
                quests: [
                    { id: 'soul_retreat', name: 'Mini retreat day (phone-free)', frequency: 'monthly', rewards: [{ skill: 'innerPeace', xp: 100 }] },
                    { id: 'soul_meditation', name: 'Complete 10 meditation sessions', frequency: 'monthly', rewards: [{ skill: 'innerPeace', xp: 75 }] }
                ]
            },

            // 🤍 Living Saint Path
            'saint-monthly': {
                name: 'Giving Heart',
                description: 'Spread kindness and generosity monthly',
                icon: '🤍',
                pathId: 'living-saint',
                interval: { value: 1, unit: 'months' },
                existingQuestIds: ['volunteer'],
                quests: [
                    { id: 'saint_cause', name: 'Support a cause you believe in', frequency: 'monthly', rewards: [{ skill: 'generosity', xp: 75 }] },
                    { id: 'saint_mentor', name: 'Help someone with their goals', frequency: 'monthly', rewards: [{ skill: 'generosity', xp: 50 }, { skill: 'friendships', xp: 25 }] }
                ]
            },

            // 🌿 Secret Garden Path
            'garden-monthly': {
                name: 'Sanctuary Builder',
                description: 'Create your perfect home sanctuary',
                icon: '🌿',
                pathId: 'secret-garden',
                interval: { value: 1, unit: 'months' },
                existingQuestIds: ['reno_task'],
                quests: [
                    { id: 'garden_project', name: 'Complete a home improvement project', frequency: 'monthly', rewards: [{ skill: 'homeCraft', xp: 100 }] },
                    { id: 'garden_organize', name: 'Organize/beautify a space', frequency: 'monthly', rewards: [{ skill: 'homeCraft', xp: 50 }, { skill: 'innerPeace', xp: 25 }] }
                ]
            },

            // 📸 Lifestyle Influencer Path
            'influencer-monthly': {
                name: 'Content Creator',
                description: 'Build your authentic voice monthly',
                icon: '📸',
                pathId: 'lifestyle-influencer',
                interval: { value: 1, unit: 'months' },
                existingQuestIds: ['content_create'],
                quests: [
                    { id: 'inf_viral', name: 'Create standout content piece', frequency: 'monthly', rewards: [{ skill: 'influence', xp: 75 }, { skill: 'artistry', xp: 25 }] },
                    { id: 'inf_engage', name: 'Engage with your community', frequency: 'monthly', rewards: [{ skill: 'influence', xp: 50 }, { skill: 'friendships', xp: 25 }] }
                ]
            }
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // DATA MIGRATION
    // ═══════════════════════════════════════════════════════════════

    migrateData() {
        const version = this.data.version || 1;

        if (version < 2) {
            console.log('Migrating data from v1 to v2...');
            
            // Try to backup old data (skip if storage full or backup exists)
            if (!localStorage.getItem('lifeRPGData_backup_v1')) {
                try {
                    localStorage.setItem('lifeRPGData_backup_v1', JSON.stringify(this.data));
                    console.log('Backup created successfully');
                } catch (e) {
                    console.warn('Could not create backup (storage full), continuing with migration...');
                }
            }

            // 1. Convert quest rewards to array format
            if (this.data.quests) {
                this.data.quests = this.data.quests.map(quest => {
                    if (!quest.rewards && quest.skill && quest.xp) {
                        quest.rewards = [{ skill: quest.skill, xp: quest.xp }];
                        delete quest.skill;
                        delete quest.xp;
                    }
                    if (!quest.frequency) {
                        quest.frequency = quest.type || 'daily';
                        delete quest.type;
                    }
                    quest.challengeId = quest.challengeId || null;
                    quest.custom = quest.custom || false;
                    quest.active = quest.active !== false;
                    delete quest.tags; // We'll use paths now
                    delete quest.category;
                    return quest;
                });
            }

            // 2. Build completion log from old completedToday
            if (!this.data.completionLog) {
                this.data.completionLog = {
                    completions: [],
                    completedToday: [],
                    completedThisWeek: [],
                    completedThisMonth: [],
                    completedEver: []
                };

                // Convert old completedToday entries
                if (this.data.completedToday && Array.isArray(this.data.completedToday)) {
                    this.data.completionLog.completions = this.data.completedToday.map(c => ({
                        questId: c.questId,
                        timestamp: c.timestamp || new Date().toISOString(),
                        xpAwarded: [{ skill: c.skill, xp: c.xp }]
                    }));
                }
                delete this.data.completedToday;
            }

            // 3. Create paths if they don't exist
            if (!this.data.paths) {
                this.data.paths = this.getDefaultPaths();
            }

            // 4. Convert achievements to flat array with triggers
            if (this.data.achievements && !Array.isArray(this.data.achievements)) {
                const oldAchievements = this.data.achievements;
                const newAchievements = this.getDefaultAchievements();
                
                // Preserve completion status from old achievements
                ['beginner', 'medium', 'hard', 'elite', 'grandmaster'].forEach(tier => {
                    if (oldAchievements[tier]) {
                        oldAchievements[tier].forEach(oldAch => {
                            const newAch = newAchievements.find(a => a.id === oldAch.id);
                            if (newAch && oldAch.completed) {
                                newAch.completed = true;
                                newAch.completedDate = oldAch.date || new Date().toISOString();
                            }
                        });
                    }
                });
                
                this.data.achievements = newAchievements;
            }

            // 5. Ensure challenges array exists and is in new format
            if (!this.data.challenges) {
                this.data.challenges = [];
            }

            // Convert old challenge format if needed
            this.data.challenges = this.data.challenges.map(challenge => {
                // Skip if already in new format
                if (challenge.questIds && challenge.currentPeriod) {
                    return challenge;
                }
                // Try to convert old format
                try {
                    if (challenge.type === '75hard' || challenge.checklist) {
                        return this.convertOld75HardChallenge(challenge);
                    }
                } catch (e) {
                    console.warn('Could not convert challenge, creating fresh:', e);
                    // Return a fresh 75-hard challenge structure
                    return this.createFresh75HardChallenge(challenge.day || 1);
                }
                return challenge;
            });

            // 6. Ensure skills have new streak properties
            Object.keys(this.data.skills).forEach(skillId => {
                const skill = this.data.skills[skillId];
                skill.lastAwardedDate = skill.lastAwardedDate || skill.lastCompleted || null;
                delete skill.lastCompleted;
            });

            this.data.version = 2;
            console.log('v1 to v2 migration complete!');
        }

        // Migration from v2 to v3: New 10-skill system
        if (this.data.version < 3) {
            console.log('Migrating data from v2 to v3 (new skill system)...');

            // Skill mapping: old -> new
            const skillMapping = {
                strength: 'athleticism',
                creativity: 'artistry',
                intelligence: 'business',
                charisma: 'friendships',  // Split: some goes to partnership
                wisdom: 'innerPeace',
                constitution: 'homeCraft'
            };

            // Create new skills structure
            const newSkills = {
                athleticism: { xp: 0, currentStreak: 0, longestStreak: 0, lastAwardedDate: null },
                culinary: { xp: 0, currentStreak: 0, longestStreak: 0, lastAwardedDate: null },
                artistry: { xp: 0, currentStreak: 0, longestStreak: 0, lastAwardedDate: null },
                business: { xp: 0, currentStreak: 0, longestStreak: 0, lastAwardedDate: null },
                partnership: { xp: 0, currentStreak: 0, longestStreak: 0, lastAwardedDate: null },
                friendships: { xp: 0, currentStreak: 0, longestStreak: 0, lastAwardedDate: null },
                innerPeace: { xp: 0, currentStreak: 0, longestStreak: 0, lastAwardedDate: null },
                homeCraft: { xp: 0, currentStreak: 0, longestStreak: 0, lastAwardedDate: null },
                generosity: { xp: 0, currentStreak: 0, longestStreak: 0, lastAwardedDate: null },
                influence: { xp: 0, currentStreak: 0, longestStreak: 0, lastAwardedDate: null }
            };

            // Transfer XP from old skills to new
            if (this.data.skills) {
                Object.keys(this.data.skills).forEach(oldSkill => {
                    const oldData = this.data.skills[oldSkill];
                    const newSkill = skillMapping[oldSkill];
                    
                    if (newSkill && newSkills[newSkill]) {
                        newSkills[newSkill].xp += oldData.xp || 0;
                        newSkills[newSkill].currentStreak = Math.max(newSkills[newSkill].currentStreak, oldData.currentStreak || 0);
                        newSkills[newSkill].longestStreak = Math.max(newSkills[newSkill].longestStreak, oldData.longestStreak || 0);
                        if (oldData.lastAwardedDate) {
                            newSkills[newSkill].lastAwardedDate = oldData.lastAwardedDate;
                        }
                    }

                    // Special handling: split charisma XP between friendships and partnership
                    if (oldSkill === 'charisma' && oldData.xp) {
                        newSkills.partnership.xp += Math.floor(oldData.xp * 0.5);
                        newSkills.friendships.xp += Math.floor(oldData.xp * 0.5);
                    }

                    // Split some creativity XP to culinary
                    if (oldSkill === 'creativity' && oldData.xp) {
                        newSkills.culinary.xp += Math.floor(oldData.xp * 0.2);
                    }

                    // Split some wisdom XP to generosity
                    if (oldSkill === 'wisdom' && oldData.xp) {
                        newSkills.generosity.xp += Math.floor(oldData.xp * 0.2);
                    }

                    // Add some XP to influence from creativity
                    if (oldSkill === 'creativity' && oldData.xp) {
                        newSkills.influence.xp += Math.floor(oldData.xp * 0.1);
                    }
                });
            }

            this.data.skills = newSkills;

            // Update quest rewards to new skill names
            if (this.data.quests) {
                const questSkillMapping = {
                    strength: 'athleticism',
                    creativity: 'artistry',
                    intelligence: 'business',
                    charisma: 'friendships',
                    wisdom: 'innerPeace',
                    constitution: 'homeCraft'
                };

                this.data.quests.forEach(quest => {
                    if (quest.rewards) {
                        quest.rewards = quest.rewards.map(reward => {
                            if (questSkillMapping[reward.skill]) {
                                return { ...reward, skill: questSkillMapping[reward.skill] };
                            }
                            return reward;
                        });
                    }
                });
            }

            this.data.version = 3;
            console.log('v2 to v3 migration complete!');
        }

        // Ensure settings object exists (for all versions)
        if (!this.data.settings) {
            this.data.settings = {
                characterName: 'Christina',
                partnerName: 'Your Partner',
                soundEnabled: true
            };
        }

        // Apply partner name to quests if it's been customized
        if (this.data.settings.partnerName && this.data.settings.partnerName !== 'Your Partner') {
            this.updatePartnerQuestNames();
        }

        // Ensure profile exists (for all versions) - NEW for v1.3
        if (!this.data.settings.profile) {
            console.log('Profile missing, creating one...');
            
            // Detect if this is truly a new user or an existing user without a profile
            const hasProgress = 
                this.data.completionLog?.completions?.length > 0 ||
                Object.values(this.data.skills || {}).some(skill => skill.xp > 0) ||
                (this.data.loginStreak?.current || 0) > 0;
            
            this.data.settings.profile = {
                // Migrate existing data if available
                name: this.data.settings.characterName || null,
                partnerName: this.data.settings.partnerName || null,
                
                // Set defaults
                primaryGoals: [],
                activePaths: [],
                usageFrequency: null,
                gender: null,
                ageRange: null,
                relationshipStatus: this.data.settings.partnerName && this.data.settings.partnerName !== 'Your Partner' ? 'relationship' : null,
                hasChildren: false,
                numberOfChildren: 0,
                childrenAges: [],
                caregivingResponsibilities: [],
                workSituation: null,
                livingSituation: null,
                
                // Only mark onboarding as completed if user has actual progress
                onboardingCompleted: hasProgress,
                onboardingDate: hasProgress ? new Date().toISOString() : null,
                lastWelcomeScreen: null
            };
            
            console.log('Profile created. Has progress:', hasProgress, '→ Skip onboarding:', hasProgress);
        }

        // Always rebuild completion caches after loading
        this.rebuildCompletionCaches();
        this.saveData();
    }

    convertOld75HardChallenge(oldChallenge) {
        // Create challenge quests if they don't exist
        const template = this.getChallengeTemplates()['75-hard'];
        template.quests.forEach(questDef => {
            if (!this.data.quests.find(q => q.id === questDef.id)) {
                this.data.quests.push({
                    ...questDef,
                    challengeId: '75-hard',
                    custom: false,
                    active: true
                });
            }
        });

        const today = new Date().toISOString().split('T')[0];
        
        // Safely extract completed quests from old checklist
        let completedQuests = [];
        if (oldChallenge.checklist && Array.isArray(oldChallenge.checklist)) {
            completedQuests = oldChallenge.checklist
                .filter(item => item && item.completed)
                .map(item => ({
                    questId: this.mapOldChecklistId(item.id),
                    completedDate: new Date().toISOString()
                }));
        } else if (oldChallenge.checklist && typeof oldChallenge.checklist === 'object') {
            // Handle object format {id: completed}
            completedQuests = Object.entries(oldChallenge.checklist)
                .filter(([id, completed]) => completed)
                .map(([id]) => ({
                    questId: this.mapOldChecklistId(id),
                    completedDate: new Date().toISOString()
                }));
        }
        
        return {
            id: '75-hard',
            name: template.name,
            description: template.description,
            icon: template.icon,
            questIds: template.quests.map(q => q.id),
            interval: template.interval,
            currentPeriod: {
                startDate: today,
                endDate: today,
                completedQuests: completedQuests
            },
            currentStreak: oldChallenge.day || oldChallenge.currentStreak || 1,
            longestStreak: oldChallenge.day || oldChallenge.longestStreak || 1,
            history: oldChallenge.history || [],
            active: oldChallenge.active !== false
        };
    }

    createFresh75HardChallenge(currentDay = 1) {
        const template = this.getChallengeTemplates()['75-hard'];
        
        // Create challenge quests if they don't exist
        template.quests.forEach(questDef => {
            if (!this.data.quests.find(q => q.id === questDef.id)) {
                this.data.quests.push({
                    ...questDef,
                    challengeId: '75-hard',
                    custom: false,
                    active: true
                });
            }
        });

        const today = new Date().toISOString().split('T')[0];
        
        return {
            id: '75-hard',
            name: template.name,
            description: template.description,
            icon: template.icon,
            questIds: template.quests.map(q => q.id),
            interval: template.interval,
            currentPeriod: {
                startDate: today,
                endDate: today,
                completedQuests: []
            },
            currentStreak: currentDay,
            longestStreak: currentDay,
            history: [],
            active: true
        };
    }

    mapOldChecklistId(oldId) {
        const mapping = {
            '75h_workout1': '75h_workout1',
            '75h_workout2': '75h_workout2',
            '75h_water': '75h_water',
            '75h_read': '75h_read',
            '75h_photo': '75h_photo',
            '75h_diet': '75h_diet',
            '75h_alcohol': '75h_alcohol',
            'workout1': '75h_workout1',
            'workout2': '75h_workout2',
            'water': '75h_water',
            'read': '75h_read',
            'photo': '75h_photo',
            'diet': '75h_diet',
            'alcohol': '75h_alcohol'
        };
        return mapping[oldId] || oldId;
    }

    // ═══════════════════════════════════════════════════════════════
    // COMPLETION CACHE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    rebuildCompletionCaches() {
        const now = new Date();
        const todayStr = now.toDateString();
        
        // Get start of current week (Sunday)
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        
        // Get start of current month
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        this.data.completionLog.completedToday = [];
        this.data.completionLog.completedThisWeek = [];
        this.data.completionLog.completedThisMonth = [];
        this.data.completionLog.completedEver = [];

        this.data.completionLog.completions.forEach(completion => {
            const completionDate = new Date(completion.timestamp);
            
            // Today
            if (completionDate.toDateString() === todayStr) {
                if (!this.data.completionLog.completedToday.includes(completion.questId)) {
                    this.data.completionLog.completedToday.push(completion.questId);
                }
            }
            
            // This week
            if (completionDate >= weekStart) {
                if (!this.data.completionLog.completedThisWeek.includes(completion.questId)) {
                    this.data.completionLog.completedThisWeek.push(completion.questId);
                }
            }
            
            // This month
            if (completionDate >= monthStart) {
                if (!this.data.completionLog.completedThisMonth.includes(completion.questId)) {
                    this.data.completionLog.completedThisMonth.push(completion.questId);
                }
            }

            // One-time quests completed ever
            const quest = this.data.quests.find(q => q.id === completion.questId);
            if (quest && quest.frequency === 'one-time') {
                if (!this.data.completionLog.completedEver.includes(completion.questId)) {
                    this.data.completionLog.completedEver.push(completion.questId);
                }
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // RESET HANDLING
    // ═══════════════════════════════════════════════════════════════

    checkResets() {
        const now = new Date();
        const today = now.toDateString();

        // Check if day has changed
        if (this.data.lastActiveDate !== today) {
            console.log('New day detected, processing resets...');
            
            // Update skill streaks (check if they broke)
            this.checkSkillStreaks();
            
            // Process challenge period ends
            this.processChallengePeriods();
            
            // Rebuild completion caches
            this.rebuildCompletionCaches();
            
            this.data.lastActiveDate = today;
            this.saveData();
        }
    }

    checkSkillStreaks() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        Object.keys(this.data.skills).forEach(skillId => {
            const skill = this.data.skills[skillId];
            if (skill.lastAwardedDate && skill.lastAwardedDate !== yesterdayStr) {
                // Streak broken (unless it was already 0)
                if (skill.currentStreak > 0) {
                    console.log(`Streak broken for ${skillId}`);
                    skill.currentStreak = 0;
                }
            }
        });
    }

    processChallengePeriods() {
        const now = new Date();

        this.data.challenges.forEach(challenge => {
            if (!challenge.active) return;

            const periodEnd = new Date(challenge.currentPeriod.endDate + 'T23:59:59');
            
            if (now > periodEnd) {
                this.advanceChallengePeriod(challenge);
            }
        });
    }

    advanceChallengePeriod(challenge) {
        const allCompleted = challenge.questIds.every(qId =>
            challenge.currentPeriod.completedQuests.some(cq => cq.questId === qId)
        );

        // Archive current period
        challenge.history.push({
            startDate: challenge.currentPeriod.startDate,
            endDate: challenge.currentPeriod.endDate,
            completedQuests: [...challenge.currentPeriod.completedQuests],
            success: allCompleted
        });

        // Update streak
        if (allCompleted) {
            challenge.currentStreak++;
            challenge.longestStreak = Math.max(challenge.longestStreak, challenge.currentStreak);
            console.log(`Challenge "${challenge.name}" streak: ${challenge.currentStreak}`);
        } else {
            console.log(`Challenge "${challenge.name}" streak broken!`);
            challenge.currentStreak = 0;
        }

        // Start new period
        challenge.currentPeriod = this.createNewPeriod(challenge.interval);
        
        // Check for challenge completion achievements
        this.checkAchievements();
    }

    createNewPeriod(interval) {
        const now = new Date();
        const start = now.toISOString().split('T')[0];
        
        let end = new Date(now);
        switch (interval.unit) {
            case 'days':
                end.setDate(end.getDate() + interval.value - 1);
                break;
            case 'weeks':
                end.setDate(end.getDate() + (interval.value * 7) - 1);
                break;
            case 'months':
                end.setMonth(end.getMonth() + interval.value);
                end.setDate(end.getDate() - 1);
                break;
        }

        return {
            startDate: start,
            endDate: end.toISOString().split('T')[0],
            completedQuests: []
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // QUEST COMPLETION - THE CORE FLOW
    // ═══════════════════════════════════════════════════════════════

    canCompleteQuest(quest) {
        switch (quest.frequency) {
            case 'daily':
                return !this.data.completionLog.completedToday.includes(quest.id);
            case 'weekly':
                return !this.data.completionLog.completedThisWeek.includes(quest.id);
            case 'monthly':
                return !this.data.completionLog.completedThisMonth.includes(quest.id);
            case 'one-time':
                return !this.data.completionLog.completedEver.includes(quest.id);
            case 'as-needed':
                return true;
            default:
                return true;
        }
    }

    completeQuest(questId, photoData = null) {
        const quest = this.data.quests.find(q => q.id === questId);
        if (!quest || !this.canCompleteQuest(quest)) {
            console.log('Cannot complete quest:', questId);
            this.playSound('error');
            this.triggerHaptic('error');
            return;
        }

        console.log('Completing quest:', quest.name);
        const results = {
            xpGained: [],
            levelUps: [],
            pathProgress: [],
            challengeProgress: [],
            achievements: []
        };

        // Apply comeback bonus multiplier if active
        const xpMultiplier = (this.data.comebackBonus?.active) ? this.data.comebackBonus.multiplier : 1;

        // 1. Award XP to all skills
        quest.rewards.forEach(reward => {
            const skill = this.data.skills[reward.skill];
            const oldLevel = this.getLevelFromXP(skill.xp);
            
            const actualXP = Math.floor(reward.xp * xpMultiplier);
            skill.xp += actualXP;
            results.xpGained.push({ skill: reward.skill, xp: actualXP });
            
            const newLevel = this.getLevelFromXP(skill.xp);
            if (newLevel > oldLevel) {
                results.levelUps.push({ skill: reward.skill, level: newLevel });
            }

            // Update skill streak
            this.updateSkillStreak(reward.skill);
        });

        // 2. Log completion (with optional photo)
        const completion = {
            questId: quest.id,
            timestamp: new Date().toISOString(),
            xpAwarded: quest.rewards.map(r => ({ skill: r.skill, xp: Math.floor(r.xp * xpMultiplier) })),
            photo: photoData // { dataUrl, caption } or null
        };
        this.data.completionLog.completions.push(completion);
        
        // Update caches
        if (!this.data.completionLog.completedToday.includes(quest.id)) {
            this.data.completionLog.completedToday.push(quest.id);
        }
        if (!this.data.completionLog.completedThisWeek.includes(quest.id)) {
            this.data.completionLog.completedThisWeek.push(quest.id);
        }
        if (!this.data.completionLog.completedThisMonth.includes(quest.id)) {
            this.data.completionLog.completedThisMonth.push(quest.id);
        }
        if (quest.frequency === 'one-time') {
            this.data.completionLog.completedEver.push(quest.id);
        }

        // 3. Update path progress
        results.pathProgress = this.updatePathProgress(questId);

        // 4. Update challenge progress
        results.challengeProgress = this.updateChallengeProgress(questId);

        // 5. Check achievements and badges
        results.achievements = this.checkAchievements();
        this.checkSpecialBadges(results);

        // 6. Save
        this.saveData();

        // 7. Play sounds and haptics
        if (results.levelUps.length > 0) {
            this.playSound('levelUp');
            this.triggerHaptic('levelUp');
        } else {
            this.playSound('complete');
            this.triggerHaptic('success');
        }

        // 8. Render and show notifications
        this.renderAll();
        this.updateProgressRings();
        this.showCompletionNotifications(quest, results);

        return results;
    }

    uncompleteQuest(questId) {
        const quest = this.data.quests.find(q => q.id === questId);
        if (!quest) return;

        console.log('Undoing quest completion:', quest.name);

        // Find the most recent completion for this quest today
        const today = new Date().toDateString();
        const completionIndex = this.data.completionLog.completions.findLastIndex(c => 
            c.questId === questId && new Date(c.timestamp).toDateString() === today
        );

        if (completionIndex === -1) {
            this.showToast('No completion found to undo', 'error');
            return;
        }

        const completion = this.data.completionLog.completions[completionIndex];

        // 1. Remove XP from skills
        if (completion.xpAwarded) {
            completion.xpAwarded.forEach(reward => {
                const skill = this.data.skills[reward.skill];
                if (skill) {
                    skill.xp = Math.max(0, skill.xp - reward.xp);
                }
            });
        }

        // 2. Remove from completion log
        this.data.completionLog.completions.splice(completionIndex, 1);

        // 3. Remove from caches (only if no other completions today/this period)
        const hasOtherCompletionToday = this.data.completionLog.completions.some(c => 
            c.questId === questId && new Date(c.timestamp).toDateString() === today
        );
        if (!hasOtherCompletionToday) {
            const todayIndex = this.data.completionLog.completedToday.indexOf(questId);
            if (todayIndex > -1) this.data.completionLog.completedToday.splice(todayIndex, 1);
        }

        // Check weekly
        const thisWeekStart = this.getStartOfWeek(new Date());
        const hasOtherCompletionThisWeek = this.data.completionLog.completions.some(c => 
            c.questId === questId && new Date(c.timestamp) >= thisWeekStart
        );
        if (!hasOtherCompletionThisWeek) {
            const weekIndex = this.data.completionLog.completedThisWeek.indexOf(questId);
            if (weekIndex > -1) this.data.completionLog.completedThisWeek.splice(weekIndex, 1);
        }

        // Check monthly
        const thisMonthStart = new Date();
        thisMonthStart.setDate(1);
        thisMonthStart.setHours(0, 0, 0, 0);
        const hasOtherCompletionThisMonth = this.data.completionLog.completions.some(c => 
            c.questId === questId && new Date(c.timestamp) >= thisMonthStart
        );
        if (!hasOtherCompletionThisMonth) {
            const monthIndex = this.data.completionLog.completedThisMonth.indexOf(questId);
            if (monthIndex > -1) this.data.completionLog.completedThisMonth.splice(monthIndex, 1);
        }

        // One-time quests - remove from completedEver
        if (quest.frequency === 'one-time') {
            const everIndex = this.data.completionLog.completedEver.indexOf(questId);
            if (everIndex > -1) this.data.completionLog.completedEver.splice(everIndex, 1);
        }

        // 4. Update challenge progress (remove from current period)
        this.data.challenges.forEach(challenge => {
            if (challenge.questIds.includes(questId)) {
                const compIndex = challenge.currentPeriod.completedQuests.findIndex(cq => cq.questId === questId);
                if (compIndex > -1) {
                    challenge.currentPeriod.completedQuests.splice(compIndex, 1);
                }
            }
        });

        // 5. Save and render
        this.saveData();
        this.renderAll();
        this.updateProgressRings();
        this.playSound('undo');
        this.triggerHaptic('medium');
        this.showToast(`"${quest.name}" undone - XP removed`, 'info');
    }

    getStartOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
        d.setDate(diff);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    updateSkillStreak(skillId) {
        const skill = this.data.skills[skillId];
        const today = new Date().toDateString();
        
        if (skill.lastAwardedDate !== today) {
            // First XP for this skill today
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (skill.lastAwardedDate === yesterday.toDateString()) {
                // Continuing streak
                skill.currentStreak++;
            } else if (skill.lastAwardedDate !== today) {
                // Starting new streak
                skill.currentStreak = 1;
            }
            
            skill.longestStreak = Math.max(skill.longestStreak, skill.currentStreak);
            skill.lastAwardedDate = today;
        }
    }

    updatePathProgress(questId) {
        const updates = [];

        this.data.paths.forEach(path => {
            for (let i = 0; i < path.stages.length; i++) {
                const stage = path.stages[i];
                
                // Check if stage is unlocked (first stage or previous complete)
                const isUnlocked = i === 0 || path.stages[i - 1].completed;
                if (!isUnlocked) continue;

                // Check if quest is in this stage and not already satisfied
                if (stage.questIds.includes(questId) && !stage.satisfiedQuests.includes(questId)) {
                    stage.satisfiedQuests.push(questId);
                    updates.push({ path: path.name, stage: stage.name, quest: questId });

                    // Check if stage is now complete
                    if (stage.questIds.every(qId => stage.satisfiedQuests.includes(qId))) {
                        stage.completed = true;
                        stage.completedDate = new Date().toISOString();
                        updates.push({ path: path.name, stageComplete: stage.name });

                        // Check if path is now complete
                        if (path.stages.every(s => s.completed)) {
                            path.completed = true;
                            path.completedDate = new Date().toISOString();
                            updates.push({ pathComplete: path.name });
                        }
                    }
                }
            }
        });

        return updates;
    }

    updateChallengeProgress(questId) {
        const updates = [];

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
                completedDate: new Date().toISOString()
            });

            const completed = challenge.currentPeriod.completedQuests.length;
            const total = challenge.questIds.length;
            updates.push({
                challenge: challenge.name,
                questId,
                progress: `${completed}/${total}`
            });
        });

        return updates;
    }

    // ═══════════════════════════════════════════════════════════════
    // ACHIEVEMENT CHECKING
    // ═══════════════════════════════════════════════════════════════

    checkAchievements() {
        const newlyUnlocked = [];

        this.data.achievements.forEach(achievement => {
            if (achievement.completed) return;

            if (this.checkTrigger(achievement.trigger)) {
                achievement.completed = true;
                achievement.completedDate = new Date().toISOString();
                newlyUnlocked.push(achievement);

                // Apply bonus XP rewards
                if (achievement.reward?.bonusXp) {
                    achievement.reward.bonusXp.forEach(bonus => {
                        this.data.skills[bonus.skill].xp += bonus.xp;
                    });
                }

                console.log('Achievement unlocked:', achievement.name);
            }
        });

        return newlyUnlocked;
    }

    checkTrigger(trigger) {
        switch (trigger.type) {
            case 'skill-level':
                return this.checkSkillLevel(trigger.skill, trigger.level);
            
            case 'skill-streak':
                return this.checkSkillStreak(trigger.skill, trigger.streak);
            
            case 'all-skills-level':
                return this.checkAllSkillsLevel(trigger.level);
            
            case 'quest-count':
                return this.checkQuestCount(trigger.questId, trigger.count);
            
            case 'quest-sequence':
                return this.checkQuestSequence(trigger.questIds, trigger.sameDay);
            
            case 'path-progress':
                return this.checkPathProgress(trigger.pathId, trigger.questCount);
            
            case 'path-stage':
                return this.checkPathStage(trigger.pathId, trigger.stageIndex);
            
            case 'path-complete':
                return this.checkPathComplete(trigger.pathId);
            
            case 'challenge-started':
                return this.data.challenges.length >= trigger.count;
            
            case 'challenge-streak':
                return this.checkChallengeStreak(trigger.challengeId, trigger.streak);
            
            case 'challenge-complete':
                return this.checkChallengeComplete(trigger.challengeId, trigger.totalPeriods);
            
            case 'manual':
                return false; // Must be manually unlocked
            
            default:
                return false;
        }
    }

    checkSkillLevel(skillId, level) {
        if (skillId === 'any') {
            return Object.values(this.data.skills).some(s => this.getLevelFromXP(s.xp) >= level);
        }
        const skill = this.data.skills[skillId];
        return skill && this.getLevelFromXP(skill.xp) >= level;
    }

    checkSkillStreak(skillId, streak) {
        if (skillId === 'any') {
            return Object.values(this.data.skills).some(s => s.currentStreak >= streak);
        }
        const skill = this.data.skills[skillId];
        return skill && skill.currentStreak >= streak;
    }

    checkAllSkillsLevel(level) {
        return Object.values(this.data.skills).every(s => this.getLevelFromXP(s.xp) >= level);
    }

    checkQuestCount(questId, count) {
        if (questId === 'any') {
            return this.data.completionLog.completions.length >= count;
        }
        const questCompletions = this.data.completionLog.completions.filter(c => c.questId === questId);
        return questCompletions.length >= count;
    }

    checkQuestSequence(questIds, sameDay) {
        if (sameDay) {
            return questIds.every(qId => this.data.completionLog.completedToday.includes(qId));
        }
        // Just check if all have been completed ever
        return questIds.every(qId => 
            this.data.completionLog.completions.some(c => c.questId === qId)
        );
    }

    checkPathProgress(pathId, questCount) {
        const paths = pathId === 'any' ? this.data.paths : this.data.paths.filter(p => p.id === pathId);
        return paths.some(path => {
            const totalSatisfied = path.stages.reduce((sum, stage) => sum + stage.satisfiedQuests.length, 0);
            return totalSatisfied >= questCount;
        });
    }

    checkPathStage(pathId, stageIndex) {
        const paths = pathId === 'any' ? this.data.paths : this.data.paths.filter(p => p.id === pathId);
        return paths.some(path => path.stages[stageIndex]?.completed);
    }

    checkPathComplete(pathId) {
        if (pathId === 'any') {
            return this.data.paths.some(p => p.completed);
        }
        const path = this.data.paths.find(p => p.id === pathId);
        return path?.completed;
    }

    checkChallengeStreak(challengeId, streak) {
        if (challengeId === 'any') {
            return this.data.challenges.some(c => c.currentStreak >= streak);
        }
        const challenge = this.data.challenges.find(c => c.id === challengeId);
        return challenge && challenge.currentStreak >= streak;
    }

    checkChallengeComplete(challengeId, totalPeriods) {
        const challenge = this.data.challenges.find(c => c.id === challengeId);
        if (!challenge) return false;
        
        // Count successful periods in history plus current streak
        const successfulPeriods = challenge.history.filter(h => h.success).length + 
            (challenge.currentStreak > 0 ? challenge.currentStreak : 0);
        return successfulPeriods >= totalPeriods;
    }

    // ═══════════════════════════════════════════════════════════════
    // CHALLENGE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    startChallenge(templateId) {
        const templates = this.getChallengeTemplates();
        const template = templates[templateId];
        if (!template) {
            console.error('Unknown challenge template:', templateId);
            return;
        }

        // Check if already active
        if (this.data.challenges.find(c => c.id === templateId && c.active)) {
            alert('This challenge is already active!');
            return;
        }

        // Create challenge quests if template has them
        let questIds = template.existingQuestIds || [];
        
        if (template.quests) {
            template.quests.forEach(questDef => {
                // Add quest if it doesn't exist
                if (!this.data.quests.find(q => q.id === questDef.id)) {
                    this.data.quests.push({
                        id: questDef.id,
                        name: questDef.name,
                        frequency: questDef.frequency,
                        rewards: questDef.rewards,
                        challengeId: templateId,
                        custom: false,
                        active: true
                    });
                } else {
                    // Update existing quest to link to challenge
                    const existingQuest = this.data.quests.find(q => q.id === questDef.id);
                    existingQuest.challengeId = templateId;
                    existingQuest.active = true;
                }
            });
            questIds = template.quests.map(q => q.id);
        }

        // Create the challenge
        const challenge = {
            id: templateId,
            name: template.name,
            description: template.description,
            icon: template.icon,
            questIds: questIds,
            interval: template.interval,
            currentPeriod: this.createNewPeriod(template.interval),
            currentStreak: 0,
            longestStreak: 0,
            history: [],
            active: true
        };

        this.data.challenges.push(challenge);
        this.saveData();
        this.renderAll();
        
        // Check achievements
        this.checkAchievements();
        
        alert(`${template.name} started! Good luck! ${template.icon}`);
    }

    createCustomChallenge(name, description, icon, intervalValue, intervalUnit, questIds) {
        const id = 'custom_' + Date.now();
        
        const challenge = {
            id: id,
            name: name,
            description: description,
            icon: icon || '✨',
            questIds: questIds,
            interval: { value: intervalValue, unit: intervalUnit },
            currentPeriod: this.createNewPeriod({ value: intervalValue, unit: intervalUnit }),
            currentStreak: 0,
            longestStreak: 0,
            history: [],
            active: true
        };

        this.data.challenges.push(challenge);
        this.saveData();
        this.renderAll();
        this.checkAchievements();
        
        return challenge;
    }

    endChallenge(challengeId) {
        const challenge = this.data.challenges.find(c => c.id === challengeId);
        if (!challenge) return;

        if (!confirm(`End "${challenge.name}"? Your streak will be saved but the challenge will be deactivated.`)) {
            return;
        }

        challenge.active = false;

        // Deactivate challenge-scoped quests
        this.data.quests.forEach(quest => {
            if (quest.challengeId === challengeId) {
                quest.active = false;
            }
        });

        this.saveData();
        this.renderAll();
    }

    deleteChallenge(challengeId) {
        if (!confirm('Delete this challenge? This cannot be undone.')) {
            return;
        }

        // Remove challenge
        this.data.challenges = this.data.challenges.filter(c => c.id !== challengeId);

        // Remove challenge-scoped quests
        this.data.quests = this.data.quests.filter(q => q.challengeId !== challengeId);

        this.saveData();
        this.renderAll();
    }

    // ═══════════════════════════════════════════════════════════════
    // COLLECTION LOG - Experiences that require photos to complete
    // ═══════════════════════════════════════════════════════════════

    addCollectionLogEntry(name, description = '', tags = [], targetDate = null) {
        const entry = {
            id: 'collection_' + Date.now(),
            name: name,
            description: description,
            tags: tags,
            targetDate: targetDate,
            createdDate: new Date().toISOString(),
            completed: false,
            completedDate: null,
            photo: null // { dataUrl, caption }
        };

        this.data.collectionLog.push(entry);
        this.saveData();
        this.renderCollectionLog();
        this.showToast(`"${name}" added to Collection Log!`, 'success');
        
        return entry;
    }

    completeCollectionEntry(entryId, photoData) {
        const entry = this.data.collectionLog.find(e => e.id === entryId);
        if (!entry) {
            console.error('Collection entry not found:', entryId);
            return;
        }

        if (!photoData || !photoData.dataUrl) {
            alert('A photo is required to complete this entry!');
            return;
        }

        entry.completed = true;
        entry.completedDate = new Date().toISOString();
        entry.photo = photoData;

        this.saveData();
        this.renderCollectionLog();
        this.renderPhotoGallery();
        this.showToast(`🎉 "${entry.name}" completed!`, 'achievement');
    }

    updateCollectionEntry(entryId, updates) {
        const entry = this.data.collectionLog.find(e => e.id === entryId);
        if (!entry) return;

        Object.assign(entry, updates);
        this.saveData();
        this.renderCollectionLog();
    }

    deleteCollectionEntry(entryId) {
        if (!confirm('Delete this entry? This cannot be undone.')) {
            return;
        }

        this.data.collectionLog = this.data.collectionLog.filter(e => e.id !== entryId);
        this.saveData();
        this.renderCollectionLog();
        this.renderPhotoGallery();
    }

    getCollectionLogStats() {
        const total = this.data.collectionLog.length;
        const completed = this.data.collectionLog.filter(e => e.completed).length;
        return {
            total,
            completed,
            incomplete: total - completed,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    }

    getCollectionLogTags() {
        const tags = new Set();
        this.data.collectionLog.forEach(entry => {
            entry.tags?.forEach(tag => tags.add(tag));
        });
        return Array.from(tags).sort();
    }

    // ═══════════════════════════════════════════════════════════════
    // PHOTO GALLERY - Aggregates photos from quests + collection log
    // ═══════════════════════════════════════════════════════════════

    getAllPhotos() {
        const photos = [];

        // Photos from quest completions
        this.data.completionLog.completions.forEach(completion => {
            if (completion.photo && completion.photo.dataUrl) {
                const quest = this.data.quests.find(q => q.id === completion.questId);
                const paths = this.getPathsForQuest(completion.questId);
                
                photos.push({
                    id: `quest_${completion.timestamp}`,
                    type: 'quest',
                    source: quest?.name || completion.questId,
                    dataUrl: completion.photo.dataUrl,
                    caption: completion.photo.caption || '',
                    timestamp: completion.timestamp,
                    tags: paths.map(p => p.id),
                    pathIcons: paths.map(p => p.icon)
                });
            }
        });

        // Photos from collection log
        this.data.collectionLog.forEach(entry => {
            if (entry.photo && entry.photo.dataUrl) {
                photos.push({
                    id: `collection_${entry.id}`,
                    type: 'collection',
                    source: entry.name,
                    dataUrl: entry.photo.dataUrl,
                    caption: entry.photo.caption || '',
                    timestamp: entry.completedDate,
                    tags: entry.tags || []
                });
            }
        });

        // Sort by timestamp (newest first)
        photos.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return photos;
    }

    getPhotoGalleryTags() {
        const photos = this.getAllPhotos();
        const tags = new Set();
        
        photos.forEach(photo => {
            photo.tags?.forEach(tag => tags.add(tag));
        });

        // Add path names for quest photos
        this.data.paths.forEach(path => tags.add(path.id));

        return Array.from(tags).sort();
    }

    addPhotoToLastCompletion(questId, photoData) {
        // Find the most recent completion of this quest
        const completions = this.data.completionLog.completions
            .filter(c => c.questId === questId)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (completions.length > 0) {
            completions[0].photo = photoData;
            this.saveData();
            this.renderPhotoGallery();
            this.showToast('Photo added!', 'success');
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // PHOTO HANDLING
    // ═══════════════════════════════════════════════════════════════

    handlePhotoUpload(file, callback) {
        if (!file || !file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Compress and convert to data URL
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Resize if too large (max 1200px)
                const maxSize = 1200;
                let width = img.width;
                let height = img.height;

                if (width > maxSize || height > maxSize) {
                    if (width > height) {
                        height = (height / width) * maxSize;
                        width = maxSize;
                    } else {
                        width = (width / height) * maxSize;
                        height = maxSize;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Compress to JPEG
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                callback(dataUrl);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // ═══════════════════════════════════════════════════════════════
    // QUEST VISIBILITY & FILTERING
    // ═══════════════════════════════════════════════════════════════

    getVisibleQuests() {
        return this.data.quests.filter(quest => {
            // Hide inactive quests
            if (!quest.active) return false;

            // Hide challenge-scoped quests if their challenge is not active
            if (quest.challengeId) {
                const challenge = this.data.challenges.find(c => c.id === quest.challengeId);
                if (!challenge || !challenge.active) return false;
            }

            return true;
        });
    }

    getQuestsForPath(pathId) {
        const path = this.data.paths.find(p => p.id === pathId);
        if (!path) return [];

        const questIds = path.stages.flatMap(s => s.questIds);
        return this.data.quests.filter(q => questIds.includes(q.id));
    }

    getPathsForQuest(questId) {
        return this.data.paths.filter(path => 
            path.stages.some(stage => stage.questIds.includes(questId))
        );
    }

    isQuestSatisfiedInPath(questId, pathId) {
        const path = this.data.paths.find(p => p.id === pathId);
        if (!path) return false;
        return path.stages.some(stage => stage.satisfiedQuests.includes(questId));
    }

    isQuestCompletedInChallengePeriod(questId, challengeId) {
        const challenge = this.data.challenges.find(c => c.id === challengeId);
        if (!challenge) return false;
        return challenge.currentPeriod.completedQuests.some(cq => cq.questId === questId);
    }

    // ═══════════════════════════════════════════════════════════════
    // RENDERING - MAIN
    // ═══════════════════════════════════════════════════════════════

    renderAll() {
        this.renderCharacterSheet();
        this.renderQuests();
        this.renderPaths();
        this.renderChallenges();
        this.renderAchievements();
        this.renderCollectionLog();
        this.renderPhotoGallery();
        this.renderSettings();
    }

    renderSettings() {
        // Update login streak display
        if (this.data.loginStreak) {
            const streakEl = document.getElementById('settings-login-streak');
            const loginsEl = document.getElementById('settings-total-logins');
            if (streakEl) streakEl.textContent = this.data.loginStreak.current + ' days';
            if (loginsEl) loginsEl.textContent = this.data.loginStreak.totalLogins || 0;
        }

        // Update total quests
        const questsEl = document.getElementById('settings-total-quests');
        if (questsEl) {
            questsEl.textContent = this.data.completionLog?.completions?.length || 0;
        }

        // Update badges count
        const badgesEl = document.getElementById('settings-total-badges');
        if (badgesEl) {
            badgesEl.textContent = this.data.earnedBadges?.length || 0;
        }

        // Update sound toggle
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            soundToggle.checked = this.soundEnabled;
        }

        // Update character name input
        const characterNameInput = document.getElementById('character-name-input');
        if (characterNameInput && this.data.settings) {
            characterNameInput.value = this.data.settings.characterName || 'Christina';
        }

        // Update partner name input
        const partnerNameInput = document.getElementById('partner-name-input');
        if (partnerNameInput && this.data.settings) {
            partnerNameInput.value = this.data.settings.partnerName || 'Your Partner';
        }

        // Update character title
        this.updateCharacterTitle();
    }

    updateCharacterTitle() {
        const titleEl = document.getElementById('character-title');
        if (titleEl && this.data.settings) {
            const characterName = this.data.settings.characterName || 'Christina';
            titleEl.textContent = `${characterName}'s Adventure`;
        }
    }

    updateCharacterName(name) {
        if (!this.data.settings) {
            this.data.settings = {
                characterName: 'Christina',
                partnerName: 'Your Partner',
                soundEnabled: true
            };
        }
        this.data.settings.characterName = name || 'Christina';
        this.saveData();
        this.updateCharacterTitle();
    }

    updatePartnerName(name) {
        if (!this.data.settings) {
            this.data.settings = {
                characterName: 'Christina',
                partnerName: 'Your Partner',
                soundEnabled: true
            };
        }
        this.data.settings.partnerName = name || 'Your Partner';
        this.saveData();
        // Update all quest names that reference the partner
        this.updatePartnerQuestNames();
        this.renderQuests();
        this.renderChallenges();
    }

    updatePartnerQuestNames() {
        const partnerName = this.data.settings?.partnerName || 'Your Partner';
        
        // Update partner-related quests
        const partnerQuestUpdates = {
            'quality_time': `Quality time with ${partnerName}`,
            'date_night': `Date night with ${partnerName}`,
            'love_surprise': `Surprise ${partnerName} with something thoughtful`
        };

        this.data.quests.forEach(quest => {
            if (partnerQuestUpdates[quest.id]) {
                quest.name = partnerQuestUpdates[quest.id];
            }
        });
    }

    renderSettings() {
        // Update login streak display
        if (this.data.loginStreak) {
            const streakEl = document.getElementById('settings-login-streak');
            const loginsEl = document.getElementById('settings-total-logins');
            if (streakEl) streakEl.textContent = this.data.loginStreak.current + ' days';
            if (loginsEl) loginsEl.textContent = this.data.loginStreak.totalLogins || 0;
        }

        // Update total quests
        const questsEl = document.getElementById('settings-total-quests');
        if (questsEl) {
            questsEl.textContent = this.data.completionLog?.completions?.length || 0;
        }

        // Update badges count
        const badgesEl = document.getElementById('settings-total-badges');
        if (badgesEl) {
            badgesEl.textContent = this.data.earnedBadges?.length || 0;
        }

        // Update sound toggle
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            soundToggle.checked = this.soundEnabled;
        }
    }

    renderCharacterSheet() {
        let totalLevel = 0;

        Object.keys(this.data.skills).forEach(skillId => {
            const skill = this.data.skills[skillId];
            const level = this.getLevelFromXP(skill.xp);
            totalLevel += level;

            const card = document.querySelector(`.skill-card[data-skill="${skillId}"]`);
            if (card) {
                const currentXP = skill.xp;
                const nextLevelXP = this.getXPForLevel(level + 1);
                const currentLevelXP = this.getXPForLevel(level);
                const progress = ((currentXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;

                const levelNum = card.querySelector('.level-num');
                const currentXpEl = card.querySelector('.current-xp');
                const nextLevelEl = card.querySelector('.next-level-xp');
                const xpFill = card.querySelector('.xp-fill');
                const streakDays = card.querySelector('.streak-days');

                if (levelNum) levelNum.textContent = level;
                if (currentXpEl) currentXpEl.textContent = currentXP.toLocaleString();
                if (nextLevelEl) nextLevelEl.textContent = nextLevelXP.toLocaleString();
                if (xpFill) xpFill.style.width = `${Math.min(progress, 100)}%`;
                if (streakDays) streakDays.textContent = skill.currentStreak;
            }
        });

        const totalLevelEl = document.getElementById('total-level');
        if (totalLevelEl) totalLevelEl.textContent = totalLevel;

        // Today's XP
        const todayXP = this.data.completionLog.completions
            .filter(c => new Date(c.timestamp).toDateString() === new Date().toDateString())
            .reduce((sum, c) => sum + c.xpAwarded.reduce((s, x) => s + x.xp, 0), 0);
        
        const dailyXpEl = document.getElementById('daily-xp');
        if (dailyXpEl) dailyXpEl.textContent = todayXP.toLocaleString();
    }

    renderQuests() {
        const container = document.getElementById('quests-container');
        if (!container) return;

        container.innerHTML = '';
        const visibleQuests = this.getVisibleQuests();

        visibleQuests.forEach(quest => {
            const card = this.createQuestCard(quest);
            container.appendChild(card);
        });

        this.applyQuestFilters();
    }

    createQuestCard(quest) {
        const card = document.createElement('div');
        card.className = 'quest-card';
        card.dataset.questId = quest.id;
        card.dataset.frequency = quest.frequency;
        
        const completed = !this.canCompleteQuest(quest);
        if (completed) card.classList.add('completed');

        // Get path indicators
        const paths = this.getPathsForQuest(quest.id);
        const pathBadges = paths.map(path => {
            const satisfied = this.isQuestSatisfiedInPath(quest.id, path.id);
            return `<span class="path-badge ${satisfied ? 'satisfied' : ''}" title="${path.name}${satisfied ? ' (satisfied)' : ''}">${path.icon}</span>`;
        }).join('');

        // Get challenge indicator
        let challengeBadge = '';
        if (quest.challengeId) {
            const challenge = this.data.challenges.find(c => c.id === quest.challengeId);
            if (challenge) {
                const doneThisPeriod = this.isQuestCompletedInChallengePeriod(quest.id, challenge.id);
                challengeBadge = `<span class="challenge-badge ${doneThisPeriod ? 'done' : ''}" title="${challenge.name}">${challenge.icon}</span>`;
            }
        }

        // XP display
        const xpDisplay = quest.rewards.map(r => 
            `<span class="xp-reward" style="--skill-color: var(--${r.skill}-color)">+${r.xp} ${r.skill}</span>`
        ).join(' ');

        // Frequency badge
        const freqColors = {
            'daily': '#4CAF50',
            'weekly': '#2196F3',
            'monthly': '#9C27B0',
            'as-needed': '#FF9800',
            'one-time': '#E91E63'
        };

        // Complete/Undo button based on state
        const completeButton = completed 
            ? `<button class="complete-btn undo" onclick="app.uncompleteQuest('${quest.id}')">↩ Undo</button>`
            : `<button class="complete-btn" onclick="app.completeQuest('${quest.id}')">Complete</button>`;

        card.innerHTML = `
            <div class="quest-header">
                <div class="quest-title-row">
                    <span class="quest-name">${quest.name}</span>
                    ${quest.custom ? '<span class="custom-badge">Custom</span>' : ''}
                </div>
                <div class="quest-meta">
                    <span class="frequency-badge" style="background: ${freqColors[quest.frequency]}">${quest.frequency}</span>
                    ${pathBadges}
                    ${challengeBadge}
                </div>
            </div>
            <div class="quest-rewards">${xpDisplay}</div>
            <div class="quest-actions">
                ${completeButton}
                <button class="photo-btn" ${completed ? 'disabled' : ''} onclick="app.openQuestPhotoModal('${quest.id}')" title="Complete with Photo">📷</button>
                <button class="edit-btn" onclick="app.openEditQuestModal('${quest.id}')" title="Edit">✏️</button>
                ${quest.custom ? `<button class="delete-btn" onclick="app.deleteQuest('${quest.id}')" title="Delete">🗑️</button>` : ''}
            </div>
        `;

        return card;
    }

    applyQuestFilters() {
        const typeFilter = this.currentTypeFilter || 'all';
        const pathFilter = this.currentPathFilter || 'all';
        const statusFilter = this.currentStatusFilter || 'upcoming';

        const today = new Date().toDateString();
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        document.querySelectorAll('.quest-card').forEach(card => {
            const frequency = card.dataset.frequency;
            const questId = card.dataset.questId;
            const quest = this.data.quests.find(q => q.id === questId);

            // Type filter
            const typeMatch = typeFilter === 'all' || frequency === typeFilter;

            // Path filter
            let pathMatch = true;
            if (pathFilter !== 'all') {
                const paths = this.getPathsForQuest(questId);
                if (pathFilter === 'none') {
                    pathMatch = paths.length === 0;
                } else {
                    pathMatch = paths.some(p => p.id === pathFilter);
                }
            }

            // Status filter
            let statusMatch = true;
            if (statusFilter !== 'all') {
                const isCompleted = !this.canCompleteQuest(quest);
                
                if (statusFilter === 'upcoming') {
                    // Show only incomplete quests
                    statusMatch = !isCompleted;
                } else if (statusFilter === 'recently-completed') {
                    // Show quests completed in the last 7 days
                    if (!isCompleted) {
                        statusMatch = false;
                    } else {
                        // Check if quest was completed recently
                        const recentCompletions = this.data.completionLog.completions.filter(c => {
                            const completionDate = new Date(c.timestamp);
                            return c.questId === questId && completionDate >= weekAgo;
                        });
                        statusMatch = recentCompletions.length > 0;
                    }
                } else if (statusFilter === 'completed') {
                    // Show only completed quests
                    statusMatch = isCompleted;
                }
            }

            card.style.display = (typeMatch && pathMatch && statusMatch) ? 'block' : 'none';
        });
    }

    filterQuestsByStatus(status) {
        this.currentStatusFilter = status;
        document.querySelectorAll('[data-filter-status]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filterStatus === status);
        });
        this.applyQuestFilters();
    }

    filterQuestsByType(type) {
        this.currentTypeFilter = type;
        document.querySelectorAll('[data-filter-type]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filterType === type);
        });
        this.applyQuestFilters();
    }

    filterQuestsByPath(pathId) {
        this.currentPathFilter = pathId;
        document.querySelectorAll('[data-filter-path]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filterPath === pathId);
        });
        this.applyQuestFilters();
    }

    // ═══════════════════════════════════════════════════════════════
    // RENDERING - PATHS
    // ═══════════════════════════════════════════════════════════════

    renderPaths() {
        const container = document.getElementById('paths-container');
        if (!container) return;

        container.innerHTML = '';

        this.data.paths.forEach(path => {
            const card = this.createPathCard(path);
            container.appendChild(card);
        });
    }

    createPathCard(path) {
        const card = document.createElement('div');
        card.className = `path-card ${path.completed ? 'completed' : ''}`;
        card.dataset.pathId = path.id;

        // Calculate progress
        const totalQuests = path.stages.reduce((sum, s) => sum + s.questIds.length, 0);
        const satisfiedQuests = path.stages.reduce((sum, s) => sum + s.satisfiedQuests.length, 0);
        const progressPercent = totalQuests > 0 ? (satisfiedQuests / totalQuests) * 100 : 0;

        // Find current stage (first incomplete)
        const currentStageIndex = path.stages.findIndex(s => !s.completed);
        const currentStage = currentStageIndex >= 0 ? path.stages[currentStageIndex] : null;

        // Build stages display
        const stagesHtml = path.stages.map((stage, index) => {
            const isUnlocked = index === 0 || path.stages[index - 1].completed;
            const isCurrent = index === currentStageIndex;
            
            const questsHtml = stage.questIds.map(qId => {
                const quest = this.data.quests.find(q => q.id === qId);
                const satisfied = stage.satisfiedQuests.includes(qId);
                return `<span class="stage-quest ${satisfied ? 'satisfied' : ''}" data-quest-id="${qId}" onclick="app.navigateToQuest('${qId}')">
                    ${satisfied ? '✓' : '○'} ${quest?.name || qId}
                </span>`;
            }).join('');

            return `
                <div class="path-stage ${stage.completed ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${!isUnlocked ? 'locked' : ''}">
                    <div class="stage-header">
                        <span class="stage-name">${stage.name}</span>
                        ${stage.completed ? '<span class="stage-check">✓</span>' : ''}
                        ${!isUnlocked ? '<span class="stage-lock">🔒</span>' : ''}
                    </div>
                    <div class="stage-quests">${questsHtml}</div>
                </div>
            `;
        }).join('');

        card.innerHTML = `
            <div class="path-header">
                <span class="path-icon">${path.icon}</span>
                <div class="path-title">
                    <h3>${path.name}</h3>
                    <p class="path-description">${path.description}</p>
                </div>
                ${path.completed ? '<span class="path-complete-badge">✓ Complete!</span>' : ''}
            </div>
            <div class="path-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercent}%"></div>
                </div>
                <span class="progress-text">${satisfiedQuests}/${totalQuests} quests</span>
            </div>
            <div class="path-stages">${stagesHtml}</div>
        `;

        return card;
    }

    // ═══════════════════════════════════════════════════════════════
    // RENDERING - CHALLENGES
    // ═══════════════════════════════════════════════════════════════

    renderChallenges() {
        const container = document.getElementById('challenges-container');
        if (!container) return;

        container.innerHTML = '';

        const activeChallenges = this.data.challenges.filter(c => c.active);

        if (activeChallenges.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No active challenges</p>
                    <button class="add-challenge-btn" onclick="app.openAddChallengeModal()">+ Start a Challenge</button>
                </div>
            `;
            return;
        }

        activeChallenges.forEach((challenge, index) => {
            const accordion = this.createChallengeAccordion(challenge, index === 0);
            container.appendChild(accordion);
        });
    }

    createChallengeAccordion(challenge, expanded = false) {
        const accordion = document.createElement('div');
        accordion.className = `challenge-accordion ${expanded ? 'expanded' : ''}`;
        accordion.dataset.challengeId = challenge.id;

        const completed = challenge.currentPeriod.completedQuests.length;
        const total = challenge.questIds.length;
        const progressPercent = (completed / total) * 100;

        // Time remaining in period
        const endDate = new Date(challenge.currentPeriod.endDate + 'T23:59:59');
        const now = new Date();
        const daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        
        let timeStatus = '';
        let timeClass = '';
        if (daysLeft < 0) {
            timeStatus = 'Overdue!';
            timeClass = 'overdue';
        } else if (daysLeft === 0) {
            timeStatus = 'Due today';
            timeClass = 'due-today';
        } else if (daysLeft === 1) {
            timeStatus = '1 day left';
            timeClass = 'due-soon';
        } else {
            timeStatus = `${daysLeft} days left`;
        }

        // Quest checklist with clickable items (complete or undo)
        const questsHtml = challenge.questIds.map(qId => {
            const quest = this.data.quests.find(q => q.id === qId);
            const done = challenge.currentPeriod.completedQuests.some(cq => cq.questId === qId);
            const rewardText = quest?.rewards?.map(r => `+${r.xp} ${this.getSkillEmoji(r.skill)}`).join(' ') || '';
            
            if (done) {
                return `
                    <div class="challenge-quest-item done undoable" 
                         onclick="app.undoQuestFromChallenge('${challenge.id}', '${qId}')">
                        <span class="quest-checkbox">✓</span>
                        <span class="quest-name">${quest?.name || qId}</span>
                        <span class="quest-rewards">${rewardText}</span>
                        <span class="quest-action-hint undo">↩ Undo</span>
                    </div>
                `;
            } else {
                return `
                    <div class="challenge-quest-item available" 
                         onclick="app.completeQuestFromChallenge('${challenge.id}', '${qId}')">
                        <span class="quest-checkbox">○</span>
                        <span class="quest-name">${quest?.name || qId}</span>
                        <span class="quest-rewards">${rewardText}</span>
                        <span class="quest-action-hint">Tap to complete</span>
                    </div>
                `;
            }
        }).join('');

        accordion.innerHTML = `
            <div class="challenge-accordion-header" onclick="app.toggleChallengeAccordion('${challenge.id}')">
                <div class="challenge-header-left">
                    <span class="challenge-icon">${challenge.icon}</span>
                    <div class="challenge-header-info">
                        <h3>${challenge.name}</h3>
                        <div class="challenge-mini-stats">
                            <span class="mini-stat">🔥 ${challenge.currentStreak} streak</span>
                            <span class="mini-stat ${timeClass}">${timeStatus}</span>
                            <span class="mini-stat">${completed}/${total}</span>
                        </div>
                    </div>
                </div>
                <div class="challenge-header-right">
                    <div class="mini-progress-ring">
                        <svg viewBox="0 0 36 36">
                            <path class="ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                            <path class="ring-fill" stroke-dasharray="${progressPercent}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
                        </svg>
                    </div>
                    <span class="accordion-arrow">▼</span>
                </div>
            </div>
            <div class="challenge-accordion-body">
                <p class="challenge-description">${challenge.description}</p>
                <div class="challenge-full-stats">
                    <div class="stat-box">
                        <span class="stat-value">${challenge.currentStreak}</span>
                        <span class="stat-label">Current Streak</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-value">${challenge.longestStreak}</span>
                        <span class="stat-label">Best Streak</span>
                    </div>
                    <div class="stat-box ${timeClass}">
                        <span class="stat-value">${timeStatus}</span>
                        <span class="stat-label">This Period</span>
                    </div>
                </div>
                <div class="challenge-progress-bar">
                    <div class="progress-fill" style="width: ${progressPercent}%"></div>
                </div>
                <div class="challenge-quests-list">
                    <h4>Today's Tasks</h4>
                    ${questsHtml}
                </div>
                <div class="challenge-actions">
                    <button class="danger-btn small" onclick="app.endChallenge('${challenge.id}')">End Challenge</button>
                </div>
            </div>
        `;

        return accordion;
    }

    toggleChallengeAccordion(challengeId) {
        const accordion = document.querySelector(`.challenge-accordion[data-challenge-id="${challengeId}"]`);
        if (accordion) {
            accordion.classList.toggle('expanded');
        }
    }

    completeQuestFromChallenge(challengeId, questId) {
        // Complete the quest (this will also update the challenge)
        this.completeQuest(questId);
        
        // Re-render challenges to show updated state
        this.renderChallenges();
        
        // Re-expand the challenge we were working on
        const accordion = document.querySelector(`.challenge-accordion[data-challenge-id="${challengeId}"]`);
        if (accordion) {
            accordion.classList.add('expanded');
        }
    }

    undoQuestFromChallenge(challengeId, questId) {
        // Undo the quest completion
        this.uncompleteQuest(questId);
        
        // Re-render challenges to show updated state
        this.renderChallenges();
        
        // Re-expand the challenge we were working on
        const accordion = document.querySelector(`.challenge-accordion[data-challenge-id="${challengeId}"]`);
        if (accordion) {
            accordion.classList.add('expanded');
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // RENDERING - ACHIEVEMENTS
    // ═══════════════════════════════════════════════════════════════

    renderAchievements() {
        const container = document.getElementById('achievements-container');
        if (!container) return;

        container.innerHTML = '';

        const tiers = ['beginner', 'medium', 'hard', 'elite', 'grandmaster'];
        const tierNames = {
            beginner: 'Beginner',
            medium: 'Medium',
            hard: 'Hard',
            elite: 'Elite',
            grandmaster: 'Grandmaster'
        };

        tiers.forEach(tier => {
            const tierAchievements = this.data.achievements.filter(a => a.tier === tier);
            if (tierAchievements.length === 0) return;

            const completed = tierAchievements.filter(a => a.completed).length;
            const total = tierAchievements.length;

            const section = document.createElement('div');
            section.className = 'achievement-tier';
            section.innerHTML = `
                <div class="tier-header">
                    <h3>${tierNames[tier]}</h3>
                    <span class="tier-progress">${completed}/${total}</span>
                </div>
                <div class="tier-achievements">
                    ${tierAchievements.map(ach => `
                        <div class="achievement ${ach.completed ? 'completed' : 'locked'}">
                            <div class="achievement-icon">${ach.completed ? '🏆' : '🔒'}</div>
                            <div class="achievement-info">
                                <span class="achievement-name">${ach.name}</span>
                                <span class="achievement-description">${ach.description}</span>
                                ${ach.completed ? `<span class="achievement-date">Completed ${new Date(ach.completedDate).toLocaleDateString()}</span>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            container.appendChild(section);
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // RENDERING - COLLECTION LOG
    // ═══════════════════════════════════════════════════════════════

    renderCollectionLog() {
        const container = document.getElementById('collection-log-container');
        if (!container) return;

        container.innerHTML = '';

        // Stats
        const stats = this.getCollectionLogStats();
        const statsContainer = document.getElementById('collection-stats');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="stat-card">
                    <span class="stat-value">${stats.total}</span>
                    <span class="stat-label">Total</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">${stats.completed}</span>
                    <span class="stat-label">Completed</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">${stats.incomplete}</span>
                    <span class="stat-label">To Do</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">${stats.completionRate}%</span>
                    <span class="stat-label">Rate</span>
                </div>
            `;
        }

        // Tag filters
        this.renderCollectionLogTagFilters();

        // Entries
        const filter = this.currentCollectionFilter || 'all';
        const tagFilter = this.currentCollectionTagFilter || 'all';

        let entries = [...this.data.collectionLog];

        // Apply completion filter
        if (filter === 'completed') {
            entries = entries.filter(e => e.completed);
        } else if (filter === 'incomplete') {
            entries = entries.filter(e => !e.completed);
        }

        // Apply tag filter
        if (tagFilter !== 'all') {
            entries = entries.filter(e => e.tags?.includes(tagFilter));
        }

        // Sort: incomplete first (by target date), then completed (by completion date)
        entries.sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            if (!a.completed && !b.completed) {
                // Both incomplete - sort by target date
                if (a.targetDate && b.targetDate) return new Date(a.targetDate) - new Date(b.targetDate);
                if (a.targetDate) return -1;
                if (b.targetDate) return 1;
                return new Date(b.createdDate) - new Date(a.createdDate);
            }
            // Both completed - sort by completion date (newest first)
            return new Date(b.completedDate) - new Date(a.completedDate);
        });

        if (entries.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No entries yet</p>
                    <p>Add experiences you want to capture!</p>
                </div>
            `;
            return;
        }

        entries.forEach(entry => {
            const card = this.createCollectionLogCard(entry);
            container.appendChild(card);
        });
    }

    renderCollectionLogTagFilters() {
        const container = document.getElementById('collection-tag-filters');
        if (!container) return;

        const tags = this.getCollectionLogTags();
        
        container.innerHTML = `
            <button class="filter-btn ${this.currentCollectionTagFilter === 'all' ? 'active' : ''}" 
                    onclick="app.filterCollectionByTag('all')">All</button>
            ${tags.map(tag => `
                <button class="filter-btn ${this.currentCollectionTagFilter === tag ? 'active' : ''}"
                        onclick="app.filterCollectionByTag('${tag}')">${tag}</button>
            `).join('')}
        `;
    }

    createCollectionLogCard(entry) {
        const card = document.createElement('div');
        card.className = `collection-card ${entry.completed ? 'completed' : 'incomplete'}`;
        card.dataset.entryId = entry.id;

        const targetDateStr = entry.targetDate 
            ? new Date(entry.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '';

        const completedDateStr = entry.completedDate
            ? new Date(entry.completedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '';

        card.innerHTML = `
            <div class="collection-card-content">
                ${entry.photo ? `
                    <div class="collection-thumbnail" onclick="app.viewPhoto('${entry.id}')">
                        <img src="${entry.photo.dataUrl}" alt="${entry.name}">
                    </div>
                ` : `
                    <div class="collection-thumbnail placeholder">
                        <span>📷</span>
                    </div>
                `}
                <div class="collection-info">
                    <h4 class="collection-name">${entry.name}</h4>
                    ${entry.description ? `<p class="collection-description">${entry.description}</p>` : ''}
                    <div class="collection-meta">
                        ${entry.tags?.length ? `
                            <div class="collection-tags">
                                ${entry.tags.map(t => `<span class="tag">${t}</span>`).join('')}
                            </div>
                        ` : ''}
                        ${targetDateStr && !entry.completed ? `<span class="target-date">📅 ${targetDateStr}</span>` : ''}
                        ${completedDateStr ? `<span class="completed-date">✓ ${completedDateStr}</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="collection-actions">
                ${entry.completed ? `
                    <button class="view-btn" onclick="app.viewPhoto('${entry.id}')">View Photo</button>
                ` : `
                    <button class="complete-btn" onclick="app.openCompleteCollectionModal('${entry.id}')">+ Add Photo</button>
                `}
                <button class="edit-btn" onclick="app.openEditCollectionModal('${entry.id}')">✏️</button>
                <button class="delete-btn" onclick="app.deleteCollectionEntry('${entry.id}')">🗑️</button>
            </div>
        `;

        return card;
    }

    filterCollectionByStatus(status) {
        this.currentCollectionFilter = status;
        document.querySelectorAll('[data-collection-filter]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.collectionFilter === status);
        });
        this.renderCollectionLog();
    }

    filterCollectionByTag(tag) {
        this.currentCollectionTagFilter = tag;
        this.renderCollectionLog();
    }

    // ═══════════════════════════════════════════════════════════════
    // RENDERING - PHOTO GALLERY
    // ═══════════════════════════════════════════════════════════════

    renderPhotoGallery() {
        const container = document.getElementById('photo-gallery-container');
        if (!container) return;

        container.innerHTML = '';

        const photos = this.getAllPhotos();
        const tagFilter = this.currentGalleryTagFilter || 'all';
        const sourceFilter = this.currentGallerySourceFilter || 'all';

        let filtered = photos;

        // Filter by source type
        if (sourceFilter === 'quest') {
            filtered = filtered.filter(p => p.type === 'quest');
        } else if (sourceFilter === 'collection') {
            filtered = filtered.filter(p => p.type === 'collection');
        }

        // Filter by tag
        if (tagFilter !== 'all') {
            filtered = filtered.filter(p => p.tags?.includes(tagFilter));
        }

        // Stats
        const statsEl = document.getElementById('gallery-stats');
        if (statsEl) {
            statsEl.textContent = `${filtered.length} photo${filtered.length !== 1 ? 's' : ''}`;
        }

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No photos yet</p>
                    <p>Complete quests with photos or add to your Collection Log!</p>
                </div>
            `;
            return;
        }

        filtered.forEach(photo => {
            const card = this.createPhotoCard(photo);
            container.appendChild(card);
        });
    }

    createPhotoCard(photo) {
        const card = document.createElement('div');
        card.className = 'photo-card';
        card.dataset.photoId = photo.id;

        const dateStr = new Date(photo.timestamp).toLocaleDateString('en-US', { 
            month: 'short', day: 'numeric', year: 'numeric' 
        });

        card.innerHTML = `
            <div class="photo-image" onclick="app.viewPhotoLightbox('${photo.id}')">
                <img src="${photo.dataUrl}" alt="${photo.source}">
                <div class="photo-overlay">
                    <span class="photo-type ${photo.type}">${photo.type === 'quest' ? '⚔️' : '📸'}</span>
                </div>
            </div>
            <div class="photo-info">
                <span class="photo-source">${photo.source}</span>
                <span class="photo-date">${dateStr}</span>
                ${photo.pathIcons ? `<span class="photo-paths">${photo.pathIcons.join(' ')}</span>` : ''}
            </div>
            ${photo.caption ? `<p class="photo-caption">${photo.caption}</p>` : ''}
        `;

        return card;
    }

    filterGalleryBySource(source) {
        this.currentGallerySourceFilter = source;
        document.querySelectorAll('[data-gallery-source]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.gallerySource === source);
        });
        this.renderPhotoGallery();
    }

    filterGalleryByTag(tag) {
        this.currentGalleryTagFilter = tag;
        document.querySelectorAll('[data-gallery-tag]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.galleryTag === tag);
        });
        this.renderPhotoGallery();
    }

    viewPhotoLightbox(photoId) {
        const photos = this.getAllPhotos();
        const photo = photos.find(p => p.id === photoId);
        if (!photo) return;

        const modal = document.getElementById('photo-lightbox-modal');
        const img = document.getElementById('lightbox-image');
        const caption = document.getElementById('lightbox-caption');
        const source = document.getElementById('lightbox-source');

        if (modal && img) {
            img.src = photo.dataUrl;
            if (caption) caption.textContent = photo.caption || '';
            if (source) source.textContent = photo.source;
            modal.classList.add('active');
            document.body.classList.add('modal-open');
        }
    }

    viewPhoto(entryId) {
        const entry = this.data.collectionLog.find(e => e.id === entryId);
        if (!entry || !entry.photo) return;

        const modal = document.getElementById('photo-lightbox-modal');
        const img = document.getElementById('lightbox-image');
        const caption = document.getElementById('lightbox-caption');
        const source = document.getElementById('lightbox-source');

        if (modal && img) {
            img.src = entry.photo.dataUrl;
            if (caption) caption.textContent = entry.photo.caption || '';
            if (source) source.textContent = entry.name;
            modal.classList.add('active');
            document.body.classList.add('modal-open');
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // NOTIFICATIONS
    // ═══════════════════════════════════════════════════════════════

    showCompletionNotifications(quest, results) {
        // XP toast
        const xpText = results.xpGained.map(x => `+${x.xp} ${x.skill}`).join(', ');
        this.showToast(`${quest.name} completed! ${xpText}`, 'success');

        // Level ups
        results.levelUps.forEach(lu => {
            setTimeout(() => {
                this.showLevelUpModal(lu.skill, lu.level);
            }, 500);
        });

        // Path progress
        results.pathProgress.forEach(pp => {
            if (pp.stageComplete) {
                this.showToast(`Stage complete: ${pp.stageComplete}!`, 'achievement');
            }
            if (pp.pathComplete) {
                this.showToast(`🎉 PATH COMPLETE: ${pp.pathComplete}!`, 'achievement');
            }
        });

        // Achievements
        results.achievements.forEach(ach => {
            setTimeout(() => {
                this.showAchievementModal(ach);
            }, 1000);
        });
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, 3000);

        // Trigger confetti for achievements
        if (type === 'achievement') {
            this.showConfetti();
        }
    }

    showConfetti() {
        const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9', '#fd79a8'];
        const confettiCount = 50;

        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 2 + 's';
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            
            // Random shapes
            if (Math.random() > 0.5) {
                confetti.style.borderRadius = '50%';
            }
            
            document.body.appendChild(confetti);
            
            // Remove after animation
            setTimeout(() => confetti.remove(), 5000);
        }
    }

    showLevelUpModal(skill, level) {
        const modal = document.getElementById('level-up-modal');
        const text = document.getElementById('level-up-text');
        
        if (modal && text) {
            const skillEmoji = this.getSkillEmoji(skill);
            text.innerHTML = `
                <div class="level-up-icon">${skillEmoji}</div>
                <div class="level-up-skill">${skill.charAt(0).toUpperCase() + skill.slice(1)}</div>
                <div class="level-up-level">Level ${level}!</div>
            `;
            modal.classList.add('active');
            document.body.classList.add('modal-open');
        }
    }

    showAchievementModal(achievement) {
        const modal = document.getElementById('achievement-modal');
        const text = document.getElementById('achievement-text');
        
        if (modal && text) {
            text.innerHTML = `
                <div class="achievement-unlock-icon">🏆</div>
                <div class="achievement-unlock-name">${achievement.name}</div>
                <div class="achievement-unlock-description">${achievement.description}</div>
                ${achievement.reward?.merit ? `<div class="achievement-merit">Merit: ${achievement.reward.merit}</div>` : ''}
            `;
            modal.classList.add('active');
            document.body.classList.add('modal-open');
        }
    }

    getSkillEmoji(skill) {
        const emojis = {
            athleticism: '💪',
            culinary: '🍳',
            artistry: '🎨',
            business: '💼',
            partnership: '💕',
            friendships: '👯',
            innerPeace: '🧘',
            homeCraft: '🏠',
            generosity: '🤍',
            influence: '📸'
        };
        return emojis[skill] || '⭐';
    }

    getSkillName(skill) {
        const names = {
            athleticism: 'Athleticism',
            culinary: 'Culinary Arts',
            artistry: 'Artistry',
            business: 'Business Mind',
            partnership: 'Partnership',
            friendships: 'Friendships',
            innerPeace: 'Inner Peace',
            homeCraft: 'Home Craft',
            generosity: 'Generosity',
            influence: 'Influence'
        };
        return names[skill] || skill;
    }

    // ═══════════════════════════════════════════════════════════════
    // QUEST MANAGEMENT
    // ═══════════════════════════════════════════════════════════════

    addCustomQuest(name, frequency, rewards, description = '') {
        const id = 'custom_' + Date.now();
        
        const quest = {
            id: id,
            name: name,
            description: description,
            frequency: frequency,
            rewards: rewards,
            challengeId: null,
            custom: true,
            active: true
        };

        this.data.quests.push(quest);
        this.saveData();
        this.renderQuests();

        return quest;
    }

    deleteQuest(questId) {
        const quest = this.data.quests.find(q => q.id === questId);
        if (!quest || !quest.custom) {
            alert('Can only delete custom quests');
            return;
        }

        if (!confirm(`Delete "${quest.name}"? This cannot be undone.`)) {
            return;
        }

        // Remove from quests
        this.data.quests = this.data.quests.filter(q => q.id !== questId);

        // Remove from path stages
        this.data.paths.forEach(path => {
            path.stages.forEach(stage => {
                stage.questIds = stage.questIds.filter(qId => qId !== questId);
                stage.satisfiedQuests = stage.satisfiedQuests.filter(qId => qId !== questId);
            });
        });

        // Remove from challenges
        this.data.challenges.forEach(challenge => {
            challenge.questIds = challenge.questIds.filter(qId => qId !== questId);
            challenge.currentPeriod.completedQuests = challenge.currentPeriod.completedQuests
                .filter(cq => cq.questId !== questId);
        });

        this.saveData();
        this.renderAll();
    }

    openEditQuestModal(questId) {
        const quest = this.data.quests.find(q => q.id === questId);
        if (!quest) return;

        this.editingQuestId = questId;
        this.editQuestPhotoData = null; // Reset photo data

        // Populate modal fields
        const nameInput = document.getElementById('edit-quest-name');
        const freqInput = document.getElementById('edit-quest-frequency');
        const skillInput = document.getElementById('edit-quest-skill');
        const xpInput = document.getElementById('edit-quest-xp');

        if (nameInput) nameInput.value = quest.name;
        if (freqInput) freqInput.value = quest.frequency;
        if (quest.rewards.length > 0) {
            if (skillInput) skillInput.value = quest.rewards[0].skill;
            if (xpInput) xpInput.value = quest.rewards[0].xp;
        }

        // Show delete button only for custom quests
        const deleteBtn = document.getElementById('delete-quest-btn');
        if (deleteBtn) {
            deleteBtn.style.display = quest.custom ? 'block' : 'none';
        }

        // Find last completion with photo for this quest
        const lastCompletionWithPhoto = this.data.completionLog.completions
            .filter(c => c.questId === questId && c.photo)
            .pop();

        const previewBox = document.getElementById('edit-quest-photo-preview');
        const removeBtn = document.getElementById('edit-quest-remove-photo');

        if (lastCompletionWithPhoto?.photo) {
            this.editQuestPhotoData = lastCompletionWithPhoto.photo;
            previewBox.innerHTML = `<img src="${lastCompletionWithPhoto.photo.dataUrl}" alt="Quest photo">`;
            removeBtn.style.display = 'block';
        } else {
            previewBox.innerHTML = '<span class="no-photo-text">No photo</span>';
            removeBtn.style.display = 'none';
        }

        const modal = document.getElementById('edit-quest-modal');
        if (modal) {
            modal.classList.add('active');
            document.body.classList.add('modal-open');
        }
    }

    handleEditQuestPhotoSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.handlePhotoUpload(file, (dataUrl) => {
            this.editQuestPhotoData = { dataUrl, caption: '' };
            const previewBox = document.getElementById('edit-quest-photo-preview');
            if (previewBox) {
                previewBox.innerHTML = `<img src="${dataUrl}" alt="Quest photo">`;
            }
            const removeBtn = document.getElementById('edit-quest-remove-photo');
            if (removeBtn) removeBtn.style.display = 'block';
        });
    }

    removeEditQuestPhoto() {
        this.editQuestPhotoData = null;
        const previewBox = document.getElementById('edit-quest-photo-preview');
        if (previewBox) {
            previewBox.innerHTML = '<span class="no-photo-text">No photo</span>';
        }
        const removeBtn = document.getElementById('edit-quest-remove-photo');
        if (removeBtn) removeBtn.style.display = 'none';
        
        // Clear file input
        const fileInput = document.getElementById('edit-quest-photo');
        if (fileInput) fileInput.value = '';
    }

    deleteCurrentQuest() {
        if (!this.editingQuestId) return;
        
        const quest = this.data.quests.find(q => q.id === this.editingQuestId);
        if (!quest || !quest.custom) {
            this.showToast('Cannot delete built-in quests', 'error');
            return;
        }

        if (confirm(`Delete quest "${quest.name}"? This cannot be undone.`)) {
            this.deleteQuest(this.editingQuestId);
            this.closeModal('edit-quest-modal');
            this.editingQuestId = null;
        }
    }

    saveEditedQuest() {
        if (!this.editingQuestId) return;

        const quest = this.data.quests.find(q => q.id === this.editingQuestId);
        if (!quest) return;

        const name = document.getElementById('edit-quest-name')?.value;
        const frequency = document.getElementById('edit-quest-frequency')?.value;
        const skill = document.getElementById('edit-quest-skill')?.value;
        const xp = parseInt(document.getElementById('edit-quest-xp')?.value) || 0;

        if (name) quest.name = name;
        if (frequency) quest.frequency = frequency;
        if (skill && xp) {
            quest.rewards = [{ skill, xp }];
        }

        // Update photo on last completion if we have new photo data
        if (this.editQuestPhotoData) {
            const lastCompletion = this.data.completionLog.completions
                .filter(c => c.questId === this.editingQuestId)
                .pop();
            
            if (lastCompletion) {
                lastCompletion.photo = this.editQuestPhotoData;
            }
        }

        this.saveData();
        this.renderQuests();
        this.closeModal('edit-quest-modal');
        this.editingQuestId = null;
        this.editQuestPhotoData = null;
        this.showToast('Quest updated!', 'success');
    }

    // ═══════════════════════════════════════════════════════════════
    // MODALS
    // ═══════════════════════════════════════════════════════════════

    openAddQuestModal() {
        const modal = document.getElementById('add-quest-modal');
        if (modal) {
            modal.classList.add('active');
            document.body.classList.add('modal-open');
        }
    }

    openAddChallengeModal() {
        const modal = document.getElementById('add-challenge-modal');
        if (modal) {
            modal.classList.add('active');
            document.body.classList.add('modal-open');
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
            document.body.classList.remove('modal-open');
        }
    }

    // Collection Log Modals
    openAddCollectionModal() {
        const modal = document.getElementById('add-collection-modal');
        if (modal) {
            // Reset form
            const form = document.getElementById('add-collection-form');
            if (form) form.reset();
            modal.classList.add('active');
            document.body.classList.add('modal-open');
        }
    }

    openCompleteCollectionModal(entryId) {
        this.completingEntryId = entryId;
        const entry = this.data.collectionLog.find(e => e.id === entryId);
        if (!entry) return;

        const modal = document.getElementById('complete-collection-modal');
        const nameEl = document.getElementById('complete-collection-name');
        
        if (modal) {
            if (nameEl) nameEl.textContent = entry.name;
            // Reset file input
            const fileInput = document.getElementById('collection-photo-input');
            if (fileInput) fileInput.value = '';
            const preview = document.getElementById('collection-photo-preview');
            if (preview) preview.innerHTML = '';
            
            modal.classList.add('active');
            document.body.classList.add('modal-open');
        }
    }

    openEditCollectionModal(entryId) {
        const entry = this.data.collectionLog.find(e => e.id === entryId);
        if (!entry) return;

        this.editingEntryId = entryId;

        const modal = document.getElementById('edit-collection-modal');
        if (modal) {
            document.getElementById('edit-collection-name').value = entry.name;
            document.getElementById('edit-collection-description').value = entry.description || '';
            document.getElementById('edit-collection-tags').value = entry.tags?.join(', ') || '';
            document.getElementById('edit-collection-date').value = entry.targetDate || '';
            
            modal.classList.add('active');
            document.body.classList.add('modal-open');
        }
    }

    saveCollectionEntry() {
        const name = document.getElementById('new-collection-name')?.value?.trim();
        const description = document.getElementById('new-collection-description')?.value?.trim();
        const tagsStr = document.getElementById('new-collection-tags')?.value?.trim();
        const targetDate = document.getElementById('new-collection-date')?.value || null;

        if (!name) {
            alert('Please enter a name');
            return;
        }

        const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t) : [];

        this.addCollectionLogEntry(name, description, tags, targetDate);
        this.closeModal('add-collection-modal');
    }

    saveEditedCollectionEntry() {
        if (!this.editingEntryId) return;

        const entry = this.data.collectionLog.find(e => e.id === this.editingEntryId);
        if (!entry) return;

        const name = document.getElementById('edit-collection-name')?.value?.trim();
        const description = document.getElementById('edit-collection-description')?.value?.trim();
        const tagsStr = document.getElementById('edit-collection-tags')?.value?.trim();
        const targetDate = document.getElementById('edit-collection-date')?.value || null;

        if (!name) {
            alert('Please enter a name');
            return;
        }

        const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(t => t) : [];

        this.updateCollectionEntry(this.editingEntryId, { name, description, tags, targetDate });
        this.closeModal('edit-collection-modal');
        this.editingEntryId = null;
    }

    submitCollectionCompletion() {
        if (!this.completingEntryId) return;

        const caption = document.getElementById('collection-photo-caption')?.value?.trim() || '';
        
        if (!this.pendingPhotoDataUrl) {
            alert('Please select a photo');
            return;
        }

        this.completeCollectionEntry(this.completingEntryId, {
            dataUrl: this.pendingPhotoDataUrl,
            caption: caption
        });

        this.closeModal('complete-collection-modal');
        this.completingEntryId = null;
        this.pendingPhotoDataUrl = null;
    }

    handleCollectionPhotoSelect(input) {
        if (!input.files || !input.files[0]) return;

        this.handlePhotoUpload(input.files[0], (dataUrl) => {
            this.pendingPhotoDataUrl = dataUrl;
            
            const preview = document.getElementById('collection-photo-preview');
            if (preview) {
                preview.innerHTML = `<img src="${dataUrl}" alt="Preview">`;
            }
        });
    }

    // Quest Photo Modal
    openQuestPhotoModal(questId) {
        this.photoQuestId = questId;
        const quest = this.data.quests.find(q => q.id === questId);
        if (!quest) return;

        const modal = document.getElementById('quest-photo-modal');
        const nameEl = document.getElementById('quest-photo-name');

        if (modal) {
            if (nameEl) nameEl.textContent = quest.name;
            // Reset
            const fileInput = document.getElementById('quest-photo-input');
            if (fileInput) fileInput.value = '';
            const preview = document.getElementById('quest-photo-preview');
            if (preview) preview.innerHTML = '';
            this.pendingQuestPhotoDataUrl = null;

            modal.classList.add('active');
            document.body.classList.add('modal-open');
        }
    }

    handleQuestPhotoSelect(input) {
        if (!input.files || !input.files[0]) return;

        this.handlePhotoUpload(input.files[0], (dataUrl) => {
            this.pendingQuestPhotoDataUrl = dataUrl;
            
            const preview = document.getElementById('quest-photo-preview');
            if (preview) {
                preview.innerHTML = `<img src="${dataUrl}" alt="Preview">`;
            }
        });
    }

    submitQuestWithPhoto() {
        if (!this.photoQuestId) return;

        const caption = document.getElementById('quest-photo-caption')?.value?.trim() || '';
        
        const photoData = this.pendingQuestPhotoDataUrl ? {
            dataUrl: this.pendingQuestPhotoDataUrl,
            caption: caption
        } : null;

        this.completeQuest(this.photoQuestId, photoData);
        
        this.closeModal('quest-photo-modal');
        this.photoQuestId = null;
        this.pendingQuestPhotoDataUrl = null;
    }

    // ═══════════════════════════════════════════════════════════════
    // EVENT LISTENERS
    // ═══════════════════════════════════════════════════════════════

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });

        // Mobile navigation
        document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
                this.toggleMobileMenu();
            });
        });

        // Skill card clicks
        document.querySelectorAll('.skill-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const skill = e.currentTarget.dataset.skill;
                this.openSkillModal(skill);
            });
        });

        // Quest filters
        document.querySelectorAll('[data-filter-type]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterQuestsByType(e.currentTarget.dataset.filterType);
            });
        });

        document.querySelectorAll('[data-filter-path]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterQuestsByPath(e.currentTarget.dataset.filterPath);
            });
        });

        // Status filters
        document.querySelectorAll('[data-filter-status]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterQuestsByStatus(e.currentTarget.dataset.filterStatus);
            });
        });

        // Add quest form
        const addQuestForm = document.getElementById('add-quest-form');
        if (addQuestForm) {
            addQuestForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('new-quest-name')?.value;
                const frequency = document.getElementById('new-quest-frequency')?.value;
                const skill = document.getElementById('new-quest-skill')?.value;
                const xp = parseInt(document.getElementById('new-quest-xp')?.value) || 25;

                if (name && skill) {
                    this.addCustomQuest(name, frequency, [{ skill, xp }]);
                    addQuestForm.reset();
                    this.closeModal('add-quest-modal');
                    this.showToast(`Quest "${name}" created!`, 'success');
                }
            });
        }

        // Edit quest form
        const editQuestForm = document.getElementById('edit-quest-form');
        if (editQuestForm) {
            editQuestForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveEditedQuest();
            });
        }

        // Challenge template buttons
        document.querySelectorAll('[data-challenge-template]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const template = e.currentTarget.dataset.challengeTemplate;
                this.startChallenge(template);
                this.closeModal('add-challenge-modal');
            });
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.classList.remove('active');
                    document.body.classList.remove('modal-open');
                }
            });
        });

        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                    document.body.classList.remove('modal-open');
                }
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // MOBILE MENU
    // ═══════════════════════════════════════════════════════════════

    toggleMobileMenu() {
        const menu = document.getElementById('mobile-menu');
        if (menu) {
            menu.classList.toggle('active');
            document.body.classList.toggle('menu-open');
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SKILL DETAIL MODAL
    // ═══════════════════════════════════════════════════════════════

    openSkillModal(skillId) {
        const skill = this.data.skills[skillId];
        if (!skill) return;

        this.currentSkillModalId = skillId; // Store for refreshing

        const level = this.getLevelFromXP(skill.xp);
        const xpForCurrentLevel = this.getXPForLevel(level);
        const xpForNextLevel = this.getXPForLevel(level + 1);
        const xpProgress = skill.xp - xpForCurrentLevel;
        const xpNeeded = xpForNextLevel - xpForCurrentLevel;
        const progressPercent = (xpProgress / xpNeeded) * 100;

        // Update modal header
        document.getElementById('skill-modal-icon').textContent = this.getSkillEmoji(skillId);
        document.getElementById('skill-modal-name').textContent = this.getSkillName(skillId);
        
        // Update stats
        document.getElementById('skill-modal-level').textContent = level;
        document.getElementById('skill-modal-xp').textContent = skill.xp.toLocaleString();
        document.getElementById('skill-modal-streak').textContent = skill.currentStreak || 0;
        
        // Update XP bar
        document.getElementById('skill-modal-xp-fill').style.width = `${progressPercent}%`;
        document.getElementById('skill-modal-xp-text').textContent = 
            `${xpProgress.toLocaleString()} / ${xpNeeded.toLocaleString()} XP to level ${level + 1}`;

        // Get recent completions for this skill
        const recentCompletions = this.getRecentCompletionsForSkill(skillId, 5);
        const today = new Date().toDateString();
        const recentHtml = recentCompletions.length > 0 
            ? recentCompletions.map(c => {
                const isToday = new Date(c.timestamp).toDateString() === today;
                return `
                <div class="skill-quest-item completed ${isToday ? 'undoable' : ''}" 
                     ${isToday ? `onclick="app.undoQuestFromModal('${c.questId}')"` : ''}>
                    <span class="quest-icon">✓</span>
                    <span class="quest-name">${c.questName}</span>
                    <span class="quest-xp">+${c.xp} XP</span>
                    ${isToday 
                        ? '<span class="quest-action undo">↩ Undo</span>' 
                        : `<span class="quest-date">${this.formatRelativeDate(c.timestamp)}</span>`}
                </div>
            `}).join('')
            : '<p class="empty-hint">No recent completions</p>';
        document.getElementById('skill-modal-recent').innerHTML = recentHtml;

        // Get available quests for this skill (sorted by XP ascending)
        const availableQuests = this.getAvailableQuestsForSkill(skillId);
        const availableHtml = availableQuests.length > 0
            ? availableQuests.map(q => `
                <div class="skill-quest-item available" onclick="app.completeQuestFromModal('${q.id}')">
                    <span class="quest-icon">${this.getFrequencyIcon(q.frequency)}</span>
                    <span class="quest-name">${q.name}</span>
                    <span class="quest-xp">+${q.xp} XP</span>
                    <span class="quest-action">Complete →</span>
                </div>
            `).join('')
            : '<p class="empty-hint">No available quests for this skill</p>';
        document.getElementById('skill-modal-available').innerHTML = availableHtml;

        // Show modal
        document.getElementById('skill-modal').classList.add('active');
        document.body.classList.add('modal-open');
    }

    closeSkillModal() {
        document.getElementById('skill-modal').classList.remove('active');
        document.body.classList.remove('modal-open');
        this.currentSkillModalId = null;
    }

    undoQuestFromModal(questId) {
        this.uncompleteQuest(questId);
        // Refresh the modal
        if (this.currentSkillModalId) {
            this.openSkillModal(this.currentSkillModalId);
        }
    }

    getRecentCompletionsForSkill(skillId, limit = 5) {
        const completions = this.data.completionLog?.completions || [];
        
        return completions
            .filter(c => {
                // Check if this completion awarded XP to this skill
                return c.xpAwarded?.some(xp => xp.skill === skillId);
            })
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit)
            .map(c => {
                const quest = this.data.quests.find(q => q.id === c.questId);
                const xpForSkill = c.xpAwarded?.find(xp => xp.skill === skillId)?.xp || 0;
                return {
                    questId: c.questId,
                    questName: quest?.name || c.questId,
                    xp: xpForSkill,
                    timestamp: c.timestamp
                };
            });
    }

    getAvailableQuestsForSkill(skillId) {
        const today = new Date().toDateString();
        
        return this.data.quests
            .filter(q => {
                // Must be active and reward this skill
                if (!q.active) return false;
                const rewardsSkill = q.rewards?.some(r => r.skill === skillId);
                if (!rewardsSkill) return false;

                // Check if already completed based on frequency
                const isCompletedToday = this.data.completionLog?.completedToday?.includes(q.id);
                const isCompletedThisWeek = this.data.completionLog?.completedThisWeek?.includes(q.id);
                const isCompletedThisMonth = this.data.completionLog?.completedThisMonth?.includes(q.id);
                const isCompletedEver = this.data.completionLog?.completedEver?.includes(q.id);

                switch (q.frequency) {
                    case 'daily': return !isCompletedToday;
                    case 'weekly': return !isCompletedThisWeek;
                    case 'monthly': return !isCompletedThisMonth;
                    case 'one-time': return !isCompletedEver;
                    case 'as-needed': return true;
                    default: return true;
                }
            })
            .map(q => {
                const xpForSkill = q.rewards?.find(r => r.skill === skillId)?.xp || 0;
                return { ...q, xp: xpForSkill };
            })
            .sort((a, b) => a.xp - b.xp); // Sort by XP ascending (easiest first)
    }

    getFrequencyIcon(frequency) {
        const icons = {
            'daily': '📅',
            'weekly': '📆',
            'monthly': '🗓️',
            'as-needed': '🔄',
            'one-time': '⭐'
        };
        return icons[frequency] || '📋';
    }

    formatRelativeDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }

    completeQuestFromModal(questId) {
        this.completeQuest(questId);
        // Refresh the modal with updated data
        const skillId = document.getElementById('skill-modal-name').textContent.toLowerCase().replace(' ', '');
        // Find the actual skill ID from the name
        const skillEntry = Object.entries(this.data.skills).find(([id, data]) => 
            this.getSkillName(id) === document.getElementById('skill-modal-name').textContent
        );
        if (skillEntry) {
            this.openSkillModal(skillEntry[0]);
        } else {
            this.closeSkillModal();
        }
    }

    switchView(viewName) {
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === viewName);
        });

        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.add('active');
        }
    }

    navigateToQuest(questId) {
        // Switch to quests view
        this.switchView('quests');
        
        // Wait a moment for view to render
        setTimeout(() => {
            // Find the quest card
            const questCard = document.querySelector(`.quest-card[data-quest-id="${questId}"]`);
            
            if (questCard) {
                // Reset all filters to show all quests
                this.currentStatusFilter = 'all';
                this.currentTypeFilter = 'all';
                this.currentPathFilter = 'all';
                
                // Update filter buttons
                document.querySelectorAll('[data-filter-status]').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.filterStatus === 'all');
                });
                document.querySelectorAll('[data-filter-type]').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.filterType === 'all');
                });
                document.querySelectorAll('[data-filter-path]').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.filterPath === 'all');
                });
                
                // Reapply filters to show the quest
                this.applyQuestFilters();
                
                // Highlight the quest card
                questCard.classList.add('quest-highlight');
                
                // Scroll to the quest card
                questCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Remove highlight after 3 seconds
                setTimeout(() => {
                    questCard.classList.remove('quest-highlight');
                }, 3000);
            }
        }, 100);
    }

    // ═══════════════════════════════════════════════════════════════
    // DATA EXPORT/IMPORT
    // ═══════════════════════════════════════════════════════════════

    exportData() {
        const dataStr = JSON.stringify(this.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `life-rpg-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        this.showToast('Data exported!', 'success');
    }

    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                
                if (!confirm('This will replace all your current data. Are you sure?')) {
                    return;
                }

                this.data = imported;
                this.migrateData();
                this.saveData();
                this.renderAll();
                
                this.showToast('Data imported successfully!', 'success');
            } catch (error) {
                this.showToast('Error importing data: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
    }

    async resetAllData() {
        if (!confirm('⚠️ This will DELETE ALL your data! Are you sure?')) {
            return;
        }
        
        if (!confirm('Last chance! This cannot be undone. Delete everything?')) {
            return;
        }

        try {
            // Clear localStorage
            localStorage.removeItem('lifeRPGData');
            localStorage.clear();
            sessionStorage.clear();
            
            // Unregister service workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    await registration.unregister();
                }
            }
            
            // Clear all caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (let cacheName of cacheNames) {
                    await caches.delete(cacheName);
                }
            }
            
            // Hard reload to get fresh files
            location.reload(true);
        } catch (error) {
            console.error('Error clearing data:', error);
            // Fallback to simple reload
            localStorage.removeItem('lifeRPGData');
            location.reload(true);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // PROGRESS RINGS
    // ═══════════════════════════════════════════════════════════════

    updateProgressRings() {
        const circumference = 2 * Math.PI * 45; // r=45

        // Daily quests completed
        const dailyQuests = this.data.quests.filter(q => q.frequency === 'daily' && q.active);
        const completedToday = this.data.completionLog?.completedToday?.length || 0;
        const dailyPercent = dailyQuests.length > 0 ? (completedToday / dailyQuests.length) * 100 : 0;
        
        const dailyRing = document.querySelector('.daily-quests-ring');
        if (dailyRing) {
            dailyRing.style.strokeDasharray = `${(dailyPercent / 100) * circumference}, ${circumference}`;
        }
        document.getElementById('daily-quests-done').textContent = completedToday;

        // Skills trained today
        const skillsTrained = Object.values(this.data.skills).filter(s => 
            s.lastAwardedDate === new Date().toDateString()
        ).length;
        const skillsPercent = (skillsTrained / 10) * 100;
        
        const skillsRing = document.querySelector('.skills-trained-ring');
        if (skillsRing) {
            skillsRing.style.strokeDasharray = `${(skillsPercent / 100) * circumference}, ${circumference}`;
        }
        document.getElementById('skills-trained').textContent = skillsTrained;

        // Challenge progress (average of all active challenges)
        const activeChallenges = this.data.challenges.filter(c => c.active);
        let challengePercent = 0;
        if (activeChallenges.length > 0) {
            const totalPercent = activeChallenges.reduce((sum, c) => {
                const completed = c.currentPeriod.completedQuests.length;
                const total = c.questIds.length;
                return sum + (completed / total) * 100;
            }, 0);
            challengePercent = totalPercent / activeChallenges.length;
        }
        
        const challengeRing = document.querySelector('.challenges-ring');
        if (challengeRing) {
            challengeRing.style.strokeDasharray = `${(challengePercent / 100) * circumference}, ${circumference}`;
        }
        document.getElementById('challenges-progress').textContent = Math.round(challengePercent) + '%';

        // Update login streak display
        const loginStreakEl = document.getElementById('login-streak');
        if (loginStreakEl && this.data.loginStreak) {
            loginStreakEl.textContent = this.data.loginStreak.current;
        }

        // Update daily XP
        const dailyXP = this.calculateDailyXP();
        document.getElementById('daily-xp').textContent = dailyXP;
    }

    calculateDailyXP() {
        const today = new Date().toDateString();
        return this.data.completionLog?.completions
            ?.filter(c => new Date(c.timestamp).toDateString() === today)
            ?.reduce((sum, c) => sum + (c.xpAwarded?.reduce((s, x) => s + x.xp, 0) || 0), 0) || 0;
    }

    // ═══════════════════════════════════════════════════════════════
    // WEEKLY SUMMARY IMAGE GENERATOR
    // ═══════════════════════════════════════════════════════════════

    generateWeeklySummary() {
        const canvas = document.getElementById('summary-canvas');
        const ctx = canvas.getContext('2d');
        
        // Polyfill for roundRect (not available in all browsers)
        if (!ctx.roundRect) {
            ctx.roundRect = function(x, y, w, h, r) {
                if (w < 2 * r) r = w / 2;
                if (h < 2 * r) r = h / 2;
                this.moveTo(x + r, y);
                this.arcTo(x + w, y, x + w, y + h, r);
                this.arcTo(x + w, y + h, x, y + h, r);
                this.arcTo(x, y + h, x, y, r);
                this.arcTo(x, y, x + w, y, r);
                this.closePath();
                return this;
            };
        }
        
        // Set canvas size for Instagram story (1080x1920)
        canvas.width = 1080;
        canvas.height = 1920;

        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#1a0f0a');
        gradient.addColorStop(0.5, '#2b1810');
        gradient.addColorStop(1, '#1a0f0a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Add decorative border
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 8;
        ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

        // Inner border
        ctx.strokeStyle = '#8b6914';
        ctx.lineWidth = 3;
        ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

        // Title
        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 72px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('✨ Weekly Recap ✨', canvas.width / 2, 150);

        // Date range
        const now = new Date();
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        const dateRange = `${weekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        ctx.fillStyle = '#c9a55a';
        ctx.font = '36px Georgia, serif';
        ctx.fillText(dateRange, canvas.width / 2, 210);

        // Calculate weekly stats
        const weeklyStats = this.calculateWeeklyStats();

        // Main stats section
        let y = 320;

        // Total XP this week
        this.drawStatCard(ctx, 'Total XP Earned', weeklyStats.totalXP.toLocaleString(), '⚡', 100, y, 880, 140);
        y += 170;

        // Quests completed
        this.drawStatCard(ctx, 'Quests Completed', weeklyStats.questsCompleted.toString(), '✓', 100, y, 420, 140);
        this.drawStatCard(ctx, 'Login Streak', (this.data.loginStreak?.current || 0) + ' days', '🔥', 560, y, 420, 140);
        y += 170;

        // Skills section
        y += 30;
        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 48px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('📊 Skill Progress', canvas.width / 2, y);
        y += 60;

        // Draw skill bars
        const skills = Object.entries(this.data.skills)
            .map(([id, data]) => ({
                id,
                name: this.getSkillName(id),
                emoji: this.getSkillEmoji(id),
                level: this.getLevelFromXP(data.xp),
                xp: data.xp,
                weeklyXP: weeklyStats.skillXP[id] || 0
            }))
            .sort((a, b) => b.weeklyXP - a.weeklyXP);

        skills.forEach((skill, i) => {
            this.drawSkillBar(ctx, skill, 100, y + (i * 85), 880);
        });

        y += skills.length * 85 + 50;

        // Achievements/highlights
        if (weeklyStats.levelUps.length > 0) {
            ctx.fillStyle = '#d4af37';
            ctx.font = 'bold 42px Georgia, serif';
            ctx.textAlign = 'center';
            ctx.fillText('🏆 Level Ups This Week', canvas.width / 2, y);
            y += 50;
            
            weeklyStats.levelUps.forEach(lu => {
                ctx.fillStyle = '#c9a55a';
                ctx.font = '32px Georgia, serif';
                ctx.fillText(`${this.getSkillEmoji(lu.skill)} ${this.getSkillName(lu.skill)} → Level ${lu.level}`, canvas.width / 2, y);
                y += 45;
            });
        }

        // Footer
        ctx.fillStyle = '#8b6914';
        ctx.font = 'italic 28px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('Life RPG - Level Up Your Life', canvas.width / 2, canvas.height - 80);

        // Show modal
        document.getElementById('weekly-summary-modal').classList.add('active');
        document.body.classList.add('modal-open');
    }

    drawStatCard(ctx, label, value, emoji, x, y, width, height) {
        // Card background
        ctx.fillStyle = 'rgba(43, 24, 16, 0.8)';
        ctx.strokeStyle = '#8b6914';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 15);
        ctx.fill();
        ctx.stroke();

        // Emoji
        ctx.font = '48px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(emoji, x + 25, y + 70);

        // Value
        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 52px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(value, x + width / 2 + 20, y + 65);

        // Label
        ctx.fillStyle = '#c9a55a';
        ctx.font = '28px Georgia, serif';
        ctx.fillText(label, x + width / 2 + 20, y + 105);
    }

    drawSkillBar(ctx, skill, x, y, width) {
        const barHeight = 45;
        const progress = Math.min((skill.xp / this.getXPForLevel(skill.level + 1)) * 100, 100);

        // Emoji and name
        ctx.fillStyle = '#c9a55a';
        ctx.font = '28px Georgia, serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${skill.emoji} ${skill.name}`, x, y + 25);

        // Level badge
        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 24px Georgia, serif';
        ctx.textAlign = 'right';
        ctx.fillText(`Lv ${skill.level}`, x + width, y + 25);

        // Weekly XP
        if (skill.weeklyXP > 0) {
            ctx.fillStyle = '#4ade80';
            ctx.font = '22px Georgia, serif';
            ctx.fillText(`+${skill.weeklyXP} XP`, x + width - 100, y + 25);
        }

        // Background bar
        ctx.fillStyle = '#1a0f0a';
        ctx.beginPath();
        ctx.roundRect(x, y + 35, width, barHeight, 8);
        ctx.fill();

        // Progress fill
        const progressGradient = ctx.createLinearGradient(x, 0, x + width * (progress / 100), 0);
        progressGradient.addColorStop(0, '#d4af37');
        progressGradient.addColorStop(1, '#f4d03f');
        ctx.fillStyle = progressGradient;
        ctx.beginPath();
        ctx.roundRect(x, y + 35, width * (progress / 100), barHeight, 8);
        ctx.fill();
    }

    calculateWeeklyStats() {
        const now = new Date();
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        
        const weeklyCompletions = this.data.completionLog?.completions?.filter(c => 
            new Date(c.timestamp) >= weekAgo
        ) || [];

        const stats = {
            totalXP: 0,
            questsCompleted: weeklyCompletions.length,
            skillXP: {},
            levelUps: []
        };

        // Calculate XP per skill
        weeklyCompletions.forEach(c => {
            c.xpAwarded?.forEach(xp => {
                stats.totalXP += xp.xp;
                stats.skillXP[xp.skill] = (stats.skillXP[xp.skill] || 0) + xp.xp;
            });
        });

        // Find level ups (simplistic - check if current level was reached this week)
        // For now, just show skills that gained XP
        Object.entries(stats.skillXP).forEach(([skill, xp]) => {
            if (xp >= 83) { // Roughly enough for a level at low levels
                const currentLevel = this.getLevelFromXP(this.data.skills[skill].xp);
                stats.levelUps.push({ skill, level: currentLevel });
            }
        });

        return stats;
    }

    downloadWeeklySummary() {
        const canvas = document.getElementById('summary-canvas');
        const link = document.createElement('a');
        link.download = `life-rpg-weekly-${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        this.showToast('Summary downloaded!', 'success');
    }

    // ═══════════════════════════════════════════════════════════════
    // SPECIAL BADGES SYSTEM
    // ═══════════════════════════════════════════════════════════════

    getSpecialBadges() {
        return [
            // Streak badges
            { id: 'streak_7', name: 'Week Warrior', description: '7-day login streak', icon: '🔥', condition: () => this.data.loginStreak?.current >= 7 },
            { id: 'streak_30', name: 'Monthly Master', description: '30-day login streak', icon: '🌟', condition: () => this.data.loginStreak?.current >= 30 },
            { id: 'streak_100', name: 'Century Club', description: '100-day login streak', icon: '💯', condition: () => this.data.loginStreak?.current >= 100 },
            
            // Completion badges
            { id: 'first_quest', name: 'First Step', description: 'Complete your first quest', icon: '👣', condition: () => this.data.completionLog?.completions?.length >= 1 },
            { id: 'quest_50', name: 'Half Century', description: 'Complete 50 quests', icon: '⚔️', condition: () => this.data.completionLog?.completions?.length >= 50 },
            { id: 'quest_100', name: 'Centurion', description: 'Complete 100 quests', icon: '🏛️', condition: () => this.data.completionLog?.completions?.length >= 100 },
            { id: 'quest_500', name: 'Legend', description: 'Complete 500 quests', icon: '🦸', condition: () => this.data.completionLog?.completions?.length >= 500 },
            
            // Level badges
            { id: 'first_level', name: 'Leveling Up', description: 'Reach level 2 in any skill', icon: '📈', condition: () => Object.values(this.data.skills).some(s => this.getLevelFromXP(s.xp) >= 2) },
            { id: 'level_10', name: 'Double Digits', description: 'Reach level 10 in any skill', icon: '🔟', condition: () => Object.values(this.data.skills).some(s => this.getLevelFromXP(s.xp) >= 10) },
            { id: 'level_50', name: 'Halfway There', description: 'Reach level 50 in any skill', icon: '🎯', condition: () => Object.values(this.data.skills).some(s => this.getLevelFromXP(s.xp) >= 50) },
            { id: 'level_99', name: 'Mastery', description: 'Reach level 99 in any skill', icon: '👑', condition: () => Object.values(this.data.skills).some(s => this.getLevelFromXP(s.xp) >= 99) },
            
            // Balance badges
            { id: 'balanced_5', name: 'Well Rounded', description: 'Get all skills to level 5+', icon: '⚖️', condition: () => Object.values(this.data.skills).every(s => this.getLevelFromXP(s.xp) >= 5) },
            { id: 'balanced_10', name: 'Renaissance Soul', description: 'Get all skills to level 10+', icon: '🎨', condition: () => Object.values(this.data.skills).every(s => this.getLevelFromXP(s.xp) >= 10) },
            
            // Special activity badges
            { id: 'early_bird', name: 'Early Bird', description: 'Complete a quest before 7am', icon: '🌅', condition: () => this.data.completionLog?.completions?.some(c => new Date(c.timestamp).getHours() < 7) },
            { id: 'night_owl', name: 'Night Owl', description: 'Complete a quest after 11pm', icon: '🦉', condition: () => this.data.completionLog?.completions?.some(c => new Date(c.timestamp).getHours() >= 23) },
            { id: 'weekend_warrior', name: 'Weekend Warrior', description: 'Complete 10+ quests on a weekend', icon: '🎉', condition: () => this.checkWeekendWarrior() },
            
            // Challenge badges
            { id: 'challenge_start', name: 'Challenger', description: 'Start your first challenge', icon: '🎯', condition: () => this.data.challenges?.length >= 1 },
            { id: 'challenge_complete', name: 'Challenge Champion', description: 'Maintain a 7+ day challenge streak', icon: '🏆', condition: () => this.data.challenges?.some(c => c.currentStreak >= 7) },
            
            // Collection badges
            { id: 'collector', name: 'Memory Keeper', description: 'Add 10 items to Collection Log', icon: '📸', condition: () => (this.data.collectionLog?.entries?.length || 0) >= 10 },
            { id: 'photographer', name: 'Shutterbug', description: 'Complete 20 quests with photos', icon: '📷', condition: () => this.data.completionLog?.completions?.filter(c => c.photo)?.length >= 20 },
            
            // Path badges
            { id: 'path_started', name: 'Path Finder', description: 'Complete a path stage', icon: '🗺️', condition: () => this.data.paths?.some(p => p.stages?.some(s => s.completed)) },
            { id: 'path_complete', name: 'Path Master', description: 'Complete an entire path', icon: '🏅', condition: () => this.data.paths?.some(p => p.completed) },
        ];
    }

    checkWeekendWarrior() {
        const completions = this.data.completionLog?.completions || [];
        const weekendCompletions = {};
        
        completions.forEach(c => {
            const date = new Date(c.timestamp);
            const day = date.getDay();
            if (day === 0 || day === 6) {
                const weekKey = `${date.getFullYear()}-${date.getMonth()}-${Math.floor(date.getDate() / 7)}`;
                weekendCompletions[weekKey] = (weekendCompletions[weekKey] || 0) + 1;
            }
        });
        
        return Object.values(weekendCompletions).some(count => count >= 10);
    }

    checkSpecialBadges(results) {
        if (!this.data.earnedBadges) {
            this.data.earnedBadges = [];
        }

        const badges = this.getSpecialBadges();
        
        badges.forEach(badge => {
            if (!this.data.earnedBadges.includes(badge.id) && badge.condition()) {
                this.data.earnedBadges.push(badge.id);
                this.showBadgeEarned(badge);
            }
        });
    }

    showBadgeEarned(badge) {
        this.playSound('achievement');
        this.triggerHaptic('levelUp');
        this.showConfetti();
        
        setTimeout(() => {
            this.showToast(`🏅 Badge Earned: ${badge.name}!`, 'achievement');
        }, 500);
    }

    openBadgesModal() {
        const container = document.getElementById('badges-container');
        if (!container) return;

        const badges = this.getSpecialBadges();
        const earnedBadges = this.data.earnedBadges || [];

        container.innerHTML = badges.map(badge => {
            const earned = earnedBadges.includes(badge.id);
            return `
                <div class="badge-card ${earned ? 'earned' : 'locked'}">
                    <div class="badge-icon">${earned ? badge.icon : '🔒'}</div>
                    <div class="badge-info">
                        <h4>${badge.name}</h4>
                        <p>${badge.description}</p>
                    </div>
                </div>
            `;
        }).join('');

        document.getElementById('badges-modal').classList.add('active');
        document.body.classList.add('modal-open');
    }

    // ═══════════════════════════════════════════════════════════════
    // SETTINGS
    // ═══════════════════════════════════════════════════════════════

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        if (!this.data.settings) this.data.settings = {};
        this.data.settings.soundEnabled = this.soundEnabled;
        this.saveData();
        this.showToast(this.soundEnabled ? '🔊 Sound enabled' : '🔇 Sound disabled', 'info');
    }

    // ═══════════════════════════════════════════════════════════════
    // ONBOARDING SYSTEM
    // ═══════════════════════════════════════════════════════════════

    showOnboarding() {
        console.log('🎮 showOnboarding() called');
        const overlay = document.getElementById('onboarding-overlay');
        if (!overlay) {
            console.error('❌ ERROR: Onboarding overlay element not found in DOM!');
            console.log('This means the HTML is not deployed correctly.');
            return;
        }
        console.log('✅ Onboarding overlay found');

        this.onboardingStep = 1;
        this.onboardingData = {
            name: '',
            primaryGoals: [],
            usageFrequency: '',
            gender: null,
            ageRange: null,
            relationshipStatus: null,
            partnerName: '',
            hasChildren: false,
            numberOfChildren: 0,
            childrenAges: [],
            caregivingResponsibilities: [],
            workSituation: null,
            livingSituation: null
        };

        overlay.classList.add('active');
        console.log('✅ Added "active" class to overlay');
        console.log('Overlay display:', window.getComputedStyle(overlay).display);
        
        this.renderOnboardingStep(1);
        console.log('✅ Rendered step 1');
    }

    renderOnboardingStep(step) {
        this.onboardingStep = step;
        
        // Update progress
        document.querySelectorAll('.onboarding-step').forEach((el, index) => {
            el.classList.toggle('active', index + 1 === step);
        });
        
        const dots = document.querySelectorAll('.progress-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index < step);
        });
        
        document.getElementById('step-number').textContent = `Step ${step} of 7`;
        
        // Control button visibility
        const backBtn = document.getElementById('onboarding-back-btn');
        const skipBtn = document.getElementById('onboarding-skip-btn');
        const nextBtn = document.getElementById('onboarding-next-btn');
        
        backBtn.style.display = step > 1 ? 'block' : 'none';
        skipBtn.style.display = (step >= 4 && step <= 6) ? 'block' : 'none';
        
        if (step === 7) {
            nextBtn.textContent = 'Start My Adventure! 🚀';
            nextBtn.classList.add('adventure-btn');
        } else {
            nextBtn.textContent = 'Continue →';
            nextBtn.classList.remove('adventure-btn');
        }
        
        // Render specific step content
        const contentEl = document.getElementById('onboarding-content');
        contentEl.innerHTML = this.getOnboardingStepHTML(step);
        
        // Pre-fill form if returning to step
        this.prefillOnboardingStep(step);
    }

    getOnboardingStepHTML(step) {
        switch (step) {
            case 1: return this.getStep1HTML();
            case 2: return this.getStep2HTML();
            case 3: return this.getStep3HTML();
            case 4: return this.getStep4HTML();
            case 5: return this.getStep5HTML();
            case 6: return this.getStep6HTML();
            case 7: return this.getStep7HTML();
            default: return '';
        }
    }

    getStep1HTML() {
        return `
            <div class="onboarding-step-content">
                <div class="onboarding-icon">🎮</div>
                <h1>Welcome to Life RPG!</h1>
                <p class="subtitle">Your life is about to become an epic adventure.</p>
                
                <div class="form-group">
                    <label for="onboarding-name">What should we call you?</label>
                    <input type="text" id="onboarding-name" class="form-input" 
                           placeholder="Enter your name..." maxlength="50" required>
                </div>
            </div>
        `;
    }

    getStep2HTML() {
        const goals = [
            { id: 'fitness', icon: '💪', name: 'Get Fit & Healthy' },
            { id: 'business', icon: '🚀', name: 'Build My Business' },
            { id: 'creativity', icon: '🎨', name: 'Express Creativity' },
            { id: 'relationships', icon: '💕', name: 'Strengthen Relationships' },
            { id: 'inner-peace', icon: '🧘', name: 'Find Inner Peace' },
            { id: 'home', icon: '🏠', name: 'Create Beautiful Home' },
            { id: 'influence', icon: '📸', name: 'Share My Journey' },
            { id: 'giving', icon: '🤝', name: 'Give Back & Help' },
            { id: 'cooking', icon: '🍳', name: 'Master Cooking' }
        ];

        return `
            <div class="onboarding-step-content">
                <h2>What are your main goals?</h2>
                <p class="subtitle">Select all that apply (pick 1-5):</p>
                
                <div class="goal-grid">
                    ${goals.map(goal => `
                        <div class="goal-card" data-goal="${goal.id}">
                            <div class="goal-icon">${goal.icon}</div>
                            <div class="goal-name">${goal.name}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    getStep3HTML() {
        return `
            <div class="onboarding-step-content">
                <h2>How often do you want to check in?</h2>
                <p class="subtitle">This helps us recommend quests that fit your lifestyle.</p>
                
                <div class="frequency-options">
                    <label class="frequency-option">
                        <input type="radio" name="frequency" value="daily">
                        <div class="frequency-card">
                            <div class="frequency-title">Every day</div>
                            <div class="frequency-desc">Daily check-ins, 1+ times</div>
                        </div>
                    </label>
                    
                    <label class="frequency-option">
                        <input type="radio" name="frequency" value="most-days">
                        <div class="frequency-card">
                            <div class="frequency-title">Most days (4-5x per week)</div>
                            <div class="frequency-desc">Regular habit, flexible</div>
                        </div>
                    </label>
                    
                    <label class="frequency-option">
                        <input type="radio" name="frequency" value="few-times">
                        <div class="frequency-card">
                            <div class="frequency-title">Few times a week (2-3x)</div>
                            <div class="frequency-desc">Casual, when schedule allows</div>
                        </div>
                    </label>
                    
                    <label class="frequency-option">
                        <input type="radio" name="frequency" value="weekly">
                        <div class="frequency-card">
                            <div class="frequency-title">Weekly check-ins</div>
                            <div class="frequency-desc">Once a week accountability</div>
                        </div>
                    </label>
                    
                    <label class="frequency-option">
                        <input type="radio" name="frequency" value="casual">
                        <div class="frequency-card">
                            <div class="frequency-title">Casual / When I remember</div>
                            <div class="frequency-desc">No pressure, flexible</div>
                        </div>
                    </label>
                </div>
            </div>
        `;
    }

    getStep4HTML() {
        return `
            <div class="onboarding-step-content">
                <h2>Tell us a bit about yourself</h2>
                <p class="subtitle optional-note">Optional - Skip anytime</p>
                
                <div class="form-section">
                    <label>Gender:</label>
                    <div class="radio-group">
                        <label><input type="radio" name="gender" value="female"> Female</label>
                        <label><input type="radio" name="gender" value="male"> Male</label>
                        <label><input type="radio" name="gender" value="non-binary"> Non-binary</label>
                        <label><input type="radio" name="gender" value="null"> Prefer not to say</label>
                    </div>
                </div>
                
                <div class="form-section">
                    <label>Age Range:</label>
                    <div class="radio-group">
                        <label><input type="radio" name="age" value="18-25"> 18-25</label>
                        <label><input type="radio" name="age" value="26-35"> 26-35</label>
                        <label><input type="radio" name="age" value="36-45"> 36-45</label>
                        <label><input type="radio" name="age" value="46-55"> 46-55</label>
                        <label><input type="radio" name="age" value="56+"> 56+</label>
                        <label><input type="radio" name="age" value="null"> Prefer not to say</label>
                    </div>
                </div>
                
                <div class="form-helper">
                    ℹ️ Why we ask: Helps personalize quest names and recommendations.
                </div>
            </div>
        `;
    }

    getStep5HTML() {
        return `
            <div class="onboarding-step-content">
                <h2>Who's part of your adventure?</h2>
                
                <div class="form-section">
                    <label>Relationship Status:</label>
                    <div class="radio-group">
                        <label><input type="radio" name="relationship" value="single"> Single</label>
                        <label><input type="radio" name="relationship" value="relationship"> In a relationship</label>
                        <label><input type="radio" name="relationship" value="married"> Married / Partnered</label>
                        <label><input type="radio" name="relationship" value="complicated"> It's complicated</label>
                        <label><input type="radio" name="relationship" value="null"> Prefer not to say</label>
                    </div>
                </div>
                
                <div class="form-group" id="partner-name-group" style="display: none;">
                    <label for="partner-name">Partner's Name (optional):</label>
                    <input type="text" id="partner-name" class="form-input" placeholder="Your partner's name...">
                </div>
                
                <div class="form-section">
                    <label>Do you have children?</label>
                    <div class="radio-group">
                        <label><input type="radio" name="has-children" value="yes"> Yes</label>
                        <label><input type="radio" name="has-children" value="no"> No</label>
                    </div>
                </div>
                
                <div id="children-details" style="display: none;">
                    <div class="form-group">
                        <label>How many? <input type="number" id="num-children" min="1" max="20" style="width: 60px;"></label>
                    </div>
                    <div class="form-section">
                        <label>Ages:</label>
                        <div class="checkbox-group">
                            <label><input type="checkbox" value="0-2"> 0-2</label>
                            <label><input type="checkbox" value="3-5"> 3-5</label>
                            <label><input type="checkbox" value="6-12"> 6-12</label>
                            <label><input type="checkbox" value="13-17"> 13-17</label>
                            <label><input type="checkbox" value="18+"> 18+</label>
                        </div>
                    </div>
                </div>
                
                <div class="form-section">
                    <label>Other caregiving responsibilities:</label>
                    <div class="checkbox-group">
                        <label><input type="checkbox" value="parents" class="caregiving-check"> Elderly parents</label>
                        <label><input type="checkbox" value="family" class="caregiving-check"> Other family members</label>
                        <label><input type="checkbox" value="pets" class="caregiving-check"> Pets</label>
                    </div>
                </div>
            </div>
        `;
    }

    getStep6HTML() {
        return `
            <div class="onboarding-step-content">
                <h2>What's your daily life like?</h2>
                
                <div class="form-section">
                    <label>Work Situation:</label>
                    <div class="radio-group">
                        <label><input type="radio" name="work" value="full-time"> Working full-time</label>
                        <label><input type="radio" name="work" value="part-time"> Working part-time</label>
                        <label><input type="radio" name="work" value="self-employed"> Self-employed / Entrepreneur</label>
                        <label><input type="radio" name="work" value="student"> Student</label>
                        <label><input type="radio" name="work" value="stay-at-home"> Stay-at-home parent</label>
                        <label><input type="radio" name="work" value="retired"> Retired</label>
                        <label><input type="radio" name="work" value="between-jobs"> Between jobs</label>
                        <label><input type="radio" name="work" value="other"> Other</label>
                    </div>
                </div>
                
                <div class="form-section">
                    <label>Living Situation:</label>
                    <div class="radio-group">
                        <label><input type="radio" name="living" value="alone"> Live alone</label>
                        <label><input type="radio" name="living" value="partner"> With partner</label>
                        <label><input type="radio" name="living" value="family"> With family</label>
                        <label><input type="radio" name="living" value="roommates"> With roommates</label>
                        <label><input type="radio" name="living" value="other"> Other</label>
                    </div>
                </div>
            </div>
        `;
    }

    getStep7HTML() {
        const goalNames = {
            'fitness': '💪 Fitness',
            'business': '🚀 Business',
            'creativity': '🎨 Creativity',
            'relationships': '💕 Relationships',
            'inner-peace': '🧘 Inner Peace',
            'home': '🏠 Home',
            'influence': '📸 Influence',
            'giving': '🤝 Giving',
            'cooking': '🍳 Cooking'
        };

        const selectedGoals = this.onboardingData.primaryGoals
            .map(g => goalNames[g])
            .join(', ');

        const freqNames = {
            'daily': 'Every day',
            'most-days': 'Most days',
            'few-times': 'Few times a week',
            'weekly': 'Weekly',
            'casual': 'Casual'
        };

        return `
            <div class="onboarding-step-content">
                <h2>Your Adventure Summary</h2>
                
                <div class="summary-box">
                    <div class="summary-item">
                        <strong>👤 Name:</strong> ${this.onboardingData.name || 'Not set'}
                    </div>
                    <div class="summary-item">
                        <strong>🎯 Goals:</strong> ${selectedGoals || 'None selected'}
                    </div>
                    <div class="summary-item">
                        <strong>📅 Check-ins:</strong> ${freqNames[this.onboardingData.usageFrequency] || 'Not set'}
                    </div>
                    ${this.onboardingData.partnerName ? `
                        <div class="summary-item">
                            <strong>💍 Partner:</strong> ${this.onboardingData.partnerName}
                        </div>
                    ` : ''}
                    ${this.onboardingData.workSituation ? `
                        <div class="summary-item">
                            <strong>🏢 Work:</strong> ${this.onboardingData.workSituation}
                        </div>
                    ` : ''}
                </div>
                
                <div class="benefits-box">
                    <h3>Based on your profile, we'll:</h3>
                    <ul>
                        <li>✓ Focus on your ${this.onboardingData.primaryGoals.length} selected path${this.onboardingData.primaryGoals.length !== 1 ? 's' : ''}</li>
                        <li>✓ Suggest ${this.onboardingData.usageFrequency === 'daily' ? 'daily' : 'weekly'} quests that fit your schedule</li>
                        <li>✓ Personalize all quest names</li>
                        <li>✓ Track what matters to you</li>
                        <li>✓ Recommend the best times for different quests</li>
                    </ul>
                </div>
                
                <p class="settings-note">You can change this anytime in Settings → Edit Profile</p>
            </div>
        `;
    }

    prefillOnboardingStep(step) {
        setTimeout(() => {
            switch (step) {
                case 1:
                    const nameInput = document.getElementById('onboarding-name');
                    if (nameInput && this.onboardingData.name) {
                        nameInput.value = this.onboardingData.name;
                    }
                    if (nameInput) nameInput.focus();
                    break;
                    
                case 2:
                    this.onboardingData.primaryGoals.forEach(goalId => {
                        const card = document.querySelector(`.goal-card[data-goal="${goalId}"]`);
                        if (card) card.classList.add('selected');
                    });
                    // Add click handlers
                    document.querySelectorAll('.goal-card').forEach(card => {
                        card.addEventListener('click', () => {
                            const goalId = card.dataset.goal;
                            if (card.classList.contains('selected')) {
                                card.classList.remove('selected');
                                this.onboardingData.primaryGoals = this.onboardingData.primaryGoals.filter(g => g !== goalId);
                            } else {
                                if (this.onboardingData.primaryGoals.length < 5) {
                                    card.classList.add('selected');
                                    this.onboardingData.primaryGoals.push(goalId);
                                } else {
                                    this.showToast('Maximum 5 goals', 'warning');
                                }
                            }
                        });
                    });
                    break;
                    
                case 3:
                    if (this.onboardingData.usageFrequency) {
                        const radio = document.querySelector(`input[name="frequency"][value="${this.onboardingData.usageFrequency}"]`);
                        if (radio) radio.checked = true;
                    }
                    break;
                    
                case 5:
                    // Show partner name field if in relationship
                    document.querySelectorAll('input[name="relationship"]').forEach(radio => {
                        radio.addEventListener('change', () => {
                            const partnerGroup = document.getElementById('partner-name-group');
                            const val = radio.value;
                            partnerGroup.style.display = (val === 'relationship' || val === 'married') ? 'block' : 'none';
                        });
                    });
                    
                    // Show children details if has children
                    document.querySelectorAll('input[name="has-children"]').forEach(radio => {
                        radio.addEventListener('change', () => {
                            const childrenDetails = document.getElementById('children-details');
                            childrenDetails.style.display = radio.value === 'yes' ? 'block' : 'none';
                        });
                    });
                    break;
            }
        }, 50);
    }

    onboardingNext() {
        // Validate and collect data from current step
        if (!this.collectOnboardingStepData()) {
            return; // Validation failed
        }
        
        if (this.onboardingStep < 7) {
            this.renderOnboardingStep(this.onboardingStep + 1);
        } else {
            this.completeOnboarding();
        }
    }

    onboardingBack() {
        if (this.onboardingStep > 1) {
            this.renderOnboardingStep(this.onboardingStep - 1);
        }
    }

    onboardingSkip() {
        // Only steps 4, 5, 6 are skippable
        if (this.onboardingStep >= 4 && this.onboardingStep <= 6) {
            this.onboardingNext();
        }
    }

    collectOnboardingStepData() {
        switch (this.onboardingStep) {
            case 1:
                const name = document.getElementById('onboarding-name')?.value?.trim();
                if (!name || name.length < 2) {
                    this.showToast('Please enter your name (at least 2 characters)', 'warning');
                    return false;
                }
                this.onboardingData.name = name;
                return true;
                
            case 2:
                if (this.onboardingData.primaryGoals.length === 0) {
                    this.showToast('Please select at least one goal', 'warning');
                    return false;
                }
                return true;
                
            case 3:
                const freq = document.querySelector('input[name="frequency"]:checked')?.value;
                if (!freq) {
                    this.showToast('Please select how often you\'ll check in', 'warning');
                    return false;
                }
                this.onboardingData.usageFrequency = freq;
                return true;
                
            case 4:
                this.onboardingData.gender = document.querySelector('input[name="gender"]:checked')?.value || null;
                if (this.onboardingData.gender === 'null') this.onboardingData.gender = null;
                
                this.onboardingData.ageRange = document.querySelector('input[name="age"]:checked')?.value || null;
                if (this.onboardingData.ageRange === 'null') this.onboardingData.ageRange = null;
                return true;
                
            case 5:
                this.onboardingData.relationshipStatus = document.querySelector('input[name="relationship"]:checked')?.value || null;
                if (this.onboardingData.relationshipStatus === 'null') this.onboardingData.relationshipStatus = null;
                
                const partnerName = document.getElementById('partner-name')?.value?.trim();
                this.onboardingData.partnerName = partnerName || null;
                
                const hasChildren = document.querySelector('input[name="has-children"]:checked')?.value === 'yes';
                this.onboardingData.hasChildren = hasChildren;
                
                if (hasChildren) {
                    this.onboardingData.numberOfChildren = parseInt(document.getElementById('num-children')?.value || 0);
                    this.onboardingData.childrenAges = Array.from(document.querySelectorAll('#children-details input[type="checkbox"]:checked'))
                        .map(cb => cb.value);
                }
                
                this.onboardingData.caregivingResponsibilities = Array.from(document.querySelectorAll('.caregiving-check:checked'))
                    .map(cb => cb.value);
                return true;
                
            case 6:
                this.onboardingData.workSituation = document.querySelector('input[name="work"]:checked')?.value || null;
                this.onboardingData.livingSituation = document.querySelector('input[name="living"]:checked')?.value || null;
                return true;
                
            case 7:
                return true;
                
            default:
                return true;
        }
    }

    completeOnboarding() {
        // Map goals to paths
        const goalMapping = {
            'fitness': 'fitness-goddess',
            'business': 'entrepreneur',
            'creativity': 'artistic-visionary',
            'relationships': 'lover-girl',
            'inner-peace': 'soul-work',
            'home': 'secret-garden',
            'influence': 'lifestyle-influencer',
            'giving': 'living-saint',
            'cooking': 'culinary-master'
        };
        
        const activePaths = this.onboardingData.primaryGoals.map(g => goalMapping[g]);
        
        // Save profile
        this.data.settings.profile = {
            ...this.onboardingData,
            activePaths,
            onboardingCompleted: true,
            onboardingDate: new Date().toISOString(),
            lastWelcomeScreen: null
        };
        
        // Update character name
        this.data.settings.characterName = this.onboardingData.name;
        
        // Update partner name if provided
        if (this.onboardingData.partnerName) {
            this.data.settings.partnerName = this.onboardingData.partnerName;
            this.updatePartnerQuestNames();
        }
        
        // Generate personalized quests
        const personalizedQuests = this.generatePersonalizedQuests();
        this.data.quests.push(...personalizedQuests);
        
        this.saveData();
        
        // Hide onboarding
        document.getElementById('onboarding-overlay').classList.remove('active');
        
        // Initialize the app normally
        this.checkResets();
        this.checkLoginStreak();
        this.checkComebackBonus();
        this.renderAll();
        this.updateProgressRings();
        this.checkSkillDecayWarnings();
        
        // Show welcome screen
        setTimeout(() => this.showWelcomeScreen(), 500);
    }

    generatePersonalizedQuests() {
        const quests = [];
        const profile = this.onboardingData;
        
        // Add relationship quests if applicable
        if (profile.relationshipStatus && profile.relationshipStatus !== 'single' && profile.partnerName) {
            // Already handled by default quests with partner name
        }
        
        // Add family quests if has children
        if (profile.hasChildren && profile.numberOfChildren > 0) {
            quests.push({
                id: 'family_time',
                name: 'Quality time with kids',
                frequency: 'daily',
                rewards: [{ skill: 'partnership', xp: 30 }],
                challengeId: null,
                custom: true,
                active: true
            });
            
            if (profile.childrenAges.includes('0-2') || profile.childrenAges.includes('3-5')) {
                quests.push({
                    id: 'playtime',
                    name: 'Play with little ones',
                    frequency: 'daily',
                    rewards: [{ skill: 'partnership', xp: 25 }],
                    challengeId: null,
                    custom: true,
                    active: true
                });
            }
            
            if (profile.childrenAges.includes('6-12') || profile.childrenAges.includes('13-17')) {
                quests.push({
                    id: 'homework_help',
                    name: 'Help with homework/school',
                    frequency: 'as-needed',
                    rewards: [{ skill: 'partnership', xp: 20 }],
                    challengeId: null,
                    custom: true,
                    active: true
                });
            }
        }
        
        // Add caregiving quests
        if (profile.caregivingResponsibilities.includes('parents')) {
            quests.push({
                id: 'check_on_parents',
                name: 'Check in with parents',
                frequency: 'weekly',
                rewards: [{ skill: 'generosity', xp: 30 }],
                challengeId: null,
                custom: true,
                active: true
            });
        }
        
        if (profile.caregivingResponsibilities.includes('pets')) {
            quests.push({
                id: 'pet_care',
                name: 'Pet care & bonding time',
                frequency: 'daily',
                rewards: [{ skill: 'homeCraft', xp: 15 }],
                challengeId: null,
                custom: true,
                active: true
            });
        }
        
        // Add work-specific quests
        if (profile.workSituation === 'self-employed') {
            quests.push({
                id: 'business_metrics',
                name: 'Review business metrics',
                frequency: 'weekly',
                rewards: [{ skill: 'business', xp: 50 }],
                challengeId: null,
                custom: true,
                active: true
            });
        }
        
        if (profile.workSituation === 'student') {
            quests.push({
                id: 'study_session',
                name: 'Focused study session',
                frequency: 'daily',
                rewards: [{ skill: 'business', xp: 40 }],
                challengeId: null,
                custom: true,
                active: true
            });
        }
        
        return quests;
    }

    // ═══════════════════════════════════════════════════════════════
    // WELCOME SCREEN SYSTEM
    // ═══════════════════════════════════════════════════════════════

    shouldShowWelcome() {
        const profile = this.data.settings.profile;
        if (!profile || !profile.onboardingCompleted) return false;
        
        const lastShown = profile.lastWelcomeScreen;
        if (!lastShown) return true;
        
        const hoursSince = (new Date() - new Date(lastShown)) / (1000 * 60 * 60);
        return hoursSince >= 4;
    }

    showWelcomeScreen() {
        const modal = document.getElementById('welcome-screen-modal');
        if (!modal) return;
        
        const { greeting, emoji } = this.getGreeting();
        const stats = this.getWelcomeStats();
        const recommendations = this.getRecommendedQuests();
        
        // Update greeting
        document.getElementById('welcome-greeting').textContent = `${greeting} ${emoji}`;
        
        // Update stats
        const statsHtml = `
            <div class="stat-item">🔥 ${stats.streak} day streak</div>
            <div class="stat-item">⭐ Level ${stats.level}</div>
            <div class="stat-item">🎯 ${stats.todayXP} XP today</div>
        `;
        document.getElementById('welcome-stats').innerHTML = statsHtml;
        
        // Update recommendations
        document.getElementById('welcome-quick-wins').innerHTML = this.renderWelcomeQuests(recommendations.quickWins, 'Quick Wins (5-10 min)');
        document.getElementById('welcome-focus-tasks').innerHTML = this.renderWelcomeQuests(recommendations.focusTasks, 'Your Focus Today');
        if (recommendations.challenges.length > 0) {
            document.getElementById('welcome-challenges').innerHTML = this.renderWelcomeQuests(recommendations.challenges, 'Active Challenges');
        } else {
            document.getElementById('welcome-challenges').innerHTML = '';
        }
        
        // Update last welcome timestamp
        this.data.settings.profile.lastWelcomeScreen = new Date().toISOString();
        this.saveData();
        
        // Show modal
        modal.classList.add('active');
        document.body.classList.add('modal-open');
    }

    getGreeting() {
        const hour = new Date().getHours();
        const name = this.data.settings.profile?.name || this.data.settings.characterName || 'Adventurer';
        
        if (hour < 12) return { greeting: `Good Morning, ${name}!`, emoji: '☀️' };
        if (hour < 17) return { greeting: `Good Afternoon, ${name}!`, emoji: '🌤️' };
        if (hour < 22) return { greeting: `Good Evening, ${name}!`, emoji: '🌙' };
        return { greeting: `Still up, ${name}?`, emoji: '🌃' };
    }

    getWelcomeStats() {
        return {
            streak: this.data.loginStreak?.current || 0,
            level: this.getTotalLevel(),
            todayXP: this.getTodayXP(),
            challenges: this.data.challenges.filter(c => c.active).length
        };
    }

    getRecommendedQuests() {
        const hour = new Date().getHours();
        
        return {
            quickWins: this.getQuickWinQuests(),
            focusTasks: hour < 12 ? this.getMorningQuests() : 
                       hour < 17 ? this.getAfternoonQuests() : 
                       this.getEveningQuests(),
            challenges: this.getActiveChallengeQuests()
        };
    }

    getQuickWinQuests() {
        return this.data.quests
            .filter(q => !this.canCompleteQuest(q) === false && q.frequency === 'daily')
            .sort((a, b) => this.getQuestXP(a) - this.getQuestXP(b))
            .slice(0, 3);
    }

    getMorningQuests() {
        const morningTags = ['workout', 'meditation', 'journaling', 'planning'];
        return this.data.quests
            .filter(q => !this.canCompleteQuest(q) === false)
            .slice(0, 3);
    }

    getAfternoonQuests() {
        return this.data.quests
            .filter(q => !this.canCompleteQuest(q) === false)
            .slice(0, 3);
    }

    getEveningQuests() {
        return this.data.quests
            .filter(q => !this.canCompleteQuest(q) === false)
            .slice(0, 3);
    }

    getActiveChallengeQuests() {
        const challenges = this.data.challenges.filter(c => c.active);
        const quests = [];
        
        challenges.forEach(challenge => {
            const remaining = challenge.questIds.filter(qId => 
                !challenge.currentPeriod.completedQuests.some(cq => cq.questId === qId)
            );
            remaining.forEach(qId => {
                const quest = this.data.quests.find(q => q.id === qId);
                if (quest) quests.push(quest);
            });
        });
        
        return quests.slice(0, 3);
    }

    getQuestXP(quest) {
        return quest.rewards?.reduce((sum, r) => sum + r.xp, 0) || 0;
    }

    renderWelcomeQuests(quests, title) {
        if (quests.length === 0) return '';
        
        return `
            <h3>${title}</h3>
            <div class="welcome-quest-list">
                ${quests.map(q => `
                    <div class="welcome-quest-item" onclick="app.startQuestFromWelcome('${q.id}')">
                        <span class="quest-name">• ${q.name}</span>
                        <span class="quest-xp">${this.getQuestXP(q)} XP</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    startQuestFromWelcome(questId) {
        this.closeWelcomeScreen();
        this.switchView('quests');
        setTimeout(() => this.navigateToQuest(questId), 300);
    }

    closeWelcomeScreen() {
        document.getElementById('welcome-screen-modal')?.classList.remove('active');
        document.body.classList.remove('modal-open');
    }

    getTodayXP() {
        const today = new Date().toDateString();
        return this.data.completionLog.completions
            .filter(c => new Date(c.timestamp).toDateString() === today)
            .reduce((sum, c) => sum + c.xpAwarded.reduce((s, r) => s + r.xp, 0), 0);
    }
}

// ═══════════════════════════════════════════════════════════════════
// GLOBAL MODAL CLOSERS
// ═══════════════════════════════════════════════════════════════════

function closeLevelUpModal() {
    document.getElementById('level-up-modal')?.classList.remove('active');
    document.body.classList.remove('modal-open');
}

function closeAchievementModal() {
    document.getElementById('achievement-modal')?.classList.remove('active');
    document.body.classList.remove('modal-open');
}

function closeAddQuestModal() {
    document.getElementById('add-quest-modal')?.classList.remove('active');
    document.body.classList.remove('modal-open');
}

function closeEditQuestModal() {
    document.getElementById('edit-quest-modal')?.classList.remove('active');
    document.body.classList.remove('modal-open');
    if (app) app.editingQuestId = null;
}

function closeAddChallengeModal() {
    document.getElementById('add-challenge-modal')?.classList.remove('active');
    document.body.classList.remove('modal-open');
}

// ═══════════════════════════════════════════════════════════════════
// INITIALIZE APP
// ═══════════════════════════════════════════════════════════════════

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new LifeRPG();
});
