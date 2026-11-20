/* Fifth-pass scenes: new actions for the latest screening feedback. */
(function (global) {
    const motion = global.SignatureMotion;
    if (!motion) return;

    const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
    const scene = markup => ({ character: true, duration: 4200, cues: [[180, 1], [1250, 2], [2750, 3]], markup });
    const stage = (kind, content) => `<div class="v5-stage v6-${kind}">${content}</div>`;
    const label = (title, subtitle) => `<div class="v5-label"><b>${title}</b><small>${subtitle}</small></div>`;
    const reveal = (caption, result) => `<div class="v5-reveal"><small>${caption}</small><strong>${esc(result)}</strong></div>`;
    const batFigure = `<svg class="v6-bat-figure" viewBox="0 0 300 360" aria-hidden="true">
        <path class="cape" d="M150 74C89 48 38 91 16 288c38-35 58-19 77 32 23-35 39-38 57 11 18-49 34-46 57-11 19-51 39-67 77-32C262 91 211 48 150 74Z"/>
        <path class="suit" d="M94 126q56-30 112 0l28 146-84 37-84-37z"/>
        <path class="cowl" d="M104 36 115 2l29 31h12l29-31 11 34 13 52-22 55-37 15-37-15-22-55z"/>
        <path class="jaw" d="m127 111 23 15 23-15-7 30-16 10-16-10z"/>
        <path class="eyes" d="m113 83 29 9-25 9zm74 0-29 9 25 9z"/>
        <path class="emblem" d="M99 173q28-6 51 5 23-11 51-5l-15 23-14-4-22 20-22-20-14 4z"/>
        <path class="belt" d="M89 239h122v25H89z"/>
        <path class="buckle" d="M136 237h28v30h-28z"/>
    </svg>`;

    Object.assign(motion.scenes, {
        replacement: scene(d => stage('replacement', `
            ${label('死亡換人', 'LAST STAND / 倒下 → 接棒')}
            <div class="v6-replace-arena"><i></i><i></i><i></i></div>
            <div class="v6-replace-fallen"><div class="portrait">${esc(d.outgoing || '原角色')}</div><b>HP 0</b></div>
            <div class="v6-replace-crack">✕</div><div class="v6-replace-smoke"><i></i><i></i><i></i></div>
            <div class="v6-replace-bench"><small>備戰區 / 下一位</small><strong>${esc(d.incoming || '替補角色')}</strong></div>
            <div class="v6-replace-sprint"><i></i><b>${esc(d.incoming || '替補角色')}</b><em></em></div>
            <div class="v6-replace-stamp">接棒！</div>
            ${reveal('戰線重啟 / NEXT FIGHTER', `${d.incoming || '替補角色'} 上場`)}
        `)),
        revival: scene(d => stage('revival', `
            ${label('復活', 'HEARTBEAT / 歸零後重新跳動')}
            <div class="v6-revive-monitor"><small>生命訊號 / ${esc(d.name || '角色')}</small><div class="line"></div><div class="pulse"></div><b>HP 0</b></div>
            <div class="v6-revive-figure"><i></i><b>${esc(d.name || '角色')}</b></div>
            <div class="v6-revive-paddle left">✚</div><div class="v6-revive-paddle right">✚</div>
            <div class="v6-revive-spark">⚡</div><div class="v6-revive-heart">♥</div>
            <div class="v6-revive-status">心跳恢復</div>
            ${reveal('生命訊號恢復 / REVIVAL', `${d.name || '角色'} 復活`)}
        `)),
        nocturne: scene(d => {
            const result = d.outcome === 'damage'
                ? `${d.target || '對手'} 受到 ${d.damage ?? 35} 傷害`
                : d.outcome === 'stun'
                    ? `${d.target || '對手'} 暈眩 ${d.stun ?? 1} 回合`
                    : `${d.damage ?? 35} 傷害／暈眩 ${d.stun ?? 1} 回合`;
            return stage('nocturne', `
                ${label('周接輪 / 蕭邦的夜曲', '十一月的蕭邦 / 雪夜追憶')}
                <div class="v6-night-snow"></div><div class="v6-night-moon"></div>
                <div class="v6-night-graves"><i></i><i></i><i></i></div>
                <div class="v6-night-singer"><i></i><b></b><em></em></div>
                <div class="v6-night-letter"><small>寄不出的信</small><b>♪　♫</b></div>
                <div class="v6-night-staff"><i></i><i></i><i></i><span>♪　♫　♪</span></div>
                <div class="v6-night-beat">夜曲</div>
                <div class="v6-night-verdict ${d.outcome === 'damage' ? 'damage' : 'stun'}"><small>50% / 命運落點</small><strong>${esc(result)}</strong></div>
                ${reveal('夜曲判定 / 實際結果', result)}
            `);
        }),
        empower: scene(d => stage('empower', `
            ${label('賦能哥 / 天才少年', '顆秒 / 20% 生死判定')}
            <div class="v6-meme-lanes"><i></i><i></i><i></i></div>
            <div class="v6-meme-agent"><i></i><b>賦能哥</b></div>
            <div class="v6-meme-reticle"><i></i></div><div class="v6-meme-shot"></div>
            <div class="v6-meme-flash">顆秒！</div>
            <div class="v6-meme-call">難道是<br>賦能哥？</div>
            <div class="v6-meme-beat"><span>幫</span><span>幫</span><span>幫</span><span>幫！</span></div>
            <div class="v6-meme-outcome ${d.fatal ? 'fatal' : 'safe'}"><small>${d.fatal ? '20% 命中' : '80% 躲過'}</small><strong>${d.fatal ? '賦能哥死亡' : '賦能哥存活'}</strong></div>
            ${reveal('天才少年 / 實際判定', d.fatal ? '賦能哥死亡' : '賦能哥存活')}
        `)),
        alfred: scene(d => stage('alfred', `
            ${label('阿福 / 呼叫增援', '暗夜訊號 / 披風援軍')}
            <div class="v6-bat-rain"></div><div class="v6-bat-skyline"><i></i><i></i><i></i><i></i></div>
            <div class="v6-bat-signal"><span></span></div><div class="v6-bat-beam"></div>
            <div class="v6-bat-landing">${batFigure}</div>
            <div class="v6-bat-impact">咚！</div>
            <div class="v6-bat-card"><small>增援加入手牌</small><strong>${esc(d.name || '扁佛狹')}</strong></div>
            ${reveal('暗夜援軍 / SUMMON', `${d.name || '扁佛狹'} 加入手牌`)}
        `))
    });
})(window);
