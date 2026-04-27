// ========== NEON CARD GAME - INTERACTIVE TUTORIAL SYSTEM ==========

const TutorialSystem = {
    isActive: false,
    currentStepIndex: 0,
    overlayElement: null,
    dialogElement: null,
    highlightElement: null,
    originalOnClick: null,

    // Fixed deck for tutorial to ensure deterministic learning
    tutorialDeck: ['戰士', '卡德', '赫特'],
    enemyDeck: ['伊魯帕恩', '火車', '小混混'],

    steps: [
        {
            text: "歡迎來到霓虹牌！首先，兩位玩家會各抽出3張角色牌。\\n請點擊上方的「點擊任意處關閉」或畫面任意處來繼續。",
            trigger: "onDrawCards",
            action: "click_close_draw",
            highlight: "animationOverlay" // The draw cards overlay
        },
        {
            text: "這就是你的手牌！請點擊一張你想要首發上場的角色牌。",
            trigger: "onSelectionPhase",
            action: "click_card",
            highlight: "drawnCards" // the container of drawn cards
        },
        {
            text: "太好了！選好角色後，點擊「確認選擇」將其放入戰鬥區。",
            trigger: "onSelectionConfirm",
            action: "click_confirm",
            highlight: "confirmSelection"
        },
        {
            text: "戰鬥開始！這是你的「戰鬥區」角色，下方是你的「備戰區」。\\n點擊「普攻」按鈕對敵人造成傷害！",
            trigger: "onPlayerTurn",
            action: "click_attack",
            highlight: "p1Actions", // we can specifically target the attack button
            targetClass: "attack-btn"
        },
        {
            text: "敵方受到了傷害！現在換敵方回合。\\n(敵方會自動進行攻擊)",
            trigger: "onEnemyTurn",
            action: "auto",
            delay: 2000
        },
        {
            text: "又回到你的回合了。除了普攻，你也可以使用「技能」。\\n每個角色的技能都有獨特效果與冷卻時間，點擊「使用技能」。",
            trigger: "onPlayerTurn",
            action: "click_skill",
            highlight: "p1SkillBtn"
        },
        {
            text: "選擇你要施放的技能！",
            trigger: "onSkillPanelOpen",
            action: "click_skill_option",
            highlight: "skillModalOptions"
        },
        {
            text: "當你的角色血量不足或處於劣勢時，可以使用「撤退」來與備戰區角色交換。\\n點擊「撤退」。",
            trigger: "onPlayerTurn",
            action: "click_retreat",
            highlight: "p1Actions",
            targetClass: "retreat-btn"
        },
        {
            text: "選擇你要換上場的備戰角色。",
            trigger: "onRetreatPanelOpen",
            action: "click_retreat_option",
            highlight: "retreatOptions"
        },
        {
            text: "非常好！你已經學會了所有基本操作。\\n戰鬥中，當一方的所有角色(包含備戰區)都被擊敗時，另一方即獲勝。\\n現在，擊敗對手吧！",
            trigger: "onPlayerTurn",
            action: "finish_tutorial"
        }
    ],

    init() {
        if (GameState.mode !== 'tutorial') return;
        this.isActive = true;
        this.currentStepIndex = 0;

        // Setup UI
        this.createUI();
        console.log('[Tutorial] System initialized.');
    },

    createUI() {
        this.overlayContainer = document.createElement('div');
        this.overlayContainer.id = 'tutorialOverlayContainer';
        this.overlayContainer.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            z-index: 9998;
            display: none;
            pointer-events: none;
        `;

        this.overlayBlocks = Array.from({ length: 4 }).map(() => {
            const block = document.createElement('div');
            block.style.position = 'absolute';
            block.style.background = 'rgba(0, 0, 0, 0.6)';
            block.style.pointerEvents = 'auto'; // Block clicks outside the hole
            this.overlayContainer.appendChild(block);
            return block;
        });

        document.body.appendChild(this.overlayContainer);

        // Dialog box for NPC
        this.dialogElement = document.createElement('div');
        this.dialogElement.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(15, 15, 30, 0.95);
            border: 2px solid var(--neon-magenta);
            border-radius: 12px;
            padding: 20px;
            width: 90%;
            max-width: 500px;
            z-index: 9999;
            color: white;
            font-size: 1.1rem;
            text-align: center;
            display: none;
            box-shadow: 0 0 20px rgba(255, 0, 255, 0.3);
            font-family: var(--font-main);
            pointer-events: auto;
        `;
        document.body.appendChild(this.dialogElement);
    },

    // Triggered by game hooks
    checkTrigger(triggerName) {
        if (!this.isActive) return;
        const currentStep = this.steps[this.currentStepIndex];
        if (!currentStep) return;

        if (currentStep.trigger === triggerName) {
            this.showStep(currentStep);
        }
    },

    showStep(step) {
        console.log('[Tutorial] Showing step:', step.text);

        // Show dialog
        this.dialogElement.innerHTML = `
            <div style="color: var(--neon-cyan); margin-bottom: 8px; font-weight: bold;">教學引導</div>
            <div>${step.text.replace(/\\n/g, '<br>')}</div>
        `;
        this.dialogElement.style.display = 'block';

        this.stopHighlightTracking();
        this.highlightElement = null;

        // Apply new highlight if specified
        if (step.highlight) {
            this.overlayContainer.style.display = 'block';
            let el = document.getElementById(step.highlight);
            if (step.targetClass && el) {
                el = el.querySelector('.' + step.targetClass) || el;
            }
            if (el) {
                this.highlightElement = el;
                this.startHighlightTracking();
            } else {
                this.coverWholeScreen();
            }
        } else {
            this.overlayContainer.style.display = 'block';
            this.coverWholeScreen();
        }

        // Setup action listeners
        if (step.action === 'auto') {
            setTimeout(() => this.nextStep(), step.delay || 1000);
        } else if (step.action === 'finish_tutorial') {
            setTimeout(() => {
                this.dialogElement.style.display = 'none';
                this.overlayContainer.style.display = 'none';
                this.isActive = false;
                alert('教學結束！你現在可以自由發揮了！');
            }, 5000);
        }
    },

    nextStep() {
        if (!this.isActive) return;

        this.stopHighlightTracking();
        this.highlightElement = null;
        this.overlayContainer.style.display = 'none';
        this.dialogElement.style.display = 'none';

        this.currentStepIndex++;
        console.log('[Tutorial] Advanced to step:', this.currentStepIndex);

        // Check if next step triggers immediately on the same state
        const nextStep = this.steps[this.currentStepIndex];
        if (nextStep && nextStep.trigger === this.steps[this.currentStepIndex - 1].trigger) {
            this.checkTrigger(nextStep.trigger);
        }
    },

    startHighlightTracking() {
        this.stopHighlightTracking();
        const track = () => {
            if (this.isActive && this.highlightElement) {
                this.updateHighlightPosition();
                this.trackingFrame = requestAnimationFrame(track);
            }
        };
        track();
    },

    stopHighlightTracking() {
        if (this.trackingFrame) {
            cancelAnimationFrame(this.trackingFrame);
            this.trackingFrame = null;
        }
    },

    updateHighlightPosition() {
        if (!this.highlightElement) return;
        const padding = 5;
        const rect = this.highlightElement.getBoundingClientRect();

        // If element is hidden (e.g. display: none), cover screen
        if (rect.width === 0 && rect.height === 0) {
            this.coverWholeScreen();
            return;
        }

        const top = Math.max(0, rect.top - padding);
        const left = Math.max(0, rect.left - padding);
        const right = Math.min(window.innerWidth, rect.right + padding);
        const bottom = Math.min(window.innerHeight, rect.bottom + padding);

        this.overlayBlocks[0].style.top = '0px';
        this.overlayBlocks[0].style.left = '0px';
        this.overlayBlocks[0].style.width = '100%';
        this.overlayBlocks[0].style.height = top + 'px';

        this.overlayBlocks[1].style.top = bottom + 'px';
        this.overlayBlocks[1].style.left = '0px';
        this.overlayBlocks[1].style.width = '100%';
        this.overlayBlocks[1].style.height = (window.innerHeight - bottom) + 'px';

        this.overlayBlocks[2].style.top = top + 'px';
        this.overlayBlocks[2].style.left = '0px';
        this.overlayBlocks[2].style.width = left + 'px';
        this.overlayBlocks[2].style.height = (bottom - top) + 'px';

        this.overlayBlocks[3].style.top = top + 'px';
        this.overlayBlocks[3].style.left = right + 'px';
        this.overlayBlocks[3].style.width = (window.innerWidth - right) + 'px';
        this.overlayBlocks[3].style.height = (bottom - top) + 'px';
    },

    coverWholeScreen() {
        this.overlayBlocks[0].style.top = '0';
        this.overlayBlocks[0].style.left = '0';
        this.overlayBlocks[0].style.width = '100%';
        this.overlayBlocks[0].style.height = '100%';

        this.overlayBlocks[1].style.height = '0';
        this.overlayBlocks[2].style.width = '0';
        this.overlayBlocks[3].style.width = '0';
    },

    // Notify from UI interactions
    onActionCompleted(actionName) {
        if (!this.isActive) return;
        const currentStep = this.steps[this.currentStepIndex];
        if (currentStep && currentStep.action === actionName) {
            this.nextStep();
        }
    }
};

window.TutorialSystem = TutorialSystem;
