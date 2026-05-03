import * as THREE from 'three';
import { World } from './world/World.js';
import { Player } from './entities/Player.js';
import { Textures } from './utils/Textures.js';
import { AIController } from './ai/AIController.js'; 
import { AudioSys } from './utils/AudioSys.js';

const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x87CEEB, 15, 60); 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" }); 
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.castShadow = true;
dirLight.shadow.camera.top = 50; dirLight.shadow.camera.bottom = -50;
dirLight.shadow.camera.left = -50; dirLight.shadow.camera.right = 50;
dirLight.shadow.camera.near = 0.1; dirLight.shadow.camera.far = 200;
dirLight.shadow.mapSize.width = 1024; dirLight.shadow.mapSize.height = 1024;
scene.add(dirLight);

const handLight = new THREE.PointLight(0xffaa44, 0, 14);
scene.add(handLight);

const world = new World(scene);
const player = new Player(camera, document.body, world);

const aiController = new AIController(scene, world, player);
player.aiController = aiController;

window.showChat = (msg) => {
    const feed = document.getElementById('chat-feed');
    if (!feed) return;
    const el = document.createElement('div'); el.className = 'chat-msg'; el.innerText = msg;
    feed.appendChild(el); setTimeout(() => { if(el.parentNode) el.remove(); }, 6000);
};

// ==========================================
// ✨ V11: MULTIPLAYER NETWORKING SYSTEM ✨
// ==========================================
if (window.io) {
    window.socket = io('https://voxel-server-xxxx.onrender.com');
    
    const networkPlayers = new Map();

    function createNetworkPlayer() {
        const group = new THREE.Group();
        const matSkin = new THREE.MeshLambertMaterial({color: 0xe0ac69}); 
        const matShirt = new THREE.MeshLambertMaterial({color: 0x3333aa}); 
        const matPants = new THREE.MeshLambertMaterial({color: 0x222255});
        const faceMat = new THREE.MeshLambertMaterial({ map: Textures.generate('archer_face') });

        const headMaterials = [matSkin, matSkin, matSkin, matSkin, matSkin, faceMat]; 
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), headMaterials); 
        head.position.set(0, 1.5, 0); head.castShadow = true;
        
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.75, 0.25), matShirt); 
        body.position.set(0, 0.875, 0); body.castShadow = true;
        
        const armL = new THREE.Group(); armL.position.set(-0.425, 1.25, 0); 
        const armLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), matSkin); 
        armLMesh.position.y = -0.375; armLMesh.castShadow = true; armL.add(armLMesh);
        
        const armR = new THREE.Group(); armR.position.set(0.425, 1.25, 0);
        const armRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), matSkin); 
        armRMesh.position.y = -0.375; armRMesh.castShadow = true; armR.add(armRMesh);

        const legL = new THREE.Group(); legL.position.set(-0.15, 0.5, 0); 
        const legLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.5, 0.25), matPants); 
        legLMesh.position.y = -0.25; legLMesh.castShadow = true; legL.add(legLMesh);
        
        const legR = new THREE.Group(); legR.position.set(0.15, 0.5, 0); 
        const legRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.5, 0.25), matPants); 
        legRMesh.position.y = -0.25; legRMesh.castShadow = true; legR.add(legRMesh);

        group.add(head, body, armL, armR, legL, legR);
        group.userData = { head, armL, armR, legL, legR, swingTime: 0 };
        return group;
    }

    window.socket.on('currentPlayers', (players) => {
        Object.keys(players).forEach(id => {
            if(id === window.socket.id) return;
            const mesh = createNetworkPlayer();
            mesh.position.set(players[id].x, players[id].y, players[id].z);
            scene.add(mesh);
            networkPlayers.set(id, mesh);
        });
    });

    window.socket.on('newPlayer', (data) => {
        window.showChat("🌍 Someone joined the world!");
        const mesh = createNetworkPlayer();
        mesh.position.set(data.player.x, data.player.y, data.player.z);
        scene.add(mesh);
        networkPlayers.set(data.id, mesh);
    });

    window.socket.on('playerMoved', (data) => {
        if(networkPlayers.has(data.id)) {
            const p = networkPlayers.get(data.id);
            const targetPos = new THREE.Vector3(data.x, data.y, data.z);
            const dist = p.position.distanceTo(targetPos);
            
            p.position.lerp(targetPos, 0.4);
            p.rotation.y = data.ry;
            p.userData.head.rotation.x = data.rx; 

            if (dist > 0.05) {
                p.userData.swingTime += 0.5;
                let swing = Math.sin(p.userData.swingTime) * 0.5;
                p.userData.armL.rotation.x = -swing;
                p.userData.armR.rotation.x = swing;
                p.userData.legL.rotation.x = swing;
                p.userData.legR.rotation.x = -swing;
            } else {
                p.userData.armL.rotation.x = THREE.MathUtils.lerp(p.userData.armL.rotation.x, 0, 0.1);
                p.userData.armR.rotation.x = THREE.MathUtils.lerp(p.userData.armR.rotation.x, 0, 0.1);
                p.userData.legL.rotation.x = THREE.MathUtils.lerp(p.userData.legL.rotation.x, 0, 0.1);
                p.userData.legR.rotation.x = THREE.MathUtils.lerp(p.userData.legR.rotation.x, 0, 0.1);
            }
        }
    });

    window.socket.on('playerDisconnected', (id) => {
        if(networkPlayers.has(id)) {
            window.showChat("👋 Someone left the world.");
            scene.remove(networkPlayers.get(id));
            networkPlayers.delete(id);
        }
    });

    window.socket.on('blockUpdate', (data) => {
        if(data.action === 'add') {
            world.addBlock(data.x, data.y, data.z, data.type);
        } else if (data.action === 'remove') {
            world.removeBlock(data.x, data.y, data.z);
        }
    });
} else {
    console.warn("Socket.io not found! Multiplayer is disabled.");
}
// ==========================================

const starLayers = [];
for (let layer = 0; layer < (isMobile ? 1 : 3); layer++) {
    const starGeo = new THREE.BufferGeometry();
    const starVertices = [];
    for(let i=0; i<150; i++) starVertices.push((Math.random()-0.5)*400, (Math.random()-0.5)*400, (Math.random()-0.5)*400);
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const starMat = new THREE.PointsMaterial({color: 0xffffff, size: 1.0, transparent: true, fog: false});
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars); starLayers.push(stars);
}

const texMoon = Textures.generate('moon');
const moon = new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), new THREE.MeshBasicMaterial({map: texMoon, fog: false, transparent: true}));
scene.add(moon);

const texSun = Textures.generate('sun');
const sunMesh = new THREE.Mesh(new THREE.BoxGeometry(14, 14, 14), new THREE.MeshBasicMaterial({map: texSun, fog: false, transparent: true}));

const texHalo = Textures.generate('sun_halo');
const sunHalo = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.MeshBasicMaterial({map: texHalo, transparent: true, fog: false, blending: THREE.AdditiveBlending, depthWrite: false}));
sunHalo.position.z = -8; sunMesh.add(sunHalo);
scene.add(sunMesh);

const cloudGroup = new THREE.Group();
const cloudMat = new THREE.MeshLambertMaterial({color: 0xffffff, transparent: true, opacity: 0.9});
const cloudCount = isMobile ? 8 : 20; 
for(let i=0; i<cloudCount; i++) {
    const cluster = new THREE.Group();
    const numPuffs = 2 + Math.floor(Math.random() * 3);
    for(let p=0; p<numPuffs; p++) {
        const puff = new THREE.Mesh(new THREE.BoxGeometry(15 + Math.random() * 20, 6, 15 + Math.random() * 20), cloudMat);
        puff.position.set((Math.random()-0.5)*25, (Math.random()-0.5)*4, (Math.random()-0.5)*25);
        cluster.add(puff);
    }
    cluster.position.set((Math.random()-0.5)*250, 40 + Math.random()*10, (Math.random()-0.5)*250);
    cloudGroup.add(cluster);
}
scene.add(cloudGroup);

const previewCanvas = document.getElementById('preview-canvas');
const previewRenderer = new THREE.WebGLRenderer({ canvas: previewCanvas, alpha: true, antialias: true });

previewRenderer.setSize(120, 200, false); 
previewRenderer.setClearColor(0x000000, 0); 

const previewScene = new THREE.Scene();
const previewCamera = new THREE.PerspectiveCamera(50, 120/200, 0.1, 100);
previewCamera.position.set(0, -0.25, 4.0); 

previewScene.add(new THREE.AmbientLight(0xffffff, 1.2));
const previewDirLight = new THREE.DirectionalLight(0xffffff, 1.5);
previewDirLight.position.set(5, 10, 7);
previewScene.add(previewDirLight);

const previewPlayer = new THREE.Group();
const matSkin = new THREE.MeshLambertMaterial({color: 0xe0ac69}); 
const matShirt = new THREE.MeshLambertMaterial({color: 0x3333aa}); 
const matPants = new THREE.MeshLambertMaterial({color: 0x222255});
const faceMat = new THREE.MeshLambertMaterial({ map: Textures.generate('archer_face') });

const headMaterials = [matSkin, matSkin, matSkin, matSkin, matSkin, faceMat]; 
const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), headMaterials); head.position.set(0, 0, 0);
const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.75, 0.25), matShirt); body.position.set(0, -0.625, 0);
const armL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), matSkin); armL.position.set(-0.425, -0.625, 0);
const armR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), matSkin); armR.position.set(0.425, -0.625, 0);
const legL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.5, 0.25), matPants); legL.position.set(-0.15, -1.25, 0);
const legR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.5, 0.25), matPants); legR.position.set(0.15, -1.25, 0);

const previewHeldBlock = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), new THREE.MeshLambertMaterial({color: 0xffffff}));
armR.add(previewHeldBlock); previewPlayer.add(head, body, armL, armR, legL, legR); previewScene.add(previewPlayer);

let isGeneratingWorld = false;
let initialChunksNeeded = 0;
let initialChunksDone = 0;

document.getElementById('btn-play-menu').addEventListener('click', () => {
    AudioSys.init(); 
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('world-menu').style.display = 'flex';
});

document.getElementById('btn-back-menu').addEventListener('click', () => {
    document.getElementById('world-menu').style.display = 'none';
    document.getElementById('main-menu').style.display = 'flex';
});

document.getElementById('btn-create-world').addEventListener('click', () => {
    document.getElementById('world-menu').style.display = 'none';
    document.getElementById('loading-screen').style.display = 'flex';
    if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    world.updateChunks(new THREE.Vector3(16, 0, 16));
    initialChunksNeeded = world.chunkQueue.length;
    initialChunksDone = 0;
    isGeneratingWorld = true;
});

const pauseMenu = document.getElementById('pause-menu');
document.addEventListener('click', (e) => {
    if (e.target.tagName === 'CANVAS' && player.gameActive && !player.isInvOpen && pauseMenu.style.display !== 'flex' && !isMobile) player.controls.lock();
});
player.controls.addEventListener('unlock', () => { if (player.gameActive && !player.isInvOpen && !isMobile) pauseMenu.style.display = 'flex'; });
player.controls.addEventListener('lock', () => { pauseMenu.style.display = 'none'; player.gameActive = true; });
document.getElementById('btn-resume').addEventListener('click', () => { pauseMenu.style.display = 'none'; player.gameActive = true; if (!isMobile) player.controls.lock(); });

document.getElementById('btn-save').onclick = () => {
    localStorage.setItem('sandbox_master_save', JSON.stringify({ position: player.camera.position.toArray(), inventory: player.inventory, mainInventory: player.mainInventory, worldBlocks: world.getModifiedBlocks(), timeOfDay: dayTime }));
    document.getElementById('save-notif').style.display = 'block'; setTimeout(() => document.getElementById('save-notif').style.display = 'none', 2000); 
};
document.getElementById('btn-load').onclick = () => {
    const dataStr = localStorage.getItem('sandbox_master_save');
    if (dataStr) {
        const data = JSON.parse(dataStr); player.camera.position.fromArray(data.position); player.inventory = data.inventory; player.mainInventory = data.mainInventory; player.updateInventoryUI(); dayTime = data.timeOfDay || 0.25; world.loadModifiedBlocks(data.worldBlocks);
        pauseMenu.style.display = 'none'; player.gameActive = true; if (!isMobile) player.controls.lock();
    }
};

window.addEventListener('resize', () => { 
    const aspect = window.innerWidth / window.innerHeight;
    camera.aspect = aspect; camera.updateProjectionMatrix(); 
    player.tpsCameraBack.aspect = aspect; player.tpsCameraBack.updateProjectionMatrix();
    player.tpsCameraFront.aspect = aspect; player.tpsCameraFront.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight); 
});

const clock = new THREE.Clock();
let chunkTimer = 0;
let dayTime = 0.25; 
let currentShadowFactor = 1.0; let currentCaveFactor = 1.0; 

const daySky = new THREE.Color(0x60a5fa); const sunsetSky = new THREE.Color(0xf59e0b); const nightSky = new THREE.Color(0x0f172a); const caveColor = new THREE.Color(0x020617);
const dayCloud = new THREE.Color(0xffffff); const sunsetCloud = new THREE.Color(0xfcb045); const nightCloud = new THREE.Color(0x1e293b);
const currentSkyColor = new THREE.Color(); const currentCloudColor = new THREE.Color();

function animate() {
    requestAnimationFrame(animate);

    if (isGeneratingWorld) {
        let startTime = performance.now();
        while (world.chunkQueue.length > 0 && performance.now() - startTime < 16) { world.processChunkQueue(); initialChunksDone++; }
        let progress = (initialChunksDone / initialChunksNeeded) * 100;
        document.getElementById('loading-progress').style.width = `${progress}%`;

        if (world.chunkQueue.length === 0) {
            isGeneratingWorld = false;
            let spawnY = world.getSurfaceHeight(16, 16) + 2;
            player.camera.position.set(16, spawnY, 16);
            player.velocity.set(0,0,0);
            document.getElementById('loading-screen').style.display = 'none';
            document.getElementById('hud-layer').style.display = 'block';
            player.gameActive = true;
            if (!isMobile) player.controls.lock();
        }
        renderer.render(scene, camera);
        return; 
    }

    if (!player.gameActive) return;
    world.processChunkQueue();

    const delta = Math.min(clock.getDelta(), 0.1); 
    dayTime = (dayTime + delta / 240.0) % 1;
    let sunArc = Math.sin(dayTime * Math.PI * 2); let angle = dayTime * Math.PI * 2;
    world.sunArc = sunArc;

    document.getElementById('time-indicator').style.left = `${dayTime * 100}%`;
    document.getElementById('time-indicator').innerText = (dayTime > 0.5 && dayTime < 1.0) ? '🌙' : '☀️';

    let hasRoof = false; let roofType = 'air';
    const bx = Math.round(player.camera.position.x); const bz = Math.round(player.camera.position.z); const by = Math.round(player.camera.position.y + 1.0); 
    for (let y = by; y <= by + 50; y++) {
        const type = world.getBlockType(bx, y, bz);
        if (type !== 'air' && type !== 'water' && type !== 'torch') { hasRoof = true; roofType = type; break; }
    }

    let targetShadowFactor = hasRoof ? (roofType === 'leaves' || roofType.includes('wood') ? 0.4 : 0.0) : 1.0;
    let targetCaveFactor = hasRoof && !roofType.includes('wood') && roofType !== 'leaves' ? 0.0 : 1.0;
    currentShadowFactor += (targetShadowFactor - currentShadowFactor) * delta * 3.0;
    currentCaveFactor += (targetCaveFactor - currentCaveFactor) * delta * 3.0;

    const px = player.camera.position.x; const pz = player.camera.position.z;

    sunMesh.position.set(px + Math.cos(angle) * 250, Math.sin(angle) * 250, pz + Math.sin(angle) * 80);
    sunMesh.lookAt(player.camera.position); dirLight.position.copy(sunMesh.position);
    moon.position.set(px + Math.cos(angle + Math.PI) * 250, Math.sin(angle + Math.PI) * 250, pz + Math.sin(angle + Math.PI) * 80);
    moon.lookAt(player.camera.position); 

    dirLight.intensity = Math.max(0, sunArc) * 1.5 * currentShadowFactor; 
    hemiLight.intensity = Math.max(0.1, sunArc) * 0.6 * currentCaveFactor; 

    if (sunArc > 0.2) { currentSkyColor.copy(daySky); currentCloudColor.copy(dayCloud); }
    else if (sunArc > 0) { currentSkyColor.lerpColors(sunsetSky, daySky, sunArc / 0.2); currentCloudColor.lerpColors(sunsetCloud, dayCloud, sunArc / 0.2); }
    else { currentSkyColor.lerpColors(nightSky, sunsetSky, Math.max(0, (sunArc + 0.2) / 0.2)); currentCloudColor.lerpColors(nightCloud, sunsetCloud, Math.max(0, (sunArc + 0.2) / 0.2)); }
    
    currentSkyColor.lerp(caveColor, 1.0 - currentCaveFactor);
    scene.background = currentSkyColor; scene.fog.color = currentSkyColor;
    scene.fog.near = 2 + (13 * currentCaveFactor); scene.fog.far = 15 + (45 * currentCaveFactor); 

    sunMesh.material.opacity = currentCaveFactor; sunHalo.material.opacity = currentCaveFactor; moon.material.opacity = currentCaveFactor;

    let baseStarOpacity = sunArc < 0 ? Math.min(1.0, Math.abs(sunArc)) : 0;
    starLayers.forEach((layer, i) => { layer.rotation.y += delta * 0.01; layer.position.set(px, 0, pz); layer.material.opacity = baseStarOpacity * (0.5 + 0.5 * Math.sin(performance.now() * 0.002 + (i * 2))) * currentCaveFactor; });
    cloudGroup.children.forEach(c => { c.position.x += delta * 3; if (c.position.x > 125) c.position.x = -125; c.children.forEach(p => { p.material.color.copy(currentCloudColor); p.material.opacity = 0.9 * currentCaveFactor; }); });
    cloudGroup.position.set(px, 0, pz); 

    const selectedItem = player.inventory[player.selectedSlot];
    handLight.intensity = (selectedItem && selectedItem.type === 'torch' && selectedItem.count > 0) ? 10 + (Math.random() * 2) : 0;
    if (handLight.intensity > 0) handLight.position.copy(player.camera.position);

    player.update(delta);
    aiController.update(delta);
    world.updateDrops(delta); world.updateLights();
    
    chunkTimer += delta;
    if (chunkTimer > 0.5) { world.updateChunks(player.camera.position); chunkTimer = 0; }

    renderer.render(scene, player.getActiveCamera());

    const invScreen = document.getElementById('inventory-screen');
    if (invScreen.classList.contains('active')) {
        previewPlayer.rotation.y = Math.PI + Math.sin(performance.now() * 0.001) * 0.3; 
        if (previewHeldBlock.geometry) previewHeldBlock.geometry.dispose();
        
        if (selectedItem !== null && selectedItem.count > 0) {
            previewHeldBlock.visible = true;
            let mat = world.itemMaterials[selectedItem.type] || world.itemMaterials['stone'];
            const isTool = (t) => t === 'stick' || t === 'bow' || t === 'crossbow' || t === 'gun' || (t && (t.includes('sword') || t.includes('pickaxe') || t.includes('axe') || t.includes('shovel')));
            
            if (isTool(selectedItem.type)) {
                previewHeldBlock.material = mat; previewHeldBlock.geometry = new THREE.PlaneGeometry(1.0, 1.0); 
                previewHeldBlock.geometry.translate(0.5, 0.5, 0); previewHeldBlock.position.set(0, -0.375, -0.15); previewHeldBlock.rotation.set(0, Math.PI / 2, 0); 
            } else if (selectedItem.type === 'torch') {
                previewHeldBlock.material = mat; previewHeldBlock.geometry = new THREE.BoxGeometry(0.08, 0.5, 0.08); 
                previewHeldBlock.geometry.translate(0, 0.25, 0); previewHeldBlock.position.set(0, -0.375, -0.15); previewHeldBlock.rotation.set(Math.PI / 8, 0, 0);
            } else {
                previewHeldBlock.material = mat; previewHeldBlock.geometry = new THREE.BoxGeometry(0.25, 0.25, 0.25); 
                previewHeldBlock.position.set(0, -0.25, -0.15); previewHeldBlock.rotation.set(Math.PI/8, Math.PI / 4, 0);
            }
        } else { previewHeldBlock.visible = false; }
        
        previewRenderer.render(previewScene, previewCamera);
    }
}
animate();
