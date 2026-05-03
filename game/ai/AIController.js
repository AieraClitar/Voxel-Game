import * as THREE from 'three';
import { Textures } from '../utils/Textures.js';
import { AudioSys } from '../utils/AudioSys.js';

export class AIController {
    constructor(scene, world, player) {
        this.scene = scene;
        this.world = world;
        this.player = player;
        this.mobs = [];
        this.projectiles = [];
        this.spawnTimer = 0;
        this.maxMobs = 10;
        
        this.meleeTools = ['wooden_sword', 'stone_sword', 'wooden_pickaxe', 'stone_pickaxe', 'wooden_axe', 'stone_axe', 'wooden_shovel', 'stone_shovel', 'stick'];
        this.rangedTools = ['bow', 'crossbow', 'gun'];
        
        this.matZombieSkin = new THREE.MeshLambertMaterial({color: 0x417031}); 
        this.matZombieShirt = new THREE.MeshLambertMaterial({color: 0x00aaff});
        this.matZombiePants = new THREE.MeshLambertMaterial({color: 0x4a3b82}); 

        this.matArcherSkin = new THREE.MeshLambertMaterial({color: 0xe0ac69}); 
        this.matArcherShirt = new THREE.MeshLambertMaterial({color: 0x3a5226}); 
        this.matArcherPants = new THREE.MeshLambertMaterial({color: 0x5c4033}); 

        this.geoHead = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        this.geoTorso = new THREE.BoxGeometry(0.6, 0.75, 0.25);
        this.geoLimb = new THREE.BoxGeometry(0.25, 0.75, 0.25);
        this.geoLeg = new THREE.BoxGeometry(0.25, 0.5, 0.25);
        this.geoWeapon = new THREE.PlaneGeometry(1.0, 1.0);
        this.geoWeapon.translate(0.5, 0.5, 0); 
        
        this.geoArrow = new THREE.BoxGeometry(0.05, 0.05, 0.6);
        this.matArrow = new THREE.MeshLambertMaterial({color: 0xcccccc});
        this.geoBullet = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        this.matBullet = new THREE.MeshBasicMaterial({color: 0xffff00}); 

        this._kbDir = new THREE.Vector3();
    }

    attemptSpawn() {
        let dist = 15 + Math.random() * 25;
        let angle = Math.random() * Math.PI * 2;
        let sx = this.player.camera.position.x + Math.cos(angle) * dist;
        let sz = this.player.camera.position.z + Math.sin(angle) * dist;
        
        let sy = 30;
        while(sy > -30) { if (this.world.hasBlock(Math.floor(sx), Math.floor(sy), Math.floor(sz))) break; sy--; }
        if (sy > -30) this.spawnMob(Math.random() > 0.5 ? 'zombie' : 'archer', sx, sy + 1.5, sz);
    }

    spawnMob(type, x, y, z) {
        const mobGroup = new THREE.Group();
        const isZombie = type === 'zombie';
        
        const matSkin = isZombie ? this.matZombieSkin.clone() : this.matArcherSkin.clone();
        const matShirt = isZombie ? this.matZombieShirt.clone() : this.matArcherShirt.clone();
        const matPants = isZombie ? this.matZombiePants.clone() : this.matArcherPants.clone();
        
        let faceTexKey = isZombie ? 'zombie_face' : 'archer_face';
        const rand = Math.random();
        if (isZombie) { if (rand < 0.3) faceTexKey = 'zombie_face_var1'; else if (rand < 0.6) faceTexKey = 'zombie_face_var2'; } 
        else { if (rand < 0.5) faceTexKey = 'archer_face_var1'; }
        const faceMat = new THREE.MeshLambertMaterial({ map: Textures.generate(faceTexKey) });
        
        const headMaterials = [matSkin, matSkin, matSkin, matSkin, matSkin, faceMat];
        const head = new THREE.Mesh(this.geoHead, headMaterials); head.position.set(0, 0, 0); head.castShadow = true;
        const torso = new THREE.Mesh(this.geoTorso, matShirt); torso.position.set(0, -0.625, 0); torso.castShadow = true;
        
        const armL = new THREE.Group(); armL.position.set(-0.425, -0.25, 0);
        const armLMesh = new THREE.Mesh(this.geoLimb, matSkin); armLMesh.position.y = -0.375; armLMesh.castShadow = true; armL.add(armLMesh);
        
        const armR = new THREE.Group(); armR.position.set(0.425, -0.25, 0);
        const armRMesh = new THREE.Mesh(this.geoLimb, matSkin); armRMesh.position.y = -0.375; armRMesh.castShadow = true; armR.add(armRMesh);

        let weaponType = isZombie ? this.meleeTools[Math.floor(Math.random() * this.meleeTools.length)] : this.rangedTools[Math.floor(Math.random() * this.rangedTools.length)];
        const weaponMat = this.world.itemMaterials[weaponType] || this.world.itemMaterials['stone'];
        const weaponMesh = new THREE.Mesh(this.geoWeapon, weaponMat);
        
        weaponMesh.position.set(0, -0.75, -0.15); 
        weaponMesh.rotation.set(-Math.PI / 8, -Math.PI / 2, 0); 
        weaponMesh.castShadow = true;
        armR.add(weaponMesh);

        const legL = new THREE.Group(); legL.position.set(-0.15, -1.0, 0);
        const legLMesh = new THREE.Mesh(this.geoLeg, matPants); legLMesh.position.y = -0.25; legLMesh.castShadow = true; legL.add(legLMesh);
        
        const legR = new THREE.Group(); legR.position.set(0.15, -1.0, 0);
        const legRMesh = new THREE.Mesh(this.geoLeg, matPants); legRMesh.position.y = -0.25; legRMesh.castShadow = true; legR.add(legRMesh);

        mobGroup.add(head, torso, armL, armR, legL, legR);
        mobGroup.position.set(x, y, z);
        this.scene.add(mobGroup);

        const mobObj = {
            type: type, mesh: mobGroup, armR: armR, legL: legL, legR: legR, armL: armL, head: head, weaponType: weaponType,
            health: 100, velocity: new THREE.Vector3(0, 0, 0), swingTime: Math.random() * 10,
            attackTimer: 0, attackAnimTimer: 0, hitFlinch: 0, isGrounded: false, speed: isZombie ? 3.5 : 2.5, burnTimer: 0, shadeTarget: null,
            jumpCooldown: 0 // ✨ BUG FIX: Added isolated jump cooldown to stop infinite bouncing
        };

        mobGroup.traverse((child) => { child.userData = { isMob: true, mobRef: mobObj }; });
        this.mobs.push(mobObj);
    }

    damageMob(mob, amount, knockbackDir) {
        mob.health -= amount;
        let dist = mob.mesh.position.distanceTo(this.player.camera.position);
        AudioSys.hitFlesh(dist);
        this.world.spawnParticles(mob.mesh.position.x, mob.mesh.position.y - 0.5, mob.mesh.position.z, 'blood', true);

        mob.mesh.children.forEach(child => {
            if(child.material) {
                if(Array.isArray(child.material)) child.material.forEach(m => { if(m && m.emissive) m.emissive.setHex(0xff0000); });
                else if(child.material.emissive) child.material.emissive.setHex(0xff0000);
            }
        });
        setTimeout(() => {
            if(!mob.mesh) return;
            mob.mesh.children.forEach(child => {
                if(child.material) {
                    if(Array.isArray(child.material)) child.material.forEach(m => { if(m && m.emissive) m.emissive.setHex(0x000000); });
                    else if(child.material.emissive) child.material.emissive.setHex(0x000000);
                }
            });
        }, 200);

        mob.velocity.x = knockbackDir.x * 12.0; mob.velocity.z = knockbackDir.z * 12.0; mob.velocity.y = 6.5; 
        mob.isGrounded = false; mob.attackAnimTimer = 0;
        mob.hitFlinch = 1.0; 

        if (mob.health <= 0) {
            if(window.showChat) window.showChat(`⚔️ You slaughtered a ${mob.type.toUpperCase()}!`);
            this.scene.remove(mob.mesh);
            mob.mesh.children.forEach(child => { if(child.material) { if(Array.isArray(child.material)) child.material.forEach(m => m.dispose()); else child.material.dispose(); }});
            this.mobs = this.mobs.filter(m => m !== mob);
        }
    }

    shootProjectile(fromPos, toPos, type) {
        const isGun = type === 'gun';
        const speed = isGun ? 60 : 30;
        
        const mesh = new THREE.Mesh(isGun ? this.geoBullet : this.geoArrow, isGun ? this.matBullet : this.matArrow);
        mesh.position.set(fromPos.x, fromPos.y - 0.2, fromPos.z); 
        this.scene.add(mesh);
        
        let distToPlayer = fromPos.distanceTo(this.player.camera.position);
        isGun ? AudioSys.shootGun(distToPlayer) : AudioSys.shootBow(distToPlayer);
        
        const dir = new THREE.Vector3().subVectors(toPos, mesh.position);
        const distance = dir.length();
        dir.normalize();
        
        const timeToTarget = distance / speed;
        const dropCompensation = 0.5 * 15.0 * (timeToTarget * timeToTarget);
        
        const targetPos = toPos.clone();
        targetPos.y += dropCompensation;
        
        const trueVel = new THREE.Vector3().subVectors(targetPos, mesh.position).normalize().multiplyScalar(speed);
        mesh.lookAt(targetPos);

        this.projectiles.push({ mesh: mesh, vel: trueVel, life: 0, isGun: isGun });
    }

    checkCollision(x, y, z) {
        const radius = 0.28; const feetY = y - 1.5; const headY = y + 0.25;
        const pMinX = Math.floor(x - radius + 0.5); const pMaxX = Math.floor(x + radius + 0.5);
        const pMinY = Math.floor(feetY + 0.5); const pMaxY = Math.floor(headY + 0.5);
        const pMinZ = Math.floor(z - radius + 0.5); const pMaxZ = Math.floor(z + radius + 0.5);
        
        for (let bx = pMinX; bx <= pMaxX; bx++) {
            for (let by = pMinY; by <= pMaxY; by++) {
                for (let bz = pMinZ; bz <= pMaxZ; bz++) {
                    const type = this.world.getBlockType(bx, by, bz);
                    if (type !== 'air' && type !== 'water' && type !== 'torch') { if (feetY < by + 0.5 && headY > by - 0.5) return true; }
                }
            }
        }
        return false;
    }

    update(delta) {
        this.spawnTimer += delta;
        if (this.spawnTimer > 8.0 && this.mobs.length < this.maxMobs) { this.spawnTimer = 0; this.attemptSpawn(); }

        const px = this.player.camera.position.x; const py = this.player.camera.position.y; const pz = this.player.camera.position.z;

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let p = this.projectiles[i]; p.life += delta;
            
            p.vel.y -= 15.0 * delta; 
            p.mesh.position.addScaledVector(p.vel, delta);
            p.mesh.lookAt(p.mesh.position.clone().add(p.vel)); 

            let dx = p.mesh.position.x - px; let dz = p.mesh.position.z - pz; let dy = p.mesh.position.y - py;
            if (Math.sqrt(dx*dx + dz*dz) < 0.6 && dy < 0.2 && dy > -1.6) {
                 this.player.takeDamage(p.isGun ? 35 : 15, p.isGun ? 'Gunshot' : 'Arrow'); AudioSys.hurt();
                 this.player.velocity.add(p.vel.clone().normalize().multiplyScalar(p.isGun ? 12 : 8)); this.player.velocity.y = 4; this.player.shakeIntensity = 0.5;
                 this.scene.remove(p.mesh); this.projectiles.splice(i, 1); continue;
            }
            if (p.life > 3 || this.world.getBlockType(Math.round(p.mesh.position.x), Math.round(p.mesh.position.y), Math.round(p.mesh.position.z)) !== 'air') {
                 this.scene.remove(p.mesh); this.projectiles.splice(i, 1);
            }
        }

        let isDay = this.world.sunArc > 0.1;

        for (let i = this.mobs.length - 1; i >= 0; i--) {
            let mob = this.mobs[i]; let mesh = mob.mesh;
            let isMoving = false; let isBurning = false; let targetX = 0; let targetZ = 0;
            
            // ✨ BUG FIX: Reduce jump cooldown tracker
            if (mob.jumpCooldown > 0) mob.jumpCooldown -= delta;

            if (mob.type === 'zombie' && isDay && mob.isGrounded) {
                if (!this.world.hasRoof(mesh.position.x, mesh.position.y, mesh.position.z)) {
                    isBurning = true; mob.burnTimer += delta;
                    if (Math.random() < 0.2) {
                        mesh.children[0].material.forEach(m => { if(m && m.emissive) m.emissive.setHex(0xff5500); });
                        setTimeout(() => { if(mesh) mesh.children[0].material.forEach(m => { if(m && m.emissive) m.emissive.setHex(0x000000); }); }, 150);
                    }
                    if (mob.burnTimer > 1.0) { this.damageMob(mob, 8, new THREE.Vector3(0,0,0)); mob.burnTimer = 0; }
                } else { mob.burnTimer = 0; }
            }

            if (isBurning) {
                if (!mob.shadeTarget) {
                    let foundShade = false;
                    for (let rx = -6; rx <= 6; rx += 2) {
                        for (let rz = -6; rz <= 6; rz += 2) {
                            let tx = mesh.position.x + rx; let tz = mesh.position.z + rz;
                            if (this.world.hasRoof(tx, mesh.position.y, tz) && !this.checkCollision(tx, mesh.position.y, tz)) {
                                mob.shadeTarget = new THREE.Vector3(tx, mesh.position.y, tz); foundShade = true; break;
                            }
                        }
                        if (foundShade) break;
                    }
                    if (!foundShade) { let angle = Math.random() * Math.PI * 2; mob.shadeTarget = new THREE.Vector3(mesh.position.x + Math.cos(angle)*5, mesh.position.y, mesh.position.z + Math.sin(angle)*5); }
                }

                let dx = mob.shadeTarget.x - mesh.position.x; let dz = mob.shadeTarget.z - mesh.position.z;
                let dist = Math.sqrt(dx*dx + dz*dz);
                
                let targetRot = Math.atan2(-dx, -dz);
                let diff = targetRot - mesh.rotation.y;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                mesh.rotation.y += diff * 5 * delta;
                
                isMoving = true; targetX = (dx / dist) * (mob.speed * 1.5); targetZ = (dz / dist) * (mob.speed * 1.5);
                if (dist < 1.0) mob.shadeTarget = null; 
            } else {
                let dx = px - mesh.position.x; let dz = pz - mesh.position.z;
                let dist = Math.sqrt(dx*dx + dz*dz);
                
                if (mob.isGrounded && mob.hitFlinch <= 0.1) {
                    let targetRot = Math.atan2(-dx, -dz);
                    let diff = targetRot - mesh.rotation.y;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    mesh.rotation.y += diff * 8 * delta;
                }

                if (mob.type === 'zombie') {
                    if (dist > 1.0 && dist < 40.0 && mob.isGrounded && mob.attackTimer <= 0) { isMoving = true; targetX = (dx / dist) * mob.speed; targetZ = (dz / dist) * mob.speed; }
                    mob.attackTimer -= delta;
                    if (mob.attackTimer <= 0 && dist <= 1.8 && Math.abs(mesh.position.y - py) < 2.0 && mob.isGrounded) {
                         mob.attackAnimTimer = 0.3; mob.attackTimer = 1.5; AudioSys.hitFlesh(dist); AudioSys.hurt(); this.player.shakeIntensity = 0.6;
                         this.player.takeDamage(15, 'Zombie'); this._kbDir.set(dx, 0, dz).normalize();
                         this.player.velocity.x = this._kbDir.x * 15; this.player.velocity.z = this._kbDir.z * 15; this.player.velocity.y = 8;              
                    }
                } else if (mob.type === 'archer') {
                    if (dist > 18.0 && dist < 40.0 && mob.isGrounded && mob.attackTimer <= 0.5) { 
                        isMoving = true; targetX = (dx / dist) * mob.speed; targetZ = (dz / dist) * mob.speed; 
                    } else if (dist < 8.0 && mob.isGrounded) {
                        isMoving = true; targetX = -(dx / dist) * mob.speed; targetZ = -(dz / dist) * mob.speed; 
                    }
                    
                    if (dist <= 25.0 && mob.isGrounded) {
                        mob.attackTimer -= delta;
                        if (mob.attackTimer <= 0) { mob.attackTimer = 3.0; mob.attackAnimTimer = 0.5; this.shootProjectile(mesh.position, this.player.camera.position, mob.weaponType); }
                    }
                }
            }

            mob.velocity.x += (targetX - mob.velocity.x) * 10 * delta; mob.velocity.z += (targetZ - mob.velocity.z) * 10 * delta;
            let moveX = mob.velocity.x * delta; let moveZ = mob.velocity.z * delta;
            
            // ✨ BUG FIX: Removed setting velocity to 0 upon collision. 
            // This maintains forward pressure against the wall, pulling them gracefully over the ledge once they jump!
            mesh.position.x += moveX; if (this.checkCollision(mesh.position.x, mesh.position.y, mesh.position.z)) { mesh.position.x -= moveX; }
            mesh.position.z += moveZ; if (this.checkCollision(mesh.position.x, mesh.position.y, mesh.position.z)) { mesh.position.z -= moveZ; }

            mob.velocity.y -= 25.0 * delta; let moveY = mob.velocity.y * delta; let nextY = mesh.position.y + moveY;
            if (this.checkCollision(mesh.position.x, nextY, mesh.position.z)) {
                if (mob.velocity.y < 0) { mob.velocity.y = 0; mob.isGrounded = true; mesh.position.y = Math.floor(nextY - 1.5 + 0.5) + 0.5 + 1.5; } 
                else if (mob.velocity.y > 0) { mob.velocity.y = 0; mesh.position.y = Math.floor(nextY + 0.25 + 0.5) - 0.5 - 0.25; }
            } else { mesh.position.y = nextY; mob.isGrounded = false; }

            // ✨ BUG FIX: Improved jump logic with Head Collision detection and Cooldown
            if (isMoving && mob.isGrounded && mob.jumpCooldown <= 0) {
                let mx = -Math.sin(mesh.rotation.y); let mz = -Math.cos(mesh.rotation.y);
                let checkFront = this.checkCollision(mesh.position.x + mx * 0.6, mesh.position.y + 0.1, mesh.position.z + mz * 0.6);
                let checkAboveFront = this.checkCollision(mesh.position.x + mx * 0.6, mesh.position.y + 1.2, mesh.position.z + mz * 0.6);
                let checkAboveSelf = this.checkCollision(mesh.position.x, mesh.position.y + 2.0, mesh.position.z); // Don't jump if under a roof!
                
                if (checkFront && !checkAboveFront && !checkAboveSelf) { 
                    mob.velocity.y = 8.5; 
                    mob.isGrounded = false; 
                    mob.jumpCooldown = 0.5; // Apply a 0.5s cooldown so they don't stutter jump
                }
            }

            if (this.checkCollision(mesh.position.x, mesh.position.y, mesh.position.z)) mesh.position.y += 2.0 * delta; 

            let targetArmLX = 0, targetArmRX = 0, targetLegLX = 0, targetLegRX = 0, targetBodyRotX = 0;

            if (mob.type === 'archer' && mob.attackTimer < 1.0) {
                targetArmRX = -Math.PI / 2; 
                targetArmLX = -Math.PI / 2;
            }

            if (mob.attackAnimTimer > 0) {
                mob.attackAnimTimer -= delta;
                let strike = Math.sin((mob.attackAnimTimer / (mob.type === 'archer' ? 0.5 : 0.3)) * Math.PI) * 1.5;
                if(mob.type === 'archer') { targetArmRX = -Math.PI/2 - strike*0.5; targetArmLX = -Math.PI/2; } 
                else targetArmRX = strike; 
            }

            if (isMoving && mob.isGrounded) {
                mob.swingTime += delta * 15;
                let swing = Math.sin(mob.swingTime) * 0.6;
                targetLegLX = swing; targetLegRX = -swing;
                if(mob.attackAnimTimer <= 0 && mob.attackTimer > 1.0) targetArmRX = swing;
                if(mob.attackTimer > 1.0) targetArmLX = -swing;
            }

            if (mob.hitFlinch > 0) {
                mob.hitFlinch -= delta * 3;
                targetBodyRotX = -0.5 * mob.hitFlinch; 
            }
            
            mob.head.position.y = THREE.MathUtils.lerp(mob.head.position.y, Math.sin(performance.now() * 0.003) * 0.03, 5 * delta);

            mob.armL.rotation.x = THREE.MathUtils.lerp(mob.armL.rotation.x, targetArmLX, 12 * delta);
            mob.armR.rotation.x = THREE.MathUtils.lerp(mob.armR.rotation.x, targetArmRX, 15 * delta);
            mob.legL.rotation.x = THREE.MathUtils.lerp(mob.legL.rotation.x, targetLegLX, 15 * delta);
            mob.legR.rotation.x = THREE.MathUtils.lerp(mob.legR.rotation.x, targetLegRX, 15 * delta);
            mesh.rotation.x = THREE.MathUtils.lerp(mesh.rotation.x, targetBodyRotX, 15 * delta);
        }
    }
}
