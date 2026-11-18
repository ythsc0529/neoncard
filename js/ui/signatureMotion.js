/* Bespoke battle storyboards. Shared code only schedules and disposes scenes. */
(function (global) {
    const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);

    const scenes = {
        certainty: {
            duration: 1450, cues: [[160, 1], [610, 2], [1050, 3]],
            markup: d => `<div class="sig-cert-grid"></div><div class="sig-cert-door sig-cert-door-a"></div><div class="sig-cert-door sig-cert-door-b"></div><div class="sig-cert-figure">100<span>%</span></div><div class="sig-cert-stamp">必・然</div><div class="sig-cert-caption">${escape(d.description || '確定成功')}</div>`
        },
        planet: {
            duration: 1950, cues: [[270, 1], [860, 2], [1420, 3]],
            markup: d => `<div class="sig-planet-sky"><i></i><i></i><i></i><i></i><i></i></div><div class="sig-planet-orbit orbit-a"></div><div class="sig-planet-orbit orbit-b"></div><div class="sig-planet-body planet-a"></div><div class="sig-planet-body planet-b"></div><div class="sig-planet-body planet-c"></div><div class="sig-planet-gate">✦</div><div class="sig-planet-card"><small>PLANET SUMMON / 星軌召喚</small><strong>${escape(d.name || '星球牌')}</strong></div><div class="sig-planet-sfx">星界開門！</div>`
        },
        vehicle: {
            duration: 1850, cues: [[260, 1], [690, 2], [1350, 3]],
            markup: d => `<div class="sig-road-horizon"></div><div class="sig-road-lane lane-a"></div><div class="sig-road-lane lane-b"></div><div class="sig-road-lane lane-c"></div><div class="sig-vehicle-body"><div class="sig-vehicle-window"></div><i class="wheel-a"></i><i class="wheel-b"></i></div><div class="sig-vehicle-dust"><i></i><i></i><i></i></div><div class="sig-vehicle-title"><small>VEHICLE SUMMON / 交通工具</small><strong>${escape(d.name || '新車登場')}</strong></div><div class="sig-vehicle-sfx">轟──！</div>`
        },
        mahjong: {
            duration: 1950, cues: [[220, 1], [850, 2], [1430, 3]],
            markup: d => `<div class="sig-mahjong-table"></div><div class="sig-tile tile-1"><span>中</span></div><div class="sig-tile tile-2"><span>發</span></div><div class="sig-tile tile-3"><span>白</span></div><div class="sig-tile tile-4"><span>東</span></div><div class="sig-mahjong-hand">🀄</div><div class="sig-mahjong-reveal"><small>MAHJONG SUMMON / 摸牌！</small><strong>${escape(d.name || '麻將牌')}</strong></div><div class="sig-mahjong-sfx">碰！</div>`
        },
        conspiracy: {
            duration: 1700, cues: [[240, 1], [750, 2], [1200, 3]],
            markup: () => `<div class="sig-conspiracy-alert">SELF DAMAGE / 阿共的陰謀</div><div class="sig-conspiracy-lever"><i></i><b></b></div><div class="sig-conspiracy-count">3<br>2<br>1</div><div class="sig-conspiracy-blast"></div><div class="sig-conspiracy-value">-999</div><div class="sig-conspiracy-sfx">自爆！</div>`
        },
        gentleman: {
            duration: 2050, cues: [[300, 1], [950, 2], [1520, 3]],
            markup: () => `<div class="sig-gentleman-hat"><i></i></div><div class="sig-gentleman-cup">♨</div><div class="sig-gentleman-stat stat-hp">HP</div><div class="sig-gentleman-stat stat-atk">ATK</div><div class="sig-gentleman-arrow">⤺</div><div class="sig-gentleman-seal">STUN<br>暈眩！</div><div class="sig-gentleman-caption">輪胎・英國紳士</div>`
        },
        rps: {
            duration: 1750, cues: [[210, 1], [720, 2], [1280, 3]],
            markup: () => `<div class="sig-rps-beat beat-rock">✊<small>石頭</small></div><div class="sig-rps-beat beat-scissors">✌<small>剪刀</small></div><div class="sig-rps-beat beat-paper">✋<small>布</small></div><div class="sig-rps-clash"></div><div class="sig-rps-question">勝負未定?!</div><div class="sig-rps-caption">ROCK · PAPER · SCISSORS</div>`
        },
        replacement: {
            duration: 1900, cues: [[260, 1], [870, 2], [1450, 3]],
            markup: d => `<div class="sig-replace-old"><small>FALLEN / 陣亡</small><strong>${escape(d.outgoing || '前鋒')}</strong></div><div class="sig-replace-fragment fragment-a"></div><div class="sig-replace-fragment fragment-b"></div><div class="sig-replace-fragment fragment-c"></div><div class="sig-replace-ribbon">接棒！</div><div class="sig-replace-new"><small>NEW FIGHTER / 上場</small><strong>${escape(d.incoming)}</strong></div><div class="sig-replace-floor"></div>`
        },
        revival: {
            duration: 2300, cues: [[300, 1], [1020, 2], [1750, 3]],
            markup: d => `<div class="sig-revive-pulse"></div><div class="sig-revive-fragment frag-a"></div><div class="sig-revive-fragment frag-b"></div><div class="sig-revive-fragment frag-c"></div><div class="sig-revive-fragment frag-d"></div><div class="sig-revive-card"><small>RETURN FROM ZERO / 復生</small><strong>${escape(d.name)}</strong></div><div class="sig-revive-line"></div><div class="sig-revive-word">復・活！</div>`
        },
        jobs: {
            duration: 2150, cues: [[300, 1], [890, 2], [1570, 3]],
            markup: d => `<div class="sig-jobs-apple">●<i></i></div><div class="sig-jobs-bite"></div><div class="sig-jobs-circuit"><i></i><i></i><i></i><i></i></div><div class="sig-jobs-screen"><small>ONE MORE THING / 創業</small><strong>${escape(d.to)}</strong></div><div class="sig-jobs-sfx">革新！</div>`
        },
        peter: {
            duration: 2200, cues: [[260, 1], [960, 2], [1630, 3]],
            markup: d => `<div class="sig-peter-paper paper-a">備取</div><div class="sig-peter-paper paper-b">等待</div><div class="sig-peter-paper paper-c">放榜</div><div class="sig-peter-stairs"><i></i><i></i><i></i></div><div class="sig-peter-seal">正取</div><div class="sig-peter-name">${escape(d.to)}</div>`
        },
        fighter: {
            duration: 2000, cues: [[250, 1], [850, 2], [1470, 3]],
            markup: d => `<div class="sig-fighter-ring"></div><div class="sig-fighter-glove glove-left">拳</div><div class="sig-fighter-glove glove-right">王</div><div class="sig-fighter-crack"></div><div class="sig-fighter-belt"><small>CRITICAL ASCENSION</small><strong>${escape(d.to)}</strong></div><div class="sig-fighter-sfx">KO!</div>`
        },
        lich: {
            duration: 2200, cues: [[270, 1], [1010, 2], [1660, 3]],
            markup: d => `<div class="sig-lich-ground"></div><div class="sig-lich-bones"><i></i><i></i><i></i><i></i></div><div class="sig-lich-crown">♛</div><div class="sig-lich-eyes">● ●</div><div class="sig-lich-throne"><small>NECRO / 不死王權</small><strong>${escape(d.to)}</strong></div>`
        },
        machine: {
            duration: 2150, cues: [[220, 1], [870, 2], [1570, 3]],
            markup: d => `<div class="sig-machine-part part-a">I</div><div class="sig-machine-part part-b">II</div><div class="sig-machine-part part-c">III</div><div class="sig-machine-core">⚙</div><div class="sig-machine-outline"></div><div class="sig-machine-name"><small>MERGE COMPLETE / 三機合體</small><strong>${escape(d.to)}</strong></div>`
        },
        jet: {
            duration: 1700, cues: [[180, 1], [700, 2], [1250, 3]],
            markup: d => `<div class="sig-jet-cloud cloud-a"></div><div class="sig-jet-cloud cloud-b"></div><div class="sig-jet-wing wing-left"></div><div class="sig-jet-wing wing-right"></div><div class="sig-jet-core">➤</div><div class="sig-jet-trail"></div><div class="sig-jet-name"><small>FORM SHIFT / 空中變形</small><strong>${escape(d.to)}</strong></div>`
        },
        jetGuard: {
            duration: 1750, cues: [[230, 1], [810, 2], [1320, 3]],
            markup: d => `<div class="sig-jet-guard-radar"><i></i><i></i><i></i></div><div class="sig-jet-guard-wing left"></div><div class="sig-jet-guard-wing right"></div><div class="sig-jet-guard-core">L</div><div class="sig-jet-guard-decoy">◆ ◆ ◆</div><div class="sig-jet-guard-name"><small>EVASION FORM / 誘餌展開</small><strong>${escape(d.to)}</strong></div>`
        },
        mutation: {
            duration: 1750, cues: [[230, 1], [760, 2], [1320, 3]],
            markup: d => `<div class="sig-mutation-frame"><span>${escape(d.from)}</span><i></i><strong>${escape(d.to)}</strong></div><div class="sig-mutation-grid"></div><div class="sig-mutation-word">變・身！</div>`
        },
        empower: {
            duration: 1950, cues: [[200, 1], [830, 2], [1430, 3]],
            markup: d => `<div class="sig-empower-bulb"><i></i></div><div class="sig-empower-meter"><span></span></div><div class="sig-empower-odds">20%</div><div class="sig-empower-split"><span>天才</span><b>命運</b><span>殞落</span></div><div class="sig-empower-result">${d.fatal ? '突然死亡！' : '存活！'}</div><div class="sig-empower-caption">賦能哥・天才少年</div>`
        },
        win: {
            duration: 2300, cues: [[260, 1], [930, 2], [1750, 3]],
            markup: d => `<div class="sig-win-burst"></div><div class="sig-win-ribbon ribbon-left"></div><div class="sig-win-ribbon ribbon-right"></div><div class="sig-win-crown">★</div><div class="sig-win-word">VICTORY!</div><div class="sig-win-name">${escape(d.winner)} 勝利！</div><div class="sig-win-chapter">FINAL CHAPTER / 勝利</div>`
        },
        loss: {
            duration: 2350, cues: [[240, 1], [990, 2], [1780, 3]],
            markup: d => `<div class="sig-loss-page page-a"></div><div class="sig-loss-page page-b"></div><div class="sig-loss-crack"></div><div class="sig-loss-word">DEFEAT</div><div class="sig-loss-name">${escape(d.winner)} 勝利</div><div class="sig-loss-next">TO BE CONTINUED / 再戰</div>`
        }
    };

    let queue = Promise.resolve();
    function play(kind, data = {}) {
        const scene = scenes[kind];
        if (!scene) return Promise.resolve();
        const layer = document.createElement('div');
        layer.className = `signature-scene signature-${kind}${scene.character ? ' character-signature' : ''}`;
        layer.dataset.phase = '0';
        layer.setAttribute('aria-hidden', 'true');
        layer.innerHTML = scene.markup(data);
        document.body.appendChild(layer);
        return new Promise(resolve => {
            const timers = [...scene.cues, [scene.duration - 200, 4]].map(([at, phase]) => setTimeout(() => {
                layer.dataset.phase = String(phase);
                layer.classList.add(`phase-${phase}`);
            }, at));
            timers.push(setTimeout(() => {
                timers.forEach(clearTimeout);
                layer.remove();
                resolve();
            }, scene.duration));
        });
    }
    function enqueue(kind, data) {
        const next = () => play(kind, data);
        queue = queue.then(next, next);
        return queue;
    }
    function skillKind(attacker, skill) {
        const effect = skill?.effect || skill?.effects?.[0] || {};
        if (attacker?.name === '阿共' && effect.type === 'self_damage') return 'conspiracy';
        if (attacker?.name === '輪胎' && skill?.name === '英國紳士') return 'gentleman';
        if (skill?.name === '猜拳') return 'rps';
        if (!/summon|draw_category/.test(effect.type || '')) return null;
        const target = effect.target && typeof getCharacterByName === 'function' ? getCharacterByName(effect.target) : null;
        const tags = [effect.category, ...(target?.tags || [])];
        if (tags.includes('planet')) return 'planet';
        if (tags.includes('mahjong')) return 'mahjong';
        if (tags.includes('vehicle') || tags.includes('motorcycle')) return 'vehicle';
        return null;
    }
    function evolutionKind(to) {
        if (to === '賈伯斯max') return 'jobs';
        if (to === 'Peter pro') return 'peter';
        if (to === '拳王') return 'fighter';
        if (to === '骷髏王') return 'lich';
        if (to === '機器之神') return 'machine';
        if (to === 'K型戰機') return 'jet';
        if (to === 'L型戰機') return 'jetGuard';
        return 'mutation';
    }
    global.SignatureMotion = {
        scenes, skillKind, evolutionKind,
        combat({ attacker, skill }) {
            const kind = skillKind(attacker, skill);
            return kind ? enqueue(kind, { name: skill?.name }) : null;
        },
        replacement({ outgoing, incoming }) { return enqueue('replacement', { outgoing: outgoing?.name, incoming: incoming?.name }); },
        evolution({ from, to }) { return enqueue(evolutionKind(to), { from, to }); },
        certainty(description) { return enqueue('certainty', { description }); },
        revival(name) { return enqueue('revival', { name }); },
        empowerment(fatal) { return enqueue('empower', { fatal }); },
        outcome(winner, won) { return enqueue(won ? 'win' : 'loss', { winner }); },
        preview(kind, data) { return enqueue(kind, data); }
    };
})(window);
