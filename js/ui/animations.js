// ========== NEON CARD GAME - ANIMATION SYSTEM ==========

const Animations = {
    container: null,

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

    // Coin flip animation
    async coinFlip() {
        return new Promise(resolve => {
            this.show();
            const result = Math.random() < 0.5 ? 1 : 2;

            this.container.innerHTML = `
                <div style="text-align: center;">
                    <div class="coin flipping" id="coin">
                        <span id="coinFace">?</span>
                    </div>
                    <p style="margin-top: 30px; font-size: 1.5rem; opacity: 0;" id="coinResult">
                        ${result === 1 ? '玩家1' : '玩家2'} 先手！
                    </p>
                </div>
            `;

            setTimeout(() => {
                const face = document.getElementById('coinFace');
                if (face) face.textContent = result;
                const res = document.getElementById('coinResult');
                if (res) res.style.opacity = '1';
                const coin = document.getElementById('coin');
                if (coin) coin.classList.remove('flipping');
            }, 2000);

            setTimeout(() => {
                this.hide();
                resolve(result);
            }, 3500);
        });
    },

    // Dice roll animation
    async diceRoll() {
        return new Promise(resolve => {
            this.show();
            const result = Math.floor(Math.random() * 6) + 1;

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

    // Probability roll animation
    async probabilityRoll(chance, description = '') {
        return new Promise(resolve => {
            try {
                this.show();
                const success = Math.random() * 100 < chance;

                this.container.innerHTML = `
                    <div class="probability-container glass">
                        <div class="probability-title">${description || '機率判定'}</div>
                        <div class="probability-display" id="probDisplay">
                            <span id="probNumber">0</span>%
                        </div>
                        <div class="probability-result" id="probResult" style="opacity: 0;">
                            ${success ? '✓ 成功！' : '✗ 失敗'}
                        </div>
                        <div style="margin-top: 10px; color: #888; font-size: 0.9rem;">
                            目標: < ${chance}%
                        </div>
                    </div>
                `;

                const probElement = document.getElementById('probNumber');
                if (!probElement) {
                    this.hide();
                    resolve(success);
                    return;
                }

                let duration = 1500;
                let startTime = Date.now();

                const animate = () => {
                    const elapsed = Date.now() - startTime;
                    if (elapsed < duration) {
                        probElement.textContent = Math.floor(Math.random() * 100);
                        requestAnimationFrame(animate);
                    } else {
                        probElement.textContent = success ? Math.floor(Math.random() * (chance - 1)) : Math.floor(Math.random() * (100 - chance)) + chance;
                        // Use actual random number logic for display if we want to be precise, but simple visual success/fail is better.
                        // Actually, just show "Pass" or "Fail" text or color.
                        probElement.textContent = success ? 'PASS' : 'FAIL';
                        probElement.style.fontSize = '2rem';

                        const resultEl = document.getElementById('probResult');
                        if (resultEl) {
                            resultEl.style.opacity = '1';
                            resultEl.textContent = success ? '判定通過' : '判定失敗';
                            resultEl.className = `probability-result ${success ? 'success' : 'fail'}`;
                            resultEl.style.color = success ? 'var(--neon-green)' : 'var(--neon-red)';
                            resultEl.style.textShadow = `0 0 10px ${success ? 'var(--neon-green)' : 'var(--neon-red)'}`;
                            resultEl.style.transform = 'scale(1.2)';
                            resultEl.style.transition = 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                        }
                    }
                };
                requestAnimationFrame(animate);

                setTimeout(() => {
                    this.hide();
                    resolve(success);
                }, 2500);
            } catch (e) {
                console.error("Animation Error:", e);
                this.hide();
                resolve(Math.random() * 100 < chance); // Fallback
            }
        });
    },

    // Random Number Roll
    async showRandomNumber(min, max, description = '') {
        return new Promise(resolve => {
            try {
                this.show();
                const result = Math.floor(Math.random() * (max - min + 1)) + min;

                this.container.innerHTML = `
                    <div class="probability-container glass">
                        <div class="probability-title">${description || '隨機數值'}</div>
                        <div class="probability-display" id="randDisplay" style="font-family: 'Courier New', monospace;">
                            <span id="randNumber">${min}</span>
                        </div>
                        <div class="probability-result" id="randResult" style="opacity: 0;">
                            結果: ${result}
                        </div>
                    </div>
                `;

                const el = document.getElementById('randNumber');
                if (!el) {
                    this.hide();
                    resolve(result);
                    return;
                }

                let duration = 1500;
                let startTime = Date.now();

                const animate = () => {
                    const elapsed = Date.now() - startTime;
                    if (elapsed < duration) {
                        // Slow down effect: only update every few frames as we get closer?
                        // Simple random update for now
                        el.textContent = Math.floor(Math.random() * (max - min + 1)) + min;
                        requestAnimationFrame(animate);
                    } else {
                        el.textContent = result;
                        el.style.color = 'var(--neon-gold)';
                        el.style.transform = 'scale(1.5)';
                        el.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                        el.style.display = 'inline-block';

                        const resultEl = document.getElementById('randResult');
                        if (resultEl) resultEl.style.opacity = '1';
                    }
                };
                requestAnimationFrame(animate);

                setTimeout(() => {
                    this.hide();
                    resolve(result);
                }, 2500);
            } catch (e) {
                console.error("Animation Error:", e);
                this.hide();
                resolve(Math.floor(Math.random() * (max - min + 1)) + min); // Fallback
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

    // Show damage number
    showDamage(element, damage, isHeal = false) {
        const num = document.createElement('div');
        num.className = `floating-number ${isHeal ? 'heal' : 'damage'}`;
        num.textContent = (isHeal ? '+' : '-') + damage;

        const rect = element.getBoundingClientRect();
        num.style.left = rect.left + rect.width / 2 + 'px';
        num.style.top = rect.top + 'px';

        document.body.appendChild(num);

        setTimeout(() => num.remove(), 1000);
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

    // Screen shake
    shake() {
        document.body.style.animation = 'shake 0.3s';
        setTimeout(() => {
            document.body.style.animation = '';
        }, 300);
    },

    // Victory animation
    async victory(winner) {
        return new Promise(resolve => {
            this.show();

            this.container.innerHTML = `
                <div style="text-align: center;">
                    <div style="font-size: 5rem; margin-bottom: 30px;">🏆</div>
                    <div style="font-size: 3rem; color: var(--neon-gold); text-shadow: 0 0 30px var(--neon-gold);">
                        ${winner} 勝利！
                    </div>
                    <button class="btn btn-gold" style="margin-top: 40px;" onclick="location.href='index.html'">
                        返回主選單
                    </button>
                </div>
            `;

            setTimeout(resolve, 1000);
        });
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => Animations.init());
