/* Two complete comic scenes: a cyclic wound roster and a torn final page. */
(function (global) {
    const motion = global.SignatureMotion;
    if (!motion) return;
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
    const scene = markup => ({ character: true, duration: 4550, cues: [[220, 1], [1260, 2], [2720, 3]], markup });
    const stage = (kind, content) => `<div class="v5-stage v9-${kind}">${content}</div>`;
    const label = (title, subtitle) => `<div class="v5-label"><b>${title}</b><small>${subtitle}</small></div>`;
    const reveal = (eyebrow, value) => `<div class="v5-reveal"><small>${eyebrow}</small><strong>${esc(value)}</strong></div>`;

    Object.assign(motion.scenes, {
        injuryChain: scene(d => {
            const stages = ['殘骸', '半殘', '重傷', '受傷', '巔峰'];
            const from = d.from || '重傷';
            const name = d.name || '受傷';
            const fromIndex = Math.max(0, stages.indexOf(from));
            const toIndex = Math.max(0, stages.indexOf(name));
            const toTurn = (toIndex <= fromIndex ? toIndex + stages.length : toIndex) * 72;
            const nodes = stages.map((item, index) => `<div class="v9-chain-node node-${index}${index === fromIndex ? ' from' : ''}${index === toIndex ? ' to' : ''}"><b>${item}</b></div>`).join('');
            return stage('injury', `
                ${label('傷勢系列召喚', 'WOUND CYCLE / 下一環')}
                <div class="v9-chain-wheel" style="--from-angle:${fromIndex * 72}deg;--to-angle:${toTurn}deg">
                    <div class="v9-chain-track"></div>${nodes}
                    <div class="v9-chain-pointer"><i></i></div>
                    <div class="v9-chain-hub">傷勢鏈</div>
                </div>
                <div class="v9-chain-feed"><small>來源角色</small><strong>${esc(from)}</strong></div>
                <div class="v9-chain-eject"><small>備戰區新增</small><strong>${esc(name)}</strong></div>
                <div class="v9-chain-sfx">下一環！</div>
                ${reveal('傷勢接續 / 實際召喚', `${from} → ${name}`)}
            `);
        }),
        loss: scene(d => {
            const winner = d.winner || '對手';
            return stage('tear', `
                ${label('敗北結算', 'FINAL PAGE / 最後一頁')}
                <div class="v9-tear-halftone"></div>
                <div class="v9-tear-result">
                    <div class="v9-tear-result-top">對局結束 <span>THE END</span></div>
                    <div class="v9-tear-result-word">敗北</div>
                    <div class="v9-tear-result-rule"></div>
                    <div class="v9-tear-result-winner"><small>本局勝者</small><strong>${esc(winner)}</strong><b>勝利</b></div>
                </div>
                <div class="v9-tear-page">
                    <div class="v9-tear-half left"><small>最後一格</small><strong>終</strong><i></i></div>
                    <div class="v9-tear-half right"><small>FINAL PANEL</small><strong>局</strong><i></i></div>
                    <div class="v9-tear-seam"></div>
                </div>
                <div class="v9-tear-rip">撕啦！</div>
                <div class="v9-tear-scraps"><i></i><i></i><i></i></div>
                <div class="v9-tear-footer">畫格落幕・勝負已定</div>
            `);
        })
    });
})(window);
