/**
 * 商店與抽獎系統 (Shop & Gacha)
 */

let myProfile = null;
let allCharacters = [];
let activeTab = 'gacha';
let activePoolId = 'general';
let isAnimating = false;
let flipQueue = [];

// Shop Data
const SHOP_ITEMS = [
    { id: 't_normal', name: '普通抽獎券', desc: '可用於一般獎池抽獎', price: 300, currency: 'money', icon: '🎟️' },
    { id: 't_premium', name: '高級抽獎券', desc: '可用於限定獎池抽獎', price: 600, currency: 'money', icon: '🌟' },
    { id: 't_special', name: '特殊抽獎券', desc: '可用於限定獎池抽獎', price: 65, currency: 'landDeed', icon: '✨' },
    { id: 'pass_ticket', name: '通行證兌換券', desc: '可兌換通行證', price: 50, currency: 'landDeed', icon: '🎫', limit: 'season_1' },
    { id: 'forgive_ticket', name: '贖罪券', desc: '排位戰敗時避免扣星', price: 200, currency: 'money', icon: '🛡️', dailyLimit: 1 },
    { id: 'land_deed', name: '地契', desc: '用作部分商品兌換', price: 800, currency: 'money', icon: '📜', dailyLimit: 5 },
    { id: 'pack_67', name: '組合包-阿共67!!', desc: '包含: 阿共、67！\n稱號: 阿公67\n重複轉15錢錢', price: 67, currency: 'money', isBundle: true, chars: ['阿共', '67！'], title: '阿公67', dupeReward: { type: 'money', amount: 15 } },
    { id: 'pack_mahjong', name: '組合包-麻將組合包', desc: '包含東南西北等多種麻將角色\n稱號: 門清一摸三\n重複轉50錢錢', price: 850, currency: 'money', isBundle: true, chars: ['東風','南風','西風','北風','紅中','發財','白板','麻將俠','包牌俠'], title: '門清一摸三', dupeReward: { type: 'money', amount: 50 } },
    { id: 'pack_traffic', name: '組合包-馬路三寶', desc: '包含各式載具與坦克\n重複轉5地契', price: 3000, currency: 'money', isBundle: true, chars: ['捷運','火箭','輪胎','單車','火車','越野摩托車','重型摩托車','水上摩托車','狗狗肉摩托車','高鐵','托你使坦克','虎式坦克','K型戰機','超級坦克'], dupeReward: { type: 'landDeed', amount: 5 } },
    { id: 'pack_space', name: '組合包-太陽與地球', desc: '包含: 太陽、地球\n稱號: 太陽與地球', price: 600, currency: 'money', isBundle: true, chars: ['太陽', '地球'], title: '太陽與地球', dupeReward: { type: 'money', amount: 30 } }
];

// Reference arrays for specific pools
const STAR_POOL_CHARS = ['周接輪','奧沙利文','賦能哥','蓋','當你','巴萬','愛因斯坦','阿福','扁佛狹','美秀吉團','草東街','老利','王欸等','比二蓋紙','無慈母手中線','豬自清','達文西','堯冥','黃蓋','王世堅情','婕媞','講晚安','摳P','伽利略','怕瘦團','李翊Ray','庫裡面','小米','賈伯斯','莫那魯道','傳奇肘擊王','周瑜','趙雲','Peter','李白','Ray生我夢','科比布萊恩特','奧本海默','麥狄'];
const SCI_POOL_CHARS = ['噬菌體','抗生素','灰塵','水星','金星','火星','木星','土星','天王星','海王星','機器人I','機器人II','機器人III','燒杯','火火火','石化','曲線','地球','愛因斯坦','太陽','達文西','機器母巢','函數','f(x)','結膜炎','伽利略','熱布朗運動','小米','賈伯斯','概率學','悖論','K型戰機','Peter','奧本海默','四維'];
const TITLES_POOL = ['踢飛起步','我是你爸','你搞笑?','你講真','算你雖','哈味','香菇怎麼叫','穿山甲欸','不要你離開','逼逼喇不','母雞抖','棒棒棒棒','我的豆花'];

// Excluded characters for general pool
const EXCLUDED_GENERAL = ['開發者', '作弊者']; 

// Gacha rates configured as probabilities
const RATES = {
    general: { mythic: 0.02, legendary: 0.08, epic: 0.17, rare: 0.34, common: 0.39 },
    star:    { mythic: 0.06, legendary: 0.14, epic: 0.22, rare: 0.58, common: 0 },
    evo:     { mythic: 0.40, legendary: 0.60, epic: 0, rare: 0, common: 0 }
};

const EXP_CONVERSION = { mythic: 280, legendary: 180, epic: 115, rare: 75, common: 30 };

const GACHA_POOLS = [
    {
        id: 'general',
        name: '🎲 一般獎池',
        desc: '常駐獎池，十抽必中史詩以上\n排除開發者及通行證角色。',
        costType: 'drawNormal',
        costName: '普通抽獎券',
        costAmount: 1,
        hasFreeDaily: true,
        bg: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(0,0,0,0.5))',
        ratesHtml: '一般(39%) | 稀有(34%) | 史詩(17%) | 傳說(8%) | 神話(2%)<br>重複角色會轉化為經驗值。'
    },
    {
        id: 'star',
        name: '🌟 明星對決',
        desc: '專屬名人與明星角色限定獎池！',
        costType: 'drawPremium',
        costName: '高級抽獎券',
        costAmount: 1,
        hasFreeDaily: false,
        bg: 'linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,100,100,0.2))',
        ratesHtml: '稀有(58%) | 史詩(22%) | 傳說(14%) | 神話(6%)<br>重複角色會轉化為經驗值。'
    },
    {
        id: 'science',
        name: '🔭 科學進步',
        desc: '專屬科學、宇宙與發明相關角色。',
        costType: 'drawPremium',
        costName: '高級抽獎券',
        costAmount: 1,
        hasFreeDaily: false,
        bg: 'linear-gradient(135deg, rgba(0,255,255,0.2), rgba(0,50,200,0.2))',
        ratesHtml: '一般(39%) | 稀有(34%) | 史詩(17%) | 傳說(8%) | 神話(2%)<br>重複角色會轉化為經驗值。'
    },
    {
        id: 'evo',
        name: '🔥 進化論',
        desc: '極高機率！必中未擁有角色直到抽完所有傳說神話池。',
        costType: 'drawSpecial',
        costName: '特殊抽獎券',
        costAmount: 1,
        hasFreeDaily: false,
        bg: 'linear-gradient(135deg, rgba(255,0,0,0.2), rgba(255,0,255,0.2))',
        ratesHtml: '傳說(60%) | 神話(40%)<br>若已全圖鑑則轉化為經驗值。'
    },
    {
        id: 'titles',
        name: '🎖️ 皇民化運動 (稱號)',
        desc: '隨機獲得限定趣味稱號！',
        costType: 'drawPremium',
        costName: '高級抽獎券',
        costAmount: 1,
        hasFreeDaily: false,
        bg: 'linear-gradient(135deg, rgba(0,255,100,0.2), rgba(0,100,50,0.2))',
        ratesHtml: '必中非重複稱號。<br>若已獲全部稱號則無法抽取。'
    }
];

AuthManager.init();
AuthManager.onAuthChanged(async (user) => {
    if (!user) { location.href = 'index.html'; return; }
    
    // Load character catalog
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
    if(!uid && myProfile) uid = myProfile.uid;
    myProfile = await UserProfile.getProfile(uid);
    updateCurrencyDisplay();
}

function updateCurrencyDisplay() {
    if(!myProfile) return;
    const inv = myProfile.inventory || {};
    document.getElementById('v-money').textContent = inv.money || 0;
    document.getElementById('v-deed').textContent = inv.landDeed || 0;
    document.getElementById('v-ticket-normal').textContent = inv.drawNormal || 0;
    document.getElementById('v-ticket-premium').textContent = inv.drawPremium || 0;
    document.getElementById('v-ticket-special').textContent = inv.drawSpecial || 0;
}

function switchTab(tab) {
    activeTab = tab;
    document.getElementById('tab-gacha').classList.toggle('active', tab === 'gacha');
    document.getElementById('tab-shop').classList.toggle('active', tab === 'shop');
    document.getElementById('content-gacha').classList.toggle('active', tab === 'gacha');
    document.getElementById('content-shop').classList.toggle('active', tab === 'shop');
}

// ── Shop System ──────────────────────────────────────────────────────────

function isToday(timestamp) {
    if(!timestamp) return false;
    const date = new Date(timestamp);
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
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
        let disabled = false;
        let limitTxt = '';
        
        if (item.dailyLimit) {
            const count = getDailyCount(item.id);
            limitTxt = `每日限購: ${count}/${item.dailyLimit}`;
            if (count >= item.dailyLimit) disabled = true;
        }
        
        if (item.limit) {
            const purchased = (myProfile.inventory?.oneTimePurchases || []).includes(item.id);
            limitTxt = `限購一次`;
            if(purchased) { disabled = true; limitTxt = '已購買'; }
        }
        
        const currencyIcon = item.currency === 'money' ? '💰' : '📜';
        
        const card = document.createElement('div');
        card.className = 'shop-item';
        card.innerHTML = `
            <div style="font-size:3rem;margin-bottom:10px;animation:pulse 2s infinite;">${item.icon || '📦'}</div>
            <div class="shop-item-title">${item.name}</div>
            <div class="shop-item-desc">${item.desc.replace(/\n/g, '<br>')}</div>
            <div class="shop-item-limit">${limitTxt}</div>
            <button class="btn btn-sm btn-buy" style="border-color:${item.currency==='money'?'var(--neon-gold)':'#ff6b35'};color:${item.currency==='money'?'var(--neon-gold)':'#ff6b35'};opacity:${disabled?0.5:1};" onclick="buyItem('${item.id}')" ${disabled?'disabled':''}>
                ${currencyIcon} ${item.price} 購買
            </button>
        `;
        grid.appendChild(card);
    });
}

async function buyItem(id) {
    const item = SHOP_ITEMS.find(x => x.id === id);
    if (!item) return;
    
    const curAmount = myProfile.inventory?.[item.currency] || 0;
    if (curAmount < item.price) {
        alert(`餘額不足！需要 ${item.price} ${item.currency==='money'?'錢錢':'地契'}`);
        return;
    }
    
    if(!confirm(`確定要花費 ${item.price} ${item.currency==='money'?'錢錢':'地契'} 購買 ${item.name} 嗎？`)) return;
    
    try {
        // 扣款
        await UserProfile.updateInventory(myProfile.uid, item.currency, -item.price);
        
        // 發送物品
        if (item.id === 't_normal') await UserProfile.updateInventory(myProfile.uid, 'drawNormal', 1);
        if (item.id === 't_premium') await UserProfile.updateInventory(myProfile.uid, 'drawPremium', 1);
        if (item.id === 't_special') await UserProfile.updateInventory(myProfile.uid, 'drawSpecial', 1);
        if (item.id === 'pass_ticket') await UserProfile.updateInventory(myProfile.uid, 'passToken', 1);
        if (item.id === 'forgive_ticket') await UserProfile.updateInventory(myProfile.uid, 'forgiveToken', 1);
        if (item.id === 'land_deed') await UserProfile.updateInventory(myProfile.uid, 'landDeed', 1);
        
        if (item.isBundle) {
            // Process chars & titles
            let dupeCount = 0;
            if(item.title) {
                const ownsTitle = (myProfile.titles || []).includes(item.title);
                if(!ownsTitle) {
                    await UserProfile.unlockTitle(myProfile.uid, item.title);
                }
            }
            if(item.chars) {
                for(let cName of item.chars) {
                    if((myProfile.unlockedCharacters || []).includes(cName)) {
                        dupeCount++;
                    } else {
                        await UserProfile.unlockCharacter(myProfile.uid, cName);
                    }
                }
            }
            // Give dupe reward
            if(dupeCount > 0 && item.dupeReward) {
                const rewardTotal = dupeCount * item.dupeReward.amount;
                await UserProfile.updateInventory(myProfile.uid, item.dupeReward.type, rewardTotal);
                alert(`購買成功！\n因為已擁有些許角色，轉化為 ${rewardTotal} ${item.dupeReward.type==='money'?'錢錢':'地契'} 回收！`);
            } else {
                alert('購買成功！獲得了組合包的全部內容！');
            }
        } else {
            alert('購買成功！');
        }
        
        // Log restrictions
        let updates = {};
        if (item.limit) {
            const arr = myProfile.inventory?.oneTimePurchases || [];
            updates['inventory.oneTimePurchases'] = [...arr, item.id];
        }
        if (item.dailyLimit) {
            const usage = myProfile.inventory?.dailyUsage || {};
            const cur = usage[item.id] || { count:0, lastDate:0 };
            const count = isToday(cur.lastDate) ? cur.count + 1 : 1;
            usage[item.id] = { count, lastDate: Date.now() };
            updates['inventory.dailyUsage'] = usage;
        }
        if(Object.keys(updates).length > 0) {
            await UserProfile.updateProfile(myProfile.uid, updates);
        }
        
        await refreshProfile(myProfile.uid);
        renderShop();
        
    } catch(err) {
        alert('購買異動發生錯誤: ' + err.message);
    }
}


// ── Gacha Pool System ──────────────────────────────────────────────────

function renderPools() {
    const list = document.getElementById('poolList');
    list.innerHTML = GACHA_POOLS.map(p => `
        <div class="pool-btn" id="poolbtn-${p.id}" onclick="selectPool('${p.id}')">
            <div class="pool-title">${p.name}</div>
            <div class="pool-subtitle">使用: ${p.costName}</div>
        </div>
    `).join('');
}

function selectPool(id) {
    activePoolId = id;
    document.querySelectorAll('.pool-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`poolbtn-${id}`).classList.add('active');
    
    const pool = GACHA_POOLS.find(p => p.id === id);
    document.getElementById('poolBanner').textContent = pool.name;
    document.getElementById('poolBanner').style.background = pool.bg;
    document.getElementById('poolDesc').innerHTML = `
        <strong>[卡池特色]</strong><br>${pool.desc.replace(/\n/g, '<br>')}<br><br>
        <strong>[機率與規則]</strong><br>${pool.ratesHtml}
    `;
    
    document.getElementById('poolActions').style.display = 'flex';
    document.getElementById('costPull1').textContent = `消耗: 1 ${pool.costName}`;
    document.getElementById('costPull10').textContent = `消耗: 10 ${pool.costName}`;
    
    if (pool.hasFreeDaily) {
        const lastFree = myProfile.dailyResetTime?.freeGacha || 0;
        if (!isToday(lastFree)) {
            document.getElementById('costPull1').textContent = `今日免費!`;
        }
    }
}

// Draw Probability Logic
function pickRarity(ratesMap, isTenth) {
    if (isTenth && (Math.random() < 0.9)) {
        // Guaranteed Epic or better for 10th pull
        const epicPlus = { mythic: ratesMap.mythic, legendary: ratesMap.legendary, epic: ratesMap.epic };
        const total = epicPlus.mythic + epicPlus.legendary + epicPlus.epic;
        const r = Math.random() * total;
        if (r < epicPlus.mythic) return 'mythic';
        if (r < epicPlus.mythic + epicPlus.legendary) return 'legendary';
        return 'epic';
    }
    
    let roll = Math.random();
    for (let r of ['mythic', 'legendary', 'epic', 'rare', 'common']) {
        if (!ratesMap[r]) continue;
        if (roll <= ratesMap[r]) return r;
        roll -= ratesMap[r];
    }
    return 'common'; // fallback
}

function filterCharPool(poolDef, rarity) {
    let pool = allCharacters.filter(c => c.rarity === rarity);
    
    if (poolDef.id === 'general' || poolDef.id === 'science' || poolDef.id === 'star') {
        pool = pool.filter(c => !EXCLUDED_GENERAL.includes(c.name));
    }
    
    if (poolDef.id === 'star') {
        pool = pool.filter(c => STAR_POOL_CHARS.includes(c.name));
    }
    if (poolDef.id === 'science') {
        pool = pool.filter(c => SCI_POOL_CHARS.includes(c.name));
    }
    
    // Pass characters should be excluded. (We assume Pass chars have a custom property or are explicitly excluded. Wait, we don't have pass characters explicitly tagged here, we will just assume EXCLUDED_GENERAL works or we let them be).
    
    return pool;
}

async function performPull(times) {
    if (isAnimating) return;
    const pool = GACHA_POOLS.find(p => p.id === activePoolId);
    
    let isFree = false;
    if (times === 1 && pool.hasFreeDaily) {
        if (!isToday(myProfile.dailyResetTime?.freeGacha || 0)) isFree = true;
    }
    
    if (!isFree) {
        const curAmount = myProfile.inventory?.[pool.costType] || 0;
        if (curAmount < pool.costAmount * times) {
            alert(`您的 ${pool.costName} 不足！\n擁有: ${curAmount} | 需要: ${pool.costAmount * times}`);
            return;
        }
        await UserProfile.updateInventory(myProfile.uid, pool.costType, -(pool.costAmount * times));
    } else {
        await UserProfile.updateProfile(myProfile.uid, { "dailyResetTime.freeGacha": Date.now() });
    }
    
    // Execute Rolls
    let results = [];
    const baseRates = RATES[activePoolId === 'star' ? 'star' : (activePoolId === 'evo' ? 'evo' : 'general')];
    
    if (activePoolId === 'titles') {
        // Title Pool Logic
        const unowned = TITLES_POOL.filter(t => !(myProfile.titles || []).includes(t));
        if (unowned.length === 0) {
            alert("您已獲得皇民化運動的所有稱號！退還抽獎券。");
            await UserProfile.updateInventory(myProfile.uid, pool.costType, times * pool.costAmount);
            return;
        }
        for (let i=0; i<times; i++) {
            const avail = TITLES_POOL.filter(t => !(myProfile.titles || []).includes(t) && !results.some(r=>r.name === t));
            if(avail.length === 0) {
                // Out of titles mid-pull! Refund prorated
                await UserProfile.updateInventory(myProfile.uid, pool.costType, (times - i) * pool.costAmount);
                break;
            }
            const picked = avail[Math.floor(Math.random() * avail.length)];
            results.push({ type: 'title', name: picked, rarity: 'epic', isDupe: false });
        }
    } else {
        // Character Pools Logic
        for (let i = 0; i < times; i++) {
            const isTenth = (i === 9); // Guaranteed epic on 10th pull
            
            if (activePoolId === 'evo') {
                // Evolution: non-dupe Legend/Mythic
                const lAndM = allCharacters.filter(c => c.rarity==='legendary' || c.rarity==='mythic');
                const unowned = lAndM.filter(c => !(myProfile.unlockedCharacters || []).includes(c.name) && !results.some(r=>r.name===c.name));
                let picked;
                if (unowned.length > 0) {
                    picked = unowned[Math.floor(Math.random() * unowned.length)];
                    results.push({ type: 'char', name: picked.name, rarity: picked.rarity, isDupe: false, img: picked.image });
                } else {
                    // Out of chars! Draw normally and dupe
                    let r = pickRarity(baseRates, false);
                    let poolChars = lAndM.filter(c => c.rarity === r);
                    if(!poolChars.length) poolChars = lAndM;
                    picked = poolChars[Math.floor(Math.random() * poolChars.length)];
                    results.push({ type: 'char', name: picked.name, rarity: picked.rarity, isDupe: true, img: picked.image });
                }
            } else {
                // Normal Pools
                const r = pickRarity(baseRates, isTenth);
                const candidates = filterCharPool(pool, r);
                if(candidates.length === 0) {
                     // Fallback just in case
                     results.push({ type: 'exp', name: '補償經驗', rarity: 'common', isDupe: false, img: '' });
                     continue;
                }
                const picked = candidates[Math.floor(Math.random() * candidates.length)];
                
                // Check dupe
                const alreadyOwned = (myProfile.unlockedCharacters || []).includes(picked.name);
                const pulledThisSession = results.some(r => r.name === picked.name);
                const isDupe = alreadyOwned || pulledThisSession;
                
                results.push({ type: 'char', name: picked.name, rarity: picked.rarity, isDupe: isDupe, img: picked.image });
            }
        }
    }
    
    // Apply rewards
    let totalExpGained = 0;
    for (let r of results) {
        if (r.type === 'title' && !r.isDupe) {
            await UserProfile.unlockTitle(myProfile.uid, r.name);
        } else if (r.type === 'char') {
            if (!r.isDupe) {
                await UserProfile.unlockCharacter(myProfile.uid, r.name);
            } else {
                totalExpGained += EXP_CONVERSION[r.rarity] || 30;
                // Append exp amount to name for UI
                r.dupeTxt = `轉化為 ${EXP_CONVERSION[r.rarity] || 30} EXP`;
            }
        }
    }
    
    if (totalExpGained > 0) {
        await UserProfile.gainExp(myProfile.uid, totalExpGained);
    }
    
    await refreshProfile(myProfile.uid);
    showAnimation(results);
}


// ── Animations ─────────────────────────────────────────────────────────

function showAnimation(results) {
    isAnimating = true;
    const modal = document.getElementById('gachaAnimModal');
    const container = document.getElementById('gachaResults');
    container.innerHTML = '';
    
    results.forEach((r, idx) => {
        const delay = idx * 0.15;
        const colorClass = `rarity-${r.rarity}`;
        
        const cardWrap = document.createElement('div');
        cardWrap.className = 'gacha-card-wrap';
        cardWrap.style.animation = `fadeUp 0.4s ease backwards`;
        cardWrap.style.animationDelay = `${delay}s`;
        
        let innerImg = r.img ? `<img src="${r.img}">` : '<div style="font-size:3rem;margin-bottom:10px;">🌟</div>';
        let dupeHtml = r.isDupe ? `<div class="dupe-tag">${r.dupeTxt}</div>` : `<div style="font-size:0.7rem;color:var(--neon-green);margin-top:auto;">NEW!</div>`;
        
        if(r.type === 'title') {
            innerImg = '<div style="font-size:3rem;margin-bottom:10px;">🎖️</div>';
        }
        
        cardWrap.innerHTML = `
            <div class="gacha-card-face gacha-card-back ${colorClass}">
                <div style="font-size:2rem;opacity:0.3;filter:drop-shadow(0 0 5px currentColor);">?</div>
            </div>
            <div class="gacha-card-face gacha-card-front ${colorClass}">
                ${innerImg}
                <div class="name">${r.name}</div>
                ${dupeHtml}
            </div>
        `;
        
        cardWrap.onclick = () => { if(!cardWrap.classList.contains('flipped')) cardWrap.classList.add('flipped'); };
        container.appendChild(cardWrap);
    });
    
    modal.style.display = 'flex';
}

function skipAnim() {
    const cards = document.querySelectorAll('.gacha-card-wrap');
    let allFlipped = true;
    cards.forEach(c => {
        if(!c.classList.contains('flipped')) {
            allFlipped = false;
            c.classList.add('flipped');
        }
    });
    
    if(allFlipped) {
        document.getElementById('gachaAnimModal').style.display = 'none';
        isAnimating = false;
        selectPool(activePoolId); // refresh free UI if needed
    }
}
