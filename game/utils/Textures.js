import * as THREE from 'three';

export const Textures = {
    cache: {}, 

    generate: function(type) {
        if (!type) return null;
        if (this.cache[type]) return this.cache[type];

        const isTool = type === 'stick' || type === 'bow' || type === 'crossbow' || type === 'gun' || (type && (type.includes('sword') || type.includes('pickaxe') || type.includes('axe') || type.includes('shovel')));
        const canvas = document.createElement('canvas');
        canvas.width = isTool ? 256 : 16; canvas.height = isTool ? 256 : 16;
        const ctx = canvas.getContext('2d');

        const fillBase = (hex) => { ctx.fillStyle = hex; ctx.fillRect(0, 0, 16, 16); };
        const addNoise = (variance, opacity = 1) => {
            ctx.globalAlpha = opacity;
            for(let x=0; x<16; x++) { for(let y=0; y<16; y++) { let v = (Math.random() - 0.5) * variance; ctx.fillStyle = `rgb(${128+v},${128+v},${128+v})`; ctx.globalCompositeOperation = 'overlay'; ctx.fillRect(x, y, 1, 1); } }
            ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        };

        if (type === 'grass_top') { fillBase('#3b8526'); addNoise(25, 0.25); ctx.fillStyle = '#4cc22f'; for(let i=0; i<15; i++) ctx.fillRect(Math.random()*16, Math.random()*16, 1, 2); }
        else if (type === 'dirt') { fillBase('#4a3018'); addNoise(35, 0.35); ctx.fillStyle = '#2b1b0c'; for(let i=0; i<20; i++) ctx.fillRect(Math.random()*16, Math.random()*16, 1, 1); }
        else if (type === 'grass_side') { fillBase('#4a3018'); addNoise(35, 0.35); ctx.fillStyle = '#3b8526'; ctx.fillRect(0, 0, 16, 4); for(let x=0; x<16; x++) ctx.fillRect(x, 4, 1, Math.floor(Math.random() * 5)); }
        else if (type === 'stone') { fillBase('#555555'); addNoise(45, 0.4); ctx.fillStyle = '#333333'; ctx.fillRect(2, 2, 2, 1); ctx.fillRect(10, 8, 3, 1); ctx.fillRect(4, 12, 2, 1); ctx.fillStyle = '#888888'; ctx.fillRect(2, 3, 2, 1); ctx.fillRect(10, 9, 3, 1); }
        else if (type === 'sand') { fillBase('#e6c27a'); addNoise(20, 0.25); ctx.fillStyle = '#c7a35c'; for(let i=0; i<15; i++) ctx.fillRect(Math.random()*16, Math.random()*16, 1, 1); }
        else if (type === 'leaves') { fillBase('#1e4219'); addNoise(40, 0.5); for(let i=0; i<35; i++) ctx.clearRect(Math.floor(Math.random()*15), Math.floor(Math.random()*15), 2, 2); }
        else if (type === 'snow') { fillBase('#f4f9ff'); addNoise(10, 0.15); }
        else if (type === 'ice') { fillBase('#a0d8ef'); addNoise(15, 0.15); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(2, 14); ctx.lineTo(14, 2); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(0, 0, 16, 2); }
        else if (type === 'water') { const grad = ctx.createLinearGradient(0,0, 0,16); grad.addColorStop(0, '#1ca3ec'); grad.addColorStop(1, '#0f5e9c'); ctx.fillStyle = grad; ctx.fillRect(0,0,16,16); ctx.fillStyle = 'rgba(255,255,255,0.2)'; for(let i=0; i<6; i++) ctx.fillRect(Math.random()*16, Math.random()*16, Math.random()*8+2, 1); }
        else if (type === 'oak_side') { fillBase('#4a332a'); addNoise(15, 0.2); ctx.fillStyle = '#2c1e18'; for(let x=0; x<16; x+=3) ctx.fillRect(x + Math.random(), 0, 1, 16); }
        else if (type === 'wood_top') { fillBase('#8b5a2b'); ctx.strokeStyle = '#4a332a'; ctx.lineWidth = 1; for(let r=2; r<10; r+=2) { ctx.beginPath(); ctx.arc(8, 8, r, 0, Math.PI*2); ctx.stroke(); } }
        else if (type === 'oak_planks') { fillBase('#8b5a2b'); addNoise(20, 0.2); ctx.fillStyle = 'rgba(0,0,0,0.5)'; [3,7,11,15].forEach(y => ctx.fillRect(0, y, 16, 1)); [0,8].forEach(x => ctx.fillRect(x+4, 0, 1, 3)); [4,12].forEach(x => ctx.fillRect(x+6, 4, 1, 3)); }
        else if (type === 'birch_planks') { fillBase('#e2d4b5'); addNoise(15, 0.15); ctx.fillStyle = 'rgba(0,0,0,0.3)'; [3,7,11,15].forEach(y => ctx.fillRect(0, y, 16, 1)); [0,8].forEach(x => ctx.fillRect(x+4, 0, 1, 3)); [4,12].forEach(x => ctx.fillRect(x+6, 4, 1, 3)); }
        else if (type === 'crafting_side') { fillBase('#8b5a2b'); addNoise(20, 0.2); ctx.fillStyle = '#4a2f1d'; ctx.fillRect(0,0,16,2); ctx.fillStyle = '#888'; ctx.fillRect(10, 4, 4, 6); ctx.fillStyle = '#333'; ctx.fillRect(2, 6, 4, 4); }
        else if (type === 'crafting_top') { fillBase('#8b5a2b'); addNoise(20, 0.2); ctx.fillStyle = '#4a2f1d'; ctx.fillRect(0, 0, 16, 2); ctx.fillRect(0, 7, 16, 2); ctx.fillRect(0, 14, 16, 2); ctx.fillRect(0, 0, 2, 16); ctx.fillRect(7, 0, 2, 16); ctx.fillRect(14, 0, 2, 16); }
        else if (type === 'cactus') { fillBase('#2ecc71'); addNoise(15, 0.2); ctx.fillStyle = '#1e8449'; for(let x=0; x<16; x+=2) ctx.fillRect(x, 0, 1, 16); ctx.fillStyle = '#000000'; for(let i=0; i<15; i++) ctx.fillRect(Math.random()*16, Math.random()*16, 1, 1); }
        else if (type === 'torch') { ctx.fillStyle = '#4a2f1d'; ctx.fillRect(0,0,16,16); ctx.fillStyle = '#ffaa00'; ctx.fillRect(0,0,16,6); ctx.fillStyle = '#ffffff'; ctx.fillRect(4,0,8,3); }
        
        else if (type.startsWith('zombie_skin_')) {
            fillBase('#3a632a'); addNoise(25, 0.25);
            if (type === 'zombie_skin_2') { ctx.fillStyle = '#dddddd'; ctx.fillRect(4, 4, 3, 8); ctx.fillStyle = '#660000'; ctx.fillRect(3, 3, 5, 2); } 
            if (type === 'zombie_skin_3') { ctx.fillStyle = '#8f2020'; ctx.fillRect(2, 2, 4, 4); ctx.fillRect(8, 10, 5, 4); } 
        }
        else if (type.startsWith('zombie_shirt_')) {
            fillBase('#0088cc'); addNoise(30, 0.3);
            ctx.fillStyle = '#3a632a'; ctx.fillRect(10, 2, 6, 5); ctx.fillRect(0, 10, 4, 6); 
            if (type === 'zombie_shirt_2') { ctx.fillStyle = '#dddddd'; ctx.fillRect(11, 3, 3, 3); ctx.fillStyle = '#660000'; ctx.fillRect(8, 1, 3, 7); } 
            if (type === 'zombie_shirt_3') { ctx.fillStyle = '#660000'; ctx.fillRect(0, 0, 16, 6); } 
        }
        else if (type.startsWith('zombie_face_')) {
            fillBase('#3a632a'); addNoise(20, 0.2);
            ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 10; ctx.fillStyle = '#ff2222'; ctx.fillRect(2, 4, 4, 3); ctx.fillRect(10, 4, 4, 3); 
            ctx.shadowBlur = 0; ctx.fillStyle = '#000'; ctx.fillRect(3, 5, 2, 1); ctx.fillRect(11, 5, 2, 1); 
            if (type === 'zombie_face_1') { ctx.fillStyle = '#224018'; ctx.fillRect(5, 10, 6, 2); ctx.fillStyle = '#660000'; ctx.fillRect(4, 10, 2, 4); } 
            if (type === 'zombie_face_2') { ctx.fillStyle = '#dddddd'; ctx.fillRect(4, 10, 8, 4); ctx.fillStyle = '#222'; ctx.fillRect(5, 11, 1, 2); ctx.fillRect(7, 11, 1, 2); ctx.fillRect(9, 11, 1, 2); } 
            if (type === 'zombie_face_3') { ctx.fillStyle = '#551111'; ctx.fillRect(1, 1, 6, 2); ctx.fillRect(8, 2, 5, 2); ctx.fillRect(2, 9, 3, 5); } 
        }
        else if (type === 'archer_bow_face') { fillBase('#e0ac69'); addNoise(10, 0.1); ctx.fillStyle = '#27ae60'; ctx.fillRect(0, 0, 16, 5); ctx.fillStyle = '#222'; ctx.fillRect(3, 6, 2, 2); ctx.fillRect(11, 6, 2, 2); }
        else if (type === 'archer_crossbow_face') { fillBase('#e0ac69'); addNoise(10, 0.1); ctx.fillStyle = '#4a2f1d'; ctx.fillRect(0, 0, 16, 4); ctx.fillStyle = '#222'; ctx.fillRect(3, 6, 2, 2); ctx.fillStyle = '#111'; ctx.fillRect(10, 5, 6, 4); ctx.fillRect(0, 6, 16, 1); }
        else if (type === 'archer_gun_face') { fillBase('#2c3e50'); addNoise(15, 0.2); ctx.fillStyle = '#e0ac69'; ctx.fillRect(4, 5, 8, 4); ctx.fillStyle = '#111'; ctx.fillRect(0, 5, 16, 3); ctx.fillStyle = '#e74c3c'; ctx.fillRect(3, 5, 4, 3); ctx.fillRect(9, 5, 4, 3); }
        
        else if (type === 'archer_bow_shirt') { fillBase('#27ae60'); addNoise(20, 0.2); ctx.fillStyle='#4a2f1d'; ctx.fillRect(6,0,4,16); } 
        else if (type === 'archer_crossbow_shirt') { fillBase('#6e4326'); addNoise(30, 0.3); ctx.fillStyle='#3e2723'; ctx.fillRect(0,6,16,4); } 
        else if (type === 'archer_gun_shirt') { fillBase('#34495e'); addNoise(15, 0.2); ctx.fillStyle='#111'; ctx.fillRect(2,2,12,12); ctx.fillStyle='#555'; ctx.fillRect(4,4,8,8); } 
        else if (type === 'archer_bow_pants') { fillBase('#4CAF50'); addNoise(15, 0.2); }
        else if (type === 'archer_crossbow_pants') { fillBase('#4a2f1d'); addNoise(20, 0.2); }
        else if (type === 'archer_gun_pants') { fillBase('#2c3e50'); addNoise(15, 0.2); }

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
        texture.magFilter = isTool ? THREE.LinearFilter : THREE.NearestFilter; 
        
        // ✨ PHASE 2: Allow fluid animation wrapping
        if (type === 'water') {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
        }

        this.cache[type] = texture; 
        return texture;
    }
};