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
                    // Draw cards to standby (not overwrite allCards)
                    const ownerKey = this.player1.battleCard === card || this.player1.standbyCards.includes(card) ? 'player1' : 'player2';
                    for (let i = 0; i < (effect.draw || 1); i++) {
                        const drCh = drawRandomCharacter();
                        if (drCh) {
                            const drInst = createCharacterInstance(drCh);
                            this[ownerKey].standbyCards.push(drInst);
                        }
                    }
                    this.addLog(`${card.name} 抽卡`, 'skill');
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
        const currentCard = this.getCurrentPlayer().battleCard;
        if (currentCard) {
            this.processPassive(currentCard, 'on_turn_end');
        }
        this.processStatusEffects(currentCard);

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
            // 1. Process special turn-start/end behaviors
            if (['poison', 'burn', 'dot'].includes(effect.type)) {
                const dmg = effect.damage || 0;
                card.hp -= dmg;
                this.addLog(`${card.name} 受到 ${effect.name || effect.type} ${dmg} 傷害`, 'damage');
            } else if (effect.type === 'shield_dot') {
                const val = effect.value || 0;
                card.shield += val;
                this.addLog(`${card.name} 獲得 ${val} 持續護盾`, 'skill');
            } else if (effect.type === 'percent_hp_dot') {
                // 王欸等-微笑: 每回合-10%當前HP
                const dmg = Math.floor(card.hp * (effect.percent / 100));
                card.hp -= dmg;
                this.addLog(`${card.name} 受到 ${effect.name || '百分比傷害'} ${dmg} 傷害`, 'damage');
            } else if (effect.type === 'delayed_buff') {
                // 伽利略-軟禁: 暈眩結束後增益
                if (effect.triggersAfter !== undefined && effect.triggersAfter > 0) {
                    effect.triggersAfter--;
                    if (effect.triggersAfter <= 0) {
                        card.hp = Math.min(card.maxHp, card.hp + (effect.hp || 0));
                        card.atk += (effect.atk || 0);
                        this.addLog(`${card.name} 軟禁結束，HP +${effect.hp}, ATK +${effect.atk}`, 'skill');
                        return false; // Remove after triggering
                    }
                }
            }

            // 2. Permanent effects always stay
            if (effect.permanent || effect.turns === -1) return true;

            // 3. Update durations
            let keep = true;

            if (effect.turns !== undefined) {
                if (effect.turns > 0) {
                    effect.turns--;
                    if (effect.turns <= 0) {
                        // Clean up effects that have ended
                        if (effect.type === 'buff_atk_temp') {
                            card.atk -= (effect.value || 0);
                            this.addLog(`${card.name} 攻擊增益結束`, 'status');
                        }
                        keep = false;
                    }
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

        // Process general passives (e.g. conditional stats)
        this.processPassive(card, 'passive');

        // Process turn interval passives (every X turns)
        this.processTurnIntervalPassives(card);

        // Reduce cooldowns
        if (card.cooldowns) {
            Object.keys(card.cooldowns).forEach(k => {
                if (card.cooldowns[k] > 0) card.cooldowns[k]--;
            });
        }
    },

    // Process passive abilities
    processPassive(card, trigger, args = {}) {
        if (!card.passive) return;
        const effect = card.passive.effect;
        // Allow through if trigger matches, or is a 'passive' type, or certain special triggers
        // that need to fall through to let specific cases handle them
        if (effect.trigger !== trigger && effect.trigger !== 'passive') {
            // Allow on_skill/on_skill_count/on_skill_success to fall through ONLY if the passive
            // itself is triggered by one of those events (not e.g. on_death passives).
            const skillTriggers = ['on_skill_success', 'on_skill', 'on_skill_count'];
            if (!skillTriggers.includes(trigger) || !skillTriggers.includes(effect.trigger)) return;
        }

        switch (effect.action) {
            case 'buff_atk':
                card.atk += effect.value;
                this.addLog(`${card.name} 被動 [${card.passive.name}]：ATK +${effect.value}`, 'skill');
                break;
            case 'shield':
                if (trigger === 'on_skill_success' && (!effect.skill || effect.skill === args.skillName)) {
                    card.shield += effect.value;
                    this.addLog(`${card.name} 獲得 ${effect.value} 護盾`, 'skill');
                }
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
            case 'heal_turn_number': // 太陽-黑子
                card.hp = Math.min(card.maxHp, card.hp + this.turnCount);
                this.addLog(`${card.name} 被動 [${card.passive.name}]：恢復 ${this.turnCount} HP`, 'heal');
                break;
            case 'scale_with_turn': // 冥王星-遠離
                // Per user rule: hp+ means recovery. If they want max hp, they say "血量上限".
                // Since this desc says "hp+", we treat as recovery.
                card.hp = Math.min(card.maxHp, card.hp + (effect.hp_mult || 0));
                card.atk += (effect.atk_mult || 0);
                this.addLog(`${card.name} 被動 [${card.passive.name}] 成長中`, 'skill');
                break;
            case 'no_attack_dot_revive': // 阿共-共機擾台
                {
                    const opp = this.getOpponent();
                    if (opp.battleCard) {
                        opp.battleCard.hp -= effect.dot;
                        this.addLog(`${card.name} 被動：對 ${opp.battleCard.name} 造成 ${effect.dot} 傷害`, 'damage');
                    }
                    break;
                }
            case 'manhattan_project': // 奧本海默-曼哈頓計畫
                card.resources.plan = (card.resources.plan || 0) + 1;
                if (card.resources.plan >= 8) {
                    card.resources.has_nuke = true;
                    this.addLog(`${card.name} 獲得原子彈！`, 'skill');
                }
                break;
            // conditional_stats handled below (de-duplicated)
            case 'debuff_max_hp': // 暴擊騎士-詛咒
                const targetOpp = this.getOpponent();
                if (targetOpp.battleCard) {
                    targetOpp.battleCard.maxHp = Math.max(1, targetOpp.battleCard.maxHp - effect.value);
                    if (targetOpp.battleCard.hp > targetOpp.battleCard.maxHp) targetOpp.battleCard.hp = targetOpp.battleCard.maxHp;
                    this.addLog(`${card.name} 被動：對手血量上限下降了 ${effect.value}`, 'status');
                }
                break;
            case 'draw': // 魔眼-燃盡, 夏天與你-意志傳承, 達文西-天才
                const owner = this.player1.battleCard === card || this.player1.standbyCards.includes(card) ? 'player1' : 'player2';
                const drawn = [];
                for (let i = 0; i < effect.count; i++) {
                    const ch = drawRandomCharacter();
                    const inst = createCharacterInstance(ch);
                    this[owner].standbyCards.push(inst);
                    drawn.push(inst);
                }
                if (drawn.length > 0) {
                    this.addLog(`${card.name} 被動：抽取了 ${drawn.map(d => d.name).join(', ')}`, 'skill');
                    Animations.drawCards(drawn);
                }
                break;
            case 'add_resource': // 小米-研發, 高鐵-速度, Peter-特選
                card.resources[effect.resource] = (card.resources[effect.resource] || 0) + effect.value;
                if (effect.resource === 'special_count') {
                    this.addLog(`${card.name} 特選 +1 (${card.resources[effect.resource]})`, 'skill');
                }
                break;

            // --- NEW PASSIVE HANDLERS ---

            // apple_passive handled below (de-duplicated)
            case 'apple_bonus_revive':
                if (trigger === 'on_enter' || (trigger === 'on_turn_start' && !card.resources.entered)) {
                    const apples = card.resources.prev_apples || 0;
                    const hpBonus = apples * 30;
                    card.maxHp += hpBonus;
                    card.hp += hpBonus;
                    card.resources.entered = true;
                    this.addLog(`${card.name} 繼承了 ${apples} 顆蘋果，血量上限 +${hpBonus}`, 'skill');
                }
                break;
            case 'tribal_bonus':
                if (trigger === 'on_turn_start' || trigger === 'passive') {
                    const allyName = '莫那魯道';
                    const ownerP = this.player1.battleCard === card || this.player1.standbyCards.includes(card) ? 'player1' : 'player2';
                    const hasAlly = this[ownerP].standbyCards.some(c => c.name === allyName);
                    if (hasAlly && !card.resources.tribal_buff_active) {
                        card.atk += 30;
                        card.resources.tribal_buff_active = true;
                        this.addLog(`${card.name} 因 ${allyName} 在場，攻擊力提升！`, 'status');
                    } else if (!hasAlly && card.resources.tribal_buff_active) {
                        card.atk -= 30;
                        card.resources.tribal_buff_active = false;
                        this.addLog(`${card.name} 失去羈絆，攻擊力下降`, 'status');
                    }
                }
                break;
            case 'debuff_vs_character':
                if (trigger === 'on_turn_start' || trigger === 'passive') {
                    const opponent = this.getOpponent().battleCard;
                    if (opponent && opponent.name.includes(effect.target)) {
                        if (opponent.maxHp > effect.set_max_hp) {
                            opponent.maxHp = effect.set_max_hp;
                            if (opponent.hp > opponent.maxHp) opponent.hp = opponent.maxHp;
                            this.addLog(`${opponent.name} 受到 ${card.name} 壓制，血量上限變為 ${effect.set_max_hp}`, 'status');
                        }
                    }
                }
                break;
            case 'stealth_shield':
                if (trigger === 'on_turn_start') {
                    card.shield = Math.max(card.shield, effect.shield);
                    this.addLog(`${card.name} 進入隱蔽狀態 (護盾 ${effect.shield})`, 'status');
                } else if (trigger === 'on_turn_end') {
                    if (card.shield > 0) {
                        card.shield = 0;
                        this.addLog(`${card.name} 隱蔽結束`, 'status');
                    }
                }
                break;
            case 'self_kill_chance':
                if (Math.random() * 100 < effect.chance) {
                    card.hp = 0;
                    this.addLog(`${card.name} 根據被動效果自我毀滅了！`, 'damage');
                }
                break;
            case 'self_kill_scaling':
                const drownC = card.resources.drown_chance || effect.base_chance;
                if (Math.random() * 100 < drownC) {
                    card.hp = 0;
                    this.addLog(`${card.name} 溺水了！`, 'damage');
                } else {
                    card.resources.drown_chance = drownC + effect.increment;
                }
                break;

            // On death: summon category (地球-適居帶, 土星-星球之力, 梅子綠茶-梅子給我擦)
            case 'summon_category':
                const catOwner = this.player1.battleCard === card || this.player1.standbyCards.includes(card) ? 'player1' : 'player2';
                const catChar = getRandomFromCategory(effect.category);
                if (catChar) {
                    const inst = createCharacterInstance(catChar);
                    this[catOwner].standbyCards.push(inst);
                    this.addLog(`${card.name} 被動 [${card.passive.name}]：召喚了 ${inst.name}`, 'skill');
                    Animations.drawCards([inst]);
                }
                break;

            // On death: summon multiple (狗狗肉摩托車-環保)
            case 'summon_multiple':
                const multOwner = this.player1.battleCard === card || this.player1.standbyCards.includes(card) ? 'player1' : 'player2';
                const summoned = [];
                for (let i = 0; i < effect.count; i++) {
                    const targetChar = getCharacterByName(effect.target);
                    if (targetChar) {
                        const inst = createCharacterInstance(targetChar);
                        this[multOwner].standbyCards.push(inst);
                        summoned.push(inst);
                    }
                }
                if (summoned.length > 0) {
                    this.addLog(`${card.name} 被動 [${card.passive.name}]：召喚了 ${summoned.length} 隻 ${effect.target}`, 'skill');
                    Animations.drawCards(summoned);
                }
                break;

            // On death: damage turn based (菸-擋一根)
            case 'damage_turn_based':
                const dmgOpp = this.getOpponent();
                if (dmgOpp.battleCard) {
                    const dmg = effect.base + this.turnCount * effect.turn_mult;
                    dmgOpp.battleCard.hp -= dmg;
                    this.addLog(`${card.name} 被動 [${card.passive.name}]：對 ${dmgOpp.battleCard.name} 造成 ${dmg} 傷害`, 'damage');
                }
                break;

            // On death: damage (伊魯帕恩-同歸於盡)
            case 'damage':
                const damageOpp = this.getOpponent();
                if (damageOpp.battleCard) {
                    damageOpp.battleCard.hp -= effect.value;
                    this.addLog(`${card.name} 被動 [${card.passive.name}]：對 ${damageOpp.battleCard.name} 造成 ${effect.value} 傷害`, 'damage');
                }
                break;

            // HP loss trigger (E人-血怒)
            case 'buff_atk_per_hp':
                // This is handled in applyDamage by calculating ATK bonus from HP lost
                break;

            // Sacrifice HP for ATK (超凡-血祭)
            case 'sacrifice_hp_buff_atk':
                const totalSacrificed = card.resources.sacrificed_hp || 0;
                if (totalSacrificed < effect.max_sacrifice) {
                    card.maxHp -= effect.hp_loss;
                    card.hp = Math.min(card.hp, card.maxHp);
                    card.atk += effect.atk_gain;
                    card.resources.sacrificed_hp = totalSacrificed + effect.hp_loss;
                    this.addLog(`${card.name} 被動 [${card.passive.name}]：血量上限 -${effect.hp_loss}, ATK +${effect.atk_gain}`, 'skill');
                }
                break;

            // Dodge chance passive (很亮的魚-大跳, 籃球-滑, 球球-滑, 垃圾-猛攻, 黑筆-墨)
            case 'dodge_chance':
                // This adds a permanent dodge chance - should be stored in resources
                if (!card.resources) card.resources = {};
                if (!card.resources.dodge) {
                    card.resources.dodge = effect.value;
                }
                break;

            // Self kill chance (賦能哥-天才少年, 越野摩托車-翻車)
            case 'self_kill_chance':
                if (Math.random() * 100 < effect.chance) {
                    card.hp = 0;
                    this.addLog(`${card.name} 被動 [${card.passive.name}]：突然死亡！`, 'damage');
                }
                break;

            // Apple passive (賈伯斯-天才)
            case 'apple_passive':
                if (trigger === 'on_turn_start') {
                    card.resources.apple = (card.resources.apple || 0) + 1;
                    const appleCount = card.resources.apple;
                    // Shield = apples × 35 (not cumulative add, set directly)
                    card.shield = appleCount * (effect.shield_per || 35);
                    this.addLog(`${card.name} 蘋果 +1 (共${appleCount})，護盾設為 ${card.shield}`, 'skill');
                }
                break;

            // Summon if no tea (台茶18號-名貴)
            case 'summon_if_no_tea':
                const teaOwner = this.player1.battleCard === card || this.player1.standbyCards.includes(card) ? 'player1' : 'player2';
                const hasTea = this[teaOwner].standbyCards.some(c => c.tags?.includes('tea'));
                if (!hasTea) {
                    const teaChar = getRandomFromCategory('tea');
                    if (teaChar) {
                        const inst = createCharacterInstance(teaChar);
                        this[teaOwner].standbyCards.push(inst);
                        this.addLog(`${card.name} 被動 [${card.passive.name}]：召喚了 ${inst.name}`, 'skill');
                        Animations.drawCards([inst]);
                    }
                }
                break;

            // Heal when low HP (美秀吉團-大老婆)
            case 'heal_low_hp':
                if (card.hp < card.maxHp * (effect.threshold / 100)) {
                    // Fix: Data uses 'value' but code expected 'heal_percent'
                    const percent = effect.heal_percent || effect.value || 0;
                    const healAmount = Math.floor(card.maxHp * (percent / 100));
                    card.hp = Math.min(card.maxHp, card.hp + healAmount);
                    this.addLog(`${card.name} 被動 [${card.passive.name}]：恢復 ${healAmount} HP`, 'heal');
                }
                break;

            // Buff ATK when low HP (科比布萊恩特-曼巴精神 with action: low_hp_buff)
            case 'buff_atk_low_hp':
            case 'low_hp_buff':
                if (!card.resources) card.resources = {};
                if (card.hp < card.maxHp * ((effect.threshold || 30) / 100) && !card.resources.low_hp_buff_triggered) {
                    card.atk += (effect.atk || 50);
                    card.resources.low_hp_buff_triggered = true;
                    this.addLog(`${card.name} 被動 [${card.passive.name}]：ATK +${effect.atk || 50}`, 'skill');
                } else if (card.hp >= card.maxHp * ((effect.threshold || 30) / 100) && card.resources.low_hp_buff_triggered) {
                    // If HP recovered above threshold, remove bonus
                    card.atk -= (effect.atk || 50);
                    card.resources.low_hp_buff_triggered = false;
                }
                break;

            // Dodge and scale (垃圾-猛攻)
            case 'dodge_scale':
                // Handled in applyDamage
                break;

            // Tea garden (採茶員-茶園)
            case 'buff_per_standby_category':
                const standbyTeas = this[this.player1.battleCard === card ? 'player1' : 'player2'].standbyCards.filter(c => c.tags?.includes(effect.category)).length;
                card.maxHp += standbyTeas * effect.hp_per;
                card.hp += standbyTeas * effect.hp_per;
                card.atk += standbyTeas * effect.atk_per;
                if (standbyTeas > 0) {
                    this.addLog(`${card.name} 被動 [${card.passive.name}]：根據備戰區${effect.category}數量提升能力`, 'skill');
                }
                break;

            // Summon chance and buff dodge (No Party For Cao Dong)
            case 'summon_chance_buff_dodge':
                if (Math.random() * 100 < effect.chance) {
                    const targetChar = getCharacterByName(effect.target);
                    if (targetChar) {
                        const owner = this.player1.battleCard === card ? 'player1' : 'player2';
                        const inst = createCharacterInstance(targetChar);
                        this[owner].standbyCards.push(inst);
                        this.addLog(`${card.name} 被動：召喚了 ${inst.name}`, 'skill');
                        Animations.drawCards([inst]);
                    }
                }
                // Recalculate dodge based on owned cards
                const ownerP = this.player1.battleCard === card ? 'player1' : 'player2';
                const count = this[ownerP].standbyCards.filter(c => c.name === effect.target).length;
                const newDodge = effect.base_dodge + (count * effect.dodge_per);
                card.resources.dodge = newDodge;
                // Log only if changed? Maybe too spammy.
                break;

            // Money passive (Bill Gates) - On turn start logic
            case 'money_passive':
                if (trigger === 'on_turn_start') {
                    card.resources[effect.resource || 'money'] = (card.resources[effect.resource || 'money'] || 0) + 1;
                    this.addLog(`${card.name} 獲得錢錢 (共${card.resources[effect.resource || 'money']})`, 'skill');
                }
                break;

            // Summon if enemy tea (Fruit Tea)
            case 'summon_if_enemy_tea':
                const opp = this.getOpponent().battleCard;
                if (opp && opp.tags && opp.tags.includes('tea')) {
                    const owner = this.player1.battleCard === card ? 'player1' : 'player2';
                    const teaChar = getRandomFromCategory('tea');
                    if (teaChar) {
                        const inst = createCharacterInstance(teaChar);
                        this[owner].standbyCards.push(inst);
                        this.addLog(`${card.name} 被動：對手是茶，額外召喚了 ${inst.name}`, 'skill');
                    }
                }
                break;

            // Conditional summon tea (Lemon Tea) - Handled in on_skill normally, but here if needed
            case 'conditional_summon_tea':
                // Check if already handled in battleSystem or here.
                // battleSystem calls processPassive with 'on_skill' or 'on_skill_success'.
                // If args.success is true (cleared dodge)
                if (trigger === 'on_skill_success' && args.success) {
                    const owner = this.player1.battleCard === card ? 'player1' : 'player2';
                    const teaChar = getRandomFromCategory('tea');
                    if (teaChar) {
                        const inst = createCharacterInstance(teaChar);
                        this[owner].standbyCards.push(inst);
                        this.addLog(`${card.name} 被動：成功清除閃避，召喚了 ${inst.name}`, 'skill');
                    }
                }
                break;

            // Increment counter (Peter)
            case 'increment_counter':
                if (card.resources[effect.counter] !== undefined) {
                    card.resources[effect.counter]++;
                    this.addLog(`${card.name} 被動 [${card.passive.name}]：${effect.counter} +1 (${card.resources[effect.counter]})`, 'skill');
                }
                break;

            case 'buff_resource':
                card.resources[effect.resource] = (card.resources[effect.resource] || 0) + effect.value;
                this.addLog(`${card.name} 被動 [${card.passive.name}]：${effect.resource} +${effect.value}`, 'skill');
                break;

            // On resource trigger passive (豬自清-背影: every 2 oranges hp+30 atk+5)
            case 'buff_hp_atk': // Can be triggered by on_resource
                if (trigger === 'on_resource') {
                    const resName = effect.resource || args?.resource;
                    const resCount = args?.count || (card.resources && card.resources[resName]) || 0;
                    if (resName && resCount > 0 && resCount % (effect.count || 2) === 0) {
                        const hpGain = effect.hp || 0;
                        const atkGain = effect.atk || 0;
                        card.hp = Math.min(card.maxHp, card.hp + hpGain);
                        card.atk += atkGain;
                        this.addLog(`${card.name} 被動 [${card.passive.name}]：HP +${hpGain}, ATK +${atkGain}！`, 'skill');
                    }
                }
                break;


            case 'summon_category': // on_skill_count trigger with summon_category
                if (effect.trigger === 'on_skill_count') {
                    if (!card.resources) card.resources = {};
                    // Only match the specific skill if effect.skill is set
                    if (!effect.skill || args.skillName === effect.skill) {
                        card.resources.skill_count = (card.resources.skill_count || 0) + 1;
                        if (card.resources.skill_count % effect.count === 0) {
                            const catOwnerKey = this.player1.battleCard === card || this.player1.standbyCards.includes(card) ? 'player1' : 'player2';
                            const catChar = getRandomFromCategory(effect.category);
                            if (catChar) {
                                const inst = createCharacterInstance(catChar);
                                this[catOwnerKey].standbyCards.push(inst);
                                this.addLog(`${card.name} 被動 [${card.passive.name}]：召喚了 ${inst.name}`, 'skill');
                                Animations.drawCards([inst]);
                            }
                        }
                    }
                }
                break;

            // Bonus damage by rarity passive (摳P-垃圾不分藍綠)
            case 'bonus_damage_by_rarity': {
                if (trigger === 'on_attack') {
                    const oppBdr = this.getOpponent().battleCard;
                    if (oppBdr) {
                        const rarityOrder = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC', 'SPECIAL'];
                        const oppRarityIdx = rarityOrder.indexOf(oppBdr.rarity);
                        const legendaryIdx = rarityOrder.indexOf('LEGENDARY');
                        let bonusDmg = 0;
                        if (oppRarityIdx < legendaryIdx) {
                            bonusDmg = 30;
                        } else {
                            bonusDmg = 50;
                        }
                        oppBdr.hp -= bonusDmg;
                        this.addLog(`${card.name} 被動 [${card.passive.name}]：對 ${oppBdr.name} 造成 ${bonusDmg} 額外傷害`, 'damage');
                    }
                }
                break;
            }

            // Conditional stats (王世堅情-有出息)
            case 'conditional_stats': {
                if (!card.resources) card.resources = {};
                const isLow = card.hp < card.maxHp * 0.5;
                const bonusKey = 'conditional_stats_bonus';
                const currentBonus = card.resources[bonusKey] || 0;

                if (isLow) {
                    // Bug fix: should use current atk (before bonus), not baseAtk
                    // We track a 20% bonus of the "base" (atk before this bonus was applied)
                    const atkWithoutBonus = card.atk - currentBonus;
                    const targetBonus = Math.floor(atkWithoutBonus * 0.25); // *1.25 = +25%
                    if (currentBonus !== targetBonus) {
                        card.atk = card.atk - currentBonus + targetBonus;
                        card.resources[bonusKey] = targetBonus;
                        this.addLog(`${card.name} 被動：HP < 50%，ATK ×1.25`, 'status');
                    }
                } else {
                    // Remove bonus when HP is back above 50%
                    if (currentBonus > 0) {
                        card.atk = Math.max(0, card.atk - currentBonus);
                        card.resources[bonusKey] = 0;
                        this.addLog(`${card.name} 被動：HP > 50%，ATK 恢復`, 'status');
                    }
                }
                break;
            }
        }
    },

    // Process turn interval passives (called from processStartOfTurn)
    processTurnIntervalPassives(card) {
        if (!card || !card.passive) return;
        const effect = card.passive.effect;
        if (effect.trigger !== 'on_turn_interval') return;

        if (this.turnCount > 0 && this.turnCount % effect.interval === 0) {
            switch (effect.action) {
                case 'summon': // 奧沙利文-147
                    const owner = this.player1.battleCard === card ? 'player1' : 'player2';
                    const targetChar = getCharacterByName(effect.target);
                    if (targetChar) {
                        const inst = createCharacterInstance(targetChar);
                        this[owner].standbyCards.push(inst);
                        this.addLog(`${card.name} 被動 [${card.passive.name}]：召喚了 ${inst.name}`, 'skill');
                        Animations.drawCards([inst]);
                    }
                    break;
                case 'summon_category': // 伽利略-天文天才 (summon_category action)
                case 'summon_buff': // alias for 伽利略-天文天才
                    const catOwner = this.player1.battleCard === card ? 'player1' : 'player2';
                    const catChar = getRandomFromCategory(effect.category);
                    if (catChar) {
                        const inst = createCharacterInstance(catChar);
                        this[catOwner].standbyCards.push(inst);
                        this.addLog(`${card.name} 被動 [${card.passive.name}]：召喚了 ${inst.name}`, 'skill');
                        Animations.drawCards([inst]);
                    }
                    // Buff ATK per standby planets (use atk_per or atk_per_standby)
                    {
                        const atk_per = effect.atk_per || effect.atk_per_standby || 0;
                        if (atk_per > 0) {
                            const planetCount = this[catOwner].standbyCards.filter(c => c.tags?.includes('planet')).length;
                            card.atk = (card.baseAtk || card.atk) + planetCount * atk_per;
                        }
                    }
                    break;
                case 'buff_hp_atk': // 怕瘦團-大寶
                    card.hp = Math.min(card.maxHp, card.hp + (effect.hp || 0));
                    card.atk += (effect.atk || 0);
                    this.addLog(`${card.name} 被動 [${card.passive.name}]：HP +${effect.hp}, ATK +${effect.atk}`, 'skill');
                    break;
            }
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
