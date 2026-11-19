/* Character-specific comic storyboards. The shared player only handles timing. */
(function (global) {
    const motion = global.SignatureMotion;
    if (!motion) return;
    const e = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    const scene = (duration, markup) => ({ character: true, duration: Math.max(duration, 2200), cues: [[220, 1], [800, 2], [1500, 3]], markup });
    Object.assign(motion.scenes, {
        motorcycle: scene(1650, d => `<div class="rd-moto-signal"><i></i><i></i><i></i></div><div class="rd-moto-gate">START</div><div class="rd-moto-street"></div><div class="rd-moto-bike"><span class="rd-moto-rider">●</span><b></b><i></i><i></i></div><div class="rd-moto-rip">破框衝刺！</div><div class="cs-result">${e(d.name || '摩托車')}・全速登場</div>`),
        robotParts: scene(1650, d => `<div class="cs-conveyor"></div><div class="cs-part p1">I</div><div class="cs-part p2">II</div><div class="cs-part p3">III</div><div class="cs-press">▼</div><div class="cs-product">${e(d.name || '機器人')}</div><div class="cs-result">${e(d.name || '機器人')} 出廠</div>`),
        ball: scene(1650, d => `<div class="cs-court"></div><div class="cs-bounce b1"></div><div class="cs-bounce b2"></div><div class="cs-ball"></div><div class="cs-hoop">◎</div><div class="cs-result">${e(d.name || '球類')} 入場！</div>`),
        tea: scene(1650, d => `<div class="cs-leaves">❧ ❧ ❧</div><div class="cs-kettle">♨</div><svg class="cs-pour" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M 68 38 C 60 45 52 47 50 61" /></svg><div class="cs-cup"><div class="cs-tea-fill"></div></div><div class="cs-result">${e(d.name || '茶類')} 沖泡完成</div>`),
        planetDeath: scene(1650, d => `<div class="rd-star-field"></div><div class="rd-old-world">${e(d.from || '舊星')}</div><div class="rd-world-crack">╱╲</div><div class="rd-star-seed">✦</div><div class="rd-comet-trail"></div><div class="rd-new-world">${e(d.name || '新星')}</div><div class="rd-orbit-caption">星之火種，交給你！</div><div class="cs-result">${e(d.name || '新星')}・星軌繼承</div>`),
        basketball: scene(1650, d => `<div class="cs-court"></div><div class="cs-player">堯冥</div><div class="cs-basketball"></div><div class="cs-backboard">▣</div><div class="cs-net">╲╱</div><div class="cs-swish">唰！</div><div class="cs-result">${e(d.name || '籃球')}！灌籃召喚</div>`),
        photocopy: scene(1650, d => `<div class="cs-original">${e(d.name || '對手卡牌')}</div><div class="cs-scanner"></div><div class="cs-light"></div><div class="cs-sheet">COPY</div><div class="cs-result">複印完成・${e(d.name)}</div>`),
        snooker: scene(1650, d => `<div class="cs-felt"></div><div class="cs-cue"></div><div class="cs-cueball"></div><div class="cs-poolball">147</div><div class="cs-pocket"></div><div class="cs-result">撞球・進袋！</div>`),
        dustAllergy: scene(1650, d => `<div class="cs-dust-cloud"><i></i><i></i><i></i><i></i><i></i></div><div class="cs-dust-source">灰塵</div><div class="cs-dust-target"><span>!?</span><b>${e(d.target || '對手')}</b></div><div class="cs-dust-sneeze">哈啾！</div><div class="cs-dust-stamp">過敏<br><small>每回合 -${e(d.percent ?? 4)}% HP</small></div><div class="cs-result">灰塵・過敏附著</div>`),
        heroShop: scene(1650, d => `<div class="cs-shop-awning">商店</div><div class="cs-shop-shelf">劍　盾　鞋</div><div class="cs-shop-hand">✋</div><div class="cs-shop-item">${e(d.name)}</div><div class="cs-result">勇者取得 ${e(d.name)}</div>`),
        heroSword: scene(1650, () => `<div class="cs-forge">▰</div><div class="cs-hammer">⚒</div><div class="cs-sword">⚔</div><div class="cs-forge-hit">鏘！</div><div class="cs-sparks">✦ ✦ ✦</div><div class="cs-atk-gain">ATK +10</div><div class="cs-result">鍛鍊・劍化為攻擊力</div>`),
        heroShield: scene(1650, () => `<div class="rd-shield-hero">勇者</div><div class="rd-shield-plate p1">盾</div><div class="rd-shield-plate p2">盾</div><div class="rd-shield-plate p3">盾</div><div class="rd-shield-bolt">➤</div><div class="rd-shield-impact">鏗！</div><div class="rd-shield-heal">🛡 +45　HP +30</div><div class="cs-result">防禦・護盾與恢復</div>`),
        heroShoes: scene(1650, () => `<div class="rd-roof r1"></div><div class="rd-roof r2"></div><div class="rd-roof r3"></div><div class="rd-runner"><b>勇者</b><i>◢ ◢</i></div><div class="rd-projectile">➤</div><div class="rd-footprints">➤ ➤ ➤</div><div class="rd-dodge">MISS!</div><div class="cs-result">跑步・閃避率 +5%</div>`),
        demonCall: scene(1650, () => `<div class="rd-contract"><small>魔王的契約</small><b>召　喚</b><em>✧　✧　✧</em></div><div class="rd-quill">✒</div><div class="rd-demon-seal">♛</div><div class="rd-minion m1">魔</div><div class="rd-minion m2">穢</div><div class="cs-result">魔王的號召・魔穢現身</div>`),
        demonPeck: scene(1650, d => `<div class="rd-demon-heart">♥</div><div class="rd-essence e1">魔</div><div class="rd-essence e2">穢</div><div class="rd-essence e3">×${e(d.count ?? '?')}</div><div class="rd-vein"></div><div class="rd-heartbeat">+${e(d.heal ?? '?')} HP</div><div class="cs-result">啄食・生命回流</div>`),
        mady: scene(1650, () => `<div class="rd-mady-court"></div><div class="rd-mady-whistle">TIME OUT!</div><div class="rd-mady-self">麥狄</div><div class="rd-mady-foe">對手</div><div class="rd-mady-beam"></div><div class="rd-mady-buff">ATK +20<br>SHIELD +100<br>每回合 +30 HP</div><div class="rd-mady-error">失誤！<small>ATK -20・命中 -40%</small></div><div class="cs-result">麥狄時刻・攻守逆轉</div>`),
        wounded: scene(1650, d => `<div class="cs-crack"></div><div class="cs-wound-counter">${e(d.count ?? 0)} / ${e(d.limit ?? 5)}</div><div class="cs-bandage">✚</div><div class="cs-breakout">突破！</div><div class="cs-result">受傷・${e(d.name || '突破累積')}</div>`),
        peak: scene(1650, () => `<div class="rd-peak-gauge"><span>POWER LIMIT</span><b>50</b></div><div class="rd-peak-figure">巔峰</div><div class="rd-peak-band b1"></div><div class="rd-peak-band b2"></div><div class="rd-peak-band b3"></div><div class="rd-peak-burst">限界突破！</div><div class="rd-peak-stats">ATK +20　減傷 15%</div><div class="cs-result">全盛時期・力量解放</div>`),
        probabilityPassive: scene(1650, d => `<div class="cs-graph"></div><div class="cs-dice">${e(d.chance)}%</div><div class="cs-needle"></div><div class="cs-verdict">${d.fatal ? '死亡' : '存活'}</div><div class="cs-result">概率・生存判定</div>`),
        probabilityTheory: scene(1650, () => `<div class="cs-equation">40% ─ 90%</div><div class="cs-chalk">✎</div><div class="cs-curve"></div><div class="cs-curve-dot"></div><div class="cs-multiplier">成功 → ATK × 3</div><div class="cs-result">概率學概論</div>`),
        probabilityZero: scene(1650, () => `<div class="rd-zero-ledger"><small>STATUS EFFECTS / 效果判定</small><span>灼燒</span><span>暈眩</span><span>減益</span></div><div class="rd-zero-roller">0.00%</div><div class="rd-zero-shred">╱ ╱ ╱</div><div class="rd-zero-verdict">全部無效！</div><div class="cs-result">概率為 0・三回合免疫</div>`),
        probabilityHundred: scene(1650, () => `<div class="cs-meter"></div><div class="cs-hundred">100</div><div class="cs-scissors">✂</div><div class="cs-half">ATK ÷ 2</div><div class="cs-result">概率為 100</div>`),
        injuryChain: scene(1650, d => `<div class="cs-torn t1">${e(d.from)}</div><div class="cs-torn t2">傷</div><div class="cs-stitch">╱╱╱</div><div class="cs-rise">${e(d.name)}</div><div class="cs-result">傷勢進化・${e(d.name)}</div>`),
        machineNest: scene(1650, d => `<div class="cs-hive">⬡</div><div class="cs-hive-gear">⚙</div><div class="cs-hive-belt"></div><div class="cs-hive-product">${e(d.name || '機器人')}</div><div class="cs-result">機器母巢・生產完成</div>`),
        ordinary: scene(1650, d => `<div class="cs-spotlight">${e(d.from || '對手')}</div><div class="cs-eraser">▰</div><div class="cs-erase-trail"></div><div class="cs-blank">一般般</div><div class="cs-stamp">普通！</div><div class="cs-result">你也是很一般</div>`),
        brownian: scene(1650, () => `<div class="rd-micro-lens"></div><div class="rd-particle p1">●</div><div class="rd-particle p2">●</div><div class="rd-particle p3">●</div><div class="rd-particle p4">●</div><div class="rd-particle p5">●</div><div class="rd-particle p6">●</div><div class="rd-micro-collision">砰！</div><div class="rd-random-damage">RANDOM<br>1 ─ 100 DMG</div><div class="cs-result">布朗運動・隨機撞擊</div>`),
        alfred: scene(1650, () => `<div class="cs-signal">☎</div><div class="cs-wave w1"></div><div class="cs-wave w2"></div><div class="cs-reinforcement">扁佛狹</div><div class="cs-result">阿福・呼叫增援</div>`)
    });
    const originalCombat = motion.combat.bind(motion);
    const skillScenes = {
        '堯冥/打籃球': 'basketball',
        '勇者/鍛鍊': 'heroSword', '勇者/防禦': 'heroShield', '勇者/跑步': 'heroShoes',
        '麥狄/麥狄時刻': 'mady', '巔峰/全盛時期': 'peak',
        '概率學/概率學概論': 'probabilityTheory', '概率學/概率為0': 'probabilityZero', '概率學/概率為100': 'probabilityHundred',
        '愛因斯坦/布朗運動': 'brownian', '阿福/呼叫增援': 'alfred',
        '灰塵/過敏': 'dustAllergy'
    };
    motion.combat = ({ attacker, defender, skill }) => {
        const kind = skillScenes[`${attacker?.name}/${skill?.name}`];
        if (kind) return motion.preview(kind, { name: skill?.effect?.target, target: defender?.name, percent: skill?.effect?.damage });
        const effect = skill?.effect || {};
        if (attacker?.name === '機器母巢' && skill?.name === '生產') return null;
        if (effect.category === 'motorcycle' || /摩托車/.test(effect.target || '')) return null;
        return originalCombat({ attacker, skill });
    };
    motion.event = (kind, data) => motion.preview(kind, data);
})(window);
