import * as THREE from 'three';

const STATES = { IDLE: 0, WANDER: 1, CHASE: 2, ATTACK: 3 };

export class AIController {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.entities = [];
        
        // Spawn 2 Villagers (Blue) and 1 Zombie (Red)
        this.spawnEntity('villager', 0x0000ff, 15, 10, 15);
        this.spawnEntity('villager', 0x0000ff, 10, 10, 10);
        this.spawnEntity('zombie', 0xff0000, 20, 10, 20);
    }

    spawnEntity(type, color, x, y, z) {
        const geo = new THREE.BoxGeometry(0.8, 1.8, 0.8);
        const mat = new THREE.MeshLambertMaterial({ color: color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        this.scene.add(mesh);

        this.entities.push({
            type: type,
            mesh: mesh,
            state: STATES.WANDER,
            health: 100,
            speed: type === 'zombie' ? 1.5 : 2.0,
            target: null,
            targetPos: new THREE.Vector3(x + Math.random()*5, y, z + Math.random()*5),
            attackTimer: 0
        });
    }

    update(delta) {
        for (let entity of this.entities) {
            if (entity.health <= 0) continue; // Dead

            // Apply gravity
            entity.mesh.position.y -= 10 * delta;
            let groundY = Math.floor(entity.mesh.position.y - 0.9);
            if (this.world.hasBlock(entity.mesh.position.x, groundY, entity.mesh.position.z)) {
                entity.mesh.position.y = groundY + 0.9;
            }

            // AI State Machine
            switch(entity.state) {
                case STATES.WANDER:
                    this.handleWander(entity, delta);
                    this.detectEnemies(entity);
                    break;
                case STATES.CHASE:
                    this.handleChase(entity, delta);
                    break;
                case STATES.ATTACK:
                    this.handleAttack(entity, delta);
                    break;
            }
        }
    }

    handleWander(entity, delta) {
        const dist = entity.mesh.position.distanceTo(entity.targetPos);
        if (dist < 0.5) {
            // Pick new wander point
            entity.targetPos.set(
                entity.mesh.position.x + (Math.random() - 0.5) * 10,
                entity.mesh.position.y,
                entity.mesh.position.z + (Math.random() - 0.5) * 10
            );
            entity.state = STATES.IDLE;
            setTimeout(() => { if (entity.state === STATES.IDLE) entity.state = STATES.WANDER; }, 2000);
        } else {
            this.moveTowards(entity, entity.targetPos, delta);
        }
    }

    detectEnemies(entity) {
        const targetType = entity.type === 'villager' ? 'zombie' : 'villager';
        for (let other of this.entities) {
            if (other.health > 0 && other.type === targetType) {
                const dist = entity.mesh.position.distanceTo(other.mesh.position);
                if (dist < 10) { // Detection radius
                    entity.target = other;
                    entity.state = STATES.CHASE;
                    break;
                }
            }
        }
    }

    handleChase(entity, delta) {
        if (!entity.target || entity.target.health <= 0) {
            entity.state = STATES.WANDER;
            return;
        }

        const dist = entity.mesh.position.distanceTo(entity.target.mesh.position);
        if (dist <= 1.5) { // Attack range
            entity.state = STATES.ATTACK;
        } else {
            this.moveTowards(entity, entity.target.mesh.position, delta);
        }
    }

    handleAttack(entity, delta) {
        if (!entity.target || entity.target.health <= 0) {
            entity.state = STATES.WANDER;
            return;
        }

        const dist = entity.mesh.position.distanceTo(entity.target.mesh.position);
        if (dist > 1.5) {
            entity.state = STATES.CHASE;
            return;
        }

        entity.attackTimer += delta;
        if (entity.attackTimer > 1.0) { // 1 attack per second
            entity.target.health -= 25;
            entity.attackTimer = 0;
            console.log(`${entity.type} attacked ${entity.target.type}! Target HP: ${entity.target.health}`);
            
            if (entity.target.health <= 0) {
                this.scene.remove(entity.target.mesh); // Remove dead entity
                entity.target = null;
                entity.state = STATES.WANDER;
            }
        }
    }

    moveTowards(entity, targetVec, delta) {
        const direction = new THREE.Vector3().subVectors(targetVec, entity.mesh.position);
        direction.y = 0; // Don't fly
        direction.normalize();
        entity.mesh.position.add(direction.multiplyScalar(entity.speed * delta));
    }
}