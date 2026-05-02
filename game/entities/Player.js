import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

export class Player {
    constructor(camera, domElement, world) {
        this.camera = camera;
        this.world = world;
        this.world.scene.add(this.camera); 

        this.camera.near = 0.01;
        this.camera.updateProjectionMatrix();

        this.controls = new PointerLockControls(camera, domElement);

        this.velocity = new THREE.Vector3();
        this.speed = 8.0;       
        this.jumpForce = 10.0;  
        this.gravity = 25.0;    
        this.canJump = false;
        this.moveForward = false; this.moveBackward = false; this.moveLeft = false; this.moveRight = false;

        this.inventory = [
            { type: 'torch', count: 10 },
            { type: null, count: 0 }, { type: null, count: 0 }, { type: null, count: 0 },
            { type: null, count: 0 }, { type: null, count: 0 }
        ];
        this.mainInventory = Array.from({length: 16}, () => ({type: null, count: 0}));
        this.draggedItem = { type: null, count: 0 };
        this.selectedSlot = 0;
        this.isInvOpen = false;

        const create3DIcon = (type) => {
            const iconRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
            iconRenderer.setSize(128, 128); 
            const iconScene = new THREE.Scene();
            const iconCam = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
            iconCam.position.set(1.5, 1.2, 1.5); 
            iconCam.lookAt(0, 0, 0);
            iconScene.add(new THREE.AmbientLight(0xffffff, 1.0));
            const iconDir = new THREE.DirectionalLight(0xffffff, 1.0);
            iconDir.position.set(5, 10, 5);
            iconScene.add(iconDir);
            
            const mat = this.world.materials[type];
            let geo = type === 'torch' ? new THREE.BoxGeometry(0.2, 0.8, 0.2) : new THREE.BoxGeometry(1, 1, 1);
            const mesh = new THREE.Mesh(geo, mat);
            
            iconScene.add(mesh);
            iconRenderer.render(iconScene, iconCam); 

            const img = document.createElement('img');
            img.src = iconRenderer.domElement.toDataURL(); 
            img.style.width = '100%'; img.style.height = '100%';
            img.style.objectFit = 'contain'; img.style.pointerEvents = 'none'; 
            return img;
        };

        this.uiIcons = {};
        for (const type in this.world.materials) {
            if (type !== 'water') this.uiIcons[type] = create3DIcon(type);
        }

        this.isMining = false;
        this.miningTimer = 0;
        this.miningDurability = 1.0; 
        this.targetBlockPos = null; 

        this.armGroup = new THREE.Group();
        const armGeo = new THREE.BoxGeometry(0.25, 0.8, 0.25);
        const matSkin = new THREE.MeshLambertMaterial({ color: 0xe0ac69 }); 
        this.arm = new THREE.Mesh(armGeo, matSkin);
        this.arm.position.set(0.5, -0.5, -0.6); 
        this.arm.rotation.x = -Math.PI / 4; 
        this.armGroup.add(this.arm);

        this.heldBlockGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
        this.heldBlock = new THREE.Mesh(this.heldBlockGeo, new THREE.MeshLambertMaterial({color: 0xffffff}));
        this.heldBlock.position.set(0, 0.45, -0.25); 
        this.heldBlock.visible = false; 
        this.arm.add(this.heldBlock); 
        this.camera.add(this.armGroup); 

        this.bodyGroup = new THREE.Group();
        this.world.scene.add(this.bodyGroup);

        const matShirt = new THREE.MeshLambertMaterial({color: 0x3333aa});
        const matPants = new THREE.MeshLambertMaterial({color: 0x222255});

        this.torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.75, 0.25), matShirt);
        this.torso.position.set(0, -0.65, 0.15); 

        this.armL = new THREE.Group();
        this.armL.position.set(-0.425, -0.65, 0.15); 
        const armLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), matSkin);
        armLMesh.position.y = -0.375; 
        this.armL.add(armLMesh);

        this.legL = new THREE.Group();
        this.legL.position.set(-0.15, -1.025, 0.15); 
        const legLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), matPants);
        legLMesh.position.y = -0.375; 
        this.legL.add(legLMesh);

        this.legR = new THREE.Group();
        this.legR.position.set(0.15, -1.025, 0.15); 
        const legRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.75, 0.25), matPants);
        legRMesh.position.y = -0.375;
        this.legR.add(legRMesh);

        this.bodyGroup.add(this.torso, this.armL, this.legL, this.legR);
        this.legSwingTimer = 0;

        this.raycaster = new THREE.Raycaster();
        this.initControls();
        this.updateInventoryUI(); 
    }

    initControls() {
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        document.addEventListener('mousedown', (e) => this.onMouseDown(e));
        document.addEventListener('mouseup', (e) => this.onMouseUp(e));

        document.addEventListener('wheel', (e) => {
            if (this.controls.isLocked) {
                let newSlot = this.selectedSlot + Math.sign(e.deltaY);
                if (newSlot > 4) newSlot = 0; 
                if (newSlot < 0) newSlot = 4; 
                this.setHotbarSlot(newSlot);
            }
        });

        document.addEventListener('mousemove', (e) => {
            const dragEl = document.getElementById('dragged-item');
            if (dragEl && dragEl.style.display === 'block') {
                dragEl.style.left = (e.clientX + 10) + 'px'; 
                dragEl.style.top = (e.clientY + 10) + 'px';
            }
            
            const tooltip = document.getElementById('item-tooltip');
            if (tooltip && tooltip.style.display === 'block') {
                tooltip.style.left = (e.clientX + 15) + 'px';
                tooltip.style.top = (e.clientY + 15) + 'px';
            }
        });
    }

    bindSlotEvents(slotDiv, itemType, index, isHotbar) {
        slotDiv.onclick = () => { if (this.isInvOpen) this.handleSlotClick(isHotbar ? 'hotbar' : 'main', index); };
        slotDiv.onmouseenter = () => {
            const tooltip = document.getElementById('item-tooltip');
            let displayType = this.draggedItem.type || itemType; 
            if (displayType && tooltip && !this.draggedItem.type) {
                tooltip.style.display = 'block';
                tooltip.innerText = displayType.replace('_', ' ');
            }
        };
        slotDiv.onmouseleave = () => { 
            const tooltip = document.getElementById('item-tooltip');
            if(tooltip) tooltip.style.display = 'none'; 
        };
    }

    handleSlotClick(slotType, index) {
        let targetArray = slotType === 'hotbar' ? this.inventory : this.mainInventory;
        let targetSlot = targetArray[index];

        if (this.draggedItem.type) {
            if (targetSlot.type === this.draggedItem.type) {
                targetSlot.count += this.draggedItem.count;
                this.draggedItem = {type: null, count: 0};
            } else {
                let temp = { type: targetSlot.type, count: targetSlot.count };
                targetSlot.type = this.draggedItem.type;
                targetSlot.count = this.draggedItem.count;
                this.draggedItem = temp;
            }
        } else {
            if (targetSlot.type) {
                this.draggedItem = { type: targetSlot.type, count: targetSlot.count };
                targetSlot.type = null;
                targetSlot.count = 0;
            }
        }
        this.updateInventoryUI();
        
        const tooltip = document.getElementById('item-tooltip');
        if (tooltip) tooltip.style.display = 'none';
    }

    toggleInventory() {
        const invScreen = document.getElementById('inventory-screen');
        if (this.controls.isLocked) {
            this.isInvOpen = true;
            this.controls.unlock();
            invScreen.style.display = 'block';
            this.stopMining(); 
        } else if (this.isInvOpen) {
            this.isInvOpen = false;
            this.controls.lock();
            invScreen.style.display = 'none';
            const tooltip = document.getElementById('item-tooltip');
            if(tooltip) tooltip.style.display = 'none';
            if (this.draggedItem.type) {
                this.world.spawnItemDrop(this.camera.position.x, this.camera.position.y, this.camera.position.z, this.draggedItem.type);
                this.draggedItem = {type: null, count: 0};
                this.updateInventoryUI();
            }
        }
    }

    pickupItem(type) {
        for (let i = 0; i < 5; i++) { if (this.inventory[i].type === type) { this.inventory[i].count++; this.updateInventoryUI(); return true; } }
        for (let i = 0; i < 16; i++) { if (this.mainInventory[i].type === type) { this.mainInventory[i].count++; this.updateInventoryUI(); return true; } }
        for (let i = 0; i < 5; i++) { if (this.inventory[i].count === 0) { this.inventory[i].type = type; this.inventory[i].count = 1; this.updateInventoryUI(); return true; } }
        for (let i = 0; i < 16; i++) { if (this.mainInventory[i].count === 0) { this.mainInventory[i].type = type; this.mainInventory[i].count = 1; this.updateInventoryUI(); return true; } }
        return false; 
    }

    updateInventoryUI() {
        for(let i = 0; i < 5; i++) {
            const slot = document.getElementById(`slot-${i+1}`);
            if (!slot) continue;
            slot.innerHTML = ''; 
            const item = this.inventory[i];
            this.bindSlotEvents(slot, item.type, i, true);

            if (item.type !== null && item.count > 0) {
                if (this.uiIcons[item.type]) slot.appendChild(this.uiIcons[item.type].cloneNode());
                const countSpan = document.createElement('span');
                countSpan.className = 'item-count';
                countSpan.innerText = item.count;
                slot.appendChild(countSpan);
            } else { item.type = null; item.count = 0; }
        }

        const grid = document.getElementById('inventory-grid');
        grid.innerHTML = ''; 
        for(let i=0; i<16; i++) {
            const slot = document.createElement('div');
            slot.className = 'inv-item';
            const item = this.mainInventory[i];
            this.bindSlotEvents(slot, item.type, i, false);

            if (item.type !== null && item.count > 0) {
                if (this.uiIcons[item.type]) slot.appendChild(this.uiIcons[item.type].cloneNode());
                const countSpan = document.createElement('span');
                countSpan.className = 'item-count';
                countSpan.innerText = item.count;
                slot.appendChild(countSpan);
            }
            grid.appendChild(slot);
        }

        const dragEl = document.getElementById('dragged-item');
        if (dragEl) {
            dragEl.innerHTML = '';
            if (this.draggedItem.type !== null && this.draggedItem.count > 0) {
                dragEl.style.display = 'block';
                if (this.uiIcons[this.draggedItem.type]) dragEl.appendChild(this.uiIcons[this.draggedItem.type].cloneNode());
                const countSpan = document.createElement('span');
                countSpan.className = 'item-count';
                countSpan.innerText = this.draggedItem.count;
                dragEl.appendChild(countSpan);
            } else { dragEl.style.display = 'none'; }
        }

        const selected = this.inventory[this.selectedSlot];
        if (selected.type !== null && selected.count > 0) {
            this.heldBlock.visible = true;
            let mat = this.world.materials[selected.type];
            this.heldBlock.material = mat; 
            this.heldBlock.rotation.set(0, 0, 0);

            // ✨ THE FIX: Adjusted the Y and Z coordinates so blocks sit perfectly in front of the hand!
            if (selected.type === 'torch') {
                this.heldBlock.geometry = new THREE.BoxGeometry(0.08, 0.5, 0.08);
                this.heldBlock.position.set(0, 0.5, -0.15); 
                this.heldBlock.rotation.x = Math.PI / 8;
            } else {
                this.heldBlock.geometry = new THREE.BoxGeometry(0.25, 0.25, 0.25);
                this.heldBlock.position.set(0, 0.45, -0.25); // Pushed UP and FORWARD
            }
        } else { 
            this.heldBlock.visible = false; 
        }
    }

    setHotbarSlot(index) {
        this.selectedSlot = index;
        for(let i = 1; i <= 5; i++) {
            const slot = document.getElementById(`slot-${i}`);
            if(slot) slot.classList.remove('active');
        }
        const activeSlot = document.getElementById(`slot-${index + 1}`);
        if(activeSlot) activeSlot.classList.add('active');
        this.updateInventoryUI();
    }

    onKeyDown(event) {
        switch (event.code) {
            case 'KeyW': this.moveForward = true; break;
            case 'KeyA': this.moveLeft = true; break;
            case 'KeyS': this.moveBackward = true; break;
            case 'KeyD': this.moveRight = true; break;
            case 'Space': if (this.canJump) { this.velocity.y = this.jumpForce; this.canJump = false; } break;
            case 'Digit1': this.setHotbarSlot(0); break; case 'Digit2': this.setHotbarSlot(1); break;
            case 'Digit3': this.setHotbarSlot(2); break; case 'Digit4': this.setHotbarSlot(3); break;
            case 'Digit5': this.setHotbarSlot(4); break;
            case 'KeyE': this.toggleInventory(); break; 
        }
    }

    onKeyUp(event) {
        switch (event.code) {
            case 'KeyW': this.moveForward = false; break;
            case 'KeyA': this.moveLeft = false; break;
            case 'KeyS': this.moveBackward = false; break;
            case 'KeyD': this.moveRight = false; break;
        }
    }

    onMouseDown(event) {
        if (!this.controls.isLocked) return;

        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const intersects = this.raycaster.intersectObjects(this.world.scene.children, true);

        for (let intersect of intersects) {
            if (intersect.object === this.arm || intersect.object === this.heldBlock || intersect.object === this.torso || intersect.object.parent === this.legL || intersect.object.parent === this.legR || intersect.object.parent === this.armL) continue;
            if (intersect.distance > 6) break; 

            if (event.button === 0) { 
                const p = intersect.object.position;
                const type = this.world.getBlockType(p.x, p.y, p.z);
                
                if (type === 'torch') {
                    this.world.removeBlock(p.x, p.y, p.z);
                    this.world.spawnItemDrop(p.x, p.y, p.z, 'torch');
                    break;
                }

                this.isMining = true;
                this.miningTimer = 0;
                this.targetBlockPos = `${p.x},${p.y},${p.z}`;
                
                if (type === 'stone') this.miningDurability = 1.5; 
                else if (type === 'wood') this.miningDurability = 1.0;
                else if (type === 'leaves') this.miningDurability = 0.2; 
                else this.miningDurability = 0.5; 
                document.getElementById('mining-ui').style.display = 'block';
                break;
            } else if (event.button === 2) { 
                const selected = this.inventory[this.selectedSlot];
                if (selected.type !== null && selected.count > 0) {
                    
                    const targetType = this.world.getBlockType(intersect.object.position.x, intersect.object.position.y, intersect.object.position.z);
                    if (selected.type === 'torch' && targetType === 'leaves') break;

                    this.arm.rotation.x = -Math.PI / 3;
                    setTimeout(() => { this.arm.rotation.x = -Math.PI / 4; }, 100);
                    
                    const pos = intersect.object.position.clone().add(intersect.face.normal);
                    this.world.addBlock(pos.x, pos.y, pos.z, selected.type, intersect.face.normal);
                    
                    selected.count--;
                    this.updateInventoryUI();
                }
                break;
            }
        }
    }

    onMouseUp(event) { if (event.button === 0) this.stopMining(); }

    stopMining() {
        this.isMining = false;
        this.miningTimer = 0;
        this.targetBlockPos = null;
        document.getElementById('mining-ui').style.display = 'none';
        document.getElementById('mining-progress').style.width = '0%';
        this.arm.rotation.x = -Math.PI / 4; 
    }

    checkCollision(x, y, z) {
        const pMinX = x - 0.3; const pMaxX = x + 0.3;
        const pMinY = y - 1.6; const pMaxY = y + 0.2;
        const pMinZ = z - 0.3; const pMaxZ = z + 0.3;
        const minX = Math.floor(pMinX + 0.501); const maxX = Math.floor(pMaxX + 0.499);
        const minY = Math.floor(pMinY + 0.501); const maxY = Math.floor(pMaxY + 0.499);
        const minZ = Math.floor(pMinZ + 0.501); const maxZ = Math.floor(pMaxZ + 0.499);
        for (let bx = minX; bx <= maxX; bx++) {
            for (let by = minY; by <= maxY; by++) {
                for (let bz = minZ; bz <= maxZ; bz++) {
                    const type = this.world.getBlockType(bx, by, bz);
                    if (type !== 'air' && type !== 'water' && type !== 'torch') return true;
                }
            }
        }
        return false;
    }

    update(delta) {
        if (!this.controls.isLocked) return;

        if (this.isMining) {
            this.arm.rotation.x = -Math.PI / 4 - Math.abs(Math.sin(performance.now() * 0.015)) * 0.5;
            this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
            const intersects = this.raycaster.intersectObjects(this.world.scene.children, true);
            let stillLookingAtTarget = false;

            for (let intersect of intersects) {
                if (intersect.object === this.arm || intersect.object === this.heldBlock || intersect.object === this.torso || intersect.object.parent === this.legL || intersect.object.parent === this.legR || intersect.object.parent === this.armL) continue;
                if (intersect.distance > 6) break;

                const p = intersect.object.position;
                const currentPos = `${p.x},${p.y},${p.z}`;

                if (currentPos === this.targetBlockPos) {
                    stillLookingAtTarget = true;
                    this.miningTimer += delta;
                    
                    const progress = (this.miningTimer / this.miningDurability) * 100;
                    document.getElementById('mining-progress').style.width = `${Math.min(100, progress)}%`;

                    if (this.miningTimer >= this.miningDurability) {
                        const blockType = this.world.getBlockType(p.x, p.y, p.z);
                        this.world.removeBlock(p.x, p.y, p.z);
                        this.world.spawnItemDrop(p.x, p.y, p.z, blockType);
                        this.stopMining();
                    }
                }
                break;
            }
            if (!stillLookingAtTarget) this.stopMining();
        }

        const input = new THREE.Vector3( Number(this.moveRight) - Number(this.moveLeft), 0, Number(this.moveForward) - Number(this.moveBackward) ).normalize();
        const targetX = input.x * this.speed;
        const targetZ = input.z * this.speed;
        
        this.velocity.x += (targetX - this.velocity.x) * 10 * delta;
        this.velocity.z += (targetZ - this.velocity.z) * 10 * delta;
        this.velocity.y -= this.gravity * delta;

        const oldPos = this.camera.position.clone();
        this.controls.moveRight(this.velocity.x * delta);
        this.controls.moveForward(this.velocity.z * delta);

        const newX = this.camera.position.x;
        const newZ = this.camera.position.z;

        this.camera.position.set(oldPos.x, oldPos.y, oldPos.z);
        
        this.camera.position.x = newX;
        if (this.checkCollision(this.camera.position.x, this.camera.position.y, this.camera.position.z)) {
            this.camera.position.x = oldPos.x;
        }

        this.camera.position.z = newZ;
        if (this.checkCollision(this.camera.position.x, this.camera.position.y, this.camera.position.z)) {
            this.camera.position.z = oldPos.z;
        }

        this.camera.position.y += this.velocity.y * delta;
        
        if (this.velocity.y < 0) { 
            if (this.checkCollision(this.camera.position.x, this.camera.position.y, this.camera.position.z)) {
                const pMinY = this.camera.position.y - 1.6;
                const blockY = Math.floor(pMinY + 0.501); 
                this.camera.position.y = blockY + 0.5 + 1.6; 
                this.velocity.y = 0;
                this.canJump = true;
            } else {
                this.canJump = false;
            }
        } else if (this.velocity.y > 0) { 
            if (this.checkCollision(this.camera.position.x, this.camera.position.y, this.camera.position.z)) {
                const pMaxY = this.camera.position.y + 0.2;
                const blockY = Math.floor(pMaxY + 0.499);
                this.camera.position.y = blockY - 0.5 - 0.2; 
                this.velocity.y = 0;
            }
        }

        this.bodyGroup.position.copy(this.camera.position);
        const euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
        this.bodyGroup.rotation.y = euler.y;

        const horizSpeed = Math.sqrt(this.velocity.x**2 + this.velocity.z**2);
        if (this.canJump && horizSpeed > 1) { 
            this.legSwingTimer += delta * 15;
            this.legL.rotation.x = Math.sin(this.legSwingTimer) * 0.5;
            this.legR.rotation.x = Math.sin(this.legSwingTimer + Math.PI) * 0.5; 
            this.armL.rotation.x = Math.sin(this.legSwingTimer + Math.PI) * 0.5; 
        } else {
            this.legL.rotation.x += (0 - this.legL.rotation.x) * 10 * delta;
            this.legR.rotation.x += (0 - this.legR.rotation.x) * 10 * delta;
            this.armL.rotation.x += (0 - this.armL.rotation.x) * 10 * delta;
        }

        if (!this.isMining && this.canJump && horizSpeed > 1) {
            this.armGroup.position.y = Math.sin(performance.now() * 0.01) * 0.03;
        } else if (!this.isMining) {
            this.armGroup.position.y = 0;
        }

        for (let i = this.world.drops.length - 1; i >= 0; i--) {
            let drop = this.world.drops[i];
            let dist = this.camera.position.distanceTo(drop.mesh.position);
            
            if (dist < 1.8) { 
                if (this.pickupItem(drop.type)) {
                    this.world.dropGroup.remove(drop.mesh);
                    drop.mesh.geometry.dispose();
                    this.world.drops.splice(i, 1);
                }
            }
        }
    }
}