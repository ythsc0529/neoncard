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

// Level milestone rewards table
const TRIAL_REWARDS_TABLE = {
    0:   { chars: ['戰士','抽卡員','足球','機率型選手','灰塵','隨便你','巴萬','蝦子','史詩','聖女','水龍頭','教宗','英國紳士','小吉','很亮的魚'], items: { drawNormal: 10, money: 300, landDeed: 10, drawPremium: 1, forgiveToken: 2 }, title: '初到新星' },
    1:   { chars: ['沒錢','廚師','松鼠'], items: { money: 100 } },
    2:   { items: { money: 150 } },
    3:   { chars: ['莫那魯道'], items: { money: 150, landDeed: 30 } },
    4:   { items: { drawNormal: 2, money: 200, landDeed: 5 } },
    5:   { chars: ['海王星','盾哥','越野摩托車','致命','法特'], items: { drawNormal: 1, money: 50 } },
    6:   { items: { money: 50 } },
    7:   { chars: ['阿共','67！'], items: { drawNormal: 3 }, title: '失柳煎啾' },
    8:   { items: { money: 100, landDeed: 10 } },
    9:   { chars: ['內耗怪','厭世','李軍服'], items: { money: 50 } },
    10:  { chars: ['火車','鳳梨','劍盾'], items: { drawSpecial: 1, drawPremium: 2, drawNormal: 3, money: 500, landDeed: 30, passToken: 1, forgiveToken: 2 }, title: '真理學徒' },
    11:  { items: { money: 150 } },
    12:  { chars: ['12了'], items: { money: 100, forgiveToken: 1 }, title: '12了!' },
    13:  { items: { money: 150 } },
    14:  { items: { money: 150 } },
    15:  { items: { drawNormal: 2, money: 70, landDeed: 10, forgiveToken: 1 } },
    16:  { items: { money: 120 } },
    17:  { items: { money: 120 } },
    18:  { items: { money: 120 } },
    19:  { items: { money: 120 } },
    20:  { chars: ['結膜炎'], items: { money: 100, landDeed: 10 } },
    21:  { items: { money: 100 } },
    22:  { items: { money: 100 } },
    23:  { items: { money: 100 } },
    24:  { items: { money: 100 }, title: '萬人斬' },
    25:  { chars: ['亞克-I','抽卡時間','賴韋禎'], items: { money: 500, drawNormal: 1, drawSpecial: 1, forgiveToken: 1 }, title: '染血的權杖', note: '+ 麻將組合包' },
    50:  { chars: ['開發者','數值怪'], items: { drawSpecial: 1 }, title: '偽神' },
    100: { chars: ['作弊者'], items: { drawSpecial: 3, passToken: 1 }, title: '造物主' }
};

// Dupe money conversion — keys UPPERCASE matching ALL_CHARACTERS.rarity
const CHAR_DUPE_MONEY = { MYTHIC: 200, LEGENDARY: 125, EPIC: 70, RARE: 50, COMMON: 25 };

// Item display names for reward chips
const ITEM_NAMES = {
    money: '💰 錢錢', landDeed: '📜 地契', drawNormal: '🎟️ 普通抽獎券',
    drawPremium: '🌟 高級抽獎券', drawSpecial: '✨ 特殊抽獎券',
    passToken: '🎫 通行證兌換券', forgiveToken: '🛡️ 贖罪券'
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

// ── Data Helpers ─────────────────────────────────────────────────────────────
function getTrialData(lv) {
    const tbl = TRIAL_REWARDS_TABLE[lv];
    const data = { chars: [], items: {}, title: null, note: null };
    if (tbl) {
        if (tbl.chars)  data.chars  = [...tbl.chars];
        if (tbl.items)  data.items  = { ...tbl.items };
        if (tbl.title)  data.title  = tbl.title;
        if (tbl.note)   data.note   = tbl.note;
    }
    // Post-25: default 100 money per level; multiples of 5 also give deed + forgiveToken
    if (lv > 25 && !TRIAL_REWARDS_TABLE[lv]) {
        data.items.money = 100;
        if (lv % 5 === 0) { data.items.landDeed = 20; data.items.forgiveToken = 1; }
    }
    return data;
}

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
        const data       = getTrialData(lv);
        const isUnlocked = curLvl >= lv;
        const isClaimed  = claimed.includes(lv);
        const hasRewards = data.chars.length > 0 || Object.keys(data.items).length > 0 || data.title;

        // Build reward chips
        let rewardsHtml = '';
        data.chars.forEach(c  => rewardsHtml += `<div class="reward-chip c-char">👤 ${c}</div>`);
        Object.keys(data.items).forEach(k => {
            rewardsHtml += `<div class="reward-chip"><span class="c-item">${ITEM_NAMES[k]||k} x${data.items[k]}</span></div>`;
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
        card.innerHTML = `
            <div class="milestone-level">Lv.${lv}</div>
            <div class="milestone-rewards">${rewardsHtml}</div>
            <div>${btnHtml}</div>`;
        list.appendChild(card);
    });
}

// ── Claim ─────────────────────────────────────────────────────────────────────
async function claimLevel(lv, btnElem) {
    if (!myProfile) return;
    const claimed = myProfile.trialClaims || [];
    if (claimed.includes(lv) || (myProfile.level||0) < lv) return;

    btnElem.disabled = true;
    btnElem.textContent = '領取中...';

    const data = getTrialData(lv);
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
        claimed.push(lv);
        await UserProfile.updateProfile(myProfile.uid, { trialClaims: claimed });
        myProfile.trialClaims = claimed;

        const msg = moneyFromDupes > 0
            ? `領取成功！\n因已有部分角色，轉化為了 ${moneyFromDupes} 錢錢！`
            : '領取成功！';
        alert(msg);
        renderTrial();
    } catch (err) {
        alert('領取失敗：' + err.message);
        btnElem.disabled = false;
        btnElem.textContent = '領取獎勵';
    }
}
