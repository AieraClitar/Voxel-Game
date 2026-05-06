import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { Textures } from '../utils/Textures.js';
import { AudioSys } from '../utils/AudioSys.js';
import { create3DWeapon } from '../ai/AIController.js'; 

export class Player {
    constructor(camera, domElement, world) {
        this.camera = camera; this.world = world; this.world.scene.add(this.camera); this.camera.near = 0.01; this.camera.updateProjectionMatrix();
        this.controls = new PointerLockControls(camera, domElement); this.isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent); this.gameActive = false;

        this.cameraMode = 0; 
        this.tpsCameraBack = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); this.tpsCameraBack.position.set(0, 0.5, 4); this.camera.add(this.tpsCameraBack);
        this.tpsCameraFront = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000); this.tpsCameraFront.position.set(0, 0.5, -4); this.tpsCameraFront.rotation.y = Math.PI; this.camera.add(this.tpsCameraFront);

        this.velocity = new THREE.Vector3(); this.speed = 4.5; this.jumpForce = 8.5; this.gravity = 25.0; this.canJump = false;
        this.moveForward = false; this.moveBackward = false; this.moveLeft = false; this.moveRight = false; this.joyMove = new THREE.Vector2(0, 0);
        this._input = new THREE.Vector3(); this._euler = new THREE.Euler(0, 0, 0, 'YXZ'); this._direction = new THREE.Vector3(); this._kbDir = new THREE.Vector3();

        this.health = 100; this.maxHealth = 100; this.aiController = null; this.shakeIntensity = 0; this.footstepTimer = 0;
        this.lastNetUpdate = 0;

        this.inventory = [{ type: 'torch', count: 10 }, { type: null, count: 0 }, { type: null, count: 0 }, { type: null, count: 0 }, { type: null, count: 0 }, { type: null, count: 0 }];
        this.mainInventory = Array.from({length: 16}, () => ({type: null, count: 0}));
        this.craftingGrid = Array.from({length: 9}, () => ({type: null, count: 0}));
        this.craftingResult = { type: null, count: 0 }; this.isCraftingTableOpen = false;
        
        this.draggedItem = { type: null, count: 0 }; this.isDistributing = false; this.distributedSlots = new Set();
        this.selectedSlot = 0; this.isInvOpen = false; this.attackAnimTimer = 0; this.lastWheelTime = 0; this.tooltipTimeout = null;

        const iconRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); iconRenderer.setSize(128, 128); 
        const iconScene = new THREE.Scene(); const iconCam = new THREE.PerspectiveCamera(45, 1, 0.1, 100); iconCam.position.set(0, 0, 2.5); iconCam.lookAt(0, 0, 0);
        iconScene.add(new THREE.AmbientLight(0xffffff, 1.0)); const dirLight = new THREE.DirectionalLight(0xffffff, 1.0); dirLight.position.set(5, 10, 5); iconScene.add(dirLight);

        this.uiIcons = {};
        const isTool = (t) => ['stick', 'bow', 'crossbow', 'gun', 'wooden_sword', 'stone_sword', 'wooden_pickaxe', 'stone_pickaxe', 'wooden_axe', 'stone_axe', 'wooden_shovel', 'stone_shovel'].includes(t);

        for (const typeStr in this.world.itemMaterials) {
            const mat = this.world.itemMaterials[typeStr]; let geo, mesh;
            if (isTool(typeStr)) { geo = new THREE.PlaneGeometry(1.5, 1.5); mesh = new THREE.Mesh(geo, mat); } 
            else if (typeStr === 'torch') { geo = new THREE.BoxGeometry(0.2, 0.8, 0.2); mesh = new THREE.Mesh(geo, mat); mesh.rotation.set(Math.PI/6, Math.PI/4, 0); } 
            else { geo = new THREE.BoxGeometry(1, 1, 1); mesh = new THREE.Mesh(geo, Array.isArray(mat) ? mat : [mat,mat,mat,mat,mat,mat]); mesh.rotation.set(Math.PI/6, Math.PI/4, 0); }
            iconScene.add(mesh); iconRenderer.render(iconScene, iconCam); 
            const img = document.createElement('img'); img.src = iconRenderer.domElement.toDataURL(); 
            img.style.position = 'absolute'; img.style.top = '0'; img.style.left = '0'; img.style.width = '100%'; img.style.height = '100%'; img.style.objectFit = 'contain'; img.style.pointerEvents = 'none'; 
            this.uiIcons[typeStr] = img; iconScene.remove(mesh); geo.dispose();
        }
        iconRenderer.dispose();

        this.isMining = false; this.miningTimer = 0; this.miningDurability = 1.0; this.targetBlockPos = null; 
        this.miningIndicator = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.02, 1.02), new THREE.MeshBasicMaterial({color: 0x000000, wireframe: true, transparent: true, opacity: 0}));
        this.world.scene.add(this.miningIndicator);

        this.armGroup = new THREE.Group();
        const matSkin = new THREE.MeshLambertMaterial({ color: 0xe0ac69 }); 
        this.arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.6, 0.2), matSkin); this.arm.position.set(0.35, -0.3, -0.4); this.arm.rotation.x = -Math.PI / 4; this.armGroup.add(this.arm);
        
        this.camera.add(this.armGroup); 
        this.muzzleFlash = new THREE.PointLight(0xffffaa, 0, 10); this.muzzleFlash.position.set(0, 0.3, -0.4); this.arm.add(this.muzzleFlash);

        this.bodyGroup = new THREE.Group(); this.world.scene.add(this.bodyGroup);
        const matPants = new THREE.MeshLambertMaterial({color: 0x222255}); const faceMat = new THREE.MeshLambertMaterial({ map: Textures.generate('archer_face') });
        const headMaterials = [matSkin, matSkin, matSkin, matSkin, matSkin, faceMat]; 
        
        this.head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), headMaterials); this.head.position.set(0, 1.75, 0); 
        this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.75, 0.25), new THREE.MeshLambertMaterial({color: 0x3333aa})); this.torso.position.set(0, 1.125, 0); 
        this.armL = new THREE.Group(); this.armL.position.set(-0.425, 1.5, 0); const armLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), matSkin); armLMesh.position.y = -0.375; this.armL.add(armLMesh);
        this.armR_3rd = new THREE.Group(); this.armR_3rd.position.set(0.425, 1.5, 0); const armRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), matSkin); armRMesh.position.y = -0.375; this.armR_3rd.add(armRMesh);
        
        this.legL = new THREE.Group(); this.legL.position.set(-0.15, 0.75, 0); const legLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), matPants); legLMesh.position.y = -0.375; this.legL.add(legLMesh);
        this.legR = new THREE.Group(); this.legR.position.set(0.15, 0.75, 0); const legRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), matPants); legRMesh.position.y = -0.375; this.legR.add(legRMesh);

        this.bodyGroup.add(this.head, this.torso, this.armL, this.armR_3rd, this.legL, this.legR);
        this.legSwingTimer = 0; this.raycaster = new THREE.Raycaster(); this.initControls(); this.updateInventoryUI(); 
        
        document.addEventListener('mousemove', (e) => {
            const dragEl = document.getElementById('dragged-item');
            if (dragEl && dragEl.style.display === 'block') { dragEl.style.left = e.pageX + 'px'; dragEl.style.top = e.pageY + 'px'; }
            if (this.isDistributing && this.draggedItem.type) { const els = document.elementsFromPoint(e.clientX, e.clientY); for (let el of els) { if (el.classList.contains('inv-item') && el.dataset.type === 'crafting') { this.distributeItemToSlot(parseInt(el.dataset.index)); break; } } }
        });
        document.addEventListener('mousedown', (e) => { if (e.target.id === 'close-inv') return; if (this.draggedItem.type) { this.isDistributing = true; this.distributedSlots.clear(); } });
        document.addEventListener('mouseup', () => { this.isDistributing = false; });
    }

    getStackLimit(type) {
        if (!type) return 0;
        if (['wooden_sword', 'stone_sword', 'wooden_pickaxe', 'stone_pickaxe', 'wooden_axe', 'stone_axe', 'wooden_shovel', 'stone_shovel', 'bow', 'crossbow', 'gun'].includes(type)) return 1;
        if (type === 'torch') return 32; return 64; 
    }

    getActiveCamera() { if (this.cameraMode === 1) return this.tpsCameraBack; if (this.cameraMode === 2) return this.tpsCameraFront; return this.camera; }

    dropSelectedItem() {
        if (!this.gameActive || this.isInvOpen) return;
        const item = this.inventory[this.selectedSlot];
        if (item && item.count > 0) {
            const dropDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion); const dropPos = this.camera.position.clone().add(dropDir.multiplyScalar(1.5)); 
            if(window.socket) window.socket.emit('requestDropItem', { x: dropPos.x, y: dropPos.y, z: dropPos.z, type: item.type }); 
            item.count--; if (item.count <= 0) item.type = null;
            this.updateInventoryUI(); if (AudioSys && AudioSys.playNoise) AudioSys.playNoise(0.1, 0.1, 400); 
        }
    }

    takeDamage(amount, source) {
        this.health -= amount; if (this.health < 0) this.health = 0;
        const healthBar = document.getElementById('health-bar'); if(healthBar) healthBar.style.width = `${(this.health / this.maxHealth) * 100}%`;
        const flash = document.createElement('div'); flash.style.position = 'absolute'; flash.style.top = '0'; flash.style.left = '0'; flash.style.width = '100%'; flash.style.height = '100%'; flash.style.backgroundColor = 'rgba(255, 0, 0, 0.4)'; flash.style.pointerEvents = 'none'; flash.style.zIndex = '9999'; flash.style.transition = 'opacity 0.2s';
        document.body.appendChild(flash); setTimeout(() => { flash.style.opacity = '0'; setTimeout(()=>flash.remove(), 200); }, 50);
        if (this.health <= 0) {
            this.health = this.maxHealth; if(healthBar) healthBar.style.width = `100%`;
            const rx = 16 + (Math.random() * 10 - 5); const rz = 16 + (Math.random() * 10 - 5);
            this.camera.position.set(rx, this.world.getSurfaceHeight(rx, rz) + 4, rz); this.velocity.set(0,0,0);
            if (window.socket) window.socket.emit('playerRespawn'); 
        }
    }

    initControls() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'F5') { e.preventDefault(); this.cameraMode = (this.cameraMode + 1) % 3; return; }
            if (e.code === 'KeyQ') { e.preventDefault(); this.dropSelectedItem(); return; } 
            switch(e.code){ case 'KeyW': this.moveForward = true; break; case 'KeyA': this.moveLeft = true; break; case 'KeyS': this.moveBackward = true; break; case 'KeyD': this.moveRight = true; break; case 'Space': if(this.canJump){ this.velocity.y = this.jumpForce; this.canJump = false; } break; case 'KeyE': this.toggleInventory(); break; case 'Digit1': this.setHotbarSlot(0); break; case 'Digit2': this.setHotbarSlot(1); break; case 'Digit3': this.setHotbarSlot(2); break; case 'Digit4': this.setHotbarSlot(3); break; case 'Digit5': this.setHotbarSlot(4); break; }
        });
        document.addEventListener('keyup', (e) => { switch(e.code){ case 'KeyW': this.moveForward = false; break; case 'KeyA': this.moveLeft = false; break; case 'KeyS': this.moveBackward = false; break; case 'KeyD': this.moveRight = false; break; } });
        document.addEventListener('mousedown', (e) => { if(this.controls.isLocked) this.onInteract(e.button); });
        document.addEventListener('mouseup', (e) => { if(e.button === 0) this.stopMining(); });
        document.addEventListener('wheel', (e) => { if (this.controls.isLocked) { const now = performance.now(); if (now - this.lastWheelTime < 100) return; this.lastWheelTime = now; let n = this.selectedSlot + Math.sign(e.deltaY); if(n>4)n=0; if(n<0)n=4; this.setHotbarSlot(n); } });

        const closeBtn = document.getElementById('close-inv'); if (closeBtn) { closeBtn.onclick = (e) => { e.stopPropagation(); this.toggleInventory(); }; closeBtn.ontouchstart = (e) => { e.preventDefault(); e.stopPropagation(); this.toggleInventory(); }; }

        const joyZone = document.getElementById('m-joystick-zone'); const joyKnob = document.getElementById('m-joystick-knob'); let joyTouchId = null;
        if (joyZone) {
            joyZone.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); for (let touch of e.changedTouches) { if (joyTouchId === null) { joyTouchId = touch.identifier; this.updateJoystick(touch, joyZone, joyKnob); } } }, {passive: false});
            joyZone.addEventListener('touchmove', (e) => { e.preventDefault(); e.stopPropagation(); for (let touch of e.touches) { if (touch.identifier === joyTouchId) this.updateJoystick(touch, joyZone, joyKnob); } }, {passive: false});
            const endJoy = (e) => { for (let touch of e.changedTouches) { if (touch.identifier === joyTouchId) { joyTouchId = null; this.joyMove.set(0,0); joyKnob.style.transform = `translate(-50%, -50%)`; } } };
            joyZone.addEventListener('touchend', endJoy); joyZone.addEventListener('touchcancel', endJoy);
        }

        const bindTouch = (id, startCb) => { const el = document.getElementById(id); if(el) el.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); startCb(); }, {passive: false}); };
        bindTouch('m-jump', () => { if(this.canJump){ this.velocity.y = this.jumpForce; this.canJump = false; } }); bindTouch('m-inv', () => this.toggleInventory()); bindTouch('m-place', () => { if(this.gameActive) this.onInteract(2); }); bindTouch('m-drop', () => { this.dropSelectedItem(); }); 

        const lookZone = document.getElementById('m-look-zone'); let lookTouchId = null; let lastTouchX = 0; let lastTouchY = 0; let touchStartTime = 0; let isSwiping = false;
        if (lookZone) {
            lookZone.addEventListener('touchstart', (e) => { if (e.target !== lookZone) return; e.preventDefault(); for (let touch of e.changedTouches) { if (lookTouchId === null) { lookTouchId = touch.identifier; lastTouchX = touch.pageX; lastTouchY = touch.pageY; touchStartTime = performance.now(); isSwiping = false; this.miningTimeout = setTimeout(() => { if (!isSwiping && this.gameActive) this.onInteract(0); }, 250); } } }, {passive: false});
            lookZone.addEventListener('touchmove', (e) => { if (e.target !== lookZone) return; e.preventDefault(); for (let touch of e.touches) { if (touch.identifier === lookTouchId) { let dx = touch.pageX - lastTouchX; let dy = touch.pageY - lastTouchY; if (Math.abs(dx) > 5 || Math.abs(dy) > 5) { isSwiping = true; clearTimeout(this.miningTimeout); this.stopMining(); } if (this.gameActive && !this.isInvOpen) { this._euler.setFromQuaternion(this.camera.quaternion); this._euler.y -= dx * 0.005; this._euler.x -= dy * 0.005; this._euler.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this._euler.x)); this.camera.quaternion.setFromEuler(this._euler); } lastTouchX = touch.pageX; lastTouchY = touch.pageY; } } }, {passive: false});
            const endLook = (e) => { for (let touch of e.changedTouches) { if (touch.identifier === lookTouchId) { clearTimeout(this.miningTimeout); if (!isSwiping && performance.now() - touchStartTime < 250 && this.gameActive) { this.onInteract(0); setTimeout(() => this.stopMining(), 100); } this.stopMining(); lookTouchId = null; } } };
            lookZone.addEventListener('touchend', endLook); lookZone.addEventListener('touchcancel', endLook);
        }
        document.addEventListener('touchmove', (e) => { const dragEl = document.getElementById('dragged-item'); if (dragEl && dragEl.style.display === 'block' && e.touches.length > 0) { const touch = e.touches[0]; dragEl.style.left = touch.pageX + 'px'; dragEl.style.top = touch.pageY + 'px'; if (this.isDistributing && this.draggedItem.type) { const el = document.elementFromPoint(touch.clientX, touch.clientY); if (el && el.classList.contains('inv-item') && el.dataset.type === 'crafting') { this.distributeItemToSlot(parseInt(el.dataset.index)); } } } }, {passive: false}); 
    }

    updateJoystick(touch, rectZone, knob) {
        const rect = rectZone.getBoundingClientRect(); const cx = rect.left + rect.width / 2; const cy = rect.top + rect.height / 2; let dx = touch.pageX - cx; let dy = touch.pageY - cy;
        const maxDist = rect.width / 2; const dist = Math.min(Math.sqrt(dx*dx + dy*dy), maxDist); const angle = Math.atan2(dy, dx);
        let kx = Math.cos(angle) * dist; let ky = Math.sin(angle) * dist;
        knob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`; this.joyMove.set(kx / maxDist, ky / maxDist);
    }

    bindSlotEvents(slotDiv, itemType, index, sourceArrayStr) {
        slotDiv.onmousedown = (e) => { e.preventDefault(); e.stopPropagation(); if (!this.isInvOpen) { if (sourceArrayStr === 'hotbar') this.setHotbarSlot(index); return; } if (e.button === 0) this.handleSlotClick(sourceArrayStr, index); else this.handleSlotRightClick(sourceArrayStr, index); };
        slotDiv.oncontextmenu = (e) => e.preventDefault();
        slotDiv.onmouseenter = (e) => { if (itemType) { const tt = document.getElementById('item-tooltip'); tt.innerText = itemType.replace(/_/g, ' ').toUpperCase(); tt.style.display = 'block'; const rect = slotDiv.getBoundingClientRect(); tt.style.left = rect.left + 'px'; tt.style.top = (rect.top - 30) + 'px'; } if (this.isDistributing && sourceArrayStr === 'crafting') { this.distributeItemToSlot(index); } };
        slotDiv.onmouseleave = () => { document.getElementById('item-tooltip').style.display = 'none'; };

        let touchTimer = null; let startX = 0, startY = 0;
        slotDiv.ontouchstart = (e) => {
            e.preventDefault(); e.stopPropagation(); if (!this.isInvOpen) { if (sourceArrayStr === 'hotbar') this.setHotbarSlot(index); return; }
            const dragEl = document.getElementById('dragged-item'); if (dragEl && e.touches.length > 0) { startX = e.touches[0].pageX; startY = e.touches[0].pageY; dragEl.style.left = startX + 'px'; dragEl.style.top = startY + 'px'; }
            if (this.draggedItem.type) { this.isDistributing = true; this.distributedSlots.clear(); if (sourceArrayStr === 'crafting') this.distributeItemToSlot(index); }
            touchTimer = setTimeout(() => { this.handleSlotRightClick(sourceArrayStr, index); touchTimer = null; }, 400); 
        };
        slotDiv.ontouchmove = (e) => { if (touchTimer && e.touches.length > 0) { if (Math.abs(e.touches[0].pageX - startX) > 10 || Math.abs(e.touches[0].pageY - startY) > 10) { clearTimeout(touchTimer); touchTimer = null; } } };
        slotDiv.ontouchend = (e) => { e.preventDefault(); e.stopPropagation(); this.isDistributing = false; if (!this.isInvOpen) return; if (touchTimer) { clearTimeout(touchTimer); this.handleSlotClick(sourceArrayStr, index); } };
    }

    distributeItemToSlot(index) {
        if (this.distributedSlots.has(index) || this.draggedItem.count <= 0) return;
        const slot = this.craftingGrid[index]; const limit = this.getStackLimit(this.draggedItem.type);
        if (!slot.type || slot.type === this.draggedItem.type) { if (slot.count < limit) { slot.type = this.draggedItem.type; slot.count++; this.draggedItem.count--; this.distributedSlots.add(index); if (this.draggedItem.count <= 0) this.draggedItem = { type: null, count: 0 }; this.checkRecipes(); this.updateInventoryUI(); } }
    }

    checkRecipes() {
        const g = this.craftingGrid.map(s => s.type);
        const matchPattern = (w, h, p) => { for(let y=0; y<=3-h; y++) { for(let x=0; x<=3-w; x++) { let match = true; let pCount = 0; for(let py=0; py<h; py++) { for(let px=0; px<w; px++) { let gItem = g[(y+py)*3 + (x+px)]; let pItem = p[py*w + px]; if (pItem === 'ANY_PLANKS') { if (gItem !== 'oak_planks' && gItem !== 'birch_planks') match = false; pCount++; } else if (pItem !== null) { if (gItem !== pItem) match = false; pCount++; } } } if(match && g.filter(t=>t).length === pCount) return true; } } return false; };

        if (matchPattern(1, 1, ['oak_wood'])) { this.craftingResult = { type: 'oak_planks', count: 4 }; return; }
        if (matchPattern(1, 1, ['birch_wood'])) { this.craftingResult = { type: 'birch_planks', count: 4 }; return; }
        if (matchPattern(2, 2, ['ANY_PLANKS','ANY_PLANKS', 'ANY_PLANKS','ANY_PLANKS'])) { this.craftingResult = { type: 'crafting_table', count: 1 }; return; }
        if (matchPattern(1, 2, ['ANY_PLANKS', 'ANY_PLANKS'])) { this.craftingResult = { type: 'stick', count: 4 }; return; }
        if (matchPattern(1, 2, ['ANY_PLANKS', 'stick'])) { this.craftingResult = { type: 'torch', count: 4 }; return; }
        if (matchPattern(1, 3, ['ANY_PLANKS', 'ANY_PLANKS', 'stick'])) { this.craftingResult = { type: 'wooden_sword', count: 1 }; return; }
        if (matchPattern(1, 3, ['stone', 'stone', 'stick'])) { this.craftingResult = { type: 'stone_sword', count: 1 }; return; }
        if (matchPattern(3, 3, ['ANY_PLANKS','ANY_PLANKS','ANY_PLANKS', null,'stick',null, null,'stick',null])) { this.craftingResult = { type: 'wooden_pickaxe', count: 1 }; return; }
        if (matchPattern(3, 3, ['stone','stone','stone', null,'stick',null, null,'stick',null])) { this.craftingResult = { type: 'stone_pickaxe', count: 1 }; return; }
        if (matchPattern(2, 3, ['ANY_PLANKS','ANY_PLANKS', 'ANY_PLANKS','stick', null,'stick']) || matchPattern(2, 3, ['ANY_PLANKS','ANY_PLANKS', 'stick','ANY_PLANKS', 'stick',null])) { this.craftingResult = { type: 'wooden_axe', count: 1 }; return; }
        if (matchPattern(2, 3, ['stone','stone', 'stone','stick', null,'stick']) || matchPattern(2, 3, ['stone','stone', 'stick','stone', 'stick',null])) { this.craftingResult = { type: 'stone_axe', count: 1 }; return; }
        if (matchPattern(1, 3, ['ANY_PLANKS', 'stick', 'stick'])) { this.craftingResult = { type: 'wooden_shovel', count: 1 }; return; }
        if (matchPattern(1, 3, ['stone', 'stick', 'stick'])) { this.craftingResult = { type: 'stone_shovel', count: 1 }; return; }
        this.craftingResult = { type: null, count: 0 };
    }

    handleSlotClick(slotType, index) {
        let targetArray = slotType === 'hotbar' ? this.inventory : (slotType === 'main' ? this.mainInventory : this.craftingGrid); let targetSlot = targetArray[index];
        if (this.draggedItem.type) {
            if (targetSlot.type === this.draggedItem.type) { 
                let limit = this.getStackLimit(targetSlot.type); let space = limit - targetSlot.count;
                if (space > 0) { let transfer = Math.min(space, this.draggedItem.count); targetSlot.count += transfer; this.draggedItem.count -= transfer; if (this.draggedItem.count <= 0) this.draggedItem = {type: null, count: 0}; }
            } else { let temp = { type: targetSlot.type, count: targetSlot.count }; targetSlot.type = this.draggedItem.type; targetSlot.count = this.draggedItem.count; this.draggedItem = temp; }
        } else { if (targetSlot.type) { this.draggedItem = { type: targetSlot.type, count: targetSlot.count }; targetSlot.type = null; targetSlot.count = 0; } }
        if (slotType === 'crafting') this.checkRecipes(); this.updateInventoryUI();
    }

    handleSlotRightClick(slotType, index) {
        let targetArray = slotType === 'hotbar' ? this.inventory : (slotType === 'main' ? this.mainInventory : this.craftingGrid); let targetSlot = targetArray[index];
        if (this.draggedItem.type) {
            let limit = this.getStackLimit(this.draggedItem.type);
            if (!targetSlot.type) { targetSlot.type = this.draggedItem.type; targetSlot.count = 1; this.draggedItem.count--; if (this.draggedItem.count <= 0) this.draggedItem = { type: null, count: 0 }; } 
            else if (targetSlot.type === this.draggedItem.type && targetSlot.count < limit) { targetSlot.count++; this.draggedItem.count--; if (this.draggedItem.count <= 0) this.draggedItem = { type: null, count: 0 }; }
        } else if (targetSlot.type && targetSlot.count > 0) {
            let takeCount = Math.ceil(targetSlot.count / 2); this.draggedItem = { type: targetSlot.type, count: takeCount }; targetSlot.count -= takeCount;
            if (targetSlot.count <= 0) { targetSlot.type = null; targetSlot.count = 0; }
        }
        if (slotType === 'crafting') this.checkRecipes(); this.updateInventoryUI();
    }

    handleCraftingResultClick() {
        if (!this.craftingResult.type) return; let limit = this.getStackLimit(this.craftingResult.type);
        if (!this.draggedItem.type || this.draggedItem.type === this.craftingResult.type) {
            if (this.draggedItem.count + this.craftingResult.count <= limit) {
                this.draggedItem.type = this.craftingResult.type; this.draggedItem.count += this.craftingResult.count;
                for (let i = 0; i < 9; i++) { if (this.craftingGrid[i].type) { this.craftingGrid[i].count--; if (this.craftingGrid[i].count <= 0) { this.craftingGrid[i].type = null; this.craftingGrid[i].count = 0; } } }
                this.checkRecipes(); this.updateInventoryUI();
            }
        }
    }

    toggleInventory() {
        const invScreen = document.getElementById('inventory-screen');
        if (this.gameActive && !this.isInvOpen) { 
            this.isInvOpen = true; this.controls.unlock(); invScreen.classList.add('active'); this.stopMining(); this.updateInventoryUI(); 
        } else if (this.isInvOpen) {
            this.isInvOpen = false; this.isCraftingTableOpen = false; if (!this.isMobile) this.controls.lock(); invScreen.classList.remove('active');
            if (this.draggedItem.type) { 
                const dropDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion); const dropPos = this.camera.position.clone().add(dropDir.multiplyScalar(1.5));
                for(let c=0; c < this.draggedItem.count; c++) { if(window.socket) window.socket.emit('requestDropItem', { x: dropPos.x, y: dropPos.y, z: dropPos.z, type: this.draggedItem.type }); }
                this.draggedItem = {type: null, count: 0}; 
            }
            for (let i = 0; i < 9; i++) { 
                if (this.craftingGrid[i].type) { 
                    const dropDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion); const dropPos = this.camera.position.clone().add(dropDir.multiplyScalar(1.5));
                    for(let c=0; c < this.craftingGrid[i].count; c++) { if(window.socket) window.socket.emit('requestDropItem', { x: dropPos.x, y: dropPos.y, z: dropPos.z, type: this.craftingGrid[i].type }); }
                    this.craftingGrid[i] = {type: null, count: 0}; 
                } 
            }
            this.checkRecipes(); this.updateInventoryUI();
        }
    }

    pickupItem(type) {
        const limit = this.getStackLimit(type); if (AudioSys && AudioSys.playTone) AudioSys.playTone(600, 'sine', 0.1, 0.1); 
        for (let i = 0; i < 5; i++) { if (this.inventory[i].type === type && this.inventory[i].count < limit) { this.inventory[i].count++; this.updateInventoryUI(); return true; } }
        for (let i = 0; i < 16; i++) { if (this.mainInventory[i].type === type && this.mainInventory[i].count < limit) { this.mainInventory[i].count++; this.updateInventoryUI(); return true; } }
        for (let i = 0; i < 5; i++) { if (this.inventory[i].count === 0) { this.inventory[i].type = type; this.inventory[i].count = 1; this.updateInventoryUI(); return true; } }
        for (let i = 0; i < 16; i++) { if (this.mainInventory[i].count === 0) { this.mainInventory[i].type = type; this.mainInventory[i].count = 1; this.updateInventoryUI(); return true; } }
        return false; 
    }

    updateInventoryUI() {
        const renderSlot = (slotDiv, item, index, sourceStr) => {
            if (!slotDiv) return null; let targetSlot = slotDiv;
            if (slotDiv.parentNode) { targetSlot = slotDiv.cloneNode(false); slotDiv.parentNode.replaceChild(targetSlot, slotDiv); } else { targetSlot.innerHTML = ''; }
            targetSlot.dataset.index = index; targetSlot.dataset.type = sourceStr; this.bindSlotEvents(targetSlot, item.type, index, sourceStr);
            if (item.type !== null && item.count > 0) {
                if (this.uiIcons[item.type]) targetSlot.appendChild(this.uiIcons[item.type].cloneNode());
                const countSpan = document.createElement('span'); countSpan.className = 'item-count'; countSpan.innerText = item.count; targetSlot.appendChild(countSpan);
            } else { item.type = null; item.count = 0; }
            return targetSlot;
        };

        for(let i = 0; i < 5; i++) { const s = renderSlot(document.getElementById(`slot-${i+1}`), this.inventory[i], i, 'hotbar'); if (s && i === this.selectedSlot) s.classList.add('active'); }
        const grid = document.getElementById('inventory-grid'); if (grid) { grid.innerHTML = ''; for(let i=0; i<16; i++) { const slot = document.createElement('div'); slot.className = 'inv-item'; renderSlot(slot, this.mainInventory[i], i, 'main'); grid.appendChild(slot); } }
        const craftGrid = document.getElementById('crafting-grid');
        if (craftGrid) {
            craftGrid.className = this.isCraftingTableOpen ? 'crafting-3x3' : ''; craftGrid.innerHTML = '';
            const titleEl = document.getElementById('inv-title'); if (titleEl) titleEl.innerText = this.isCraftingTableOpen ? "Crafting Table" : "Inventory / Character";
            for(let i=0; i<9; i++) { const slot = document.createElement('div'); slot.className = 'inv-item'; if (!this.isCraftingTableOpen && [2,5,6,7,8].includes(i)) slot.classList.add('hidden-slot'); renderSlot(slot, this.craftingGrid[i], i, 'crafting'); craftGrid.appendChild(slot); }
        }

        const resultSlot = document.getElementById('crafting-result');
        if (resultSlot) {
            let newResult = resultSlot; if (resultSlot.parentNode) { newResult = resultSlot.cloneNode(false); resultSlot.parentNode.replaceChild(newResult, resultSlot); } newResult.innerHTML = '';
            const doCraft = (e) => { if (!this.isInvOpen) return; e.preventDefault(); e.stopPropagation(); this.handleCraftingResultClick(); };
            newResult.onmousedown = doCraft; newResult.ontouchstart = doCraft; newResult.oncontextmenu = (e) => e.preventDefault();
            if (this.craftingResult.type) { if (this.uiIcons[this.craftingResult.type]) newResult.appendChild(this.uiIcons[this.craftingResult.type].cloneNode()); const countSpan = document.createElement('span'); countSpan.className = 'item-count'; countSpan.innerText = this.craftingResult.count; newResult.appendChild(countSpan); }
        }

        const dragEl = document.getElementById('dragged-item');
        if (dragEl) {
            dragEl.innerHTML = '';
            if (this.draggedItem.type !== null && this.draggedItem.count > 0) { dragEl.style.display = 'block'; if (this.uiIcons[this.draggedItem.type]) dragEl.appendChild(this.uiIcons[this.draggedItem.type].cloneNode()); const countSpan = document.createElement('span'); countSpan.className = 'item-count'; countSpan.innerText = this.draggedItem.count; dragEl.appendChild(countSpan); } else { dragEl.style.display = 'none'; }
        }

        const selected = this.inventory[this.selectedSlot]; 
        const isTool = (t) => ['stick', 'bow', 'crossbow', 'gun', 'wooden_sword', 'stone_sword', 'wooden_pickaxe', 'stone_pickaxe', 'wooden_axe', 'stone_axe', 'wooden_shovel', 'stone_shovel'].includes(t);
        
        const clearWeapon = (parent, name) => {
            const obj = parent.getObjectByName(name);
            if (obj) {
                parent.remove(obj);
                obj.traverse(child => {
                    if (child.isMesh) {
                        if (child.geometry) child.geometry.dispose();
                    }
                });
            }
        };

        clearWeapon(this.arm, 'equippedItem1st');
        clearWeapon(this.armR_3rd, 'equippedItem3rd');

        if (selected && selected.type !== null && selected.count > 0) {
            let mat = this.world.itemMaterials[selected.type] || this.world.itemMaterials['stone'];
            let mesh1st, mesh3rd;

            if (isTool(selected.type)) {
                // ✨ FIX: Attach to the palm (Y=0.4), NOT the elbow (Y=-0.3). Tilt forward to counter the arm angle.
                mesh1st = create3DWeapon(selected.type); 
                mesh1st.position.set(0, 0.4, -0.1); 
                mesh1st.rotation.set(Math.PI / 2, 0, 0); 
                
                mesh3rd = create3DWeapon(selected.type); 
                mesh3rd.position.set(0, -0.75, 0); 
                mesh3rd.rotation.set(Math.PI / 2, 0, 0); 
            } else if (selected.type === 'torch') {
                mesh1st = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.05), mat); 
                mesh1st.position.set(0, 0.4, -0.1); 
                mesh1st.rotation.set(Math.PI / 8, 0, 0); 
                
                mesh3rd = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), mat); 
                mesh3rd.position.set(0, -0.75, -0.15); 
                mesh3rd.rotation.set(-Math.PI / 8, 0, 0); 
            } else {
                // ✨ FIX: Attach blocks to the palm (Y=0.4) so they don't clip into your body
                mesh1st = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), mat); 
                mesh1st.position.set(0, 0.4, -0.1); 
                mesh1st.rotation.set(0, Math.PI / 4, 0); 
                
                mesh3rd = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.25), mat); 
                mesh3rd.position.set(0, -0.75, -0.15); 
                mesh3rd.rotation.set(0, Math.PI / 4, 0); 
            }
            mesh1st.name = 'equippedItem1st'; this.arm.add(mesh1st);
            mesh3rd.name = 'equippedItem3rd'; this.armR_3rd.add(mesh3rd);
        }
    }

    showHotbarName() {
        const item = this.inventory[this.selectedSlot];
        if (item && item.type) {
            const tt = document.getElementById('item-tooltip'); tt.innerText = item.type.replace(/_/g, ' ').toUpperCase(); tt.style.display = 'block';
            const activeSlot = document.getElementById(`slot-${this.selectedSlot + 1}`); if(activeSlot) { const rect = activeSlot.getBoundingClientRect(); tt.style.left = rect.left + 'px'; tt.style.top = (rect.top - 30) + 'px'; }
            clearTimeout(this.tooltipTimeout); this.tooltipTimeout = setTimeout(() => { tt.style.display = 'none'; }, 1500);
        }
    }

    setHotbarSlot(index) {
        this.selectedSlot = index;
        for(let i = 1; i <= 5; i++) { const slot = document.getElementById(`slot-${i}`); if(slot) slot.classList.remove('active'); }
        const activeSlot = document.getElementById(`slot-${index + 1}`); if(activeSlot) activeSlot.classList.add('active');
        this.updateInventoryUI(); if(!this.isInvOpen) this.showHotbarName();
    }

    onInteract(buttonIdx) {
        if (!this.gameActive || this.isInvOpen) return;
        let tool = this.inventory[this.selectedSlot].type || '';
        
        if (buttonIdx === 0) {
            this.attackAnimTimer = 0.25;
            if(tool === 'gun') { if(AudioSys && AudioSys.shootGun) AudioSys.shootGun(); this.shakeIntensity = 0.4; this.muzzleFlash.intensity = 15; }
            else if(tool === 'crossbow') { if(AudioSys && AudioSys.shootCrossbow) AudioSys.shootCrossbow(); this.shakeIntensity = 0.3; }
            else if(tool === 'bow') { if(AudioSys && AudioSys.shootBow) AudioSys.shootBow(); this.shakeIntensity = 0.2; }
            else { if(AudioSys && AudioSys.playNoise) AudioSys.playNoise(0.1, 0.05, 500); }
        }

        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        let rayTargets = [];
        for (const chunkGroup of this.world.chunks.values()) rayTargets.push(chunkGroup);
        if (this.aiController) { for (const mob of this.aiController.mobs.values()) rayTargets.push(mob.mesh); }
        const intersects = this.raycaster.intersectObjects(rayTargets, true);

        for (let intersect of intersects) {
            let bx, by, bz;
            if (intersect.object.isInstancedMesh) { const pos = intersect.object.userData.positions[intersect.instanceId]; if (!pos) continue; bx = pos.x; by = pos.y; bz = pos.z; } 
            else if (intersect.object.userData && intersect.object.userData.isMob) {
                if (intersect.distance > 3.0 && tool !== 'gun' && tool !== 'bow' && tool !== 'crossbow') continue; 
                if (buttonIdx === 0) { 
                    let hitMob = intersect.object.userData.mobRef; let dmg = 5; 
                    if (tool.includes('wooden_sword')) dmg = 25; if (tool.includes('stone_sword')) dmg = 40;  
                    if (tool.includes('wooden_axe')) dmg = 20; if (tool.includes('stone_axe')) dmg = 30;    
                    if (tool.includes('pickaxe')) dmg = 15; if (tool.includes('shovel')) dmg = 10;
                    if (tool === 'gun') dmg = 50; if (tool === 'bow') dmg = 25; if (tool === 'crossbow') dmg = 35;       

                    this._kbDir.subVectors(hitMob.mesh.position, this.camera.position).normalize(); this._kbDir.y = 0;
                    if (window.socket) { window.socket.emit('requestMobAttack', { id: hitMob.id, dmg: dmg, kbDir: {x: this._kbDir.x, y: 0, z: this._kbDir.z} }); }
                    this.shakeIntensity = 0.3; 
                }
                return; 
            } else { continue; }

            if (intersect.distance > 6.0) break;
            const type = this.world.getBlockType(bx, by, bz);

            if (buttonIdx === 0) { 
                if (type === 'bedrock') break;

                this.isMining = true; this.miningTimer = 0; this.targetBlockPos = `${bx},${by},${bz}`;
                let speedMult = 1.0;
                if (tool === 'wooden_pickaxe' && type === 'stone') speedMult = 3.0; if (tool === 'stone_pickaxe' && type === 'stone') speedMult = 6.0;
                if (tool === 'wooden_axe' && (type.includes('wood') || type.includes('planks') || type === 'crafting_table')) speedMult = 3.0;
                if (tool === 'stone_axe' && (type.includes('wood') || type.includes('planks') || type === 'crafting_table')) speedMult = 6.0;
                if (tool === 'wooden_shovel' && (type === 'dirt' || type === 'grass' || type === 'sand' || type === 'snow')) speedMult = 3.0;
                if (tool === 'stone_shovel' && (type === 'dirt' || type === 'grass' || type === 'sand' || type === 'snow')) speedMult = 6.0;

                if (type === 'stone') this.miningDurability = 1.5 / speedMult; 
                else if (type.includes('wood') || type.includes('planks') || type === 'crafting_table') this.miningDurability = 1.0 / speedMult;
                else if (type === 'dirt' || type === 'grass' || type === 'sand' || type === 'snow') this.miningDurability = 0.5 / speedMult;
                else if (type === 'leaves') this.miningDurability = 0.2; else this.miningDurability = 0.5; 
                
                document.getElementById('mining-ui').style.display = 'block'; break;
            } else if (buttonIdx === 2) { 
                if (type === 'crafting_table') { this.isCraftingTableOpen = true; this.toggleInventory(); break; }
                const selected = this.inventory[this.selectedSlot];
                if (selected && selected.type !== null && selected.count > 0 && !['stick', 'bow', 'crossbow', 'gun', 'wooden_sword', 'stone_sword', 'wooden_pickaxe', 'stone_pickaxe', 'wooden_axe', 'stone_axe', 'wooden_shovel', 'stone_shovel'].includes(selected.type)) {
                    if (selected.type === 'torch' && type === 'leaves') break; if (type === 'torch') break; 
                    const normal = intersect.face.normal.clone();
                    let nx = bx + Math.round(normal.x); let ny = by + Math.round(normal.y); let nz = bz + Math.round(normal.z);
                    
                    if (selected.type === 'torch') {
                        if (Math.round(normal.y) === -1) break; 
                        if (type === 'water' || this.world.getBlockType(nx, ny, nz) === 'water') break;
                    }
                    
                    this.world.addBlock(nx, ny, nz, selected.type, new THREE.Vector3(Math.round(normal.x), Math.round(normal.y), Math.round(normal.z)));
                    if(window.socket) window.socket.emit('requestBlockPlace', { x: nx, y: ny, z: nz, type: selected.type });
                    
                    selected.count--; this.updateInventoryUI(); if(AudioSys && AudioSys.stepGrass) AudioSys.stepGrass();
                }
                break;
            }
        }
    }

    stopMining() { this.isMining = false; this.miningTimer = 0; this.targetBlockPos = null; document.getElementById('mining-ui').style.display = 'none'; document.getElementById('mining-progress').style.width = '0%'; this.miningIndicator.material.opacity = 0; }

    checkCollision(x, y, z) {
        const radius = 0.25; const feetY = y - 1.5; const headY = y + 0.2;
        const pMinX = Math.floor(x - radius + 0.5); const pMaxX = Math.floor(x + radius + 0.5); const pMinY = Math.floor(feetY + 0.5); const pMaxY = Math.floor(headY + 0.5); const pMinZ = Math.floor(z - radius + 0.5); const pMaxZ = Math.floor(z + radius + 0.5);
        for (let bx = pMinX; bx <= pMaxX; bx++) { for (let by = pMinY; by <= pMaxY; by++) { for (let bz = pMinZ; bz <= pMaxZ; bz++) { const type = this.world.getBlockType(bx, by, bz); if (type !== 'air' && type !== 'water' && type !== 'torch') { if (feetY < by + 0.5 && headY > by - 0.5) return true; } } } }
        return false;
    }

    update(delta) {
        if (!this.gameActive) return;

        let targetX, targetZ;
        if (this.isMobile && (this.joyMove.x !== 0 || this.joyMove.y !== 0)) { targetX = this.joyMove.x * this.speed; targetZ = -this.joyMove.y * this.speed; } 
        else { this._input.set( Number(this.moveRight) - Number(this.moveLeft), 0, Number(this.moveForward) - Number(this.moveBackward) ).normalize(); targetX = this._input.x * this.speed; targetZ = this._input.z * this.speed; }
        
        this.velocity.x += (targetX - this.velocity.x) * 10 * delta; this.velocity.z += (targetZ - this.velocity.z) * 10 * delta;
        this._direction.set(1, 0, 0).applyQuaternion(this.camera.quaternion); this._direction.y = 0; this._direction.normalize();
        let dxRight = this._direction.x * this.velocity.x * delta; let dzRight = this._direction.z * this.velocity.x * delta;
        this._direction.set(0, 0, -1).applyQuaternion(this.camera.quaternion); this._direction.y = 0; this._direction.normalize();
        let dxForward = this._direction.x * this.velocity.z * delta; let dzForward = this._direction.z * this.velocity.z * delta;

        this.camera.position.x += (dxRight + dxForward); if (this.checkCollision(this.camera.position.x, this.camera.position.y, this.camera.position.z)) { this.camera.position.x -= (dxRight + dxForward); }
        this.camera.position.z += (dzRight + dzForward); if (this.checkCollision(this.camera.position.x, this.camera.position.y, this.camera.position.z)) { this.camera.position.z -= (dzRight + dzForward); }

        this.velocity.y -= this.gravity * delta; const yMove = this.velocity.y * delta; const ySteps = Math.max(1, Math.ceil(Math.abs(yMove) / 0.1)); const yStepAmt = yMove / ySteps;
        for (let i = 0; i < ySteps; i++) {
            this.camera.position.y += yStepAmt;
            if (this.velocity.y < 0) { if (this.checkCollision(this.camera.position.x, this.camera.position.y, this.camera.position.z)) { let highestBlockY = Math.floor(this.camera.position.y - 1.5 + 0.5); this.camera.position.y = highestBlockY + 0.5 + 1.5; this.velocity.y = 0; this.canJump = true; break; } else { this.canJump = false; } } 
            else if (this.velocity.y > 0) { if (this.checkCollision(this.camera.position.x, this.camera.position.y, this.camera.position.z)) { this.camera.position.y = Math.floor(this.camera.position.y + 0.2 + 0.5) - 0.5 - 0.2; this.velocity.y = 0; break; } }
        }

        const horizSpeed = Math.sqrt(this.velocity.x**2 + this.velocity.z**2);
        if (this.canJump && horizSpeed > 1) { this.footstepTimer += delta; if (this.footstepTimer > 0.35) { let floorType = this.world.getBlockType(Math.floor(this.camera.position.x), Math.floor(this.camera.position.y - 1.6), Math.floor(this.camera.position.z)); if(floorType === 'stone' || floorType === 'bedrock') { if(AudioSys && AudioSys.stepStone) AudioSys.stepStone(); } else { if(AudioSys && AudioSys.stepGrass) AudioSys.stepGrass(); } this.footstepTimer = 0; } }

        for (let i = this.world.drops.length - 1; i >= 0; i--) {
            let drop = this.world.drops[i];
            if (drop.pickupDelay <= 0 && this.camera.position.distanceTo(drop.mesh.position) < 1.8) { 
                if(window.socket && !drop.isBeingPickedUp) {
                    drop.isBeingPickedUp = true; drop.mesh.visible = false; window.socket.emit('requestPickup', drop.id);
                }
            }
        }

        if (this.shakeIntensity > 0) { this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity * 0.1; this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity * 0.1; this.camera.position.z += (Math.random() - 0.5) * this.shakeIntensity * 0.1; this.shakeIntensity = Math.max(0, this.shakeIntensity - delta * 3); }
        if (this.muzzleFlash.intensity > 0) this.muzzleFlash.intensity = Math.max(0, this.muzzleFlash.intensity - delta * 100);

        this.bodyGroup.position.set(this.camera.position.x, this.camera.position.y - 1.5, this.camera.position.z); 
        this._euler.setFromQuaternion(this.camera.quaternion, 'YXZ'); 
        this.bodyGroup.rotation.y = this._euler.y;

        let targetArmRX = 0, targetArmLX = 0, targetLegRX = 0, targetLegLX = 0;
        if (this.canJump && horizSpeed > 1) { this.legSwingTimer += delta * 15; let swing = Math.sin(this.legSwingTimer) * 0.5; targetLegLX = swing; targetLegRX = -swing; targetArmLX = -swing; targetArmRX = swing; }

        let pitch = this._euler.x; this.head.rotation.x = pitch; let targetFPSArmX = -Math.PI / 4;

        if (this.attackAnimTimer > 0) {
            this.attackAnimTimer -= delta; let strike = Math.sin((1.0 - (this.attackAnimTimer / 0.25)) * Math.PI) * 1.5;
            targetFPSArmX = -Math.PI / 4 + strike; targetArmRX = pitch + strike; 
        } else if (this.isMining) {
            let mine = Math.abs(Math.sin(performance.now() * 0.015)) * 0.5; targetFPSArmX = -Math.PI / 4 + mine; targetArmRX = pitch + mine;
            this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera); let rayTargets = []; for (const chunkGroup of this.world.chunks.values()) rayTargets.push(chunkGroup);
            const intersects = this.raycaster.intersectObjects(rayTargets, true);
            let stillLookingAtTarget = false;
            for (let intersect of intersects) {
                if (intersect.distance > 6) break;
                let bx, by, bz; if (intersect.object.isInstancedMesh) { const pos = intersect.object.userData.positions[intersect.instanceId]; if (!pos) continue; bx = pos.x; by = pos.y; bz = pos.z; } else continue; 
                const currentPos = `${bx},${by},${bz}`;
                if (currentPos === this.targetBlockPos) {
                    stillLookingAtTarget = true; this.miningTimer += delta;
                    this.miningIndicator.position.set(bx, by, bz); this.miningIndicator.material.opacity = (this.miningTimer / this.miningDurability) * 0.8;
                    let progressEl = document.getElementById('mining-progress'); if(progressEl) progressEl.style.width = `${Math.min(100, (this.miningTimer / this.miningDurability) * 100)}%`;
                    
                    if (this.miningTimer >= this.miningDurability) {
                        const blockType = this.world.getBlockType(bx, by, bz);
                        this.world.removeBlock(bx, by, bz); 
                        if(window.socket) window.socket.emit('requestBlockBreak', { x: bx, y: by, z: bz, type: blockType });
                        this.stopMining();
                    }
                }
                break;
            }
            if (!stillLookingAtTarget) this.stopMining();
        }

        this.arm.rotation.x = THREE.MathUtils.lerp(this.arm.rotation.x, targetFPSArmX, 15 * delta); this.armR_3rd.rotation.x = THREE.MathUtils.lerp(this.armR_3rd.rotation.x, targetArmRX, 15 * delta); this.armL.rotation.x = THREE.MathUtils.lerp(this.armL.rotation.x, targetArmLX, 15 * delta); this.legR.rotation.x = THREE.MathUtils.lerp(this.legR.rotation.x, targetLegRX, 15 * delta); this.legL.rotation.x = THREE.MathUtils.lerp(this.legL.rotation.x, targetLegLX, 15 * delta);

        if (!this.isMining && this.canJump && horizSpeed > 1 && this.attackAnimTimer <= 0) this.armGroup.position.y = THREE.MathUtils.lerp(this.armGroup.position.y, Math.sin(performance.now() * 0.01) * 0.03, 10 * delta);
        else if (!this.isMining && this.attackAnimTimer <= 0) this.armGroup.position.y = THREE.MathUtils.lerp(this.armGroup.position.y, 0, 10 * delta);

        if (this.cameraMode === 0) { this.bodyGroup.visible = false; this.armGroup.visible = true; } else { this.bodyGroup.visible = true; this.armGroup.visible = false; }

        if (window.socket && this.gameActive) {
            if (performance.now() - this.lastNetUpdate > 50) { 
                window.socket.emit('move', {
                    x: this.camera.position.x, y: this.camera.position.y - 1.5, z: this.camera.position.z,
                    ry: this._euler.y, rx: this._euler.x, heldItem: this.inventory[this.selectedSlot]?.type || null,
                    isAttacking: this.attackAnimTimer > 0, health: this.health
                });
                this.lastNetUpdate = performance.now();
            }
        }
    }
}
