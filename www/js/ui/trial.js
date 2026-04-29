/**
 * 試煉之路 (Path of Trials)
 * Fix notes:
 * - Uses UserProfile.getExpRequirement() (now available)
 * - updateInventory called with (uid, key, amount) shorthand
 * - Renders all levels 0-25 + special 50/100 regardless of player level
 * - CHAR_DUPE_MONEY keys are UPPERCASE matching ALL_CHARACTERS.rarity
 */

let myProfile = null;
let allCharacters = [];
let hasAutoScrolled = false;

// Data and Logic are now imported from js/data/trialData.js

// Dupe money conversion — keys UPPERCASE matching ALL_CHARACTERS.rarity
const CHAR_DUPE_MONEY = { MYTHIC: 200, LEGENDARY: 125, EPIC: 70, RARE: 50, COMMON: 25 };

// Item display names for reward chips
const ITEM_NAMES = {
    money: '錢錢', landDeed: '地契', drawNormal: '普通抽獎券',
    drawPremium: '高級抽獎券', drawSpecial: '特殊抽獎券',
    passToken: '通行證兌換券', forgiveToken: '贖罪券'
};

// ── Auth ─────────────────────────────────────────────────────────────────────
AuthManager.init();
AuthManager.onAuthChanged(async (user) => {
    if (!user) { location.href = 'index.html'; return; }
    myProfile = await UserProfile.getProfile(user.uid);
    if (typeof ALL_CHARACTERS !== 'undefined') allCharacters = ALL_CHARACTERS;
    else if (typeof window.characters !== 'undefined') allCharacters = window.characters;
    renderTrial();
});

// ── Render ────────────────────────────────────────────────────────────────────
function renderTrial() {
    const p = myProfile;
    const curLvl  = p.level || 0;
    const curExp  = p.exp   || 0;

    // EXP bar
    const reqExp      = UserProfile.getExpRequirement(curLvl);
    const prevReqExp  = curLvl > 0 ? UserProfile.getExpRequirement(curLvl - 1) : 0;
    const rangeTotal  = reqExp - prevReqExp;
    const rangeCur    = Math.max(0, curExp - prevReqExp);
    const pct         = Math.min(100, (rangeCur / rangeTotal) * 100) || 0;

    document.getElementById('displayLevel').textContent = curLvl;
    document.getElementById('displayExp').textContent   = `${curExp} / ${reqExp}`;
    document.getElementById('expFill').style.width      = `${pct}%`;

    // Build level list — always show 0-25, plus any levels above player level+5 up to 30, plus 50 & 100
    const levelsToDraw = new Set();
    for (let i = 0; i <= 25; i++) levelsToDraw.add(i);
    if (curLvl > 25) { for (let i = 26; i <= Math.max(curLvl + 5, 30); i++) levelsToDraw.add(i); }
    levelsToDraw.add(50);
    levelsToDraw.add(100);
    const sorted = [...levelsToDraw].sort((a, b) => a - b);

    const claimed = p.trialClaims || [];
    const list = document.getElementById('milestones');
    list.innerHTML = '';

    sorted.forEach(lv => {
        const data       = TrialLogic.getTrialData(lv);
        const isUnlocked = curLvl >= lv;
        const isClaimed  = claimed.includes(lv);
        const hasRewards = data.chars.length > 0 || Object.keys(data.items).length > 0 || data.title;

        // Build reward chips
        let rewardsHtml = '';
        data.chars.forEach(c  => rewardsHtml += `<div class="reward-chip c-char">👤 ${c}</div>`);
        Object.keys(data.items).forEach(k => {
            const icon = getItemIconHtml(k);
            const name = ITEM_NAMES[k] || k;
            rewardsHtml += `<div class="reward-chip"><span class="c-item">${icon} ${name} x${data.items[k]}</span></div>`;
        });
        if (data.title) rewardsHtml += `<div class="reward-chip c-title">🎖️ ${data.title}</div>`;
        if (data.note)  rewardsHtml += `<div class="reward-chip" style="color:var(--neon-gold);">📦 ${data.note}</div>`;
        if (!rewardsHtml) rewardsHtml = `<span style="color:var(--text-muted);">本級無獎勵</span>`;

        // Button
        let btnHtml;
        if (isClaimed)       btnHtml = `<button class="btn" disabled style="opacity:0.5;">已領取 ✓</button>`;
        else if (isUnlocked) btnHtml = `<button class="btn btn-gold" onclick="claimLevel(${lv}, this)">領取獎勵</button>`;
        else                 btnHtml = `<button class="btn" disabled style="opacity:0.3;">未解鎖 🔒</button>`;

        const card = document.createElement('div');
        card.className = `milestone-card ${isUnlocked&&!isClaimed?'unlocked':''} ${isClaimed?'claimed':''}`;
        if (lv === curLvl) card.id = 'current-level-card';
        card.innerHTML = `
            <div class="milestone-level">Lv.${lv}</div>
            <div class="milestone-rewards">${rewardsHtml}</div>
            <div>${btnHtml}</div>`;
        list.appendChild(card);
    });

    // Auto-scroll to current level on first render
    if (!hasAutoScrolled) {
        const target = document.getElementById('current-level-card');
        if (target) {
            // Using setTimeout to ensure DOM is ready and styled
            setTimeout(() => {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                hasAutoScrolled = true;
            }, 100);
        }
    }
}

// ── Claim ─────────────────────────────────────────────────────────────────────
async function claimLevel(lv, btnElem) {
    if (!myProfile) return;
    const claimed = myProfile.trialClaims || [];
    if (claimed.includes(lv) || (myProfile.level||0) < lv) return;

    btnElem.disabled = true;
    btnElem.textContent = '領取中...';
    const data = TrialLogic.getTrialData(lv);
    let moneyFromDupes = 0;

    try {
        // Items
        for (const key of Object.keys(data.items)) {
            await UserProfile.updateInventory(myProfile.uid, key, data.items[key]);
        }

        // Characters — convert dupes to money
        for (const cName of data.chars) {
            if ((myProfile.unlockedCharacters || []).includes(cName)) {
                const charObj = allCharacters.find(x => x.name === cName);
                const rarity  = charObj ? charObj.rarity : 'COMMON';
                moneyFromDupes += CHAR_DUPE_MONEY[rarity] || 25;
            } else {
                await UserProfile.unlockCharacter(myProfile.uid, cName);
                myProfile.unlockedCharacters = myProfile.unlockedCharacters || [];
                myProfile.unlockedCharacters.push(cName);
            }
        }
        if (moneyFromDupes > 0) await UserProfile.updateInventory(myProfile.uid, 'money', moneyFromDupes);

        // Title
        if (data.title) await UserProfile.unlockTitle(myProfile.uid, data.title);

        // Mark claimed
        if (window.SoundManager) SoundManager.play('money');
        claimed.push(lv);
        await UserProfile.updateProfile(myProfile.uid, { trialClaims: claimed });
        myProfile.trialClaims = claimed;

        const msg = moneyFromDupes > 0
            ? `領取成功！\n因已有部分角色，轉化為了 ${moneyFromDupes} 錢錢！`
            : '領取成功！';
        alert(msg);
        renderTrial();
        // Update global notification dots
        if (typeof NotificationManager !== 'undefined') NotificationManager.refresh(myProfile);
    } catch (err) {
        alert('領取失敗：' + err.message);
        btnElem.disabled = false;
        btnElem.textContent = '領取獎勵';
    }
}
