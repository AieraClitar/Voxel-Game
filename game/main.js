import * as THREE from 'three';
import { World } from './world/World.js';
import { Player } from './entities/Player.js';
import { Textures } from './utils/Textures.js';

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x87CEEB, 15, 60); 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false }); 
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
scene.add(dirLight);

const world = new World(scene);
const player = new Player(camera, document.body, world);
camera.position.set(16, 25, 16);

// --- THE ENVIRONMENT ---
const starLayers = [];
for (let layer = 0; layer < 3; layer++) {
    const starGeo = new THREE.BufferGeometry();
    const starVertices = [];
    for(let i=0; i<300; i++) {
        starVertices.push((Math.random()-0.5)*400, (Math.random()-0.5)*400, (Math.random()-0.5)*400);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starMat = new THREE.PointsMaterial({color: 0xffffff, size: 1.0, transparent: true, fog: false});
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);
    starLayers.push(stars);
}

const texMoon = Textures.generate('moon');
const moonGeo = new THREE.BoxGeometry(12, 12, 12); 
const moonMat = new THREE.MeshBasicMaterial({map: texMoon, fog: false});
const moon = new THREE.Mesh(moonGeo, moonMat);
scene.add(moon);

const texSun = Textures.generate('sun');
const sunGeo = new THREE.BoxGeometry(14, 14, 14);
const sunMat = new THREE.MeshBasicMaterial({map: texSun, fog: false});
const sunMesh = new THREE.Mesh(sunGeo, sunMat);

const texHalo = Textures.generate('sun_halo');
const haloMat = new THREE.MeshBasicMaterial({map: texHalo, transparent: true, fog: false, blending: THREE.AdditiveBlending, depthWrite: false});
const sunHalo = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), haloMat);
sunHalo.position.z = -8; 
sunMesh.add(sunHalo);
scene.add(sunMesh);

const cloudGroup = new THREE.Group();
const cloudMat = new THREE.MeshLambertMaterial({color: 0xffffff, transparent: true, opacity: 0.9});
for(let i=0; i<20; i++) {
    const cluster = new THREE.Group();
    const numPuffs = 3 + Math.floor(Math.random() * 4);
    for(let p=0; p<numPuffs; p++) {
        const width = 15 + Math.random() * 20;
        const depth = 15 + Math.random() * 20;
        const puff = new THREE.Mesh(new THREE.BoxGeometry(width, 6, depth), cloudMat);
        puff.position.set((Math.random()-0.5)*25, (Math.random()-0.5)*4, (Math.random()-0.5)*25);
        cluster.add(puff);
    }
    cluster.position.set((Math.random()-0.5)*250, 40 + Math.random()*10, (Math.random()-0.5)*250);
    cloudGroup.add(cluster);
}
scene.add(cloudGroup);

// --- 🧍 INVENTORY UI SECONDARY SCENE ---
const previewCanvas = document.getElementById('preview-canvas');
const previewRenderer = new THREE.WebGLRenderer({ canvas: previewCanvas, alpha: true, antialias: true });
const previewScene = new THREE.Scene();
const previewCamera = new THREE.PerspectiveCamera(50, 150/250, 0.1, 100);
previewCamera.position.set(0, 0.5, 4.0); 
previewScene.add(new THREE.AmbientLight(0xffffff, 1.2));

const previewPlayer = new THREE.Group();
const matSkin = new THREE.MeshLambertMaterial({color: 0xe0ac69});
const matShirt = new THREE.MeshLambertMaterial({color: 0x3333aa});
const matPants = new THREE.MeshLambertMaterial({color: 0x222255});
const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), matSkin); head.position.y = 0.75;
const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.25), matShirt); body.position.y = 0.125;
const armL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), matSkin); armL.position.set(-0.375, 0.125, 0);
const armR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), matSkin); armR.position.set(0.375, 0.125, 0);
const legL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), matPants); legL.position.set(-0.125, -0.625, 0);
const legR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), matPants); legR.position.set(0.125, -0.625, 0);

// ✨ FIX: Add a physical block directly into the spinning character's hand!
const previewHeldBlock = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), new THREE.MeshLambertMaterial({color: 0xffffff}));
previewHeldBlock.position.set(0, -0.45, -0.15);
armR.add(previewHeldBlock);

previewPlayer.add(head, body, armL, armR, legL, legR);
previewScene.add(previewPlayer);

// --- PAUSE & SAVE LOGIC ---
const pauseMenu = document.getElementById('pause-menu');
document.addEventListener('click', (e) => {
    if (e.target.tagName === 'CANVAS' && !player.isInvOpen && pauseMenu.style.display !== 'flex') player.controls.lock();
});
player.controls.addEventListener('unlock', () => { if (!player.isInvOpen) pauseMenu.style.display = 'flex'; });
player.controls.addEventListener('lock', () => { pauseMenu.style.display = 'none'; });
document.getElementById('btn-resume').onclick = () => player.controls.lock();

document.getElementById('btn-save').onclick = () => {
    const saveState = {
        position: player.camera.position.toArray(), inventory: player.inventory,
        mainInventory: player.mainInventory, worldBlocks: world.getModifiedBlocks(), timeOfDay: dayTime
    };
    localStorage.setItem('sandbox_master_save', JSON.stringify(saveState));
    document.getElementById('save-notif').style.display = 'block';
    setTimeout(() => document.getElementById('save-notif').style.display = 'none', 2000); 
};

document.getElementById('btn-load').onclick = () => {
    const dataStr = localStorage.getItem('sandbox_master_save');
    if (dataStr) {
        const data = JSON.parse(dataStr);
        player.camera.position.fromArray(data.position);
        player.inventory = data.inventory; player.mainInventory = data.mainInventory;
        player.updateInventoryUI();
        dayTime = data.timeOfDay || 0.25;
        world.loadModifiedBlocks(data.worldBlocks);
        player.controls.lock();
    }
};

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
let chunkTimer = 0;
let dayTime = 0.25; 
const dayLengthInSeconds = 240.0; 

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1); 

    dayTime += delta / dayLengthInSeconds;
    if (dayTime > 1) dayTime = 0;

    document.getElementById('time-indicator').style.left = `${dayTime * 100}%`;
    document.getElementById('time-indicator').innerText = (dayTime > 0.5 && dayTime < 1.0) ? '🌙' : '☀️';

    let sunArc = Math.sin(dayTime * Math.PI * 2); 
    let angle = dayTime * Math.PI * 2;
    
    const px = player.camera.position.x;
    const pz = player.camera.position.z;

    const sunX = px + Math.cos(angle) * 250;
    const sunY = Math.sin(angle) * 250;
    const sunZ = pz + Math.sin(angle) * 80;
    
    dirLight.position.set(sunX, sunY, sunZ);
    sunMesh.position.set(sunX, sunY, sunZ);
    sunMesh.lookAt(player.camera.position); 

    moon.position.set(
        px + Math.cos(angle + Math.PI) * 250, 
        Math.sin(angle + Math.PI) * 250, 
        pz + Math.sin(angle + Math.PI) * 80
    );
    moon.lookAt(player.camera.position); 

    dirLight.intensity = Math.max(0, sunArc) * 1.5; 
    ambientLight.intensity = Math.max(0.05, sunArc * 0.8) + 0.1; 

    const daySky = new THREE.Color(0x87CEEB);
    const sunsetSky = new THREE.Color(0xff8c00);
    const nightSky = new THREE.Color(0x020208);
    
    let currentSkyColor = new THREE.Color();
    if (sunArc > 0.2) currentSkyColor = daySky; 
    else if (sunArc > 0) currentSkyColor.lerpColors(sunsetSky, daySky, sunArc / 0.2);
    else currentSkyColor.lerpColors(nightSky, sunsetSky, Math.max(0, (sunArc + 0.2) / 0.2));
    
    scene.background = currentSkyColor;
    scene.fog.color = currentSkyColor;

    const dayCloud = new THREE.Color(0xffffff); 
    const sunsetCloud = new THREE.Color(0xffa07a); 
    const nightCloud = new THREE.Color(0x1a1a24); 
    
    let currentCloudColor = new THREE.Color();
    if (sunArc > 0.2) currentCloudColor = dayCloud; 
    else if (sunArc > 0) currentCloudColor.lerpColors(sunsetCloud, dayCloud, sunArc / 0.2);
    else currentCloudColor.lerpColors(nightCloud, sunsetCloud, Math.max(0, (sunArc + 0.2) / 0.2));

    let baseStarOpacity = sunArc < 0 ? Math.min(1.0, Math.abs(sunArc)) : 0;
    
    starLayers.forEach((starLayer, index) => {
        starLayer.rotation.y += delta * 0.01;
        starLayer.position.set(px, 0, pz); 
        let twinklePulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.002 + (index * 2));
        starLayer.material.opacity = baseStarOpacity * twinklePulse;
    });

    cloudGroup.children.forEach(cluster => {
        cluster.position.x += delta * 3; 
        if (cluster.position.x > 125) cluster.position.x = -125; 
        cluster.children.forEach(puff => { puff.material.color.copy(currentCloudColor); });
    });
    cloudGroup.position.set(px, 0, pz); 

    player.update(delta);
    world.updateDrops(delta); 
    
    chunkTimer += delta;
    if (chunkTimer > 0.5) {
        world.updateChunks(player.camera.position);
        chunkTimer = 0;
    }

    renderer.render(scene, camera);

    if (document.getElementById('inventory-screen').style.display === 'block') {
        previewPlayer.rotation.y += delta; 
        
        // ✨ FIX: Sync the spinning character's hand with your hotbar selection!
        const selected = player.inventory[player.selectedSlot];
        if (selected.type !== null && selected.count > 0) {
            previewHeldBlock.visible = true;
            previewHeldBlock.material = world.materials[selected.type];
            if (selected.type === 'torch') {
                previewHeldBlock.geometry = new THREE.BoxGeometry(0.08, 0.5, 0.08);
                previewHeldBlock.position.set(0, -0.3, -0.15);
            } else {
                previewHeldBlock.geometry = new THREE.BoxGeometry(0.25, 0.25, 0.25);
                previewHeldBlock.position.set(0, -0.45, -0.15);
            }
        } else {
            previewHeldBlock.visible = false;
        }

        previewRenderer.render(previewScene, previewCamera);
    }
}

animate();