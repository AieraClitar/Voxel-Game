import * as THREE from 'three';

export const Textures = {
    generate: function(type) {
        try {
            if (!type || type === 'null' || type === 'undefined') throw new Error('Missing or invalid texture type');

            const isTool = type === 'stick' || type === 'bow' || type === 'crossbow' || type === 'gun' || (type.includes('sword') || type.includes('pickaxe') || type.includes('axe') || type.includes('shovel'));
            const canvas = document.createElement('canvas');
            canvas.width = isTool ? 256 : 16; canvas.height = isTool ? 256 : 16;
            const ctx = canvas.getContext('2d');

            const fillBase = (hex) => { ctx.fillStyle = hex; ctx.fillRect(0, 0, 16, 16); };
            const addNoise = (variance, opacity = 1) => {
                ctx.globalAlpha = opacity;
                for(let x=0; x<16; x++) { 
                    for(let y=0; y<16; y++) { 
                        let v = (Math.random() - 0.5) * variance; 
                        ctx.fillStyle = `rgb(${128+v},${128+v},${128+v})`; 
                        ctx.globalCompositeOperation = 'overlay'; 
                        ctx.fillRect(x, y, 1, 1); 
                    } 
                }
                ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
            };

            if (type === 'grass_top') { fillBase('#4CAF50'); addNoise(15, 0.15); } 
            else if (type === 'dirt') { fillBase('#5D4037'); addNoise(30, 0.3); }
            else if (type === 'grass_side') { fillBase('#5D4037'); addNoise(30, 0.3); ctx.fillStyle = '#4CAF50'; ctx.fillRect(0, 0, 16, 4); for(let x=0; x<16; x++) { let drop = Math.floor(Math.random() * 4); ctx.fillRect(x, 4, 1, drop); } }
            else if (type === 'stone') { fillBase('#7f8c8d'); addNoise(40, 0.3); }
            else if (type === 'sand') { fillBase('#e6c27a'); addNoise(15, 0.2); }
            else if (type === 'leaves') { fillBase('#2d5a27'); addNoise(40, 0.4); for(let i=0; i<30; i++) { let sx = Math.floor(Math.random()*15); let sy = Math.floor(Math.random()*15); ctx.clearRect(sx, sy, 2, 2); } }
            else if (type === 'snow') { fillBase('#ffffff'); addNoise(5, 0.05); } 
            else if (type === 'ice') { fillBase('#a0d8ef'); addNoise(5, 0.1); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(0, 0, 16, 2); ctx.fillRect(0, 6, 16, 1); ctx.fillRect(10, 0, 1, 16); } 
            else if (type === 'water') { fillBase('#1ca3ec'); addNoise(10, 0.15); ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(0, 2, 16, 1); } 
            else if (type === 'lava') { fillBase('#ff3300'); addNoise(50, 0.5); ctx.fillStyle = '#ffaa00'; for(let i=0; i<12; i++) { ctx.fillRect(Math.random()*16, Math.random()*16, 2, 2); } } 
            
            else if (type === 'oak_side') { fillBase('#5c4033'); ctx.fillStyle = '#4a332a'; for(let x=0; x<16; x+=3) ctx.fillRect(x + Math.random(), 0, 1, 16); }
            else if (type === 'birch_side') { fillBase('#d4d4d4'); ctx.fillStyle = '#222222'; ctx.fillRect(0, 3, 4, 1); ctx.fillRect(11, 7, 5, 1); ctx.fillRect(3, 12, 6, 1); }
            else if (type === 'wood_top') { fillBase('#8b5a2b'); ctx.strokeStyle = '#5c4033'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(8, 8, 3, 0, Math.PI*2); ctx.stroke(); ctx.beginPath(); ctx.arc(8, 8, 6, 0, Math.PI*2); ctx.stroke(); }
            else if (type === 'oak_planks') { fillBase('#8b5a2b'); addNoise(20, 0.2); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, 3, 16, 1); ctx.fillRect(0, 7, 16, 1); ctx.fillRect(0, 11, 16, 1); ctx.fillRect(0, 15, 16, 1); ctx.fillRect(4, 0, 1, 3); ctx.fillRect(10, 4, 1, 3); ctx.fillRect(6, 8, 1, 3); ctx.fillRect(12, 12, 1, 3); }
            else if (type === 'birch_planks') { fillBase('#e2d4b5'); addNoise(15, 0.15); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(0, 3, 16, 1); ctx.fillRect(0, 7, 16, 1); ctx.fillRect(0, 11, 16, 1); ctx.fillRect(0, 15, 16, 1); ctx.fillRect(4, 0, 1, 3); ctx.fillRect(10, 4, 1, 3); ctx.fillRect(6, 8, 1, 3); ctx.fillRect(12, 12, 1, 3); }
            else if (type === 'crafting_side') { fillBase('#8b5a2b'); addNoise(20, 0.2); ctx.fillStyle = '#4a2f1d'; ctx.fillRect(0,0,16,2); ctx.fillStyle = '#888'; ctx.fillRect(10, 4, 4, 6); ctx.fillStyle = '#333'; ctx.fillRect(2, 6, 4, 4); }
            else if (type === 'crafting_top') { fillBase('#8b5a2b'); addNoise(20, 0.2); ctx.fillStyle = '#4a2f1d'; ctx.fillRect(0, 0, 16, 2); ctx.fillRect(0, 7, 16, 2); ctx.fillRect(0, 14, 16, 2); ctx.fillRect(0, 0, 2, 16); ctx.fillRect(7, 0, 2, 16); ctx.fillRect(14, 0, 2, 16); }
            
            else if (type === 'cactus') { fillBase('#2ecc71'); addNoise(15, 0.2); ctx.fillStyle = '#1e8449'; for(let x=0; x<16; x+=2) ctx.fillRect(x, 0, 1, 16); ctx.fillStyle = '#000000'; for(let i=0; i<15; i++) ctx.fillRect(Math.random()*16, Math.random()*16, 1, 1); }
            else if (type === 'torch') { ctx.fillStyle = '#5c4033'; ctx.fillRect(0,0,16,16); ctx.fillStyle = '#ffaa00'; ctx.fillRect(0,0,16,6); ctx.fillStyle = '#ffffff'; ctx.fillRect(4,0,8,3); }
            else if (type === 'sun') { ctx.fillStyle = '#FFD700'; ctx.fillRect(0, 0, 16, 16); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(2, 2, 12, 12); }
            else if (type === 'moon') { ctx.fillStyle = '#DDDDDD'; ctx.fillRect(0, 0, 16, 16); ctx.fillStyle = '#AAAAAA'; ctx.fillRect(2, 2, 4, 4); ctx.fillRect(10, 8, 3, 3); }
            else if (type === 'sun_halo') { const grad = ctx.createRadialGradient(8,8,0, 8,8,8); grad.addColorStop(0, 'rgba(255, 215, 0, 0.4)'); grad.addColorStop(1, 'rgba(255, 215, 0, 0)'); ctx.fillStyle = grad; ctx.fillRect(0,0,16,16); }
            
            else if (type.includes('zombie_face')) { 
                fillBase('#2E7D32'); addNoise(20, 0.2); 
                ctx.fillStyle = '#ff0000'; ctx.fillRect(2, 4, 4, 3); ctx.fillRect(10, 4, 4, 3);
                ctx.fillStyle = '#111'; ctx.fillRect(3, 5, 2, 1); ctx.fillRect(11, 5, 2, 1); 
                ctx.fillStyle = '#224018'; ctx.fillRect(5, 10, 6, 2); 
                if (type === 'zombie_face_var1') { ctx.fillStyle = '#8b0000'; ctx.fillRect(1, 1, 2, 6); ctx.fillRect(12, 1, 3, 2); }
                if (type === 'zombie_face_var2') { ctx.fillStyle = '#dddddd'; ctx.fillRect(2, 12, 3, 3); ctx.fillStyle = '#8f2020'; ctx.fillRect(2, 11, 4, 1); } 
            }
            else if (type.includes('archer_face')) { fillBase('#e0ac69'); ctx.fillStyle = '#111'; ctx.fillRect(2, 5, 4, 2); ctx.fillRect(10, 5, 4, 2); ctx.fillStyle = type === 'archer_face_var1' ? '#2c3e50' : '#27ae60'; ctx.fillRect(0, 0, 16, 4); ctx.fillRect(0, 0, 2, 16); ctx.fillRect(14, 0, 2, 16); }
            
            else if (isTool) {
                ctx.clearRect(0, 0, 256, 256);
                const isStone = type.includes('stone'); const headColor = isStone ? '#7c8082' : '#997a4d'; const handleColor = '#594026'; const outlineColor = '#1f1f1f';
                ctx.translate(128, 128); ctx.lineWidth = 14; ctx.strokeStyle = outlineColor; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
                if (type === 'stick') { ctx.rotate(Math.PI / 4); ctx.fillStyle = handleColor; ctx.beginPath(); ctx.rect(-8, 0, 16, 60); ctx.fill(); ctx.stroke(); }
                else if (type.includes('sword')) { ctx.rotate(Math.PI / 4); ctx.fillStyle = handleColor; ctx.beginPath(); ctx.rect(-8, 0, 16, 45); ctx.fill(); ctx.stroke(); ctx.fillStyle = headColor; ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(-16, -80); ctx.lineTo(0, -105); ctx.lineTo(16, -80); ctx.lineTo(16, 0); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-45, -10); ctx.lineTo(0, 10); ctx.lineTo(45, -10); ctx.lineTo(45, 10); ctx.lineTo(0, 30); ctx.lineTo(-45, 10); ctx.closePath(); ctx.fill(); ctx.stroke(); }
                else if (type.includes('pickaxe')) { ctx.rotate(Math.PI / 4); ctx.fillStyle = handleColor; ctx.beginPath(); ctx.rect(-8, 0, 16, 60); ctx.fill(); ctx.stroke(); ctx.fillStyle = headColor; ctx.beginPath(); ctx.moveTo(-85, -50); ctx.quadraticCurveTo(0, -120, 85, -50); ctx.lineTo(85, -25); ctx.quadraticCurveTo(0, -90, -85, -25); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = handleColor; ctx.fillRect(-12, -75, 24, 20); ctx.strokeRect(-12, -75, 24, 20); }
                else if (type.includes('axe')) { ctx.rotate(Math.PI / 4); ctx.fillStyle = handleColor; ctx.beginPath(); ctx.rect(-8, 0, 16, 60); ctx.fill(); ctx.stroke(); ctx.fillStyle = headColor; ctx.beginPath(); ctx.moveTo(15, -85); ctx.lineTo(-15, -85); ctx.quadraticCurveTo(-70, -85, -70, -55); ctx.lineTo(-35, -40); ctx.lineTo(-70, -25); ctx.quadraticCurveTo(-70, 5, -15, 5); ctx.lineTo(15, 5); ctx.closePath(); ctx.fill(); ctx.stroke(); }
                else if (type.includes('shovel')) { ctx.rotate(Math.PI / 4); ctx.fillStyle = handleColor; ctx.beginPath(); ctx.rect(-8, 0, 16, 60); ctx.fill(); ctx.stroke(); ctx.fillStyle = headColor; ctx.beginPath(); ctx.moveTo(-28, -20); ctx.lineTo(0, -85); ctx.lineTo(28, -20); ctx.lineTo(16, 15); ctx.lineTo(-16, 15); ctx.closePath(); ctx.fill(); ctx.stroke(); }
                else if (type === 'bow') { ctx.rotate(Math.PI / 4); ctx.beginPath(); ctx.arc(0, 0, 60, -Math.PI * 0.75, Math.PI * 0.75); ctx.stroke(); ctx.lineWidth = 4; ctx.strokeStyle = '#cccccc'; ctx.beginPath(); ctx.moveTo(Math.cos(-Math.PI * 0.75) * 60, Math.sin(-Math.PI * 0.75) * 60); ctx.lineTo(Math.cos(Math.PI * 0.75) * 60, Math.sin(Math.PI * 0.75) * 60); ctx.stroke(); }
                else if (type === 'crossbow') { ctx.rotate(Math.PI / 4); ctx.fillStyle = handleColor; ctx.fillRect(-12, -20, 24, 80); ctx.strokeRect(-12, -20, 24, 80); ctx.beginPath(); ctx.arc(0, -40, 50, Math.PI, 0); ctx.stroke(); ctx.lineWidth = 4; ctx.strokeStyle = '#cccccc'; ctx.beginPath(); ctx.moveTo(-50, -40); ctx.lineTo(0, 0); ctx.lineTo(50, -40); ctx.stroke(); }
                else if (type === 'gun') { ctx.fillStyle = '#444444'; ctx.fillRect(-15, -40, 30, 80); ctx.strokeRect(-15, -40, 30, 80); ctx.fillStyle = handleColor; ctx.fillRect(-15, 0, 50, 30); ctx.strokeRect(-15, 0, 50, 30); }
            } 
            else {
                throw new Error("Unknown texture mapping");
            }

            const texture = new THREE.CanvasTexture(canvas); 
            texture.magFilter = isTool ? THREE.LinearFilter : THREE.NearestFilter; 
            
            if (type === 'water' || type === 'lava') {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
            }
            return texture;

        } catch (err) {
            console.warn(`[Textures.js] Fallback triggered for type: ${type} -`, err);
            const c = document.createElement('canvas'); c.width=16; c.height=16; const cx = c.getContext('2d');
            cx.fillStyle = '#ff00ff'; cx.fillRect(0,0,8,8); cx.fillRect(8,8,8,8); 
            cx.fillStyle = '#000000'; cx.fillRect(8,0,8,8); cx.fillRect(0,8,8,8);
            const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter; 
            return tex;
        }
    }
};