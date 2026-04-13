let myProfile = null;
let allCharacters = [];

const TRIAL_REWARDS_TABLE = {
    0: { chars: ['戰士','抽卡員','足球','機率型選手','灰塵','隨便你','巴萬','蝦子','史詩','聖女','水龍頭','教宗','英國紳士','小吉','很亮的魚'], items: { drawNormal: 10, money: 300, landDeed: 10, drawPremium: 1, forgiveToken: 2 }, title: '初到新星' },
    1: { chars: ['沒錢','廚師','松鼠'], items: { money: 100 } },
    2: { items: { money: 150 } },
    3: { chars: ['莫那魯道'], items: { money: 150, landDeed: 30 } },
    4: { items: { drawNormal: 2, money: 200, landDeed: 5 } },
    5: { chars: ['海王星','盾哥','越野摩托車','致命','法特'], items: { drawNormal: 1, money: 50 } },
    6: { items: { money: 50 } },
    7: { chars: ['阿共','67！'], items: { drawNormal: 3 }, title: '失柳煎啾' },
    8: { items: { money: 100, landDeed: 10 } },
    9: { chars: ['內耗怪','厭世','李軍服'], items: { money: 50 } },
    10: { chars: ['火車','鳳梨','劍盾'], items: { drawSpecial: 1, drawPremium: 2, drawNormal: 3, money: 500, landDeed: 30, passToken: 1, forgiveToken: 2 }, title: '真理學徒' },
    11: { items: { money: 150 } },
    12: { chars: ['12了'], items: { money: 100, forgiveToken: 1 }, title: '12了!' },
    13: { items: { money: 150 } },
    14: { items: { money: 150 } },
    15: { items: { drawNormal: 2, money: 70, landDeed: 10, forgiveToken: 1 } },
    16: { items: { money: 120 } },
    17: { items: { money: 120 } },
    18: { items: { money: 120 } },
    19: { items: { money: 120 } },
    20: { chars: ['結膜炎'], items: { money: 100, landDeed: 10 } },
    21: { items: { money: 100 } },
    22: { items: { money: 100 } },
    23: { items: { money: 100 } },
    24: { items: { money: 100 }, title: '萬人斬' },
    25: { chars: ['亞克-I','抽卡時間','賴韋禎'], items: { money: 500, drawNormal: 1, drawSpecial: 1, forgiveToken: 1, bundle: 'pack_mahjong' }, title: '染血的權杖' },
    50: { chars: ['開發者','數值怪'], items: { drawSpecial: 1 }, title: '偽神' },
    100:{ chars: ['作弊者'], items: { drawSpecial: 3, passToken: 1 }, title: '造物主' }
};

const CHAR_DUPE_MONEY = { mythic: 200, legendary: 125, epic: 70, rare: 50, common: 25 };

AuthManager.init();
AuthManager.onAuthChanged(async (user) => {
    if (!user) { location.href = 'index.html'; return; }
    myProfile = await UserProfile.getProfile(user.uid);
    if (typeof ALL_CHARACTERS !== 'undefined') {
        allCharacters = ALL_CHARACTERS;
    } else if (typeof window.characters !== 'undefined') {
        allCharacters = window.characters;
    }
    
    // Auto-fetch missing allCharacters if script didn't load properly, assuming it is loaded
    renderTrial();
});

function getTrialData(lv) {
    let data = { chars: [], items: {}, title: null };
    if (TRIAL_REWARDS_TABLE[lv]) {
        const tbl = TRIAL_REWARDS_TABLE[lv];
        if(tbl.chars) data.chars = [...tbl.chars];
        if(tbl.items) data.items = Object.assign({}, tbl.items);
        if(tbl.title) data.title = tbl.title;
    }
    
    if (lv > 25) {
        if (!data.items) data.items = {};
        data.items.money = (data.items.money || 0) + 100;
        if (lv % 5 === 0) {
            data.items.landDeed = (data.items.landDeed || 0) + 20;
            data.items.forgiveToken = (data.items.forgiveToken || 0) + 1;
        }
    }
    return data;
}

function getItemNameHtml(key, amount) {
    const keyMap = {
        money: '💰 錢錢', landDeed: '📜 地契', drawNormal: '🎟️ 普通抽獎券',
        drawPremium: '🌟 高級抽獎券', drawSpecial: '✨ 特殊抽獎券', passToken: '🎫 通行證兌換券',
        forgiveToken: '🛡️ 贖罪券', bundle: '📦 組合包'
    };
    return `<span class="c-item">${keyMap[key] || key} x${amount}</span>`;
}

function renderTrial() {
    const p = myProfile;
    document.getElementById('displayLevel').textContent = p.level || 0;
    
    const curExp = p.exp || 0;
    const reqExp = UserProfile.getExpRequirement(p.level || 0);
    const lastReqExp = p.level > 0 ? UserProfile.getExpRequirement(p.level - 1) : 0;
    
    const progressTotal = reqExp - lastReqExp;
    const progressCur = curExp - lastReqExp;
    const percent = Math.min(100, Math.max(0, (progressCur / progressTotal) * 100));
    
    document.getElementById('displayExp').textContent = `${curExp} / ${reqExp}`;
    document.getElementById('expFill').style.width = `${percent}%`;

    const list = document.getElementById('milestones');
    list.innerHTML = '';
    
    const claimedArr = p.trialClaims || [];
    let curLvl = p.level || 0;
    
    let levelsToDraw = [];
    for(let i=0; i<=25; i++) levelsToDraw.push(i);
    // Draw all claimed above 25, plus next multiples of 1, and 50/100
    if(curLvl > 25) {
        for(let i=26; i<=curLvl+2; i++) {
            if(!levelsToDraw.includes(i)) levelsToDraw.push(i);
        }
    }
    if(!levelsToDraw.includes(50)) levelsToDraw.push(50);
    if(!levelsToDraw.includes(100)) levelsToDraw.push(100);
    
    levelsToDraw.sort((a,b)=>a-b);
    
    levelsToDraw.forEach(lv => {
        const data = getTrialData(lv);
        const isUnlocked = curLvl >= lv;
        const isClaimed = claimedArr.includes(lv);
        
        const card = document.createElement('div');
        card.className = `milestone-card ${isUnlocked ? 'unlocked' : ''} ${isClaimed ? 'claimed' : ''}`;
        
        let rewardsHtml = '';
        if (data.chars && data.chars.length > 0) {
            data.chars.forEach(c => rewardsHtml += `<div class="reward-chip c-char">👤 ${c}</div>`);
        }
        if (data.items) {
            Object.keys(data.items).forEach(k => {
                rewardsHtml += `<div class="reward-chip">${getItemNameHtml(k, data.items[k])}</div>`;
            });
        }
        if (data.title) {
            rewardsHtml += `<div class="reward-chip c-title">🎖️ ${data.title}</div>`;
        }
        
        let btnHtml = '';
        if (isClaimed) {
            btnHtml = `<button class="btn" disabled style="opacity:0.5;">已領取</button>`;
        } else if (isUnlocked) {
            btnHtml = `<button class="btn btn-gold" onclick="claimLevel(${lv}, this)">領取獎勵</button>`;
        } else {
            btnHtml = `<button class="btn" disabled style="opacity:0.3;">未解鎖</button>`;
        }
        
        card.innerHTML = `
            <div class="milestone-level">Lv.${lv}</div>
            <div class="milestone-rewards">${rewardsHtml || '<span style="color:var(--text-muted);">本級無獎勵</span>'}</div>
            <div>${btnHtml}</div>
        `;
        list.appendChild(card);
    });
}

async function claimLevel(lv, btnElem) {
    if(!myProfile) return;
    const claimedArr = myProfile.trialClaims || [];
    if(claimedArr.includes(lv) || myProfile.level < lv) return;
    
    btnElem.disabled = true;
    btnElem.textContent = '領取中...';
    
    const data = getTrialData(lv);
    let moneyFromDupes = 0;
    
    try {
        // Items
        if (data.items) {
            for(let key of Object.keys(data.items)) {
                if (key === 'bundle') {
                    // special logic maybe? We'll just skip bundle logic for now, or just give bundle manually.
                } else {
                    await UserProfile.updateInventory(myProfile.uid, key, data.items[key]);
                }
            }
        }
        
        // Characters
        if (data.chars && data.chars.length > 0) {
            for(let cName of data.chars) {
                if ((myProfile.unlockedCharacters || []).includes(cName)) {
                    // It's a dupe, convert to money
                    const charObj = allCharacters.find(x => x.name === cName);
                    const rarity = charObj ? charObj.rarity : 'common';
                    const moneyVal = CHAR_DUPE_MONEY[rarity] || 25;
                    moneyFromDupes += moneyVal;
                } else {
                    await UserProfile.unlockCharacter(myProfile.uid, cName);
                }
            }
        }
        
        // Add dupe money
        if (moneyFromDupes > 0) {
            await UserProfile.updateInventory(myProfile.uid, 'money', moneyFromDupes);
        }
        
        // Title
        if (data.title) {
            await UserProfile.unlockTitle(myProfile.uid, data.title);
        }
        
        // Mark as claimed
        claimedArr.push(lv);
        await UserProfile.updateProfile(myProfile.uid, { trialClaims: claimedArr });
        myProfile.trialClaims = claimedArr;
        
        if (moneyFromDupes > 0) {
            alert(`領取成功！\n因為已有部分角色，轉化為了 ${moneyFromDupes} 錢錢！`);
        } else {
            alert('領取成功！');
        }
        
        renderTrial();
        
    } catch(err) {
        alert('領取失敗：' + err.message);
        btnElem.disabled = false;
        btnElem.textContent = '領取獎勵';
    }
}
