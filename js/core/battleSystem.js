// ========== NEON CARD GAME - BATTLE SYSTEM ==========

const BattleSystem = {
    // Execute normal attack
    async normalAttack(attacker, defender) {
        // Check for "no normal attack" passive (阿共)
        if (attacker.passive?.effect?.action === 'no_attack_dot_revive') {
            GameState.addLog(`${attacker.name} 無法發動普通攻擊`, 'status');
            return false;
        }

        let damage = attacker.atk;

        // Check for random ATK (暗夜騎士 passive)
        if (attacker.baseAtkMin !== undefined) {
            damage = await Animations.showRandomNumber(attacker.baseAtkMin, attacker.baseAtkMax, '攻擊力判定');
        }

        // Check for attack multipliers
        if (attacker.nextAttackMult) {
            damage = Math.floor(damage * (1 + attacker.nextAttackMult / 100));
            attacker.nextAttackMult = 0;
            // Cleanup status badge
            attacker.statusEffects = attacker.statusEffects.filter(e => e.type !== 'buff_next');
        }

        // Apply damage
        const result = await this.applyDamage(attacker, defender, damage);

        attacker.hasAttacked = true;

        return result;
    },

    // Apply damage with all modifiers
    async applyDamage(attacker, defender, baseDamage, options = {}) {
        let damage = baseDamage;
        let blocked = false;
        let dodged = false;

        // Check dodge
        if (!options.ignoresDodge) {
            const dodgeChance = this.getDodgeChance(defender);
            if (dodgeChance > 0) {
                const isDodged = await Animations.probabilityRoll(dodgeChance, '閃避判定');
                if (isDodged) {
                    dodged = true;
                    GameState.addLog(`${defender.name} 閃避了攻擊！`, 'status');

                    // Consume dodge hit
                    const dodgeEff = defender.statusEffects.find(e => e.type === 'dodge' || e.type === 'dodge_reflect');
                    if (dodgeEff && dodgeEff.hits !== undefined) {
                        dodgeEff.hits--;
                        if (dodgeEff.hits <= 0) {
                            defender.statusEffects = defender.statusEffects.filter(e => e !== dodgeEff);
                        }
                    }

                    // Check 垃圾 passive - scale on dodge
                    if (defender.passive?.effect?.action === 'dodge_scale') {
                        defender.maxHp *= defender.passive.effect.hp_mult;
                        defender.hp *= defender.passive.effect.hp_mult;
                        defender.atk *= defender.passive.effect.atk_mult;
                        GameState.addLog(`${defender.name} 被動觸發，能力翻倍！`, 'skill');
                    }

                    return { damage: 0, dodged: true };
                }
            }
        }

        // Check immunity
        const immunity = defender.statusEffects.find(e => e.type === 'immunity');
        if (immunity) {
            immunity.hits--;
            if (immunity.hits <= 0) {
                defender.statusEffects = defender.statusEffects.filter(e => e !== immunity);
            }
            GameState.addLog(`${defender.name} 免疫了傷害！`, 'status');
            return { damage: 0, blocked: true };
        }

        // Check damage reduction (from status effects)
        const reduction = defender.statusEffects.find(e => e.type === 'damage_reduction');
        if (reduction) {
            damage = Math.floor(damage * (1 - reduction.value / 100));
            if (reduction.hits !== undefined) {
                reduction.hits--;
                if (reduction.hits <= 0) {
                    defender.statusEffects = defender.statusEffects.filter(e => e !== reduction);
                }
            }
        }

        // Check damage reduction (from passive conditional_stats - 王世堅情)
        if (defender.passive?.effect?.action === 'conditional_stats' && defender.hp > defender.maxHp / 2) {
            damage = Math.floor(damage * 0.8);
        }

        // Check damage cap (like 二肆八六 or 熱布朗運動)
        const cap = defender.passive?.effect?.action === 'damage_cap' ? defender.passive.effect.cap : null;
        if (cap && damage > cap) {
            damage = cap;
        }

        // Check convert damage to max HP (燒杯)
        const convert = defender.statusEffects.find(e => e.type === 'convert_damage_to_max_hp');
        if (convert) {
            defender.maxHp += damage;
            defender.hp += damage;
            defender.statusEffects = defender.statusEffects.filter(e => e !== convert);
            GameState.addLog(`${defender.name} 將傷害轉化為生命值！`, 'skill');
            return { damage: 0, converted: true };
        }

        // Check reflect
        const reflect = defender.statusEffects.find(e => e.type === 'reflect' || e.type === 'dodge_reflect');
        if (reflect) {
            const rChance = reflect.type === 'dodge_reflect' ? (reflect.reflect_chance || 100) : 100;
            if (rChance === 100 || Math.random() * 100 < rChance) {
                const rVal = reflect.type === 'dodge_reflect' ? 100 : (reflect.value || 100);
                const reflectDamage = Math.floor(damage * rVal / 100);
                attacker.hp -= reflectDamage;
                GameState.addLog(`${defender.name} 反彈了 ${reflectDamage} 傷害！`, 'damage');

                if (reflect.hits !== undefined) {
                    reflect.hits--;
                    if (reflect.hits <= 0) {
                        defender.statusEffects = defender.statusEffects.filter(e => e !== reflect);
                    }
                } else {
                    // If no hits, assume 1-time use
                    defender.statusEffects = defender.statusEffects.filter(e => e !== reflect);
                }
            }
        }

        // Check shield (unless ignores shield)
        const ignoresShield = attacker.passive?.effect?.action === 'ignore_shield';
        if (defender.shield > 0 && !ignoresShield) {
            if (defender.shield >= damage) {
                defender.shield -= damage;
                damage = 0;
                GameState.addLog(`${defender.name} 的護盾吸收了傷害`, 'status');
            } else {
                damage -= defender.shield;
                GameState.addLog(`${defender.name} 的護盾被擊破！`, 'status');
                defender.shield = 0;
            }
        } else if (ignoresShield && defender.shield > 0) {
            GameState.addLog(`${attacker.name} 穿透了護盾！`, 'skill');
        }

        // Apply damage to HP
        defender.hp -= damage;

        // Check 瘋狗騎士 passive - gain max HP on hit
        if (defender.passive?.effect?.trigger === 'on_hit' && defender.passive.effect.action === 'buff_max_hp') {
            defender.maxHp += defender.passive.effect.value;
            defender.hp += defender.passive.effect.value;
        }

        // Check lifesteal
        if (attacker.nextAttackLifesteal) {
            const heal = Math.floor(damage * attacker.nextAttackLifesteal / 100);
            attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
            attacker.nextAttackLifesteal = 0;
            GameState.addLog(`${attacker.name} 吸血恢復 ${heal} HP`, 'heal');
            // Cleanup status badge
            attacker.statusEffects = attacker.statusEffects.filter(e => e.type !== 'lifesteal');
        }

        if (damage > 0) {
            GameState.addLog(`${defender.name} 受到 ${damage} 傷害`, 'damage');
        }

        return { damage, dodged: false, blocked: false };
    },

    // Get total dodge chance
    getDodgeChance(card) {
        let dodge = card.resources?.dodge || 0;

        // Check passive dodge
        if (card.passive?.effect?.trigger === 'on_hit' && card.passive.effect.action === 'dodge_chance') {
            dodge = Math.max(dodge, card.passive.effect.chance);
        }

        // Check status effects
        if (card.statusEffects) {
            card.statusEffects.forEach(e => {
                if (e.type === 'dodge') dodge += (e.chance || 100);
                if (e.type === 'dodge_reflect') dodge += (e.dodge_chance || 0);
            });
        }

        return Math.min(99, dodge);
    },

    // Use skill
    async useSkill(attacker, defender, skillIndex) {
        const skill = attacker.skills[skillIndex];
        if (!skill) return false;

        // Check cooldown
        if (attacker.cooldowns[skillIndex] > 0) {
            GameState.addLog(`${skill.name} 冷卻中！`, 'status');
            return false;
        }

        // Check silence
        const silence = attacker.statusEffects.find(e => e.type === 'silence');
        if (silence) {
            GameState.addLog(`${attacker.name} 被沉默，無法使用技能！`, 'status');
            return false;
        }

        // Set cooldown
        attacker.cooldowns[skillIndex] = skill.cd;

        // Execute skill effect
        GameState.addLog(`${attacker.name} 使用 [${skill.name}]`, 'skill');

        return await this.executeSkillEffect(attacker, defender, skill);
    },

    // Execute skill effect
    async executeSkillEffect(attacker, defender, skill) {
        const effect = skill.effect;
        if (!effect) return true;

        try {
            switch (effect.type) {
                // --- DAMAGE EFFECTS ---
                case 'damage':
                    await this.applyDamage(attacker, defender, effect.value);
                    break;
                case 'damage_random':
                    const randDmg = await Animations.showRandomNumber(effect.min, effect.max, '隨機傷害');
                    await this.applyDamage(attacker, defender, randDmg);
                    break;
                case 'damage_atk_mult':
                    await this.applyDamage(attacker, defender, Math.floor(attacker.atk * effect.mult));
                    break;
                case 'damage_self_damage':
                    await this.applyDamage(attacker, defender, effect.damage);
                    attacker.hp -= effect.self_damage;
                    GameState.addLog(`${attacker.name} 對自己造成 ${effect.self_damage} 傷害`, 'damage');
                    break;
                case 'damage_suicide':
                    await this.applyDamage(attacker, defender, effect.damage);
                    attacker.hp = 0;
                    GameState.addLog(`${attacker.name} 犧牲了自己！`, 'status');
                    break;
                case 'damage_percent_max_hp':
                    await this.applyDamage(attacker, defender, Math.floor(defender.maxHp * effect.value / 100));
                    break;
                case 'damage_current_hp_percent':
                    await this.applyDamage(attacker, defender, Math.floor(defender.hp * effect.value / 100));
                    break;
                case 'damage_turn_mult':
                    await this.applyDamage(attacker, defender, Math.floor(GameState.turnCount * effect.mult));
                    break;
                case 'damage_enemy_atk_mult':
                    await this.applyDamage(attacker, defender, Math.floor((defender.baseAtk || defender.atk) * effect.mult));
                    break;
                case 'damage_enemy_atk':
                    await this.applyDamage(attacker, defender, defender.baseAtk || defender.atk);
                    break;
                case 'damage_hp_mult':
                    await this.applyDamage(attacker, defender, Math.floor(attacker.hp * effect.mult));
                    break;
                case 'damage_lost_hp_percent':
                    await this.applyDamage(attacker, defender, Math.floor((attacker.maxHp - attacker.hp) * effect.value / 100));
                    break;
                case 'damage_self_max_hp_percent':
                    await this.applyDamage(attacker, defender, Math.floor(attacker.maxHp * effect.value / 100));
                    break;
                case 'damage_turn_hp_percent':
                    await this.applyDamage(attacker, defender, Math.floor(GameState.turnCount * attacker.hp * effect.percent / 100));
                    break;
                case 'damage_chance_mult':
                case 'damage_chance_atk_mult':
                    if (await Animations.probabilityRoll(effect.chance, '暴擊判定')) {
                        await this.applyDamage(attacker, defender, Math.floor(attacker.atk * (effect.mult || 2)));
                    } else {
                        await this.applyDamage(attacker, defender, attacker.atk);
                    }
                    break;
                case 'damage_chance_half_hp':
                    if (await Animations.probabilityRoll(effect.chance, '命運判定')) {
                        await this.applyDamage(attacker, defender, Math.floor(defender.hp / 2));
                    } else {
                        GameState.addLog('效果未觸發', 'status');
                    }
                    break;
                case 'damage_chance':
                    if (await Animations.probabilityRoll(effect.chance, '技能命中判定')) {
                        await this.applyDamage(attacker, defender, effect.damage);
                    } else {
                        GameState.addLog('技能未命中！', 'status');
                    }
                    break;
                case 'dice_damage':
                    const roll = await Animations.diceRoll();
                    GameState.addLog(`骰出了 ${roll}！`, 'skill');
                    if (effect.success.includes(roll)) {
                        const diceDmg = Math.floor(attacker.hp * effect.value / 100);
                        await this.applyDamage(attacker, defender, diceDmg);
                    } else {
                        GameState.addLog('骰子未命中目標數字', 'status');
                    }
                    break;

                // --- HEAL EFFECTS ---
                case 'heal':
                    attacker.hp = Math.min(attacker.maxHp, attacker.hp + effect.value);
                    GameState.addLog(`${attacker.name} 恢復 ${effect.value} HP`, 'heal');
                    break;
                case 'heal_max_hp_percent':
                    const hAmt = Math.floor(attacker.maxHp * effect.value / 100);
                    attacker.hp = Math.min(attacker.maxHp, attacker.hp + hAmt);
                    GameState.addLog(`${attacker.name} 恢復 ${hAmt} HP`, 'heal');
                    break;
                case 'heal_lost_hp_percent':
                    const hLost = Math.floor((attacker.maxHp - attacker.hp) * effect.value / 100);
                    attacker.hp = Math.min(attacker.maxHp, attacker.hp + hLost);
                    GameState.addLog(`${attacker.name} 恢復 ${hLost} HP`, 'heal');
                    break;
                case 'heal_random':
                    const rHeal = await Animations.showRandomNumber(effect.min, effect.max, '隨機治療');
                    if (rHeal > 0) {
                        attacker.hp = Math.min(attacker.maxHp, attacker.hp + rHeal);
                        GameState.addLog(`${attacker.name} 恢復 ${rHeal} HP`, 'heal');
                    } else if (rHeal < 0) {
                        attacker.hp += rHeal;
                        GameState.addLog(`${attacker.name} 受到 ${-rHeal} 傷害`, 'damage');
                    }
                    break;
                case 'heal_damage':
                    attacker.hp = Math.min(attacker.maxHp, attacker.hp + effect.heal);
                    await this.applyDamage(attacker, defender, effect.damage);
                    GameState.addLog(`${attacker.name} 恢復 ${effect.heal} HP`, 'heal');
                    break;

                // --- SHIELD EFFECTS ---
                case 'shield':
                    attacker.shield += effect.value;
                    GameState.addLog(`${attacker.name} 獲得 ${effect.value} 護盾`, 'skill');
                    break;
                case 'shield_random':
                    const rShield = await Animations.showRandomNumber(effect.min, effect.max, '隨機護盾');
                    attacker.shield += rShield;
                    GameState.addLog(`${attacker.name} 獲得 ${rShield} 護盾`, 'skill');
                    break;
                case 'shield_dot':
                    attacker.statusEffects.push({ type: 'shield_dot', name: '持續護盾', value: effect.value, turns: effect.turns });
                    GameState.addLog(`${attacker.name} 獲得持續護盾效果`, 'skill');
                    break;

                // --- BUFF & DEBUFF EFFECTS ---
                case 'buff_atk':
                    attacker.atk += effect.value;
                    GameState.addLog(`${attacker.name} ATK +${effect.value}`, 'skill');
                    break;
                case 'buff_hp_atk':
                    // Current HP Recovery + ATK (Per user rule: hp+ means recovery)
                    const recovery = effect.hp || effect.value || 0;
                    attacker.hp = Math.min(attacker.maxHp, attacker.hp + recovery);
                    attacker.atk += (effect.atk || 0);
                    GameState.addLog(`${attacker.name} HP 恢復並 ATK 提升`, 'skill');
                    break;
                case 'buff_max_hp':
                    attacker.maxHp += effect.value;
                    attacker.hp += effect.value;
                    GameState.addLog(`${attacker.name} 血量上限 +${effect.value}`, 'skill');
                    break;
                case 'buff_max_hp_atk':
                    attacker.maxHp += (effect.hp || 0);
                    attacker.hp += (effect.hp || 0);
                    attacker.atk += (effect.atk || 0);
                    GameState.addLog(`${attacker.name} 能力大幅提升`, 'skill');
                    break;
                case 'buff_max_hp_enemy_percent':
                    const enemyMax = (defender.maxHp || defender.hp);
                    const gain = Math.floor(enemyMax * (effect.percent || 0) / 100);
                    attacker.maxHp += gain;
                    attacker.hp += gain;
                    GameState.addLog(`${attacker.name} 吞噬了對手，血量上限增加了 ${gain}`, 'skill');
                    break;
                case 'buff_max_hp_double_damage':
                    attacker.maxHp += (effect.hp || 0);
                    attacker.hp += (effect.hp || 0);
                    attacker.nextAttackMult = (attacker.nextAttackMult || 0) + 100; // Double next damage
                    GameState.addLog(`${attacker.name} 血量上限提升且蓄勢待發`, 'skill');
                    break;
                case 'buff_max_hp_mult_chance':
                    if (await Animations.probabilityRoll(effect.chance, '增強判定')) {
                        const mMult = (effect.mult || 1);
                        attacker.maxHp *= mMult;
                        attacker.hp *= mMult;
                        GameState.addLog(`${attacker.name} 突破了極限！血量上限變為 ${Math.floor(attacker.maxHp)}`, 'skill');
                    }
                    break;
                case 'buff_chance':
                    if (await Animations.probabilityRoll(effect.chance, '機率判定')) {
                        if (effect.success.max_hp) { attacker.maxHp += effect.success.max_hp; attacker.hp += effect.success.max_hp; }
                        if (effect.success.hp) attacker.hp = Math.min(attacker.maxHp, attacker.hp + effect.success.hp);
                        if (effect.success.atk) attacker.atk += effect.success.atk;
                        GameState.addLog('效果觸發成功！', 'skill');
                    } else if (effect.fail) {
                        if (effect.fail.atk) attacker.atk += effect.fail.atk;
                        if (effect.fail.hp) attacker.hp = Math.max(1, attacker.hp - effect.fail.hp);
                        GameState.addLog('效果判定失敗，僅獲得部分提升', 'status');
                    }
                    break;
                case 'buff_next_attack':
                    attacker.nextAttackMult = (attacker.nextAttackMult || 0) + effect.value;
                    attacker.statusEffects.push({ type: 'buff_next', name: '蓄力', value: effect.value, turns: 99 });
                    GameState.addLog(`${attacker.name} 正在蓄力`, 'skill');
                    break;
                case 'debuff_atk':
                    defender.atk = Math.max(0, defender.atk - effect.value);
                    defender.statusEffects.push({ type: 'debuff_atk', name: 'ATK下降', value: effect.value, turns: effect.turns || 1 });
                    GameState.addLog(`${defender.name} ATK -${effect.value}`, 'status');
                    break;
                case 'debuff_atk_percent':
                    const dAtk = Math.floor(defender.atk * effect.value / 100);
                    defender.atk = Math.max(0, defender.atk - dAtk);
                    defender.statusEffects.push({ type: 'debuff_atk', name: 'ATK下降', value: dAtk, turns: effect.turns || 1 });
                    GameState.addLog(`${defender.name} ATK 下降了 ${effect.value}%`, 'status');
                    break;
                case 'debuff_max_hp':
                    defender.maxHp = Math.max(1, defender.maxHp - effect.value);
                    if (defender.hp > defender.maxHp) defender.hp = defender.maxHp;
                    GameState.addLog(`${defender.name} 血量上限 -${effect.value}`, 'status');
                    break;
                case 'debuff_max_hp_chance':
                    if (await Animations.probabilityRoll(effect.chance, '削弱判定')) {
                        defender.maxHp = Math.max(1, defender.maxHp - effect.value);
                        if (defender.hp > defender.maxHp) defender.hp = defender.maxHp;
                        GameState.addLog(`${defender.name} 血量上限下降了 ${effect.value}`, 'status');
                    }
                    break;
                case 'lifesteal_next':
                    attacker.nextAttackLifesteal = effect.value;
                    attacker.statusEffects.push({ type: 'lifesteal', name: '吸血狀態', value: effect.value, turns: 1 });
                    GameState.addLog(`${attacker.name} 準備吸血`, 'skill');
                    break;

                // --- STATUS EFFECTS ---
                case 'stun':
                    defender.statusEffects.push({ type: 'stun', name: '暈眩', turns: effect.turns });
                    GameState.addLog(`${defender.name} 被暈眩 ${effect.turns} 回合`, 'status');
                    break;
                case 'stun_chance':
                    if (await Animations.probabilityRoll(effect.chance, '暈眩判定')) {
                        defender.statusEffects.push({ type: 'stun', name: '暈眩', turns: effect.turns });
                        GameState.addLog(`${defender.name} 被暈眩 ${effect.turns} 回合`, 'status');
                    }
                    break;
                case 'silence':
                    defender.statusEffects.push({ type: 'silence', name: '沉默', turns: effect.turns });
                    GameState.addLog(`${defender.name} 被沉默 ${effect.turns} 回合`, 'status');
                    break;
                case 'sleep':
                    defender.statusEffects.push({ type: 'sleep', name: '昏睡', turns: 99 });
                    GameState.addLog(`${defender.name} 陷入睡眠`, 'status');
                    break;
                case 'poison':
                case 'burn':
                case 'dot':
                    const sName = effect.type === 'poison' ? '中毒' : (effect.type === 'burn' ? '灼燒' : '持續傷害');
                    defender.statusEffects.push({ type: effect.type, name: sName, damage: effect.damage, turns: effect.turns });
                    GameState.addLog(`${defender.name} 受到 ${sName}`, 'status');
                    break;
                case 'poison_percent_max_hp':
                    const pMaxAmt = Math.floor(defender.maxHp * (effect.percent || effect.value) / 100);
                    defender.statusEffects.push({ type: 'poison', name: '中毒', damage: pMaxAmt, turns: effect.turns });
                    GameState.addLog(`${defender.name} 陷入劇毒狀態`, 'status');
                    break;
                case 'burn_permanent':
                    defender.statusEffects.push({ type: 'burn', name: '永久灼燒', damage: effect.damage, permanent: true, stackable: effect.stackable });
                    GameState.addLog(`${defender.name} 被永久點燃`, 'status');
                    break;
                case 'dodge':
                    attacker.statusEffects.push({ type: 'dodge', name: '閃避', chance: effect.chance, hits: effect.hits || 1 });
                    GameState.addLog(`${attacker.name} 獲得閃避效果`, 'skill');
                    break;
                case 'damage_reduction':
                    attacker.statusEffects.push({ type: 'damage_reduction', name: '減傷', value: effect.value, turns: effect.turns, hits: effect.hits });
                    GameState.addLog(`${attacker.name} 獲得減傷`, 'skill');
                    break;
                case 'reflect':
                    attacker.statusEffects.push({ type: 'reflect', name: '反彈', value: effect.value, hits: effect.hits || 1 });
                    GameState.addLog(`${attacker.name} 獲得反彈`, 'skill');
                    break;
                case 'immunity':
                    attacker.statusEffects.push({ type: 'immunity', name: '免疫', hits: effect.hits });
                    GameState.addLog(`${attacker.name} 獲得免疫`, 'skill');
                    break;
                case 'dodge_reflect':
                    attacker.statusEffects.push({ type: 'dodge_reflect', name: '觀測狀態', dodge_chance: effect.dodge_chance, reflect_chance: effect.reflect_chance, hits: 1 });
                    GameState.addLog(`${attacker.name} 進入觀測狀態`, 'skill');
                    break;
                case 'cleanse':
                    attacker.statusEffects = [];
                    GameState.addLog(`${attacker.name} 清除了所有負面效果`, 'skill');
                    break;

                // --- SUMMON & DRAW EFFECTS ---
                case 'draw':
                case 'draw_self_damage':
                    if (effect.type === 'draw_self_damage') {
                        attacker.hp -= effect.damage;
                        GameState.addLog(`${attacker.name} 消耗血量抽牌`, 'skill');
                    }
                    const drawnItems = [];
                    for (let i = 0; i < (effect.count || 1); i++) {
                        const drChar = drawRandomCharacter();
                        if (drChar) {
                            const inst = createCharacterInstance(drChar);
                            GameState.addToStandby(GameState.currentPlayer === 1 ? 'player1' : 'player2', inst);
                            drawnItems.push(inst);
                        }
                    }
                    if (drawnItems.length > 0) {
                        GameState.addLog(`抽到 ${drawnItems.map(c => c.name).join(', ')}`, 'skill');
                        await Animations.drawCards(drawnItems);
                    }
                    break;
                case 'summon':
                case 'summon_chance':
                    if (effect.type === 'summon_chance' && !(await Animations.probabilityRoll(effect.chance, '召喚判定'))) {
                        GameState.addLog('召喚失敗...', 'status');
                        break;
                    }
                    const ch = getCharacterByName(effect.target);
                    if (ch) {
                        const inst = createCharacterInstance(ch);
                        GameState.addToStandby(GameState.currentPlayer === 1 ? 'player1' : 'player2', inst);
                        GameState.addLog(`召喚了 ${inst.name}！`, 'skill');
                        await Animations.drawCards([inst]);
                    }
                    break;
                case 'summon_category':
                    const catChar = getRandomFromCategory(effect.category);
                    if (catChar) {
                        const inst = createCharacterInstance(catChar);
                        GameState.addToStandby(GameState.currentPlayer === 1 ? 'player1' : 'player2', inst);
                        GameState.addLog(`獲得 ${inst.name}！`, 'skill');
                        await Animations.drawCards([inst]);
                    }
                    break;
                case 'summon_multiple':
                    const mults = [];
                    for (let i = 0; i < effect.count; i++) {
                        const targetChar = getCharacterByName(effect.target);
                        if (targetChar) {
                            const inst = createCharacterInstance(targetChar);
                            GameState.addToStandby(GameState.currentPlayer === 1 ? 'player1' : 'player2', inst);
                            mults.push(inst);
                        }
                    }
                    if (mults.length > 0) {
                        GameState.addLog(`召喚了 ${mults.length} 個 ${effect.target}！`, 'skill');
                        await Animations.drawCards(mults);
                    }
                    break;

                // --- SPECIAL EFFECTS ---
                case 'execute':
                    if (defender.hp <= defender.maxHp * effect.threshold / 100) {
                        defender.hp = 0;
                        GameState.addLog(`${defender.name} 被斬殺！`, 'damage');
                    } else {
                        GameState.addLog('目標血量過高，斬殺失敗', 'status');
                    }
                    break;
                case 'skip_turn':
                case 'skip_turns':
                    const sTarget = GameState.currentPlayer === 1 ? 'player2' : 'player1';
                    GameState[sTarget].skipTurns = (GameState[sTarget].skipTurns || 0) + (effect.turns || 1);
                    GameState.addLog(`對手將跳過 ${effect.turns || 1} 回合`, 'status');
                    break;
                case 'steal_card':
                    const targetOpp = GameState.getOpponent();
                    if (targetOpp.standbyCards.length > 0) {
                        const idx = Math.floor(Math.random() * targetOpp.standbyCards.length);
                        const stolen = targetOpp.standbyCards.splice(idx, 1)[0];
                        GameState.addToStandby(GameState.currentPlayer === 1 ? 'player1' : 'player2', stolen);
                        GameState.addLog(`偷取了 ${stolen.name}！`, 'skill');
                    } else {
                        GameState.addLog('對手備戰區空空如也', 'status');
                    }
                    break;
                case 'copy_skill':
                    if (defender.skills && defender.skills.length > 0) {
                        const rSkill = defender.skills[Math.floor(Math.random() * defender.skills.length)];
                        attacker.skills.push({ ...rSkill });
                        attacker.cooldowns[attacker.skills.length - 1] = 0;
                        GameState.addLog(`複製了 ${rSkill.name}！`, 'skill');
                    }
                    break;
                case 'trade_hp_atk':
                case 'trade_hp_atk_damage':
                    attacker.hp -= effect.hp_loss;
                    attacker.atk += effect.atk_gain;
                    if (effect.type === 'trade_hp_atk_damage') await this.applyDamage(attacker, defender, effect.damage);
                    GameState.addLog(`${attacker.name} HP -${effect.hp_loss}, ATK +${effect.atk_gain}`, 'skill');
                    break;
                case 'trade_atk_hp':
                    attacker.atk = Math.max(0, attacker.atk - effect.atk_loss);
                    attacker.maxHp += effect.hp_gain;
                    attacker.hp += effect.hp_gain;
                    GameState.addLog(`${attacker.name} ATK -${effect.atk_loss}, HP +${effect.hp_gain}`, 'skill');
                    break;
                case 'add_resource':
                    attacker.resources[effect.resource] = (attacker.resources[effect.resource] || 0) + effect.value;
                    GameState.addLog(`${effect.resource} +${effect.value}`, 'skill');
                    break;
                case 'damage_resource_mult':
                    await this.applyDamage(attacker, defender, (attacker.resources[effect.resource] || 0) * (effect.mult || 1));
                    break;
                case 'damage_scaling_chance':
                    let curChance = attacker.resources.skill_chance || effect.base_chance;
                    if (await Animations.probabilityRoll(curChance, '命運判定')) await this.applyDamage(attacker, defender, effect.damage);
                    attacker.resources.skill_chance = curChance + effect.increment;
                    break;
                case 'multi_attack':
                    for (let i = 0; i < effect.hits; i++) await this.applyDamage(attacker, defender, attacker.atk);
                    break;

                default:
                    GameState.addLog(`技能效果執行中...`, 'skill');
            }
        } catch (error) {
            console.error('Skill Execution Error:', error);
            GameState.addLog(`技能執行發生錯誤`, 'status');
        }

        // Check for combo attack passive (小吉)
        if (attacker.passive?.effect?.action === 'extra_attack_chance') {
            const extraChance = Math.min(
                attacker.passive.effect.max,
                attacker.passive.effect.base + (attacker.resources.combo_chance || 0)
            );
            if (await Animations.probabilityRoll(extraChance, '連擊判定')) {
                GameState.addLog(`${attacker.name} 觸發連擊！`, 'skill');
                await this.applyDamage(attacker, defender, attacker.atk);
            }
        }

        return true;
    },

    // Retreat action
    retreat(playerKey, standbyIndex) {
        GameState.swapWithStandby(playerKey, standbyIndex);
        const player = GameState[playerKey];
        GameState.addLog(`${player.name} 替換了角色為 ${player.battleCard.name}`, 'status');
        return true;
    }
};
