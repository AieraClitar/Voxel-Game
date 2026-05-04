import * as THREE from 'three';
import { Textures } from '../utils/Textures.js';
import { AudioSys } from '../utils/AudioSys.js';

export class AIController {
    constructor(scene, world, player) {
        this.scene = scene; this.world = world; this.player = player;
        this.mobs = new Map(); 
        this.projectiles = [];
        
        this.meleeTools = ['wooden_sword', 'stone_sword', 'wooden_pickaxe', 'stone_pickaxe', 'wooden_axe', 'stone_axe', 'wooden_shovel', 'stone_shovel', 'stick'];
        this.rangedTools = ['bow', 'crossbow', 'gun'];
        
        this.matZombieSkin = new THREE.MeshLambertMaterial({color: 0x417031}); this.matZombieShirt = new THREE.MeshLambertMaterial({color: 0x00aaff}); this.matZombiePants = new THREE.MeshLambertMaterial({color: 0x4a3b82}); 
        this.matArcherSkin = new THREE.MeshLambertMaterial({color: 0xe0ac69}); this.matArcherShirt = new THREE.MeshLambertMaterial({color: 0x3a5226}); this.matArcherPants = new THREE.MeshLambertMaterial({color: 0x5c4033}); 

        this.geoHead = new THREE.BoxGeometry(0.5, 0.5, 0.5); this.geoTorso = new THREE.BoxGeometry(0.6, 0.75, 0.25); this.geoLimb = new THREE.BoxGeometry(0.25, 0.75, 0.25); this.geoLeg = new THREE.BoxGeometry(0.25, 0.5, 0.25); this.geoWeapon = new THREE.PlaneGeometry(1.0, 1.0); this.geoWeapon.translate(0.5, 0.5, 0); 
        this.geoArrow = new THREE.BoxGeometry(0.05, 0.05, 0.6); this.matArrow = new THREE.MeshLambertMaterial({color: 0xcccccc}); this.geoBullet = new THREE.BoxGeometry(0.1, 0.1, 0.1); this.matBullet = new THREE.MeshBasicMaterial({color: 0xffff00}); 
    }

    // ✨ ALL SPAWNING AND DELETION DICTATED BY SERVER
    spawnMob(id, type, x, y, z) {
        if (this.mobs.has(id)) return;
        const mobGroup = new THREE.Group(); const isZombie = type === 'zombie';
        const matSkin = isZombie ? this.matZombieSkin.clone() : this.matArcherSkin.clone(); const matShirt = isZombie ? this.matZombieShirt.clone() : this.matArcherShirt.clone(); const matPants = isZombie ? this.matZombiePants.clone() : this.matArcherPants.clone();
        let faceTexKey = isZombie ? 'zombie_face' : 'archer_face'; const faceMat = new THREE.MeshLambertMaterial({ map: Textures.generate(faceTexKey) });
        
        const headMaterials = [matSkin, matSkin, matSkin, matSkin, matSkin, faceMat];
        const head = new THREE.Mesh(this.geoHead, headMaterials); head.position.set(0, 0, 0); head.castShadow = true;
        const torso = new THREE.Mesh(this.geoTorso, matShirt); torso.position.set(0, -0.625, 0); torso.castShadow = true;
        const armL = new THREE.Group(); armL.position.set(-0.425, -0.25, 0); const armLMesh = new THREE.Mesh(this.geoLimb, matSkin); armLMesh.position.y = -0.375; armLMesh.castShadow = true; armL.add(armLMesh);
        const armR = new THREE.Group(); armR.position.set(0.425, -0.25, 0); const armRMesh = new THREE.Mesh(this.geoLimb, matSkin); armRMesh.position.y = -0.375; armRMesh.castShadow = true; armR.add(armRMesh);

        let weaponType = isZombie ? this.meleeTools[Math.floor(Math.random() * this.meleeTools.length)] : this.rangedTools[Math.floor(Math.random() * this.rangedTools.length)];
        const weaponMat = this.world.itemMaterials[weaponType] || this.world.itemMaterials['stone'];
        const weaponMesh = new THREE.Mesh(this.geoWeapon, weaponMat);
        weaponMesh.position.set(0, -0.75, -0.15); weaponMesh.rotation.set(-Math.PI / 8, -Math.PI / 2, 0); weaponMesh.castShadow = true; armR.add(weaponMesh);

        const legL = new THREE.Group(); legL.position.set(-0.15, -1.0, 0); const legLMesh = new THREE.Mesh(this.geoLeg, matPants); legLMesh.position.y = -0.25; legLMesh.castShadow = true; legL.add(legLMesh);
        const legR = new THREE.Group(); legR.position.set(0.15, -1.0, 0); const legRMesh = new THREE.Mesh(this.geoLeg, matPants); legRMesh.position.y = -0.25; legRMesh.castShadow = true; legR.add(legRMesh);

        mobGroup.add(head, torso, armL, armR, legL, legR);
        mobGroup.position.set(x, y, z); this.scene.add(mobGroup);

        const mobObj = {
            id: id, type: type, mesh: mobGroup, armR: armR, legL: legL, legR: legR, armL: armL, head: head, weaponType: weaponType,
            swingTime: 0, attackAnimTimer: 0, hitFlinch: 0, targetPos: new THREE.Vector3(x, y, z), targetRy: 0, isMoving: false 
        };

        mobGroup.traverse((child) => { child.userData = { isMob: true, mobRef: mobObj }; });
        this.mobs.set(id, mobObj);
    }

    damageMobLocal(id, kbDir) {
        const mob = this.mobs.get(id); if (!mob) return;
        this.world.spawnParticles(mob.mesh.position.x, mob.mesh.position.y - 0.5, mob.mesh.position.z, 'blood', true);
        mob.mesh.children.forEach(child => { if(child.material) { if(Array.isArray(child.material)) child.material.forEach(m => { if(m && m.emissive) m.emissive.setHex(0xff0000); }); else if(child.material.emissive) child.material.emissive.setHex(0xff0000); } });
        setTimeout(() => { if(!mob.mesh) return; mob.mesh.children.forEach(child => { if(child.material) { if(Array.isArray(child.material)) child.material.forEach(m => { if(m && m.emissive) m.emissive.setHex(0x000000); }); else if(child.material.emissive) child.material.emissive.setHex(0x000000); } }); }, 200);
        mob.hitFlinch = 1.0; 
    }

    killMobLocal(id) {
        const mob = this.mobs.get(id); if(!mob) return;
        this.scene.remove(mob.mesh);
        mob.mesh.children.forEach(child => { if(child.material) { if(Array.isArray(child.material)) child.material.forEach(m => m.dispose()); else child.material.dispose(); }});
        this.mobs.delete(id);
    }

    syncFromServer(serverMobs) {
        // Create new mobs and update targets
        for (let id in serverMobs) {
            const sm = serverMobs[id];
            if (!this.mobs.has(id)) this.spawnMob(id, sm.type, sm.x, sm.y, sm.z);
            const mob = this.mobs.get(id);
            mob.targetPos.set(sm.x, sm.y, sm.z);
            mob.targetRy = sm.ry; mob.isMoving = sm.isMoving;
        }
        // Remove mobs not sent by server
        for (let id of this.mobs.keys()) {
            if (!serverMobs[id]) this.killMobLocal(id);
        }
    }

    update(delta) {
        // ✨ LERP ENGINE: Smooths Server Ticks into real-time frames
        for (let [id, mob] of this.mobs) {
            mob.mesh.position.lerp(mob.targetPos, 15 * delta);
            mob.mesh.rotation.y = THREE.MathUtils.lerp(mob.mesh.rotation.y, mob.targetRy, 15 * delta);
            
            let targetArmLX = 0, targetArmRX = 0, targetLegLX = 0, targetLegRX = 0, targetBodyRotX = 0;

            if (mob.isMoving) {
                mob.swingTime += delta * 15; let swing = Math.sin(mob.swingTime) * 0.6;
                targetLegLX = swing; targetLegRX = -swing; targetArmRX = swing; targetArmLX = -swing;
            }
            if (mob.hitFlinch > 0) { mob.hitFlinch -= delta * 3; targetBodyRotX = -0.5 * mob.hitFlinch; }
            
            mob.head.position.y = THREE.MathUtils.lerp(mob.head.position.y, Math.sin(performance.now() * 0.003) * 0.03, 5 * delta);
            mob.armL.rotation.x = THREE.MathUtils.lerp(mob.armL.rotation.x, targetArmLX, 12 * delta);
            mob.armR.rotation.x = THREE.MathUtils.lerp(mob.armR.rotation.x, targetArmRX, 15 * delta);
            mob.legL.rotation.x = THREE.MathUtils.lerp(mob.legL.rotation.x, targetLegLX, 15 * delta);
            mob.legR.rotation.x = THREE.MathUtils.lerp(mob.legR.rotation.x, targetLegRX, 15 * delta);
            mob.mesh.rotation.x = THREE.MathUtils.lerp(mob.mesh.rotation.x, targetBodyRotX, 15 * delta);
        }
    }
}