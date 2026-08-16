/**
 * 霓虹牌 - 試煉之路 (Path of Trials)
 * Neubrutalism & Comic / Manga Redesign
 */

let myProfile = null;
let allCharacters = [];
let hasAutoScrolled = false;
let currentFilter = 'all';

// Dupe money conversion — keys UPPERCASE matching ALL_CHARACTERS.rarity
const CHAR_DUPE_MONEY = {
    MYTHIC: 200,
    LEGENDARY: 125,
    EPIC: 70,
    RARE: 50,
    COMMON: 25
};

// Item display names for reward chips
const ITEM_NAMES = {
    money: '錢錢',
    landDeed: '地契',
    drawNormal: '普通抽獎券',
    drawPremium: '高級抽獎券',
    drawSpecial: '特殊抽獎券',
    passToken: '通行證兌換券',
    forgiveToken: '贖罪券'
};

// Rarity translations & CSS class mappings
const RARITY_INFO = {
    MYTHIC:    { name: '神話', css: 'rarity-mythic' },
    LEGENDARY: { name: '傳說', css: 'rarity-legendary' },
    EPIC:      { name: '史詩', css: 'rarity-epic' },
    RARE:      { name: '稀有', css: 'rarity-rare' },
    COMMON:    { name: '一般', css: 'rarity-common' }
};

// ── Auth & Initialization ───────────────────────────────────────────────────
AuthManager.init();
AuthManager.onAuthChanged(async (user) => {
    if (!user) {
        location.href = 'index.html';
        return;
    }

    try {
        myProfile = await UserProfile.getProfile(user.uid);
        
        if (typeof ALL_CHARACTERS !== 'undefined' && ALL_CHARACTERS.length > 0) {
            allCharacters = ALL_CHARACTERS;
        } else if (typeof window.characters !== 'undefined') {
            allCharacters = window.characters;
        }

        renderTrial();

        // Hide loading, show page
        const loading = document.getElementById('pageLoading');
        if (loading) loading.style.display = 'none';
        
        const page = document.getElementById('trialPage');
        if (page) page.style.display = 'block';

        // Auto-scroll on initial load
        if (!hasAutoScrolled) {
            setTimeout(() => {
                scrollToCurrentLevel();
                hasAutoScrolled = true;
            }, 250);
        }
    } catch (err) {
        console.error('Error loading profile in trial:', err);
        alert('載入資料失敗，請重新整理頁面！');
    }
});

// ── Helper: Character Rarity Lookup ──────────────────────────────────────────
function getCharRarity(charName) {
    if (!allCharacters || allCharacters.length === 0) return 'COMMON';
    const found = allCharacters.find(c => c.name === charName);
    return found ? (found.rarity || 'COMMON') : 'COMMON';
}

// ── Helper: Title Icon & Info Lookup ─────────────────────────────────────────
function getTitleMeta(titleName) {
    if (typeof RankedSystem !== 'undefined' && RankedSystem.TITLES && RankedSystem.TITLES[titleName]) {
        return RankedSystem.TITLES[titleName];
    }
    return {
        img: `hao_pic/${titleName}.png`,
        color: '#FFD700',
        desc: `試煉之路榮譽稱號【${titleName}】`
    };
}

// ── Main Render ──────────────────────────────────────────────────────────────
function renderTrial() {
    if (!myProfile) return;

    const p = myProfile;
    const curLvl = p.level || 0;
    const curExp = p.exp || 0;
    const claimed = p.trialClaims || [];

    // 1. EXP Bar & Level Info
    const reqExp = UserProfile.getExpRequirement(curLvl);
    const prevReqExp = curLvl > 0 ? UserProfile.getExpRequirement(curLvl - 1) : 0;
    const rangeTotal = Math.max(1, reqExp - prevReqExp);
    const rangeCur = Math.max(0, curExp - prevReqExp);
    const pct = Math.min(100, Math.max(0, (rangeCur / rangeTotal) * 100));

    const displayLvlElem = document.getElementById('displayLevel');
    if (displayLvlElem) displayLvlElem.textContent = curLvl;

    const displayExpElem = document.getElementById('displayExp');
    if (displayExpElem) displayExpElem.textContent = `${curExp} / ${reqExp} (${Math.round(pct)}%)`;

    const expFillElem = document.getElementById('expFill');
    if (expFillElem) expFillElem.style.width = `${pct}%`;

    // 2. Build complete sorted list of all milestone levels
    const levelsToDraw = new Set();
    for (let i = 0; i <= 25; i++) levelsToDraw.add(i);
    if (curLvl > 25) {
        for (let i = 26; i <= Math.max(curLvl + 5, 30); i++) levelsToDraw.add(i);
    }
    levelsToDraw.add(50);
    levelsToDraw.add(100);
    const sortedLevels = [...levelsToDraw].sort((a, b) => a - b);

    // 3. Calculate Stats & Claimables
    let totalClaimableCount = 0;
    let totalClaimedCount = 0;

    sortedLevels.forEach(lv => {
        const isUnlocked = curLvl >= lv;
        const isClaimed = claimed.includes(lv);
        if (isClaimed) totalClaimedCount++;
        else if (isUnlocked) totalClaimableCount++;
    });

    const statRatioElem = document.getElementById('statClaimedRatio');
    if (statRatioElem) statRatioElem.textContent = `${totalClaimedCount} / ${sortedLevels.length}`;

    const statPendingElem = document.getElementById('statPendingCount');
    if (statPendingElem) statPendingElem.textContent = totalClaimableCount;

    const btnClaimAll = document.getElementById('btnClaimAll');
    const claimAllBadge = document.getElementById('claimAllCountBadge');
    if (btnClaimAll && claimAllBadge) {
        claimAllBadge.textContent = totalClaimableCount;
        if (totalClaimableCount > 0) {
            btnClaimAll.disabled = false;
        } else {
            btnClaimAll.disabled = true;
        }
    }

    const filterClaimableBadge = document.getElementById('filterClaimableBadge');
    if (filterClaimableBadge) {
        filterClaimableBadge.textContent = totalClaimableCount;
        filterClaimableBadge.style.display = totalClaimableCount > 0 ? 'inline-block' : 'none';
    }

    // 4. Update Next Grand Milestone Card
    renderNextGrandMilestone(curLvl, claimed, sortedLevels);

    // 5. Render Milestone Road Cards
    const listElem = document.getElementById('milestones');
    if (!listElem) return;
    listElem.innerHTML = '';

    let renderedCount = 0;

    sortedLevels.forEach(lv => {
        const data = TrialLogic.getTrialData(lv);
        const isUnlocked = curLvl >= lv;
        const isClaimed = claimed.includes(lv);
        const isCurrent = lv === curLvl;
        const isClaimable = isUnlocked && !isClaimed;
        const hasSpecialOrTitle = Boolean(data.title || data.note || data.chars.length > 0);

        // Apply Filter
        if (currentFilter === 'claimable' && !isClaimable) return;
        if (currentFilter === 'special' && !hasSpecialOrTitle) return;
        if (currentFilter === 'locked' && isUnlocked) return;

        renderedCount++;

        // Determine State Class & Stickers
        let stateClass = 'state-locked';
        let statusStickerHtml = '';

        if (isCurrent) {
            stateClass = 'state-current';
            statusStickerHtml = `<span class="card-status-sticker sticker-current">📍 當前進度</span>`;
        } else if (isClaimable) {
            stateClass = 'state-unlocked';
            statusStickerHtml = `<span class="card-status-sticker sticker-ready">💥 可領取!</span>`;
        } else if (isClaimed) {
            stateClass = 'state-claimed';
            statusStickerHtml = `<span class="card-status-sticker sticker-claimed">✓ 已領取</span>`;
        }

        // Build Reward Chips HTML
        let rewardsHtml = '';

        // Titles (Show with real badge picture)
        if (data.title) {
            const meta = getTitleMeta(data.title);
            rewardsHtml += `
                <div class="reward-chip c-title">
                    <img src="${meta.img}" class="title-thumb-img" alt="${data.title}" onerror="this.style.display='none'">
                    <span>🎖️ 稱號：${data.title}</span>
                </div>`;
        }

        // Characters (Show with rarity pills)
        data.chars.forEach(cName => {
            const rarity = getCharRarity(cName);
            const rInfo = RARITY_INFO[rarity] || RARITY_INFO.COMMON;
            rewardsHtml += `
                <div class="reward-chip c-char">
                    <span class="char-rarity-pill ${rInfo.css}">${rInfo.name}</span>
                    <span>👤 ${cName}</span>
                </div>`;
        });

        // Items (Show with high-res icon and quantity)
        Object.keys(data.items).forEach(k => {
            const iconHtml = getItemIconHtml(k, 'item-icon-inline');
            const name = ITEM_NAMES[k] || k;
            const amount = data.items[k];
            rewardsHtml += `
                <div class="reward-chip c-item">
                    ${iconHtml}
                    <span>${name}</span>
                    <span class="item-count-badge">x${amount}</span>
                </div>`;
        });

        // Special notes (e.g. Mahjong bundle)
        if (data.note) {
            rewardsHtml += `<div class="reward-chip c-note">📦 ${data.note}</div>`;
        }

        if (!rewardsHtml) {
            rewardsHtml = `<span style="color:#6B7280; font-size:0.85rem; font-weight:700;">✨ 達成榮譽階級 (無額外道具)</span>`;
        }

        // Action Button HTML
        let actionBtnHtml = '';
        if (isClaimed) {
            actionBtnHtml = `<div class="btn-comic-completed">✓ 已完成領取</div>`;
        } else if (isUnlocked) {
            actionBtnHtml = `<button class="btn-comic-claim" onclick="claimLevel(${lv}, this)">🎁 領取獎勵</button>`;
        } else {
            actionBtnHtml = `<div class="btn-comic-locked">🔒 未解鎖</div>`;
        }

        const card = document.createElement('div');
        card.className = `milestone-comic-card ${stateClass}`;
        if (isCurrent) card.id = 'current-level-card';

        card.innerHTML = `
            ${statusStickerHtml}
            <div class="milestone-badge-box">
                <span class="milestone-lv-lbl">TIER</span>
                <span class="milestone-lv-num">${lv}</span>
            </div>
            <div class="milestone-rewards-wrap">
                ${rewardsHtml}
            </div>
            <div class="milestone-action-box">
                ${actionBtnHtml}
            </div>
        `;

        listElem.appendChild(card);
    });

    if (renderedCount === 0) {
        listElem.innerHTML = `
            <div style="background:#FFFFFF; border:var(--comic-border-thick); box-shadow:var(--comic-shadow); padding:36px 20px; text-align:center;">
                <div style="font-size:2.5rem; margin-bottom:8px;">🔍</div>
                <div style="font-size:1.2rem; font-weight:900;">目前篩選條件下無任何里程碑</div>
                <div style="font-size:0.85rem; color:#6B7280; margin-top:4px;">請切換至「全部里程碑」查看所有獎勵！</div>
            </div>
        `;
    }
}

// ── Render Next Grand Milestone Spotlight ───────────────────────────────────
function renderNextGrandMilestone(curLvl, claimed, sortedLevels) {
    // Find next major milestone (has title or is special milestone like 5, 10, 25, 50, 100)
    let nextGrandLv = null;

    for (const lv of sortedLevels) {
        if (lv > curLvl) {
            const data = TrialLogic.getTrialData(lv);
            if (data.title || lv === 25 || lv === 50 || lv === 100 || data.chars.length >= 2) {
                nextGrandLv = lv;
                break;
            }
        }
    }

    // Fallback if at max or no future grand milestone found
    if (nextGrandLv === null) {
        nextGrandLv = 100;
    }

    const data = TrialLogic.getTrialData(nextGrandLv);
    const diff = Math.max(0, nextGrandLv - curLvl);

    const diffElem = document.getElementById('nextMilestoneDiff');
    if (diffElem) {
        diffElem.textContent = diff === 0 ? '✨ 階級已達標' : `還差 ${diff} 級達成`;
    }

    const tagElem = document.getElementById('grandLevelTag');
    if (tagElem) tagElem.textContent = `Lv.${nextGrandLv} 試煉殿堂`;

    const titleElem = document.getElementById('grandTitleName');
    if (titleElem) {
        if (data.title) {
            titleElem.textContent = `稱號「${data.title}」`;
        } else if (data.chars.length > 0) {
            titleElem.textContent = `限定角色【${data.chars[0]}】`;
        } else {
            titleElem.textContent = `Lv.${nextGrandLv} 豐厚大獎`;
        }
    }

    const emblemBox = document.getElementById('grandEmblemBox');
    if (emblemBox) {
        if (data.title) {
            const meta = getTitleMeta(data.title);
            emblemBox.innerHTML = `<img src="${meta.img}" class="grand-emblem-img" alt="${data.title}" onerror="this.parentElement.innerHTML='🏆'">`;
        } else {
            emblemBox.innerHTML = `<span class="grand-emblem-icon">🏆</span>`;
        }
    }

    const previewElem = document.getElementById('grandRewardsPreview');
    if (previewElem) {
        const previewParts = [];
        if (data.chars.length > 0) previewParts.push(`👥 ${data.chars.length} 位角色`);
        if (data.items.drawSpecial) previewParts.push(`🎟️ 特殊券 x${data.items.drawSpecial}`);
        if (data.items.drawPremium) previewParts.push(`🎫 高級券 x${data.items.drawPremium}`);
        if (data.items.drawNormal) previewParts.push(`🎟️ 普通券 x${data.items.drawNormal}`);
        if (data.items.money) previewParts.push(`💰 錢錢 x${data.items.money}`);
        if (data.note) previewParts.push(`📦 ${data.note}`);
        previewElem.innerHTML = previewParts.map(txt => `<span style="background:#FFFBF0; border:1px solid #0A0A0A; padding:2px 6px; font-weight:800; font-size:0.75rem;">${txt}</span>`).join('');
    }

    const noteElem = document.getElementById('grandProgressNote');
    if (noteElem) {
        if (curLvl >= nextGrandLv) {
            noteElem.textContent = claimed.includes(nextGrandLv) ? '已領取全部大獎 ✓' : '已達成！快去領取！';
            noteElem.style.color = '#10B981';
        } else {
            noteElem.textContent = `目標等級 Lv.${nextGrandLv}`;
            noteElem.style.color = 'var(--comic-orange)';
        }
    }
}

// ── Filter Switching ─────────────────────────────────────────────────────────
function setFilter(filterName, btnElem) {
    currentFilter = filterName;
    document.querySelectorAll('.filter-tab-btn').forEach(btn => btn.classList.remove('active'));
    if (btnElem) btnElem.classList.add('active');
    renderTrial();
}

// ── Smooth Scroll to Current Level ──────────────────────────────────────────
function scrollToCurrentLevel() {
    const target = document.getElementById('current-level-card');
    if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        window.scrollTo({ top: 380, behavior: 'smooth' });
    }
}

// ── Single Claim Action ──────────────────────────────────────────────────────
async function claimLevel(lv, btnElem) {
    if (!myProfile) return;
    const claimed = myProfile.trialClaims || [];
    if (claimed.includes(lv) || (myProfile.level || 0) < lv) return;

    if (btnElem) {
        btnElem.disabled = true;
        btnElem.textContent = '領取中...';
    }

    const data = TrialLogic.getTrialData(lv);
    let moneyFromDupes = 0;
    const newlyUnlockedChars = [];
    const dupeCharNames = [];

    try {
        // 1. Inventory Items
        for (const key of Object.keys(data.items)) {
            await UserProfile.updateInventory(myProfile.uid, key, data.items[key]);
        }

        // 2. Characters & Dupe Handling
        for (const cName of data.chars) {
            if ((myProfile.unlockedCharacters || []).includes(cName)) {
                const rarity = getCharRarity(cName);
                const dupeMoney = CHAR_DUPE_MONEY[rarity] || 25;
                moneyFromDupes += dupeMoney;
                dupeCharNames.push({ name: cName, money: dupeMoney, rarity });
            } else {
                await UserProfile.unlockCharacter(myProfile.uid, cName);
                myProfile.unlockedCharacters = myProfile.unlockedCharacters || [];
                myProfile.unlockedCharacters.push(cName);
                newlyUnlockedChars.push(cName);
            }
        }

        if (moneyFromDupes > 0) {
            await UserProfile.updateInventory(myProfile.uid, 'money', moneyFromDupes);
        }

        // 3. Titles
        if (data.title) {
            await UserProfile.unlockTitle(myProfile.uid, data.title);
        }

        // 4. Mark Milestone Claimed
        if (window.SoundManager) SoundManager.play('money');
        claimed.push(lv);
        await UserProfile.updateProfile(myProfile.uid, { trialClaims: claimed });
        myProfile.trialClaims = claimed;

        // 5. Open Comic Celebration Modal
        openRewardModal({
            title: `Lv.${lv} 試煉獎勵已領取！`,
            items: data.items,
            newChars: newlyUnlockedChars,
            dupeChars: dupeCharNames,
            totalDupeMoney: moneyFromDupes,
            unlockedTitle: data.title,
            note: data.note
        });

        // 6. Refresh UI & Global Notification Dots
        renderTrial();
        if (typeof NotificationManager !== 'undefined') {
            NotificationManager.refresh(myProfile);
        }
    } catch (err) {
        console.error('Claim level error:', err);
        alert('領取失敗：' + err.message);
        if (btnElem) {
            btnElem.disabled = false;
            btnElem.textContent = '🎁 領取獎勵';
        }
    }
}

// ── Bulk Claim Action (Claim All Eligible) ───────────────────────────────────
async function claimAllEligible() {
    if (!myProfile) return;
    const curLvl = myProfile.level || 0;
    const claimed = myProfile.trialClaims || [];

    // Find all claimable levels
    const levelsToDraw = new Set();
    for (let i = 0; i <= 25; i++) levelsToDraw.add(i);
    if (curLvl > 25) {
        for (let i = 26; i <= curLvl; i++) levelsToDraw.add(i);
    }
    if (curLvl >= 50) levelsToDraw.add(50);
    if (curLvl >= 100) levelsToDraw.add(100);

    const eligible = [...levelsToDraw].filter(lv => lv <= curLvl && !claimed.includes(lv)).sort((a, b) => a - b);
    if (eligible.length === 0) {
        alert('目前沒有任何可領取的試煉獎勵！');
        return;
    }

    const btn = document.getElementById('btnClaimAll');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span>⏳ 一鍵領取中...</span>';
    }

    const aggregateItems = {};
    const newlyUnlockedChars = [];
    const dupeCharNames = [];
    let totalDupeMoney = 0;
    const unlockedTitles = [];
    const notes = [];

    try {
        for (const lv of eligible) {
            const data = TrialLogic.getTrialData(lv);

            // Accumulate Items
            for (const key of Object.keys(data.items)) {
                aggregateItems[key] = (aggregateItems[key] || 0) + data.items[key];
            }

            // Accumulate Characters
            for (const cName of data.chars) {
                if ((myProfile.unlockedCharacters || []).includes(cName)) {
                    const rarity = getCharRarity(cName);
                    const dupeMoney = CHAR_DUPE_MONEY[rarity] || 25;
                    totalDupeMoney += dupeMoney;
                    dupeCharNames.push({ name: cName, money: dupeMoney, rarity });
                } else {
                    await UserProfile.unlockCharacter(myProfile.uid, cName);
                    myProfile.unlockedCharacters = myProfile.unlockedCharacters || [];
                    myProfile.unlockedCharacters.push(cName);
                    newlyUnlockedChars.push(cName);
                }
            }

            // Accumulate Titles
            if (data.title) {
                await UserProfile.unlockTitle(myProfile.uid, data.title);
                unlockedTitles.push(data.title);
            }

            if (data.note) notes.push(data.note);
            claimed.push(lv);
        }

        // Apply item updates
        for (const key of Object.keys(aggregateItems)) {
            await UserProfile.updateInventory(myProfile.uid, key, aggregateItems[key]);
        }

        if (totalDupeMoney > 0) {
            await UserProfile.updateInventory(myProfile.uid, 'money', totalDupeMoney);
        }

        // Save claimed list
        await UserProfile.updateProfile(myProfile.uid, { trialClaims: claimed });
        myProfile.trialClaims = claimed;

        if (window.SoundManager) SoundManager.play('money');

        // Open Comic Celebration Modal
        openRewardModal({
            title: `一次領取了 ${eligible.length} 個試煉里程碑！`,
            items: aggregateItems,
            newChars: newlyUnlockedChars,
            dupeChars: dupeCharNames,
            totalDupeMoney: totalDupeMoney,
            unlockedTitle: unlockedTitles.join('、'),
            note: notes.join(' / ')
        });

        // Refresh UI & Notification Dots
        renderTrial();
        if (typeof NotificationManager !== 'undefined') {
            NotificationManager.refresh(myProfile);
        }
    } catch (err) {
        console.error('Claim all eligible error:', err);
        alert('一鍵領取失敗：' + err.message);
        renderTrial();
    }
}

// ── Comic Custom Celebration Modal ──────────────────────────────────────────
function openRewardModal(summary) {
    const modal = document.getElementById('rewardModal');
    const body = document.getElementById('rewardModalBody');
    if (!modal || !body) return;

    let html = `
        <div style="font-weight:900; font-size:1.15rem; color:#0A0A0A; margin-bottom:4px;">
            ${summary.title || '獎勵領取成功！'}
        </div>
    `;

    // Items
    if (summary.items && Object.keys(summary.items).length > 0) {
        html += `
            <div class="claim-summary-group">
                <div class="claim-group-title">🎁 獲得道具</div>
                <div class="claim-items-chips">
                    ${Object.keys(summary.items).map(k => `
                        <div class="reward-chip c-item">
                            ${getItemIconHtml(k, 'item-icon-inline')}
                            <span>${ITEM_NAMES[k] || k}</span>
                            <span class="item-count-badge">x${summary.items[k]}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // New Characters
    if (summary.newChars && summary.newChars.length > 0) {
        html += `
            <div class="claim-summary-group">
                <div class="claim-group-title">👤 解鎖新角色</div>
                <div class="claim-items-chips">
                    ${summary.newChars.map(cName => {
                        const rarity = getCharRarity(cName);
                        const rInfo = RARITY_INFO[rarity] || RARITY_INFO.COMMON;
                        return `
                            <div class="reward-chip c-char">
                                <span class="char-rarity-pill ${rInfo.css}">${rInfo.name}</span>
                                <span>${cName}</span>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    // Titles
    if (summary.unlockedTitle) {
        html += `
            <div class="claim-summary-group">
                <div class="claim-group-title">🎖️ 解鎖稱號</div>
                <div class="reward-chip c-title">
                    <span>👑 ${summary.unlockedTitle}</span>
                </div>
            </div>
        `;
    }

    // Duplicate Money Conversion
    if (summary.totalDupeMoney > 0) {
        html += `
            <div class="dupe-coin-callout">
                <span>💸</span>
                <span>包含重複獲得的角色，已自動轉換為 <strong>+${summary.totalDupeMoney} 錢錢</strong>！</span>
            </div>
        `;
    }

    // Notes
    if (summary.note) {
        html += `
            <div class="reward-chip c-note" style="width:100%;">
                <span>📦 特殊解鎖：${summary.note}</span>
            </div>
        `;
    }

    body.innerHTML = html;
    modal.classList.add('show');
}

function closeRewardModal() {
    const modal = document.getElementById('rewardModal');
    if (modal) modal.classList.remove('show');
}
