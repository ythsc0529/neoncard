// Local-only visual fixtures. Never loaded by the game or copied into www.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const profile = { uid: 'preview-only', displayName: '墨線玩家', exp: 680, level: 7, trialClaims: [1,2],
    inventory: { money: 2400, landDeed: 120, drawNormal: 10, drawPremium: 3, drawSpecial: 2, passToken: 0 },
    battlePass: { points: 325, premiumActive: false, claimed: { free: [1,2], premium: [] } },
    trialClaimed: [1,2], claimedTrialLevels: [1,2], ownedCharacters: ['戰士'], characters: {}, titles: [],
    dailyResetTime: {}, missions: {}, dailyStats: {}, stats: {} };
const icons = fs.readFileSync(path.join(root,'js/core/userProfile.js'),'utf8').split('const UserProfile')[0];
const mock = `<script>${icons}
const fixtureProfile = ${JSON.stringify(profile)};
window.AuthManager = { init(){}, onAuthChanged(fn){ document.addEventListener('DOMContentLoaded',()=>fn({uid:'preview-only'})); }, getCurrentUser(){return {uid:'preview-only'}} };
window.UserProfile = { getProfile:async()=>structuredClone(fixtureProfile), updateProfile:async(_,data)=>Object.assign(fixtureProfile,data), getExpRequirement:level=>[10,40,80,150,250,380,570,700,870][level]||1070 };
window.NotificationManager = { refresh(){}, update(){}, init(){} };
window.SoundManager = { play(){}, init(){} };
</script>`;
function preview(name, mobile) {
    let html = fs.readFileSync(path.join(root, name + '.html'), 'utf8');
    const allowInline = ['characters','team','strategy','missions','story_menu','redeem'].includes(name);
    html = html.replace(/<script\b([^>]*)>[\s\S]*?<\/script>/gi, (tag, attrs) => {
        const src = attrs.match(/src="([^"]+)"/)?.[1];
        if (!src) return allowInline ? tag : '';
        return /^(js\/data\/|js\/theme|js\/ui\/(comicMotion|shop|trial|pass))/.test(src) ? tag : '';
    });
    html = html.replace('<head>', '<head><base href="/">' + mock);
    const isMain = name === 'index';
    let boot = `document.querySelectorAll('#pageLoading,#resourcePreloader,#privacyModal,#authOverlay,#pgLoading').forEach(el=>el.style.display='none');
        document.querySelectorAll('#mainMenu,#shopPage,#trialPage,#passPage,#teamPage,#missionsPage,#playerPage,#profilePage').forEach(el=>el.style.display='block');`;
    if (isMain) boot += `document.getElementById('statsCard').classList.remove('hidden');document.getElementById('mainMenuRankName').textContent='骸 II';`;
    if (name === 'profile') boot += `
        document.getElementById('nameDisplay').textContent='墨線玩家';
        document.getElementById('bioDisplay').textContent='喜歡用奇怪的組合打出漂亮的一局。歡迎一起挑戰！';
        document.getElementById('uidDisplay').textContent='preview-only';
        document.getElementById('joinDateDisplay').textContent='2026 年 6 月 12 日';
        document.getElementById('favCharsRow').innerHTML='<span class="fav-chip">勇者</span><span class="fav-chip">火星</span><span class="fav-chip">烏龍茶</span>';
        document.getElementById('profileLevel').textContent='7';document.getElementById('profileExp').textContent='680';document.getElementById('profileMoney').textContent='2,400';document.getElementById('profileDeeds').textContent='120';
        document.getElementById('friendList').innerHTML='<div class="friend-card"><div class="friend-card-row"><div class="friend-avatar">👤</div><div class="friend-info"><div class="friend-name">星軌旅人</div><div class="friend-bio">今晚有人要打一場嗎？</div><div>● 在線</div></div><div class="friend-actions"><button class="btn btn-sm btn-gold">邀請對戰</button><button class="btn btn-sm">查看</button></div></div><div class="friend-stats-bar">🏆 競賽 <b>67%</b>（12勝6敗）</div></div><div class="friend-card"><div class="friend-card-row"><div class="friend-avatar">👤</div><div class="friend-info"><div class="friend-name">撞球大師</div><div class="friend-bio">練習炸杆中</div><div>離線</div></div><div class="friend-actions"><button class="btn btn-sm">查看</button></div></div></div>';
    `;
    if (name === 'player') boot += `
        document.getElementById('heroName').textContent='星軌旅人';
        document.getElementById('heroBio').textContent='收藏星球牌，也喜歡和朋友研究新戰術。';
        document.getElementById('heroMeta').textContent='📅 加入於 2026 年 6 月 12 日';
        document.getElementById('uidText').textContent='UID: preview-friend';
        document.getElementById('heroLevel').textContent='LV. 12 / 星軌旅人';
        document.getElementById('favSection').style.display='block';
        document.getElementById('favChips').innerHTML='<div class="fav-chip">地球</div><div class="fav-chip">火星</div><div class="fav-chip">奧沙利文</div>';
        document.getElementById('rankTitleSection').style.display='block';
        document.getElementById('playerRankName').textContent='璀璨 III';
        document.getElementById('playerRankImg').style.display='none';
        document.getElementById('playerRankStars').textContent='★★★';
        document.getElementById('playerTitleBlock').style.display='block';
        document.getElementById('playerTitleImg').style.display='none';
        document.getElementById('playerTitleName').textContent='銀河挑戰者';
        document.getElementById('statsSection').style.display='block';
        document.getElementById('statsGrid').innerHTML='<div class="stat-card"><div class="stat-mode">🏆 競賽</div><div class="stat-rate">67%</div><div class="stat-detail">12勝 6敗</div></div><div class="stat-card"><div class="stat-mode">🌐 線上</div><div class="stat-rate">58%</div><div class="stat-detail">14勝 10敗</div></div>';
        document.getElementById('historySection').style.display='block';
        document.getElementById('historyList').innerHTML='<div class="match-item"><div class="match-result-badge win">勝</div><div class="match-info"><div class="match-opponent">對戰 墨線玩家</div><div class="match-meta">🏆 排位賽 · 勝利</div></div><div class="match-time">昨天</div></div>';
        document.getElementById('actionBar').innerHTML='<button class="btn btn-gold">邀請對戰</button><button class="btn">加為好友</button>';
    `;
    if (name === 'shop') boot += `const testBtn=document.createElement('button');testBtn.className='btn';testBtn.textContent='預覽十連動畫（測試資料）';testBtn.onclick=()=>showGachaModal(Array.from({length:10},(_,i)=>({name:['戰士','醫生','魔眼','伊魯帕恩'][i%4],rarity:i===9?'MYTHIC':i===8?'LEGENDARY':i%2?'RARE':'COMMON',type:'char',isDupe:i<3})));document.getElementById('shopPage').prepend(testBtn);`;
    if (name === 'game') {
        html = html.replace('</head>', '<script src="js/ui/animations.js"></script></head>');
        boot += `document.querySelectorAll('.modal-overlay,#selectionPhase,#loadingScreen').forEach(el=>el.classList.add('hidden'));
        const bar=document.createElement('div');bar.style.cssText='position:relative;z-index:10000;display:flex;gap:12px;padding:12px';
        const p1=document.getElementById('p1BattleCard'),p2=document.getElementById('p2BattleCard');
        for(const [name,type] of [['普通攻擊',null],['烈焰斬','damage'],['生命復甦','heal'],['鋼鐵壁壘','shield'],['夥伴召喚','summon']]){
          const b=document.createElement('button');b.className='btn';b.textContent=name;b.onclick=async()=>{b.disabled=true;await ComicMotion.combat({attacker:{name:'戰士'},defender:{name:'魔眼'},skill:type?{name,effect:{type}}:null,kind:type?'skill':'attack',source:p1,target:p2});b.disabled=false};bar.append(b);
        }document.body.prepend(bar);`;
    }
    html = html.replace('</body>', `<script>document.addEventListener('DOMContentLoaded',()=>{${boot}});</script></body>`);
    if (mobile) return `<!doctype html><html><head><title>390px / ${name}</title><style>body{margin:0;height:100vh;overflow:hidden;background:#ccc;display:grid;place-items:start center}iframe{width:390px;height:min(844px,100vh);border:0}</style></head><body><iframe src="/preview/${name}.html" title="Mobile preview"></iframe></body></html>`;
    return html;
}
http.createServer((req,res) => {
    try {
        const url = new URL(req.url,'http://localhost');
        if (url.pathname === '/signature-gallery.html') {
            res.writeHead(302, { Location: '/preview/signature-gallery.html' });
            return res.end();
        }
        if (url.pathname === '/preview/signature-gallery.html') {
            const galleryPath = path.join(__dirname, 'signature-gallery.html');
            if (!fs.existsSync(galleryPath)) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                return res.end('本機動畫試映頁尚未建立');
            }
            res.setHeader('Content-Type','text/html; charset=utf-8');
            res.setHeader('Cache-Control','no-store');
            if (url.searchParams.has('mobile')) {
                return res.end('<!doctype html><html lang="zh-Hant"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>手機預覽 / 專屬動畫試映室</title><style>body{margin:0;height:100vh;overflow:hidden;background:#d3d3d3;display:grid;place-items:start center}iframe{width:390px;height:min(844px,100vh);border:0;background:#fff}</style></head><body><iframe src="/preview/signature-gallery.html" title="390px 手機版專屬動畫試映室"></iframe></body></html>');
            }
            return res.end(fs.readFileSync(galleryPath, 'utf8'));
        }
        const match = url.pathname.match(/^\/preview\/(\w+)\.html$/);
        if (match && fs.existsSync(path.join(root,match[1]+'.html'))) {
            res.setHeader('Content-Type','text/html; charset=utf-8'); return res.end(preview(match[1],url.searchParams.has('mobile')));
        }
        if (!/^\/(?:[\w-]+\.html|(?:css|js|pic|logo|audio|item_pic|race_pic|hao_pic)\/[^?]+)$/.test(url.pathname)) { res.writeHead(404); return res.end(); }
        const file = path.resolve(root,'.'+decodeURIComponent(url.pathname));
        if (!file.startsWith(root+path.sep)) { res.writeHead(403);return res.end(); }
        res.setHeader('Cache-Control','no-store');
        res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png'})[path.extname(file)]||'application/octet-stream');
        fs.createReadStream(file).on('error',()=>res.end()).pipe(res);
    } catch(error) { res.writeHead(500);res.end(error.message); }
}).listen(4175,'127.0.0.1',()=>console.log('Visual fixtures: http://127.0.0.1:4175/preview/index.html'));
