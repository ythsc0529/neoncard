/* Seven distinct comic storyboards, with gameplay outcomes passed in. */
(function (global) {
    const motion = global.SignatureMotion;
    if (!motion) return;
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
    const scene = markup => ({ character: true, duration: 4400, cues: [[200, 1], [1280, 2], [2820, 3]], markup });
    const stage = (kind, content) => `<div class="v5-stage v7-${kind}">${content}</div>`;
    const label = (title, subtitle) => `<div class="v5-label"><b>${title}</b><small>${subtitle}</small></div>`;
    const reveal = (eyebrow, value) => `<div class="v5-reveal"><small>${eyebrow}</small><strong>${esc(value)}</strong></div>`;
    const number = (value, fallback = '?') => Number.isFinite(Number(value)) ? String(value) : fallback;

    Object.assign(motion.scenes, {
        probabilityTheory: scene(d => {
            const chance = number(d.chance, '40–90');
            const roll = number(d.roll);
            const before = number(d.beforeAtk);
            const after = number(d.afterAtk);
            const result = d.success === true ? `ATK ${before} → ${after}` : d.success === false ? `判定失敗・ATK ${before} 不變` : '成功時 ATK ×3';
            return stage('theory', `
                ${label('概率學 / 概率學概論', '證明題 / 攻擊力三倍')}
                <div class="v7-theory-board"><span>假設 P = ${esc(chance)}%</span><i></i><i></i><i></i></div>
                <div class="v7-theory-tree"><b>擲骰</b><span class="yes">≤ ${esc(chance)}%</span><span class="no">&gt; ${esc(chance)}%</span></div>
                <div class="v7-theory-die"><i>?</i><strong>${esc(roll)}</strong></div>
                <div class="v7-theory-branch ${d.success === false ? 'failed' : 'passed'}"><div class="pass">證明成立<br><b>ATK ×${esc(d.mult ?? 3)}</b></div><div class="fail">證明失敗<br><b>ATK 不變</b></div></div>
                ${reveal(`抽中 ${chance}%・骰出 ${roll}`, result)}
            `);
        }),
        probabilityZero: scene(d => {
            const turns = number(d.turns, '3');
            return stage('zero', `
                ${label('概率學 / 概率為0', '免疫狀態效果 / 零機率結界')}
                <div class="v7-zero-field"><i></i><i></i><i></i></div>
                <div class="v7-zero-threat burn">灼燒</div><div class="v7-zero-threat stun">暈眩</div><div class="v7-zero-threat poison">減益</div>
                <div class="v7-zero-core"><small>命中機率</small><b>0<span>%</span></b></div>
                <div class="v7-zero-shock"><i></i><i></i></div>
                <div class="v7-zero-guard"><b>狀態無效</b><span>第 1 回合　•　第 2 回合　•　第 ${esc(turns)} 回合</span></div>
                ${reveal('所有狀態效果被擋下', `免疫 ${turns} 回合`)}
            `);
        }),
        probabilityHundred: scene(d => {
            const chance = number(d.chance, '20–40');
            const roll = number(d.roll);
            const before = number(d.beforeAtk);
            const after = number(d.afterAtk);
            const result = d.success === true ? `${d.target || '對手'} ATK ${before} → ${after}` : d.success === false ? `判定失敗・ATK ${before} 不變` : '成功時對手 ATK ÷2';
            return stage('hundred', `
                ${label('概率學 / 概率為100', '對手攻擊力 / 折半實驗')}
                <div class="v7-hundred-grid"><i></i><i></i><i></i><i></i><i></i></div>
                <div class="v7-hundred-ticket"><small>抽取機率</small><b>${esc(chance)}%</b><em>骰值 ${esc(roll)}</em></div>
                <div class="v7-hundred-press"><i></i><b>÷ 2</b><i></i></div>
                <div class="v7-hundred-card ${d.success === false ? 'failed' : 'passed'}"><small>${esc(d.target || '對手')} / ATK</small><strong>${esc(before)}</strong><span>→ ${esc(after)}</span></div>
                <div class="v7-hundred-fail">${d.success === false ? '折半失敗' : '折半成功'}</div>
                ${reveal(`抽中 ${chance}%・骰出 ${roll}`, result)}
            `);
        }),
        ordinary: scene(d => stage('ordinary', `
            ${label('一般 / 你也是很一般', '備戰區 / 標準化生產線')}
            <div class="v7-ordinary-belt"><i></i><i></i><i></i></div>
            <div class="v7-ordinary-source"><small>對手備戰區</small><strong>${esc(d.from || '原角色')}</strong></div>
            <div class="v7-ordinary-mold"><b>一般</b><i></i></div>
            <div class="v7-ordinary-roller">▰</div><div class="v7-ordinary-sfx">喀嚓！</div>
            <div class="v7-ordinary-output"><small>變成</small><strong>${esc(d.name || '一般般')}</strong><em>HP 1 / ATK 1</em></div>
            ${reveal('備戰區角色被轉換', `${d.from || '原角色'} → ${d.name || '一般般'}`)}
        `)),
        brownian: scene(d => {
            const damage = number(d.damage, '1–100');
            return stage('brownian', `
                ${label('愛因斯坦 / 布朗運動', 'PARTICLE PINBALL / 隨機撞擊')}
                <div class="v7-brownian-box"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
                <div class="v7-brownian-plunger"><b>發射</b></div>
                <div class="v7-brownian-track"><i></i><i></i><i></i></div>
                <div class="v7-brownian-particle">●</div>
                <div class="v7-brownian-target"><small>撞擊目標</small><strong>${esc(d.target || '對手')}</strong></div>
                <div class="v7-brownian-impact">砰！</div>
                <div class="v7-brownian-number">${esc(damage)}<small>傷害</small></div>
                ${reveal('布朗運動 / 實際隨機傷害', `${d.target || '對手'} 受到 ${damage} 傷害`)}
            `);
        }),
        revival: scene(d => {
            const hp = number(d.hp, '恢復');
            return stage('revival', `
                ${label('復活', 'REWRITE / 翻開下一頁')}
                <div class="v7-revival-page"><small>故事終止</small><b>END</b><strong>${esc(d.name || '角色')}</strong></div>
                <div class="v7-revival-crease"></div><div class="v7-revival-turn">⟲</div>
                <div class="v7-revival-newpage"><small>下一頁</small><div class="v7-revival-sun">✦</div><b>${esc(d.name || '角色')}</b><em>HP ${esc(hp)}</em></div>
                <div class="v7-revival-word">故事續寫！</div>
                ${reveal('翻頁歸來 / 實際生命值', `${d.name || '角色'} 復活・HP ${hp}`)}
            `);
        }),
        nocturne: scene(d => {
            const result = d.outcome === 'damage' ? `${d.target || '對手'} 受到 ${d.damage ?? 35} 傷害`
                : d.outcome === 'stun' ? `${d.target || '對手'} 暈眩 ${d.stun ?? 1} 回合`
                    : `${d.damage ?? 35} 傷害／暈眩 ${d.stun ?? 1} 回合`;
            return stage('nocturne', `
                ${label('周接輪 / 蕭邦的夜曲', '十一月・黑膠・夜曲')}
                <div class="v7-night-vinyl"><i></i><b></b></div><div class="v7-night-needle"><i></i></div>
                <div class="v8-night-lyric"><span>為你彈奏</span><strong>蕭邦的夜曲</strong></div>
                <div class="v7-night-film"><div class="memory"><i></i><small>回憶</small></div><div class="farewell"><i></i><small>離別</small></div><div class="snow"><i></i><small>雪夜</small></div></div>
                <div class="v7-night-coat"><i></i><b></b></div><div class="v7-night-notes">♪　♫　♪</div>
                <div class="v7-night-keys"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
                <div class="v7-night-split ${d.outcome === 'damage' ? 'damage' : 'stun'}"><span>傷害<br>${esc(d.damage ?? 35)}</span><span>暈眩<br>${esc(d.stun ?? 1)} 回合</span></div>
                ${reveal('夜曲落下 / 實際結果', result)}
            `);
        })
    });
})(window);
