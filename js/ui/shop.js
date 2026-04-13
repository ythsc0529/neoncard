/**
 * 商店與抽獎系統 (Shop & Gacha)
 * Fix notes:
 * - Rarity strings now UPPERCASE to match ALL_CHARACTERS data (COMMON, RARE, EPIC, LEGENDARY, MYTHIC)
 * - UserProfile.updateInventory called with (uid, key, amount) shorthand
 * - EXP_CONVERSION keys are uppercase
 * - CSS rarity classes derived via .toLowerCase()
 */

let myProfile = null;
let allCharacters = [];
let activeTab = 'gacha';
let activePoolId = 'general';
let isAnimating = false;

// ── Shop Items ──────────────────────────────────────────────────────────────
const SHOP_ITEMS = [
    { id: 't_normal',      name: '普通抽獎券',        desc: '可用於一般獎池抽獎',              price: 300, currency: 'money',    icon: '🎟️' },
    { id: 't_premium',     name: '高級抽獎券',        desc: '可用於限定獎池抽獎',              price: 600, currency: 'money',    icon: '🌟' },
    { id: 't_special',     name: '特殊抽獎券',        desc: '可用於限定獎池抽獎',              price: 65,  currency: 'landDeed', icon: '✨' },
    { id: 'pass_ticket',   name: '通行證兌換券',      desc: '可兌換通行證',                    price: 50,  currency: 'landDeed', icon: '🎫', limit: 'season_1' },
    { id: 'forgive_ticket',name: '贖罪券',            desc: '排位戰敗時避免扣星',              price: 200, currency: 'money',    icon: '🛡️', dailyLimit: 1 },
    { id: 'pack_67',       name: '組合包-阿共67!!',    desc: '包含: 阿共、67！\n稱號: 阿公67\n重複轉15錢錢',
      price: 67, currency: 'money', isBundle: true, chars: ['阿共', '67！'], title: '阿公67', dupeReward: { type: 'money', amount: 15 } },
    { id: 'pack_mahjong',  name: '組合包-麻將組合包', desc: '包含東南西北等多種麻將角色\n稱號: 門清一摸三\n重複轉50錢錢',
      price: 850, currency: 'money', isBundle: true, chars: ['東風','南風','西風','北風','紅中','發財','白板','麻將俠','包牌俠'], title: '門清一摸三', dupeReward: { type: 'money', amount: 50 } },
    { id: 'pack_traffic',  name: '組合包-馬路三寶',   desc: '包含各式載具與坦克\n重複轉5地契',
      price: 3000, currency: 'money', isBundle: true, chars: ['捷運','火箭','輪胎','單車','火車','越野摩托車','重型摩托車','水上摩托車','狗狗肉摩托車','高鐵','托你使坦克','虎式坦克','K型戰機','超級坦克'], dupeReward: { type: 'landDeed', amount: 5 } },
    { id: 'pack_space',    name: '組合包-太陽與地球', desc: '包含: 太陽、地球\n稱號: 太陽與地球',
      price: 600, currency: 'money', isBundle: true, chars: ['太陽', '地球'], title: '太陽與地球', dupeReward: { type: 'money', amount: 30 } }
];

// ── Specific pool character lists ───────────────────────────────────────────
const STAR_POOL_CHARS = ['周接輪','奧沙利文','賦能哥','蓋','當你','巴萬','愛因斯坦','阿福','扁佛狹','美秀吉團','草東街','老利','王欸等','比二蓋紙','無慈母手中線','豬自清','達文西','堯冥','黃蓋','王世堅情','婕媞','講晚安','摳P','伽利略','怕瘦團','李翊Ray','庫裡面','小米','賈伯斯','莫那魯道','傳奇肘擊王','周瑜','趙雲','Peter','李白','Ray生我夢','科比布萊恩特','奧本海默','麥狄'];
const SCI_POOL_CHARS  = ['噬菌體','抗生素','灰塵','水星','金星','火星','木星','土星','天王星','海王星','機器人I','機器人II','機器人III','燒杯','火火火','石化','曲線','地球','愛因斯坦','太陽','達文西','機器母巢','函數','f(x)','結膜炎','伽利略','熱布朗運動','小米','賈伯斯','概率學','悖論','K型戰機','Peter','奧本海默','四維'];
const TITLES_POOL     = ['踢飛起步','我是你爸','你搞笑?','你講真','算你雖','哈味','香菇怎麼叫','穿山甲欸','不要你離開','逼逼喇不','母雞抖','棒棒棒棒','我的豆花'];
const EXCLUDED_GENERAL = ['開發者', '作弊者'];

// ── Gacha Pool definitions ──────────────────────────────────────────────────
const GACHA_POOLS = [
    { id: 'general', name: '🎲 一般獎池',      desc: '常駐獎池，十抽必中史詩以上\n排除開發者及通行證角色。',                  costType: 'drawNormal',  costName: '普通抽獎券', costAmount: 1, hasFreeDaily: true,  bg: 'linear-gradient(135deg,rgba(255,255,255,.1),rgba(0,0,0,.5))',      ratesHtml: '一般(39%) | 稀有(34%) | 史詩(17%) | 傳說(8%) | 神話(2%)<br>重複角色轉化為 EXP。' },
    { id: 'star',    name: '🌟 明星對決',      desc: '專屬名人與明星角色限定獎池！',                                              costType: 'drawPremium', costName: '高級抽獎券', costAmount: 1, hasFreeDaily: false, bg: 'linear-gradient(135deg,rgba(255,215,0,.2),rgba(255,100,100,.2))', ratesHtml: '稀有(58%) | 史詩(22%) | 傳說(14%) | 神話(6%)<br>重複角色轉化為 EXP。' },
    { id: 'science', name: '🔭 科學進步',      desc: '專屬科學、宇宙與發明相關角色。',                                            costType: 'drawPremium', costName: '高級抽獎券', costAmount: 1, hasFreeDaily: false, bg: 'linear-gradient(135deg,rgba(0,255,255,.2),rgba(0,50,200,.2))',    ratesHtml: '一般(39%) | 稀有(34%) | 史詩(17%) | 傳說(8%) | 神話(2%)<br>重複角色轉化為 EXP。' },
    { id: 'evo',     name: '🔥 進化論',        desc: '極高機率！必中未擁有角色直到抽完所有傳說神話池。',                          costType: 'drawSpecial', costName: '特殊抽獎券', costAmount: 1, hasFreeDaily: false, bg: 'linear-gradient(135deg,rgba(255,0,0,.2),rgba(255,0,255,.2))',    ratesHtml: '傳說(60%) | 神話(40%)<br>若已全圖鑑則轉化為 EXP。' },
    { id: 'titles',  name: '🎖️ 皇民化運動(稱號)',desc: '隨機獲得限定趣味稱號！',                                                   costType: 'drawPremium', costName: '高級抽獎券', costAmount: 1, hasFreeDaily: false, bg: 'linear-gradient(135deg,rgba(0,255,100,.2),rgba(0,100,50,.2))',  ratesHtml: '必中非重複稱號。<br>若已獲全部稱號則無法抽取。' }
];

// ── Rates — keys UPPERCASE to match ALL_CHARACTERS rarity field ─────────────
const RATES = {
    general: { MYTHIC: 0.02, LEGENDARY: 0.08, EPIC: 0.17, RARE: 0.34, COMMON: 0.39 },
    star:    { MYTHIC: 0.06, LEGENDARY: 0.14, EPIC: 0.22, RARE: 0.58, COMMON: 0 },
    evo:     { MYTHIC: 0.40, LEGENDARY: 0.60, EPIC: 0, RARE: 0, COMMON: 0 }
};

// EXP on duplicate pull — keys UPPERCASE
const EXP_CONVERSION = { MYTHIC: 280, LEGENDARY: 180, EPIC: 115, RARE: 75, COMMON: 30 };

// ── Init ────────────────────────────────────────────────────────────────────
AuthManager.init();
AuthManager.onAuthChanged(async (user) => {
    if (!user) { location.href = 'index.html'; return; }

    if (typeof ALL_CHARACTERS !== 'undefined') allCharacters = ALL_CHARACTERS;
    else if (typeof window.characters !== 'undefined') allCharacters = window.characters;

    await refreshProfile(user.uid);
    renderShop();
    renderPools();
    selectPool('general');

    document.getElementById('pageLoading').style.display = 'none';
    document.getElementById('shopPage').style.display = 'block';
});

async function refreshProfile(uid) {
    if (!uid && myProfile) uid = myProfile.uid;
    myProfile = await UserProfile.getProfile(uid);
    updateCurrencyDisplay();
}

function updateCurrencyDisplay() {
    if (!myProfile) return;
    const inv = myProfile.inventory || {};
    document.getElementById('v-money').textContent         = inv.money        || 0;
    document.getElementById('v-deed').textContent          = inv.landDeed     || 0;
    document.getElementById('v-ticket-normal').textContent  = inv.drawNormal   || 0;
    document.getElementById('v-ticket-premium').textContent = inv.drawPremium  || 0;
    document.getElementById('v-ticket-special').textContent = inv.drawSpecial  || 0;
}

function switchTab(tab) {
    activeTab = tab;
    document.getElementById('tab-gacha').classList.toggle('active', tab === 'gacha');
    document.getElementById('tab-shop').classList.toggle('active', tab === 'shop');
    document.getElementById('content-gacha').classList.toggle('active', tab === 'gacha');
    document.getElementById('content-shop').classList.toggle('active', tab === 'shop');
}

// ── Shop System ──────────────────────────────────────────────────────────────
function isToday(timestamp) {
    if (!timestamp) return false;
    const d = new Date(timestamp), t = new Date();
    return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
}

function getDailyCount(itemId) {
    const usage = myProfile.inventory?.dailyUsage || {};
    if (!usage[itemId] || !isToday(usage[itemId].lastDate)) return 0;
    return usage[itemId].count || 0;
}

function renderShop() {
    const grid = document.getElementById('shopGrid');
    grid.innerHTML = '';
    SHOP_ITEMS.forEach(item => {
        let disabled = false, limitTxt = '';
        if (item.dailyLimit) {
            const count = getDailyCount(item.id);
            limitTxt = `每日限購: ${count}/${item.dailyLimit}`;
            if (count >= item.dailyLimit) disabled = true;
        }
        if (item.limit) {
            const purchased = (myProfile.inventory?.oneTimePurchases || []).includes(item.id);
            limitTxt = purchased ? '已購買' : '限購一次';
            if (purchased) disabled = true;
        }
        const currIcon = item.currency === 'money' ? '💰' : '📜';
        const currColor = item.currency === 'money' ? 'var(--neon-gold)' : '#ff6b35';
        const card = document.createElement('div');
        card.className = 'shop-item';
        card.innerHTML = `
            <div style="font-size:3rem;margin-bottom:10px;">${item.icon || '📦'}</div>
            <div class="shop-item-title">${item.name}</div>
            <div class="shop-item-desc">${item.desc.replace(/\n/g, '<br>')}</div>
            <div class="shop-item-limit">${limitTxt}</div>
            <button class="btn btn-sm btn-buy"
                style="border-color:${currColor};color:${currColor};opacity:${disabled?0.5:1};"
                onclick="buyItem('${item.id}')" ${disabled?'disabled':''}>
                ${currIcon} ${item.price} 購買
            </button>`;
        grid.appendChild(card);
    });
}

async function buyItem(id) {
    const item = SHOP_ITEMS.find(x => x.id === id);
    if (!item) return;
    const curAmount = myProfile.inventory?.[item.currency] || 0;
    if (curAmount < item.price) { alert(`餘額不足！需要 ${item.price} ${item.currency==='money'?'錢錢':'地契'}`); return; }
    if (!confirm(`確定要花費 ${item.price} ${item.currency==='money'?'錢錢':'地契'} 購買 ${item.name} 嗎？`)) return;

    try {
        await UserProfile.updateInventory(myProfile.uid, item.currency, -item.price);

        if (item.id === 't_normal')      await UserProfile.updateInventory(myProfile.uid, 'drawNormal', 1);
        if (item.id === 't_premium')     await UserProfile.updateInventory(myProfile.uid, 'drawPremium', 1);
        if (item.id === 't_special')     await UserProfile.updateInventory(myProfile.uid, 'drawSpecial', 1);
        if (item.id === 'pass_ticket')   await UserProfile.updateInventory(myProfile.uid, 'passToken', 1);
        if (item.id === 'forgive_ticket')await UserProfile.updateInventory(myProfile.uid, 'forgiveToken', 1);
        if (item.id === 'land_deed')     await UserProfile.updateInventory(myProfile.uid, 'landDeed', 1);

        if (item.isBundle) {
            let dupeCount = 0;
            if (item.title) {
                if (!(myProfile.titles || []).includes(item.title)) await UserProfile.unlockTitle(myProfile.uid, item.title);
            }
            for (const cName of (item.chars || [])) {
                if ((myProfile.unlockedCharacters || []).includes(cName)) dupeCount++;
                else await UserProfile.unlockCharacter(myProfile.uid, cName);
            }
            if (dupeCount > 0 && item.dupeReward) {
                const total = dupeCount * item.dupeReward.amount;
                await UserProfile.updateInventory(myProfile.uid, item.dupeReward.type, total);
                alert(`購買成功！\n因已擁有${dupeCount}隻角色，轉化為 ${total} ${item.dupeReward.type==='money'?'錢錢':'地契'}！`);
            } else { alert('購買成功！'); }
        } else { alert('購買成功！'); }

        // Log daily/one-time restrictions
        const extra = {};
        if (item.limit) {
            extra['inventory.oneTimePurchases'] = [...(myProfile.inventory?.oneTimePurchases||[]), item.id];
        }
        if (item.dailyLimit) {
            const usage = myProfile.inventory?.dailyUsage || {};
            const cur = usage[item.id] || { count:0, lastDate:0 };
            usage[item.id] = { count: isToday(cur.lastDate) ? cur.count+1 : 1, lastDate: Date.now() };
            extra['inventory.dailyUsage'] = usage;
        }
        if (Object.keys(extra).length) await UserProfile.updateProfile(myProfile.uid, extra);

        await refreshProfile(myProfile.uid);
        renderShop();
    } catch(err) { alert('購買異動發生錯誤: ' + err.message); }
}

// ── Gacha Pool System ────────────────────────────────────────────────────────
function renderPools() {
    document.getElementById('poolList').innerHTML = GACHA_POOLS.map(p => `
        <div class="pool-btn" id="poolbtn-${p.id}" onclick="selectPool('${p.id}')">
            <div class="pool-title">${p.name}</div>
            <div class="pool-subtitle">使用: ${p.costName}</div>
        </div>`).join('');
}

function selectPool(id) {
    activePoolId = id;
    document.querySelectorAll('.pool-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`poolbtn-${id}`).classList.add('active');
    const pool = GACHA_POOLS.find(p => p.id === id);
    document.getElementById('poolBanner').textContent = pool.name;
    document.getElementById('poolBanner').style.background = pool.bg;
    document.getElementById('poolDesc').innerHTML =
        `<strong>[卡池特色]</strong><br>${pool.desc.replace(/\n/g,'<br>')}<br><br><strong>[機率與規則]</strong><br>${pool.ratesHtml}`;
    document.getElementById('poolActions').style.display = 'flex';

    let cost1 = `消耗: 1 ${pool.costName}`;
    if (pool.hasFreeDaily && !isToday(myProfile?.dailyResetTime?.freeGacha || 0)) cost1 = '今日免費!';
    document.getElementById('costPull1').textContent  = cost1;
    document.getElementById('costPull10').textContent = `消耗: 10 ${pool.costName}`;
}

// Pick rarity — ratesMap keys are UPPERCASE matching ALL_CHARACTERS.rarity
function pickRarity(ratesMap, isTenth) {
    if (isTenth) {
        const epicPlusTotal = (ratesMap.EPIC||0) + (ratesMap.LEGENDARY||0) + (ratesMap.MYTHIC||0);
        if (epicPlusTotal > 0 && Math.random() < 0.9) {
            const r = Math.random() * epicPlusTotal;
            if (r < (ratesMap.MYTHIC||0)) return 'MYTHIC';
            if (r < (ratesMap.MYTHIC||0) + (ratesMap.LEGENDARY||0)) return 'LEGENDARY';
            return 'EPIC';
        }
    }
    let roll = Math.random();
    for (const r of ['MYTHIC','LEGENDARY','EPIC','RARE','COMMON']) {
        if (!ratesMap[r]) continue;
        if (roll <= ratesMap[r]) return r;
        roll -= ratesMap[r];
    }
    return 'COMMON';
}

// Filter pool — rarity is UPPERCASE string
function filterCharPool(poolDef, rarity) {
    let pool = allCharacters.filter(c => c.rarity === rarity && c.rarity !== 'SPECIAL');
    if (['general','science','star'].includes(poolDef.id)) pool = pool.filter(c => !EXCLUDED_GENERAL.includes(c.name));
    if (poolDef.id === 'star')    pool = pool.filter(c => STAR_POOL_CHARS.includes(c.name));
    if (poolDef.id === 'science') pool = pool.filter(c => SCI_POOL_CHARS.includes(c.name));
    return pool;
}

async function performPull(times) {
    if (isAnimating) return;
    isAnimating = true;

    const pool = GACHA_POOLS.find(p => p.id === activePoolId);
    if (!pool) { isAnimating = false; return; }

    // Visual feedback: block buttons and show loading instantly
    document.querySelectorAll('.btn-pull').forEach(b => b.disabled = true);
    document.getElementById('gachaAnimModal').style.display = 'flex';
    document.getElementById('gachaAnimTitle').textContent = '正在通訊與抽取...';
    document.getElementById('gachaResults').innerHTML = '<div class="neon-text" style="color:var(--neon-cyan);margin-top:50px;">正在請求數據庫...</div>';

    try {
        let isFree = false;
        if (times === 1 && pool.hasFreeDaily && !isToday(myProfile?.dailyResetTime?.freeGacha || 0)) isFree = true;

        if (!isFree) {
            const curAmount = myProfile.inventory?.[pool.costType] || 0;
            if (curAmount < pool.costAmount * times) {
                alert(`您的 ${pool.costName} 不足！\n擁有: ${curAmount} | 需要: ${pool.costAmount * times}`);
                isAnimating = false;
                document.getElementById('gachaAnimModal').style.display = 'none';
                document.querySelectorAll('.btn-pull').forEach(b => b.disabled = false);
                return;
            }
        }

        const results = [];
        const rateKey = activePoolId === 'star' ? 'star' : (activePoolId === 'evo' ? 'evo' : 'general');
        const baseRates = RATES[rateKey] || RATES.general;

        // 1. Generate core results (Logic is local and fast)
        if (activePoolId === 'titles') {
            for (let i = 0; i < times; i++) {
                const avail = TITLES_POOL.filter(t => !(myProfile.titles || []).includes(t) && !results.some(r => r.name === t));
                if (!avail.length) break;
                results.push({ type: 'title', name: avail[Math.floor(Math.random() * avail.length)], rarity: 'EPIC', isDupe: false });
            }
        } else {
            for (let i = 0; i < times; i++) {
                let picked;
                let isDupe = false;
                
                if (activePoolId === 'evo') {
                    const lAndM = allCharacters.filter(c => c.rarity === 'LEGENDARY' || c.rarity === 'MYTHIC');
                    const unowned = lAndM.filter(c => !(myProfile.unlockedCharacters || []).includes(c.name) && !results.some(r => r.name === c.name));
                    picked = unowned.length > 0 ? unowned[Math.floor(Math.random() * unowned.length)] : lAndM[Math.floor(Math.random() * lAndM.length)];
                } else {
                    const isTenth = (i === 9);
                    const r = pickRarity(baseRates, isTenth);
                    const candidates = filterCharPool(pool, r);
                    picked = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : allCharacters.filter(c => c.rarity !== 'SPECIAL' && !EXCLUDED_GENERAL.includes(c.name))[0];
                }
                
                isDupe = (myProfile.unlockedCharacters || []).includes(picked.name) || results.some(x => x.name === picked.name);
                results.push({ type: 'char', name: picked.name, rarity: picked.rarity, isDupe });
            }
        }

        if (results.length === 0 && activePoolId === 'titles') {
            alert("您已獲得皇民化運動的所有稱號！");
            isAnimating = false;
            document.getElementById('gachaAnimModal').style.display = 'none';
            document.querySelectorAll('.btn-pull').forEach(b => b.disabled = false);
            return;
        }

        // 2. Perform ALL database writes (parallel as much as possible)
        const dbTasks = [];
        const newChars = results.filter(r => r.type === 'char' && !r.isDupe).map(r => r.name);
        const newTitles = results.filter(r => r.type === 'title' && !r.isDupe).map(r => r.name);
        let totalExp = 0;

        // Deduct cost
        if (!isFree) {
            dbTasks.push(UserProfile.updateInventory(myProfile.uid, pool.costType, -(pool.costAmount * times)));
            myProfile.inventory[pool.costType] -= (pool.costAmount * times); // Instant local update
        } else {
            dbTasks.push(UserProfile.updateProfile(myProfile.uid, { "dailyResetTime.freeGacha": Date.now() }));
        }

        // Unlocks
        if (newChars.length) {
            dbTasks.push(UserProfile.batchUnlockCharacters(myProfile.uid, newChars));
            myProfile.unlockedCharacters = [...(myProfile.unlockedCharacters || []), ...newChars]; // Instant local
        }
        if (newTitles.length) {
            dbTasks.push(UserProfile.batchUnlockTitles(myProfile.uid, newTitles));
            myProfile.titles = [...(myProfile.titles || []), ...newTitles]; // Instant local
        }

        // EXP for dupes
        results.forEach(r => {
            if (r.type === 'char' && r.isDupe) {
                const expVal = EXP_CONVERSION[r.rarity] || 30;
                totalExp += expVal;
                r.dupeTxt = `轉化為 ${expVal} EXP`;
            }
        });
        if (totalExp > 0) dbTasks.push(UserProfile.gainExp(myProfile.uid, totalExp));

        // Wait for all critical DB writes
        await Promise.all(dbTasks);

        // Update display and start animation
        updateCurrencyDisplay(); 
        showAnimation(results);

        // Background refresh to ensure consistency (no await)
        setTimeout(() => refreshProfile(myProfile.uid), 1500);

    } catch (err) {
        console.error('[Gacha Error]', err);
        alert('抽獎過程發生錯誤，請重新整理頁面: ' + err.message);
        isAnimating = false;
        document.getElementById('gachaAnimModal').style.display = 'none';
        document.querySelectorAll('.btn-pull').forEach(b => b.disabled = false);
    }
}

// ── Animation ────────────────────────────────────────────────────────────────
function showAnimation(results) {
    isAnimating = true;
    document.getElementById('gachaAnimTitle').textContent = '抽取結果';
    const container = document.getElementById('gachaResults');
    container.innerHTML = '';

    results.forEach((r, idx) => {
        const rarityLower = r.rarity ? r.rarity.toLowerCase() : 'common';
        const colorClass  = `rarity-${rarityLower}`;
        const delay = idx * 0.15;

        let innerImg = '<div style="font-size:3rem;margin-bottom:10px;">🃏</div>';
        if (r.type === 'title') innerImg = '<div style="font-size:3rem;margin-bottom:10px;">🎖️</div>';

        let dupeHtml = r.isDupe
            ? `<div class="dupe-tag">${r.dupeTxt || '重複'}</div>`
            : `<div style="font-size:0.7rem;color:var(--neon-green);margin-top:auto;">NEW!</div>`;

        const cardWrap = document.createElement('div');
        cardWrap.className = 'gacha-card-wrap';
        cardWrap.style.animationDelay = `${delay}s`;
        cardWrap.innerHTML = `
            <div class="gacha-card-face gacha-card-back ${colorClass}">
                <div style="font-size:2rem;opacity:0.3;">?</div>
            </div>
            <div class="gacha-card-face gacha-card-front ${colorClass}">
                ${innerImg}
                <div class="name">${r.name}</div>
                ${dupeHtml}
            </div>`;
        cardWrap.onclick = () => cardWrap.classList.add('flipped');
        container.appendChild(cardWrap);
    });
}

function skipAnim() {
    const cards = document.querySelectorAll('.gacha-card-wrap');
    let allFlipped = true;
    cards.forEach(c => { if (!c.classList.contains('flipped')) { allFlipped = false; c.classList.add('flipped'); } });
    
    const btn = document.getElementById('btnSkipAnim');
    if (!allFlipped) {
        // Just flip everything
        cards.forEach(c => c.classList.add('flipped'));
        btn.textContent = '領取獎勵';
        btn.classList.add('btn-cyan'); // Highlight it
    } else {
        // All flipped, now we can claim and leave
        finishGacha();
    }
}

// Separate function to handle the final closing
async function finishGacha() {
    const modal = document.getElementById('gachaAnimModal');
    modal.style.display = 'none';
    isAnimating = false;
    document.querySelectorAll('.btn-pull').forEach(b => b.disabled = false);
    
    // Final UI cleanup
    const btn = document.getElementById('btnSkipAnim');
    btn.textContent = '點擊翻開全部 / 離開';
    btn.classList.remove('btn-cyan');
    
    selectPool(activePoolId);
}

// Add state listener to cards to check if all are flipped manually
document.addEventListener('click', (e) => {
    if (e.target.closest('.gacha-card-wrap')) {
        setTimeout(() => {
            const cards = document.querySelectorAll('.gacha-card-wrap');
            if (cards.length > 0) {
                const allFlipped = Array.from(cards).every(c => c.classList.contains('flipped'));
                if (allFlipped) {
                    const btn = document.getElementById('btnSkipAnim');
                    btn.textContent = '領取獎勵';
                    btn.classList.add('btn-cyan');
                }
            }
        }, 300);
    }
});
