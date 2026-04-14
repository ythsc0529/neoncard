// ========== NEON CARD GAME - ANIMATION SYSTEM ==========

const Animations = {
    container: null,

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

    // Coin flip animation — 3D redesign
    async coinFlip(forcedResult = null) {
        return new Promise(resolve => {
            this.show();
            // If forcedResult is provided, use it. Otherwise, use Window.GameRNG or Math.random
            const result = forcedResult !== null ? forcedResult : (window.GameRNG ? (window.GameRNG.nextBoolean() ? 1 : 2) : (window.GameRandom() < 0.5 ? 1 : 2));

            const name1 = (typeof GameState !== 'undefined' && GameState.player1?.name) ? GameState.player1.name : '玩家 1';
            const name2 = (typeof GameState !== 'undefined' && GameState.player2?.name) ? GameState.player2.name : '玩家 2';

            // coinToss3D ends at rotateX(3600deg) — front face showing (even multiples of 360).
            // We force the coin to show the correct face by setting a final rotation:
            // Front face (player 1) = rotateX(3600deg), back face (player 2) = rotateX(3780deg).
            // We do this by overriding the animation end via a CSS custom property on the element,
            // then applying a final static transform after the animation ends.
            const finalRotation = result === 1 ? 3600 : 3780; // 3780 = 3600+180 → back face

            this.container.innerHTML = `
                <div class="coin-stage">
                    <!-- Player VS row -->
                    <div class="coin-vs-row">
                        <div class="coin-player p1" id="coinP1">${name1}</div>
                        <div class="coin-vs-label">VS</div>
                        <div class="coin-player p2" id="coinP2">${name2}</div>
                    </div>

                    <!-- 3-D coin -->
                    <div class="coin-3d-wrap">
                        <div class="coin-3d tossing" id="coin3d">
                            <!-- Front face = Player 1 -->
                            <div class="coin-face coin-front">
                                <div class="coin-face-rim"></div>
                                <span class="coin-face-num">1</span>
                            </div>
                            <!-- Back face = Player 2 -->
                            <div class="coin-face coin-back">
                                <div class="coin-face-rim"></div>
                                <span class="coin-face-num">2</span>
                            </div>
                        </div>
                    </div>

                    <!-- Result -->
                    <div class="coin-result" id="coinResult">
                        <span class="coin-result-name"
                              style="color:${result === 1 ? 'var(--neon-cyan)' : 'var(--neon-magenta)'}">
                            ${result === 1 ? name1 : name2}
                        </span>
                        <span class="coin-result-label">先手出擊！</span>
                    </div>
                </div>
            `;

            const coinEl = document.getElementById('coin3d');
            const resultEl = document.getElementById('coinResult');
            const p1El = document.getElementById('coinP1');
            const p2El = document.getElementById('coinP2');

            // After the toss animation ends, snap to exact face & fire land glow
            setTimeout(() => {
                if (!coinEl) return;
                // Set inline transform FIRST so there's no snap-back flicker
                coinEl.style.transform = `rotateX(${finalRotation}deg)`;
                coinEl.style.transition = 'none'; // no transition for the snap
                // Small rAF to let the browser commit the inline style before removing the animation
                requestAnimationFrame(() => {
                    coinEl.classList.remove('tossing');
                    coinEl.classList.add('landed');
                });

                // Highlight winner player badge
                if (p1El && p2El) {
                    (result === 1 ? p1El : p2El).classList.add('winner');
                }

                // Reveal result text slightly after
                setTimeout(() => {
                    if (resultEl) resultEl.classList.add('show');
                }, 150);
            }, 2400);

            // Auto-close
            setTimeout(() => {
                this.hide();
                resolve(result);
            }, 4000);
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

    // Probability roll animation — arc-gauge redesign
    async probabilityRoll(chance, description = '') {
        return new Promise(resolve => {
            try {
                this.show();
                // Decide result NOW so the gauge sweep aims for the correct zone
                const rolled = Math.floor(window.GameRandom() * 100) + 1; // 1-100
                const success = rolled <= chance;

                // ── SVG arc helpers ──────────────────────────────────────────
                // Full circle circumference for r=66: 2π×66 ≈ 414.7  → use 419 (slight gap)
                const R = 66, CX = 110, CY = 110;
                const CIRC = 2 * Math.PI * R;   // ≈ 414.7

                // dashoffset for a given 0-100 value (0% = full circle hidden → sweeping CW)
                const offsetFor = v => CIRC - (v / 100) * CIRC;

                // Threshold marker: angle on circle for `chance`%
                const threshAngle = (chance / 100) * 360 - 90; // start from top
                const threshRad = (threshAngle * Math.PI) / 180;
                const tx1 = CX + (R - 12) * Math.cos(threshRad);
                const ty1 = CY + (R - 12) * Math.sin(threshRad);
                const tx2 = CX + (R + 12) * Math.cos(threshRad);
                const ty2 = CY + (R + 12) * Math.sin(threshRad);

                // Arc fill colour: cyan during roll → green or red on result
                const fillColor = success ? '#0aff68' : '#ff4466';
                const glowColor = success ? '10,255,104' : '255,68,102';

                // dashoffset for rolled value (animation end point)
                const endOffset = offsetFor(rolled);

                this.container.innerHTML = `
                    <div class="prob-panel">
                        <div class="prob-skill-name">機率判定</div>
                        <div class="prob-header">${description || '擲骰判定'}</div>

                        <div class="prob-gauge-wrap">
                            <svg width="220" height="220" viewBox="0 0 220 220">
                                <!-- Background track -->
                                <circle id="probTrack"
                                    cx="${CX}" cy="${CY}" r="${R}"
                                    fill="none"
                                    stroke="rgba(255,255,255,0.07)"
                                    stroke-width="14"
                                    stroke-linecap="round"
                                />
                                <!-- Fill arc -->
                                <circle id="probArc"
                                    cx="${CX}" cy="${CY}" r="${R}"
                                    fill="none"
                                    stroke="#00f3ff"
                                    stroke-width="14"
                                    stroke-linecap="round"
                                    stroke-dasharray="${CIRC.toFixed(2)}"
                                    stroke-dashoffset="${CIRC.toFixed(2)}"
                                    transform="rotate(-90 ${CX} ${CY})"
                                    style="filter: drop-shadow(0 0 8px #00f3ff);"
                                />
                                <!-- Threshold tick mark -->
                                <line id="probThresh"
                                    x1="${tx1.toFixed(1)}" y1="${ty1.toFixed(1)}"
                                    x2="${tx2.toFixed(1)}" y2="${ty2.toFixed(1)}"
                                    stroke="var(--neon-gold)"
                                    stroke-width="3"
                                    stroke-linecap="round"
                                    opacity="0"
                                />
                                <!-- Threshold label -->
                                <text id="probThreshLabel"
                                    x="${CX}" y="200"
                                    text-anchor="middle"
                                    fill="rgba(255,215,0,0.7)"
                                    font-size="11"
                                    font-family="Outfit, sans-serif"
                                    font-weight="600"
                                    letter-spacing="1"
                                    opacity="0"
                                >${chance}% 門檻</text>
                            </svg>

                            <!-- Centre readout -->
                            <div class="prob-center-text">
                                <span class="prob-roll-num" id="probNum">--</span>
                                <span class="prob-roll-label" id="probNumLabel">擲骰中</span>
                            </div>
                        </div>

                        <!-- Threshold info row -->
                        <div class="prob-threshold">需 ≤ <span>${chance}</span> 方可通過</div>

                        <!-- Result badge (hidden until reveal) -->
                        <div class="prob-result-badge" id="probBadge">
                            ${success ? '✓ 判定通過' : '✗ 判定失敗'}
                        </div>
                    </div>
                `;

                const arcEl = document.getElementById('probArc');
                const numEl = document.getElementById('probNum');
                const labelEl = document.getElementById('probNumLabel');
                const threshEl = document.getElementById('probThresh');
                const threshLblEl = document.getElementById('probThreshLabel');
                const badgeEl = document.getElementById('probBadge');
                const gaugeWrap = this.container.querySelector('.prob-gauge-wrap');

                if (!arcEl || !numEl) {
                    this.hide();
                    resolve(success);
                    return;
                }

                // ── Phase 1: Rolling numbers (0 → 1000 ms) ───────────────────
                const rollDuration = 1000;
                const rollStart = Date.now();

                const rollLoop = () => {
                    const elapsed = Date.now() - rollStart;
                    if (elapsed < rollDuration) {
                        const fakeVal = Math.floor(Math.random() * 100) + 1;
                        numEl.textContent = fakeVal;
                        // Animate arc to fake value — use setAttribute for SVG compat
                        arcEl.setAttribute('stroke-dashoffset', offsetFor(fakeVal));
                        arcEl.style.transition = 'stroke-dashoffset 0.08s linear';
                        requestAnimationFrame(rollLoop);
                    } else {
                        // ── Phase 2: Slow-down sweep to real value ──
                        numEl.textContent = rolled;
                        arcEl.style.transition =
                            'stroke-dashoffset 0.55s cubic-bezier(0.22,1,0.36,1), ' +
                            'stroke 0.35s ease, filter 0.35s ease';
                        arcEl.setAttribute('stroke-dashoffset', endOffset);
                        arcEl.style.stroke = fillColor;
                        arcEl.style.filter = `drop-shadow(0 0 10px ${fillColor})`;

                        numEl.className = `prob-roll-num ${success ? 'success-color' : 'fail-color'}`;
                        labelEl.textContent = rolled <= chance ? '通過' : '未通過';

                        // Show threshold marker
                        setTimeout(() => {
                            threshEl.style.transition = 'opacity 0.3s';
                            threshEl.style.opacity = '1';
                            threshLblEl.style.transition = 'opacity 0.3s';
                            threshLblEl.style.opacity = '1';
                        }, 200);

                        // ── Phase 3: Result badge + particles (after sweep) ──
                        setTimeout(() => {
                            // Show badge
                            badgeEl.className = `prob-result-badge ${success ? 'success' : 'fail'}`;
                            badgeEl.style.display = 'flex';

                            // Particle burst
                            const PARTICLE_COUNT = 18;
                            const pColors = success
                                ? ['#0aff68', '#00f3ff', '#ffffff', '#80ffb4']
                                : ['#ff4466', '#ff0055', '#ffcc44', '#ff8888'];
                            for (let i = 0; i < PARTICLE_COUNT; i++) {
                                const p = document.createElement('div');
                                p.className = 'prob-particle';
                                const angle = (i / PARTICLE_COUNT) * 360;
                                const dist = 60 + Math.random() * 60;
                                const rad = (angle * Math.PI) / 180;
                                const px = Math.cos(rad) * dist;
                                const py = Math.sin(rad) * dist;
                                p.style.setProperty('--px', px + 'px');
                                p.style.setProperty('--py', py + 'px');
                                p.style.background = pColors[i % pColors.length];
                                p.style.boxShadow = `0 0 6px ${pColors[i % pColors.length]}`;
                                p.style.width = (4 + Math.random() * 6) + 'px';
                                p.style.height = p.style.width;
                                gaugeWrap.style.position = 'relative';
                                gaugeWrap.appendChild(p);
                                setTimeout(() => p.remove(), 900);
                            }
                        }, 600);
                    }
                };
                requestAnimationFrame(rollLoop);

                // ── Auto-close ───────────────────────────────────────────────
                setTimeout(() => {
                    this.hide();
                    resolve(success);
                }, 2800);

            } catch (e) {
                console.error("Animation Error:", e);
                this.hide();
                resolve(window.GameRandom() * 100 < chance);
            }
        });
    },

    // Random Number Roll
    async showRandomNumber(min, max, description = '') {
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
                                p.className = 'prob-particle'; // reuse prob-particle css
                                const angle = (i / PARTICLE_COUNT) * 360;
                                const dist = 40 + Math.random() * 40;
                                const rad = (angle * Math.PI) / 180;
                                const px = Math.cos(rad) * dist;
                                const py = Math.sin(rad) * dist;
                                p.style.setProperty('--px', px + 'px');
                                p.style.setProperty('--py', py + 'px');
                                p.style.background = pColors[i % pColors.length];
                                p.style.boxShadow = `0 0 6px ${pColors[i % pColors.length]}`;
                                p.style.width = (3 + Math.random() * 5) + 'px';
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

    // Card draw sequence
    async drawCards(cards) {
        return new Promise(resolve => {
            this.show();

            let html = '<div class="card-draw-area">';
            cards.forEach((card, i) => {
                html += `
                    <div class="draw-card ${getRarityClass(card.rarity)}" data-card-index="${i}">
                        <div class="card-front">
                            <div style="font-size: 0.9rem; margin-bottom: 5px;">${getRarityName(card.rarity)}</div>
                            <div style="font-size: 1.2rem; font-weight: bold; margin-bottom: 10px;">${card.name}</div>
                            <div style="font-size: 0.8rem;">HP: ${card.hp}</div>
                            <div style="font-size: 0.8rem;">ATK: ${card.atk}</div>
                        </div>
                        <div class="card-back"></div>
                    </div>
                `;
            });
            html += '</div>';
            html += '<p style="text-align: center; margin-top: 30px; color: var(--text-secondary);">點擊關閉</p>';

            this.container.innerHTML = html;

            // Flip cards one by one
            cards.forEach((_, i) => {
                setTimeout(() => {
                    const card = document.querySelector(`[data-card-index="${i}"]`);
                    if (card) {
                        card.classList.add('flipping');
                        setTimeout(() => {
                            card.classList.remove('flipping');
                            card.classList.add('revealed');
                        }, 300);
                    }
                }, i * 400 + 500);
            });

            // Click to close
            this.container.onclick = () => {
                this.container.onclick = null;
                this.hide();
                resolve();
            };
        });
    },

    // Revive animation
    async reviveEffect(charName) {
        return new Promise(resolve => {
            this.show();

            this.container.innerHTML = `
                <div style="text-align: center;">
                    <div class="revive-effect">
                        <div style="font-size: 5rem; margin-bottom: 20px; animation: float 2s infinite ease-in-out;">👼</div>
                        <div style="font-size: 2.5rem; color: var(--neon-gold); text-shadow: 0 0 20px var(--neon-gold); font-weight: bold;">
                            ${charName} 復活了！
                        </div>
                    </div>
                </div>
            `;

            // Adding a small float animation style just for this if not defined globally
            const style = document.createElement('style');
            style.id = 'revive-anim-style';
            if (!document.getElementById('revive-anim-style')) {
                style.innerHTML = `
                    @keyframes float {
                        0% { transform: translateY(0px); }
                        50% { transform: translateY(-15px); }
                        100% { transform: translateY(0px); }
                    }
                `;
                document.head.appendChild(style);
            }

            // Screen shake for impact
            this.shake();

            setTimeout(() => {
                this.hide();
                resolve();
            }, 2500); // Display for 2.5 seconds
        });
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
        // Clear ranked ongoing flag so we don't get penalized since game ended naturally
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
                
                // Retry once if user is missing (e.g. state recovery delay)
                if (!user) {
                    console.warn('[Ranked] User missing at victory, retrying Auth init...');
                    AuthManager.init();
                    user = AuthManager.getCurrentUser();
                }

                if (user) {
                    let iWon = false;
                    if (isBotRankedMatch) {
                        // In bot matchmaking, we are always player 1
                        iWon = GameState.winner === 1;
                    } else {
                        const role = window.localOnlineRole || localStorage.getItem('onlineRole');
                        const myPlayer = role === 'host' ? 1 : 2;
                        iWon = GameState.winner === myPlayer;
                    }

                    // Increment stats
                    UserProfile.incrementStat(user.uid, 'ranked', iWon).catch(() => {});
                    
                    // Daily stats for missions
                    const dailyUpdates = { "dailyStats.onlineMatches": firebase.firestore.FieldValue.increment(1) };
                    if (iWon) dailyUpdates["dailyStats.onlineWins"] = firebase.firestore.FieldValue.increment(1);
                    UserProfile.updateProfile(user.uid, dailyUpdates).catch(console.error);

                    // Handle win streak for missions
                    if (iWon) {
                        UserProfile.updateProfile(user.uid, { rankedWinStreak: firebase.firestore.FieldValue.increment(1) }).catch(console.error);
                    } else {
                        UserProfile.updateProfile(user.uid, { rankedWinStreak: 0 }).catch(console.error);
                    }

                    // Get current ranked, process result
                    const profile = await UserProfile.getProfile(user.uid);
                    const currentRanked = profile?.ranked || RankedSystem.defaultRanked();
                    const { ranked: newRanked, description } = RankedSystem.processMatchResult(currentRanked, iWon);

                    // Save updated ranked
                    await UserProfile.updateRanked(user.uid, newRanked);

                    // Check title unlock (apex)
                    let titleUnlocked = null;
                    if (RankedSystem.shouldGrantApexTitle(newRanked)) {
                        const titles = profile?.titles || [];
                        if (!titles.includes(RankedSystem.SEASON.apexTitle)) {
                            await UserProfile.addTitle(user.uid, RankedSystem.SEASON.apexTitle);
                            titleUnlocked = RankedSystem.SEASON.apexTitle;
                        }
                    }

                    // Show ranked result overlay (after a short delay)
                    const overlay = document.getElementById('rankedResultOverlay');
                    if (overlay) {
                        document.getElementById('rr-icon').textContent = iWon ? '🏆' : '💀';
                        document.getElementById('rr-title').textContent = iWon ? '勝利！' : '敗北';
                        document.getElementById('rr-desc').textContent = description;
                        document.getElementById('rr-rankImg').src  = RankedSystem.getImgPath(newRanked);
                        document.getElementById('rr-rankName').textContent = RankedSystem.getDisplayName(newRanked);
                        document.getElementById('rr-rankStars').innerHTML = RankedSystem.getStarsHtml(newRanked);
                        // Title unlock section
                        const titleBlock = document.getElementById('rr-titleUnlock');
                        if (titleUnlocked) {
                            const tInfo = RankedSystem.getTitleInfo(titleUnlocked);
                            document.getElementById('rr-titleImg').src = tInfo?.img || '';
                            document.getElementById('rr-titleName').textContent = titleUnlocked;
                            titleBlock.style.display = 'block';
                        } else {
                            titleBlock.style.display = 'none';
                        }
                        
                        rankedProcessed = true;
                        setTimeout(() => {
                            this.hide(); // Bug 4 Fix: Hide victory overlay before showing ranked result
                            overlay.classList.add('active');
                        }, 1800);
                    }
                } else {
                    console.error('[Ranked] Skipping processing: No user found even after retry.');
                }
            } catch (e) {
                console.error('[Ranked] Failed to process match result:', e);
            }
        }

        // Track win/loss in Firestore (for non-ranked modes or as backup)
        if (!isAnyRankedMatch || !rankedProcessed) {
            try {
                if (typeof AuthManager !== 'undefined' && typeof UserProfile !== 'undefined') {
                    const user = AuthManager.getCurrentUser();
                    if (user && typeof GameState !== 'undefined') {
                        const mode = GameState.mode;
                        let statMode = null;
                        let iWon = false;
                        if (mode === 'pve' || mode === 'story') {
                            statMode = isBotRankedMatch ? 'competitive' : 'pve';
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
                            
                            // Daily stats for missions (if online/competitive)
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

        // ── Record Match History ─────────────────────────────────────────────
        try {
            if (typeof AuthManager !== 'undefined' && typeof UserProfile !== 'undefined') {
                const user = AuthManager.getCurrentUser();
                if (user && typeof GameState !== 'undefined' && GameState.winner !== 0) {
                    let iWon = false;
                    let oppName = '';
                    let oppUid = '';
                    let matchMode = GameState.mode;

                    const isRanked = localStorage.getItem('isRankedMatch') === 'true' || localStorage.getItem('isBotRankedMatch') === 'true';
                    
                    if (localStorage.getItem('isBotRankedMatch') === 'true') {
                        iWon = GameState.winner === 1;
                        oppName = localStorage.getItem('botMatchName') || '機器人';
                        oppUid = 'NPC_' + oppName;
                        matchMode = 'ranked';
                    } else if (localStorage.getItem('isRankedMatch') === 'true') {
                        const role = window.localOnlineRole || localStorage.getItem('onlineRole');
                        const myPlayer = (role === 'host') ? 1 : 2;
                        iWon = GameState.winner === myPlayer;
                        oppName = role === 'host' ? GameState.player2.name : GameState.player1.name;
                        oppUid = (typeof NetManager !== 'undefined' && NetManager.opponentUid) || 'unknown';
                        matchMode = 'ranked';
                    } else if (GameState.mode === 'online') {
                        const role = window.localOnlineRole || localStorage.getItem('onlineRole');
                        const myPlayer = (role === 'host') ? 1 : 2;
                        iWon = GameState.winner === myPlayer;
                        oppName = role === 'host' ? GameState.player2.name : GameState.player1.name;
                        oppUid = (typeof NetManager !== 'undefined' && NetManager.opponentUid) || 'unknown';
                    } else {
                        // PvE / Story
                        iWon = GameState.winner === 1;
                        oppName = GameState.player2.name;
                        oppUid = 'NPC_' + oppName;
                    }

                    if (oppName && oppUid) {
                        UserProfile.recordMatch(user.uid, {
                            opponentName: oppName,
                            opponentUid: oppUid,
                            mode: matchMode,
                            result: iWon ? 'win' : 'loss'
                        });

                        // ── Grant EXP & Pass EXP ──
                        let levelExp = 0;
                        let passExp = iWon ? 30 : 15; // Any mode grants pass points
                        
                        if (matchMode === 'story') {
                            if (iWon) levelExp = 60; // 劇情通關+60
                        } else if (matchMode === 'pve' || oppUid.startsWith('NPC_')) {
                            // "跟NPC對戰經驗值減半(NPC對戰=0exp)" - user previously indicated 0 for offline/NPC
                            levelExp = 0; 
                        } else {
                            // PvP / Ranked
                            levelExp = iWon ? 50 : 25;
                        }

                        if (levelExp > 0 || passExp > 0) {
                            // Load profile and apply
                            UserProfile.getProfile(user.uid).then(p => {
                                if (!p) return;
                                
                                const updates = {};
                                
                                if (levelExp > 0) {
                                    updates.exp = (p.exp || 0) + levelExp;
                                }

                                if (passExp > 0) {
                                    const bp = p.battlePass || { points: 0, premiumActive: false, claimed: { free: [], premium: [] } };
                                    bp.points = (bp.points || 0) + passExp;
                                    updates.battlePass = bp;
                                }
                                
                                if (Object.keys(updates).length > 0) {
                                    // Update Firestore
                                    AuthManager.getDb().collection('users').doc(user.uid).set(updates, { merge: true }).catch(console.error);
                                }
                            });
                        }
                    }
                }
            }
        } catch (e) { console.error('[History] Error:', e); }

        // Clean up ranked/bot flags after all recording is done
        localStorage.removeItem('isRankedMatch');
        localStorage.removeItem('isBotRankedMatch');
        localStorage.removeItem('myRankedInfo');
        localStorage.removeItem('botMatchName');
        localStorage.removeItem('isBotRankedMatch'); // Redundant? No harm.

        return new Promise(resolve => {
            this.show();

            const isStory = typeof GameState !== 'undefined' && GameState.mode === 'story';
            const isOnline = typeof GameState !== 'undefined' && GameState.mode === 'online';

            let btnAction = isStory ? "finishStoryBattle()" : "location.href='index.html'";
            let btnText = isStory ? "繼續" : "返回主選單";
            let secondaryBtnContent = '';

            if (isOnline && !isAnyRankedMatch) {
                const isComp = localStorage.getItem('fromCompetitiveMode') === 'true';
                if (isComp) {
                    btnAction = "location.href='index.html'";
                    btnText = "返回主選單";
                } else {
                    const localRole = window.localOnlineRole || localStorage.getItem('onlineRole');
                    if (localRole === 'host') {
                        btnAction = "window.isRematching = true; let nextRoom = typeof NetManager !== 'undefined' ? NetManager.generateShortId() : Math.random().toString(36).substr(2, 4).toUpperCase(); sessionStorage.setItem('last_host_room_id', nextRoom); NetManager.sendAction({ type: 'lobby_rematch', newRoomId: nextRoom }); setTimeout(() => window.location.reload(), 200);";
                        btnText = "與對手重新開始（聯機）";
                        secondaryBtnContent = '<div style="margin-top: 15px;"><button class="btn btn-magenta" onclick="location.href=\'index.html\'">退出連線大廳</button></div>';
                    } else {
                        btnAction = "location.href='index.html'";
                        btnText = "退出連線大廳";
                        secondaryBtnContent = '<p style="color:var(--neon-gold); font-size:1.1rem; margin-top:20px; text-shadow:none;">等待房主決定是否重新開始...</p>';
                    }
                }
            }

            this.container.innerHTML = `
                <div style="text-align: center;">
                    <div style="font-size: 5rem; margin-bottom: 30px;">🏆</div>
                    <div style="font-size: 3rem; color: var(--neon-gold); text-shadow: 0 0 30px var(--neon-gold);">
                        ${winner} 勝利！
                    </div>
                    <div id="victoryActions" class="victory-btn-container">
                        ${!isAnyRankedMatch ? `<button class="btn btn-gold" style="margin-top: 40px;" onclick="${btnAction}">${btnText}</button>${secondaryBtnContent}` : '<p style="color:var(--text-muted);font-size:0.9rem;margin-top:30px;">計算段位中...</p>'}
                    </div>
                </div>
            `;

            // Safety check: If ranked match but no overlay appears after 5.5s, show the exit button
            if (isAnyRankedMatch) {
                setTimeout(() => {
                    const overlay = document.getElementById('rankedResultOverlay');
                    const actionsDiv = document.getElementById('victoryActions');
                    if (overlay && !overlay.classList.contains('active') && actionsDiv) {
                        console.warn('[Ranked] Settlement UI timeout, showing recovery button.');
                        actionsDiv.innerHTML = `<button class="btn btn-gold" style="margin-top: 40px;" onclick="location.href='index.html'">返回主選單 (結算超時)</button>`;
                    }
                }, 5500);
            }

            setTimeout(resolve, 1000);
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

// Initialize on load
document.addEventListener('DOMContentLoaded', () => Animations.init());
