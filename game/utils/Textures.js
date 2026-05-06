import * as THREE from 'three';

export const Textures = {
    generate: function(type) {
        const isTool = type === 'stick' || type === 'bow' || type === 'crossbow' || type === 'gun' || (type && (type.includes('sword') || type.includes('pickaxe') || type.includes('axe') || type.includes('shovel')));
        const isDetailed = type === 'stone' || type === 'dirt' || type === 'grass_top' || type === 'grass_side' || type === 'sand' || type === 'snow' || type === 'leaves';
        const canvas = document.createElement('canvas');
        canvas.width = isTool ? 256 : (isDetailed ? 256 : 16); 
        canvas.height = isTool ? 256 : (isDetailed ? 256 : 16);
        const ctx = canvas.getContext('2d');

        const fillBase = (hex) => { ctx.fillStyle = hex; ctx.fillRect(0, 0, canvas.width, canvas.height); };
        const addNoise = (variance, opacity = 1) => {
            ctx.globalAlpha = opacity;
            const w = canvas.width;
            for(let x=0; x<w; x++) { for(let y=0; y<w; y++) { let v = (Math.random() - 0.5) * variance; ctx.fillStyle = `rgb(${128+v},${128+v},${128+v})`; ctx.globalCompositeOperation = 'overlay'; ctx.fillRect(x, y, 1, 1); } }
            ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        };
        const addSmoothNoise = (variance, opacity = 1, scale = 4) => {
            const w = canvas.width;
            const offscreen = document.createElement('canvas');
            offscreen.width = w / scale; offscreen.height = w / scale;
            const oCtx = offscreen.getContext('2d');
            for(let x=0; x<offscreen.width; x++) {
                for(let y=0; y<offscreen.height; y++) {
                    let v = (Math.random() - 0.5) * variance;
                    oCtx.fillStyle = `rgb(${128+v},${128+v},${128+v})`;
                    oCtx.fillRect(x, y, 1, 1);
                }
            }
            ctx.globalAlpha = opacity;
            ctx.globalCompositeOperation = 'overlay';
            ctx.drawImage(offscreen, 0, 0, w, w);
            ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        };

        if (type === 'grass_top') { fillBase('#4caf50'); addSmoothNoise(50, 0.4, 8); addSmoothNoise(30, 0.3, 2); addNoise(20, 0.2); }
        else if (type === 'dirt') { fillBase('#5d4037'); addSmoothNoise(60, 0.5, 16); addSmoothNoise(40, 0.3, 4); addNoise(30, 0.3); }
        else if (type === 'grass_side') { 
            fillBase('#5d4037'); addSmoothNoise(60, 0.5, 16); addSmoothNoise(40, 0.3, 4); addNoise(30, 0.3); 
            ctx.fillStyle = '#4caf50'; ctx.fillRect(0, 0, 256, 48); 
            for(let x=0; x<256; x+=2) { let drop = Math.floor(Math.random() * 32); ctx.fillRect(x, 48, 2, drop); } 
            ctx.globalCompositeOperation = 'source-atop'; addSmoothNoise(50, 0.4, 8); addSmoothNoise(30, 0.3, 2); addNoise(20, 0.2); ctx.globalCompositeOperation = 'source-over';
        }
        else if (type === 'stone') { fillBase('#7f8c8d'); addSmoothNoise(80, 0.6, 32); addSmoothNoise(50, 0.4, 8); addNoise(40, 0.3); }
        else if (type === 'sand') { fillBase('#e6c27a'); addSmoothNoise(30, 0.2, 16); addNoise(15, 0.2); }
        else if (type === 'leaves') { fillBase('#2d5a27'); addSmoothNoise(40, 0.4, 8); for(let i=0; i<3000; i++) { let sx = Math.floor(Math.random()*256); let sy = Math.floor(Math.random()*256); ctx.clearRect(sx, sy, 4, 4); } }
        else if (type === 'snow') { fillBase('#f0f8ff'); addSmoothNoise(20, 0.1, 8); addNoise(10, 0.1); }
        
        // ✨ THE FIX: Ice texture is now properly generated
        else if (type === 'ice') { fillBase('#a0d8ef'); addNoise(10, 0.15); ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(0, 0, 16, 2); ctx.fillRect(0, 4, 16, 1); }
        
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
        else if (type.includes('zombie_face')) { fillBase('#417031'); addNoise(20, 0.2); ctx.fillStyle = '#111'; ctx.fillRect(2, 4, 4, 3); ctx.fillRect(10, 4, 4, 3); ctx.fillStyle = '#224018'; ctx.fillRect(5, 10, 6, 2); if (type === 'zombie_face_var1') { ctx.fillStyle = '#3a592c'; ctx.fillRect(1, 1, 2, 6); } if (type === 'zombie_face_var2') { ctx.fillStyle = '#8f2020'; ctx.fillRect(2, 4, 4, 3); } }
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
        } else { fillBase('#ff00ff'); }

        const texture = new THREE.CanvasTexture(canvas); 
        texture.magFilter = THREE.LinearFilter; // Use LinearFilter for smooth detailed textures
        texture.wrapS = THREE.RepeatWrapping; 
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }
};
