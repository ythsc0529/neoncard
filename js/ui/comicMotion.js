/* Visual-only motion. Never consumes the seeded gameplay RNG. */
(function (global) {
    class ComicTimeline {
        constructor() { this.timers = new Set(); this.cancelled = false; }
        after(delay, callback) {
            if (this.cancelled) return;
            const timer = setTimeout(() => {
                this.timers.delete(timer);
                if (!this.cancelled) callback();
            }, delay);
            this.timers.add(timer);
            return timer;
        }
        cancel() {
            this.cancelled = true;
            this.timers.forEach(clearTimeout);
            this.timers.clear();
        }
    }

    const text = (tag, className, value) => {
        const el = document.createElement(tag);
        el.className = className;
        el.textContent = value;
        return el;
    };
    const classifySkill = (skill) => {
        const types = (skill?.effects || (skill?.effect ? [skill.effect] : [])).map(e => e.type || '').join(' ');
        if (/^(buff|debuff)/.test(types)) return 'power';
        if (/silence|stun|poison|burn|freeze|sleep/.test(types)) return 'control';
        if (/damage|attack|kill|drain|lifesteal/.test(types)) return 'strike';
        if (/heal|revive/.test(types)) return 'heal';
        if (/shield|immune|immunity|defense|reduction/.test(types)) return 'guard';
        if (/summon|draw|clone/.test(types)) return 'summon';
        return 'power';
    };

    let queue = Promise.resolve();
    async function performCombat({ attacker, defender, skill, kind = 'attack', source, target }) {
        const style = kind === 'attack' ? 'strike' : classifySkill(skill);
        const layer = document.createElement('div');
        layer.className = `ink-combat ink-combat--${style}${kind === 'skill' ? ' is-skill' : ''}`;
        layer.setAttribute('aria-hidden', 'true');
        const banner = document.createElement('div');
        banner.className = 'ink-combat-banner';
        banner.append(text('small', '', kind === 'attack' ? 'ACTION / 普通攻擊' : 'SPECIAL / 技能發動'));
        banner.append(text('strong', '', skill?.name || '正面突破'));
        banner.append(text('span', '', `${attacker?.name || '角色'} ${kind === 'attack' ? '出擊！' : '發動技能！'}`));
        layer.append(banner);
        const focal = style === 'strike' ? target : source;
        const rect = focal?.getBoundingClientRect();
        if (rect && rect.width && rect.height) {
            layer.style.setProperty('--impact-x', `${Math.min(innerWidth - 50, Math.max(50, rect.left + rect.width / 2))}px`);
            layer.style.setProperty('--impact-y', `${Math.min(innerHeight - 80, Math.max(80, rect.top + rect.height / 2))}px`);
        }
        const impact = document.createElement('div');
        impact.className = 'ink-combat-impact';
        const words = { strike: 'ズバッ!', heal: '恢復!', guard: '守護!', summon: '登場!', power: '覺醒!', control: '封鎖!' };
        impact.append(text('b', 'ink-combat-word', words[style]));
        for (let i = 0; i < 3; i++) {
            const slash = document.createElement('i');
            slash.style.setProperty('--i', i);
            impact.append(slash);
        }
        layer.append(impact);
        const animations = [];
        const duration = kind === 'attack' ? 1050 : 1550;
        try {
            document.body.append(layer);
            if (source?.animate) {
                const from = source.getBoundingClientRect();
                const to = target?.getBoundingClientRect();
                const dx = style === 'strike' && to ? Math.sign(to.left - from.left) * 24 : 0;
                animations.push(source.animate([
                    { transform: 'translate(0,0)' },
                    { transform: `translate(${-dx / 3}px,5px) rotate(-2deg)`, offset: .25 },
                    { transform: `translate(${dx}px,-8px) rotate(2deg)`, offset: .58 },
                    { transform: 'translate(0,0)' }
                ], { duration: 650, delay: kind === 'attack' ? 130 : 520, easing: 'cubic-bezier(.2,.8,.2,1)' }));
            }
            // This is the wind-up. Damage/heal feedback remains tied to the resolved effect.
            await new Promise(resolve => setTimeout(resolve, duration));
        } finally {
            animations.forEach(animation => animation.cancel());
            layer.remove();
        }
    }
    global.ComicMotion = {
        Timeline: ComicTimeline, classifySkill,
        combat(options) {
            const run = () => performCombat(options).catch(error => console.warn('[Comic motion]', error));
            queue = queue.then(run, run);
            return queue;
        }
    };
})(window);
