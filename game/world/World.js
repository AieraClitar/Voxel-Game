import * as THREE from 'three';
import { SimpleNoise } from '../utils/Noise.js';
import { Textures } from '../utils/Textures.js';

const CHUNK_SIZE = 16;
const RENDER_DISTANCE = 2;
const WATER_LEVEL = 5;

export class World {
    constructor(scene) {
        this.scene = scene;
        this.heightMap = new SimpleNoise(42);
        this.roughMap = new SimpleNoise(1337); 
        this.tempMap = new SimpleNoise(555); 
        this.humidMap = new SimpleNoise(999);

        this.blocks = new Map(); 
        this.chunks = new Map(); 
        this.generatedChunksData = new Set(); 
        this.lightSources = new Map(); 

        this.drops = []; 
        this.dropGroup = new THREE.Group();
        this.scene.add(this.dropGroup);

        this.geometry = new THREE.BoxGeometry(1, 1, 1);
        
        this.materials = {
            grass: [
                new THREE.MeshLambertMaterial({ map: Textures.generate('grass_side') }),
                new THREE.MeshLambertMaterial({ map: Textures.generate('grass_side') }),
                new THREE.MeshLambertMaterial({ map: Textures.generate('grass_top') }),
                new THREE.MeshLambertMaterial({ map: Textures.generate('dirt') }),
                new THREE.MeshLambertMaterial({ map: Textures.generate('grass_side') }),
                new THREE.MeshLambertMaterial({ map: Textures.generate('grass_side') })
            ],
            dirt: new THREE.MeshLambertMaterial({ map: Textures.generate('dirt') }),
            stone: new THREE.MeshLambertMaterial({ map: Textures.generate('stone') }),
            sand: new THREE.MeshLambertMaterial({ map: Textures.generate('sand') }),
            wood: new THREE.MeshLambertMaterial({ map: Textures.generate('wood') }),
            leaves: new THREE.MeshLambertMaterial({ map: Textures.generate('leaves'), transparent: true, alphaTest: 0.5 }),
            snow: new THREE.MeshLambertMaterial({ map: Textures.generate('snow') }),
            ice: new THREE.MeshLambertMaterial({ map: Textures.generate('ice'), transparent: true, opacity: 0.8 }),
            cactus: new THREE.MeshLambertMaterial({ map: Textures.generate('cactus') }),
            torch: new THREE.MeshLambertMaterial({ map: Textures.generate('torch'), transparent: true, alphaTest: 0.5 }),
            water: new THREE.MeshLambertMaterial({ color: 0x1ca3ec, transparent: true, opacity: 0.7 }),
            bedrock: new THREE.MeshLambertMaterial({ color: 0x222222 }) 
        };
    }

    getKey(x, y, z) { return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`; }
    getChunkKey(cx, cz) { return `${cx},${cz}`; }

    getModifiedBlocks() {
        const mods = [];
        for (const [key, data] of this.blocks.entries()) {
            if (data.modifiedByUser) mods.push({ key: key, type: data.type, normal: data.normal });
        }
        return mods;
    }

    loadModifiedBlocks(modifications) {
        this.blocks.clear();
        this.generatedChunksData.clear(); 
        for (const [key, chunkGroup] of this.chunks.entries()) {
            this.scene.remove(chunkGroup);
            chunkGroup.children.forEach(mesh => { if(mesh.geometry) mesh.geometry.dispose(); });
        }
        this.chunks.clear();
        for (const light of this.lightSources.values()) { this.scene.remove(light); }
        this.lightSources.clear();

        if (modifications) {
            modifications.forEach(mod => {
                const [x, y, z] = mod.key.split(',').map(Number);
                this.blocks.set(mod.key, { type: mod.type, normal: mod.normal, modifiedByUser: true });
                if (mod.type === 'torch') this.addTorchLight(x, y, z);
            });
        }
    }

    addTorchLight(x, y, z) {
        const light = new THREE.PointLight(0xffaa44, 15, 10); 
        light.position.set(x, y + 0.2, z);
        this.scene.add(light);
        this.lightSources.set(this.getKey(x,y,z), light);
    }

    addBlock(x, y, z, type, normal = null) {
        const key = this.getKey(x, y, z);
        if (this.blocks.has(key) && this.blocks.get(key).type !== 'air') return;
        const cx = Math.floor(x / CHUNK_SIZE);
        const cz = Math.floor(z / CHUNK_SIZE);
        const cKey = this.getChunkKey(cx, cz);
        
        if (this.chunks.has(cKey)) {
            const chunkGroup = this.chunks.get(cKey);
            let geo = this.geometry;
            let px = Math.floor(x), py = Math.floor(y), pz = Math.floor(z);
            
            const mesh = new THREE.Mesh(geo, this.materials[type]);
            
            if (type === 'torch') {
                geo = new THREE.BoxGeometry(0.12, 0.45, 0.12); // Slightly thinner!
                mesh.geometry = geo;
                if (normal) {
                    if (normal.x === 1) { px -= 0.4; mesh.rotation.z = -0.4; py += 0.1; }
                    else if (normal.x === -1) { px += 0.4; mesh.rotation.z = 0.4; py += 0.1; }
                    else if (normal.z === 1) { pz -= 0.4; mesh.rotation.x = 0.4; py += 0.1; }
                    else if (normal.z === -1) { pz += 0.4; mesh.rotation.x = -0.4; py += 0.1; }
                    else { py -= 0.25; } 
                } else { py -= 0.25; }
            }
            
            mesh.position.set(px, py, pz);
            chunkGroup.add(mesh);
            this.blocks.set(key, { type: type, normal: normal, mesh: mesh, modifiedByUser: true });
            
            if (type === 'torch') this.addTorchLight(x, y, z);
        }
    }

    // ✨ FIX: Block Updates! Check for attached torches when a block breaks!
    checkAndBreakAttachedTorches(x, y, z) {
        const offsets = [
            { dx: 0, dy: 1, dz: 0, face: 'y' },
            { dx: 1, dy: 0, dz: 0, face: 'x1' },
            { dx: -1, dy: 0, dz: 0, face: 'x-1' },
            { dx: 0, dy: 0, dz: 1, face: 'z1' },
            { dx: 0, dy: 0, dz: -1, face: 'z-1' }
        ];
        for (let off of offsets) {
            const tx = x + off.dx, ty = y + off.dy, tz = z + off.dz;
            const key = this.getKey(tx, ty, tz);
            const b = this.blocks.get(key);
            if (b && b.type === 'torch') {
                let attached = false;
                if (off.face === 'y' && (!b.normal || b.normal.y === 1)) attached = true;
                if (off.face === 'x1' && b.normal && b.normal.x === 1) attached = true;
                if (off.face === 'x-1' && b.normal && b.normal.x === -1) attached = true;
                if (off.face === 'z1' && b.normal && b.normal.z === 1) attached = true;
                if (off.face === 'z-1' && b.normal && b.normal.z === -1) attached = true;
                
                if (attached) {
                    this.removeBlock(tx, ty, tz);
                    this.spawnItemDrop(tx, ty, tz, 'torch');
                }
            }
        }
    }

    removeBlock(x, y, z) {
        const key = this.getKey(x, y, z);
        if (this.blocks.has(key)) {
            const block = this.blocks.get(key);
            if (block.mesh) {
                const cx = Math.floor(x / CHUNK_SIZE);
                const cz = Math.floor(z / CHUNK_SIZE);
                const chunkGroup = this.chunks.get(this.getChunkKey(cx, cz));
                if(chunkGroup) chunkGroup.remove(block.mesh);
            }
            if (block.type === 'torch' && this.lightSources.has(key)) {
                this.scene.remove(this.lightSources.get(key));
                this.lightSources.delete(key);
            }
            
            // Tell attached torches to break and fall!
            this.checkAndBreakAttachedTorches(x, y, z);

            this.blocks.set(key, { type: 'air', modifiedByUser: true }); 
        }
    }

    generateChunk(cx, cz) {
        const chunkGroup = new THREE.Group();
        const startX = cx * CHUNK_SIZE;
        const startZ = cz * CHUNK_SIZE;
        const cKey = this.getChunkKey(cx, cz);
        
        const isFirstTime = !this.generatedChunksData.has(cKey);
        if (isFirstTime) this.generatedChunksData.add(cKey);

        const decoratorsToGenerate = [];

        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                const worldX = startX + x;
                const worldZ = startZ + z;
                
                let elevation = (this.heightMap.getNoise(worldX * 0.02, worldZ * 0.02) + 1) * 8;
                let detail = (this.roughMap.getNoise(worldX * 0.08, worldZ * 0.08)) * 3;
                let height = Math.floor(elevation + detail) + 2;
                let maxRenderY = Math.max(height, WATER_LEVEL);

                let temp = this.tempMap.getNoise(worldX * 0.008, worldZ * 0.008);
                let humid = this.humidMap.getNoise(worldX * 0.008, worldZ * 0.008);
                
                let biome = 'plains';
                if (temp > 0.2 && humid < 0) biome = 'desert';
                else if (temp < -0.25) biome = 'tundra';

                if (isFirstTime) {
                    for (let y = -30; y <= maxRenderY; y++) {
                        let defaultType = 'stone';
                        let isCave = false;

                        if (y === -30) {
                            defaultType = 'bedrock';
                        } else if (y < height - 2) {
                            let n1 = Math.sin(worldX * 0.2) * Math.sin(y * 0.3) * Math.sin(worldZ * 0.2);
                            let n2 = this.roughMap.getNoise(worldX * 0.1, worldZ * 0.1);
                            if (n1 + n2 * 0.5 > 0.7) isCave = true; 
                        }

                        if (!isCave) {
                            if (y > height && y <= WATER_LEVEL) defaultType = biome === 'tundra' ? 'ice' : 'water'; 
                            else if (y === height) {
                                if (biome === 'desert') defaultType = 'sand';
                                else if (biome === 'tundra') defaultType = 'snow';
                                else defaultType = height <= WATER_LEVEL + 1 ? 'sand' : 'grass';
                            } else if (y > height - 3 && y !== -30) defaultType = biome === 'desert' ? 'sand' : 'dirt';
                            
                            this.blocks.set(this.getKey(worldX, y, worldZ), { type: defaultType, modifiedByUser: false });
                        }
                    }
                    if (biome === 'desert' && height > WATER_LEVEL && Math.random() < 0.01) decoratorsToGenerate.push({ x: worldX, y: height + 1, z: worldZ, type: 'cactus' });
                    else if (biome !== 'desert' && height > WATER_LEVEL + 1 && Math.random() < 0.02) decoratorsToGenerate.push({ x: worldX, y: height + 1, z: worldZ, type: 'tree' });
                }

                for (let y = -30; y <= maxRenderY + 15; y++) {
                    const bKey = this.getKey(worldX, y, worldZ);
                    const storedBlock = this.blocks.get(bKey);
                    if (storedBlock && storedBlock.type !== 'air') {
                        let geo = storedBlock.type === 'torch' ? new THREE.BoxGeometry(0.12, 0.45, 0.12) : this.geometry;
                        const mesh = new THREE.Mesh(geo, this.materials[storedBlock.type]);
                        
                        let px = worldX, py = y, pz = worldZ;
                        if (storedBlock.type === 'torch' && storedBlock.normal) {
                            const n = storedBlock.normal;
                            if (n.x === 1) { px -= 0.4; mesh.rotation.z = -0.4; py += 0.1; }
                            else if (n.x === -1) { px += 0.4; mesh.rotation.z = 0.4; py += 0.1; }
                            else if (n.z === 1) { pz -= 0.4; mesh.rotation.x = 0.4; py += 0.1; }
                            else if (n.z === -1) { pz += 0.4; mesh.rotation.x = -0.4; py += 0.1; }
                            else { py -= 0.25; }
                        } else if (storedBlock.type === 'torch') {
                            py -= 0.25;
                        }

                        mesh.position.set(px, py, pz);
                        chunkGroup.add(mesh);
                        storedBlock.mesh = mesh;
                    }
                }
            }
        }

        if (isFirstTime) {
            decoratorsToGenerate.forEach(pos => {
                if (pos.type === 'cactus') {
                    for(let cy = 0; cy < 3; cy++) this.addEnvironmentBlock(pos.x, pos.y + cy, pos.z, 'cactus', chunkGroup);
                } else {
                    const h = 4 + Math.floor(Math.random() * 2);
                    for(let ty = 0; ty < h; ty++) this.addEnvironmentBlock(pos.x, pos.y + ty, pos.z, 'wood', chunkGroup);
                    for(let lx = -3; lx <= 3; lx++) {
                        for(let lz = -3; lz <= 3; lz++) {
                            for(let ly = h - 3; ly <= h + 2; ly++) {
                                if (lx === 0 && lz === 0 && ly < h) continue; 
                                let dist = Math.sqrt(lx*lx + (ly-(h-1))*(ly-(h-1)) + lz*lz);
                                if (dist < 2.5 + Math.random() * 1.5) {
                                    this.addEnvironmentBlock(pos.x + lx, pos.y + ly, pos.z + lz, 'leaves', chunkGroup);
                                }
                            }
                        }
                    }
                }
            });
        }
        this.scene.add(chunkGroup);
        this.chunks.set(cKey, chunkGroup);
    }

    addEnvironmentBlock(x, y, z, type, chunkGroup) {
        const key = this.getKey(x, y, z);
        if (this.blocks.has(key)) return; 
        this.blocks.set(key, { type: type, modifiedByUser: false });
        const mesh = new THREE.Mesh(this.geometry, this.materials[type]);
        mesh.position.set(x, y, z);
        chunkGroup.add(mesh);
        this.blocks.get(key).mesh = mesh;
    }

    updateChunks(playerPos) {
        const currentChunkX = Math.floor(playerPos.x / CHUNK_SIZE);
        const currentChunkZ = Math.floor(playerPos.z / CHUNK_SIZE);
        const activeChunks = new Set();
        for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
            for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
                const cx = currentChunkX + x;
                const cz = currentChunkZ + z;
                const cKey = this.getChunkKey(cx, cz);
                activeChunks.add(cKey);
                if (!this.chunks.has(cKey)) this.generateChunk(cx, cz);
            }
        }
        for (const [key, chunkGroup] of this.chunks.entries()) {
            if (!activeChunks.has(key)) {
                this.scene.remove(chunkGroup);
                chunkGroup.children.forEach(mesh => { if(mesh.geometry) mesh.geometry.dispose(); });
                this.chunks.delete(key);
            }
        }
    }

    hasBlock(x, y, z) { const b = this.blocks.get(this.getKey(x, y, z)); return b && b.type !== 'air' && b.type !== 'water'; }
    getBlockType(x, y, z) { const b = this.blocks.get(this.getKey(x, y, z)); return b ? b.type : 'air'; }

    spawnItemDrop(x, y, z, type) {
        if (type === 'air' || type === 'water') return;
        const geo = type === 'torch' ? new THREE.BoxGeometry(0.1, 0.4, 0.1) : new THREE.BoxGeometry(0.3, 0.3, 0.3);
        
        // ✨ FIX: Grab the whole material array for Grass Blocks so it renders all 6 sides perfectly!
        const mat = this.materials[type]; 
        
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x + (Math.random()-0.5)*0.2, y, z + (Math.random()-0.5)*0.2);
        this.dropGroup.add(mesh);
        this.drops.push({ mesh: mesh, type: type, velocityY: 4.0 });
    }

    updateDrops(delta) {
        for (let drop of this.drops) {
            drop.mesh.rotation.y += delta * 2;
            drop.velocityY -= 20.0 * delta; 
            let nextY = drop.mesh.position.y + (drop.velocityY * delta);
            if (this.hasBlock(Math.round(drop.mesh.position.x), Math.round(nextY - 0.65), Math.round(drop.mesh.position.z))) {
                drop.velocityY = 0; drop.mesh.position.y = Math.round(nextY - 0.65) + 0.65;
            } else { drop.mesh.position.y = nextY; }
        }
    }
}