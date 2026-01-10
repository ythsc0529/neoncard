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

        // --- ATTACKER MODIFIERS ---
        // Check tribal bonus (巴萬/莫那魯道)
        if (attacker.passive?.effect?.action === 'tribal_bonus' || attacker.passive?.effect?.action === 'bonus_vs_character') {
            const targetName = attacker.passive.effect.target;
            if (defender.name.includes(targetName)) {
                damage += (attacker.passive.effect.damage || 30);
                GameState.addLog(`${attacker.name} 對 ${targetName} 造成額外傷害！`, 'status');
            }
        }
        // Check multiplier vs character (I人)
        if (attacker.passive?.effect?.action === 'vs_character') {
            if (defender.name.includes(attacker.passive.effect.target)) {
                damage = Math.floor(damage * (attacker.passive.effect.damage_mult || 1));
                GameState.addLog(`${attacker.name} 對 ${defender.name} 造成加成傷害！`, 'status');
            }
        }

        // --- DEFENDER MODIFIERS ---
        // Check damage reduction (flat)
        const flatReduction = defender.statusEffects.find(e => e.type === 'damage_reduction_flat');
        if (flatReduction) {
            damage = Math.max(0, damage - flatReduction.value);
            if (flatReduction.hits !== undefined) {
                flatReduction.hits--;
                if (flatReduction.hits <= 0) defender.statusEffects = defender.statusEffects.filter(e => e !== flatReduction);
            }
        }

        // Check set damage (I人-宅一下)
        const setDmg = defender.statusEffects.find(e => e.type === 'set_damage');
        if (setDmg) {
            damage = setDmg.value;
            setDmg.hits--;
            if (setDmg.hits <= 0) defender.statusEffects = defender.statusEffects.filter(e => e !== setDmg);
            GameState.addLog(`${defender.name} 的傷害被鎖定為 ${damage}`, 'status');
        }

        // Check extra damage taken (I人-勇氣)
        const extraTaken = defender.statusEffects.find(e => e.type === 'extra_damage_taken');
        if (extraTaken) {
            damage += extraTaken.value;
            extraTaken.hits--;
            if (extraTaken.hits <= 0) defender.statusEffects = defender.statusEffects.filter(e => e !== extraTaken);
        }

        // Check damage reduction (from status effects - percent)
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

        // Check damage cap (passive - 二肆八六)
        const cap = defender.passive?.effect?.action === 'damage_cap' ? defender.passive.effect.cap : null;
        if (cap && damage > cap) {
            damage = cap;
        }

        // Check damage cap hit (status - 拳王)
        const capHit = defender.statusEffects.find(e => e.type === 'damage_cap_hit');
        if (capHit && damage > capHit.cap) {
            damage = capHit.cap;
            capHit.hits--;
            if (capHit.hits <= 0) defender.statusEffects = defender.statusEffects.filter(e => e !== capHit);
        }

        // Check convert damage to max HP (燒杯) - Not Immune
        const convert = defender.statusEffects.find(e => e.type === 'convert_damage_to_max_hp');
        if (convert) {
            defender.maxHp += damage;
            defender.hp += damage; // "Can" heal? Description says convert to max HP. Usually implies healing too or just max hp? Assuming both based on similar mechanics.
            // Actually, usually means incoming damage is negated and becomes stats. But let's assume it doesn't negate damage unless specified (like immune). Only says "convert". 
            // The previous implementation was: defender.maxHp += damage; defender.hp += damage; return {damage:0} (blocked).
            // Let's stick to blocking it as it's a conversion.
            defender.statusEffects = defender.statusEffects.filter(e => e !== convert);
            GameState.addLog(`${defender.name} 將傷害轉化為血量上限！`, 'skill');
            return { damage: 0, converted: true };
        }

        // Check convert damage to max HP (immune) - 英國紳士
        const convertImmune = defender.statusEffects.find(e => e.type === 'convert_damage_to_max_hp_immune');
        if (convertImmune) {
            const amount = Math.floor(damage * convertImmune.percent / 100);
            defender.maxHp += amount;
            defender.hp += amount;
            defender.statusEffects = defender.statusEffects.filter(e => e !== convertImmune);
            GameState.addLog(`${defender.name} 免疫傷害並轉化為血量上限 +${amount}`, 'skill');
            return { damage: 0, converted: true };
        }

        // Check double damage taken (王欸等-大跳)
        const doubleDmg = defender.statusEffects.find(e => e.type === 'double_damage_taken');
        if (doubleDmg) {
            damage *= 2;
            GameState.addLog(`${defender.name} 受到雙倍傷害！`, 'damage');
            doubleDmg.hits--;
            if (doubleDmg.hits <= 0) defender.statusEffects = defender.statusEffects.filter(e => e !== doubleDmg);
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

        // --- ON HIT PASSIVES ---

        // Ray生我夢 - conditional_dodge_heal
        if (defender.passive?.effect?.action === 'conditional_dodge_heal') {
            // Note: This logic technically should happen BEFORE damage application if it's a "dodge", 
            // but the description says "When taking > 70 dmg". We can refund the HP if it triggers.
            if (options.originalDamage > defender.passive.effect.threshold) { // Need original damage? Or calculated? Usually calculated.
                // Should pass calculate damage to check? Assuming 'damage' here is final.
                // But if we already deducted HP, we should add it back.
                if (damage > defender.passive.effect.threshold) {
                    if (Math.random() * 100 < defender.passive.effect.chance) {
                        defender.hp += damage; // Undo damage
                        defender.hp = Math.min(defender.maxHp, defender.hp + defender.passive.effect.heal);
                        GameState.addLog(`${defender.name} 觸發閃避恢復！`, 'heal');
                        return { damage: 0, dodged: true };
                    }
                }
            }
        }

        // Check 瘋狗騎士/垃圾 passive - gain max HP on hit / dodge scale
        if (defender.passive?.effect?.trigger === 'on_hit') {
            if (defender.passive.effect.action === 'buff_max_hp') {
                defender.maxHp += defender.passive.effect.value;
                defender.hp += defender.passive.effect.value;
            }
            // Note: dodge_scale handled in dodge block, or here if it implies "on hit attempt"? 
            // "每閃避一次" (every time dodged) - handled in dodge block.
        }

        // I人 passive bonus damage taken (handled in extra_damage_taken check if implemented as passive->status, but here as strict passive)
        if (defender.passive?.effect?.action === 'vs_character' && defender.passive.effect.extra_damage_taken) {
            if (attacker.name.includes(defender.passive.effect.target)) {
                defender.hp -= defender.passive.effect.extra_damage_taken;
                GameState.addLog(`${defender.name} 受到額外種族傷害 ${defender.passive.effect.extra_damage_taken}`, 'damage');
            }
        }

        // Check money passive (比二蓋紙)
        if (defender.passive?.effect?.action === 'money_passive') {
            if (damage > 50) {
                defender.resources.money = Math.max(0, (defender.resources.money || 0) - 5);
                defender.hp = Math.min(defender.maxHp, defender.hp + 100);
                GameState.addLog(`${defender.name} 消耗錢錢恢復了 100 HP`, 'heal');
            }
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
        // Check for dodge_zero status
        if (card.statusEffects && card.statusEffects.some(e => e.type === 'dodge_zero')) {
            return 0;
        }

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
        attacker.cooldowns[skillIndex] = skill.cd + 1;

        // Execute skill effect
        GameState.addLog(`${attacker.name} 使用 [${skill.name}]`, 'skill');

        const result = await this.executeSkillEffect(attacker, defender, skill);
        GameState.processPassive(attacker, 'on_skill', { skillName: skill.name });
        return result;
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
                        GameState.processPassive(attacker, 'on_skill_success', { skillName: skill.name });
                    } else {
                        GameState.addLog('技能未命中！', 'status');
                    }
                    break;
                case 'dice_damage': {
                    const dRes = await Animations.diceRoll();
                    GameState.addLog(`骰出了 ${dRes}！`, 'skill');
                    if (effect.success.includes(dRes)) {
                        let dDmg = 0;
                        if (effect.damage_type === 'current_hp_percent') {
                            dDmg = Math.floor(defender.hp * effect.value / 100);
                        } else {
                            dDmg = effect.value || 0;
                        }
                        await this.applyDamage(attacker, defender, dDmg);
                        GameState.addLog('效果發動成功！', 'skill');
                    } else {
                        GameState.addLog('效果發動失敗', 'status');
                    }
                    break;
                }

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
                    const categoryChar = getRandomFromCategory(effect.category);
                    if (categoryChar) {
                        const inst = createCharacterInstance(categoryChar);
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

                // --- ADDITIONAL DAMAGE EFFECTS ---
                case 'damage_double_random': // 蝦子-蝦攻
                    const chanceRoll = Math.floor(Math.random() * (effect.chance_max - effect.chance_min + 1)) + effect.chance_min;
                    if (await Animations.probabilityRoll(chanceRoll, '命中判定')) {
                        const dmgRoll = await Animations.showRandomNumber(effect.damage_min, effect.damage_max, '傷害判定');
                        await this.applyDamage(attacker, defender, dmgRoll);
                    } else {
                        GameState.addLog('攻擊未命中', 'status');
                    }
                    break;
                case 'damage_weighted': // 球-概率, 羽球-殺球
                    let totalWeight = effect.options.reduce((sum, o) => sum + o.chance, 0);
                    let weightedRoll = Math.random() * totalWeight;
                    let selectedDamage = effect.options[0].damage;
                    for (const opt of effect.options) {
                        if (weightedRoll < opt.chance) {
                            selectedDamage = opt.damage;
                            break;
                        }
                        weightedRoll -= opt.chance;
                    }
                    await this.applyDamage(attacker, defender, selectedDamage);
                    break;
                case 'damage_or_stun': // 周接輪-蕭邦的夜曲
                    if (await Animations.probabilityRoll(effect.chance, '技能判定')) {
                        await this.applyDamage(attacker, defender, effect.damage);
                    } else {
                        // Check passive for enhanced stun
                        let stunTurns = effect.stun;
                        if (attacker.passive?.effect?.action === 'conditional_stun' && attacker.hp < 10) {
                            stunTurns = 2;
                        }
                        defender.statusEffects.push({ type: 'stun', name: '暈眩', turns: stunTurns });
                        GameState.addLog(`${defender.name} 被暈眩 ${stunTurns} 回合`, 'status');
                    }
                    break;
                case 'damage_or_self_damage': // 怕瘦團-請記得揍我一拳, 李白-喝酒
                    if (await Animations.probabilityRoll(effect.chance, '技能判定')) {
                        await this.applyDamage(attacker, defender, effect.damage);
                    } else {
                        attacker.hp -= effect.self_damage;
                        GameState.addLog(`${attacker.name} 失手了，對自己造成 ${effect.self_damage} 傷害`, 'damage');
                    }
                    break;

                case 'silence_damage': // 太陽-太陽風暴
                    await this.applyDamage(attacker, defender, effect.damage);
                    defender.statusEffects.push({ type: 'silence', name: '沈默', turns: effect.turns });
                    GameState.addLog(`${defender.name} 被沈默 ${effect.turns} 回合`, 'status');
                    break;
                case 'damage_plus_turn': // 很亮的魚-好人
                    await this.applyDamage(attacker, defender, effect.base + GameState.turnCount);
                    break;
                case 'damage_buff_atk': // 李白-吟詩
                    await this.applyDamage(attacker, defender, effect.damage);
                    attacker.atk += effect.atk;
                    // Track for passive
                    attacker.resources.poem_count = (attacker.resources.poem_count || 0) + 1;
                    if (attacker.resources.poem_count >= 3) {
                        attacker.maxHp += 100;
                        attacker.hp += 100;
                        attacker.atk += 10;
                        attacker.resources.poem_count = 0;
                        GameState.addLog(`${attacker.name} 靜夜思觸發，能力大幅提升！`, 'skill');
                    }
                    GameState.addLog(`${attacker.name} ATK +${effect.atk}`, 'skill');
                    break;
                case 'damage_instant_kill': // 草泥馬-吐口水
                    await this.applyDamage(attacker, defender, effect.damage);
                    if (await Animations.probabilityRoll(effect.kill_chance, '擊殺判定')) {
                        defender.hp = 0;
                        GameState.addLog(`${defender.name} 被直接擊殺！`, 'damage');
                    }
                    break;
                case 'damage_ignore_shield': // 奧沙利文-準進
                    // Direct damage ignoring shield
                    defender.hp -= effect.value;
                    GameState.addLog(`${defender.name} 受到 ${effect.value} 穿透傷害`, 'damage');
                    break;
                case 'damage_ignore_dodge': // 日本人-偷襲
                    await this.applyDamage(attacker, defender, effect.value, { ignoresDodge: true });
                    break;
                case 'damage_conditional_atk': // 聖女-審判
                    if (defender.atk > attacker.atk) {
                        await this.applyDamage(attacker, defender, effect.damage);
                    } else {
                        GameState.addLog('對手攻擊力不夠高，審判無效', 'status');
                    }
                    break;
                case 'damage_chance_turn_mult': // 婕媞-棒棒棒棒
                    if (await Animations.probabilityRoll(effect.chance, '技能判定')) {
                        await this.applyDamage(attacker, defender, effect.mult * GameState.turnCount);
                    } else {
                        GameState.addLog('技能未觸發', 'status');
                    }
                    break;
                case 'damage_random_mult': // 講晚安-捷運
                    const multRoll = await Animations.showRandomNumber(effect.min, effect.max, '倍率判定');
                    const baseDmg = effect.base || effect.mult || 1;
                    await this.applyDamage(attacker, defender, baseDmg * multRoll);
                    break;
                case 'damage_random_percent_atk': // 鳳凰-俯衝
                    const percentRoll = await Animations.showRandomNumber(effect.min, effect.max, '倍率判定');
                    await this.applyDamage(attacker, defender, Math.floor(attacker.atk * percentRoll / 100));
                    break;
                case 'damage_speed_turn': // 高鐵-跟不上我的速度吧
                    const speed = attacker.resources?.speed || 0;
                    const speedDmg = attacker.atk + Math.floor(speed * GameState.turnCount * (effect.percent / 100));
                    await this.applyDamage(attacker, defender, speedDmg);
                    break;
                case 'damage_chance_turn': // 摳P-天才
                    if (await Animations.probabilityRoll(GameState.turnCount, '回合機率判定')) {
                        await this.applyDamage(attacker, defender, effect.damage);
                    } else {
                        GameState.addLog('機率未達成', 'status');
                    }
                    break;
                case 'damage_crit': // 拳-拳
                    attacker.resources.crit_rate = (attacker.resources.crit_rate || 10) + effect.crit_buff;
                    const critChance = attacker.resources.crit_rate;
                    const critMult = attacker.resources.crit_mult || 2.0;
                    if (await Animations.probabilityRoll(critChance, '爆擊判定')) {
                        await this.applyDamage(attacker, defender, Math.floor(attacker.atk * critMult));
                        GameState.addLog('爆擊！', 'skill');
                    } else {
                        await this.applyDamage(attacker, defender, attacker.atk);
                    }
                    // Check evolution
                    if (attacker.resources.crit_rate >= 55 && attacker.name === '拳') {
                        await this.evolveCharacter(attacker, '拳王');
                    }
                    break;
                case 'damage_crit_buff': // 拳-超拳
                    attacker.resources.crit_rate = (attacker.resources.crit_rate || 10) + effect.crit_buff;
                    attacker.resources.crit_mult = (attacker.resources.crit_mult || 2.0) + effect.mult_buff;
                    const superCritChance = attacker.resources.crit_rate;
                    const superCritMult = attacker.resources.crit_mult;
                    if (await Animations.probabilityRoll(superCritChance, '爆擊判定')) {
                        await this.applyDamage(attacker, defender, Math.floor(attacker.atk * superCritMult));
                        GameState.addLog('爆擊！', 'skill');
                    } else {
                        await this.applyDamage(attacker, defender, attacker.atk);
                    }
                    // Check evolution
                    if (attacker.resources.crit_rate >= 55 && attacker.name === '拳') {
                        await this.evolveCharacter(attacker, '拳王');
                    }
                    break;
                case 'damage_atk_mult_crit': // 拳王-尻爆
                    const champCritChance = attacker.resources.crit_rate || 60;
                    const champCritMult = attacker.resources.crit_mult || 2.5;
                    if (await Animations.probabilityRoll(champCritChance, '爆擊判定')) {
                        await this.applyDamage(attacker, defender, Math.floor(attacker.atk * effect.mult * champCritMult));
                        GameState.addLog('爆擊！', 'skill');
                    } else {
                        await this.applyDamage(attacker, defender, Math.floor(attacker.atk * effect.mult));
                    }
                    break;
                case 'damage_guaranteed_crit': // 拳王-認真一拳
                    const gCritMult = attacker.resources.crit_mult || 2.5;
                    await this.applyDamage(attacker, defender, Math.floor(attacker.atk * effect.mult * gCritMult));
                    GameState.addLog('必定爆擊！', 'skill');
                    break;
                case 'silence_damage': // 太陽-太陽風暴
                    defender.statusEffects.push({ type: 'silence', name: '沉默', turns: effect.turns });
                    await this.applyDamage(attacker, defender, effect.damage);
                    GameState.addLog(`${defender.name} 被沉默 ${effect.turns} 回合`, 'status');
                    break;

                // --- ADDITIONAL HEAL EFFECTS ---
                case 'heal_full': // 狗狗肉摩托車-換電池
                    attacker.hp = attacker.maxHp;
                    GameState.addLog(`${attacker.name} 血量回滿！`, 'heal');
                    break;
                case 'heal_buff_atk': // 李翊Ray-大吃一頓
                    attacker.hp = Math.min(attacker.maxHp, attacker.hp + effect.heal);
                    attacker.atk += effect.atk;
                    // Track for passive
                    attacker.resources.eat_count = (attacker.resources.eat_count || 0) + 1;
                    if (attacker.resources.eat_count >= 3) {
                        attacker.hp = 800;
                        attacker.maxHp = Math.max(attacker.maxHp, 800);
                        attacker.atk = 60;
                        GameState.addLog(`${attacker.name} 大吃三次，能力設為最強狀態！`, 'skill');
                    }
                    GameState.addLog(`${attacker.name} 恢復 ${effect.heal} HP, ATK +${effect.atk}`, 'heal');
                    break;
                case 'heal_chance': // 賈伯斯max-麥金塔
                    if (await Animations.probabilityRoll(effect.chance, '治療判定')) {
                        attacker.hp = Math.min(attacker.maxHp, attacker.hp + effect.heal);
                        GameState.addLog(`${attacker.name} 恢復 ${effect.heal} HP`, 'heal');
                    } else {
                        GameState.addLog('治療失敗', 'status');
                    }
                    break;
                case 'heal_or_self_damage': // 重型摩托車-車禍
                    if (await Animations.probabilityRoll(effect.chance, '判定')) {
                        attacker.hp = Math.min(attacker.maxHp, attacker.hp + effect.heal);
                        GameState.addLog(`${attacker.name} 恢復 ${effect.heal} HP`, 'heal');
                    } else {
                        attacker.hp -= effect.damage;
                        GameState.addLog(`${attacker.name} 失敗，受到 ${effect.damage} 傷害`, 'damage');
                    }
                    break;
                case 'heal_damage_reduction': // 拳-格擋
                    attacker.hp = Math.min(attacker.maxHp, attacker.hp + effect.heal);
                    attacker.statusEffects.push({ type: 'damage_reduction_flat', name: '減傷', value: effect.reduction, hits: 1 });
                    GameState.addLog(`${attacker.name} HP +${effect.heal}，下次受傷減少 ${effect.reduction}`, 'skill');
                    break;
                case 'heal_damage_cap': // 拳王-超格擋
                    attacker.hp = Math.min(attacker.maxHp, attacker.hp + effect.heal);
                    attacker.statusEffects.push({ type: 'damage_cap_hit', name: '格擋', cap: effect.cap, hits: 1 });
                    GameState.addLog(`${attacker.name} HP +${effect.heal}，下次受傷不超過 ${effect.cap}`, 'skill');
                    break;

                // --- ADDITIONAL BUFF EFFECTS ---
                case 'buff_dodge': // 水龍頭-太好笑了
                    attacker.resources.dodge = (attacker.resources.dodge || 30) + effect.value;
                    GameState.addLog(`${attacker.name} 閃避率 +${effect.value}%`, 'skill');
                    break;
                case 'buff_atk_random': // 老利-鋒利度測試
                    const atkBuff = await Animations.showRandomNumber(effect.min, effect.max, '攻擊增益');
                    attacker.atk += atkBuff;
                    GameState.addLog(`${attacker.name} ATK +${atkBuff}`, 'skill');
                    break;
                case 'buff_atk_mult': // 老利-老利
                    attacker.atk = Math.floor(attacker.atk * effect.mult);
                    GameState.addLog(`${attacker.name} ATK ×${effect.mult}`, 'skill');
                    break;
                case 'buff_atk_mult_chance': // 12了-12了
                    if (await Animations.probabilityRoll(effect.chance, '強化判定')) {
                        attacker.atk = Math.floor(attacker.atk * effect.mult);
                        GameState.addLog(`${attacker.name} ATK ×${effect.mult}！`, 'skill');
                    } else {
                        GameState.addLog('強化失敗', 'status');
                    }
                    break;
                case 'buff_atk_percent_chance': // 老利-磨刀
                    if (await Animations.probabilityRoll(effect.chance, '強化判定')) {
                        const buffAmt = Math.floor(attacker.atk * effect.percent / 100);
                        attacker.atk += buffAmt;
                        GameState.addLog(`${attacker.name} ATK +${effect.percent}%`, 'skill');
                    } else {
                        GameState.addLog('磨刀失敗', 'status');
                    }
                    break;
                case 'buff_atk_ignore_dodge': // 伽利略-觀測
                    attacker.atk += effect.atk;
                    attacker.nextAttackIgnoresDodge = true;
                    GameState.addLog(`${attacker.name} ATK +${effect.atk}，下次攻擊無視閃避`, 'skill');
                    break;
                case 'buff_resource': // 高鐵-準點, 庫裡面-咬牙套
                    attacker.resources[effect.resource] = (attacker.resources[effect.resource] || 0) + effect.value;
                    GameState.addLog(`${effect.resource} +${effect.value}`, 'skill');
                    break;
                case 'buff_hp_percent_atk': // 美秀吉團-來一根
                    const hpGain = Math.floor(attacker.maxHp * effect.hp_percent / 100);
                    attacker.hp = Math.min(attacker.maxHp, attacker.hp + hpGain);
                    attacker.atk += effect.atk;
                    GameState.addLog(`${attacker.name} HP +${effect.hp_percent}%, ATK +${effect.atk}`, 'skill');
                    break;
                case 'buff_speed_hp_atk': // 高鐵-準點
                    attacker.resources.speed = (attacker.resources.speed || 0) + effect.speed;
                    attacker.hp = Math.min(attacker.maxHp, attacker.hp + effect.hp);
                    attacker.atk += effect.atk;
                    GameState.addLog(`速度 +${effect.speed}, HP +${effect.hp}, ATK +${effect.atk}`, 'skill');
                    break;
                case 'trade_speed_hp': // 高鐵-誤點
                    attacker.resources.speed = Math.max(0, (attacker.resources.speed || 0) - effect.speed_loss);
                    attacker.maxHp += effect.hp_gain;
                    attacker.hp += effect.hp_gain;
                    GameState.addLog(`速度 -${effect.speed_loss}, 血量上限 +${effect.hp_gain}`, 'skill');
                    break;
                case 'buff_set_damage': // I人-宅一下
                    attacker.hp = Math.min(attacker.maxHp, attacker.hp + effect.hp);
                    attacker.atk += effect.atk;
                    attacker.statusEffects.push({ type: 'set_damage', name: '設定傷害', value: effect.set_damage, hits: 1 });
                    GameState.addLog(`${attacker.name} HP +${effect.hp}, ATK +${effect.atk}`, 'skill');
                    break;
                case 'trade_hp_atk_extra_damage': // I人-勇氣
                    attacker.hp -= effect.hp_loss;
                    attacker.atk += effect.atk_gain;
                    attacker.statusEffects.push({ type: 'extra_damage_taken', name: '額外受傷', value: effect.extra_damage, hits: 1 });
                    GameState.addLog(`${attacker.name} HP -${effect.hp_loss}, ATK +${effect.atk_gain}`, 'skill');
                    break;
                case 'buff_reduce_cd': // Peter pro-重考
                    attacker.maxHp += effect.hp;
                    attacker.hp += effect.hp;
                    attacker.atk += effect.atk;
                    Object.keys(attacker.cooldowns).forEach(k => {
                        if (attacker.cooldowns[k] > 0) attacker.cooldowns[k] = Math.max(0, attacker.cooldowns[k] - effect.cd_reduce);
                    });
                    GameState.addLog(`HP +${effect.hp}, ATK +${effect.atk}，技能冷卻減少`, 'skill');
                    break;

                // --- ADDITIONAL DEBUFF EFFECTS ---
                case 'debuff_atk_percent_permanent': // 武士運動-武士
                    const atkReduce = Math.floor(defender.atk * effect.value / 100);
                    defender.atk = Math.max(0, defender.atk - atkReduce);
                    GameState.addLog(`${defender.name} ATK 永久 -${effect.value}%`, 'status');
                    break;
                case 'buff_enemy_atk': // 梅子綠茶-侮辱
                    defender.atk += effect.value;
                    defender.statusEffects.push({ type: 'buff_atk_temp', name: '攻擊提升', value: effect.value, turns: effect.turns });
                    GameState.addLog(`${defender.name} ATK +${effect.value} (${effect.turns}回合)`, 'status');
                    break;
                case 'debuff_percent_hp_dot': // 王欸等-微笑
                    defender.statusEffects.push({ type: 'percent_hp_dot', name: '露齒微笑', percent: effect.percent, permanent: true });
                    attacker.atk += effect.atk_buff;
                    GameState.addLog(`${defender.name} 獲得露齒微笑效果，每回合損失 ${effect.percent}% HP`, 'status');
                    break;
                case 'debuff_dodge_zero': // 檸檬紅茶-福利
                    const hadDodge = defender.resources?.dodge > 0;
                    defender.resources = defender.resources || {};
                    defender.resources.dodge = 0;
                    defender.statusEffects = defender.statusEffects.filter(e => e.type !== 'dodge');
                    GameState.addLog(`${defender.name} 閃避率歸零`, 'status');
                    // Passive trigger for tea
                    if (hadDodge && attacker.passive?.effect?.action === 'conditional_summon_tea') {
                        const tea = getRandomFromCategory('tea');
                        if (tea) {
                            const inst = createCharacterInstance(tea);
                            GameState.addToStandby(GameState.currentPlayer === 1 ? 'player1' : 'player2', inst);
                            GameState.addLog(`獲得 ${inst.name}！`, 'skill');
                        }
                    }
                    break;

                // --- ADDITIONAL STATUS EFFECTS ---
                case 'self_stun_buff': // 王世堅情-從從容容
                    attacker.statusEffects.push({ type: 'stun', name: '暈眩', turns: effect.stun });
                    attacker.atk += effect.atk;
                    attacker.hp = Math.min(attacker.maxHp, attacker.hp + effect.heal);
                    GameState.addLog(`${attacker.name} 暈眩 ${effect.stun} 回合，ATK +${effect.atk}, HP +${effect.heal}`, 'skill');
                    break;
                case 'self_stun_delayed_buff': // 伽利略-軟禁
                    attacker.statusEffects.push({ type: 'stun', name: '軟禁', turns: effect.stun });
                    attacker.statusEffects.push({ type: 'delayed_buff', name: '軟禁增益', hp: effect.hp, atk: effect.atk, triggersAfter: effect.stun });
                    GameState.addLog(`${attacker.name} 軟禁自己 ${effect.stun} 回合`, 'skill');
                    break;
                case 'self_sleep_buff': // Ray生我夢-夢
                    attacker.statusEffects.push({ type: 'sleep', name: '睡眠', turns: 99 });
                    attacker.atk = Math.floor(attacker.atk * effect.atk_mult);
                    GameState.addLog(`${attacker.name} 進入睡眠，ATK ×${effect.atk_mult}`, 'skill');
                    break;
                case 'silence_conditional': // 沒錢-爛命一條
                    if (defender.hp > attacker.hp) {
                        defender.statusEffects.push({ type: 'silence', name: '沉默', turns: effect.turns });
                        GameState.addLog(`${defender.name} 被沉默 ${effect.turns} 回合`, 'status');
                    } else {
                        GameState.addLog('對方血量不夠高，效果無效', 'status');
                    }
                    break;
                case 'damage_reduction_flat': // 小圓盾-硬
                    attacker.statusEffects.push({ type: 'damage_reduction_flat', name: '減傷', value: effect.value, turns: effect.turns });
                    GameState.addLog(`${attacker.name} 下回合受傷減少 ${effect.value}`, 'skill');
                    break;
                case 'damage_reduction_chance': // 扁彿俠-高科技
                    if (await Animations.probabilityRoll(effect.chance, '減傷判定')) {
                        attacker.statusEffects.push({ type: 'damage_reduction', name: '減傷', value: effect.value, hits: effect.hits });
                        GameState.addLog(`${attacker.name} 獲得 ${effect.value}% 減傷`, 'skill');
                    } else {
                        GameState.addLog('減傷失敗', 'status');
                    }
                    break;
                case 'convert_damage_to_max_hp': // 燒杯-燒啊
                    attacker.statusEffects.push({ type: 'convert_damage_to_max_hp', name: '轉化', hits: effect.hits || 1 });
                    GameState.addLog(`${attacker.name} 下次受到的傷害將轉化為血量上限`, 'skill');
                    break;
                case 'convert_damage_to_max_hp_immune': // 英國紳士-功夫茶
                    attacker.statusEffects.push({ type: 'convert_damage_to_max_hp_immune', name: '功夫茶', percent: effect.percent, hits: effect.hits || 1 });
                    GameState.addLog(`${attacker.name} 下次受傷免疫並轉化 ${effect.percent}% 為血量上限`, 'skill');
                    break;
                case 'swap_stats_stun': // 輪胎-英國紳士
                    const tempHp = defender.hp;
                    const tempAtk = defender.atk;
                    defender.hp = tempAtk;
                    defender.maxHp = tempAtk;
                    defender.atk = tempHp;
                    defender.statusEffects.push({ type: 'stun', name: '暈眩', turns: effect.stun_turns });
                    GameState.addLog(`${defender.name} 血量與攻擊力交換並暈眩 ${effect.stun_turns} 回合`, 'status');
                    break;
                case 'dodge_buff_atk': // 金星-金
                    attacker.statusEffects.push({ type: 'dodge', name: '閃避', chance: effect.dodge_chance, hits: 1 });
                    attacker.atk += effect.atk;
                    GameState.addLog(`${attacker.name} 獲得 ${effect.dodge_chance}% 閃避，ATK +${effect.atk}`, 'skill');
                    break;
                case 'dodge_chance': // 67!-迷因
                    if (await Animations.probabilityRoll(effect.chance, '閃避判定')) {
                        attacker.statusEffects.push({ type: 'dodge', name: '閃避', chance: 100, hits: effect.hits || 1 });
                        GameState.addLog(`${attacker.name} 獲得閃避效果`, 'skill');
                    } else {
                        GameState.addLog('閃避判定失敗', 'status');
                    }
                    break;
                case 'force_basic_attack': // 烏龍茶-烏龍
                    if (await Animations.probabilityRoll(effect.chance, '效果判定')) {
                        defender.statusEffects.push({ type: 'force_basic', name: '只能普攻', turns: 1 });
                        GameState.addLog(`${defender.name} 下次只能普攻`, 'status');
                    } else {
                        GameState.addLog('效果未觸發', 'status');
                    }
                    break;

                // --- ADDITIONAL SUMMON EFFECTS ---
                case 'summon_damage': // 怕瘦團-月亮好小
                    const summonCatChar = getRandomFromCategory(effect.category);
                    if (summonCatChar) {
                        const inst = createCharacterInstance(summonCatChar);
                        GameState.addToStandby(GameState.currentPlayer === 1 ? 'player1' : 'player2', inst);
                        GameState.addLog(`獲得 ${inst.name}！`, 'skill');
                        await Animations.drawCards([inst]);
                    }
                    await this.applyDamage(attacker, defender, effect.damage);
                case 'buff_next_attack': // 狗狗肉摩托車-音樂, 講晚安-薯條
                    attacker.nextAttackMult = effect.value;
                    attacker.statusEffects.push({ type: 'buff_next', name: '下次傷害加成', turns: -1, value: effect.value });
                    GameState.addLog(`${attacker.name} 下次攻擊傷害 +${effect.value}%`, 'skill');
                    break;
                case 'special_damage_formula': // 草東街-去炫耀吧
                    attacker.atk = Math.max(0, attacker.atk - 20);
                    const formulaDamage = 20 + defender.atk * GameState.turnCount * 0.1;
                    await this.applyDamage(attacker, defender, Math.floor(formulaDamage));
                    GameState.addLog(`${attacker.name} 降低攻擊並造成 ${Math.floor(formulaDamage)} 傷害`, 'skill');
                    break;
                case 'summon': // 皇家騎士, 李白, 婕媞
                    const summonTarget = getCharacterByName(effect.target);
                    if (summonTarget) {
                        const inst = createCharacterInstance(summonTarget);
                        GameState.addToStandby(GameState.currentPlayer === 1 ? 'player1' : 'player2', inst);
                        GameState.addLog(`召喚了 ${inst.name}！`, 'skill');
                        await Animations.drawCards([inst]);
                    }
                    break;
                case 'summon_multiple': // 奧本海默-質能守恆
                    const summonsList = [];
                    for (let i = 0; i < effect.count; i++) {
                        const t = getCharacterByName(effect.target);
                        if (t) {
                            const inst = createCharacterInstance(t);
                            GameState.addToStandby(GameState.currentPlayer === 1 ? 'player1' : 'player2', inst);
                            summonsList.push(inst);
                        }
                    }
                    if (summonsList.length > 0) {
                        GameState.addLog(`召喚了 ${summonsList.length} 個 ${effect.target}！`, 'skill');
                        await Animations.drawCards(summonsList);
                    }
                    break;
                case 'damage_scaling_chance': // 二肆八六, 婕媞
                    // Check logic: base_chance + (uses * increment)
                    const uses = attacker.resources?.skill_chance || 0; // stored in resource usually, or custom tracker
                    // For 二肆八六, uses start at 1? No 0. But effect says "every use +5%".
                    // The resource in character data is "skill_chance".
                    // Wait, character data logic for 二肆八六: resources: { skill_chance: 1 } (base chance?)
                    // Description: "1% base, +5% per use".
                    // Let's assume resource tracks the *current chance* or *bonus*.
                    // If we track 'count', we can calc chance.
                    // Let's look at character data again. 二肆八六 resources: { skill_chance: 1 }.
                    // 婕媞 resources: { skill_chance: 5 }.
                    // It seems the resource stores the CURRENT chance. Use and update.

                    const currentChance = attacker.resources.skill_chance || effect.base_chance;
                    if (await Animations.probabilityRoll(currentChance, '技能判成')) {
                        await this.applyDamage(attacker, defender, effect.damage);
                    } else {
                        GameState.addLog('技能發動失敗', 'status');
                    }
                    // Update resource
                    attacker.resources.skill_chance = currentChance + effect.increment;
                    GameState.addLog(`技能機率提升至 ${attacker.resources.skill_chance}%`, 'status');
                    break;
                case 'buff_max_hp_double_damage': // 王欸等-大跳
                    attacker.maxHp += effect.hp;
                    attacker.hp += effect.hp;
                    // "Next time both sides take double damage"
                    // Implement as a global state or status effect on both?
                    // Let's put a status on both.
                    [attacker, defender].forEach(c => {
                        c.statusEffects.push({ type: 'double_damage_taken', name: '易傷', turns: 1, hits: 1 });
                    });
                    GameState.addLog(`${attacker.name} 血量增加，且雙方下次受到傷害翻倍！`, 'skill');
                    // Need to handle 'double_damage_taken' in applyDamage (modifier)
                    // Added to Todo or inject here? I'll assume standard damage calculation doesn't have it yet.
                    // I'll add "extra_damage_taken" support in applyDamage previously, but "double" is multiplier.
                    // I will check applyDamage again if I can fit it or if I need to quick patch.
                    // Since I already edited applyDamage, I might need one more edit for 'double_damage_taken' if I missed it.
                    // Wait, I can simulate double damage by modify incoming damage in applyDamage?
                    // Actually, easy fix: Modify applyDamage to check 'double_damage_taken'.
                    break;
                case 'burn_permanent': // 水星-很近
                    defender.statusEffects.push({
                        type: 'burn',
                        name: '永久燃燒',
                        damage: effect.damage,
                        turns: -1,
                        permanent: true
                    });
                    GameState.addLog(`${defender.name} 被永久燃燒！`, 'status');
                    break;
                case 'trade_hp_atk_damage': // E人-哈哈
                    attacker.hp -= effect.hp_loss;
                    attacker.atk += effect.atk_gain;
                    await this.applyDamage(attacker, defender, effect.damage);
                    GameState.addLog(`${attacker.name} 犧牲 HP 換取攻擊並造成傷害`, 'skill');
                    break;
                case 'damage_resource_mult': // 比二蓋紙-錢錢
                    const resMultVal = (attacker.resources[effect.resource] || 0) * effect.mult;
                    await this.applyDamage(attacker, defender, resMultVal);
                    break;
                case 'debuff_dodge_zero': // 檸檬紅茶-福利
                    // Set dodge to 0 (how? Status effect that sets dodge to 0 or reduces it by 100?)
                    defender.statusEffects.push({ type: 'dodge_zero', name: '無法閃避', turns: 1 });
                    GameState.addLog(`${defender.name} 本回合無法閃避`, 'status');
                    // Need to check this in getDodgeChance
                    break;
                case 'force_basic_attack': // 烏龍茶-烏龍
                    if (await Animations.probabilityRoll(effect.chance, '強制普攻判定')) {
                        defender.statusEffects.push({ type: 'silence', name: '只能普攻', turns: 1 });
                        // Silence effectively forces basic attack if AI/Player checks it.
                        // But we need to ensure "next attack" is basic. Silence usually prevents Skill button.
                        GameState.addLog(`${defender.name} 下回合只能普攻`, 'status');
                    }
                    break;
                case 'heal_random': // 骰子怪獸
                    const healRnd = Math.floor(Math.random() * (effect.max - effect.min + 1)) + effect.min;
                    attacker.hp = Math.min(attacker.maxHp, attacker.hp + healRnd);
                    GameState.addLog(`${attacker.name} 恢復(或扣除) ${healRnd} HP`, 'heal');
                    break;
                case 'buff_max_hp_enemy_percent': // 吸血鬼
                    const vampAmount = Math.floor(defender.maxHp * effect.percent / 100);
                    attacker.maxHp += vampAmount;
                    attacker.hp += vampAmount;
                    GameState.addLog(`${attacker.name} 吸取血量上限 +${vampAmount}`, 'skill');
                    break;
                case 'buff_chance': // 豬自清
                    if (await Animations.probabilityRoll(effect.chance, '吃橘子判定')) {
                        attacker.maxHp += effect.success.max_hp;
                        attacker.hp += effect.success.max_hp; // Heal max hp amount too? usually yes
                        attacker.atk += effect.success.atk;
                        attacker.resources['oranges'] = (attacker.resources['oranges'] || 0) + 1;
                        // Check passive trigger for oranges
                        if (attacker.passive?.effect?.resource === 'oranges' && attacker.resources['oranges'] % attacker.passive.effect.count === 0) {
                            attacker.hp += attacker.passive.effect.hp;
                            attacker.atk += attacker.passive.effect.atk;
                            GameState.addLog('橘子被動觸發！', 'skill');
                        }
                        GameState.addLog(`${attacker.name} 吃到橘子！`, 'skill');
                    } else {
                        attacker.atk += effect.fail.atk;
                        GameState.addLog(`${attacker.name} 沒吃到橘子`, 'status');
                    }
                    break;
                case 'damage_current_hp_percent': // 木星, 太陽
                    // Damage based on Attacker's current HP or Defender's? Usually Attacker for "造成hp*50%".
                    // Unless specified "current hp percent damage" (usually % of current HP).
                    // Checking characters: 木星 "造成當前hp*25%". Usually means SELF hp.
                    // 橡皮擦 "造成(剩餘血量*30%)". Usually means Target's remaining hp.
                    // Let's assume standardized: "damage_current_hp_percent" uses Attacker HP by default?
                    // Wait, 橡皮擦 description "斬殺...造成剩餘血量30%". That sounds like Enemy HP.
                    // 木星 "宙斯...造成當前hp*25%". Sounds like Self HP damage scaling.
                    // Ambiguous type name. Let's look at data. 
                    // 木星 effect: { type: 'damage_current_hp_percent', value: 25 }
                    // 橡皮擦 effect: { type: 'damage_current_hp_percent', value: 30 }
                    // If type is same, logic must be same. Let's assume based on ATTACKER HP for now (like collision damage).
                    // Or wait, "斬殺" (Execute) usually implies Enemy HP. 
                    // Let's compromise or use context. If "execute", enemy. If "body slam", self.
                    // Given the type name `damage_current_hp_percent`, i'll assume Attacker.
                    // But for `橡皮擦` it might be wrong.
                    // Actually, if I look at `Pokemon` or similar style, usually it's own HP.
                    // Let's implement as Self HP for now. 
                    // If I want to support Enemy HP, use `damage_enemy_current_hp_percent`.
                    // I will assume Self for this type.
                    const hpDmg = Math.floor(attacker.hp * effect.value / 100);
                    await this.applyDamage(attacker, defender, hpDmg);
                    break;
                case 'steal_card': // 小偷
                    // Steal from opponent standby.
                    const oppKey = GameState.currentPlayer === 1 ? 'player2' : 'player1';
                    const oppStandby = GameState[oppKey].standbyCards;
                    if (oppStandby.length > 0) {
                        const stolenIndex = Math.floor(Math.random() * oppStandby.length);
                        const stolenCard = oppStandby.splice(stolenIndex, 1)[0];
                        GameState.addToStandby(GameState.currentPlayer === 1 ? 'player1' : 'player2', stolenCard);
                        GameState.addLog(`${attacker.name} 偷走了 ${stolenCard.name}！`, 'skill');
                    } else {
                        GameState.addLog('沒有牌可以偷', 'status');
                    }
                    break;

                    if (await Animations.probabilityRoll(effect.chance, '召喚判定')) {
                        const motoChar = getRandomFromCategory(effect.category);
                        if (motoChar) {
                            const inst = createCharacterInstance(motoChar);
                            GameState.addToStandby(GameState.currentPlayer === 1 ? 'player1' : 'player2', inst);
                            GameState.addLog(`召喚了 ${inst.name}！`, 'skill');
                            await Animations.drawCards([inst]);
                        }
                    } else {
                        GameState.addLog('召喚失敗', 'status');
                    }
                    break;
                case 'suicide_summon_multiple': // 莫那魯道-上吊
                    attacker.hp = 0;
                    GameState.addLog(`${attacker.name} 犧牲了自己！`, 'status');
                    const summons = [];
                    for (let i = 0; i < effect.count; i++) {
                        const targetChar = getCharacterByName(effect.target);
                        if (targetChar) {
                            const inst = createCharacterInstance(targetChar);
                            GameState.addToStandby(GameState.currentPlayer === 1 ? 'player1' : 'player2', inst);
                            summons.push(inst);
                        }
                    }
                    if (summons.length > 0) {
                        GameState.addLog(`召喚了 ${summons.length} 個 ${effect.target}！`, 'skill');
                        await Animations.drawCards(summons);
                    }
                    break;
                case 'self_damage_draw': // Ray生我夢-我要選布
                    attacker.hp -= effect.damage;
                    GameState.addLog(`${attacker.name} 對自己造成 ${effect.damage} 傷害`, 'damage');
                    const drawnCards = [];
                    for (let i = 0; i < effect.count; i++) {
                        const drChar = drawRandomCharacter();
                        if (drChar) {
                            const inst = createCharacterInstance(drChar);
                            GameState.addToStandby(GameState.currentPlayer === 1 ? 'player1' : 'player2', inst);
                            drawnCards.push(inst);
                        }
                    }
                    if (drawnCards.length > 0) {
                        GameState.addLog(`抽到 ${drawnCards.map(c => c.name).join(', ')}`, 'skill');
                        await Animations.drawCards(drawnCards);
                    }
                    break;
                case 'summon_random_ball': // 體育生-運動時間
                    if (Math.random() < 0.5) {
                        const ballChar = getRandomFromCategory('ball');
                        if (ballChar) {
                            const inst = createCharacterInstance(ballChar);
                            GameState.addToStandby(GameState.currentPlayer === 1 ? 'player1' : 'player2', inst);
                            GameState.addLog(`召喚了 ${inst.name}！`, 'skill');
                            await Animations.drawCards([inst]);
                        }
                    } else {
                        GameState.addLog('召喚失敗', 'status');
                    }
                    break;
                case 'draw_bonus_mythic': // 神話-抽一張
                    const drChar = drawRandomCharacter();
                    if (drChar) {
                        const inst = createCharacterInstance(drChar);
                        GameState.addToStandby(GameState.currentPlayer === 1 ? 'player1' : 'player2', inst);
                        GameState.addLog(`抽到 ${inst.name}！`, 'skill');
                        await Animations.drawCards([inst]);
                        if (drChar.rarity === 'MYTHIC') {
                            const bonusChar = drawRandomCharacter();
                            if (bonusChar) {
                                const bonusInst = createCharacterInstance(bonusChar);
                                GameState.addToStandby(GameState.currentPlayer === 1 ? 'player1' : 'player2', bonusInst);
                                GameState.addLog(`神話牌！額外抽到 ${bonusInst.name}！`, 'skill');
                                await Animations.drawCards([bonusInst]);
                            }
                        }
                    }
                    break;

                // --- RESOURCE-BASED SKILLS ---
                case 'add_resource_shield': // 奧本海默-高階開發
                    attacker.resources[effect.resource] = (attacker.resources[effect.resource] || 0) + effect.value;
                    attacker.shield += effect.shield;
                    GameState.addLog(`${effect.resource} +${effect.value}，護盾 +${effect.shield}`, 'skill');
                    break;
                case 'spend_resource_damage': // 小米-發佈
                    if ((attacker.resources[effect.resource] || 0) >= effect.cost) {
                        attacker.resources[effect.resource] -= effect.cost;
                        await this.applyDamage(attacker, defender, effect.damage);
                    } else {
                        GameState.addLog(`${effect.resource} 不足`, 'status');
                    }
                    break;
                case 'spend_all_resource_damage': // 小米-雷軍
                    const resAmount = attacker.resources[effect.resource] || 0;
                    attacker.resources[effect.resource] = 0;
                    if (resAmount > 0) {
                        await this.applyDamage(attacker, defender, resAmount * effect.mult);
                    } else {
                        GameState.addLog(`沒有 ${effect.resource}`, 'status');
                    }
                    break;
                case 'spend_resource_execute': // 賈伯斯-愛瘋
                    if ((attacker.resources[effect.resource] || 0) >= effect.cost) {
                        attacker.resources[effect.resource] -= effect.cost;
                        if (await Animations.probabilityRoll(effect.chance, '擊殺判定')) {
                            defender.hp = 0;
                            GameState.addLog(`${defender.name} 被直接擊殺！`, 'damage');
                        } else {
                            GameState.addLog('擊殺失敗', 'status');
                        }
                    } else {
                        GameState.addLog(`蘋果不足`, 'status');
                    }
                    break;
                case 'spend_resource_summon': // 賈伯斯-輟學
                    if ((attacker.resources[effect.resource] || 0) >= effect.cost) {
                        attacker.resources[effect.resource] -= effect.cost;
                        const ch = getCharacterByName(effect.target);
                        if (ch) {
                            const inst = createCharacterInstance(ch);
                            GameState.addToStandby(GameState.currentPlayer === 1 ? 'player1' : 'player2', inst);
                            GameState.addLog(`召喚了 ${inst.name}！`, 'skill');
                            await Animations.drawCards([inst]);
                        }
                    } else {
                        GameState.addLog(`蘋果不足`, 'status');
                    }
                    break;
                case 'spend_resource_evolve': // 賈伯斯-創業
                    if ((attacker.resources[effect.resource] || 0) >= effect.cost) {
                        const leftoverApples = attacker.resources[effect.resource] - effect.cost;
                        await this.evolveCharacter(attacker, effect.target, { leftoverApples });
                    } else {
                        GameState.addLog(`蘋果不足`, 'status');
                    }
                    break;
                case 'execute_chance': // 賈伯斯max-創意
                    if (await Animations.probabilityRoll(effect.chance, '擊殺判定')) {
                        defender.hp = 0;
                        GameState.addLog(`${defender.name} 被直接擊殺！`, 'damage');
                    } else {
                        GameState.addLog('擊殺失敗', 'status');
                    }
                    break;
                case 'conditional_plan_effect': // 奧本海默-死神
                    const plan = attacker.resources?.plan || 0;
                    const hasNuke = attacker.resources?.has_nuke;
                    let baseDamage = 0;
                    if (plan < 3) {
                        baseDamage = 80;
                    } else if (plan <= 6) {
                        attacker.hp = Math.min(attacker.maxHp, attacker.hp + 30);
                        baseDamage = 60;
                        GameState.addLog(`${attacker.name} 恢復 30 HP`, 'heal');
                    } else {
                        attacker.shield += 50;
                        baseDamage = 80;
                        GameState.addLog(`${attacker.name} 獲得 50 護盾`, 'skill');
                    }
                    if (hasNuke) baseDamage += 50;
                    await this.applyDamage(attacker, defender, baseDamage);
                    break;
                case 'conditional_turn': // Peter-一階/二階
                    const specialCount = attacker.resources?.special_count || 0;
                    if (specialCount >= effect.min_turn) {
                        if (effect.heal) attacker.hp = Math.min(attacker.maxHp, attacker.hp + effect.heal);
                        if (effect.atk) attacker.atk += effect.atk;
                        if (effect.damage) await this.applyDamage(attacker, defender, effect.damage);
                        GameState.addLog(`技能條件達成！`, 'skill');
                    } else {
                        GameState.addLog(`需要特選 ${effect.min_turn} 次，目前 ${specialCount} 次`, 'status');
                    }
                    break;
                case 'evolve_conditional_turn': // Peter-正取
                    const sc = attacker.resources?.special_count || 0;
                    if (sc >= effect.min_turn) {
                        await this.evolveCharacter(attacker, effect.target);
                    } else {
                        GameState.addLog(`需要特選 ${effect.min_turn} 次，目前 ${sc} 次`, 'status');
                    }
                    break;

                // --- RANDOM BUFF (史詩-史詩) ---
                case 'random_buff':
                    const buffRoll = Math.floor(Math.random() * 4);
                    switch (buffRoll) {
                        case 0:
                            attacker.atk += 20;
                            GameState.addLog('獲得攻擊：ATK +20', 'skill');
                            break;
                        case 1:
                            attacker.hp = Math.min(attacker.maxHp, attacker.hp + 50);
                            GameState.addLog('獲得血量：HP +50', 'heal');
                            break;
                        case 2:
                            await this.applyDamage(attacker, defender, attacker.atk);
                            GameState.addLog('獲得666：額外攻擊一次', 'skill');
                            break;
                        case 3:
                            const suibian = getCharacterByName('隨便你');
                            if (suibian) {
                                const inst = createCharacterInstance(suibian);
                                GameState.addToStandby(GameState.currentPlayer === 1 ? 'player1' : 'player2', inst);
                                GameState.addLog('獲得隨便你：召喚了隨便你', 'skill');
                                await Animations.drawCards([inst]);
                            }
                            break;
                    }
                    break;

                case 'self_damage': // 阿共-阿共的陰謀
                    attacker.hp -= effect.value;
                    GameState.addLog(`${attacker.name} 對自己造成 ${effect.value} 傷害`, 'damage');
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
    },

    // Evolve character to a new form
    async evolveCharacter(card, targetName, options = {}) {
        const targetData = getCharacterByName(targetName);
        if (!targetData) {
            GameState.addLog(`進化失敗：找不到 ${targetName}`, 'status');
            return false;
        }

        const oldName = card.name;
        const oldHp = card.hp;
        const oldAtk = card.atk;
        const oldResources = { ...card.resources };

        // Transform card
        card.name = targetData.name;
        card.maxHp = targetData.hp;
        card.hp = Math.min(targetData.hp, oldHp);
        card.atk = targetData.atk;
        card.skills = JSON.parse(JSON.stringify(targetData.skills || []));
        card.passive = targetData.passive ? JSON.parse(JSON.stringify(targetData.passive)) : null;

        // Reset cooldowns
        card.cooldowns = {};
        card.skills.forEach((_, i) => card.cooldowns[i] = 0);

        // Special handling for specific evolutions
        if (targetName === '賈伯斯max' && options.leftoverApples) {
            card.maxHp += options.leftoverApples * 30;
            card.hp += options.leftoverApples * 30;
            GameState.addLog(`剩餘蘋果增加 ${options.leftoverApples * 30} 血量上限！`, 'skill');
        }

        if (targetName === '拳王') {
            card.resources.crit_rate = oldResources.crit_rate || 60;
            card.resources.crit_mult = oldResources.crit_mult || 2.5;
        }

        if (targetName === 'Peter pro') {
            card.resources.special_count = oldResources.special_count || 0;
        }

        GameState.addLog(`${oldName} 進化為 ${targetName}！`, 'skill');
        return true;
    }
};
