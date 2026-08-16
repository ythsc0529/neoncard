/**
 * Neon Card - Battle Pass UI Logic (Neubrutalism + Comic Redesign)
 */

let myProfile = null;
let countdownTimer = null;
let currentModalReward = null;

// Initialize Authentication
AuthManager.init();
AuthManager.onAuthChanged(async (user) => {
    if (!user) {
        location.href = 'index.html';
        return;
    }
    
    try {
        if (window.SoundManager) SoundManager.init();
        myProfile = await UserProfile.getProfile(user.uid);
        
        renderPass();
        startCountdown();
        
        // Hide loading and show page
        document.getElementById('pageLoading').style.display = 'none';
        document.getElementById('passPage').style.display = 'block';
        
        // Smoothly center on current level after render
        setTimeout(() => {
            scrollToCurrentLevel(false);
        }, 150);
        
    } catch (err) {
        console.error('[Pass] Failed to load user profile:', err);
        alert('載入通行證資料失敗，請重新整理頁面！');
    }
});

/**
 * Format reward display data
 */
function getRewardInfo(reward, trackType, level) {
    if (!reward) {
        return {
            isEmpty: true,
            title: '無獎勵',
            desc: '此階段無額外獎勵',
            iconHtml: '<span class="empty-label">無</span>',
            amountText: ''
        };
    }

    let iconHtml = '';
    let title = '';
    let desc = reward.desc || '';
    let amountText = reward.amount ? `x${reward.amount}` : '';

    switch (reward.type) {
        case 'money':
            iconHtml = getItemIconHtml('money', 'r-thumb-img');
            title = `錢錢 ${amountText}`;
            break;
        case 'landDeed':
            iconHtml = getItemIconHtml('landDeed', 'r-thumb-img');
            title = `地契 ${amountText}`;
            break;
        case 'exp':
            iconHtml = '<span class="r-thumb-emoji">✨</span>';
            title = `帳號經驗 ${amountText}`;
            break;
        case 'drawNormal':
            iconHtml = getItemIconHtml('drawNormal', 'r-thumb-img');
            title = `普通抽獎券 ${amountText}`;
            break;
        case 'drawPremium':
            iconHtml = getItemIconHtml('drawPremium', 'r-thumb-img');
            title = `高級抽獎券 ${amountText}`;
            break;
        case 'drawSpecial':
            iconHtml = getItemIconHtml('drawSpecial', 'r-thumb-img');
            title = `特殊抽獎券 ${amountText}`;
            break;
        case 'title':
            if (reward.image) {
                iconHtml = `<img src="${reward.image}" class="r-thumb-img" alt="${reward.name}" onerror="this.outerHTML='🎖️'">`;
            } else {
                iconHtml = '<span class="r-thumb-emoji">🎖️</span>';
            }
            title = `稱號【${reward.name}】`;
            break;
        case 'char':
            if (reward.image) {
                iconHtml = `<img src="${reward.image}" class="r-thumb-img" alt="${reward.name}" onerror="this.outerHTML='👤'">`;
            } else {
                iconHtml = '<span class="r-thumb-emoji">👤</span>';
            }
            title = `角色【${reward.name}】`;
            break;
        default:
            iconHtml = getItemIconHtml(reward.type, 'r-thumb-img');
            title = `${reward.name || reward.type} ${amountText}`;
    }

    return {
        isEmpty: false,
        type: reward.type,
        name: reward.name || title,
        title,
        desc,
        amount: reward.amount || 1,
        amountText,
        iconHtml
    };
}

/**
 * Main Render Function
 */
function renderPass() {
    if (!myProfile) return;

    const pass = myProfile.battlePass || { points: 0, premiumActive: false, claimed: { free: [], premium: [] } };
    const totalPoints = pass.points || 0;
    const curLevel = PassLogic.getCurrentLevel(totalPoints);
    const progressInCur = PassLogic.getPointsInCurrentLevel(totalPoints);
    const pointsToNext = PassLogic.getPointsToNextLevel(totalPoints);
    const isPremium = pass.premiumActive === true;
    const freeClaimed = pass.claimed?.free || [];
    const premClaimed = pass.claimed?.premium || [];
    const tokens = myProfile.inventory?.passToken || 0;

    // 1. Update Hero Card 1 (Progress)
    document.getElementById('heroLevelNum').textContent = curLevel;
    document.getElementById('heroExpText').textContent = `${progressInCur} / 50 積分`;
    document.getElementById('heroExpFill').style.width = `${Math.min(100, (progressInCur / 50) * 100)}%`;
    
    if (curLevel >= 20) {
        document.getElementById('heroNextTip').textContent = '🎉 恭喜！您已達成通行證滿級 (LV.20)！';
    } else {
        document.getElementById('heroNextTip').textContent = `距離晉升第 ${curLevel + 1} 階還差 ${pointsToNext} 積分！(勝+30 / 敗+15)`;
    }

    // 2. Update Hero Card 2 (Grand Prize LV.20 Status)
    const grandPrizeStatusEl = document.getElementById('grandPrizeStatus');
    const grandClaimed = premClaimed.includes(20);
    if (grandClaimed) {
        grandPrizeStatusEl.innerHTML = '<span style="color:#10B981;">✅ 已領取大獎</span>';
    } else if (curLevel >= 20 && isPremium) {
        grandPrizeStatusEl.innerHTML = '<span style="color:#FF4D1C;font-weight:900;">💥 立即領取！</span>';
    } else if (curLevel >= 20 && !isPremium) {
        grandPrizeStatusEl.innerHTML = '<span style="color:#D97706;">需解鎖盛宴通行證</span>';
    } else {
        grandPrizeStatusEl.textContent = `還差 ${20 - curLevel} 階達成`;
    }

    // 3. Update Hero Card 3 (Premium Unlock Status)
    const statusArea = document.getElementById('premiumStatusArea');
    const actionArea = document.getElementById('unlockActionArea');

    if (isPremium) {
        statusArea.innerHTML = `
            <div class="premium-status-unlocked">
                <div class="vip-crown">👑</div>
                <div class="vip-title">盛宴進階已解鎖！</div>
                <div class="vip-desc">您已享有全 20 階豪華進階獎勵領取權限</div>
            </div>
        `;
        actionArea.innerHTML = `
            <div class="token-inventory-tip">
                <span>🎟️ 擁有通行證兌換券：${tokens} 張</span>
            </div>
        `;
    } else {
        statusArea.innerHTML = `
            <ul class="premium-perks-list">
                <li><span class="bullet">✓</span> 解鎖全 20 階盛宴進階專屬獎勵</li>
                <li><span class="bullet">✓</span> 滿級獲得專屬角色【踢飛你】</li>
                <li><span class="bullet">✓</span> 滿級獲得專屬霸氣稱號【一腳定江山】</li>
                <li><span class="bullet">✓</span> 獲取大量地契、抽獎券與高額金幣</li>
            </ul>
        `;
        actionArea.innerHTML = `
            <button class="btn-comic-unlock" onclick="unlockPremium()">
                ⚡ 立即解鎖盛宴 (消耗 1 張兌換券)
            </button>
            <div class="token-inventory-tip">
                <span>🎟️ 擁有通行證兌換券：<strong>${tokens}</strong> 張</span>
            </div>
        `;
    }

    // 4. Calculate Claimable Rewards
    const claimableList = PassLogic.getClaimableRewards(myProfile);
    const claimableCount = claimableList.length;

    const btnClaimAll = document.getElementById('btnClaimAll');
    const claimAllCountEl = document.getElementById('claimAllCount');
    claimAllCountEl.textContent = claimableCount;
    
    if (claimableCount > 0) {
        btnClaimAll.disabled = false;
        btnClaimAll.style.animation = 'claimablePulse 1s infinite alternate';
    } else {
        btnClaimAll.disabled = true;
        btnClaimAll.style.animation = 'none';
    }

    document.getElementById('statCurrentLevel').textContent = curLevel;
    document.getElementById('statClaimableCount').textContent = claimableCount;

    // 5. Render Track Grid (Levels 1 to 20)
    const trackGrid = document.getElementById('trackLevelsGrid');
    trackGrid.innerHTML = '';

    for (let lv = 1; lv <= 20; lv++) {
        const freeReward = PASS_FREE[lv];
        const premReward = PASS_PREM[lv];

        const freeInfo = getRewardInfo(freeReward, 'free', lv);
        const premInfo = getRewardInfo(premReward, 'premium', lv);

        const freeUnlocked = curLevel >= lv;
        const premUnlocked = isPremium && curLevel >= lv;

        const isFreeClaimed = freeClaimed.includes(lv);
        const isPremClaimed = premClaimed.includes(lv);

        const freeCanClaim = freeUnlocked && !isFreeClaimed && !freeInfo.isEmpty;
        const premCanClaim = premUnlocked && !isPremClaimed && !premInfo.isEmpty;

        // Determine Free Card State Class
        let freeStateClass = 'state-normal';
        if (freeInfo.isEmpty) freeStateClass = 'state-empty';
        else if (isFreeClaimed) freeStateClass = 'state-claimed';
        else if (freeCanClaim) freeStateClass = 'state-claimable';
        else if (!freeUnlocked) freeStateClass = 'state-locked';

        // Determine Premium Card State Class
        let premStateClass = 'state-normal';
        if (premInfo.isEmpty) premStateClass = 'state-empty';
        else if (isPremClaimed) premStateClass = 'state-claimed';
        else if (premCanClaim) premStateClass = 'state-claimable';
        else if (!isPremium) premStateClass = 'state-locked locked-premium';
        else if (!premUnlocked) premStateClass = 'state-locked';

        const isCurrentTier = curLevel === lv;
        const isReached = curLevel >= lv;

        const colEl = document.createElement('div');
        colEl.className = `level-node-column ${isCurrentTier ? 'current-active-col' : ''}`;
        colEl.id = `levelNodeCol_${lv}`;

        colEl.innerHTML = `
            <!-- Top: Premium Reward Slot -->
            <div class="reward-card-slot slot-premium ${premStateClass}" onclick="handleRewardCardClick(${lv}, 'premium')">
                <div class="reward-card-inner">
                    ${!premInfo.isEmpty && !isPremium && !isPremClaimed ? `<div class="lock-corner-badge">🔒 VIP</div>` : ''}
                    ${!premInfo.isEmpty && isPremium && !premUnlocked ? `<div class="lock-corner-badge">🔒 LV.${lv}</div>` : ''}
                    ${premCanClaim ? `<div class="claim-action-tag">💥 可領取</div>` : ''}
                    ${isPremClaimed ? `<div class="claimed-ink-stamp">已領取</div>` : ''}

                    <div class="r-thumb-wrap">
                        ${premInfo.iconHtml}
                    </div>
                    <div class="r-item-name" title="${premInfo.title}">${premInfo.title}</div>
                    ${premInfo.amountText ? `<div class="r-qty-tag">${premInfo.amountText}</div>` : ''}
                </div>
            </div>

            <!-- Middle: Level Milestone Axis -->
            <div class="level-axis-slot ${isReached ? 'reached-axis' : ''} ${isCurrentTier ? 'current-tier-axis' : ''}">
                ${isCurrentTier ? '<div class="current-pin-bubble">YOU ARE HERE!</div>' : ''}
                <div class="level-circle-badge">${lv}</div>
            </div>

            <!-- Bottom: Free Reward Slot -->
            <div class="reward-card-slot slot-free ${freeStateClass}" onclick="handleRewardCardClick(${lv}, 'free')">
                <div class="reward-card-inner">
                    ${!freeInfo.isEmpty && !freeUnlocked ? `<div class="lock-corner-badge">🔒 LV.${lv}</div>` : ''}
                    ${freeCanClaim ? `<div class="claim-action-tag">💥 可領取</div>` : ''}
                    ${isFreeClaimed ? `<div class="claimed-ink-stamp">已領取</div>` : ''}

                    <div class="r-thumb-wrap">
                        ${freeInfo.iconHtml}
                    </div>
                    <div class="r-item-name" title="${freeInfo.title}">${freeInfo.title}</div>
                    ${freeInfo.amountText ? `<div class="r-qty-tag">${freeInfo.amountText}</div>` : ''}
                </div>
            </div>
        `;

        trackGrid.appendChild(colEl);
    }
}

/**
 * Handle Clicking a Reward Card Slot
 */
function handleRewardCardClick(lv, trackType) {
    if (window.SoundManager) SoundManager.play('random');
    
    const reward = trackType === 'free' ? PASS_FREE[lv] : PASS_PREM[lv];
    if (!reward) return;

    openRewardModal(lv, trackType);
}

/**
 * Open Reward Detail Modal
 */
function openRewardModal(lv, trackType) {
    const reward = trackType === 'free' ? PASS_FREE[lv] : PASS_PREM[lv];
    if (!reward) return;

    const info = getRewardInfo(reward, trackType, lv);
    const pass = myProfile.battlePass || { points: 0, premiumActive: false, claimed: { free: [], premium: [] } };
    const curLevel = PassLogic.getCurrentLevel(pass.points || 0);
    const isPremium = pass.premiumActive === true;
    const claimedList = pass.claimed?.[trackType] || [];
    const isClaimed = claimedList.includes(lv);
    const isUnlocked = trackType === 'free' ? (curLevel >= lv) : (isPremium && curLevel >= lv);
    const canClaim = isUnlocked && !isClaimed;

    currentModalReward = { lv, trackType, reward, info, canClaim, isClaimed, isUnlocked };

    // Set Modal Content
    document.getElementById('modalTrackTag').textContent = trackType === 'free' ? '🎁 起步免費軌道' : '👑 盛宴進階軌道';
    document.getElementById('modalTrackTag').style.background = trackType === 'free' ? 'var(--comic-cyan)' : 'var(--comic-yellow)';
    document.getElementById('modalLevelTitle').textContent = `第 ${lv} 階獎勵詳情`;
    document.getElementById('modalRewardIcon').innerHTML = info.iconHtml;
    document.getElementById('modalRewardName').textContent = info.title;
    document.getElementById('modalRewardDesc').textContent = info.desc;

    const statusPill = document.getElementById('modalStatusPill');
    const actionBtn = document.getElementById('modalActionButton');

    if (isClaimed) {
        statusPill.innerHTML = '<span style="color:#059669;">✅ 該獎勵已領取</span>';
        statusPill.style.background = '#ECFDF5';
        actionBtn.disabled = true;
        actionBtn.textContent = '已完成領取';
        actionBtn.onclick = null;
    } else if (canClaim) {
        statusPill.innerHTML = '<span style="color:#FF4D1C;">⚡ 已達成解鎖條件！</span>';
        statusPill.style.background = '#FEF3C7';
        actionBtn.disabled = false;
        actionBtn.textContent = '⚡ 立即領取該獎勵';
        actionBtn.onclick = () => {
            closeRewardModal();
            claimPassReward(lv, trackType);
        };
    } else {
        if (trackType === 'premium' && !isPremium) {
            statusPill.innerHTML = '<span style="color:#DC2626;">🔒 需解鎖盛宴進階通行證</span>';
            statusPill.style.background = '#FEE2E2';
            actionBtn.disabled = false;
            actionBtn.textContent = '👑 前往解鎖進階通行證';
            actionBtn.onclick = () => {
                closeRewardModal();
                unlockPremium();
            };
        } else {
            statusPill.innerHTML = `<span style="color:#6B7280;">🔒 需達到通行證等級 LV.${lv}</span>`;
            statusPill.style.background = '#F3F4F6';
            actionBtn.disabled = true;
            actionBtn.textContent = `尚未達標 (目前 LV.${curLevel})`;
            actionBtn.onclick = null;
        }
    }

    document.getElementById('rewardDetailModal').classList.add('active');
}

/**
 * Close Reward Modal
 */
function closeRewardModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('rewardDetailModal').classList.remove('active');
}

/**
 * Single Reward Claim Logic
 */
async function claimPassReward(lv, trackType) {
    const pass = myProfile.battlePass || { points: 0, premiumActive: false, claimed: { free: [], premium: [] } };
    if (!pass.claimed) pass.claimed = { free: [], premium: [] };
    
    if (pass.claimed[trackType]?.includes(lv)) return;
    
    const r = trackType === 'free' ? PASS_FREE[lv] : PASS_PREM[lv];
    if (!r) return;
    
    try {
        if (r.type === 'money' || r.type === 'landDeed' || r.type.startsWith('draw')) {
            await UserProfile.updateInventory(myProfile.uid, r.type, r.amount);
        } else if (r.type === 'exp') {
            await UserProfile.gainExp(myProfile.uid, r.amount);
        } else if (r.type === 'title') {
            await UserProfile.unlockTitle(myProfile.uid, r.name);
        } else if (r.type === 'char') {
            await UserProfile.unlockCharacter(myProfile.uid, r.name);
            if (r.name === '踢飛你') {
                await UserProfile.unlockTitle(myProfile.uid, '踢飛你');
            }
        }
        
        if (window.SoundManager) SoundManager.play('money');
        pass.claimed[trackType].push(lv);
        await UserProfile.updateProfile(myProfile.uid, { "battlePass.claimed": pass.claimed });
        
        // Refresh local data & render
        myProfile = await UserProfile.getProfile(myProfile.uid);
        renderPass();
        
        if (typeof NotificationManager !== 'undefined') NotificationManager.refresh(myProfile);
        
    } catch(err) {
        console.error('[Pass] Claim error:', err);
        alert("領取失敗: " + err.message);
    }
}

/**
 * Claim All Unlocked & Unclaimed Rewards at Once
 */
async function claimAllRewards() {
    const claimable = PassLogic.getClaimableRewards(myProfile);
    if (!claimable || claimable.length === 0) {
        alert('目前沒有可領取的通行證獎勵！');
        return;
    }

    if (window.SoundManager) SoundManager.play('purchace');

    const pass = myProfile.battlePass;
    if (!pass.claimed) pass.claimed = { free: [], premium: [] };

    // Aggregate rewards for batch application
    let totalMoney = 0;
    let totalLandDeed = 0;
    let totalExp = 0;
    let totalDrawNormal = 0;
    let totalDrawPremium = 0;
    let totalDrawSpecial = 0;
    const titlesToUnlock = [];
    const charsToUnlock = [];

    const summaryItems = {};

    for (const item of claimable) {
        const { level, track, reward } = item;
        pass.claimed[track].push(level);

        const rType = reward.type;
        const rAmount = reward.amount || 1;
        const rName = reward.name || '';

        if (rType === 'money') totalMoney += rAmount;
        else if (rType === 'landDeed') totalLandDeed += rAmount;
        else if (rType === 'exp') totalExp += rAmount;
        else if (rType === 'drawNormal') totalDrawNormal += rAmount;
        else if (rType === 'drawPremium') totalDrawPremium += rAmount;
        else if (rType === 'drawSpecial') totalDrawSpecial += rAmount;
        else if (rType === 'title' && rName) titlesToUnlock.push(rName);
        else if (rType === 'char' && rName) charsToUnlock.push(rName);

        // For summary popup
        const key = rName || rType;
        if (!summaryItems[key]) {
            summaryItems[key] = { type: rType, name: rName, amount: 0, iconHtml: getRewardInfo(reward, track, level).iconHtml };
        }
        summaryItems[key].amount += rAmount;
    }

    try {
        // Execute Batch Updates
        if (totalMoney > 0) await UserProfile.updateInventory(myProfile.uid, 'money', totalMoney);
        if (totalLandDeed > 0) await UserProfile.updateInventory(myProfile.uid, 'landDeed', totalLandDeed);
        if (totalDrawNormal > 0) await UserProfile.updateInventory(myProfile.uid, 'drawNormal', totalDrawNormal);
        if (totalDrawPremium > 0) await UserProfile.updateInventory(myProfile.uid, 'drawPremium', totalDrawPremium);
        if (totalDrawSpecial > 0) await UserProfile.updateInventory(myProfile.uid, 'drawSpecial', totalDrawSpecial);
        if (totalExp > 0) await UserProfile.gainExp(myProfile.uid, totalExp);

        for (const t of titlesToUnlock) {
            await UserProfile.unlockTitle(myProfile.uid, t);
        }
        for (const c of charsToUnlock) {
            await UserProfile.unlockCharacter(myProfile.uid, c);
            if (c === '踢飛你') await UserProfile.unlockTitle(myProfile.uid, '踢飛你');
        }

        // Save claimed state
        await UserProfile.updateProfile(myProfile.uid, { "battlePass.claimed": pass.claimed });

        // Play celebratory sound
        if (window.SoundManager) SoundManager.play('win');

        // Show Celebration Modal
        showBatchClaimSummary(Object.values(summaryItems));

        // Refresh state
        myProfile = await UserProfile.getProfile(myProfile.uid);
        renderPass();

        if (typeof NotificationManager !== 'undefined') NotificationManager.refresh(myProfile);

    } catch (err) {
        console.error('[Pass] Batch claim error:', err);
        alert('一鍵領取過程中發生錯誤：' + err.message);
    }
}

/**
 * Show Batch Claim Summary Celebration Modal
 */
function showBatchClaimSummary(items) {
    const grid = document.getElementById('batchSummaryGrid');
    grid.innerHTML = '';

    for (const it of items) {
        const div = document.createElement('div');
        div.className = 'batch-summary-item';
        div.innerHTML = `
            <div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;">
                ${it.iconHtml}
            </div>
            <div class="item-lbl">${it.name || it.type}</div>
            <div class="item-qty">x${it.amount}</div>
        `;
        grid.appendChild(div);
    }

    document.getElementById('claimSummaryModal').classList.add('active');
}

/**
 * Close Batch Claim Summary Modal
 */
function closeClaimSummaryModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('claimSummaryModal').classList.remove('active');
}

/**
 * Unlock Premium Pass Function
 */
async function unlockPremium() {
    const tokens = myProfile.inventory?.passToken || 0;
    if (tokens <= 0) {
        if (confirm("您目前沒有【通行證兌換券】！\n是否立即前往商店使用地契兌換？")) {
            location.href = 'shop.html';
        }
        return;
    }

    if (!confirm("確定要消耗 1 張通行證兌換券解鎖【踢飛．盛宴】進階通行證嗎？\n解鎖後將可享有全 20 階豪華獎勵與限定角色【踢飛你】！")) {
        return;
    }

    try {
        if (window.SoundManager) SoundManager.play('purchace');
        
        await UserProfile.updateInventory(myProfile.uid, 'passToken', -1);
        await UserProfile.updateProfile(myProfile.uid, { "battlePass.premiumActive": true });
        
        myProfile.battlePass.premiumActive = true;
        myProfile.inventory.passToken -= 1;
        
        alert("🎉 恭喜！【踢飛．盛宴】進階通行證解鎖成功！");
        
        if (window.SoundManager) SoundManager.play('win');
        
        myProfile = await UserProfile.getProfile(myProfile.uid);
        renderPass();
        
        if (typeof NotificationManager !== 'undefined') NotificationManager.refresh(myProfile);
        
    } catch(err) {
        console.error('[Pass] Unlock error:', err);
        alert("解鎖失敗: " + err.message);
    }
}

/**
 * Horizontal Track Navigation Helpers
 */
function scrollTrack(offset) {
    const pane = document.getElementById('trackScrollPane');
    if (!pane) return;
    pane.scrollBy({ left: offset, behavior: 'smooth' });
}

function scrollToCurrentLevel(smooth = true) {
    const pass = myProfile?.battlePass;
    const curLevel = Math.max(1, Math.min(20, PassLogic.getCurrentLevel(pass?.points || 0)));
    const targetNode = document.getElementById(`levelNodeCol_${curLevel}`);
    const pane = document.getElementById('trackScrollPane');
    
    if (targetNode && pane) {
        const offset = targetNode.offsetLeft - (pane.clientWidth / 2) + (targetNode.clientWidth / 2);
        pane.scrollTo({ left: Math.max(0, offset), behavior: smooth ? 'smooth' : 'auto' });
    }
}

function scrollToTier20() {
    const targetNode = document.getElementById('levelNodeCol_20');
    const pane = document.getElementById('trackScrollPane');
    if (targetNode && pane) {
        pane.scrollTo({ left: targetNode.offsetLeft, behavior: 'smooth' });
    }
}

/**
 * Live Countdown Timer for 2026/12/31
 */
function startCountdown() {
    if (countdownTimer) clearInterval(countdownTimer);
    
    const targetTime = PASS_SEASON_CONFIG.endTimestamp;
    
    function update() {
        const now = Date.now();
        const diff = targetTime - now;
        const badgeEl = document.getElementById('seasonCountdown');
        if (!badgeEl) return;

        if (diff <= 0) {
            badgeEl.innerHTML = `⏳ 賽季結算：<span class="highlight">已結束</span>`;
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((diff / (1000 * 60)) % 60);

        badgeEl.innerHTML = `⏳ 賽季結算：<span class="highlight">${days}天 ${hours}時${mins}分</span> (2026/12/31)`;
    }

    update();
    countdownTimer = setInterval(update, 60000);
}
