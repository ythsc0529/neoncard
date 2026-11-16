// Teach one decision at a time, then let the player finish the battle.
const TutorialSystem = {
    isActive: false,
    currentStepIndex: 0,
    tutorialDeck: ['戰士', '赫特', '醫生'],
    enemyDeck: ['小混混', '戰士', '醫生'],
    steps: [
        { title: '先認識這場對戰', text: '你和對手各有 3 名角色。每次只有 1 名在戰鬥區，其餘待在備戰區。先看看抽到的角色，點擊畫面關閉抽牌結果。', trigger: 'onDrawCards', action: 'click_close_draw', target: '#animationOverlay' },
        { title: '選擇首發角色', text: 'HP 是生命值，ATK 是普攻傷害。先點第一張「戰士」：他有 100 HP、20 ATK，技能「砍一刀」造成 30 傷害。其餘兩張會留在備戰區。', trigger: 'onSelectionPhase', action: 'select_warrior', target: '#drawnCards .select-card:first-child' },
        { title: '讓戰士上場', text: '已選好的牌會有選取標記。按「確認選擇」後，戰士進入戰鬥區，赫特和醫生留在備戰區。', trigger: 'onSelectionPhase', action: 'click_confirm', target: '#confirmSelection' },
        { title: '看懂你的戰鬥區', text: '這裡是你目前上場的角色。血條歸零時會退場；護盾會先承受傷害。每個回合只能選一種行動：普攻、技能或撤退。', trigger: 'onPlayerTurn', action: 'continue', target: '#p1BattleCard' },
        { title: '看懂對手', text: '對手的戰鬥區顯示同樣的 HP、ATK 和護盾。攻擊會打向對手目前上場的角色。', trigger: 'onPlayerTurn', action: 'continue', target: '#p2BattleCard' },
        { title: '備戰區是後援', text: '赫特和醫生還能上場。打倒對手目前的角色並不等於勝利；必須讓對手的戰鬥區和備戰區都沒有存活角色。', trigger: 'onPlayerTurn', action: 'continue', target: '#p1Standby' },
        { title: '第一個回合：普攻', text: '點「普攻」讓戰士對對手造成傷害。行動完成後回合會交給對手。', trigger: 'onPlayerTurn', action: 'click_attack', target: '#p1Actions .attack-btn' },
        { title: '觀察對手回合', text: '現在由教學機器人行動。注意雙方血量的變化；輪到你時，我們改用技能。', trigger: 'onEnemyTurn', action: 'wait' },
        { title: '第二個回合：技能', text: '技能的效果和普攻不同。點「使用技能」，看看戰士能使用什麼招式。', trigger: 'onPlayerTurn', action: 'click_skill', target: '#p1SkillBtn' },
        { title: '施放「砍一刀」', text: '選擇「砍一刀」造成 30 傷害。技能使用後會進入冷卻；冷卻數字歸零之前不能再次使用。', trigger: 'onSkillPanelOpen', action: 'click_skill_option', target: '#skillModalOptions .skill-btn-modal:not(:disabled)' },
        { title: '觀察技能結果', text: '對照戰鬥紀錄和血量，確認技能的效果。下一回合看看如何換人。', trigger: 'onEnemyTurn', action: 'wait' },
        { title: '第三個回合：撤退', text: '想保護受傷的戰士，或換一名更適合的角色時，按「撤退」。撤退也會用掉這個回合。', trigger: 'onPlayerTurn', action: 'click_retreat', target: '#p1Actions .retreat-btn' },
        { title: '選一名隊友接手', text: '選擇赫特上場。原本的戰士會回到備戰區，仍可在之後再次出戰。赫特的「狙擊」能造成 50 傷害。', trigger: 'onRetreatPanelOpen', action: 'choose_hette', target: '#retreatOptions .select-card:first-child' },
        { title: '換人後等對手行動', text: '撤退已完成。等機器人行動後，換你獨立判斷要普攻、使用技能，還是再次撤退。', trigger: 'onEnemyTurn', action: 'wait' },
        { title: '確認勝利條件', text: '如果對手戰鬥區的角色倒下，但備戰區還有角色，接下來會發生什麼事？', trigger: 'onPlayerTurn', action: 'quiz', answers: [{ label: '立刻獲勝', correct: false }, { label: '對手派備戰角色上場，戰鬥繼續', correct: true }] },
        { title: '換你完成這場對戰', text: '目標：擊敗對手全部 3 名角色。每回合選一種行動；技能冷卻時可普攻，血量危險時可撤退。真正贏下這場練習後，教學才算完成。', trigger: 'onPlayerTurn', action: 'practice' }
    ],

    init() {
        if (GameState.mode !== 'tutorial') return;
        this.isActive = true;
        this.completedThisBattle = false;
        this.currentStepIndex = 0;
        this.overlayContainer = document.createElement('div');
        this.overlayContainer.className = 'tutorial-spotlight';
        this.overlayBlocks = Array.from({ length: 4 }, () => {
            const block = document.createElement('div');
            block.className = 'tutorial-shade';
            this.overlayContainer.appendChild(block);
            return block;
        });
        document.body.appendChild(this.overlayContainer);
        this.dialogElement = document.createElement('section');
        this.dialogElement.className = 'tutorial-guide';
        this.dialogElement.setAttribute('role', 'status');
        this.dialogElement.setAttribute('aria-live', 'polite');
        document.body.appendChild(this.dialogElement);
    },

    checkTrigger(triggerName) {
        if (!this.isActive) return;
        const step = this.steps[this.currentStepIndex];
        if (!step) return;
        if (step.action === 'wait' && triggerName === 'onPlayerTurn') {
            // endTurn emits its hook before the battle UI redraws.
            setTimeout(() => {
                if (this.isActive && this.steps[this.currentStepIndex] === step) this.nextStep();
            }, 0);
        } else if (step.action === 'practice' && this.dialogElement.style.display === 'block') {
            // Keep the player's hint preference across later turns.
            return;
        } else if (step.trigger === triggerName) {
            this.showStep(step);
        }
    },

    showStep(step) {
        this.stopHighlightTracking();
        if (window.innerWidth <= 900) {
            const battle = document.getElementById('battleContainer');
            const showingOpponent = battle.classList.contains('show-opponent-mobile');
            if (step.target === '#p2BattleCard' && !showingOpponent) toggleMobileView();
            if (step.target?.startsWith('#p1') && showingOpponent) toggleMobileView();
        }
        this.dialogElement.replaceChildren();
        const progress = document.createElement('div');
        progress.className = 'tutorial-progress';
        progress.textContent = `新手教學 ${this.currentStepIndex + 1} / ${this.steps.length}`;
        const title = document.createElement('h2');
        title.textContent = step.title;
        const copy = document.createElement('p');
        copy.textContent = step.text;
        this.dialogElement.append(progress, title, copy);
        if (step.action === 'continue') {
            this.addButton('我懂了，繼續', () => this.nextStep());
        } else if (step.action === 'quiz') {
            const feedback = document.createElement('div');
            feedback.className = 'tutorial-feedback';
            step.answers.forEach(answer => this.addButton(answer.label, () => {
                if (answer.correct) this.nextStep();
                else feedback.textContent = '再想想：對手還有備戰角色可以上場。';
            }));
            this.dialogElement.appendChild(feedback);
        } else if (step.action === 'practice') {
            this.addButton('收起提示', () => {
                this.dialogElement.classList.toggle('tutorial-collapsed');
                this.dialogElement.querySelector('button').textContent = this.dialogElement.classList.contains('tutorial-collapsed') ? '顯示提示' : '收起提示';
            });
        }
        this.dialogElement.classList.toggle('tutorial-practice', step.action === 'practice');
        this.dialogElement.classList.remove('tutorial-collapsed');
        this.dialogElement.style.display = 'block';
        this.overlayContainer.style.display = ['wait', 'practice'].includes(step.action) ? 'none' : 'block';
        this.highlightElement = step.target ? document.querySelector(step.target) : null;
        if (step.target && !this.highlightElement) this.overlayContainer.style.display = 'none';
        else if (this.highlightElement) {
            this.highlightElement.classList.add('tutorial-focus');
            this.highlightElement.scrollIntoView({ block: 'center', behavior: 'auto' });
            this.startHighlightTracking();
        }
        else if (!['wait', 'practice'].includes(step.action)) this.coverWholeScreen();
    },

    addButton(label, handler) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tutorial-guide-button';
        button.textContent = label;
        button.addEventListener('click', handler);
        this.dialogElement.appendChild(button);
    },

    nextStep() {
        if (!this.isActive) return;
        this.stopHighlightTracking();
        this.overlayContainer.style.display = 'none';
        this.dialogElement.style.display = 'none';
        this.currentStepIndex++;
        const step = this.steps[this.currentStepIndex];
        if (!step) return;
        const currentTrigger = document.getElementById('skillPanelModal').classList.contains('active') ? 'onSkillPanelOpen'
            : document.getElementById('retreatModal').classList.contains('active') ? 'onRetreatPanelOpen'
            : !document.getElementById('selectionPhase').classList.contains('hidden') ? 'onSelectionPhase'
            : GameState.currentPlayer === 1 ? 'onPlayerTurn' : 'onEnemyTurn';
        if (step.trigger === currentTrigger) this.showStep(step);
    },

    onActionCompleted(actionName, detail) {
        if (!this.isActive) return;
        const step = this.steps[this.currentStepIndex];
        if (!step) return;
        if (step.action === 'select_warrior' && actionName === 'click_card') {
            if (detail === 0) this.nextStep();
            else this.showFeedback('這次先選第一張「戰士」，其他角色稍後會上場。');
        } else if (step.action === 'choose_hette' && actionName === 'click_retreat_option') {
            if (detail === 0) this.nextStep();
            else this.showFeedback('這次先選第一張「赫特」，觀察換人的效果。');
        } else if (step.action === actionName) this.nextStep();
    },

    showFeedback(message) {
        let feedback = this.dialogElement.querySelector('.tutorial-feedback');
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.className = 'tutorial-feedback';
            this.dialogElement.appendChild(feedback);
        }
        feedback.textContent = message;
    },

    onBattleFinished() {
        if (!this.isActive) return;
        if (GameState.winner === 1 && this.steps[this.currentStepIndex]?.action === 'practice') {
            this.completedThisBattle = true;
            localStorage.setItem('tutorialCompleted', 'true');
        }
        this.isActive = false;
        this.stopHighlightTracking();
        this.overlayContainer.remove();
        this.dialogElement.remove();
    },

    startHighlightTracking() {
        const track = () => {
            if (!this.isActive || !this.highlightElement) return;
            const rect = this.highlightElement.getBoundingClientRect();
            if (rect.width && rect.height) {
                const pad = 6;
                const top = Math.max(0, rect.top - pad);
                const left = Math.max(0, rect.left - pad);
                const right = Math.min(window.innerWidth, rect.right + pad);
                const bottom = Math.min(window.innerHeight, rect.bottom + pad);
                const blocks = this.overlayBlocks;
                Object.assign(blocks[0].style, { top: '0px', left: '0px', width: '100%', height: `${top}px` });
                Object.assign(blocks[1].style, { top: `${bottom}px`, left: '0px', width: '100%', height: `${window.innerHeight - bottom}px` });
                Object.assign(blocks[2].style, { top: `${top}px`, left: '0px', width: `${left}px`, height: `${bottom - top}px` });
                Object.assign(blocks[3].style, { top: `${top}px`, left: `${right}px`, width: `${window.innerWidth - right}px`, height: `${bottom - top}px` });
                this.dialogElement.classList.toggle('tutorial-guide-top', rect.top + rect.height / 2 > window.innerHeight / 2);
            }
            this.trackingFrame = requestAnimationFrame(track);
        };
        track();
    },

    stopHighlightTracking() {
        if (this.trackingFrame) cancelAnimationFrame(this.trackingFrame);
        this.trackingFrame = null;
        this.highlightElement?.classList.remove('tutorial-focus');
        this.dialogElement?.classList.remove('tutorial-guide-top');
    },

    coverWholeScreen() {
        Object.assign(this.overlayBlocks[0].style, { top: '0px', left: '0px', width: '100%', height: '100%' });
        this.overlayBlocks.slice(1).forEach(block => Object.assign(block.style, { width: '0px', height: '0px' }));
    }
};

window.TutorialSystem = TutorialSystem;
