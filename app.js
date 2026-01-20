// Life RPG - Main Application Logic

class LifeRPG {
    constructor() {
        this.init();
    }

    init() {
        this.currentTypeFilter = 'all';
        this.currentPathFilter = 'all';
        this.loadData();
        this.setupEventListeners();
        this.renderCharacterSheet();
        this.renderQuests();
        this.renderAchievements();
        this.checkDailyReset();
    }

    // OSRS XP Formula
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

    loadData() {
        const saved = localStorage.getItem('lifeRPGData');
        if (saved) {
            this.data = JSON.parse(saved);
            this.migrateData(); // Handle any data structure updates
        } else {
            this.data = this.getDefaultData();
        }
    }

    getDefaultData() {
        return {
            skills: {
                strength: { xp: 0, currentStreak: 0, longestStreak: 0, lastCompleted: null },
                creativity: { xp: 0, currentStreak: 0, longestStreak: 0, lastCompleted: null },
                intelligence: { xp: 0, currentStreak: 0, longestStreak: 0, lastCompleted: null },
                charisma: { xp: 0, currentStreak: 0, longestStreak: 0, lastCompleted: null },
                wisdom: { xp: 0, currentStreak: 0, longestStreak: 0, lastCompleted: null },
                constitution: { xp: 0, currentStreak: 0, longestStreak: 0, lastCompleted: null }
            },
            quests: this.getDefaultQuests(),
            completedToday: [],
            achievements: this.getDefaultAchievements(),
            activeChallenge: null,
            photos: [],
            collectionLog: [],
            lastActiveDate: new Date().toDateString()
        };
    }

    getDefaultQuests() {
        return [
            // Daily Quests
            { id: 'run', name: 'Go for a run', xp: 50, skill: 'strength', type: 'daily', tags: ['fitness-goddess'] },
            { id: 'workout', name: 'Strength training', xp: 50, skill: 'strength', type: 'daily', tags: ['fitness-goddess'] },
            { id: 'yoga', name: 'Yoga/Stretching', xp: 30, skill: 'wisdom', type: 'daily', tags: ['fitness-goddess'] },
            { id: 'cross_stitch', name: 'Cross stitch (30+ min)', xp: 30, skill: 'creativity', type: 'daily', tags: ['artistic-visionary'] },
            { id: 'cook_meal', name: 'Cook a meal', xp: 35, skill: 'strength', type: 'daily', tags: ['culinary-master'] },
            { id: 'dev_work', name: 'Moonshot Dev work (1+ hr)', xp: 50, skill: 'intelligence', type: 'daily', tags: ['business-path'] },
            { id: 'quality_time', name: 'Quality time with Scott', xp: 30, skill: 'charisma', type: 'daily', tags: [] },
            { id: 'phone_free', name: 'Phone-free hour', xp: 25, skill: 'wisdom', type: 'daily', tags: [] },
            { id: 'read', name: 'Read (30+ min)', xp: 30, skill: 'intelligence', type: 'daily', tags: [] },

            // Weekly Quests
            { id: 'run_5k', name: 'Complete a 5K run', xp: 150, skill: 'strength', type: 'weekly', tags: ['fitness-goddess'] },
            { id: 'date_night', name: 'Date night with Scott', xp: 75, skill: 'charisma', type: 'weekly', tags: [] },
            { id: 'reno_task', name: 'Home renovation task', xp: 60, skill: 'constitution', type: 'weekly', tags: [] },
            { id: 'meal_prep', name: 'Meal prep for the week', xp: 50, skill: 'constitution', type: 'weekly', tags: ['culinary-master'] },
            { id: 'social', name: 'Hang with friends', xp: 60, skill: 'charisma', type: 'weekly', tags: [] },
            { id: 'content_create', name: 'Create content for social media', xp: 60, skill: 'creativity', type: 'weekly', tags: ['lifestyle-influencer'] },

            // Monthly Quests
            { id: 'new_recipe', name: 'Master a new recipe', xp: 100, skill: 'creativity', type: 'monthly', tags: ['culinary-master'] },
            { id: 'art_project', name: 'Complete a major art project', xp: 150, skill: 'creativity', type: 'monthly', tags: ['artistic-visionary'] },
            { id: 'fitness_milestone', name: 'Hit a fitness milestone', xp: 150, skill: 'strength', type: 'monthly', tags: ['fitness-goddess'] },

            // Business Path - As-Needed Quests
            { id: 'biz_research', name: 'Market research for plugin ideas', xp: 40, skill: 'intelligence', type: 'as-needed', tags: ['business-path'] },
            { id: 'biz_design', name: 'Design business website mockup', xp: 50, skill: 'creativity', type: 'as-needed', tags: ['business-path'] },
            { id: 'biz_brand', name: 'Create brand assets (logo, colors)', xp: 60, skill: 'creativity', type: 'as-needed', tags: ['business-path'] },
            { id: 'biz_website_dev', name: 'Build Moonshot Dev website', xp: 100, skill: 'intelligence', type: 'as-needed', tags: ['business-path'] },
            { id: 'biz_plugin_plan', name: 'Plan first plugin features', xp: 50, skill: 'intelligence', type: 'as-needed', tags: ['business-path'] },
            { id: 'biz_plugin_dev', name: 'Develop plugin core functionality', xp: 150, skill: 'intelligence', type: 'as-needed', tags: ['business-path'] },
            { id: 'biz_plugin_polish', name: 'Polish plugin UI/UX', xp: 75, skill: 'creativity', type: 'as-needed', tags: ['business-path'] },
            { id: 'biz_docs', name: 'Write plugin documentation', xp: 60, skill: 'constitution', type: 'as-needed', tags: ['business-path'] },
            { id: 'biz_marketing_plan', name: 'Create marketing strategy', xp: 50, skill: 'intelligence', type: 'as-needed', tags: ['business-path'] },
            { id: 'biz_social', name: 'Build social media presence', xp: 40, skill: 'charisma', type: 'as-needed', tags: ['business-path', 'lifestyle-influencer'] },
            { id: 'biz_launch_prep', name: 'Prepare for launch', xp: 75, skill: 'constitution', type: 'as-needed', tags: ['business-path'] },

            // Culinary Master Path
            { id: 'culinary_experiment', name: 'Try a new cooking technique', xp: 45, skill: 'creativity', type: 'as-needed', tags: ['culinary-master'] },
            { id: 'culinary_plate', name: 'Focus on plating/presentation', xp: 30, skill: 'creativity', type: 'as-needed', tags: ['culinary-master'] },
            { id: 'culinary_themed', name: 'Plan themed dinner night', xp: 50, skill: 'intelligence', type: 'as-needed', tags: ['culinary-master'] },

            // Artistic Visionary Path
            { id: 'art_learn', name: 'Learn a new art technique', xp: 50, skill: 'intelligence', type: 'as-needed', tags: ['artistic-visionary'] },
            { id: 'art_share', name: 'Share your art on social media', xp: 35, skill: 'charisma', type: 'as-needed', tags: ['artistic-visionary', 'lifestyle-influencer'] },

            // Lifestyle Influencer Path
            { id: 'influencer_photo', name: 'Curate aesthetic photo shoot', xp: 40, skill: 'creativity', type: 'as-needed', tags: ['lifestyle-influencer'] },
            { id: 'influencer_reel', name: 'Create a lifestyle reel/video', xp: 60, skill: 'creativity', type: 'as-needed', tags: ['lifestyle-influencer'] },
            { id: 'influencer_engage', name: 'Engage with community (comments/DMs)', xp: 30, skill: 'charisma', type: 'as-needed', tags: ['lifestyle-influencer'] },

            // Fitness Goddess Path
            { id: 'fitness_cardio', name: 'Cardio session (30+ min)', xp: 40, skill: 'strength', type: 'as-needed', tags: ['fitness-goddess'] },
            { id: 'fitness_new_class', name: 'Try a new fitness class', xp: 50, skill: 'strength', type: 'as-needed', tags: ['fitness-goddess'] },
            { id: 'fitness_rest', name: 'Active recovery day', xp: 30, skill: 'wisdom', type: 'as-needed', tags: ['fitness-goddess'] }
        ];
    }

    getDefaultAchievements() {
        return {
            beginner: [
                { id: 'first_quest', name: 'First Quest', description: 'Complete your first quest', completed: false, date: null },
                { id: 'streak_3', name: 'Streak Starter', description: '3-day streak on any skill', completed: false, date: null },
                { id: 'multi_skill', name: 'Multi-class', description: 'Earn XP in all 6 skills in one week', completed: false, date: null },
                { id: 'level_5', name: 'Novice Adventurer', description: 'Reach level 5 in any skill', completed: false, date: null }
            ],
            medium: [
                { id: 'streak_7', name: 'Dedicated Runner', description: '7-day running streak', completed: false, date: null },
                { id: 'dev_week', name: 'Dev Grind', description: '10 hours of Moonshot Dev work in a week', completed: false, date: null },
                { id: 'social_butterfly', name: 'Social Butterfly', description: 'Quality time with 3 different people in a week', completed: false, date: null },
                { id: 'level_20', name: 'Skilled Adventurer', description: 'Reach level 20 in any skill', completed: false, date: null },
                { id: 'website_launch', name: 'Business Foundation', description: 'Launch Moonshot Dev website', completed: false, date: null }
            ],
            hard: [
                { id: 'streak_30', name: 'Iron Will', description: '30-day streak without breaking', completed: false, date: null },
                { id: '75_hard', name: '75 Hard Survivor', description: 'Complete the full 75 Hard challenge', completed: false, date: null },
                { id: 'run_monthly', name: 'Marathon Ready', description: 'Run 15 times in a month', completed: false, date: null },
                { id: 'level_50', name: 'Expert Adventurer', description: 'Reach level 50 in any skill', completed: false, date: null },
                { id: 'plugin_complete', name: 'Plugin Master', description: 'Complete a shipable plugin', completed: false, date: null }
            ],
            elite: [
                { id: 'skill_cape', name: 'Skill Cape', description: 'Reach level 99 in any skill', completed: false, date: null },
                { id: 'quest_cape', name: 'Quest Cape', description: 'Complete all achievements (except Grandmaster)', completed: false, date: null },
                { id: 'all_99', name: 'Completionist', description: 'Reach level 99 in all skills', completed: false, date: null }
            ],
            grandmaster: [
                { id: 'first_sale', name: 'Entrepreneur', description: 'Launch Moonshot Dev and make your first sale', completed: false, date: null, reward: 'GRANDMASTER QUEST COMPLETE!' }
            ]
        };
    }

    migrateData() {
        // Handle data structure updates
        if (!this.data.lastActiveDate) {
            this.data.lastActiveDate = new Date().toDateString();
        }
        
        // Initialize collection log if it doesn't exist
        if (!this.data.collectionLog) {
            this.data.collectionLog = [];
        }
        
        // Migrate old category system to tags
        if (this.data.quests) {
            this.data.quests = this.data.quests.map(quest => {
                // If quest has old 'category' field but no 'tags', convert it
                if (quest.category && !quest.tags) {
                    const tags = [];
                    if (quest.category === 'business') {
                        tags.push('business-path');
                    }
                    return { ...quest, tags, type: quest.type || 'daily' };
                }
                // Ensure tags array exists
                if (!quest.tags) {
                    quest.tags = [];
                }
                return quest;
            });
        }
    }

    saveData() {
        localStorage.setItem('lifeRPGData', JSON.stringify(this.data));
    }

    checkDailyReset() {
        const today = new Date().toDateString();
        if (this.data.lastActiveDate !== today) {
            // Check streaks before reset
            this.updateStreaks();
            
            // Reset daily completions
            this.data.completedToday = [];
            this.data.lastActiveDate = today;
            
            // Update 75 Hard if active
            if (this.data.activeChallenge) {
                this.check75HardReset();
            }
            
            this.saveData();
        }
    }

    updateStreaks() {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toDateString();

        Object.keys(this.data.skills).forEach(skill => {
            const skillData = this.data.skills[skill];
            if (skillData.lastCompleted !== yesterdayStr) {
                // Streak broken
                skillData.currentStreak = 0;
            }
        });
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchView(e.target.dataset.view));
        });

        // Quest filters
        document.querySelectorAll('[data-filter-type]').forEach(btn => {
            btn.addEventListener('click', (e) => this.filterQuestsByType(e.target.dataset.filterType));
        });

        document.querySelectorAll('[data-filter-path]').forEach(btn => {
            btn.addEventListener('click', (e) => this.filterQuestsByPath(e.target.dataset.filterPath));
        });

        // Photo filters
        document.querySelectorAll('.photo-filters .filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.filterPhotos(e.target.dataset.category));
        });

        // 75 Hard button
        const hard75Btn = document.getElementById('start-75hard-btn');
        if (hard75Btn) {
            hard75Btn.addEventListener('click', () => this.start75Hard());
        }

        // Add Quest button
        const addQuestBtn = document.getElementById('add-quest-btn');
        if (addQuestBtn) {
            addQuestBtn.addEventListener('click', () => this.openAddQuestModal());
        }

        // Custom Quest Form
        const questForm = document.getElementById('custom-quest-form');
        if (questForm) {
            questForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addCustomQuest();
            });
        }

        // Edit Quest Form
        const editQuestForm = document.getElementById('edit-quest-form');
        if (editQuestForm) {
            editQuestForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveEditedQuest();
            });
        }

        // Collection Log buttons
        const addLogBtn = document.getElementById('add-log-btn');
        if (addLogBtn) {
            addLogBtn.addEventListener('click', () => this.openAddLogModal());
        }

        // Collection Log Form
        const logForm = document.getElementById('collection-log-form');
        if (logForm) {
            logForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addCollectionLog();
            });
        }

        // Photo input for completing log
        const photoInput = document.getElementById('log-photo-input');
        if (photoInput) {
            photoInput.addEventListener('change', (e) => this.handleLogPhoto(e));
        }

        // Save photo button
        const savePhotoBtn = document.getElementById('save-log-photo-btn');
        if (savePhotoBtn) {
            savePhotoBtn.addEventListener('click', () => this.saveLogCompletion());
        }

        // Collection log filters
        document.querySelectorAll('[data-log-filter]').forEach(btn => {
            btn.addEventListener('click', (e) => this.filterCollectionLogs(e.target.dataset.logFilter));
        });
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
        document.getElementById(`${viewName}-view`).classList.add('active');

        // Render content for the view
        if (viewName === 'paths') {
            this.renderPaths();
        } else if (viewName === 'challenges') {
            this.renderActiveChallenge();
        } else if (viewName === 'photos') {
            this.renderPhotos();
        } else if (viewName === 'collection-log') {
            this.renderCollectionLog();
        }
    }

    renderPaths() {
        const paths = ['business-path', 'culinary-master', 'artistic-visionary', 'lifestyle-influencer', 'fitness-goddess'];
        
        paths.forEach(pathId => {
            const pathQuests = this.data.quests.filter(q => (q.tags || []).includes(pathId));
            const totalQuests = pathQuests.length;
            
            // Count completed quests (ever, not just today)
            const completedQuests = pathQuests.filter(q => {
                // Check if this quest has been completed at least once
                return this.isQuestCompletedToday(q.id);
            }).length;
            
            // Calculate total XP earned from this path
            const totalXP = this.data.completedToday
                .filter(c => {
                    const quest = this.data.quests.find(q => q.id === c.questId);
                    return quest && (quest.tags || []).includes(pathId);
                })
                .reduce((sum, c) => sum + c.xp, 0);
            
            const progress = totalQuests > 0 ? (completedQuests / totalQuests) * 100 : 0;
            
            // Update UI
            const totalEl = document.getElementById(`${pathId}-total`);
            const completedEl = document.getElementById(`${pathId}-completed`);
            const xpEl = document.getElementById(`${pathId}-xp`);
            const fillEl = document.getElementById(`${pathId}-fill`);
            
            if (totalEl) totalEl.textContent = totalQuests;
            if (completedEl) completedEl.textContent = completedQuests;
            if (xpEl) xpEl.textContent = totalXP;
            if (fillEl) fillEl.style.width = `${progress}%`;
        });
    }

    filterByPath(pathId) {
        // Switch to quests view
        this.switchView('quests');
        
        // Reset type filter
        document.querySelectorAll('[data-filter-type]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filterType === 'all');
        });
        
        // Set path filter
        document.querySelectorAll('[data-filter-path]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filterPath === pathId);
        });
        
        // Apply filters
        this.currentTypeFilter = 'all';
        this.currentPathFilter = pathId;
        this.applyQuestFilters();
    }

    filterQuestsByType(type) {
        document.querySelectorAll('[data-filter-type]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filterType === type);
        });
        
        this.currentTypeFilter = type;
        this.applyQuestFilters();
    }

    filterQuestsByPath(path) {
        document.querySelectorAll('[data-filter-path]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filterPath === path);
        });
        
        this.currentPathFilter = path;
        this.applyQuestFilters();
    }

    applyQuestFilters() {
        const typeFilter = this.currentTypeFilter || 'all';
        const pathFilter = this.currentPathFilter || 'all';
        
        document.querySelectorAll('.quest-card').forEach(card => {
            const questType = card.dataset.type;
            const questTags = JSON.parse(card.dataset.tags || '[]');
            
            // Check type filter
            const typeMatch = typeFilter === 'all' || questType === typeFilter;
            
            // Check path filter
            let pathMatch = false;
            if (pathFilter === 'all') {
                pathMatch = true;
            } else if (pathFilter === 'none') {
                pathMatch = questTags.length === 0;
            } else {
                pathMatch = questTags.includes(pathFilter);
            }
            
            // Show if both match
            card.style.display = (typeMatch && pathMatch) ? 'block' : 'none';
        });
    }

    renderCharacterSheet() {
        // Update total level
        let totalLevel = 0;
        Object.keys(this.data.skills).forEach(skillName => {
            const skill = this.data.skills[skillName];
            const level = this.getLevelFromXP(skill.xp);
            totalLevel += level;

            // Update skill card
            const card = document.querySelector(`.skill-card[data-skill="${skillName}"]`);
            if (card) {
                const currentLevel = level;
                const currentXP = skill.xp;
                const nextLevelXP = this.getXPForLevel(currentLevel + 1);
                const currentLevelXP = this.getXPForLevel(currentLevel);
                const progress = ((currentXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;

                card.querySelector('.level-num').textContent = currentLevel;
                card.querySelector('.current-xp').textContent = currentXP;
                card.querySelector('.next-level-xp').textContent = nextLevelXP;
                card.querySelector('.xp-fill').style.width = `${progress}%`;
                card.querySelector('.streak-days').textContent = skill.currentStreak;
            }
        });

        document.getElementById('total-level').textContent = totalLevel;

        // Calculate today's XP
        const todayXP = this.data.completedToday.reduce((sum, completion) => sum + completion.xp, 0);
        document.getElementById('daily-xp').textContent = todayXP;
    }

    renderQuests() {
        const container = document.getElementById('quests-container');
        container.innerHTML = '';

        this.data.quests.forEach(quest => {
            const completed = this.isQuestCompletedToday(quest.id);
            const card = this.createQuestCard(quest, completed);
            container.appendChild(card);
        });
    }

    createQuestCard(quest, completed) {
        const card = document.createElement('div');
        card.className = `quest-card ${completed ? 'completed' : ''}`;
        card.dataset.questId = quest.id;
        card.dataset.type = quest.type;
        card.dataset.tags = JSON.stringify(quest.tags || []);

        const deleteBtn = quest.custom ? `<button class="delete-btn" onclick="app.deleteQuest('${quest.id}')" title="Delete custom quest">🗑️</button>` : '';
        const editBtn = `<button class="edit-btn" onclick="app.openEditQuestModal('${quest.id}')" title="Edit quest">✏️</button>`;

        // Create tag badges
        const tagBadges = (quest.tags || []).map(tag => {
            const tagIcons = {
                'business-path': '🚀',
                'culinary-master': '🍳',
                'artistic-visionary': '🎨',
                'lifestyle-influencer': '📸',
                'fitness-goddess': '💪'
            };
            const tagNames = {
                'business-path': 'Business',
                'culinary-master': 'Culinary',
                'artistic-visionary': 'Art',
                'lifestyle-influencer': 'Influencer',
                'fitness-goddess': 'Fitness'
            };
            return `<span class="quest-tag">${tagIcons[tag] || '📌'} ${tagNames[tag] || tag}</span>`;
        }).join('');

        card.innerHTML = `
            <div class="quest-header">
                <div>
                    <div class="quest-title">
                        ${quest.name}
                        ${quest.custom ? '<span style="color: #ffd700; font-size: 0.7em;"> (Custom)</span>' : ''}
                    </div>
                    <div class="quest-meta">
                        <span class="quest-skill" style="background-color: var(--${quest.skill}-color)">
                            ${quest.skill}
                        </span>
                        <span class="quest-type-badge">${quest.type}</span>
                        ${tagBadges}
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    ${editBtn}
                    ${deleteBtn}
                    <div class="quest-xp">+${quest.xp} XP</div>
                </div>
            </div>
            <div class="quest-actions">
                <button class="complete-btn" ${completed ? 'disabled' : ''} onclick="app.completeQuest('${quest.id}')">
                    ${completed ? '✓ Completed Today' : 'Complete Quest'}
                </button>
                <button class="photo-btn" onclick="app.addPhotoForQuest('${quest.id}')">📷</button>
            </div>
        `;

        return card;
    }

    isQuestCompletedToday(questId) {
        return this.data.completedToday.some(c => c.questId === questId);
    }

    completeQuest(questId) {
        if (this.isQuestCompletedToday(questId)) return;

        const quest = this.data.quests.find(q => q.id === questId);
        if (!quest) return;

        // Add XP to skill
        const oldLevel = this.getLevelFromXP(this.data.skills[quest.skill].xp);
        this.data.skills[quest.skill].xp += quest.xp;
        const newLevel = this.getLevelFromXP(this.data.skills[quest.skill].xp);

        // Update streak
        const today = new Date().toDateString();
        this.data.skills[quest.skill].lastCompleted = today;
        this.data.skills[quest.skill].currentStreak++;
        
        if (this.data.skills[quest.skill].currentStreak > this.data.skills[quest.skill].longestStreak) {
            this.data.skills[quest.skill].longestStreak = this.data.skills[quest.skill].currentStreak;
        }

        // Record completion
        this.data.completedToday.push({
            questId: quest.id,
            xp: quest.xp,
            skill: quest.skill,
            timestamp: new Date().toISOString()
        });

        this.saveData();
        this.renderCharacterSheet();
        this.renderQuests();
        this.checkAchievements();

        // Check for level up
        if (newLevel > oldLevel) {
            this.showLevelUp(quest.skill, newLevel);
        }
    }

    showLevelUp(skill, level) {
        const modal = document.getElementById('level-up-modal');
        const text = document.getElementById('level-up-text');
        
        text.innerHTML = `
            <div style="font-size: 2rem; margin-bottom: 1rem;">${this.getSkillEmoji(skill)}</div>
            <div>Your ${skill.charAt(0).toUpperCase() + skill.slice(1)} level is now ${level}!</div>
        `;
        
        modal.classList.add('active');
    }

    getSkillEmoji(skill) {
        const emojis = {
            strength: '💪',
            creativity: '🎨',
            intelligence: '🧠',
            charisma: '💬',
            wisdom: '🧘',
            constitution: '📋'
        };
        return emojis[skill] || '⭐';
    }

    filterQuests(filter) {
        // Update active filter button
        document.querySelectorAll('.quest-filters .filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });

        // Show/hide quests
        document.querySelectorAll('.quest-card').forEach(card => {
            if (filter === 'all') {
                card.style.display = 'block';
            } else {
                card.style.display = card.dataset.category === filter ? 'block' : 'none';
            }
        });
    }

    renderAchievements() {
        ['beginner', 'medium', 'hard', 'elite', 'grandmaster'].forEach(tier => {
            const container = document.getElementById(`${tier}-achievements`);
            container.innerHTML = '';

            this.data.achievements[tier].forEach(achievement => {
                const card = this.createAchievementCard(achievement);
                container.appendChild(card);
            });
        });
    }

    createAchievementCard(achievement) {
        const card = document.createElement('div');
        card.className = `achievement-card ${achievement.completed ? 'completed' : ''}`;

        const progress = this.getAchievementProgress(achievement.id);

        card.innerHTML = `
            <div class="achievement-name">${achievement.name}</div>
            <div class="achievement-description">${achievement.description}</div>
            ${progress ? `<div class="achievement-progress">${progress}</div>` : ''}
            ${achievement.completed ? `<div style="color: var(--osrs-gold); margin-top: 0.5rem;">Completed: ${new Date(achievement.date).toLocaleDateString()}</div>` : ''}
        `;

        return card;
    }

    getAchievementProgress(achievementId) {
        // Calculate progress for specific achievements
        switch(achievementId) {
            case 'streak_3':
            case 'streak_7':
            case 'streak_30': {
                const days = parseInt(achievementId.split('_')[1]);
                const maxStreak = Math.max(...Object.values(this.data.skills).map(s => s.currentStreak));
                return `Current best: ${maxStreak}/${days} days`;
            }
            case 'level_5':
            case 'level_20':
            case 'level_50': {
                const target = parseInt(achievementId.split('_')[1]);
                const maxLevel = Math.max(...Object.values(this.data.skills).map(s => this.getLevelFromXP(s.xp)));
                return `Highest level: ${maxLevel}/${target}`;
            }
            case 'skill_cape': {
                const maxLevel = Math.max(...Object.values(this.data.skills).map(s => this.getLevelFromXP(s.xp)));
                return `Highest level: ${maxLevel}/99`;
            }
            default:
                return null;
        }
    }

    checkAchievements() {
        let newAchievements = [];

        // Check beginner achievements
        if (!this.data.achievements.beginner.find(a => a.id === 'first_quest').completed) {
            if (this.data.completedToday.length > 0) {
                this.unlockAchievement('beginner', 'first_quest');
                newAchievements.push('First Quest');
            }
        }

        // Check streak achievements
        const maxStreak = Math.max(...Object.values(this.data.skills).map(s => s.currentStreak));
        if (maxStreak >= 3 && !this.data.achievements.beginner.find(a => a.id === 'streak_3').completed) {
            this.unlockAchievement('beginner', 'streak_3');
            newAchievements.push('Streak Starter');
        }
        if (maxStreak >= 7 && !this.data.achievements.medium.find(a => a.id === 'streak_7').completed) {
            this.unlockAchievement('medium', 'streak_7');
            newAchievements.push('Dedicated Runner');
        }
        if (maxStreak >= 30 && !this.data.achievements.hard.find(a => a.id === 'streak_30').completed) {
            this.unlockAchievement('hard', 'streak_30');
            newAchievements.push('Iron Will');
        }

        // Check level achievements
        const maxLevel = Math.max(...Object.values(this.data.skills).map(s => this.getLevelFromXP(s.xp)));
        if (maxLevel >= 5 && !this.data.achievements.beginner.find(a => a.id === 'level_5').completed) {
            this.unlockAchievement('beginner', 'level_5');
            newAchievements.push('Novice Adventurer');
        }
        if (maxLevel >= 20 && !this.data.achievements.medium.find(a => a.id === 'level_20').completed) {
            this.unlockAchievement('medium', 'level_20');
            newAchievements.push('Skilled Adventurer');
        }
        if (maxLevel >= 50 && !this.data.achievements.hard.find(a => a.id === 'level_50').completed) {
            this.unlockAchievement('hard', 'level_50');
            newAchievements.push('Expert Adventurer');
        }
        if (maxLevel >= 99 && !this.data.achievements.elite.find(a => a.id === 'skill_cape').completed) {
            this.unlockAchievement('elite', 'skill_cape');
            newAchievements.push('Skill Cape');
        }

        // Show achievement notifications
        if (newAchievements.length > 0) {
            this.showAchievementUnlocked(newAchievements[0]);
            this.renderAchievements();
        }
    }

    unlockAchievement(tier, achievementId) {
        const achievement = this.data.achievements[tier].find(a => a.id === achievementId);
        if (achievement) {
            achievement.completed = true;
            achievement.date = new Date().toISOString();
            this.saveData();
        }
    }

    showAchievementUnlocked(achievementName) {
        const modal = document.getElementById('achievement-modal');
        const text = document.getElementById('achievement-text');
        
        text.textContent = achievementName;
        modal.classList.add('active');
    }

    start75Hard() {
        if (this.data.activeChallenge) {
            if (!confirm('You already have an active challenge. Start over?')) return;
        }

        this.data.activeChallenge = {
            name: '75 Hard',
            day: 1,
            startDate: new Date().toISOString(),
            checklist: {
                workout1: false,
                workout2: false,
                water: false,
                read: false,
                photo: false,
                diet: false,
                alcohol: false
            }
        };

        this.saveData();
        this.renderActiveChallenge();
    }

    check75HardReset() {
        if (!this.data.activeChallenge) return;

        const checklist = this.data.activeChallenge.checklist;
        const allComplete = Object.values(checklist).every(v => v === true);

        if (!allComplete) {
            // Failed challenge - reset
            if (confirm('You missed a 75 Hard task yesterday. Challenge failed. Start over?')) {
                this.start75Hard();
            } else {
                this.data.activeChallenge = null;
            }
        } else {
            // Success - increment day and reset checklist
            this.data.activeChallenge.day++;
            Object.keys(checklist).forEach(key => checklist[key] = false);

            // Check if completed 75 days
            if (this.data.activeChallenge.day > 75) {
                this.complete75Hard();
            }
        }
    }

    complete75Hard() {
        this.unlockAchievement('hard', '75_hard');
        alert('🎉 CONGRATULATIONS! You completed 75 Hard! This is a HUGE achievement!');
        this.data.activeChallenge = null;
        this.saveData();
        this.renderAchievements();
        this.switchView('achievements');
    }

    renderActiveChallenge() {
        const container = document.getElementById('active-challenge-container');
        
        if (!this.data.activeChallenge) {
            container.innerHTML = '<p style="color: var(--osrs-tan); padding: 2rem; text-align: center;">No active challenge. Click "Start 75 Hard" to begin!</p>';
            return;
        }

        const challenge = this.data.activeChallenge;
        const checklistItems = [
            { key: 'workout1', label: 'Workout #1 (45+ min, any)' },
            { key: 'workout2', label: 'Workout #2 (45+ min, outdoors)' },
            { key: 'water', label: 'Drink 1 gallon of water' },
            { key: 'read', label: 'Read 10 pages (non-fiction)' },
            { key: 'photo', label: 'Take progress photo' },
            { key: 'diet', label: 'Follow diet (no cheat meals)' },
            { key: 'alcohol', label: 'No alcohol' }
        ];

        container.innerHTML = `
            <div class="challenge-card">
                <div class="challenge-header">
                    <div class="challenge-title">75 Hard Challenge</div>
                    <div class="challenge-day">Day ${challenge.day} of 75</div>
                </div>
                <div class="checklist">
                    ${checklistItems.map(item => `
                        <div class="checklist-item ${challenge.checklist[item.key] ? 'checked' : ''}">
                            <input type="checkbox" 
                                   class="checklist-checkbox" 
                                   ${challenge.checklist[item.key] ? 'checked' : ''}
                                   onchange="app.toggle75HardItem('${item.key}')">
                            <span class="checklist-label">${item.label}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    toggle75HardItem(key) {
        if (!this.data.activeChallenge) return;
        
        this.data.activeChallenge.checklist[key] = !this.data.activeChallenge.checklist[key];
        this.saveData();
        this.renderActiveChallenge();
    }

    addPhotoForQuest(questId) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment'; // Use camera on mobile
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                this.data.photos.push({
                    id: Date.now(),
                    category: 'achievement',
                    date: new Date().toISOString(),
                    questId: questId,
                    url: event.target.result
                });
                this.saveData();
                alert('Photo added! View it in the Photos tab.');
            };
            reader.readAsDataURL(file);
        };

        input.click();
    }

    renderPhotos() {
        const container = document.getElementById('photos-container');
        container.innerHTML = '';

        if (this.data.photos.length === 0) {
            container.innerHTML = '<p style="color: var(--osrs-tan); padding: 2rem; text-align: center;">No photos yet. Complete quests and add photos!</p>';
            return;
        }

        this.data.photos.forEach(photo => {
            const card = this.createPhotoCard(photo);
            container.appendChild(card);
        });
    }

    createPhotoCard(photo) {
        const card = document.createElement('div');
        card.className = 'photo-card';
        card.dataset.category = photo.category;

        card.innerHTML = `
            <img src="${photo.url}" alt="${photo.category}" class="photo-img">
            <div class="photo-info">
                <div class="photo-category">${photo.category}</div>
                <div class="photo-date">${new Date(photo.date).toLocaleDateString()}</div>
            </div>
        `;

        return card;
    }

    filterPhotos(category) {
        document.querySelectorAll('.photo-filters .filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });

        document.querySelectorAll('.photo-card').forEach(card => {
            if (category === 'all') {
                card.style.display = 'block';
            } else {
                card.style.display = card.dataset.category === category ? 'block' : 'none';
            }
        });
    }

    openAddQuestModal() {
        document.getElementById('add-quest-modal').classList.add('active');
    }

    addCustomQuest() {
        const name = document.getElementById('quest-name').value;
        const skill = document.getElementById('quest-skill').value;
        const xp = parseInt(document.getElementById('quest-xp').value);
        const type = document.getElementById('quest-type').value;
        
        // Collect selected tags
        const tags = Array.from(document.querySelectorAll('.tag-checkbox input:checked'))
            .map(checkbox => checkbox.value);

        // Generate unique ID
        const id = 'custom_' + Date.now();

        // Create new quest
        const newQuest = {
            id: id,
            name: name,
            xp: xp,
            skill: skill,
            type: type,
            tags: tags,
            custom: true
        };

        // Add to quests array
        this.data.quests.push(newQuest);
        this.saveData();

        // Close modal and reset form
        closeAddQuestModal();
        document.getElementById('custom-quest-form').reset();

        // Re-render quests
        this.renderQuests();

        // Show success
        const pathText = tags.length > 0 ? ` (${tags.join(', ')})` : '';
        alert(`Quest "${name}" added successfully! +${xp} XP for ${skill}${pathText}`);
    }

    deleteQuest(questId) {
        if (!confirm('Are you sure you want to delete this custom quest?')) {
            return;
        }

        // Remove quest from array
        this.data.quests = this.data.quests.filter(q => q.id !== questId);
        
        // Remove any completions for this quest
        this.data.completedToday = this.data.completedToday.filter(c => c.questId !== questId);
        
        this.saveData();
        this.renderQuests();
        this.renderCharacterSheet();
    }

    openEditQuestModal(questId) {
        const quest = this.data.quests.find(q => q.id === questId);
        if (!quest) return;

        // Store the quest ID we're editing
        this.editingQuestId = questId;

        // Pre-fill the form
        document.getElementById('edit-quest-name').value = quest.name;
        document.getElementById('edit-quest-skill').value = quest.skill;
        document.getElementById('edit-quest-xp').value = quest.xp;
        document.getElementById('edit-quest-type').value = quest.type;

        // Set checkboxes for tags
        const checkboxes = document.querySelectorAll('#edit-tag-checkboxes input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = (quest.tags || []).includes(checkbox.value);
        });

        // Open modal
        document.getElementById('edit-quest-modal').classList.add('active');
    }

    saveEditedQuest() {
        const quest = this.data.quests.find(q => q.id === this.editingQuestId);
        if (!quest) return;

        // Update quest properties
        quest.name = document.getElementById('edit-quest-name').value;
        quest.skill = document.getElementById('edit-quest-skill').value;
        quest.xp = parseInt(document.getElementById('edit-quest-xp').value);
        quest.type = document.getElementById('edit-quest-type').value;

        // Update tags
        const tags = Array.from(document.querySelectorAll('#edit-tag-checkboxes input:checked'))
            .map(checkbox => checkbox.value);
        quest.tags = tags;

        this.saveData();
        closeEditQuestModal();
        this.renderQuests();
        
        alert(`Quest "${quest.name}" updated successfully!`);
    }

    // Collection Log Methods
    openAddLogModal() {
        document.getElementById('add-log-modal').classList.add('active');
    }

    addCollectionLog() {
        const title = document.getElementById('log-title').value;
        const description = document.getElementById('log-description').value;
        const tagsInput = document.getElementById('log-tags').value;
        
        // Parse tags
        const tags = tagsInput
            .split(',')
            .map(t => t.trim().toLowerCase())
            .filter(t => t.length > 0);

        const newLog = {
            id: 'log_' + Date.now(),
            title: title,
            description: description,
            tags: tags,
            completed: false,
            photo: null,
            dateAdded: new Date().toISOString(),
            dateCompleted: null
        };

        this.data.collectionLog.push(newLog);
        this.saveData();

        closeAddLogModal();
        document.getElementById('collection-log-form').reset();
        
        this.renderCollectionLog();
        alert(`"${title}" added to your collection log!`);
    }

    renderCollectionLog() {
        const container = document.getElementById('collection-log-container');
        if (!container) return;

        container.innerHTML = '';

        // Update stats
        const total = this.data.collectionLog.length;
        const completed = this.data.collectionLog.filter(l => l.completed).length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

        document.getElementById('total-logs').textContent = total;
        document.getElementById('completed-logs').textContent = completed;
        document.getElementById('completion-rate').textContent = rate + '%';

        // Render tag filters
        this.renderLogTagFilters();

        // Render logs
        if (this.data.collectionLog.length === 0) {
            container.innerHTML = '<p style="color: var(--osrs-tan); padding: 2rem; text-align: center; grid-column: 1/-1;">No experiences yet. Click "+ Add Experience" to start your collection log!</p>';
            return;
        }

        this.data.collectionLog.forEach(log => {
            const card = this.createLogCard(log);
            container.appendChild(card);
        });
    }

    renderLogTagFilters() {
        const container = document.getElementById('log-tag-filters');
        if (!container) return;

        // Get all unique tags
        const allTags = new Set();
        this.data.collectionLog.forEach(log => {
            log.tags.forEach(tag => allTags.add(tag));
        });

        // Keep "All" button
        const allBtn = container.querySelector('[data-tag-filter="all"]');
        container.innerHTML = '';
        if (allBtn) container.appendChild(allBtn);

        // Add tag buttons
        Array.from(allTags).sort().forEach(tag => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.dataset.tagFilter = tag;
            btn.textContent = tag;
            btn.addEventListener('click', (e) => this.filterCollectionLogsByTag(tag));
            container.appendChild(btn);
        });
    }

    createLogCard(log) {
        const card = document.createElement('div');
        card.className = `log-card ${log.completed ? 'completed' : ''}`;
        card.dataset.logId = log.id;
        card.dataset.completed = log.completed;
        card.dataset.tags = JSON.stringify(log.tags);

        const photoDisplay = log.photo 
            ? `<img src="${log.photo}" alt="${log.title}" class="log-photo">`
            : `<div class="log-placeholder">📷</div>`;

        const tagBadges = log.tags.map(tag => 
            `<span class="log-tag">${tag}</span>`
        ).join('');

        const completedDate = log.completed && log.dateCompleted 
            ? `<div class="log-date">Completed: ${new Date(log.dateCompleted).toLocaleDateString()}</div>`
            : '';

        const actionButton = log.completed
            ? ''
            : `<button class="complete-log-btn" onclick="app.openCompleteLogModal('${log.id}')">
                📸 Complete with Photo
               </button>`;

        card.innerHTML = `
            ${photoDisplay}
            <div class="log-content">
                <div class="log-header">
                    <div class="log-title">${log.title}</div>
                    <div class="log-status">${log.completed ? '✓' : '○'}</div>
                </div>
                ${log.description ? `<div class="log-description">${log.description}</div>` : ''}
                ${log.tags.length > 0 ? `<div class="log-tags">${tagBadges}</div>` : ''}
                ${completedDate}
                <div class="log-actions">
                    ${actionButton}
                    <button class="delete-log-btn" onclick="app.deleteCollectionLog('${log.id}')">🗑️</button>
                </div>
            </div>
        `;

        return card;
    }

    openCompleteLogModal(logId) {
        this.currentLogId = logId;
        const log = this.data.collectionLog.find(l => l.id === logId);
        
        document.getElementById('complete-log-title').textContent = log.title;
        document.getElementById('log-photo-preview').innerHTML = '';
        document.getElementById('save-log-photo-btn').disabled = true;
        
        document.getElementById('complete-log-modal').classList.add('active');
    }

    handleLogPhoto(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentLogPhoto = e.target.result;
            
            // Show preview
            const preview = document.getElementById('log-photo-preview');
            preview.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; border-radius: 8px; border: 2px solid var(--osrs-gold);">`;
            
            // Enable save button
            document.getElementById('save-log-photo-btn').disabled = false;
        };
        reader.readAsDataURL(file);
    }

    saveLogCompletion() {
        if (!this.currentLogId || !this.currentLogPhoto) return;

        const log = this.data.collectionLog.find(l => l.id === this.currentLogId);
        if (!log) return;

        log.completed = true;
        log.photo = this.currentLogPhoto;
        log.dateCompleted = new Date().toISOString();

        this.saveData();
        closeCompleteLogModal();
        this.renderCollectionLog();

        // Show success
        alert(`✓ "${log.title}" completed! Added to your collection!`);
    }

    deleteCollectionLog(logId) {
        if (!confirm('Are you sure you want to delete this collection log entry?')) {
            return;
        }

        this.data.collectionLog = this.data.collectionLog.filter(l => l.id !== logId);
        this.saveData();
        this.renderCollectionLog();
    }

    filterCollectionLogs(filter) {
        document.querySelectorAll('[data-log-filter]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.logFilter === filter);
        });

        document.querySelectorAll('.log-card').forEach(card => {
            const completed = card.dataset.completed === 'true';
            
            if (filter === 'all') {
                card.style.display = 'block';
            } else if (filter === 'completed') {
                card.style.display = completed ? 'block' : 'none';
            } else if (filter === 'incomplete') {
                card.style.display = !completed ? 'block' : 'none';
            }
        });
    }

    filterCollectionLogsByTag(tag) {
        // Update active state
        document.querySelectorAll('[data-tag-filter]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tagFilter === tag);
        });

        document.querySelectorAll('.log-card').forEach(card => {
            const tags = JSON.parse(card.dataset.tags || '[]');
            
            if (tag === 'all') {
                card.style.display = 'block';
            } else {
                card.style.display = tags.includes(tag) ? 'block' : 'none';
            }
        });
    }

    // Skill Detail Methods
    openSkillDetail(skillName) {
        const skill = this.data.skills[skillName];
        const level = this.getLevelFromXP(skill.xp);
        
        // Set title with emoji
        const emojis = {
            strength: '💪',
            creativity: '🎨',
            intelligence: '🧠',
            charisma: '💬',
            wisdom: '🧘',
            constitution: '📋'
        };
        const skillTitle = skillName.charAt(0).toUpperCase() + skillName.slice(1);
        document.getElementById('skill-detail-title').textContent = `${emojis[skillName]} ${skillTitle}`;
        
        // Set stats
        document.getElementById('skill-detail-level').textContent = level;
        document.getElementById('skill-detail-xp').textContent = skill.xp;
        document.getElementById('skill-detail-streak').textContent = skill.currentStreak;
        
        // Recent completions (today)
        const completionsContainer = document.getElementById('skill-recent-completions');
        const recentCompletions = this.data.completedToday.filter(c => c.skill === skillName);
        
        if (recentCompletions.length === 0) {
            completionsContainer.innerHTML = '<p style="color: var(--osrs-tan); font-style: italic;">No completions yet today</p>';
        } else {
            completionsContainer.innerHTML = recentCompletions.slice(-5).reverse().map(completion => {
                const quest = this.data.quests.find(q => q.id === completion.questId);
                const time = new Date(completion.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return `
                    <div class="completion-item">
                        <div class="completion-quest">${quest ? quest.name : 'Quest'}</div>
                        <div class="completion-xp">+${completion.xp} XP · ${time}</div>
                    </div>
                `;
            }).join('');
        }
        
        // Available quests for this skill
        const questsContainer = document.getElementById('skill-available-quests');
        const availableQuests = this.data.quests.filter(q => 
            q.skill === skillName && !this.isQuestCompletedToday(q.id)
        );
        
        if (availableQuests.length === 0) {
            questsContainer.innerHTML = '<p style="color: var(--osrs-tan); font-style: italic;">All quests completed for today!</p>';
        } else {
            questsContainer.innerHTML = availableQuests.slice(0, 5).map(quest => {
                return `
                    <div class="available-quest-item">
                        <div class="available-quest-info">
                            <div class="available-quest-name">${quest.name}</div>
                            <div class="available-quest-type">${quest.type}</div>
                        </div>
                        <div class="available-quest-xp">+${quest.xp} XP</div>
                    </div>
                `;
            }).join('');
        }
        
        document.getElementById('skill-detail-modal').classList.add('active');
    }
}

// Close modals
function closeLevelUpModal() {
    document.getElementById('level-up-modal').classList.remove('active');
}

function closeAchievementModal() {
    document.getElementById('achievement-modal').classList.remove('active');
}

function closeAddQuestModal() {
    document.getElementById('add-quest-modal').classList.remove('active');
}

function closeEditQuestModal() {
    document.getElementById('edit-quest-modal').classList.remove('active');
    app.editingQuestId = null;
}

function closeAddLogModal() {
    document.getElementById('add-log-modal').classList.remove('active');
}

function closeCompleteLogModal() {
    document.getElementById('complete-log-modal').classList.remove('active');
    app.currentLogId = null;
    app.currentLogPhoto = null;
}

function closeSkillDetailModal() {
    document.getElementById('skill-detail-modal').classList.remove('active');
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new LifeRPG();
});
