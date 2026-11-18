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
    if (mobile) return `<!doctype html><html><head><title>390px / ${name}</title><style>body{margin:0;background:#ccc;display:grid;place-items:start center}iframe{width:390px;height:844px;border:0}</style></head><body><iframe src="/preview/${name}.html" title="Mobile preview"></iframe></body></html>`;
    return html;
}
http.createServer((req,res) => {
    try {
        const url = new URL(req.url,'http://localhost');
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
