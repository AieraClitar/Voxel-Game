import * as THREE from 'three';
import { World } from './world/World.js';
import { Player } from './entities/Player.js';
import { Textures } from './utils/Textures.js';
import { AIController, create3DWeapon } from './ai/AIController.js'; 
import { AudioSys } from './utils/AudioSys.js';

const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x87CEEB, 15, 60); 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" }); 
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(isMobile ? 1 : Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4); scene.add(hemiLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.castShadow = true; dirLight.shadow.camera.top = 50; dirLight.shadow.camera.bottom = -50;
dirLight.shadow.camera.left = -50; dirLight.shadow.camera.right = 50;
dirLight.shadow.camera.near = 0.1; dirLight.shadow.camera.far = 200;
dirLight.shadow.mapSize.width = 1024; dirLight.shadow.mapSize.height = 1024;
scene.add(dirLight);
const handLight = new THREE.PointLight(0xffaa44, 0, 14); scene.add(handLight);

let world = new World(scene, 1); 
const player = new Player(camera, document.body, world);
const aiController = new AIController(scene, world, player);
player.aiController = aiController;

window.showChat = (msg) => {
    const feed = document.getElementById('chat-feed'); if (!feed) return;
    const el = document.createElement('div'); el.className = 'chat-msg'; el.innerText = msg;
    feed.appendChild(el); setTimeout(() => { if(el.parentNode) el.remove(); }, 6000);
};

let localPlayerName = "Guest";
let localRoomStartTime = Date.now() - (0.25 * 240 * 1000); 
const playerListUI = document.getElementById('playerListUI');
const ul = document.getElementById('playerList');
const networkPlayers = new Map();

window.updatePlayerList = function() {
    if(!ul) return; ul.innerHTML = `<li>⭐ ${localPlayerName} (You)</li>`;
    networkPlayers.forEach((playerObj) => { ul.innerHTML += `<li>🟢 ${playerObj.userData.playerName || "Guest"}</li>`; });
}

if (window.io) {
    window.socket = io('https://voxel-server-591c.onrender.com', { transports: ['websocket'] });

    function createNameTag(name) {
        const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64; const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; ctx.roundRect(16, 8, 224, 48, 8); ctx.fill();
        ctx.font = 'bold 28px monospace'; ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.fillText(name, 128, 42); 
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false }));
        sprite.scale.set(2, 0.5, 1); sprite.position.y = 2.0; return sprite;
    }

    // ✨ REMOTE PLAYERS NOW HOLD FULL 3D WEAPONS!
    function updateNetworkPlayerItem(group, itemType) {
        if (group.userData.heldItemType === itemType) return;
        group.userData.heldItemType = itemType; const armR = group.userData.armR; const oldItem = armR.getObjectByName('equippedItem'); if (oldItem) armR.remove(oldItem);
        if (itemType) {
            const mat = world.itemMaterials[itemType] || world.itemMaterials['stone']; let mesh;
            if (['wooden_sword', 'stone_sword', 'wooden_pickaxe', 'stone_pickaxe', 'wooden_axe', 'stone_axe', 'wooden_shovel', 'stone_shovel', 'stick', 'bow', 'crossbow', 'gun'].includes(itemType)) {
                mesh = create3DWeapon(itemType); mesh.position.set(0, -0.3, 0.15); mesh.rotation.set(Math.PI / 2, 0, 0);
            } else if (itemType === 'torch') {
                mesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), mat); mesh.geometry.translate(0, 0.2, 0); mesh.position.set(0, -0.75, -0.15); mesh.rotation.set(-Math.PI / 8, 0, 0); 
            } else {
                mesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), mat); mesh.position.set(0, -0.75, -0.15); mesh.rotation.set(0, Math.PI / 4, 0);
            }
            mesh.name = 'equippedItem'; mesh.castShadow = true; armR.add(mesh);
        }
    }

    function createNetworkPlayer(playerName) {
        const group = new THREE.Group();
        const matSkin = new THREE.MeshLambertMaterial({color: 0xe0ac69}); const matShirt = new THREE.MeshLambertMaterial({color: 0x3333aa}); const matPants = new THREE.MeshLambertMaterial({color: 0x222255});
        const headMaterials = [matSkin, matSkin, matSkin, matSkin, matSkin, new THREE.MeshLambertMaterial({ map: Textures.generate('archer_face') })]; 
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), headMaterials); head.position.set(0, 1.5, 0); head.castShadow = true;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.75, 0.25), matShirt); body.position.set(0, 0.875, 0); body.castShadow = true;
        const armL = new THREE.Group(); armL.position.set(-0.425, 1.25, 0); const armLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), matSkin); armLMesh.position.y = -0.375; armLMesh.castShadow = true; armL.add(armLMesh);
        const armR = new THREE.Group(); armR.position.set(0.425, 1.25, 0); const armRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), matSkin); armRMesh.position.y = -0.375; armRMesh.castShadow = true; armR.add(armRMesh);
        const legL = new THREE.Group(); legL.position.set(-0.15, 0.5, 0); const legLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.5, 0.25), matPants); legLMesh.position.y = -0.25; legLMesh.castShadow = true; legL.add(legLMesh);
        const legR = new THREE.Group(); legR.position.set(0.15, 0.5, 0); const legRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.5, 0.25), matPants); legRMesh.position.y = -0.25; legRMesh.castShadow = true; legR.add(legRMesh);

        const hpMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.1), new THREE.MeshBasicMaterial({color: 0x00ff00, depthTest: false}));
        hpMesh.position.y = 2.4; hpMesh.name = 'healthBar';
        
        group.add(head, body, armL, armR, legL, legR, createNameTag(playerName || "Guest"), hpMesh);
        group.userData = { head, armL, armR, legL, legR, swingTime: 0, playerName, attackTimer: 0, targetPos: new THREE.Vector3(), targetRy: 0, targetRx: 0 };
        return group;
    }

    window.socket.on('lobbyUpdate', (activeWorlds) => {
        const serverList = document.getElementById('server-list'); if(!serverList) return;
        serverList.innerHTML = '';
        if(activeWorlds.length === 0) { serverList.innerHTML = '<div style="color: #aaa; text-align: center; padding: 10px;">No active worlds. Host one!</div>'; return; }

        activeWorlds.forEach(serverInfo => {
            const div = document.createElement('div'); div.className = 'server-item';
            const info = document.createElement('span'); info.innerText = `🌍 ${serverInfo.hostName}'s World (${serverInfo.playerCount} player${serverInfo.playerCount !== 1 ? 's' : ''})`;
            const joinBtn = document.createElement('button'); joinBtn.innerText = 'Join'; joinBtn.className = 'mc-btn';
            
            joinBtn.onclick = () => {
                localPlayerName = document.getElementById('playerName').value.trim() || "Guest";
                window.socket.emit('joinGame', { roomId: serverInfo.id, playerName: localPlayerName });
                AudioSys.init(); 
                document.getElementById('lobby-browser').style.display = 'none'; document.getElementById('main-menu').style.display = 'none';
                document.getElementById('loading-screen').style.display = 'flex';
                if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
                player.gameActive = true; 
            };
            div.appendChild(info); div.appendChild(joinBtn); serverList.appendChild(div);
        });
    });

    window.socket.on('world_snapshot', (data) => {
        localRoomStartTime = Date.now() - (data.ageInSeconds * 1000); 
        
        scene.remove(world.dropGroup); scene.remove(world.particleGroup);
        for(const chunk of world.chunks.values()) scene.remove(chunk);
        
        world.chunkData.clear(); world.chunks.clear(); 
        world.chunkDataState.clear(); world.chunkMeshState.clear();
        world.serverBlocks.clear();
        
        world = new World(scene, data.seed);
        player.world = world; aiController.world = world;
        
        Object.keys(data.players).forEach(id => {
            if(id === window.socket.id) return;
            const mesh = createNetworkPlayer(data.players[id].name);
            mesh.position.set(data.players[id].x, data.players[id].y, data.players[id].z);
            mesh.userData.targetPos.copy(mesh.position);
            scene.add(mesh); networkPlayers.set(id, mesh);
        });
        window.updatePlayerList();

        Object.keys(data.blocks).forEach(key => { world.serverBlocks.set(key, data.blocks[key]); });
        Object.values(data.drops).forEach(d => { world.spawnNetworkedDrop(d.id, d.x, d.y, d.z, d.type); });
        aiController.syncFromServer(data.mobs);

        world.updateChunks(new THREE.Vector3(16, 0, 16)); initialChunksNeeded = world.chunkQueue.length; initialChunksDone = 0; isGeneratingWorld = true;
    });

    window.socket.on('server_tick', (data) => {
        Object.keys(data.players).forEach(id => {
            if (id === window.socket.id || !networkPlayers.has(id)) return;
            const p = networkPlayers.get(id); const s = data.players[id];
            p.userData.targetPos.set(s.x, s.y, s.z); p.userData.targetRy = s.ry; p.userData.targetRx = s.rx;
            updateNetworkPlayerItem(p, s.heldItem);
            if (s.isAttacking && p.userData.attackTimer <= 0) p.userData.attackTimer = 0.25;
            const hpMesh = p.getObjectByName('healthBar'); if(hpMesh) { hpMesh.scale.x = Math.max(0.01, s.health / 100); hpMesh.material.color.setHex(s.health > 50 ? 0x00ff00 : 0xff0000); }
        });
        aiController.syncFromServer(data.mobs);
    });

    window.socket.on('newPlayer', (data) => {
        window.showChat(`🌍 ${data.player.name || "Guest"} joined the world!`);
        const mesh = createNetworkPlayer(data.player.name || "Guest");
        mesh.position.set(data.player.x, data.player.y, data.player.z);
        mesh.userData.targetPos.copy(mesh.position); scene.add(mesh); networkPlayers.set(data.id, mesh); window.updatePlayerList();
    });

    window.socket.on('pickupSuccess', (type) => { player.pickupItem(type); });
    window.socket.on('item_spawned', (data) => { world.spawnNetworkedDrop(data.id, data.x, data.y, data.z, data.type); });
    window.socket.on('item_removed', (dropId) => { world.removeNetworkedDrop(dropId); });
    
    window.socket.on('playerDamaged', (data) => { 
        if (data.id === window.socket.id) { player.takeDamage(data.dmg, data.source); AudioSys.hurt(); player.shakeIntensity = 0.6; }
        else if (networkPlayers.has(data.id)) {
            const p = networkPlayers.get(data.id);
            p.traverse(child => { if(child.material) { if(Array.isArray(child.material)) child.material.forEach(m => { if(m.emissive) m.emissive.setHex(0xff0000); }); else if(child.material.emissive) child.material.emissive.setHex(0xff0000); } });
            setTimeout(() => { if(p) p.traverse(child => { if(child.material) { if(Array.isArray(child.material)) child.material.forEach(m => { if(m.emissive) m.emissive.setHex(0x000000); }); else if(child.material.emissive) child.material.emissive.setHex(0x000000); } }); }, 200);
        }
    });
    
    window.socket.on('mobShoot', (data) => { aiController.shootProjectile(new THREE.Vector3(data.from.x, data.from.y, data.from.z), new THREE.Vector3(data.to.x, data.to.y, data.to.z), data.type === 'archer' ? 'bow' : 'gun'); });
    window.socket.on('mobDamaged', (data) => { aiController.damageMobLocal(data.id, data.kbDir); });
    
    window.socket.on('mobKilled', (data) => { 
        aiController.killMobLocal(data.mobId); 
        window.showChat(`⚔️ ${data.killerName} slaughtered a ${data.mobType}!`); 
    });

    window.socket.on('playerDisconnected', (id) => {
        if(networkPlayers.has(id)) { window.showChat(`👋 ${networkPlayers.get(id).userData.playerName} left.`); scene.remove(networkPlayers.get(id)); networkPlayers.delete(id); window.updatePlayerList(); }
    });

    window.socket.on('hostLeft', () => { alert("The Host has left the world."); location.reload(); });
    window.socket.on('blockUpdate', (data) => { if(data.action === 'add') { world.serverBlocks.set(`${data.x},${data.y},${data.z}`, data.type); world.addBlock(data.x, data.y, data.z, data.type, null, true); } else { world.serverBlocks.set(`${data.x},${data.y},${data.z}`, 'air'); world.removeBlock(data.x, data.y, data.z, false, true); } });
} else { console.warn("Socket.io not found! Multiplayer is disabled."); }

document.getElementById('btn-multiplayer').addEventListener('click', () => { document.getElementById('lobby-browser').style.display = 'block'; });
const closeLobbyBtn = document.getElementById('close-lobby');
if(closeLobbyBtn) closeLobbyBtn.addEventListener('click', () => { document.getElementById('lobby-browser').style.display = 'none'; });

document.getElementById('btn-play-menu').addEventListener('click', () => {
    localPlayerName = document.getElementById('playerName').value.trim() || "Guest";
    if (window.socket) window.socket.emit('createGame', localPlayerName);
    AudioSys.init(); document.getElementById('main-menu').style.display = 'none'; document.getElementById('loading-screen').style.display = 'flex';
    if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    player.gameActive = true; 
});

document.addEventListener('keydown', (e) => { if (e.key === 'Tab') { e.preventDefault(); if(playerListUI) playerListUI.style.display = 'block'; }});
document.addEventListener('keyup', (e) => { if (e.key === 'Tab') { if(playerListUI) playerListUI.style.display = 'none'; }});
const mobileTabBtn = document.getElementById('mobileTabBtn');
if (mobileTabBtn) { if (isMobile) mobileTabBtn.style.display = 'flex'; mobileTabBtn.addEventListener('touchstart', (e) => { e.preventDefault(); playerListUI.style.display = (playerListUI.style.display === 'none' || playerListUI.style.display === '') ? 'block' : 'none'; }); }

const starLayers = [];
for (let layer = 0; layer < (isMobile ? 1 : 3); layer++) {
    const starGeo = new THREE.BufferGeometry(); const starVertices = [];
    for(let i=0; i<150; i++) starVertices.push((Math.random()-0.5)*400, (Math.random()-0.5)*400, (Math.random()-0.5)*400);
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({color: 0xffffff, size: 1.0, transparent: true, fog: false}));
    scene.add(stars); starLayers.push(stars);
}
const texMoon = Textures.generate('moon'); const moon = new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), new THREE.MeshBasicMaterial({map: texMoon, fog: false, transparent: true})); scene.add(moon);
const texSun = Textures.generate('sun'); const sunMesh = new THREE.Mesh(new THREE.BoxGeometry(14, 14, 14), new THREE.MeshBasicMaterial({map: texSun, fog: false, transparent: true}));
const texHalo = Textures.generate('sun_halo'); const sunHalo = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.MeshBasicMaterial({map: texHalo, transparent: true, fog: false, blending: THREE.AdditiveBlending, depthWrite: false}));
sunHalo.position.z = -8; sunMesh.add(sunHalo); scene.add(sunMesh);

const cloudGroup = new THREE.Group(); const cloudMat = new THREE.MeshLambertMaterial({color: 0xffffff, transparent: true, opacity: 0.9});
for(let i=0; i<(isMobile ? 8 : 20); i++) {
    const cluster = new THREE.Group();
    for(let p=0; p< 2 + Math.floor(Math.random() * 3); p++) {
        const puff = new THREE.Mesh(new THREE.BoxGeometry(15 + Math.random() * 20, 6, 15 + Math.random() * 20), cloudMat);
        puff.position.set((Math.random()-0.5)*25, (Math.random()-0.5)*4, (Math.random()-0.5)*25); cluster.add(puff);
    }
    cluster.position.set((Math.random()-0.5)*250, 40 + Math.random()*10, (Math.random()-0.5)*250); cloudGroup.add(cluster);
}
scene.add(cloudGroup);

const previewCanvas = document.getElementById('preview-canvas'); const previewRenderer = new THREE.WebGLRenderer({ canvas: previewCanvas, alpha: true, antialias: true }); previewRenderer.setSize(120, 200, false); previewRenderer.setClearColor(0x000000, 0); 
const previewScene = new THREE.Scene(); const previewCamera = new THREE.PerspectiveCamera(50, 120/200, 0.1, 100); previewCamera.position.set(0, -0.25, 4.0); 
previewScene.add(new THREE.AmbientLight(0xffffff, 1.2)); const previewDirLight = new THREE.DirectionalLight(0xffffff, 1.5); previewDirLight.position.set(5, 10, 7); previewScene.add(previewDirLight);

const previewPlayer = new THREE.Group();
const matSkin = new THREE.MeshLambertMaterial({color: 0xe0ac69}); const matShirt = new THREE.MeshLambertMaterial({color: 0x3333aa}); const matPants = new THREE.MeshLambertMaterial({color: 0x222255});
const headMaterials = [matSkin, matSkin, matSkin, matSkin, matSkin, new THREE.MeshLambertMaterial({ map: Textures.generate('archer_face') })]; 
const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), headMaterials); head.position.set(0, 0, 0); const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.75, 0.25), matShirt); body.position.set(0, -0.625, 0); const armL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), matSkin); armL.position.set(-0.425, -0.625, 0); const armR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), matSkin); armR.position.set(0.425, -0.625, 0); const legL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.5, 0.25), matPants); legL.position.set(-0.15, -1.25, 0); const legR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.5, 0.25), matPants); legR.position.set(0.15, -1.25, 0);
const previewHeldBlock = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), new THREE.MeshLambertMaterial({color: 0xffffff})); armR.add(previewHeldBlock); previewPlayer.add(head, body, armL, armR, legL, legR); previewScene.add(previewPlayer);

let isGeneratingWorld = false; let initialChunksNeeded = 0; let initialChunksDone = 0;

const pauseMenu = document.getElementById('pause-menu');
document.addEventListener('click', (e) => { if (e.target.tagName === 'CANVAS' && player.gameActive && !player.isInvOpen && pauseMenu.style.display !== 'flex' && !isMobile) player.controls.lock(); });
player.controls.addEventListener('unlock', () => { if (player.gameActive && !player.isInvOpen && !isMobile) pauseMenu.style.display = 'flex'; });
player.controls.addEventListener('lock', () => { pauseMenu.style.display = 'none'; player.gameActive = true; });
document.getElementById('btn-resume').addEventListener('click', () => { pauseMenu.style.display = 'none'; player.gameActive = true; if (!isMobile) player.controls.lock(); });

window.addEventListener('resize', () => { 
    const aspect = window.innerWidth / window.innerHeight; camera.aspect = aspect; camera.updateProjectionMatrix(); 
    player.tpsCameraBack.aspect = aspect; player.tpsCameraBack.updateProjectionMatrix(); player.tpsCameraFront.aspect = aspect; player.tpsCameraFront.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); 
});

const clock = new THREE.Clock(); let chunkTimer = 0; let dayTime = 0.25; let currentShadowFactor = 1.0; let currentCaveFactor = 1.0; 
const daySky = new THREE.Color(0x60a5fa); const sunsetSky = new THREE.Color(0xf59e0b); const nightSky = new THREE.Color(0x0f172a); const caveColor = new THREE.Color(0x020617); const dayCloud = new THREE.Color(0xffffff); const sunsetCloud = new THREE.Color(0xfcb045); const nightCloud = new THREE.Color(0x1e293b); const currentSkyColor = new THREE.Color(); const currentCloudColor = new THREE.Color();

function animate() {
    requestAnimationFrame(animate);

    if (isGeneratingWorld) {
        let startTime = performance.now();
        while (world.chunkQueue.length > 0 && performance.now() - startTime < 16) { world.processChunkQueue(); initialChunksDone++; }
        document.getElementById('loading-progress').style.width = `${(initialChunksDone / initialChunksNeeded) * 100}%`;
        if (world.chunkQueue.length === 0) {
            isGeneratingWorld = false; let spawnY = world.getSurfaceHeight(16, 16) + 2;
            player.camera.position.set(16, spawnY, 16); player.velocity.set(0,0,0);
            document.getElementById('loading-screen').style.display = 'none'; document.getElementById('hud-layer').style.display = 'block';
            player.gameActive = true; if (!isMobile) player.controls.lock();
        }
        renderer.render(scene, camera); return; 
    }

    if (!player.gameActive) return;
    world.processChunkQueue();
    const delta = Math.min(clock.getDelta(), 0.1); 
    dayTime = ((Date.now() - localRoomStartTime) / 1000 / 240.0) % 1; world.sunArc = Math.sin(dayTime * Math.PI * 2); let angle = dayTime * Math.PI * 2;
    document.getElementById('time-indicator').style.left = `${dayTime * 100}%`; document.getElementById('time-indicator').innerText = (dayTime > 0.5 && dayTime < 1.0) ? '🌙' : '☀️';

    let hasRoof = false; let roofType = 'air';
    const bx = Math.round(player.camera.position.x); const bz = Math.round(player.camera.position.z); const by = Math.round(player.camera.position.y + 1.0); 
    for (let y = by; y <= by + 50; y++) { const type = world.getBlockType(bx, y, bz); if (type !== 'air' && type !== 'water' && type !== 'torch') { hasRoof = true; roofType = type; break; } }
    let targetShadowFactor = hasRoof ? (roofType === 'leaves' || roofType.includes('wood') ? 0.4 : 0.0) : 1.0; let targetCaveFactor = hasRoof && !roofType.includes('wood') && roofType !== 'leaves' ? 0.0 : 1.0;
    currentShadowFactor += (targetShadowFactor - currentShadowFactor) * delta * 3.0; currentCaveFactor += (targetCaveFactor - currentCaveFactor) * delta * 3.0;

    const px = player.camera.position.x; const pz = player.camera.position.z;
    sunMesh.position.set(px + Math.cos(angle) * 250, Math.sin(angle) * 250, pz + Math.sin(angle) * 80); sunMesh.lookAt(player.camera.position); dirLight.position.copy(sunMesh.position);
    moon.position.set(px + Math.cos(angle + Math.PI) * 250, Math.sin(angle + Math.PI) * 250, pz + Math.sin(angle + Math.PI) * 80); moon.lookAt(player.camera.position); 
    dirLight.intensity = Math.max(0, world.sunArc) * 1.5 * currentShadowFactor; hemiLight.intensity = Math.max(0.1, world.sunArc) * 0.6 * currentCaveFactor; 

    if (world.sunArc > 0.2) { currentSkyColor.copy(daySky); currentCloudColor.copy(dayCloud); }
    else if (world.sunArc > 0) { currentSkyColor.lerpColors(sunsetSky, daySky, world.sunArc / 0.2); currentCloudColor.lerpColors(sunsetCloud, dayCloud, world.sunArc / 0.2); }
    else { currentSkyColor.lerpColors(nightSky, sunsetSky, Math.max(0, (world.sunArc + 0.2) / 0.2)); currentCloudColor.lerpColors(nightCloud, sunsetCloud, Math.max(0, (world.sunArc + 0.2) / 0.2)); }
    
    currentSkyColor.lerp(caveColor, 1.0 - currentCaveFactor); scene.background = currentSkyColor; scene.fog.color = currentSkyColor; scene.fog.near = 2 + (13 * currentCaveFactor); scene.fog.far = 15 + (45 * currentCaveFactor); 
    sunMesh.material.opacity = currentCaveFactor; sunHalo.material.opacity = currentCaveFactor; moon.material.opacity = currentCaveFactor;

    let baseStarOpacity = world.sunArc < 0 ? Math.min(1.0, Math.abs(world.sunArc)) : 0;
    starLayers.forEach((layer, i) => { layer.rotation.y += delta * 0.01; layer.position.set(px, 0, pz); layer.material.opacity = baseStarOpacity * (0.5 + 0.5 * Math.sin(performance.now() * 0.002 + (i * 2))) * currentCaveFactor; });
    cloudGroup.children.forEach(c => { c.position.x += delta * 3; if (c.position.x > 125) c.position.x = -125; c.children.forEach(p => { p.material.color.copy(currentCloudColor); p.material.opacity = 0.9 * currentCaveFactor; }); }); cloudGroup.position.set(px, 0, pz); 

    const selectedItem = player.inventory[player.selectedSlot]; handLight.intensity = (selectedItem && selectedItem.type === 'torch' && selectedItem.count > 0) ? 10 + (Math.random() * 2) : 0;
    if (handLight.intensity > 0) handLight.position.copy(player.camera.position);

    player.update(delta); aiController.update(delta); world.updateDrops(delta); world.updateLights();

    networkPlayers.forEach(p => {
        p.position.lerp(p.userData.targetPos, 15 * delta); 
        p.rotation.y = THREE.MathUtils.lerp(p.rotation.y, p.userData.targetRy, 15 * delta);
        p.userData.head.rotation.x = THREE.MathUtils.lerp(p.userData.head.rotation.x, p.userData.targetRx, 15 * delta);

        if (p.position.distanceTo(p.userData.targetPos) > 0.02) {
            p.userData.swingTime += 0.5; let swing = Math.sin(p.userData.swingTime) * 0.5; p.userData.legL.rotation.x = swing; p.userData.legR.rotation.x = -swing; if(p.userData.attackTimer <= 0) { p.userData.armL.rotation.x = -swing; p.userData.armR.rotation.x = swing; }
        } else {
            p.userData.legL.rotation.x = THREE.MathUtils.lerp(p.userData.legL.rotation.x, 0, 10 * delta); p.userData.legR.rotation.x = THREE.MathUtils.lerp(p.userData.legR.rotation.x, 0, 10 * delta); if(p.userData.attackTimer <= 0) { p.userData.armL.rotation.x = THREE.MathUtils.lerp(p.userData.armL.rotation.x, 0, 10 * delta); p.userData.armR.rotation.x = THREE.MathUtils.lerp(p.userData.armR.rotation.x, 0, 10 * delta); }
        }
        if(p.userData.attackTimer > 0) { p.userData.attackTimer -= delta; p.userData.armR.rotation.x = Math.sin((1.0 - (p.userData.attackTimer / 0.25)) * Math.PI) * 1.5; }
    });
    
    chunkTimer += delta; if (chunkTimer > 0.5) { world.updateChunks(player.camera.position); chunkTimer = 0; }
    renderer.render(scene, player.getActiveCamera());

    if (document.getElementById('inventory-screen').classList.contains('active')) {
        previewPlayer.rotation.y = Math.PI + Math.sin(performance.now() * 0.001) * 0.3; if (previewHeldBlock.geometry) previewHeldBlock.geometry.dispose();
        if (selectedItem !== null && selectedItem.count > 0) {
            previewHeldBlock.visible = true; let mat = world.itemMaterials[selectedItem.type] || world.itemMaterials['stone'];
            if (['stick', 'bow', 'crossbow', 'gun', 'wooden_sword', 'stone_sword', 'wooden_pickaxe', 'stone_pickaxe', 'wooden_axe', 'stone_axe', 'wooden_shovel', 'stone_shovel'].includes(selectedItem.type)) { previewHeldBlock.material = mat; previewHeldBlock.geometry = new THREE.PlaneGeometry(1.0, 1.0); previewHeldBlock.geometry.translate(0.5, 0.5, 0); previewHeldBlock.position.set(0, -0.375, -0.15); previewHeldBlock.rotation.set(0, Math.PI / 2, 0); } else if (selectedItem.type === 'torch') { previewHeldBlock.material = mat; previewHeldBlock.geometry = new THREE.BoxGeometry(0.08, 0.5, 0.08); previewHeldBlock.geometry.translate(0, 0.25, 0); previewHeldBlock.position.set(0, -0.375, -0.15); previewHeldBlock.rotation.set(Math.PI / 8, 0, 0); } else { previewHeldBlock.material = mat; previewHeldBlock.geometry = new THREE.BoxGeometry(0.25, 0.25, 0.25); previewHeldBlock.position.set(0, -0.25, -0.15); previewHeldBlock.rotation.set(Math.PI/8, Math.PI / 4, 0); }
        } else { previewHeldBlock.visible = false; }
        previewRenderer.render(previewScene, previewCamera);
    }
}
animate();