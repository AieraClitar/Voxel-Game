import * as THREE from 'three';

export const Textures = {
    generate: function(type) {
        const isTool = type === 'stick' || type === 'bow' || type === 'crossbow' || type === 'gun' || (type && (type.includes('sword') || type.includes('pickaxe') || type.includes('axe') || type.includes('shovel')));
        const canvas = document.createElement('canvas');
        canvas.width = isTool ? 256 : 16; canvas.height = isTool ? 256 : 16;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;

        const fillBase = (hex) => { ctx.fillStyle = hex; ctx.fillRect(0, 0, W, H); };
        
        // Simple seeded random for consistent pixel noise
        let seed = 1;
        const typeStr = type || 'unknown';
        for (let i = 0; i < typeStr.length; i++) seed += typeStr.charCodeAt(i);
        const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
        
        const crispNoise = (r, g, b, variance) => {
            for(let x=0; x<16; x++) {
                for(let y=0; y<16; y++) {
                    let v = (rand() - 0.5) * variance;
                    ctx.fillStyle = `rgb(${Math.max(0,Math.min(255,r+v))},${Math.max(0,Math.min(255,g+v))},${Math.max(0,Math.min(255,b+v))})`;
                    ctx.fillRect(x,y,1,1);
                }
            }
        };

        const edgeDarken = () => {
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillRect(0, 0, 16, 1); ctx.fillRect(0, 0, 1, 16);
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(0, 15, 16, 1); ctx.fillRect(15, 0, 1, 16);
        };

        if (type === 'grass_top') { crispNoise(100, 160, 60, 30); edgeDarken(); }
        else if (type === 'dirt') { crispNoise(110, 75, 45, 25); edgeDarken(); }
        else if (type === 'grass_side') { 
            crispNoise(110, 75, 45, 25); 
            ctx.fillStyle = '#64a03c'; ctx.fillRect(0, 0, 16, 4);
            for(let x=0; x<16; x++) { let drop = Math.floor(rand() * 4); ctx.fillRect(x, 4, 1, drop); }
            edgeDarken(); 
        }
        else if (type === 'stone') { crispNoise(120, 120, 120, 20); edgeDarken(); }
        else if (type === 'sand') { crispNoise(220, 200, 150, 15); }
        else if (type === 'leaves') { 
            crispNoise(50, 100, 40, 30); 
            for(let i=0; i<30; i++) { ctx.clearRect(Math.floor(rand()*16), Math.floor(rand()*16), 1, 1); } 
            edgeDarken(); 
        }
        else if (type === 'snow') { crispNoise(240, 245, 255, 10); edgeDarken(); }
        else if (type === 'ice') { crispNoise(180, 220, 255, 15); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(0, 0, 16, 2); ctx.fillRect(0, 4, 16, 1); edgeDarken(); }
        else if (type === 'water') { crispNoise(40, 80, 220, 20); }
        else if (type === 'lava') { crispNoise(240, 80, 10, 40); ctx.fillStyle='rgba(255,255,0,0.5)'; for(let i=0; i<8; i++) ctx.fillRect(Math.floor(rand()*16), Math.floor(rand()*16), 2, 2); }
        else if (type === 'oak_side') { crispNoise(80, 60, 40, 15); ctx.fillStyle = '#3a231a'; for(let x=0; x<16; x+=3) ctx.fillRect(x + Math.floor(rand()*2), 0, 1, 16); edgeDarken(); }
        else if (type === 'birch_side') { crispNoise(220, 220, 220, 10); ctx.fillStyle = '#222'; for(let i=0; i<6; i++) ctx.fillRect(Math.floor(rand()*12), Math.floor(rand()*15), 3 + Math.floor(rand()*3), 1); edgeDarken(); }
        else if (type === 'wood_top') { crispNoise(140, 100, 60, 20); ctx.strokeStyle = '#5c4033'; ctx.lineWidth = 1; for(let r=2; r<8; r+=3) { ctx.beginPath(); ctx.arc(8, 8, r, 0, Math.PI*2); ctx.stroke(); } edgeDarken(); }
        else if (type === 'oak_planks') { crispNoise(150, 110, 65, 15); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, 3, 16, 1); ctx.fillRect(0, 7, 16, 1); ctx.fillRect(0, 11, 16, 1); ctx.fillRect(0, 15, 16, 1); ctx.fillRect(4, 0, 1, 3); ctx.fillRect(10, 4, 1, 3); ctx.fillRect(6, 8, 1, 3); ctx.fillRect(12, 12, 1, 3); edgeDarken(); }
        else if (type === 'birch_planks') { crispNoise(230, 215, 180, 15); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(0, 3, 16, 1); ctx.fillRect(0, 7, 16, 1); ctx.fillRect(0, 11, 16, 1); ctx.fillRect(0, 15, 16, 1); ctx.fillRect(4, 0, 1, 3); ctx.fillRect(10, 4, 1, 3); ctx.fillRect(6, 8, 1, 3); ctx.fillRect(12, 12, 1, 3); edgeDarken(); }
        else if (type === 'crafting_side') { crispNoise(150, 110, 65, 15); ctx.fillStyle = '#4a2f1d'; ctx.fillRect(0,0,16,3); ctx.fillStyle = '#888'; ctx.fillRect(10, 5, 4, 6); ctx.fillStyle = '#333'; ctx.fillRect(2, 6, 4, 4); edgeDarken(); }
        else if (type === 'crafting_top') { crispNoise(150, 110, 65, 15); ctx.fillStyle = '#4a2f1d'; ctx.fillRect(0, 0, 16, 2); ctx.fillRect(0, 7, 16, 2); ctx.fillRect(0, 14, 16, 2); ctx.fillRect(0, 0, 2, 16); ctx.fillRect(7, 0, 2, 16); ctx.fillRect(14, 0, 2, 16); edgeDarken(); }
        else if (type === 'cactus') { crispNoise(50, 180, 70, 20); ctx.fillStyle = '#1e8449'; for(let x=0; x<16; x+=2) ctx.fillRect(x, 0, 1, 16); ctx.fillStyle = '#000000'; for(let i=0; i<20; i++) ctx.fillRect(Math.floor(rand()*16), Math.floor(rand()*16), 1, 1); edgeDarken(); }
        else if (type === 'torch') { ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.fillRect(0,0,16,16); ctx.fillStyle = '#5c4033'; ctx.fillRect(7,6,2,10); ctx.fillStyle = '#ffaa00'; ctx.fillRect(7,3,2,3); ctx.fillStyle = '#ffffff'; ctx.fillRect(7,3,2,1); }
        else if (type === 'sun') { ctx.fillStyle = '#FFD700'; ctx.fillRect(0, 0, 16, 16); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(2, 2, 12, 12); }
        else if (type === 'moon') { ctx.fillStyle = '#DDDDDD'; ctx.fillRect(0, 0, 16, 16); ctx.fillStyle = '#AAAAAA'; ctx.fillRect(2, 2, 4, 4); ctx.fillRect(10, 8, 3, 3); }
        else if (type === 'sun_halo') { const grad = ctx.createRadialGradient(8,8,0, 8,8,8); grad.addColorStop(0, 'rgba(255, 215, 0, 0.4)'); grad.addColorStop(1, 'rgba(255, 215, 0, 0)'); ctx.fillStyle = grad; ctx.fillRect(0,0,16,16); }
        
        else if (type.includes('zombie_face')) { 
            crispNoise(70, 120, 60, 20); 
            ctx.fillStyle = '#111'; ctx.fillRect(2, 6, 4, 3); ctx.fillRect(10, 6, 4, 3); 
            ctx.fillStyle = '#224018'; ctx.fillRect(5, 12, 6, 2); 
            
            if (type === 'zombie_face_var1') {
                ctx.fillStyle = '#dddddd'; ctx.fillRect(3, 2, 6, 4);
                ctx.fillStyle = '#aa0000'; ctx.fillRect(2, 4, 2, 2);
            } else if (type === 'zombie_face_var2') {
                ctx.fillStyle = '#aa0000'; ctx.fillRect(4, 9, 2, 6);
                ctx.fillStyle = '#ff0000'; ctx.fillRect(2, 6, 4, 3); ctx.fillRect(10, 6, 4, 3); 
            }
        }
        else if (type.includes('archer_face')) { 
            crispNoise(220, 170, 110, 15);
            ctx.fillStyle = '#111'; ctx.fillRect(2, 6, 4, 2); ctx.fillRect(10, 6, 4, 2); 
            
            if (type === 'archer_face_bow') { 
                ctx.fillStyle = '#27ae60'; ctx.fillRect(0, 0, 16, 4); ctx.fillRect(0, 0, 2, 16); ctx.fillRect(14, 0, 2, 16);
            } else if (type === 'archer_face_crossbow') { 
                ctx.fillStyle = '#5c4033'; ctx.fillRect(0, 0, 16, 4); 
                ctx.fillStyle = '#333'; ctx.fillRect(0, 4, 16, 2); 
            } else if (type === 'archer_face_gun') { 
                ctx.fillStyle = '#111'; ctx.fillRect(0, 10, 16, 6); 
                ctx.fillStyle = '#333'; ctx.fillRect(0, 0, 16, 4); 
            } else {
                ctx.fillStyle = '#2c3e50'; ctx.fillRect(0, 0, 16, 4);
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

        const texture = new THREE.CanvasTexture(canvas); 
        texture.magFilter = THREE.NearestFilter; // MUST use NearestFilter for crisp pixel art!
        texture.minFilter = THREE.NearestFilter;
        if (!isTool) { texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping; }
        return texture;
    }
};
