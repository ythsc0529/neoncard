/**
 * NeonCard Game - Settlement System
 * 
 * 結算畫面系統：根據遊戲模式顯示不同的多步驟結算流程
 * 
 * 模式判斷：
 * - friend:  好友連線 (mode=online, fromCompetitiveMode != true)
 * - pve:     人機對戰 (mode=pve, fromCompetitiveMode != true)
 * - casual:  休閒匹配 (fromCompetitiveMode=true, isRankedMatch!=true, isBotRankedMatch!=true)
 * - ranked:  排位匹配 (isRankedMatch=true 或 isBotRankedMatch=true)
 */
const GameSettlement = (() => {
    // ── 狀態 ──────────────────────────────────────────────────────────
    let _currentStep = 0;
    let _steps = [];
    let _context = {};
    let _rematchCountdownTimer = null;
    let _rematchAutoExitTimer = null;
    let _myVoted = false;
    let _opponentVoted = false;
    let _countdownTimer = null;

    // ── 公開 API ──────────────────────────────────────────────────────

    /**
     * 顯示結算畫面
     * @param {string} winnerName - 勝利方名稱
     * @param {object} opts - 選項: { iWon, rankedDescription, rankedNewState, expGained, mvpData, mode }
     */
    function show(winnerName, opts = {}) {
        _currentStep = 0;
        _myVoted = false;
        _opponentVoted = false;

        // 判斷遊戲模式（優先使用傳入的 mode，否則自動偵測）
        const mode = opts.mode || _detectMode();

        // 建構步驟清單
        _steps = _buildSteps(mode, winnerName, opts);
        _context = { mode, winnerName, opts };

        // 顯示 overlay
        const overlay = document.getElementById('settlementOverlay');
        if (overlay) {
            overlay.classList.add('active');
            _renderStep(0);
        }
    }

    /** 接收對方再來一局投票（由 handleRemoteAction 呼叫） */
    function onOpponentRematchVote() {
        _opponentVoted = true;
        _updateRematchUI();
        if (_myVoted) {
            _startRematchCountdown();
        }
    }

    /** 接收對方拒絕/離開（由 handleRemoteAction 呼叫） */
    function onOpponentLeft() {
        if (_rematchCountdownTimer) clearInterval(_rematchCountdownTimer);
        if (_rematchAutoExitTimer) clearTimeout(_rematchAutoExitTimer);
        _showOpponentLeftMessage();
    }

    // ── 模式判斷 ──────────────────────────────────────────────────────

    function _detectMode() {
        const gameMode = localStorage.getItem('gameMode');
        const isRanked = localStorage.getItem('isRankedMatch') === 'true';
        const isBotRanked = localStorage.getItem('isBotRankedMatch') === 'true';
        const isCompetitive = localStorage.getItem('fromCompetitiveMode') === 'true';
        const onlineSubMode = localStorage.getItem('onlineSubMode') || '';

        if (isRanked) return 'ranked';         // 排位對真人
        if (isBotRanked) return 'ranked_bot';  // 排位匹配到bot（用排位流程）
        if (isCompetitive) return 'casual';    // 休閒匹配（含bot fallback）
        if (gameMode === 'online') return 'friend'; // 好友連線
        return 'pve';                          // 一般人機
    }

    // ── 步驟建構 ──────────────────────────────────────────────────────

    function _buildSteps(mode, winnerName, opts) {
        const steps = [];

        // 步驟1：勝敗 (所有模式)
        steps.push({ type: 'result', mode });

        // 步驟2：經驗值 (所有模式)
        steps.push({ type: 'exp' });

        // 步驟3：MVP (所有模式)
        steps.push({ type: 'mvp' });

        // 步驟4：按鈕 (依模式)
        if (mode === 'friend') {
            steps.push({ type: 'friend_action' });
        } else if (mode === 'pve') {
            steps.push({ type: 'pve_action' });
        } else if (mode === 'casual') {
            steps.push({ type: 'casual_action' });
        } else if (mode === 'ranked' || mode === 'ranked_bot') {
            steps.push({ type: 'ranked_action' });
        }

        return steps;
    }

    // ── 步驟渲染 ──────────────────────────────────────────────────────

    function _renderStep(index) {
        const step = _steps[index];
        const body = document.getElementById('settlementBody');
        if (!body || !step) return;

        body.style.opacity = '0';
        setTimeout(() => {
            body.innerHTML = _generateStepHTML(step);
            body.style.opacity = '1';
        }, 200);
    }

    function _generateStepHTML(step) {
        switch (step.type) {
            case 'result':   return _htmlResult(step);
            case 'exp':      return _htmlExp();
            case 'mvp':      return _htmlMVP();
            case 'friend_action':  return _htmlFriendAction();
            case 'pve_action':     return _htmlPveAction();
            case 'casual_action':  return _htmlCasualAction();
            case 'ranked_action':  return _htmlRankedAction();
            default: return '<div>Unknown step</div>';
        }
    }

    // ── Step 1: 勝敗結果 ─────────────────────────────────────────────

    function _htmlResult(step) {
        const { mode } = step;
        const iWon = _context.opts.iWon;
        const rankedDesc = _context.opts.rankedDescription || '';
        const rankedState = _context.opts.rankedNewState;

        const bigIcon = iWon ? '🏆' : '💀';
        const resultText = iWon ? '勝利！' : '敗北';
        const resultColor = iWon ? 'var(--neon-gold)' : '#ff4466';
        const resultGlow = iWon ? 'var(--neon-gold)' : '#ff4466';

        let rankedSection = '';
        if ((mode === 'ranked' || mode === 'ranked_bot') && rankedState && typeof RankedSystem !== 'undefined') {
            const newRankedHTML = RankedSystem.getStarsHtml(rankedState);
            const newRankedName = RankedSystem.getDisplayName(rankedState);
            const newRankedImg = RankedSystem.getImgPath(rankedState);

            const changeColor = iWon ? 'var(--neon-green)' : '#ff4466';
            const descText = rankedDesc || '';

            rankedSection = `
                <div class="stl-ranked-section">
                    <div class="stl-rank-change" style="color:${changeColor};">${descText}</div>
                    <div class="stl-rank-display">
                        <img src="${newRankedImg}" class="stl-rank-img" alt="rank">
                        <div>
                            <div class="stl-rank-name">${newRankedName}</div>
                            <div class="stl-rank-stars">${newRankedHTML}</div>
                        </div>
                    </div>
                </div>`;
        }

        return `
            <div class="stl-result-wrap">
                <div class="stl-result-icon">${bigIcon}</div>
                <div class="stl-result-text" style="color:${resultColor};text-shadow:0 0 30px ${resultGlow};">
                    ${resultText}
                </div>
                ${rankedSection}
                <button class="btn btn-gold stl-continue-btn" onclick="GameSettlement._nextStep()">繼續</button>
            </div>`;
    }

    // ── Step 2: 經驗值 ───────────────────────────────────────────────

    function _htmlExp() {
        const expGained = _context.opts.expGained || 0;
        const passExpGained = _context.opts.passExpGained || 0;

        let expLabel = '';
        if (expGained === 50) expLabel = '（勝利獎勵）';
        else if (expGained === 25) expLabel = '（對戰獎勵）';
        else expLabel = '（未完成對局）';

        const expColor = expGained > 0 ? 'var(--neon-cyan)' : 'var(--text-muted)';
        const passColor = passExpGained > 0 ? 'var(--neon-gold)' : 'var(--text-muted)';

        return `
            <div class="stl-exp-wrap">
                <div class="stl-exp-label">本局收益</div>

                <div class="stl-exp-row">
                    <div class="stl-exp-row-label">🎮 等級經驗</div>
                    <div class="stl-exp-value" style="color:${expColor};" id="stl-exp-counter">+0</div>
                    <div class="stl-exp-sublabel">${expLabel}</div>
                    <div class="stl-exp-bar-wrap">
                        <div class="stl-exp-bar" id="stl-exp-bar"></div>
                    </div>
                </div>

                <div class="stl-exp-row" style="margin-top:4px;">
                    <div class="stl-exp-row-label">🎫 通行證積分</div>
                    <div class="stl-exp-value" style="color:${passColor};font-size:2rem;" id="stl-pass-counter">+0</div>
                    <div class="stl-exp-bar-wrap">
                        <div class="stl-exp-bar" id="stl-pass-bar" style="background:linear-gradient(90deg,var(--neon-gold),#ffaa00);box-shadow:0 0 10px var(--neon-gold);"></div>
                    </div>
                </div>

                <button class="btn btn-gold stl-continue-btn" id="stl-exp-continue-btn" style="opacity:0.4;" disabled onclick="GameSettlement._nextStep()">繼續</button>
            </div>`;
    }

    function _animateExp(targetExp, targetPass) {
        const counter = document.getElementById('stl-exp-counter');
        const bar = document.getElementById('stl-exp-bar');
        const passCounter = document.getElementById('stl-pass-counter');
        const passBar = document.getElementById('stl-pass-bar');
        const btn = document.getElementById('stl-exp-continue-btn');
        if (!counter) return;

        const duration = 1200;
        const startTime = Date.now();

        const tick = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(1, elapsed / duration);
            const eased = 1 - Math.pow(1 - progress, 3);

            counter.textContent = '+' + Math.round(targetExp * eased);
            if (bar) bar.style.width = (eased * 100) + '%';

            if (passCounter) passCounter.textContent = '+' + Math.round(targetPass * eased);
            if (passBar) passBar.style.width = (eased * 100) + '%';

            if (progress < 1) {
                requestAnimationFrame(tick);
            } else {
                counter.textContent = '+' + targetExp;
                if (bar) bar.style.width = '100%';
                if (passCounter) passCounter.textContent = '+' + targetPass;
                if (passBar) passBar.style.width = '100%';
                if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
            }
        };

        requestAnimationFrame(tick);
    }

    // ── Step 3: MVP ──────────────────────────────────────────────────

    function _htmlMVP() {
        const mvp = _context.opts.mvpData || {};
        const myMVP = mvp.mine;
        const oppMVP = mvp.opponent;

        const myName = _getMyName();
        const oppName = _getOpponentName();

        const mvpCard = (label, playerName, cardData) => {
            if (!cardData) return `
                <div class="stl-mvp-card glass">
                    <div class="stl-mvp-side-label">${label}：${playerName}</div>
                    <div class="stl-mvp-char-name">— 無資料 —</div>
                </div>`;

            const rarityClass = typeof getRarityClass === 'function' ? getRarityClass(cardData.rarity) : '';
            return `
                <div class="stl-mvp-card glass ${rarityClass}">
                    <div class="stl-mvp-side-label">${label}：${playerName}</div>
                    <div class="stl-mvp-char-name">${cardData.name}</div>
                    <div class="stl-mvp-char-sub">上場回合：${cardData.turnsOnField || 0}</div>
                    <div class="stl-mvp-rarity">${typeof getRarityName === 'function' ? getRarityName(cardData.rarity) : ''}</div>
                </div>`;
        };

        const isLastStep = _currentStep >= _steps.length - 2;
        const continueOrNot = isLastStep ? '' : `<button class="btn btn-gold stl-continue-btn" onclick="GameSettlement._nextStep()">繼續</button>`;
        const nextLabel = '繼續';

        return `
            <div class="stl-mvp-wrap">
                <div class="stl-mvp-title">⭐ MVP 本場最佳</div>
                ${mvpCard('我方', myName, myMVP)}
                ${mvpCard('對方', oppName, oppMVP)}
                <button class="btn btn-gold stl-continue-btn" onclick="GameSettlement._nextStep()">繼續</button>
            </div>`;
    }

    // ── Step 4: 行動按鈕（依模式）────────────────────────────────────

    function _htmlFriendAction() {
        const myName = _getMyName();
        const oppName = _getOpponentName();

        // 啟動30秒自動退出倒數
        _startAutoExitCountdown(30);

        return `
            <div class="stl-action-wrap">
                <div class="stl-action-title">對局結束</div>
                <div class="stl-friend-avatars">
                    <div class="stl-avatar-box">
                        <div class="stl-avatar">👤</div>
                        <div class="stl-avatar-name">${myName}</div>
                        <div class="stl-avatar-status" id="stl-my-status">等待選擇...</div>
                    </div>
                    <div class="stl-avatar-vs">VS</div>
                    <div class="stl-avatar-box">
                        <div class="stl-avatar">👤</div>
                        <div class="stl-avatar-name">${oppName}</div>
                        <div class="stl-avatar-status" id="stl-opp-status">等待中...</div>
                    </div>
                </div>
                <div class="stl-auto-exit-bar">
                    <div class="stl-auto-exit-text">自動退出倒數：<span id="stl-auto-exit-secs">30</span> 秒</div>
                    <div class="stl-auto-exit-progress-wrap"><div class="stl-auto-exit-progress" id="stl-auto-exit-progress"></div></div>
                </div>
                <div class="stl-action-btns">
                    <button class="btn btn-gold" id="stl-rematch-btn" onclick="GameSettlement._voteRematch()">🔄 再來一局</button>
                    <button class="btn" onclick="GameSettlement._exitToLobby()">🏠 回到大廳</button>
                </div>
                <div id="stl-rematch-status" class="stl-rematch-status"></div>
            </div>`;
    }

    function _htmlPveAction() {
        return `
            <div class="stl-action-wrap">
                <div class="stl-action-title">對局結束</div>
                <div class="stl-action-btns">
                    <button class="btn btn-gold" onclick="GameSettlement._exitToLobby()">🏠 退出</button>
                </div>
            </div>`;
    }

    function _htmlCasualAction() {
        return `
            <div class="stl-action-wrap">
                <div class="stl-action-title">對局結束</div>
                <div class="stl-action-btns">
                    <button class="btn btn-gold" onclick="GameSettlement._rematch()">🔄 再次匹配</button>
                    <button class="btn" onclick="GameSettlement._exitToLobby()">🏠 退出至大廳</button>
                </div>
            </div>`;
    }

    function _htmlRankedAction() {
        return `
            <div class="stl-action-wrap">
                <div class="stl-action-title">對局結束</div>
                <div class="stl-action-btns">
                    <button class="btn btn-gold" onclick="GameSettlement._rematch()">🔄 再次匹配</button>
                    <button class="btn" onclick="GameSettlement._exitToLobby()">🏠 退出至大廳</button>
                    <button class="btn" disabled title="功能即將開放" style="opacity:0.4;cursor:not-allowed;">🚩 檢舉對手</button>
                </div>
            </div>`;
    }

    // ── 動作函數 ──────────────────────────────────────────────────────

    function _exitToLobby() {
        _cleanup();
        location.href = 'index.html';
    }

    function _rematch() {
        _cleanup();
        const isRanked = localStorage.getItem('isRankedMatch') === 'true' || localStorage.getItem('isBotRankedMatch') === 'true';
        if (isRanked) {
            sessionStorage.setItem('autoMatchmake', 'ranked');
        } else {
            sessionStorage.setItem('autoMatchmake', 'casual');
        }
        location.href = 'index.html';
    }

    function _voteRematch() {
        _myVoted = true;
        const myStatusEl = document.getElementById('stl-my-status');
        if (myStatusEl) myStatusEl.textContent = '✅ 已選擇再來一局';

        const btn = document.getElementById('stl-rematch-btn');
        if (btn) { btn.disabled = true; btn.textContent = '等待對方...'; }

        // 透過 P2P 通知對方
        if (typeof NetManager !== 'undefined') {
            NetManager.sendAction({ type: 'rematch_vote', vote: true });
        }

        if (_opponentVoted) {
            _startRematchCountdown();
        }
    }

    function _updateRematchUI() {
        const oppStatusEl = document.getElementById('stl-opp-status');
        if (oppStatusEl) oppStatusEl.textContent = '✅ 對方想再來一局';
    }

    function _startRematchCountdown() {
        if (_rematchCountdownTimer) clearInterval(_rematchCountdownTimer);
        if (_rematchAutoExitTimer) clearTimeout(_rematchAutoExitTimer);

        const statusEl = document.getElementById('stl-rematch-status');
        if (statusEl) statusEl.textContent = '雙方同意！即將重新開始...';

        let count = 3;
        _rematchCountdownTimer = setInterval(() => {
            if (statusEl) statusEl.textContent = `雙方同意！${count} 秒後重新開始...`;
            count--;
            if (count < 0) {
                clearInterval(_rematchCountdownTimer);
                _doFriendRematch();
            }
        }, 1000);
    }

    function _doFriendRematch() {
        _cleanup();
        window.isRematching = true;
        const role = window.localOnlineRole || localStorage.getItem('onlineRole');
        if (role === 'host') {
            // Host 產生新房間
            const nextRoom = typeof NetManager !== 'undefined' ? NetManager.generateShortId() : _genRoomCode();
            sessionStorage.setItem('last_host_room_id', nextRoom);
            sessionStorage.setItem('isRematching', 'true');
            NetManager.sendAction({ type: 'rematch_vote_confirm', newRoomId: nextRoom });
        }
        setTimeout(() => window.location.reload(), 200);
    }

    function _showOpponentLeftMessage() {
        const statusEl = document.getElementById('stl-opp-status');
        if (statusEl) statusEl.textContent = '❌ 對方已離開';

        const rematchBtn = document.getElementById('stl-rematch-btn');
        if (rematchBtn) { rematchBtn.disabled = true; rematchBtn.style.opacity = '0.4'; }

        const rematchStatus = document.getElementById('stl-rematch-status');
        if (rematchStatus) rematchStatus.textContent = '對方已離開，將自動退出...';

        setTimeout(() => _exitToLobby(), 3000);
    }

    function _startAutoExitCountdown(secs) {
        if (_rematchAutoExitTimer) clearTimeout(_rematchAutoExitTimer);
        let remaining = secs;

        const tick = setInterval(() => {
            remaining--;
            const el = document.getElementById('stl-auto-exit-secs');
            const bar = document.getElementById('stl-auto-exit-progress');
            if (el) el.textContent = remaining;
            if (bar) bar.style.width = ((secs - remaining) / secs * 100) + '%';
            if (remaining <= 0) {
                clearInterval(tick);
                _exitToLobby();
            }
        }, 1000);

        _rematchAutoExitTimer = setTimeout(() => {}, secs * 1000 + 100);
        window._settlementAutoExitTick = tick; // save ref to clear later
    }

    // ── 步驟切換 ─────────────────────────────────────────────────────

    function _nextStep() {
        _currentStep++;
        if (_currentStep >= _steps.length) return;
        _renderStep(_currentStep);

        // 在 exp 步驟渲染後啟動動畫
        if (_steps[_currentStep].type === 'exp') {
            const expGained = _context.opts.expGained || 0;
            const passExpGained = _context.opts.passExpGained || 0;
            setTimeout(() => _animateExp(expGained, passExpGained), 300);
        }
    }

    // ── 輔助函數 ──────────────────────────────────────────────────────

    function _getMyName() {
        if (typeof GameState === 'undefined') return '我方';
        const role = window.localOnlineRole || localStorage.getItem('onlineRole');
        if (GameState.mode === 'online') {
            return role === 'host' ? GameState.player1.name : GameState.player2.name;
        }
        return GameState.player1.name;
    }

    function _getOpponentName() {
        if (typeof GameState === 'undefined') return '對方';
        const role = window.localOnlineRole || localStorage.getItem('onlineRole');
        if (GameState.mode === 'online') {
            return role === 'host' ? GameState.player2.name : GameState.player1.name;
        }
        return GameState.player2.name;
    }

    function _genRoomCode() {
        return Array.from({ length: 4 }, () => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]).join('');
    }

    function _cleanup() {
        if (_rematchCountdownTimer) clearInterval(_rematchCountdownTimer);
        if (_rematchAutoExitTimer) clearTimeout(_rematchAutoExitTimer);
        if (window._settlementAutoExitTick) clearInterval(window._settlementAutoExitTick);
        const overlay = document.getElementById('settlementOverlay');
        if (overlay) overlay.classList.remove('active');
    }

    // ── 公開 ─────────────────────────────────────────────────────────
    return {
        show,
        onOpponentRematchVote,
        onOpponentLeft,
        // 內部函數暴露給 onclick 用
        _nextStep,
        _exitToLobby,
        _rematch,
        _voteRematch,
        _updateRematchUI,
        _startRematchCountdown,
        _showOpponentLeftMessage,
    };
})();

window.GameSettlement = GameSettlement;
