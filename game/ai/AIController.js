import * as THREE from 'three';
import { Textures } from '../utils/Textures.js';
import { AudioSys } from '../utils/AudioSys.js';

export class AIController {
    constructor(scene, world, player) {
        this.scene = scene; this.world = world; this.player = player;
        this.mobs = new Map(); 
        
        this.matZombieSkin = new THREE.MeshLambertMaterial({color: 0x417031}); this.matZombieShirt = new THREE.MeshLambertMaterial({color: 0x00aaff}); this.matZombiePants = new THREE.MeshLambertMaterial({color: 0x4a3b82}); 
        this.matArcherSkin = new THREE.MeshLambertMaterial({color: 0xe0ac69}); this.matArcherShirt = new THREE.MeshLambertMaterial({color: 0x3a5226}); this.matArcherPants = new THREE.MeshLambertMaterial({color: 0x5c4033}); 

        this.geoHead = new THREE.BoxGeometry(0.5, 0.5, 0.5); this.geoTorso = new THREE.BoxGeometry(0.6, 0.75, 0.25); this.geoLimb = new THREE.BoxGeometry(0.25, 0.75, 0.25); this.geoLeg = new THREE.BoxGeometry(0.25, 0.5, 0.25); this.geoWeapon = new THREE.PlaneGeometry(1.0, 1.0); this.geoWeapon.translate(0.5, 0.5, 0); 
        this.geoArrow = new THREE.BoxGeometry(0.05, 0.05, 0.6); this.matArrow = new THREE.MeshLambertMaterial({color: 0xcccccc}); this.geoBullet = new THREE.BoxGeometry(0.1, 0.1, 0.1); this.matBullet = new THREE.MeshBasicMaterial({color: 0xffff00}); 
    }

    // ✨ ACCEPTS SERVER FACE & WEAPON
    spawnMob(id, type, x, y, z, weaponType, faceType) {
        if (this.mobs.has(id)) return;
        const mobGroup = new THREE.Group(); const isZombie = type === 'zombie';
        const matSkin = isZombie ? this.matZombieSkin.clone() : this.matArcherSkin.clone(); const matShirt = isZombie ? this.matZombieShirt.clone() : this.matArcherShirt.clone(); const matPants = isZombie ? this.matZombiePants.clone() : this.matArcherPants.clone();
        
        // Correct BoxGeometry Face Indexing (Front is Index 4 in Three.js)
        const faceMat = new THREE.MeshLambertMaterial({ map: Textures.generate(faceType || (isZombie ? 'zombie_face' : 'archer_face')) });
        const headMaterials = [matSkin, matSkin, matSkin, matSkin, faceMat, matSkin];
        
        const head = new THREE.Mesh(this.geoHead, headMaterials); head.position.set(0, 1.5, 0); head.castShadow = true;
        const torso = new THREE.Mesh(this.geoTorso, matShirt); torso.position.set(0, 0.875, 0); torso.castShadow = true;
        const armL = new THREE.Group(); armL.position.set(-0.425, 1.25, 0); const armLMesh = new THREE.Mesh(this.geoLimb, matSkin); armLMesh.position.y = -0.375; armLMesh.castShadow = true; armL.add(armLMesh);
        const armR = new THREE.Group(); armR.position.set(0.425, 1.25, 0); const armRMesh = new THREE.Mesh(this.geoLimb, matSkin); armRMesh.position.y = -0.375; armRMesh.castShadow = true; armR.add(armRMesh);

        const weaponMat = this.world.itemMaterials[weaponType] || this.world.itemMaterials['stone'];
        const weaponMesh = new THREE.Mesh(this.geoWeapon, weaponMat);
        weaponMesh.position.set(0, -0.75, -0.15); weaponMesh.rotation.set(-Math.PI / 8, -Math.PI / 2, 0); weaponMesh.castShadow = true; armR.add(weaponMesh);

        const legL = new THREE.Group(); legL.position.set(-0.15, 0.5, 0); const legLMesh = new THREE.Mesh(this.geoLeg, matPants); legLMesh.position.y = -0.25; legLMesh.castShadow = true; legL.add(legLMesh);
        const legR = new THREE.Group(); legR.position.set(0.15, 0.5, 0); const legRMesh = new THREE.Mesh(this.geoLeg, matPants); legRMesh.position.y = -0.25; legRMesh.castShadow = true; legR.add(legRMesh);

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

    shootProjectile(fromPos, toPos, type) {
        const isGun = type === 'gun'; const speed = isGun ? 60 : 30;
        const mesh = new THREE.Mesh(isGun ? this.geoBullet : this.geoArrow, isGun ? this.matBullet : this.matArrow);
        mesh.position.set(fromPos.x, fromPos.y - 0.2, fromPos.z); this.scene.add(mesh);
        
        let distToPlayer = fromPos.distanceTo(this.player.camera.position);
        isGun ? AudioSys.shootGun(distToPlayer) : AudioSys.shootBow(distToPlayer);
        
        const dir = new THREE.Vector3().subVectors(toPos, mesh.position);
        const distance = dir.length(); dir.normalize();
        const timeToTarget = distance / speed; const dropCompensation = 0.5 * 15.0 * (timeToTarget * timeToTarget);
        
        const targetPos = toPos.clone(); targetPos.y += dropCompensation;
        const trueVel = new THREE.Vector3().subVectors(targetPos, mesh.position).normalize().multiplyScalar(speed);
        mesh.lookAt(targetPos);
        
        const projInterval = setInterval(() => {
            if(!this.player.gameActive) return;
            mesh.position.addScaledVector(trueVel, 0.05); trueVel.y -= 15.0 * 0.05; mesh.lookAt(mesh.position.clone().add(trueVel));

            let dx = mesh.position.x - this.player.camera.position.x; let dz = mesh.position.z - this.player.camera.position.z; let dy = mesh.position.y - this.player.camera.position.y;
            if (Math.sqrt(dx*dx + dz*dz) < 0.6 && dy < 0.2 && dy > -1.6) {
                 if (window.socket) window.socket.emit('requestPlayerDamage', { dmg: isGun ? 35 : 15, source: isGun ? 'Gunshot' : 'Arrow' });
                 this.scene.remove(mesh); clearInterval(projInterval);
            } else if (this.world.getBlockType(Math.round(mesh.position.x), Math.round(mesh.position.y), Math.round(mesh.position.z)) !== 'air') {
                 this.scene.remove(mesh); clearInterval(projInterval);
            }
        }, 50);
        setTimeout(() => { clearInterval(projInterval); this.scene.remove(mesh); }, 3000);
    }

    syncFromServer(serverMobs) {
        if (!serverMobs) return; const currentIds = new Set(Object.keys(serverMobs));
        for (let id of this.mobs.keys()) { if (!currentIds.has(id)) this.killMobLocal(id); }

        for (let id in serverMobs) {
            const sm = serverMobs[id];
            if (!this.mobs.has(id)) this.spawnMob(id, sm.type, sm.x, sm.y, sm.z, sm.weapon, sm.face);
            
            const mob = this.mobs.get(id);
            mob.targetPos.set(sm.x, sm.y, sm.z); mob.targetRy = sm.ry; mob.isMoving = sm.isMoving;
            if (sm.isAttacking && mob.attackAnimTimer <= 0) mob.attackAnimTimer = 0.5;
        }
    }

    update(delta) {
        for (let [id, mob] of this.mobs) {
            mob.mesh.position.lerp(mob.targetPos, 15 * delta);
            mob.mesh.rotation.y = THREE.MathUtils.lerp(mob.mesh.rotation.y, mob.targetRy, 15 * delta);
            
            let targetArmLX = 0, targetArmRX = 0, targetLegLX = 0, targetLegRX = 0, targetBodyRotX = 0;

            if (mob.isMoving) {
                mob.swingTime += delta * 15; let swing = Math.sin(mob.swingTime) * 0.6;
                targetLegLX = swing; targetLegRX = -swing; targetArmRX = swing; targetArmLX = -swing;
            }
            if (mob.hitFlinch > 0) { mob.hitFlinch -= delta * 3; targetBodyRotX = -0.5 * mob.hitFlinch; }

            if (mob.type === 'archer' && mob.isMoving === false && mob.attackAnimTimer <= 0) { targetArmRX = -Math.PI / 2; targetArmLX = -Math.PI / 2; }
            if (mob.attackAnimTimer > 0) {
                mob.attackAnimTimer -= delta;
                let strike = Math.sin((mob.attackAnimTimer / (mob.type === 'archer' ? 0.5 : 0.3)) * Math.PI) * 1.5;
                if(mob.type === 'archer') { targetArmRX = -Math.PI/2 - strike*0.5; targetArmLX = -Math.PI/2; } else targetArmRX = strike; 
            }
            
            // ✨ FIX: Base height is 1.5, not 0. Math.sin allows breathing without sinking into chests!
            mob.head.position.y = THREE.MathUtils.lerp(mob.head.position.y, 1.5 + Math.sin(performance.now() * 0.003) * 0.03, 5 * delta);
            
            mob.armL.rotation.x = THREE.MathUtils.lerp(mob.armL.rotation.x, targetArmLX, 12 * delta);
            mob.armR.rotation.x = THREE.MathUtils.lerp(mob.armR.rotation.x, targetArmRX, 15 * delta);
            mob.legL.rotation.x = THREE.MathUtils.lerp(mob.legL.rotation.x, targetLegLX, 15 * delta);
            mob.legR.rotation.x = THREE.MathUtils.lerp(mob.legR.rotation.x, targetLegRX, 15 * delta);
            mob.mesh.rotation.x = THREE.MathUtils.lerp(mob.mesh.rotation.x, targetBodyRotX, 15 * delta);
        }
    }
}