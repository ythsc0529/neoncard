let myProfile = null;

// Data is now imported from js/data/passData.js

AuthManager.init();
AuthManager.onAuthChanged(async (user) => {
    if (!user) { location.href = 'index.html'; return; }
    myProfile = await UserProfile.getProfile(user.uid);
    renderPass();
    document.getElementById('pageLoading').style.display = 'none';
    document.getElementById('passPage').style.display = 'block';
});

function getRewardHtml(reward) {
    if (!reward) return { icon: '✖', txt: '無' };
    switch (reward.type) {
        case 'money': return { icon: '💰', txt: `錢錢 x${reward.amount}` };
        case 'landDeed': return { icon: '📜', txt: `地契 x${reward.amount}` };
        case 'exp': return { icon: '✨', txt: `經驗 x${reward.amount}` };
        case 'drawNormal': return { icon: '🎟️', txt: `普通抽獎券 x${reward.amount}` };
        case 'drawPremium': return { icon: '🌟', txt: `高級抽獎券 x${reward.amount}` };
        case 'drawSpecial': return { icon: '✨', txt: `特殊抽獎券 x${reward.amount}` };
        case 'title': return { icon: '🎖️', txt: `${reward.name}` };
        case 'char': return { icon: '👤', txt: `${reward.name}` };
        default: return { icon: '?', txt: '' };
    }
}

function renderPass() {
    const p = myProfile;
    const pass = p.battlePass || { points: 0, premiumActive: false, claimed: { free: [], premium: [] } };
    
    // Level calc (1 level per 50 pts)
    const totalPoints = pass.points || 0;
    const curLevel = PassLogic.getCurrentLevel(totalPoints);
    const progressCur = totalPoints % 50;
    
    document.getElementById('displayLevel').textContent = curLevel;
    document.getElementById('displayExp').textContent = `${progressCur} / 50 積分`;
    document.getElementById('expFill').style.width = `${(progressCur / 50) * 100}%`;
    
    const isPremium = pass.premiumActive === true;
    
    if (isPremium) {
        document.getElementById('premiumStatus').textContent = '✅ 已解鎖進階通行證';
        document.getElementById('btnUnlock').style.display = 'none';
    } else {
        const tokens = p.inventory?.passToken || 0;
        document.getElementById('premiumStatus').textContent = `未解鎖進階通行證 (擁有兌換券: ${tokens})`;
        document.getElementById('btnUnlock').style.display = 'inline-block';
    }
    
    const freeClaimed = pass.claimed?.free || [];
    const premClaimed = pass.claimed?.premium || [];
    
    const track = document.getElementById('trackLevels');
    track.innerHTML = '';
    
    for (let i = 1; i <= 20; i++) {
        const fR = PASS_FREE[i];
        const pR = PASS_PREM[i];
        
        const fHtml = getRewardHtml(fR);
        const pHtml = getRewardHtml(pR);
        
        const fUnlocked = curLevel >= i;
        const pUnlocked = isPremium && curLevel >= i;
        
        const fClaimed = freeClaimed.includes(i);
        const pClaimed = premClaimed.includes(i);
        
        const fClass = !fR ? 'claimed' : (fClaimed ? 'claimed' : (fUnlocked ? 'unlocked' : ''));
        const pClass = !pR ? 'claimed' : (pClaimed ? 'claimed' : (pUnlocked ? 'unlocked premium' : (isPremium ? 'premium' : 'locked-premium')));
        
        const fAction = (fUnlocked && !fClaimed && fR) ? `onclick="claimPassReward(${i}, 'free')"` : '';
        const pAction = (pUnlocked && !pClaimed && pR) ? `onclick="claimPassReward(${i}, 'premium')"` : '';
        
        const col = document.createElement('div');
        col.className = `level-column ${curLevel >= i ? 'unlocked' : ''}`;
        col.innerHTML = `
            <div class="reward-box ${pClass}" ${pAction} title="${pR ? pHtml.txt : '無'}">
                ${!isPremium ? '<div class="locked-icon">🔒</div>' : ''}
                <div class="r-icon">${pHtml.icon}</div>
                <div class="r-name">${pHtml.txt}</div>
            </div>
            
            <div class="level-indicator">${i}</div>
            
            <div class="reward-box ${fClass}" ${fAction} title="${fR ? fHtml.txt : '無'}">
                <div class="r-icon">${fHtml.icon}</div>
                <div class="r-name">${fHtml.txt}</div>
            </div>
        `;
        track.appendChild(col);
    }
}

async function unlockPremium() {
    const tokens = myProfile.inventory?.passToken || 0;
    if (tokens <= 0) {
        alert("您沒有通行證兌換券！請前往商店兌換。");
        return;
    }
    
    if(!confirm("確定要消耗 1 張通行證兌換券解鎖【踢飛．盛宴】進階通行證嗎？")) return;
    
    try {
        await UserProfile.updateInventory(myProfile.uid, 'passToken', -1);
        await UserProfile.updateProfile(myProfile.uid, { "battlePass.premiumActive": true });
        myProfile.battlePass.premiumActive = true;
        myProfile.inventory.passToken -= 1;
        alert("解鎖成功！");
        renderPass();
    } catch(err) {
        alert("解鎖失敗: " + err.message);
    }
}

async function claimPassReward(lv, trackType) {
    const pass = myProfile.battlePass;
    if (!pass.claimed) pass.claimed = { free: [], premium: [] };
    
    if (pass.claimed[trackType].includes(lv)) return;
    
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
        }
        
        pass.claimed[trackType].push(lv);
        await UserProfile.updateProfile(myProfile.uid, { "battlePass.claimed": pass.claimed });
        
        alert("領取成功！");
        renderPass();
        
        // Update global notification dots
        if (typeof NotificationManager !== 'undefined') NotificationManager.refresh(myProfile);
        
    } catch(err) {
        alert("領取失敗: " + err.message);
    }
}
