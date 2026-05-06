import * as THREE from 'three';
import { Textures } from '../utils/Textures.js';
import { AudioSys } from '../utils/AudioSys.js';

const weaponMaterials = {
    brown: new THREE.MeshLambertMaterial({color: 0x5c4033}),
    gray: new THREE.MeshLambertMaterial({color: 0x7f8c8d}),
    wood: new THREE.MeshLambertMaterial({color: 0x8b5a2b})
};

export function create3DWeapon(type) {
    const group = new THREE.Group();
    if (!type || type === 'none') return group;
    
    const brownMat = weaponMaterials.brown; const grayMat = weaponMaterials.gray; const woodMat = weaponMaterials.wood;
    const headMat = (type.includes('stone') || type === 'gun') ? grayMat : woodMat;

    if (type.includes('sword')) {
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.04), brownMat); handle.position.y = 0.1;
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.04, 0.04), brownMat); guard.position.y = 0.22;
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.02), headMat); blade.position.y = 0.49;
        group.add(handle, guard, blade);
    } else if (type.includes('pickaxe')) {
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.04), brownMat); handle.position.y = 0.25;
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.04), headMat); head.position.y = 0.48;
        group.add(handle, head);
    } else if (type.includes('axe')) {
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.04), brownMat); handle.position.y = 0.25;
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.04), headMat); head.position.set(0.08, 0.45, 0);
        group.add(handle, head);
    } else if (type.includes('shovel')) {
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.04), brownMat); handle.position.y = 0.25;
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.02), headMat); head.position.y = 0.5;
        group.add(handle, head);
    } else if (type === 'bow') {
        const string = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.5, 0.01), new THREE.MeshLambertMaterial({color: 0xdddddd})); string.position.set(-0.05, 0.25, 0);
        const top = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.25, 0.04), brownMat); top.position.set(0, 0.45, 0); top.rotation.z = -0.3;
        const bot = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.25, 0.04), brownMat); bot.position.set(0, 0.05, 0); bot.rotation.z = 0.3;
        const mid = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.05), brownMat); mid.position.y = 0.25;
        group.add(string, top, bot, mid);
    } else if (type === 'crossbow') {
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.04), brownMat); stock.position.y = 0.2;
        const bow = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.04), grayMat); bow.position.y = 0.35;
        group.add(stock, bow);
    } else if (type === 'gun') {
        const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.04), grayMat); barrel.position.set(0, 0.2, 0.05); barrel.rotation.x = Math.PI/2;
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, 0.04), brownMat); grip.position.set(0, 0.075, 0);
        group.add(barrel, grip);
    } else if (type === 'stick') {
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.04), brownMat); handle.position.y = 0.25; group.add(handle);
    }
    return group;
}

export class AIController {
    constructor(scene, world, player) {
        this.scene = scene; this.world = world; this.player = player;
        this.mobs = new Map(); 
        
        this.matZombieSkin = new THREE.MeshLambertMaterial({color: 0x417031}); this.matZombieShirt = new THREE.MeshLambertMaterial({color: 0x00aaff}); this.matZombiePants = new THREE.MeshLambertMaterial({color: 0x4a3b82}); 
        this.matArcherSkin = new THREE.MeshLambertMaterial({color: 0xe0ac69}); this.matArcherShirt = new THREE.MeshLambertMaterial({color: 0x3a5226}); this.matArcherPants = new THREE.MeshLambertMaterial({color: 0x5c4033}); 

        this.geoHead = new THREE.BoxGeometry(0.5, 0.5, 0.5); 
        this.geoTorso = new THREE.BoxGeometry(0.6, 0.75, 0.25); 
        this.geoLimb = new THREE.BoxGeometry(0.25, 0.75, 0.25); 
        this.geoLeg = new THREE.BoxGeometry(0.25, 0.75, 0.25); 
        
        this.fireParticles = []; this.fireMat = new THREE.MeshBasicMaterial({color: 0xff5500, transparent: true, opacity: 0.8});
    }

    spawnMob(id, type, x, y, z, weaponType, faceType) {
        if (this.mobs.has(id)) return;
        const mobGroup = new THREE.Group(); const isZombie = type === 'zombie';
        const matSkin = isZombie ? this.matZombieSkin.clone() : this.matArcherSkin.clone(); const matShirt = isZombie ? this.matZombieShirt.clone() : this.matArcherShirt.clone(); const matPants = isZombie ? this.matZombiePants.clone() : this.matArcherPants.clone();
        
        const faceMat = new THREE.MeshLambertMaterial({ map: Textures.generate(faceType || (isZombie ? 'zombie_face' : 'archer_face')) });
        const headMaterials = [matSkin, matSkin, matSkin, matSkin, faceMat, matSkin];
        
        const head = new THREE.Mesh(this.geoHead, headMaterials); head.position.set(0, 1.75, 0); head.castShadow = true;
        const torso = new THREE.Mesh(this.geoTorso, matShirt); torso.position.set(0, 1.125, 0); torso.castShadow = true;
        
        const armL = new THREE.Group(); armL.position.set(-0.425, 1.5, 0); const armLMesh = new THREE.Mesh(this.geoLimb, matSkin); armLMesh.position.y = -0.375; armLMesh.castShadow = true; armL.add(armLMesh);
        const armR = new THREE.Group(); armR.position.set(0.425, 1.5, 0); const armRMesh = new THREE.Mesh(this.geoLimb, matSkin); armRMesh.position.y = -0.375; armRMesh.castShadow = true; armR.add(armRMesh);

        if (weaponType && weaponType !== 'none') {
            const weaponMesh = create3DWeapon(weaponType);
            weaponMesh.position.set(0, -0.75, 0); 
            if (weaponType.includes('sword') || weaponType.includes('axe') || weaponType.includes('pickaxe')) {
                weaponMesh.rotation.set(Math.PI, -Math.PI / 2, 0);
            } else {
                weaponMesh.rotation.set(Math.PI / 2, 0, 0); 
            }
            weaponMesh.castShadow = true; armR.add(weaponMesh);
        }

        const legL = new THREE.Group(); legL.position.set(-0.15, 0.75, 0); const legLMesh = new THREE.Mesh(this.geoLeg, matPants); legLMesh.position.y = -0.375; legLMesh.castShadow = true; legL.add(legLMesh);
        const legR = new THREE.Group(); legR.position.set(0.15, 0.75, 0); const legRMesh = new THREE.Mesh(this.geoLeg, matPants); legRMesh.position.y = -0.375; legRMesh.castShadow = true; legR.add(legRMesh);

        mobGroup.add(head, torso, armL, armR, legL, legR);
        mobGroup.position.set(x, y, z); this.scene.add(mobGroup);

        const mobObj = {
            id: id, type: type, mesh: mobGroup, armR: armR, legL: legL, legR: legR, armL: armL, head: head, weaponType: weaponType,
            swingTime: 0, attackAnimTimer: 0, hitFlinch: 0, targetPos: new THREE.Vector3(x, y, z), targetRy: 0, isMoving: false, isBurning: false 
        };

        mobGroup.traverse((child) => { child.userData = { isMob: true, mobRef: mobObj }; });
        this.mobs.set(id, mobObj);
    }

    damageMobLocal(id, kbDir) {
        const mob = this.mobs.get(id); if (!mob) return;
        this.world.spawnParticles(mob.mesh.position.x, mob.mesh.position.y + 1.0, mob.mesh.position.z, 'blood', true);
        if (AudioSys && AudioSys.hitFlesh) AudioSys.hitFlesh(mob.mesh.position.distanceTo(this.player.camera.position)); 
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
        const speed = type === 'gun' ? 60 : 35; const projGroup = new THREE.Group();
        
        if (type === 'gun') {
            const bullet = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.2), new THREE.MeshBasicMaterial({color: 0xffff00})); projGroup.add(bullet);
        } else if (type === 'crossbow') {
            const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.25), new THREE.MeshLambertMaterial({color: 0x3e2723})); 
            const tip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.05), new THREE.MeshLambertMaterial({color: 0x7f8c8d})); tip.position.z = -0.125;
            projGroup.add(shaft, tip);
        } else {
            const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.4), new THREE.MeshLambertMaterial({color: 0x5c4033}));
            const tip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.05), new THREE.MeshLambertMaterial({color: 0x7f8c8d})); tip.position.z = -0.2;
            const fletch = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.1), new THREE.MeshLambertMaterial({color: 0xffffff})); fletch.position.z = 0.2;
            projGroup.add(shaft, tip, fletch);
        }
        
        projGroup.position.set(fromPos.x, fromPos.y, fromPos.z); this.scene.add(projGroup);
        let distToPlayer = fromPos.distanceTo(this.player.camera.position);
        
        if (type === 'gun') { if(AudioSys.shootGun) AudioSys.shootGun(distToPlayer); }
        else if (type === 'crossbow') { if(AudioSys.shootCrossbow) AudioSys.shootCrossbow(distToPlayer); }
        else { if(AudioSys.shootBow) AudioSys.shootBow(distToPlayer); }
        
        const dir = new THREE.Vector3().subVectors(toPos, projGroup.position);
        const distance = dir.length(); dir.normalize();
        const timeToTarget = distance / speed; const dropCompensation = 0.5 * 15.0 * (timeToTarget * timeToTarget);
        
        const targetPos = toPos.clone(); targetPos.y += dropCompensation;
        const trueVel = new THREE.Vector3().subVectors(targetPos, projGroup.position).normalize().multiplyScalar(speed);
        projGroup.lookAt(targetPos);
        
        const projInterval = setInterval(() => {
            if(!this.player.gameActive) return;
            projGroup.position.addScaledVector(trueVel, 0.05); trueVel.y -= 15.0 * 0.05; projGroup.lookAt(projGroup.position.clone().add(trueVel));

            let dx = projGroup.position.x - this.player.camera.position.x; let dz = projGroup.position.z - this.player.camera.position.z; let dy = projGroup.position.y - this.player.camera.position.y;
            
            // ✨ THE FIX: Massive collision radius specifically designed to catch arrows flying past you between frames.
            if (Math.sqrt(dx*dx + dz*dz) < 1.8 && dy < 1.8 && dy > -2.0) {
                 if (window.socket) window.socket.emit('requestPlayerDamage', { dmg: type==='gun'?35:type==='crossbow'?25:15, source: type });
                 this.scene.remove(projGroup); clearInterval(projInterval);
            } else if (this.world.getBlockType(Math.round(projGroup.position.x), Math.round(projGroup.position.y), Math.round(projGroup.position.z)) !== 'air') {
                 this.scene.remove(projGroup); clearInterval(projInterval);
            }
        }, 50);
        setTimeout(() => { clearInterval(projInterval); this.scene.remove(projGroup); }, 3000);
    }

    syncFromServer(serverMobs) {
        if (!serverMobs) return; const currentIds = new Set(Object.keys(serverMobs));
        for (let id of this.mobs.keys()) { if (!currentIds.has(id)) this.killMobLocal(id); }

        for (let id in serverMobs) {
            const sm = serverMobs[id];
            if (!this.mobs.has(id)) this.spawnMob(id, sm.type, sm.x, sm.y, sm.z, sm.weapon, sm.face);
            
            const mob = this.mobs.get(id);
            mob.targetPos.set(sm.x, sm.y, sm.z); mob.targetRy = sm.ry; mob.isMoving = sm.isMoving; mob.isBurning = sm.isBurning;
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

            if (mob.type === 'archer' && mob.attackAnimTimer <= 0 && !mob.isMoving) { 
                if(mob.weaponType === 'gun') { targetArmRX = -Math.PI / 2; targetArmLX = -Math.PI / 3; }
                else { targetArmRX = -Math.PI / 2.2; targetArmLX = -Math.PI / 2.2; }
            }
            
            if (mob.attackAnimTimer > 0) {
                mob.attackAnimTimer -= delta;
                let strike = Math.sin((mob.attackAnimTimer / (mob.type === 'archer' ? 0.5 : 0.3)) * Math.PI) * 1.5;
                if(mob.type === 'archer') { targetArmRX = -Math.PI/2.2 - strike*0.1; targetArmLX = -Math.PI/2.2; } else targetArmRX = -strike; 
            }
            
            // ✨ THE FIX: We make the fire effect slightly larger and guarantee it spawns.
            if (mob.isBurning && Math.random() < 0.4) {
                const f = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), this.fireMat);
                f.position.set(mob.mesh.position.x + (Math.random()-0.5)*0.6, mob.mesh.position.y + 0.5 + Math.random()*1.5, mob.mesh.position.z + (Math.random()-0.5)*0.6);
                this.scene.add(f); this.fireParticles.push({mesh: f, life: 1.0});
            }
            
            mob.head.position.y = THREE.MathUtils.lerp(mob.head.position.y, 1.75 + Math.sin(performance.now() * 0.003) * 0.03, 5 * delta);
            mob.armL.rotation.x = THREE.MathUtils.lerp(mob.armL.rotation.x, targetArmLX, 12 * delta);
            mob.armR.rotation.x = THREE.MathUtils.lerp(mob.armR.rotation.x, targetArmRX, 15 * delta);
            mob.legL.rotation.x = THREE.MathUtils.lerp(mob.legL.rotation.x, targetLegLX, 15 * delta);
            mob.legR.rotation.x = THREE.MathUtils.lerp(mob.legR.rotation.x, targetLegRX, 15 * delta);
            mob.mesh.rotation.x = THREE.MathUtils.lerp(mob.mesh.rotation.x, targetBodyRotX, 15 * delta);
        }

        for(let i=this.fireParticles.length-1; i>=0; i--) {
            let fp = this.fireParticles[i]; fp.life -= delta * 2; fp.mesh.position.y += delta * 2; fp.mesh.material.opacity = fp.life;
            if(fp.life <= 0) { this.scene.remove(fp.mesh); fp.mesh.geometry.dispose(); this.fireParticles.splice(i, 1); }
        }
    }
}
