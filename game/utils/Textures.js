import * as THREE from 'three';

export const Textures = {
    generate: function(type) {
        const isTool = type === 'stick' || type === 'bow' || type === 'crossbow' || type === 'gun' || (type && (type.includes('sword') || type.includes('pickaxe') || type.includes('axe') || type.includes('shovel')));
        const canvas = document.createElement('canvas');
        canvas.width = isTool ? 256 : 32; canvas.height = isTool ? 256 : 32;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;

        const fillBase = (hex) => { ctx.fillStyle = hex; ctx.fillRect(0, 0, W, H); };
        
        const smoothNoise = (scale, opacity, r, g, b) => {
            ctx.globalAlpha = opacity;
            for(let x=0; x<W; x++) {
                for(let y=0; y<H; y++) {
                    let v = Math.sin(x*scale) * Math.cos(y*scale) * 128;
                    v += (Math.random()-0.5)*100;
                    ctx.fillStyle = `rgb(${Math.max(0,Math.min(255,r+v))},${Math.max(0,Math.min(255,g+v))},${Math.max(0,Math.min(255,b+v))})`;
                    ctx.fillRect(x,y,1,1);
                }
            }
            ctx.globalAlpha = 1;
        };

        const edgeDarken = () => {
            const grad = ctx.createRadialGradient(W/2, H/2, W/4, W/2, H/2, W/1.5);
            grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.5)');
            ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);
        };

        if (type === 'grass_top') { fillBase('#558b2f'); smoothNoise(0.5, 0.4, 85, 139, 47); edgeDarken(); }
        else if (type === 'dirt') { fillBase('#5c3a21'); smoothNoise(0.8, 0.5, 92, 58, 33); edgeDarken(); }
        else if (type === 'grass_side') { fillBase('#5c3a21'); smoothNoise(0.8, 0.5, 92, 58, 33); ctx.fillStyle = '#558b2f'; ctx.fillRect(0, 0, W, 8); for(let x=0; x<W; x+=2) { let drop = 8 + Math.floor(Math.random() * 8); ctx.fillRect(x, 8, 2, drop); } edgeDarken(); }
        else if (type === 'stone') { fillBase('#7f8c8d'); smoothNoise(0.9, 0.3, 127, 140, 141); ctx.fillStyle='rgba(0,0,0,0.2)'; for(let i=0; i<W*3; i++){ ctx.fillRect(Math.random()*W, Math.random()*H, 2, 2); } edgeDarken(); }
        else if (type === 'sand') { fillBase('#e6c27a'); smoothNoise(1.2, 0.2, 230, 194, 122); edgeDarken(); }
        else if (type === 'leaves') { fillBase('#2d5a27'); smoothNoise(0.5, 0.4, 45, 90, 39); for(let i=0; i<150; i++) { ctx.clearRect(Math.random()*W, Math.random()*H, 3, 3); } edgeDarken(); }
        else if (type === 'snow') { fillBase('#ffffff'); smoothNoise(1.5, 0.1, 240, 248, 255); ctx.fillStyle='rgba(200,220,255,0.4)'; for(let i=0; i<60; i++) ctx.fillRect(Math.random()*W, Math.random()*H, 2, 2); edgeDarken(); }
        else if (type === 'ice') { fillBase('#a0d8ef'); smoothNoise(0.2, 0.2, 160, 216, 239); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); for(let i=0; i<8; i++) { ctx.moveTo(Math.random()*W, Math.random()*H); ctx.lineTo(Math.random()*W, Math.random()*H); } ctx.stroke(); edgeDarken(); }
        else if (type === 'water') { fillBase('#1ca3ec'); smoothNoise(0.2, 0.3, 28, 163, 236); ctx.fillStyle='rgba(255,255,255,0.3)'; for(let i=0; i<15; i++) { ctx.fillRect(Math.random()*W, Math.random()*H, W/2, 2); } }
        else if (type === 'lava') { fillBase('#ff4400'); smoothNoise(0.2, 0.5, 255, 68, 0); ctx.fillStyle='rgba(255,255,0,0.6)'; for(let i=0; i<20; i++) { ctx.fillRect(Math.random()*W, Math.random()*H, 6, 6); } }
        else if (type === 'oak_side') { fillBase('#4a332a'); smoothNoise(0.5, 0.2, 74, 51, 42); ctx.fillStyle = '#3a231a'; for(let x=0; x<W; x+=4) ctx.fillRect(x + Math.random()*2, 0, 2, H); edgeDarken(); }
        else if (type === 'birch_side') { fillBase('#d4d4d4'); smoothNoise(0.5, 0.1, 212, 212, 212); ctx.fillStyle = '#222222'; for(let i=0; i<15; i++) ctx.fillRect(Math.random()*(W-8), Math.random()*(H-2), 6+Math.random()*4, 2); edgeDarken(); }
        else if (type === 'wood_top') { fillBase('#8b5a2b'); smoothNoise(0.5, 0.2, 139, 90, 43); ctx.strokeStyle = '#5c4033'; ctx.lineWidth = 2; for(let r=4; r<W; r+=6) { ctx.beginPath(); ctx.arc(W/2, H/2, r, 0, Math.PI*2); ctx.stroke(); } edgeDarken(); }
        else if (type === 'oak_planks') { fillBase('#8b5a2b'); smoothNoise(0.4, 0.2, 139, 90, 43); ctx.fillStyle = 'rgba(0,0,0,0.6)'; for(let y=7; y<H; y+=8) ctx.fillRect(0, y, W, 1); for(let y=0; y<H; y+=8) ctx.fillRect(Math.random()*W, y, 1, 8); edgeDarken(); }
        else if (type === 'birch_planks') { fillBase('#e2d4b5'); smoothNoise(0.4, 0.2, 226, 212, 181); ctx.fillStyle = 'rgba(0,0,0,0.4)'; for(let y=7; y<H; y+=8) ctx.fillRect(0, y, W, 1); for(let y=0; y<H; y+=8) ctx.fillRect(Math.random()*W, y, 1, 8); edgeDarken(); }
        else if (type === 'crafting_side') { fillBase('#8b5a2b'); smoothNoise(0.4, 0.2, 139, 90, 43); ctx.fillStyle = '#4a2f1d'; ctx.fillRect(0,0,W,4); ctx.fillStyle = '#888'; ctx.fillRect(W/2+4, 8, 8, 12); ctx.fillStyle = '#333'; ctx.fillRect(4, 12, 8, 8); edgeDarken(); }
        else if (type === 'crafting_top') { fillBase('#8b5a2b'); smoothNoise(0.4, 0.2, 139, 90, 43); ctx.fillStyle = '#4a2f1d'; for(let y=0; y<H; y+=14) ctx.fillRect(0, y, W, 4); for(let x=0; x<W; x+=14) ctx.fillRect(x, 0, 4, H); edgeDarken(); }
        else if (type === 'cactus') { fillBase('#2ecc71'); smoothNoise(0.4, 0.2, 46, 204, 113); ctx.fillStyle = '#1e8449'; for(let x=0; x<W; x+=4) ctx.fillRect(x, 0, 2, H); ctx.fillStyle = '#000000'; for(let i=0; i<40; i++) ctx.fillRect(Math.random()*W, Math.random()*H, 2, 2); edgeDarken(); }
        else if (type === 'torch') { ctx.fillStyle = '#5c4033'; ctx.fillRect(0,0,W,H); ctx.fillStyle = '#ffaa00'; ctx.fillRect(0,0,W,16); ctx.fillStyle = '#ffffff'; ctx.fillRect(8,0,16,8); }
        else if (type === 'sun') { ctx.fillStyle = '#FFD700'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(4, 4, W-8, H-8); }
        else if (type === 'moon') { ctx.fillStyle = '#DDDDDD'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#AAAAAA'; ctx.fillRect(4, 4, 8, 8); ctx.fillRect(20, 16, 6, 6); }
        else if (type === 'sun_halo') { const grad = ctx.createRadialGradient(W/2,H/2,0, W/2,H/2,W/2); grad.addColorStop(0, 'rgba(255, 215, 0, 0.4)'); grad.addColorStop(1, 'rgba(255, 215, 0, 0)'); ctx.fillStyle = grad; ctx.fillRect(0,0,W,H); }
        
        else if (type.includes('zombie_face')) { 
            fillBase('#417031'); smoothNoise(0.8, 0.3, 65, 112, 49); 
            ctx.fillStyle = '#ff0000'; ctx.fillRect(4, 8, 6, 4); ctx.fillRect(22, 8, 6, 4); 
            ctx.fillStyle = '#224018'; ctx.fillRect(10, 20, 12, 4); 
            
            if (type === 'zombie_face_var1') {
                ctx.fillStyle = '#dddddd'; ctx.fillRect(4, 2, 8, 6);
                ctx.fillStyle = '#aa0000'; ctx.fillRect(2, 4, 2, 4);
            } else if (type === 'zombie_face_var2') {
                ctx.fillStyle = '#aa0000'; ctx.fillRect(4, 12, 2, 8);
            }
            
            ctx.fillStyle = '#8f2020'; ctx.fillRect(18, 14, 10, 16); 
            ctx.fillStyle = '#dddddd'; ctx.fillRect(20, 18, 4, 8); 
            ctx.fillStyle = '#3a592c'; ctx.beginPath(); ctx.moveTo(2,2); ctx.lineTo(10,12); ctx.stroke(); 
        }
        else if (type.includes('archer_face')) { 
            fillBase('#e0ac69'); smoothNoise(0.5, 0.1, 224, 172, 105);
            ctx.fillStyle = '#111'; ctx.fillRect(4, 10, 6, 4); ctx.fillRect(22, 10, 6, 4); 
            
            if (type === 'archer_face_bow') { 
                ctx.fillStyle = '#27ae60'; ctx.fillRect(0, 0, W, 8); 
                ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(32, -8); ctx.stroke(); 
            } else if (type === 'archer_face_crossbow') { 
                ctx.fillStyle = '#5c4033'; ctx.fillRect(0, 0, W, 8); 
                ctx.fillStyle = '#333'; ctx.fillRect(0, 8, W, 2); 
            } else if (type === 'archer_face_gun') { 
                ctx.fillStyle = '#111'; ctx.fillRect(0, 16, W, 16); 
                ctx.fillStyle = '#333'; ctx.fillRect(0, 0, W, 6); 
            } else {
                ctx.fillStyle = '#2c3e50'; ctx.fillRect(0, 0, W, 8);
            }
        }
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
        } else { fillBase('#ff00ff'); }

        const texture = new THREE.CanvasTexture(canvas); texture.magFilter = isTool ? THREE.LinearFilter : THREE.NearestFilter; texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping; return texture;
    }
};
