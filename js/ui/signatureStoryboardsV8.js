/* New injury and revival actions; the shared scheduler supplies timing and cleanup. */
(function (global) {
    const motion = global.SignatureMotion;
    if (!motion) return;
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
    const scene = markup => ({ character: true, duration: 4500, cues: [[220, 1], [1250, 2], [2700, 3]], markup });
    const stage = (kind, content) => `<div class="v5-stage v8-${kind}">${content}</div>`;
    const label = (title, subtitle) => `<div class="v5-label"><b>${title}</b><small>${subtitle}</small></div>`;
    const reveal = (eyebrow, value) => `<div class="v5-reveal"><small>${eyebrow}</small><strong>${esc(value)}</strong></div>`;

    Object.assign(motion.scenes, {
        injuryChain: scene(d => {
            const from = d.from || '原角色';
            const name = d.name || '新角色';
            return stage('injury', `
                ${label('傷勢系列召喚', 'TRIAGE / 傷勢轉移')}
                <div class="v8-injury-lightbox"><i></i><i></i><i></i></div>
                <div class="v8-injury-old"><small>原角色</small><strong>${esc(from)}</strong><span>傷勢診斷</span></div>
                <div class="v8-injury-scan"><i></i><i></i><i></i><b>掃描中</b></div>
                <div class="v8-injury-bandage"><i></i><i></i></div>
                <div class="v8-injury-transfer">➜</div>
                <div class="v8-injury-new"><small>召喚完成</small><strong>${esc(name)}</strong><span>備戰區</span></div>
                <div class="v8-injury-stamp">傷勢接續！</div>
                ${reveal('傷勢系列 / 實際召喚', `${from} → ${name}`)}
            `);
        }),
        revival: scene(d => {
            const name = d.name || '角色';
            const hp = Number.isFinite(Number(d.hp)) ? String(d.hp) : '恢復';
            return stage('revival', `
                ${label('復活', 'ASH TO FLAME / 重燃生命')}
                <div class="v8-revive-halo"><i></i><i></i></div>
                <div class="v8-revive-fallen"><small>倒下</small><strong>${esc(name)}</strong><b>HP 0</b></div>
                <div class="v8-revive-ash"><i></i><i></i><i></i><i></i><i></i><i></i></div>
                <div class="v8-revive-bird"><svg viewBox="0 0 320 280" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
                    <path d="M137 175 Q119 217 82 265 Q135 245 160 218 Q185 245 238 265 Q201 217 183 175Z" fill="#ef714d" stroke="#111924" stroke-width="8" stroke-linejoin="round"/>
                    <path d="M147 188 Q139 224 119 270 Q154 247 160 219 Q166 247 201 270 Q181 224 173 188Z" fill="#ffbd69" stroke="#111924" stroke-width="6" stroke-linejoin="round"/>
                    <path class="wing left-wing" d="M153 145 Q87 125 21 32 Q29 89 68 137 Q39 124 9 109 Q37 174 109 190 L157 171Z" fill="#f57b4e" stroke="#111924" stroke-width="8" stroke-linejoin="round"/>
                    <path class="wing right-wing" d="M167 145 Q233 125 299 32 Q291 89 252 137 Q281 124 311 109 Q283 174 211 190 L163 171Z" fill="#f57b4e" stroke="#111924" stroke-width="8" stroke-linejoin="round"/>
                    <path d="M55 100 Q102 154 144 153 M265 100 Q218 154 176 153" fill="none" stroke="#ffe3a0" stroke-width="9" stroke-linecap="round"/>
                    <path d="M160 117 C187 130 197 156 184 191 Q174 212 160 223 Q146 212 136 191 C123 156 133 130 160 117Z" fill="#ffca6a" stroke="#111924" stroke-width="8" stroke-linejoin="round"/>
                    <path d="M143 91 Q141 66 154 55 Q151 79 164 85 Q169 62 183 52 Q177 77 180 91Z" fill="#f7794e" stroke="#111924" stroke-width="7" stroke-linejoin="round"/>
                    <circle cx="160" cy="101" r="23" fill="#ffca6a" stroke="#111924" stroke-width="8"/>
                    <path d="M178 96 L218 108 L180 119Z" fill="#ffe3a0" stroke="#111924" stroke-width="7" stroke-linejoin="round"/>
                    <circle cx="171" cy="98" r="5" fill="#111924"/>
                </svg></div>
                <div class="v8-revive-return"><small>重返戰場</small><strong>${esc(name)}</strong><b>HP ${esc(hp)}</b></div>
                <div class="v8-revive-sfx">浴火重生！</div>
                ${reveal('復活成功 / 實際生命值', `${name} 復活・HP ${hp}`)}
            `);
        })
    });
})(window);
