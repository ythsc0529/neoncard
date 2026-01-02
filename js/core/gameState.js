// ========== NEON CARD GAME - GAME STATE MANAGEMENT ==========

const GameState = {
    mode: 'classic', // 'quick' or 'classic'
    turnCount: 0,
    currentPlayer: 1,
    phase: 'init', // 'init', 'coin_flip', 'draw', 'select', 'battle', 'game_over'
    firstPlayer: null,
    winner: null,

    player1: {
        name: '玩家1',
        battleCard: null,
        standbyCards: [],
        allCards: [],
        skipTurns: 0
    },

    player2: {
        name: '玩家2',
        battleCard: null,
        standbyCards: [],
        allCards: [],
        skipTurns: 0
    },

    battleLog: [],

    // Initialize new game
    init(mode = 'classic') {
        this.mode = mode;
        this.turnCount = 0;
        this.currentPlayer = 1;
        this.phase = 'coin_flip';
        this.firstPlayer = null;
        this.winner = null;

        ['player1', 'player2'].forEach(p => {
            this[p].battleCard = null;
            this[p].standbyCards = [];
            this[p].allCards = [];
            this[p].skipTurns = 0;
        });

        this.battleLog = [];
    },

    // Get card count based on mode
    getCardCount() {
        return this.mode === 'quick' ? 3 : 7;
    },

    // Get current player object
    getCurrentPlayer() {
        return this.currentPlayer === 1 ? this.player1 : this.player2;
    },

    // Get opponent player object
    getOpponent() {
        return this.currentPlayer === 1 ? this.player2 : this.player1;
    },

    // Draw cards for a player
    drawCards(playerKey, count) {
        const cards = [];
        for (let i = 0; i < count; i++) {
            const char = drawRandomCharacter();
            const instance = createCharacterInstance(char);
            cards.push(instance);
        }
        this[playerKey].allCards = cards;
        return cards;
    },

    // Set battle card
    setBattleCard(playerKey, cardIndex) {
        const player = this[playerKey];
        player.battleCard = player.allCards[cardIndex];
        player.standbyCards = player.allCards.filter((_, i) => i !== cardIndex);
    },

    // Swap with standby
    swapWithStandby(playerKey, standbyIndex) {
        const player = this[playerKey];
        const oldBattle = player.battleCard;
        player.battleCard = player.standbyCards[standbyIndex];
        player.standbyCards[standbyIndex] = oldBattle;
    },

    // Add card to standby
    addToStandby(playerKey, card) {
        this[playerKey].standbyCards.push(card);
    },

    // Remove dead cards
    handleDeath(playerKey) {
        const player = this[playerKey];
        if (player.battleCard && player.battleCard.hp <= 0) {
            const deadCard = player.battleCard;
            deadCard.deathCount++;

            // Check for passive on_death effects
            const revived = this.checkRevive(deadCard);

            if (!revived) {
                this.processPassive(deadCard, 'on_death');
                player.battleCard = null;
            }

            return !revived;
        }
        return false;
    },

    // Check if character can revive
    checkRevive(card) {
        if (!card.passive || card.passive.effect.trigger !== 'on_death') {
            // Check for 阿共 or other passives that might trigger on death but have trigger: passive
            if (card.passive?.effect?.action === 'no_attack_dot_revive' || card.passive?.effect?.action === 'revive_chance') {
                // fall through to logic below
            } else {
                return false;
            }
        }

        const effect = card.passive.effect;
        if (effect.action === 'revive_chance' || effect.action === 'no_attack_dot_revive' || effect.action === 'draw_revive_limited') {
            const base = effect.revive_chance || effect.base || 0;
            const decay = effect.decay || 0;
            const chance = base - (decay * card.deathCount);

            if (effect.action === 'draw_revive_limited' && (card.reviveCount || 0) >= effect.max_revive) {
                return false;
            }

            if (chance > 0 && Math.random() * 100 < chance) {
                card.hp = 1;
                card.reviveCount = (card.reviveCount || 0) + 1;
                this.addLog(`${card.name} 觸發被動 [${card.passive.name}] 復活了！`, 'status');

                if (effect.action === 'draw_revive_limited') {
                    this.drawCards(this.currentPlayer === 1 ? 'player1' : 'player2', effect.draw);
                }
                return true;
            }
        }
        return false;
    },

    // Check win condition
    checkWin() {
        if (!this.player1.battleCard && this.player1.standbyCards.length === 0) {
            this.winner = 2;
            this.phase = 'game_over';
            return true;
        }
        if (!this.player2.battleCard && this.player2.standbyCards.length === 0) {
            this.winner = 1;
            this.phase = 'game_over';
            return true;
        }
        return false;
    },

    // End turn
    endTurn() {
        // Process end-of-turn effects
        this.processStatusEffects(this.getCurrentPlayer().battleCard);

        // Switch player
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;

        // If back to first player, increment turn count
        if (this.currentPlayer === this.firstPlayer) {
            this.turnCount++;
        }

        // Process start-of-turn effects for new player
        this.processStartOfTurn();
    },

    // Process status effects
    processStatusEffects(card) {
        if (!card || !card.statusEffects) return;

        card.statusEffects = card.statusEffects.filter(effect => {
            // 1. Permanent effects always stay
            if (effect.permanent || effect.turns === -1) return true;

            // 2. Process special turn-start/end behaviors
            if (['poison', 'burn', 'dot'].includes(effect.type)) {
                const dmg = effect.damage || 0;
                card.hp -= dmg;
                this.addLog(`${card.name} 受到 ${effect.name || effect.type} ${dmg} 傷害`, 'damage');
            } else if (effect.type === 'shield_dot') {
                const val = effect.value || 0;
                card.shield += val;
                this.addLog(`${card.name} 獲得 ${val} 持續護盾`, 'skill');
            }

            // 3. Update durations
            let keep = true;

            if (effect.turns !== undefined) {
                if (effect.turns > 0) {
                    effect.turns--;
                    if (effect.turns <= 0) keep = false;
                } else if (effect.turns === 0) {
                    keep = false;
                }
            }

            // Hits are checked in combat, but if hit count reaches 0 naturally, remove it
            if (keep && effect.hits !== undefined) {
                if (effect.hits <= 0) keep = false;
            }

            return keep;
        });
    },

    // Process start of turn
    processStartOfTurn() {
        const player = this.getCurrentPlayer();
        const card = player.battleCard;
        if (!card) return;

        // Check skip turns
        if (player.skipTurns > 0) {
            player.skipTurns--;
            this.addLog(`${player.name} 跳過回合！`, 'status');
            this.endTurn();
            return;
        }

        // Check stun
        const stun = card.statusEffects.find(e => e.type === 'stun');
        if (stun) {
            this.addLog(`${card.name} 被暈眩，無法行動！`, 'status');
            stun.turns--;
            if (stun.turns <= 0) {
                card.statusEffects = card.statusEffects.filter(e => e !== stun);
            }
            this.endTurn();
            return;
        }

        // Check sleep (50% wake chance)
        const sleep = card.statusEffects.find(e => e.type === 'sleep');
        if (sleep) {
            if (Math.random() < 0.5) {
                card.statusEffects = card.statusEffects.filter(e => e !== sleep);
                this.addLog(`${card.name} 甦醒了！`, 'status');
            } else {
                this.addLog(`${card.name} 還在睡眠中...`, 'status');
                this.endTurn();
                return;
            }
        }

        // Process passive on_turn_start effects
        this.processPassive(card, 'on_turn_start');

        // Reduce cooldowns
        if (card.cooldowns) {
            Object.keys(card.cooldowns).forEach(k => {
                if (card.cooldowns[k] > 0) card.cooldowns[k]--;
            });
        }
    },

    // Process passive abilities
    processPassive(card, trigger) {
        if (!card.passive) return;
        const effect = card.passive.effect;
        if (effect.trigger !== trigger && effect.trigger !== 'passive') return;

        switch (effect.action) {
            case 'buff_atk':
                card.atk += effect.value;
                this.addLog(`${card.name} 被動 [${card.passive.name}]：ATK +${effect.value}`, 'skill');
                break;
            case 'buff_max_hp':
                card.maxHp += effect.value;
                card.hp += effect.value;
                this.addLog(`${card.name} 被動 [${card.passive.name}]：血量上限 +${effect.value}`, 'skill');
                break;
            case 'buff_hp_atk':
                // Per user rule: hp+ means recovery
                const recovery = effect.hp || effect.value || 0;
                card.hp = Math.min(card.maxHp, card.hp + recovery);
                card.atk += (effect.atk || 0);
                this.addLog(`${card.name} 被動 [${card.passive.name}]：恢復 ${recovery} HP 並提升攻擊`, 'skill');
                break;
            case 'buff_max_hp_atk':
                card.maxHp += (effect.hp || 0);
                card.hp += (effect.hp || 0);
                card.atk += (effect.atk || 0);
                this.addLog(`${card.name} 被動 [${card.passive.name}]：血量上限提升並提升攻擊`, 'skill');
                break;
            case 'heal':
                card.hp = Math.min(card.maxHp, card.hp + effect.value);
                this.addLog(`${card.name} 被動 [${card.passive.name}]：恢復 ${effect.value} HP`, 'heal');
                break;
            case 'heal_turn_number':
                card.hp = Math.min(card.maxHp, card.hp + this.turnCount);
                this.addLog(`${card.name} 被動 [${card.passive.name}]：恢復 ${this.turnCount} HP`, 'heal');
                break;
            case 'scale_with_turn':
                // Per user rule: hp+ means recovery. If they want max hp, they say "血量上限".
                // Since this desc says "hp+", we treat as recovery.
                card.hp = Math.min(card.maxHp, card.hp + (effect.hp_mult || 0));
                card.atk += (effect.atk_mult || 0);
                this.addLog(`${card.name} 被動 [${card.passive.name}] 成長中`, 'skill');
                break;
            case 'no_attack_dot_revive':
                const opp = this.getOpponent();
                if (opp.battleCard) {
                    opp.battleCard.hp -= effect.dot;
                    this.addLog(`${card.name} 被動：對 ${opp.battleCard.name} 造成 ${effect.dot} 傷害`, 'damage');
                }
                break;
            case 'manhattan_project':
                card.resources.plan = (card.resources.plan || 0) + 1;
                if (card.resources.plan >= 8) card.resources.has_nuke = true;
                break;
            case 'conditional_stats':
                // 王世堅情: hp > 50% reduction 20%, hp < 50% atk * 1.25
                if (card.hp > card.maxHp / 2) {
                    // This damage reduction part needs to be checked in applyDamage
                } else {
                    card.atk = Math.floor(card.baseAtk * 1.25);
                    this.addLog(`${card.name} 進入憤怒狀態，ATK 提升`, 'status');
                }
                break;
            case 'debuff_max_hp':
                const targetOpp = this.getOpponent();
                if (targetOpp.battleCard) {
                    targetOpp.battleCard.maxHp = Math.max(1, targetOpp.battleCard.maxHp - effect.value);
                    if (targetOpp.battleCard.hp > targetOpp.battleCard.maxHp) targetOpp.battleCard.hp = targetOpp.battleCard.maxHp;
                    this.addLog(`${card.name} 被動：對手血量上限下降了 ${effect.value}`, 'status');
                }
                break;
            case 'draw':
                const owner = this.player1.battleCard === card || this.player1.standbyCards.includes(card) ? 'player1' : 'player2';
                this.drawCards(owner, effect.count);
                this.addLog(`${card.name} 被動：抽取了 ${effect.count} 張牌`, 'skill');
                break;
            case 'add_resource':
                card.resources[effect.resource] = (card.resources[effect.resource] || 0) + effect.value;
                break;
            // Add more passive handlers as needed
        }
    },

    // Add battle log entry
    addLog(message, type = 'normal') {
        this.battleLog.unshift({ message, type, time: Date.now() });
        if (this.battleLog.length > 50) this.battleLog.pop();
    },

    // Save state
    save() {
        localStorage.setItem('neonCardGameState', JSON.stringify({
            mode: this.mode,
            turnCount: this.turnCount,
            currentPlayer: this.currentPlayer,
            phase: this.phase,
            firstPlayer: this.firstPlayer,
            player1: this.player1,
            player2: this.player2
        }));
    },

    // Load state
    load() {
        const data = localStorage.getItem('neonCardGameState');
        if (data) {
            const state = JSON.parse(data);
            Object.assign(this, state);
            return true;
        }
        return false;
    }
};
