/** Decisions shared by Hell practice and matchmaking fallback opponents. */
const NpcAI = (() => {
    const attack = card => typeof card?.atk === 'number' ? Math.max(0, card.atk) : 0;
    const health = card => Math.max(0, card?.hp || 0) + Math.max(0, card?.shield || 0);

    function cardScore(card) {
        if (!card || card.hp <= 0) return -Infinity;
        const usefulSkills = (card.skills || []).filter(skill => skill?.effect).length;
        return health(card) + attack(card) * 7 + usefulSkills * 18;
    }

    function bestCardIndex(cards) {
        return cards.reduce((best, card, index) => cardScore(card) > cardScore(cards[best]) ? index : best, 0);
    }

    function skillValue(skill, card, opponent) {
        const effect = skill.effect || {};
        const type = effect.type || '';
        const value = Number(effect.value) || 0;
        const enemyHealth = health(opponent);
        const missingHp = Math.max(0, (card.maxHp || card.hp) - card.hp);
        let damage = 0;
        let score = 0;

        if (type === 'damage') damage = value;
        else if (type === 'damage_enemy_atk_mult') damage = attack(opponent) * (Number(effect.mult) || 1);
        else if (type === 'dice_damage') damage = enemyHealth * (Number(effect.value) || 0) / 100 * 0.33;
        else if (/damage|attack/.test(type)) damage = value || attack(card) * 1.25;

        if (damage > 0) score = damage;
        else if (/heal|recover|restore/.test(type)) score = Math.min(missingHp, value || 50) * 0.9;
        else if (/shield|defen|reduction|invincible|dodge|reflect/.test(type)) score = (card.hp / card.maxHp < 0.65 ? 58 : 22) + Math.min(value, 60) * 0.35;
        else if (/stun|sleep|silence|poison|burn|debuff|weaken/.test(type)) score = 48;
        else if (/summon|draw|copy|evolv|transform/.test(type)) score = 42;
        else score = 30;

        // An immediately winning move is always preferable to a setup move.
        if (damage >= enemyHealth && enemyHealth > 0) score += 10000;
        return score;
    }

    function chooseAction(card, opponent, standbyCards, availableSkills) {
        const canAttack = card.passive?.effect?.action !== 'no_attack_dot_revive';
        const enemyHealth = health(opponent);
        const basicDamage = canAttack ? attack(card) : 0;
        if (basicDamage >= enemyHealth && enemyHealth > 0) return { type: 'attack', index: null };

        let best = { type: 'attack', index: null, score: canAttack ? basicDamage : -Infinity };
        for (const index of availableSkills) {
            const score = skillValue(card.skills[index], card, opponent);
            if (score > best.score) best = { type: 'skill', index, score };
        }

        const standbyIndex = standbyCards.length ? bestCardIndex(standbyCards) : -1;
        const healthyStandby = standbyIndex >= 0 && standbyCards[standbyIndex].hp / standbyCards[standbyIndex].maxHp > 0.45;
        const inDanger = card.hp / card.maxHp < 0.3 || (card.hp <= attack(opponent) && card.hp / card.maxHp < 0.55);
        if (healthyStandby && inDanger && best.score < 10000 && cardScore(standbyCards[standbyIndex]) > cardScore(card) * 0.75) {
            return { type: 'retreat', index: standbyIndex };
        }
        return { type: best.type, index: best.index };
    }

    return { cardScore, bestCardIndex, chooseAction };
})();

window.NpcAI = NpcAI;
