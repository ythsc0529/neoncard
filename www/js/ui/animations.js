// ========== NEON CARD GAME - ANIMATION SYSTEM ==========

const Animations = {
    container: null,

    async comicAction(attacker, defender, skill) {
        if (!window.ComicMotion) return;
        await window.ComicMotion.combat({ attacker, defender, skill,
            kind: skill ? 'skill' : 'attack',
            source: this.getCardEl(attacker), target: this.getCardEl(defender) });
    },

    // Resolve a character object to its DOM battle-card element
    getCardEl(charObj) {
        if (!charObj || typeof GameState === 'undefined') return null;
        if (GameState.player1?.battleCard === charObj) return document.getElementById('p1BattleCard');
        if (GameState.player2?.battleCard === charObj) return document.getElementById('p2BattleCard');
        return null;
    },

    init() {
        this.container = document.getElementById('animationOverlay');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'animationOverlay';
            this.container.className = 'animation-overlay hidden';
            this.container.style.zIndex = '9999'; // Force high z-index
            document.body.appendChild(this.container);
        } else {
            this.container.style.zIndex = '9999';
        }
    },

    show() {
        this.container.classList.remove('hidden');
    },

    hide() {
        this.container.classList.add('hidden');
        this.container.innerHTML = '';
        this.container.onclick = null; // Clear click handlers
    },

    escapeText(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    },

    // Opening manga coin toss
    async coinFlip(forcedResult = null) {
        return new Promise(resolve => {
            this.show();
            // If forcedResult is provided, use it. Otherwise, use Window.GameRNG or Math.random
            const result = forcedResult !== null ? forcedResult : (window.GameRNG ? (window.GameRNG.nextBoolean() ? 1 : 2) : (window.GameRandom() < 0.5 ? 1 : 2));

            const name1 = (typeof GameState !== 'undefined' && GameState.player1?.name) ? GameState.player1.name : '玩家 1';
            const name2 = (typeof GameState !== 'undefined' && GameState.player2?.name) ? GameState.player2.name : '玩家 2';

            this.container.innerHTML = `
                <div class="manga-stage manga-coin-stage" style="--manga-duration:4300ms" role="status" aria-live="polite">
                    <div class="manga-speedlines"></div>
                    <div class="manga-issue">NEON CARD / 開戰序章</div>
                    <div class="manga-coin-eyebrow">WHO TAKES THE FIRST TURN?</div>
                    <div class="manga-heading">命運・擲下！</div>
                    <div class="manga-coin-arena">
                        <div class="manga-coin-trail"></div>
                        <div class="manga-coin-flight"><div class="manga-coin" id="mangaCoin"><div class="manga-coin-front manga-coin-mark">?</div><div class="manga-coin-back manga-coin-mark">?</div></div></div>
                        <div class="manga-coin-impact">鏘！</div>
                    </div>
                    <div class="manga-contenders"><span data-player="1">${this.escapeText(name1)}</span><b>VS</b><span data-player="2">${this.escapeText(name2)}</span></div>
                    <div class="manga-coin-result"><small>先攻確定</small><strong>${this.escapeText(result === 1 ? name1 : name2)}</strong><span>先手出擊！</span></div>
                    <div class="manga-progress"></div>
                </div>
            `;
            const stage = this.container.querySelector('.manga-coin-stage');
            const coinEl = stage.querySelector('.manga-coin');
            setTimeout(() => {
                if (!stage.isConnected) return;
                stage.classList.add('is-tossing');
            }, 350);
            setTimeout(() => {
                if (!stage.isConnected) return;
                stage.querySelectorAll('.manga-coin-mark').forEach(mark => { mark.textContent = String(result); });
                coinEl.classList.add('is-landed');
                stage.querySelector(`[data-player="${result}"]`)?.classList.add('is-winner');
                stage.classList.add('is-revealed');
            }, 2550);
            setTimeout(() => {
                if (stage.isConnected) this.hide();
                resolve(result);
            }, 4300);
        });
    },

    // Dice roll animation
    async diceRoll() {
        return new Promise(resolve => {
            this.show();
            const result = Math.floor(window.GameRandom() * 6) + 1;

            this.container.innerHTML = `
                <div style="text-align: center;">
                    <div class="dice-container">
                        <div class="dice rolling" id="dice">
                            <div class="dice-face">1</div>
                            <div class="dice-face">6</div>
                            <div class="dice-face">3</div>
                            <div class="dice-face">4</div>
                            <div class="dice-face">2</div>
                            <div class="dice-face">5</div>
                        </div>
                    </div>
                    <p style="margin-top: 30px; font-size: 2rem; opacity: 0;" id="diceResult">
                        擲出了 <span style="color: var(--neon-gold); font-size: 3rem;">${result}</span>
                    </p>
                </div>
            `;

            setTimeout(() => {
                const d = document.getElementById('dice');
                if (d) {
                    d.classList.remove('rolling');
                    d.classList.add(`show-${result}`); // Rotate to correct face
                }
                const dr = document.getElementById('diceResult');
                if (dr) dr.style.opacity = '1';
            }, 1500);

            setTimeout(() => {
                this.hide();
                resolve(result);
            }, 3000);
        });
    },

    // Probability roll animation — Neo-Brutalism × Manga / Comic Style
    async probabilityRoll(chance, description = '') {
        if (Number(chance) >= 100) {
            // Keep the gameplay RNG aligned between peers even for a guaranteed result.
            window.GameRandom();
            if (window.SignatureMotion) {
                await window.SignatureMotion.certainty(description);
                return true;
            }
            this.show();
            this.container.innerHTML = `<div class="ink-guaranteed"><span>ABSOLUTE / 必然</span><strong>100%</strong><b>確定成功！</b><small></small></div>`;
            this.container.querySelector('small').textContent = description;
            await new Promise(resolve => setTimeout(resolve, 1250));
            this.hide();
            return true;
        }
        if (window.SoundManager) SoundManager.play('random');
        return new Promise(resolve => {
            try {
                this.show();
                const rolled = Math.floor(window.GameRandom() * 100) + 1; // 1-100
                const success = rolled <= chance;
                const clampedChance = Math.max(1, Math.min(99, Math.round(chance)));

                this.container.innerHTML = `
                    <div class="comic-prob-stage">
                        <!-- Dynamic Manga Speedlines & Halftone Background -->
                        <div class="comic-speedlines"></div>
                        <div class="comic-halftone-overlay"></div>

                        <!-- Tension Onomatopoeia -->
                        <div class="comic-rumble-text comic-rumble-tl">ドドドド…</div>
                        <div class="comic-rumble-text comic-rumble-br">ゴゴゴゴ…</div>

                        <!-- Main Comic Frame -->
                        <div class="comic-prob-panel" id="comicProbPanel">
                            <!-- Top Status Row -->
                            <div class="comic-prob-top-bar">
                                <div class="comic-prob-tag">
                                    <span class="tag-hazard">///</span> PROBABILITY CHECK <span class="tag-sub">運命の判定</span>
                                </div>
                                <div class="comic-prob-target-tag">
                                    目標 <strong>≤ ${chance}%</strong>
                                </div>
                            </div>

                            <!-- Header Title Banner -->
                            <div class="comic-prob-header-banner">
                                <div class="comic-prob-header-text">${description || '機率判定'}</div>
                            </div>

                            <!-- Central Display: Comic Number Drum -->
                            <div class="comic-drum-section">
                                <div class="comic-bracket bracket-l">【</div>
                                <div class="comic-number-box" id="comicNumBox">
                                    <div class="comic-number-val rolling-jitter" id="comicNumVal">--</div>
                                </div>
                                <div class="comic-bracket bracket-r">】</div>
                            </div>

                            <!-- Fate Gauge Section (Dual Zone) -->
                            <div class="comic-gauge-section">
                                <div class="comic-gauge-track-wrap">
                                    <!-- Pointer that glides horizontally -->
                                    <div class="comic-gauge-pointer-wrapper" id="comicPointerWrap" style="left: 10%;">
                                        <div class="comic-pointer-arrow">▼</div>
                                    </div>

                                    <!-- Dual Zone Bar -->
                                    <div class="comic-gauge-bar">
                                        <!-- Success Zone (0% -> chance%) -->
                                        <div class="comic-gauge-zone zone-success" style="width: ${clampedChance}%;">
                                            <span class="zone-label-text">SUCCESS 成功</span>
                                        </div>
                                        <!-- Danger/Miss Zone (chance% -> 100%) -->
                                        <div class="comic-gauge-zone zone-fail" style="width: ${100 - clampedChance}%;">
                                            <span class="zone-label-text">FAIL 失敗</span>
                                        </div>

                                        <!-- Threshold Divider Pin -->
                                        <div class="comic-thresh-pin" style="left: ${clampedChance}%;">
                                            <div class="comic-thresh-flag">${chance}%</div>
                                        </div>
                                    </div>
                                </div>

                                <div class="comic-gauge-legend">
                                    <div class="legend-item legend-win"><span>■</span> ≤ ${chance}% 通過</div>
                                    <div class="legend-item legend-lose"><span>■</span> &gt; ${chance}% 失敗</div>
                                </div>
                            </div>

                            <!-- Climax Verdict Stamp Overlay -->
                            <div class="comic-verdict-overlay" id="comicVerdictOverlay">
                                <div class="comic-verdict-stamp ${success ? 'stamp-success' : 'stamp-fail'}" id="comicVerdictStamp">
                                    <div class="stamp-onomatopoeia">${success ? 'ズバッ!! BAM!!' : 'ガーン… GAHN!!'}</div>
                                    <div class="stamp-main-text">
                                        ${success ? '💥 判定通過！' : '💀 判定失敗！'}
                                    </div>
                                    <div class="stamp-sub-text">
                                        ${success ? `CRITICAL SUCCESS [ 點數 ${rolled} ≤ ${chance} ]` : `FAILED / MISS [ 點數 ${rolled} > ${chance} ]`}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                const panelEl = document.getElementById('comicProbPanel');
                const numEl = document.getElementById('comicNumVal');
                const pointerEl = document.getElementById('comicPointerWrap');
                const verdictOverlay = document.getElementById('comicVerdictOverlay');
                const verdictStamp = document.getElementById('comicVerdictStamp');

                if (!panelEl || !numEl || !pointerEl) {
                    this.hide();
                    resolve(success);
                    return;
                }

                let isResolved = false;
                const finish = () => {
                    if (isResolved) return;
                    isResolved = true;
                    this.hide();
                    resolve(success);
                };

                // Click to skip / speed up close
                this.container.onclick = () => {
                    if (Date.now() - rollStart > 1100) {
                        finish();
                    }
                };

                // ── Phase 1: High Energy Rolling Numbers (0 → 800ms) ───────────
                const rollDuration = 800;
                const rollStart = Date.now();

                const rollLoop = () => {
                    const elapsed = Date.now() - rollStart;
                    if (elapsed < rollDuration) {
                        const fakeVal = Math.floor(Math.random() * 100) + 1;
                        numEl.textContent = fakeVal.toString().padStart(2, '0');
                        // Gliding jitter pointer
                        pointerEl.style.left = (10 + Math.random() * 80) + '%';
                        requestAnimationFrame(rollLoop);
                    } else {
                        // ── Phase 2: Decelerate & Snap to Real Value (800ms) ───
                        numEl.textContent = rolled.toString().padStart(2, '0');
                        numEl.classList.remove('rolling-jitter');
                        numEl.classList.add(success ? 'num-success' : 'num-fail');

                        // Snap pointer smoothly to exact location
                        pointerEl.style.transition = 'left 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
                        pointerEl.style.left = Math.max(2, Math.min(98, rolled)) + '%';

                        // ── Phase 3: Impact Slam & Climax Stamp (1050ms) ──────
                        setTimeout(() => {
                            panelEl.classList.add('impact-shake');
                            verdictOverlay.classList.add('show');
                            verdictStamp.classList.add('slam-active');

                            if (window.SoundManager) {
                                SoundManager.play(success ? 'win' : 'fail');
                            }

                            // Particle explosion burst
                            const PARTICLE_COUNT = 22;
                            const pColors = success
                                ? ['#00FF66', '#FFE600', '#FFFFFF', '#00F0FF', '#FF4D1C']
                                : ['#FF2A6D', '#EF4444', '#0A0A0A', '#FFE600', '#FFFFFF'];

                            for (let i = 0; i < PARTICLE_COUNT; i++) {
                                const p = document.createElement('div');
                                const isStar = i % 2 === 0;
                                p.className = `comic-particle ${isStar ? 'shape-star' : 'shape-square'}`;
                                const angle = (i / PARTICLE_COUNT) * 360 + (Math.random() * 20 - 10);
                                const dist = 70 + Math.random() * 90;
                                const rad = (angle * Math.PI) / 180;
                                const px = Math.cos(rad) * dist;
                                const py = Math.sin(rad) * dist;
                                const rot = Math.floor(Math.random() * 360) + 'deg';
                                p.style.setProperty('--px', px + 'px');
                                p.style.setProperty('--py', py + 'px');
                                p.style.setProperty('--prot', rot);
                                p.style.background = pColors[i % pColors.length];
                                const size = (6 + Math.random() * 8) + 'px';
                                p.style.width = size;
                                p.style.height = size;
                                panelEl.appendChild(p);
                                setTimeout(() => p.remove(), 950);
                            }
                        }, 250);
                    }
                };
                requestAnimationFrame(rollLoop);

                // ── Phase 4: Auto-resolve and close (2300ms) ──────────────────
                setTimeout(() => {
                    finish();
                }, 2300);

            } catch (e) {
                console.error("Animation Error:", e);
                this.hide();
                resolve(window.GameRandom() * 100 < chance);
            }
        });
    },

    // Random Number Roll
    async showRandomNumber(min, max, description = '') {
        if (window.SoundManager) SoundManager.play('random');
        return new Promise(resolve => {
            try {
                this.show();
                const result = Math.floor(window.GameRandom() * (max - min + 1)) + min;

                this.container.innerHTML = `
                    <div class="rand-panel">
                        <div class="rand-skill-name">數值判定</div>
                        <div class="rand-header">${description || '隨機數值生成'}</div>

                        <div class="rand-display-wrap">
                            <div class="rand-brackets">[</div>
                            <div class="rand-number-box">
                                <span class="rand-number" id="randNumber">00</span>
                            </div>
                            <div class="rand-brackets">]</div>
                        </div>

                        <div class="rand-range-info">範圍：${min} - ${max}</div>
                        
                        <div class="rand-result-badge" id="randBadge">
                            數值確立
                        </div>
                    </div>
                `;

                const el = document.getElementById('randNumber');
                const badgeEl = document.getElementById('randBadge');
                const wrapEl = this.container.querySelector('.rand-display-wrap');

                if (!el || !badgeEl || !wrapEl) {
                    this.hide();
                    resolve(result);
                    return;
                }

                // Phase 1: Rapid rolling
                let duration = 1200;
                let startTime = Date.now();

                const animate = () => {
                    const elapsed = Date.now() - startTime;
                    if (elapsed < duration) {
                        // High speed rolling
                        const fakeVal = Math.floor(Math.random() * (max - min + 1)) + min;
                        // pad to at least 2 chars if possible to keep width roughly stable
                        el.textContent = fakeVal.toString().padStart(2, '0');
                        requestAnimationFrame(animate);
                    } else {
                        // Final result
                        el.textContent = result.toString().padStart(2, '0');

                        // Add glow and scale
                        el.classList.add('rand-final');
                        wrapEl.classList.add('rand-locked');

                        // Show badge and particles
                        setTimeout(() => {
                            badgeEl.classList.add('show');

                            // Particle burst
                            const PARTICLE_COUNT = 12;
                            const pColors = ['#ffd700', '#ffb700', '#ffffff', '#ffea00'];
                            for (let i = 0; i < PARTICLE_COUNT; i++) {
                                const p = document.createElement('div');
                                p.className = 'comic-particle shape-star';
                                const angle = (i / PARTICLE_COUNT) * 360;
                                const dist = 40 + Math.random() * 40;
                                const rad = (angle * Math.PI) / 180;
                                const px = Math.cos(rad) * dist;
                                const py = Math.sin(rad) * dist;
                                const rot = Math.floor(Math.random() * 360) + 'deg';
                                p.style.setProperty('--px', px + 'px');
                                p.style.setProperty('--py', py + 'px');
                                p.style.setProperty('--prot', rot);
                                p.style.background = pColors[i % pColors.length];
                                p.style.width = (4 + Math.random() * 6) + 'px';
                                p.style.height = p.style.width;
                                wrapEl.appendChild(p);
                                setTimeout(() => p.remove(), 900);
                            }
                        }, 200);
                    }
                };
                requestAnimationFrame(animate);

                setTimeout(() => {
                    this.hide();
                    resolve(result);
                }, 2800);
            } catch (e) {
                console.error("Animation Error:", e);
                this.hide();
                resolve(Math.floor(window.GameRandom() * (max - min + 1)) + min); // Fallback
            }
        });
    },

    // Card flip reveal
    async cardFlip(character, index = 0) {
        return new Promise(resolve => {
            const delay = index * 300;
            setTimeout(() => {
                const card = document.querySelector(`[data-card-index="${index}"]`);
                if (card) {
                    card.classList.add('flipping');
                    setTimeout(() => {
                        card.classList.remove('flipping');
                        card.classList.add('revealed');
                        resolve();
                    }, 600);
                } else {
                    resolve();
                }
            }, delay);
        });
    },

    // Show damage number floating above a card element
    // elementOrId: a DOM element or an element ID string (e.g., 'p1BattleCard')
    showDamage(elementOrId, damage, isHeal = false) {
        const element = typeof elementOrId === 'string'
            ? document.getElementById(elementOrId)
            : elementOrId;
        if (!element || !damage) return;

        const num = document.createElement('div');
        num.className = `floating-number ${isHeal ? 'heal' : 'damage'}`;
        num.textContent = (isHeal ? '+' : '-') + damage;

        const rect = element.getBoundingClientRect();
        // Random horizontal scatter so multiple hits don't overlap
        const scatter = (Math.random() - 0.5) * rect.width * 0.5;
        num.style.left = (rect.left + rect.width / 2 + scatter) + 'px';
        num.style.top = (rect.top + rect.height * 0.25) + 'px';

        document.body.appendChild(num);
        if (element.animate) {
            element.animate(isHeal ? [
                { outline: '0px solid #43885c' },
                { outline: '6px solid #43885c', offset: .4 },
                { outline: '0px solid #43885c' }
            ] : [
                { transform: 'translateX(0)' },
                { transform: 'translateX(-7px)', offset: .2 },
                { transform: 'translateX(6px)', offset: .4 },
                { transform: 'translateX(-3px)', offset: .7 },
                { transform: 'translateX(0)' }
            ], { duration: 380 });
        }
        setTimeout(() => num.remove(), 1200);
    },

    // Convenience wrapper for heal numbers
    showHeal(elementOrId, amount) { this.showDamage(elementOrId, amount, true); },

    // Shield gain number (blue)
    showShield(elementOrId, amount) {
        const element = typeof elementOrId === 'string'
            ? document.getElementById(elementOrId)
            : elementOrId;
        if (!element || !amount) return;
        const num = document.createElement('div');
        num.className = 'floating-number shield';
        num.textContent = '🛡+' + amount;
        const rect = element.getBoundingClientRect();
        num.style.left = (rect.left + rect.width / 2) + 'px';
        num.style.top = (rect.top + rect.height * 0.25) + 'px';
        document.body.appendChild(num);
        setTimeout(() => num.remove(), 1200);
    },

    // Summon animation
    async summonEffect(charName) {
        return new Promise(resolve => {
            this.show();

            this.container.innerHTML = `
                <div style="text-align: center;">
                    <div class="summon-effect">
                        <div style="font-size: 4rem; margin-bottom: 20px;">✨</div>
                        <div style="font-size: 2rem; color: var(--neon-green);">
                            召喚 ${charName}
                        </div>
                    </div>
                </div>
            `;

            setTimeout(() => {
                this.hide();
                resolve();
            }, 1500);
        });
    },

    // Character-specific manga panels. The result stays visible before play resumes.
    async characterMoment(kind, details = {}) {
        if (kind === 'replace') return this.fateRewriteMoment(details);
        if (kind === 'sleep' || kind === 'copy') return this.redesignedMoment(kind, details);
        const scenes = {
            sleep: { issue: '神益州 / 晚安', heading: details.awake ? '夢境破碎！' : details.applied ? '晚安，入夢。' : '還在夢中…', sfx: details.awake ? '醒！' : 'Zzz', accent: 'sleep' },
            replace: { issue: '不平凡 / 註定平凡', heading: '命運改寫！', sfx: '換！', accent: 'replace' },
            copy: { issue: '摳屎不累 / 寫輪眼', heading: '招式複製！', sfx: '映！', accent: 'copy' }
        };
        const scene = scenes[kind];
        if (!scene) return;
        const rows = kind === 'replace'
            ? (details.changes || []).map(change => `<div class="manga-moment-row"><small>${this.escapeText(change.player)}</small><strong>${this.escapeText(change.from)}</strong><b>→</b><strong>${this.escapeText(change.to)}</strong></div>`).join('') || '<div class="manga-moment-row"><strong>雙方備戰區沒有角色可替換</strong></div>'
            : kind === 'copy'
                ? `<div class="manga-moment-row"><strong>${this.escapeText(details.source)}</strong><b>→</b><strong>${this.escapeText(details.skill)}</strong><b>→</b><strong>${this.escapeText(details.target)}</strong></div>`
                : `<div class="manga-moment-row"><strong>${this.escapeText(details.character)}</strong><b>${details.awake ? '恢復行動' : details.applied ? '陷入睡眠' : '本回合無法行動'}</b></div>`;
        return new Promise(resolve => {
            this.show();
            this.container.innerHTML = `<div class="manga-stage manga-moment manga-${scene.accent}" role="status" aria-live="assertive">
                <div class="manga-speedlines"></div><div class="manga-issue">${scene.issue}</div>
                <div class="manga-moment-sfx">${scene.sfx}</div><div class="manga-heading">${scene.heading}</div>
                <div class="manga-moment-rows">${rows}</div><div class="manga-progress"></div></div>`;
            const stage = this.container.querySelector('.manga-moment');
            setTimeout(() => { if (stage.isConnected) stage.classList.add('is-revealed'); }, 350);
            setTimeout(() => { if (stage.isConnected) this.hide(); resolve(); }, kind === 'replace' ? 2600 : 2200);
        });
    },

    fateRewriteMoment(details = {}) {
        const changes = Array.isArray(details.changes) ? details.changes : [];
        const rows = changes.length
            ? changes.map(change => `<div class="v3-fate-row"><small>${this.escapeText(change.player || '玩家')}</small><strong class="v3-fate-old">${this.escapeText(change.from || '原角色')}</strong><b class="v3-fate-shredder">✂</b><strong class="v3-fate-new">${this.escapeText(change.to || '新角色')}</strong></div>`).join('')
            : '<div class="v3-fate-row"><strong class="v3-fate-new">備戰區沒有可替換角色</strong></div>';
        return new Promise(resolve => {
            this.show();
            this.container.innerHTML = `<div class="manga-stage manga-fate-v3" role="status" aria-live="assertive"><div class="manga-speedlines"></div><div class="v3-fate-heading">不平凡・命運裁決</div><div class="v3-fate-scroll">${rows}</div><div class="v3-fate-verdict">註定平凡！</div></div>`;
            const stage = this.container.querySelector('.manga-fate-v3');
            for (const [delay, phase] of [[180, 'is-entered'], [1050, 'is-shuffling'], [2100, 'is-revealed']]) {
                setTimeout(() => { if (stage.isConnected) stage.classList.add(phase); }, delay);
            }
            setTimeout(() => { if (stage.isConnected) this.hide(); resolve(); }, 4100);
        });
    },

    redesignedMoment(kind, details) {
        const character = this.escapeText(details.character || '對手');
        const variant = kind === 'copy' ? 'copy' : details.awake ? 'awake' : details.applied ? 'asleep' : 'dreaming';
        const markup = variant === 'asleep'
            ? `<div class="rd-sleep-window">☾</div><div class="rd-sleep-curtain left"></div><div class="rd-sleep-curtain right"></div><div class="rd-sleep-pillow">Zzz</div><div class="rd-sleeper">${character}</div><div class="rd-sleep-verdict">${character} 陷入睡眠</div>`
            : variant === 'dreaming'
                ? `<div class="rd-dream-clock">↻</div><div class="rd-dream-ring r1"></div><div class="rd-dream-ring r2"></div><div class="rd-dream-ring r3"></div><div class="rd-dreamer">${character}</div><div class="rd-dream-z">Zzz...</div><div class="rd-sleep-verdict">本回合仍在夢中</div>`
                : variant === 'awake'
                    ? `<div class="rd-alarm">⏰</div><div class="rd-dream-glass"></div><div class="rd-waking">${character}</div><div class="rd-shards">✦　✦　✦</div><div class="rd-wake-word">醒！</div><div class="rd-sleep-verdict">${character} 恢復行動</div>`
                    : `<div class="rd-eye-target">${this.escapeText(details.target || '對手')}</div><div class="rd-eye-lens">◉</div><div class="rd-ink-line"></div><div class="rd-copy-scroll">${this.escapeText(details.skill || '技能')}</div><div class="rd-eye-user">${this.escapeText(details.source || '摳屎不累')}</div><div class="rd-copy-verdict">寫輪眼・複製成功</div>`;
        return new Promise(resolve => {
            this.show();
            this.container.innerHTML = `<div class="rd-moment rd-${variant}" role="status" aria-live="assertive">${markup}</div>`;
            const stage = this.container.querySelector('.rd-moment');
            for (const [delay, phase] of [[250, 1], [1050, 2], [2200, 3]]) {
                setTimeout(() => { if (stage.isConnected) stage.classList.add(`phase-${phase}`); }, delay);
            }
            setTimeout(() => { if (stage.isConnected) this.hide(); resolve(); }, 3400);
        });
    },

    // Card draw sequence
    async drawCards(cards, options = {}) {
        if (cards?.length === 1 && options.signature !== false && window.SignatureMotion?.event) {
            const card = cards[0];
            const tags = card.tags || [];
            const name = card.name;
            const kind = tags.includes('robot_part') ? 'robotParts'
                : /摩托車/.test(name) ? 'motorcycle'
                : ['籃球', '足球', '排球', '羽球', '高爾夫球', '撞球'].includes(name) ? 'ball'
                : tags.includes('tea') || /茶$/.test(name) ? 'tea' : null;
            if (kind) await window.SignatureMotion.event(kind, { name });
        }
        return new Promise(resolve => {
            if (!cards?.length) { resolve(); return; }
            this.show();
            const revealEnd = (cards.length - 1) * 850 + 1750;
            const slots = cards.map((_, i) => `<div class="manga-draw-slot" data-reveal-index="${i}"><small>${String(i + 1).padStart(2, '0')}</small><strong>?</strong></div>`).join('');
            const summary = cards.map(card => `<span>${this.escapeText(card.name)}</span>`).join('');
            this.container.innerHTML = `<div class="manga-stage manga-draw-stage" style="--manga-duration:${revealEnd + 1300}ms" role="status" aria-live="polite">
                <div class="manga-speedlines"></div><div class="manga-issue">NEON CARD / 角色登場</div>
                <div class="manga-draw-kicker">THE NEXT CHAPTER</div><div class="manga-heading">抽出你的命運</div>
                <div class="manga-draw-focus"><div class="manga-draw-sealed"><span>?</span><strong>NEON CARD</strong><small>封印解除中</small></div></div>
                <div class="manga-draw-sfx">啪！</div>
                <div class="manga-draw-count">${cards.length} 張角色卡・逐張揭曉</div>
                <div class="manga-draw-slots">${slots}</div>
                <div class="manga-draw-summary"><b>本次抽到</b>${summary}</div>
                <div class="manga-progress"></div></div>`;
            const stage = this.container.querySelector('.manga-draw-stage');
            setTimeout(() => { if (stage.isConnected) stage.classList.add('is-opening'); }, 350);
            cards.forEach((card, i) => {
                setTimeout(() => {
                    if (!stage.isConnected) return;
                    const focus = stage.querySelector('.manga-draw-focus');
                    focus.innerHTML = `<div class="manga-reveal-card ${getRarityClass(card.rarity)}">
                        <div class="manga-reveal-card-top"><span>NO. ${String(i + 1).padStart(2, '0')}</span><span>${this.escapeText(getRarityName(card.rarity))}</span></div>
                        <div class="manga-reveal-emblem">${this.escapeText(String(card.name).charAt(0))}</div>
                        <div class="manga-reveal-name">${this.escapeText(card.name)}</div>
                        <div class="manga-reveal-stats"><span>HP <b>${this.escapeText(card.hp)}</b></span><span>ATK <b>${this.escapeText(card.atk)}</b></span></div>
                    </div>`;
                    const slot = stage.querySelector(`[data-reveal-index="${i}"]`);
                    slot.querySelector('strong').textContent = card.name;
                    slot.classList.add('is-collected');
                    stage.classList.add('is-flashing');
                    setTimeout(() => { if (stage.isConnected) stage.classList.remove('is-flashing'); }, 300);
                }, i * 850 + 950);
            });
            setTimeout(() => { if (stage.isConnected) stage.classList.add('is-revealed'); }, revealEnd);
            if (typeof TutorialSystem !== 'undefined' && TutorialSystem.isActive) {
                setTimeout(() => TutorialSystem.checkTrigger('onDrawCards'), 500);
            }
            setTimeout(() => {
                if (stage.isConnected) this.hide();
                resolve();
                if (typeof TutorialSystem !== 'undefined' && TutorialSystem.isActive) {
                    setTimeout(() => TutorialSystem.onActionCompleted('draw_revealed'), 0);
                }
            }, revealEnd + 1300);
        });
    },

    // Revive animation
    async reviveEffect(charName, hp) {
        if (window.SignatureMotion) return await window.SignatureMotion.revival(charName, hp);
        return new Promise(resolve => {
            this.show();
            this.container.innerHTML = `<div class="ink-revival"><div class="ink-revival-ring"></div><span>RETURN FROM ZERO / 逆轉生死</span><strong></strong><b>復 活！</b></div>`;
            this.container.querySelector('.ink-revival strong').textContent = charName;

            // Screen shake for impact
            this.shake();

            setTimeout(() => {
                this.hide();
                resolve();
            }, 2500); // Display for 2.5 seconds
        });
    },

    async empowermentFate(chance) {
        const result = window.GameRandom() * 100 < chance;
        if (window.SignatureMotion) {
            await window.SignatureMotion.empowerment(result);
            return result;
        }
        this.show();
        this.container.innerHTML = `<div class="ink-empower"><small>GENIUS BOY / 被動發動</small><strong>賦 能 哥</strong><div class="ink-empower-split"><span>天才</span><b>OR</b><span>殞落</span></div><em></em></div>`;
        this.container.querySelector('em').textContent = result ? '命運：突然死亡！' : '命運：存活！';
        await new Promise(resolve => setTimeout(resolve, 1750));
        this.hide();
        return result;
    },

    // Screen shake
    shake() {
        document.body.style.animation = 'shake 0.3s';
        setTimeout(() => {
            document.body.style.animation = '';
        }, 300);
    },

    // Victory animation
    async victory(winner) {
        const viewerWon = typeof GameState !== 'undefined' && GameState.winner === (
            GameState.mode === 'online'
                ? ((window.localOnlineRole || localStorage.getItem('onlineRole')) === 'host' ? 1 : 2)
                : 1
        );
        if (window.SoundManager) {
            SoundManager.play(viewerWon ? 'win' : 'fail');
        }

        localStorage.removeItem('inRankedMatchOngoing');

        // ── Ranked result processing ─────────────────────────────────────────
        const isRankedMatch = localStorage.getItem('isRankedMatch') === 'true';
        const isBotRankedMatch = localStorage.getItem('isBotRankedMatch') === 'true';
        const isAnyRankedMatch = isRankedMatch || isBotRankedMatch;

        let rankedProcessed = false;

        if (isAnyRankedMatch &&
            typeof AuthManager !== 'undefined' &&
            typeof UserProfile !== 'undefined' &&
            typeof RankedSystem !== 'undefined' &&
            typeof GameState !== 'undefined' &&
            (GameState.mode === 'online' || isBotRankedMatch)) {
            try {
                let user = AuthManager.getCurrentUser();
                if (!user) {
                    user = await new Promise(resolve => {
                        let unsubscribe = null;
                        const timer = setTimeout(() => { if (unsubscribe) unsubscribe(); resolve(null); }, 5000);
                        unsubscribe = AuthManager.onAuthChanged(current => {
                            if (!current) return;
                            clearTimeout(timer);
                            if (unsubscribe) unsubscribe();
                            resolve(current);
                        });
                    });
                }

                if (user) {
                    let iWon = false;
                    if (isBotRankedMatch) {
                        iWon = GameState.winner === 1;
                    } else {
                        const role = window.localOnlineRole || localStorage.getItem('onlineRole');
                        const myPlayer = role === 'host' ? 1 : 2;
                        iWon = GameState.winner === myPlayer;
                    }

                    UserProfile.incrementStat(user.uid, 'ranked', iWon).catch(() => {});
                    
                    const dailyUpdates = { "dailyStats.onlineMatches": firebase.firestore.FieldValue.increment(1) };
                    if (iWon) dailyUpdates["dailyStats.onlineWins"] = firebase.firestore.FieldValue.increment(1);
                    UserProfile.updateProfile(user.uid, dailyUpdates).catch(console.error);

                    if (iWon) {
                        UserProfile.updateProfile(user.uid, { rankedWinStreak: firebase.firestore.FieldValue.increment(1) }).catch(console.error);
                    } else {
                        UserProfile.updateProfile(user.uid, { rankedWinStreak: 0 }).catch(console.error);
                    }

                    const profile = await UserProfile.getProfile(user.uid);
                    const currentRanked = profile?.ranked || RankedSystem.defaultRanked();
                    const { ranked: newRanked, description } = RankedSystem.processMatchResult(currentRanked, iWon);

                    await UserProfile.updateRanked(user.uid, newRanked);

                    let titleUnlocked = null;
                    if (RankedSystem.shouldGrantApexTitle(newRanked)) {
                        const titles = profile?.titles || [];
                        if (!titles.includes(RankedSystem.SEASON.apexTitle)) {
                            await UserProfile.addTitle(user.uid, RankedSystem.SEASON.apexTitle);
                            titleUnlocked = RankedSystem.SEASON.apexTitle;
                        }
                    }

                    rankedProcessed = true;
                    window._settlementRankedDesc = description;
                    window._settlementRankedState = newRanked;
                    window._settlementTitleUnlocked = titleUnlocked;
                } else {
                    console.error('[Ranked] Skipping processing: No user found even after retry.');
                }
            } catch (e) {
                console.error('[Ranked] Failed to process match result:', e);
            }
        }

        // Track win/loss in Firestore
        if (!isAnyRankedMatch || !rankedProcessed) {
            try {
                if (typeof AuthManager !== 'undefined' && typeof UserProfile !== 'undefined') {
                    const user = AuthManager.getCurrentUser();
                    if (user && typeof GameState !== 'undefined') {
                        const mode = GameState.mode;
                        let statMode = null;
                        let iWon = false;
                        if (mode === 'pve' || mode === 'story') {
                            statMode = localStorage.getItem('fromCompetitiveMode') === 'true' ? 'competitive' : 'pve';
                            iWon = (GameState.winner === 1);
                        } else if (mode === 'online') {
                            const role = window.localOnlineRole || localStorage.getItem('onlineRole');
                            const myPlayer = (role === 'host') ? 1 : 2;
                            const isComp = localStorage.getItem('fromCompetitiveMode') === 'true';
                            statMode = isComp ? 'competitive' : 'online';
                            iWon = (GameState.winner === myPlayer);
                        }
                        if (statMode) {
                            UserProfile.incrementStat(user.uid, statMode, iWon).catch(() => {});
                            if (statMode === 'online' || statMode === 'competitive') {
                                const dUpdates = { "dailyStats.onlineMatches": firebase.firestore.FieldValue.increment(1) };
                                if (iWon) dUpdates["dailyStats.onlineWins"] = firebase.firestore.FieldValue.increment(1);
                                UserProfile.updateProfile(user.uid, dUpdates).catch(console.error);
                            }
                        }
                    }
                }
            } catch (_e) { /* silent */ }
        }

        // ── Record Match History & EXP ───────────────────────────────────────
        let expGained = 0;
        let passExpGained = 0;
        let iWonFinal = false;
        try {
            if (typeof AuthManager !== 'undefined' && typeof UserProfile !== 'undefined') {
                const user = AuthManager.getCurrentUser();
                if (user && typeof GameState !== 'undefined' && GameState.winner !== 0) {
                    let oppName = '';
                    let oppUid = '';
                    let matchMode = GameState.mode;

                    if (localStorage.getItem('isBotRankedMatch') === 'true') {
                        iWonFinal = GameState.winner === 1;
                        oppName = localStorage.getItem('botMatchName') || GameState.player2.name;
                        oppUid = 'NPC_' + oppName;
                        matchMode = 'ranked';
                    } else if (localStorage.getItem('fromCompetitiveMode') === 'true' && GameState.type === 'pve') {
                        iWonFinal = GameState.winner === 1;
                        oppName = localStorage.getItem('botMatchName') || GameState.player2.name;
                        oppUid = 'NPC_' + oppName;
                        matchMode = 'online';
                    } else if (localStorage.getItem('isRankedMatch') === 'true') {
                        const role = window.localOnlineRole || localStorage.getItem('onlineRole');
                        const myPlayer = (role === 'host') ? 1 : 2;
                        iWonFinal = GameState.winner === myPlayer;
                        oppName = role === 'host' ? GameState.player2.name : GameState.player1.name;
                        oppUid = (typeof NetManager !== 'undefined' && NetManager.opponentUid) || 'unknown';
                        matchMode = 'ranked';
                    } else if (GameState.mode === 'online') {
                        const role = window.localOnlineRole || localStorage.getItem('onlineRole');
                        const myPlayer = (role === 'host') ? 1 : 2;
                        iWonFinal = GameState.winner === myPlayer;
                        oppName = role === 'host' ? GameState.player2.name : GameState.player1.name;
                        oppUid = (typeof NetManager !== 'undefined' && NetManager.opponentUid) || 'unknown';
                    } else {
                        // PvE / Story
                        iWonFinal = GameState.winner === 1;
                        oppName = GameState.player2.name;
                        oppUid = 'NPC_' + oppName;
                    }

                    if (oppName && oppUid) {
                        UserProfile.recordMatch(user.uid, {
                            opponentName: oppName,
                            opponentUid: oppUid,
                            mode: matchMode,
                            result: iWonFinal ? 'win' : 'loss'
                        });

                        let levelExp = 0;
                        let passExp = iWonFinal ? 30 : 15;
                        
                        if (matchMode === 'story') {
                            if (iWonFinal) levelExp = 60;
                        } else if (matchMode === 'pve') {
                            levelExp = 0; 
                        } else {
                            levelExp = iWonFinal ? 50 : 25;
                        }

                        expGained = levelExp;
                        passExpGained = passExp;

                        if (levelExp > 0 || passExp > 0) {
                            UserProfile.getProfile(user.uid).then(p => {
                                if (!p) return;
                                const updates = {};
                                if (levelExp > 0) updates.exp = (p.exp || 0) + levelExp;
                                if (passExp > 0) {
                                    const bp = p.battlePass || { points: 0, premiumActive: false, claimed: { free: [], premium: [] } };
                                    bp.points = (bp.points || 0) + passExp;
                                    updates.battlePass = bp;
                                }
                                if (Object.keys(updates).length > 0) {
                                    AuthManager.getDb().collection('users').doc(user.uid).set(updates, { merge: true }).catch(console.error);
                                }
                            });
                        }
                    }
                }
            }
        } catch (e) { console.error('[History] Error:', e); }

        // ── Compute settlement mode BEFORE clearing flags ─────────────────────
        const _settlementMode = (() => {
            const isRanked = localStorage.getItem('isRankedMatch') === 'true';
            const isBotRanked = localStorage.getItem('isBotRankedMatch') === 'true';
            const isCompetitive = localStorage.getItem('fromCompetitiveMode') === 'true';
            const gMode = localStorage.getItem('gameMode');
            if (gMode === 'tutorial') return 'tutorial';
            if (isRanked) return 'ranked';
            if (isBotRanked) return 'ranked_bot';
            if (isCompetitive) return 'casual';
            if (gMode === 'online' || (typeof GameState !== 'undefined' && GameState.mode === 'online')) return 'friend';
            return 'pve';
        })();

        // Clean up ranked/bot flags
        localStorage.removeItem('isRankedMatch');
        localStorage.removeItem('isBotRankedMatch');
        localStorage.removeItem('myRankedInfo');
        localStorage.removeItem('botMatchName');

        // ── Compute MVP data ─────────────────────────────────────────────────
        const mvpData = _computeMVP();

        // ── Show victory flash, then open Settlement overlay ─────────────────
        return new Promise(resolve => {
            const isStory = typeof GameState !== 'undefined' && GameState.mode === 'story';
            const finish = () => {
                resolve();

                // Story mode: keep original finish flow
                if (isStory) {
                    if (typeof window.finishStoryBattle === 'function') {
                        window.finishStoryBattle();
                    }
                    return;
                }

                // Show new settlement UI
                if (typeof GameSettlement !== 'undefined') {
                    GameSettlement.show(winner, {
                        iWon: iWonFinal,
                        rankedDescription: window._settlementRankedDesc || '',
                        rankedNewState: window._settlementRankedState || null,
                        expGained: expGained,
                        passExpGained: passExpGained,
                        mvpData: mvpData,
                        mode: _settlementMode
                    });
                    delete window._settlementRankedDesc;
                    delete window._settlementRankedState;
                    delete window._settlementTitleUnlocked;
                } else {
                    location.href = 'index.html';
                }
            };
            if (window.SignatureMotion) {
                window.SignatureMotion.outcome(winner, viewerWon).then(finish);
            } else {
                this.show();
                const safeWinner = String(winner).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
                this.container.innerHTML = `<div class="ink-result${viewerWon ? '' : ' is-loss'}"><small>FINAL PAGE / 對戰終章</small><strong>${viewerWon ? 'WIN!' : 'LOSE'}</strong><b>${safeWinner} 勝利！</b></div>`;
                setTimeout(() => { this.hide(); finish(); }, 2000);
            }
        });
    },


    // Small in-battle title unlock notification
    showSmallTitleUnlock(titleKey) {
        if (typeof RankedSystem === 'undefined') return;
        const info = RankedSystem.getTitleInfo(titleKey);
        if (!info) return;

        const toast = document.createElement('div');
        toast.className = 'title-toast';
        toast.innerHTML = `
            <img src="${info.img}" class="title-toast-img">
            <div class="title-toast-content">
                <div class="title-toast-label">獲得稱號！</div>
                <div class="title-toast-name">${titleKey}</div>
            </div>
        `;

        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 5500);
    }
};

// ── MVP 計算輔助函數 ───────────────────────────────────────────────────────────
function _computeMVP() {
    if (typeof GameState === 'undefined') return {};

    const getMVP = (playerKey) => {
        const p = GameState[playerKey];
        if (!p) return null;
        const all = [
            ...(p.allCards || []),
            ...(p.standbyCards || [])
        ];
        if (p.battleCard) all.push(p.battleCard);

        // 去重（可能 battleCard 也在 allCards）
        const seen = new Set();
        const unique = all.filter(c => {
            if (!c || seen.has(c)) return false;
            seen.add(c);
            return true;
        });

        if (unique.length === 0) return null;
        return unique.reduce((best, c) => {
            const turns = c.turnsOnField || 0;
            return (turns > (best?.turnsOnField || 0)) ? c : best;
        }, null);
    };

    const role = window.localOnlineRole || localStorage.getItem('onlineRole');
    let myKey = 'player1';
    let oppKey = 'player2';
    if (GameState.mode === 'online' && role === 'join') {
        myKey = 'player2';
        oppKey = 'player1';
    }

    return {
        mine: getMVP(myKey),
        opponent: getMVP(oppKey)
    };
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => Animations.init());
