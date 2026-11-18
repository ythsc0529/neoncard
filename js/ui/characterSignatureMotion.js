/* Character-specific comic storyboards. The shared player only handles timing. */
(function (global) {
    const motion = global.SignatureMotion;
    if (!motion) return;
    const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const scene = (duration, markup) => ({ character: true, duration, cues: [[180, 1], [610, 2], [1150, 3]], markup });
    Object.assign(motion.scenes, {
        motorcycle: scene(1650, d => `<div class="cs-road"></div><div class="cs-bike"><i></i><b></b><i></i></div><div class="cs-ramp"></div><div class="cs-skid">甩尾！</div><div class="cs-result">${e(d.name || '摩托車')}</div>`),
        robotParts: scene(1650, d => `<div class="cs-conveyor"></div><div class="cs-part p1">I</div><div class="cs-part p2">II</div><div class="cs-part p3">III</div><div class="cs-press">▼</div><div class="cs-result">${e(d.name || '機器人')} 出廠</div>`),
        ball: scene(1650, d => `<div class="cs-court"></div><div class="cs-bounce b1"></div><div class="cs-bounce b2"></div><div class="cs-ball"></div><div class="cs-hoop">◎</div><div class="cs-result">${e(d.name || '球類')} 入場！</div>`),
        tea: scene(1650, d => `<div class="cs-leaves">❧ ❧ ❧</div><div class="cs-kettle">♨</div><div class="cs-stream"></div><div class="cs-cup">▰</div><div class="cs-result">${e(d.name || '茶類')} 沖泡完成</div>`),
        planetDeath: scene(1650, d => `<div class="cs-void"></div><div class="cs-fallen">${e(d.from)}</div><div class="cs-orbit">◌</div><div class="cs-newplanet">✦</div><div class="cs-result">${e(d.name)}・星軌繼承</div>`),
        basketball: scene(1650, d => `<div class="cs-court"></div><div class="cs-player">堯冥</div><div class="cs-basketball"></div><div class="cs-backboard">▣</div><div class="cs-net">╲╱</div><div class="cs-result">${e(d.name || '籃球')}！灌籃召喚</div>`),
        photocopy: scene(1650, d => `<div class="cs-original">${e(d.name || '對手卡牌')}</div><div class="cs-scanner"></div><div class="cs-light"></div><div class="cs-sheet">COPY</div><div class="cs-result">複印完成・${e(d.name)}</div>`),
        snooker: scene(1650, d => `<div class="cs-felt"></div><div class="cs-cue"></div><div class="cs-cueball"></div><div class="cs-poolball">147</div><div class="cs-pocket"></div><div class="cs-result">撞球・進袋！</div>`),
        heroShop: scene(1650, d => `<div class="cs-shop-awning">商店</div><div class="cs-shop-shelf">劍　盾　鞋</div><div class="cs-shop-hand">✋</div><div class="cs-shop-item">${e(d.name)}</div><div class="cs-result">勇者取得 ${e(d.name)}</div>`),
        heroSword: scene(1650, () => `<div class="cs-forge">▰</div><div class="cs-hammer">⚒</div><div class="cs-sword">⚔</div><div class="cs-sparks">✦ ✦ ✦</div><div class="cs-result">鍛鍊・劍化為攻擊力</div>`),
        heroShield: scene(1650, () => `<div class="cs-shield-wall">⬡</div><div class="cs-impact">💥</div><div class="cs-heal-ring">+</div><div class="cs-result">防禦・護盾與恢復</div>`),
        heroShoes: scene(1650, () => `<div class="cs-track"></div><div class="cs-foot one">◢</div><div class="cs-foot two">◢</div><div class="cs-afterimage">◢ ◢ ◢</div><div class="cs-result">跑步・閃避提升</div>`),
        demonCall: scene(1650, () => `<div class="cs-throne">♛</div><div class="cs-rift"></div><div class="cs-miasma m1">魔</div><div class="cs-miasma m2">穢</div><div class="cs-result">魔王的號召・魔穢現身</div>`),
        demonPeck: scene(1650, d => `<div class="cs-miasma-feed">魔穢 × ${e(d.count ?? '?')}</div><div class="cs-beak">◆</div><div class="cs-devour">吞！</div><div class="cs-health">+${e(d.heal ?? '?')} HP</div><div class="cs-result">啄食・生命回流</div>`),
        mady: scene(1650, () => `<div class="cs-clock">00:07</div><div class="cs-shot">➤</div><div class="cs-score">+20 ATK<br>+100 SHIELD</div><div class="cs-miss">失誤！</div><div class="cs-result">麥狄時刻</div>`),
        wounded: scene(1650, d => `<div class="cs-crack"></div><div class="cs-wound-counter">${e(d.count ?? 0)} / ${e(d.limit ?? 5)}</div><div class="cs-bandage">✚</div><div class="cs-breakout">突破！</div><div class="cs-result">受傷・${e(d.name || '突破累積')}</div>`),
        peak: scene(1650, () => `<div class="cs-ruins"></div><div class="cs-peak-figure">巔峰</div><div class="cs-aura"></div><div class="cs-power">ATK ↑　減傷 ↑</div><div class="cs-result">全盛時期・重返頂點</div>`),
        probabilityPassive: scene(1650, d => `<div class="cs-graph"></div><div class="cs-dice">${e(d.chance)}%</div><div class="cs-needle"></div><div class="cs-verdict">${d.fatal ? '死亡' : '存活'}</div><div class="cs-result">概率・生存判定</div>`),
        probabilityTheory: scene(1650, () => `<div class="cs-equation">P(A) = ?</div><div class="cs-chalk">✎</div><div class="cs-curve"></div><div class="cs-multiplier">ATK × 3</div><div class="cs-result">概率學概論</div>`),
        probabilityZero: scene(1650, () => `<div class="cs-grid"></div><div class="cs-zero">0</div><div class="cs-arrows">➤　➤　➤</div><div class="cs-barrier">⛨</div><div class="cs-result">概率為 0・效果無效</div>`),
        probabilityHundred: scene(1650, () => `<div class="cs-meter"></div><div class="cs-hundred">100</div><div class="cs-scissors">✂</div><div class="cs-half">ATK ÷ 2</div><div class="cs-result">概率為 100</div>`),
        injuryChain: scene(1650, d => `<div class="cs-torn t1">${e(d.from)}</div><div class="cs-torn t2">傷</div><div class="cs-stitch">╱╱╱</div><div class="cs-rise">${e(d.name)}</div><div class="cs-result">傷勢進化・${e(d.name)}</div>`),
        machineNest: scene(1650, d => `<div class="cs-hive">⬡</div><div class="cs-hive-gear">⚙</div><div class="cs-hive-belt"></div><div class="cs-hive-product">${e(d.name || '機器人')}</div><div class="cs-result">機器母巢・生產完成</div>`),
        ordinary: scene(1650, d => `<div class="cs-spotlight">${e(d.from || '對手')}</div><div class="cs-eraser">▰</div><div class="cs-blank">一般般</div><div class="cs-stamp">普通！</div><div class="cs-result">你也是很一般</div>`),
        brownian: scene(1650, () => `<div class="cs-grid"></div><div class="cs-molecule a">●</div><div class="cs-molecule b">●</div><div class="cs-molecule c">●</div><div class="cs-path">╱╲╱╲</div><div class="cs-result">布朗運動・隨機撞擊</div>`),
        alfred: scene(1650, () => `<div class="cs-signal">☎</div><div class="cs-wave w1"></div><div class="cs-wave w2"></div><div class="cs-reinforcement">扁佛狹</div><div class="cs-result">阿福・呼叫增援</div>`)
    });
    const originalCombat = motion.combat.bind(motion);
    const skillScenes = {
        '堯冥/打籃球': 'basketball',
        '勇者/鍛鍊': 'heroSword', '勇者/防禦': 'heroShield', '勇者/跑步': 'heroShoes',
        '麥狄/麥狄時刻': 'mady', '巔峰/全盛時期': 'peak',
        '概率學/概率學概論': 'probabilityTheory', '概率學/概率為0': 'probabilityZero', '概率學/概率為100': 'probabilityHundred',
        '愛因斯坦/布朗運動': 'brownian', '阿福/呼叫增援': 'alfred'
    };
    motion.combat = ({ attacker, skill }) => {
        const kind = skillScenes[`${attacker?.name}/${skill?.name}`];
        if (kind) return motion.preview(kind, { name: skill?.effect?.target });
        const effect = skill?.effect || {};
        if (attacker?.name === '機器母巢' && skill?.name === '生產') return null;
        if (effect.category === 'motorcycle' || /摩托車/.test(effect.target || '')) return null;
        return originalCombat({ attacker, skill });
    };
    motion.event = (kind, data) => motion.preview(kind, data);
})(window);
