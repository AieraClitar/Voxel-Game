import * as THREE from 'three';

export const Textures = {
    generate: function(type) {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');

        const drawNoise = (baseR, baseG, baseB, variance) => {
            for(let x=0; x<16; x++) {
                for(let y=0; y<16; y++) {
                    const noise = (Math.random() - 0.5) * variance;
                    const r = Math.min(255, Math.max(0, baseR + noise));
                    const g = Math.min(255, Math.max(0, baseG + noise));
                    const b = Math.min(255, Math.max(0, baseB + noise));
                    ctx.fillStyle = `rgb(${r},${g},${b})`;
                    ctx.fillRect(x, y, 1, 1);
                }
            }
        };

        if (type === 'grass_top') drawNoise(80, 180, 60, 30);
        else if (type === 'dirt') drawNoise(100, 70, 50, 20);
        else if (type === 'grass_side') {
            drawNoise(100, 70, 50, 20); ctx.fillStyle = '#55b53e'; 
            for(let x=0; x<16; x++) { let drop = 2 + Math.floor(Math.random() * 4); ctx.fillRect(x, 0, 1, drop); }
        }
        else if (type === 'stone') drawNoise(120, 120, 120, 30);
        else if (type === 'sand') drawNoise(210, 190, 140, 20);
        else if (type === 'wood') {
            drawNoise(110, 70, 40, 10); ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(0, 0, 16, 1); ctx.fillRect(0, 8, 16, 1);
        }
        else if (type === 'leaves') {
            drawNoise(40, 100, 30, 40);
            for(let i=0; i<40; i++) ctx.clearRect(Math.random()*16, Math.random()*16, 2, 2);
        }
        else if (type === 'snow') drawNoise(240, 240, 255, 15);
        else if (type === 'ice') drawNoise(180, 220, 255, 20);
        else if (type === 'cactus') {
            drawNoise(40, 120, 40, 20); ctx.fillStyle = '#113311';
            ctx.fillRect(4, 0, 1, 16); ctx.fillRect(11, 0, 1, 16);
        }
        // ✨ FIX: Beautiful, clean Torch Texture
        else if (type === 'torch') {
            ctx.fillStyle = '#5c4033'; // Wood handle
            ctx.fillRect(0, 0, 16, 16);
            ctx.fillStyle = '#ffaa00'; // Orange Flame
            ctx.fillRect(0, 0, 16, 6);
            ctx.fillStyle = '#ffffff'; // White hot core
            ctx.fillRect(4, 0, 8, 3);
        }
        else if (type === 'sun') {
            ctx.fillStyle = '#ffaa00'; ctx.fillRect(0,0,16,16);
            ctx.fillStyle = '#ffff00'; ctx.fillRect(1,1,14,14);
            ctx.fillStyle = '#ffffff'; ctx.fillRect(3,3,10,10);
        }
        else if (type === 'moon') {
            ctx.fillStyle = '#dddddd'; ctx.fillRect(0,0,16,16);
            ctx.fillStyle = '#aaaaaa'; ctx.fillRect(2,3,4,4);
            ctx.fillRect(10,10,3,3); ctx.fillStyle = '#ffffff';
        }
        else if (type === 'sun_halo') {
            const grad = ctx.createRadialGradient(8,8,0, 8,8,8);
            grad.addColorStop(0, 'rgba(255, 255, 200, 1.0)');
            grad.addColorStop(1, 'rgba(255, 255, 0, 0.0)');
            ctx.fillStyle = grad; ctx.fillRect(0,0,16,16);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.magFilter = (type === 'sun_halo') ? THREE.LinearFilter : THREE.NearestFilter; 
        return texture;
    }
};