import * as THREE from 'three';
import { SimpleNoise } from '../utils/Noise.js';
import { Textures } from '../utils/Textures.js';

const CHUNK_SIZE = 16; const CHUNK_HEIGHT = 128; const Y_OFFSET = 30; const RENDER_DISTANCE = 3; const WATER_LEVEL = 5;

// 🔧 FIX: Added Lava (17) here
const BLOCK_TYPES = {
    'air': 0, 'bedrock': 1, 'stone': 2, 'dirt': 3, 'grass': 4, 'sand': 5, 'snow': 6, 'ice': 7, 'water': 8, 'oak_wood': 9,
    'birch_wood': 10, 'leaves': 11, 'oak_planks': 12, 'crafting_table': 13, 'cactus': 14, 'torch': 15, 'birch_planks': 16, 'lava': 17
};
const ID_TO_TYPE = Object.keys(BLOCK_TYPES);

export class World {
    constructor(scene, seed = 42) {
        this.scene = scene;
        this.heightMap = new SimpleNoise(seed); this.roughMap = new SimpleNoise(seed + 1337); this.tempMap = new SimpleNoise(seed + 555); this.humidMap = new SimpleNoise(seed + 999); this.treeMap = new SimpleNoise(seed + 888); 
        this.chunkData = new Map(); this.chunks = new Map(); this.chunkDataState = new Map(); this.chunkMeshState = new Map(); 
        this.torchNormals = new Map(); this.lightSources = new Map(); this.chunkQueue = []; this.sunArc = 0;
        
        this.serverBlocks = new Map();

        this.drops = []; this.dropGroup = new THREE.Group(); this.scene.add(this.dropGroup);
        this.particles = []; this.particleGroup = new THREE.Group(); this.scene.add(this.particleGroup); this.geoParticle = new THREE.BoxGeometry(0.1, 0.1, 0.1);

        this.geoBlock = new THREE.BoxGeometry(1, 1, 1); this.geoTorch = new THREE.BoxGeometry(0.12, 0.45, 0.12);
        this.dropGeoBlock = new THREE.BoxGeometry(0.3, 0.3, 0.3); this.dropGeoTorch = new THREE.BoxGeometry(0.1, 0.4, 0.1); 
        
        // 🔧 FIX: Flat planes required for Fluid Face Culling
        this.wGeoTop = new THREE.PlaneGeometry(1, 1); this.wGeoTop.rotateX(-Math.PI/2);
        this.wGeoBot = new THREE.PlaneGeometry(1, 1); this.wGeoBot.rotateX(Math.PI/2); this.wGeoBot.translate(0, -0.5, 0);
        this.wGeoLeft = new THREE.PlaneGeometry(1, 1); this.wGeoLeft.rotateY(-Math.PI/2); this.wGeoLeft.translate(-0.5, 0, 0);
        this.wGeoRight = new THREE.PlaneGeometry(1, 1); this.wGeoRight.rotateY(Math.PI/2); this.wGeoRight.translate(0.5, 0, 0);
        this.wGeoFront = new THREE.PlaneGeometry(1, 1); this.wGeoFront.translate(0, 0, 0.5);
        this.wGeoBack = new THREE.PlaneGeometry(1, 1); this.wGeoBack.rotateY(Math.PI); this.wGeoBack.translate(0, 0, -0.5);
        
        const toolMat = (texName) => new THREE.MeshLambertMaterial({ map: Textures.generate(texName), transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });

        this.materials = {
            1: new THREE.MeshLambertMaterial({ map: Textures.generate('bedrock') }), 
            2: new THREE.MeshLambertMaterial({ map: Textures.generate('stone') }), 
            3: new THREE.MeshLambertMaterial({ map: Textures.generate('dirt') }), 
            4: [ new THREE.MeshLambertMaterial({ map: Textures.generate('grass_side') }), new THREE.MeshLambertMaterial({ map: Textures.generate('grass_side') }), new THREE.MeshLambertMaterial({ map: Textures.generate('grass_top') }), new THREE.MeshLambertMaterial({ map: Textures.generate('dirt') }), new THREE.MeshLambertMaterial({ map: Textures.generate('grass_side') }), new THREE.MeshLambertMaterial({ map: Textures.generate('grass_side') }) ],
            5: new THREE.MeshLambertMaterial({ map: Textures.generate('sand') }), 
            6: new THREE.MeshLambertMaterial({ map: Textures.generate('snow') }), 
            7: new THREE.MeshLambertMaterial({ map: Textures.generate('ice'), transparent: true, opacity: 0.8 }), 
            
            // 🔧 FIX: Allows looking through water via depthWrite false
            8: new THREE.MeshLambertMaterial({ map: Textures.generate('water'), transparent: true, opacity: 0.8, depthWrite: false }), 
            
            9: [ new THREE.MeshLambertMaterial({ map: Textures.generate('oak_side') }), new THREE.MeshLambertMaterial({ map: Textures.generate('oak_side') }), new THREE.MeshLambertMaterial({ map: Textures.generate('wood_top') }), new THREE.MeshLambertMaterial({ map: Textures.generate('wood_top') }), new THREE.MeshLambertMaterial({ map: Textures.generate('oak_side') }), new THREE.MeshLambertMaterial({ map: Textures.generate('oak_side') }) ],
            10: [ new THREE.MeshLambertMaterial({ map: Textures.generate('birch_side') }), new THREE.MeshLambertMaterial({ map: Textures.generate('birch_side') }), new THREE.MeshLambertMaterial({ map: Textures.generate('wood_top') }), new THREE.MeshLambertMaterial({ map: Textures.generate('wood_top') }), new THREE.MeshLambertMaterial({ map: Textures.generate('birch_side') }), new THREE.MeshLambertMaterial({ map: Textures.generate('birch_side') }) ],
            11: new THREE.MeshLambertMaterial({ map: Textures.generate('leaves'), transparent: true, alphaTest: 0.5 }), 12: new THREE.MeshLambertMaterial({ map: Textures.generate('oak_planks') }), 
            13: [ new THREE.MeshLambertMaterial({ map: Textures.generate('crafting_side') }), new THREE.MeshLambertMaterial({ map: Textures.generate('crafting_side') }), new THREE.MeshLambertMaterial({ map: Textures.generate('crafting_top') }), new THREE.MeshLambertMaterial({ map: Textures.generate('oak_planks') }), new THREE.MeshLambertMaterial({ map: Textures.generate('crafting_side') }), new THREE.MeshLambertMaterial({ map: Textures.generate('crafting_side') }) ],
            14: new THREE.MeshLambertMaterial({ map: Textures.generate('cactus') }), 15: new THREE.MeshLambertMaterial({ map: Textures.generate('torch'), transparent: true, alphaTest: 0.5 }), 16: new THREE.MeshLambertMaterial({ map: Textures.generate('birch_planks') }),
            
            // 🔧 FIX: Animated Emissive Lava!
            17: new THREE.MeshLambertMaterial({ map: Textures.generate('lava'), emissive: 0xff3300, emissiveIntensity: 0.8 })
        };

        this.itemMaterials = {
            stone: this.materials[2], dirt: this.materials[3], grass: this.materials[4], sand: this.materials[5], snow: this.materials[6], ice: this.materials[7], oak_wood: this.materials[9], birch_wood: this.materials[10], leaves: this.materials[11], oak_planks: this.materials[12], birch_planks: this.materials[16], crafting_table: this.materials[13], cactus: this.materials[14], torch: this.materials[15],
            stick: toolMat('stick'), wooden_sword: toolMat('wooden_sword'), stone_sword: toolMat('stone_sword'), wooden_pickaxe: toolMat('wooden_pickaxe'), stone_pickaxe: toolMat('stone_pickaxe'), wooden_axe: toolMat('wooden_axe'), stone_axe: toolMat('stone_axe'), wooden_shovel: toolMat('wooden_shovel'), stone_shovel: toolMat('stone_shovel'), bow: toolMat('bow'), crossbow: toolMat('crossbow'), gun: toolMat('gun')
        };
    }

    getChunkKey(cx, cz) { return `${cx},${cz}`; }
    getBlockIndex(lx, ly, lz) { if(lx < 0 || lx > 15 || ly < 0 || ly > 127 || lz < 0 || lz > 15) return -1; return (lx * CHUNK_SIZE * CHUNK_HEIGHT) + (lz * CHUNK_HEIGHT) + ly; }
    getSurfaceHeight(x, z) { for (let y = 60; y >= -30; y--) { if (this.hasBlock(x, y, z)) return y; } return 5; }
    hasRoof(x, y, z) { for(let i = Math.round(y) + 1; i <= Math.round(y) + 30; i++) { const type = this.getBlockType(Math.round(x), i, Math.round(z)); if(type !== 'air' && type !== 'water' && type !== 'torch') return true; } return false; }
    getBlockType(x, y, z) { if (y < -30 || y >= -30 + CHUNK_HEIGHT) return 'air'; const cx = Math.floor(x / CHUNK_SIZE); const cz = Math.floor(z / CHUNK_SIZE); const data = this.chunkData.get(this.getChunkKey(cx, cz)); if (!data) return 'air'; const lx = x - cx * CHUNK_SIZE; const lz = z - cz * CHUNK_SIZE; const ly = y + Y_OFFSET; const idx = this.getBlockIndex(lx, ly, lz); if(idx === -1) return 'air'; return ID_TO_TYPE[data[idx]]; }
    hasBlock(x, y, z) { const type = this.getBlockType(x, y, z); return type !== 'air' && type !== 'water' && type !== 'lava'; }
    setBlockData(x, y, z, typeId) { if (y < -30 || y >= -30 + CHUNK_HEIGHT) return; const cx = Math.floor(x / CHUNK_SIZE); const cz = Math.floor(z / CHUNK_SIZE); const cKey = this.getChunkKey(cx, cz); let data = this.chunkData.get(cKey); if (!data) { data = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE); this.chunkData.set(cKey, data); } const lx = x - cx * CHUNK_SIZE; const lz = z - cz * CHUNK_SIZE; const ly = y + Y_OFFSET; const idx = this.getBlockIndex(lx, ly, lz); if(idx !== -1) data[idx] = typeId; }

    addBlock(x, y, z, typeStr, normal = null, force = false) {
        const typeId = BLOCK_TYPES[typeStr]; 
        if (!force && this.getBlockType(x, y, z) !== 'air') return;
        this.setBlockData(x, y, z, typeId);
        if (typeStr === 'torch') { const key = `${x},${y},${z}`; if (normal) this.torchNormals.set(key, normal); this.addTorchLight(x, y, z); }
        this.triggerMeshRebuild(x, y, z);
    }

    removeBlock(x, y, z, skipParticles = false, force = false) {
        const type = this.getBlockType(x, y, z); 
        if (!force && type === 'air') return;
        this.setBlockData(x, y, z, 0); const key = `${x},${y},${z}`;
        if (type === 'torch' && this.lightSources.has(key)) { this.scene.remove(this.lightSources.get(key)); this.lightSources.delete(key); this.torchNormals.delete(key); }
        this.checkAndBreakAttachedTorches(x, y, z); this.triggerMeshRebuild(x, y, z);
        if(!skipParticles && type !== 'air') this.spawnParticles(x, y, z, type); 
    }

    spawnParticles(x, y, z, type, isBlood = false) {
        if (!type || type === 'air') return;
        const count = isBlood ? 8 : 12; const color = isBlood ? 0xcc0000 : (type.includes('leaves') ? 0x2d5a27 : (type.includes('wood') || type.includes('planks') ? 0x5c4033 : 0x888888));
        const mat = new THREE.MeshBasicMaterial({ color: color });
        for (let i = 0; i < count; i++) {
            const mesh = new THREE.Mesh(this.geoParticle, mat); mesh.position.set(x + (Math.random()-0.5), y + (Math.random()-0.5), z + (Math.random()-0.5)); this.particleGroup.add(mesh);
            this.particles.push({ mesh: mesh, life: 1.0, vel: new THREE.Vector3((Math.random()-0.5)*5, Math.random()*5, (Math.random()-0.5)*5) });
        }
    }

    triggerMeshRebuild(x, y, z) {
        const cx = Math.floor(x / CHUNK_SIZE); const cz = Math.floor(z / CHUNK_SIZE); this.buildChunkMesh(cx, cz);
        const lx = x - cx * CHUNK_SIZE; const lz = z - cz * CHUNK_SIZE;
        if (lx === 0) this.buildChunkMesh(cx - 1, cz); if (lx === CHUNK_SIZE - 1) this.buildChunkMesh(cx + 1, cz);
        if (lz === 0) this.buildChunkMesh(cx, cz - 1); if (lz === CHUNK_SIZE - 1) this.buildChunkMesh(cx, cz + 1);
    }

    checkAndBreakAttachedTorches(x, y, z) {
        const offsets = [{ dx: 0, dy: 1, dz: 0, f: 'y' }, { dx: 1, dy: 0, dz: 0, f: 'x1' }, { dx: -1, dy: 0, dz: 0, f: 'x-1' }, { dx: 0, dy: 0, dz: 1, f: 'z1' }, { dx: 0, dy: 0, dz: -1, f: 'z-1' }];
        for (let off of offsets) {
            const tx = x + off.dx, ty = y + off.dy, tz = z + off.dz;
            if (this.getBlockType(tx, ty, tz) === 'torch') {
                const normal = this.torchNormals.get(`${tx},${ty},${tz}`); let attached = false;
                if (off.f === 'y' && (!normal || normal.y === 1)) attached = true; if (off.f === 'x1' && normal && normal.x === 1) attached = true; if (off.f === 'x-1' && normal && normal.x === -1) attached = true; if (off.f === 'z1' && normal && normal.z === 1) attached = true; if (off.f === 'z-1' && normal && normal.z === -1) attached = true;
                if (attached) { if(window.socket) window.socket.emit('requestBlockBreak', {x:tx, y:ty, z:tz, type:'torch'}); }
            }
        }
    }

    addTorchLight(x, y, z) { const light = new THREE.PointLight(0xffaa44, 15, 14); light.position.set(x, y + 0.2, z); this.scene.add(light); this.lightSources.set(`${x},${y},${z}`, light); }
    updateLights() { for (const light of this.lightSources.values()) light.intensity = 12 + (Math.random() * 4); }

    generateChunkData(cx, cz) {
        const cKey = this.getChunkKey(cx, cz); this.chunkDataState.set(cKey, 'generating'); 
        let data = this.chunkData.get(cKey); if (!data) { data = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE); this.chunkData.set(cKey, data); }
        const startX = cx * CHUNK_SIZE; const startZ = cz * CHUNK_SIZE; const decoratorsToGenerate = [];

        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
            for (let lz = 0; lz < CHUNK_SIZE; lz++) {
                const wx = startX + lx; const wz = startZ + lz;
                let elevation = (this.heightMap.getNoise(wx * 0.015, wz * 0.015) + 1) * 8; let detail = (this.roughMap.getNoise(wx * 0.06, wz * 0.06)) * 3; let height = Math.floor(elevation + detail) + 2;
                let temp = this.tempMap.getNoise(wx * 0.005, wz * 0.005); let humid = this.humidMap.getNoise(wx * 0.005, wz * 0.005);
                let biome = 'plains'; if (temp > 0.2 && humid < 0) biome = 'desert'; else if (temp < -0.25) biome = 'tundra';

                for (let y = -30; y <= Math.max(height, WATER_LEVEL); y++) {
                    let typeId = 2; let isCave = false;
                    if (y === -30) typeId = 1; 
                    else if (y <= height) { let n1 = this.roughMap.getNoise(wx * 0.04, y * 0.04 + wz * 0.01); let n2 = this.humidMap.getNoise(wz * 0.04, y * 0.04 + wx * 0.01); if (Math.abs(n1) < 0.12 && Math.abs(n2) < 0.12) isCave = true; }
                    
                    if (!isCave) {
                        if (y > height && y <= WATER_LEVEL) {
                            typeId = (biome === 'tundra' && y === WATER_LEVEL) ? 7 : 8; 
                        } 
                        else if (y === height) { 
                            if (height < WATER_LEVEL) { typeId = 3; } else { if (biome === 'desert') typeId = 5; else if (biome === 'tundra') typeId = 6; else typeId = height <= WATER_LEVEL + 1 ? 5 : 4; }
                        } 
                        else if (y > height - 3 && y !== -30) typeId = biome === 'desert' ? 5 : 3; 
                        
                        const idx = this.getBlockIndex(lx, y + Y_OFFSET, lz); if (data[idx] === 0) data[idx] = typeId;
                    } else {
                        // 🔧 FIX: Caves spawn underground Lava!
                        if (y <= -25) { const idx = this.getBlockIndex(lx, y + Y_OFFSET, lz); if (data[idx] === 0) data[idx] = 17; }
                    }
                }

                if (this.getBlockType(wx, height, wz) !== 'air') {
                    let localTreeRand = Math.abs(this.treeMap.random(wx, wz)); 
                    let localCactusRand = Math.abs(this.roughMap.random(wx, wz));

                    // 🔧 FIX: Small chance for a surface lava pit in the desert!
                    if (biome === 'desert' && height > WATER_LEVEL && localCactusRand < 0.01) { decoratorsToGenerate.push({ x: wx, y: height, z: wz, type: 'lava_pit' }); }
                    else if (biome === 'desert' && height > WATER_LEVEL && localCactusRand < 0.05) { decoratorsToGenerate.push({ x: wx, y: height + 1, z: wz, type: 'cactus' }); }
                    else if (biome !== 'desert' && biome !== 'tundra' && height > WATER_LEVEL + 1) { 
                        let treeDensity = this.treeMap.getNoise(wx * 0.02, wz * 0.02); 
                        if (treeDensity > 0.1 && localTreeRand < 0.03) { decoratorsToGenerate.push({ x: wx, y: height + 1, z: wz, type: 'tree', rand: localTreeRand }); } 
                    }
                }
            }
        }

        decoratorsToGenerate.forEach(pos => {
            if (pos.type === 'cactus') { for(let cy = 0; cy < 3; cy++) this.setBlockData(pos.x, pos.y + cy, pos.z, 14); } 
            else if (pos.type === 'lava_pit') { 
                for(let lx = -1; lx <= 1; lx++) { for(let lz = -1; lz <= 1; lz++) { this.setBlockData(pos.x + lx, pos.y, pos.z + lz, 17); } }
            }
            else {
                const h = 4 + Math.floor(pos.rand * 10) % 2; let treeId = pos.rand < 0.015 ? 9 : 10;
                for(let ty = 0; ty < h; ty++) this.setBlockData(pos.x, pos.y + ty, pos.z, treeId);
                for(let ly = h - 2; ly <= h + 1; ly++) { let radius = ly === h + 1 ? 1.5 : 2.5; for(let lx = -2; lx <= 2; lx++) { for(let lz = -2; lz <= 2; lz++) { if (lx === 0 && lz === 0 && ly < h) continue; if (lx*lx + lz*lz <= radius*radius) { this.setBlockData(pos.x + lx, pos.y + ly, pos.z + lz, 11); } } } }
            }
        });

        if (this.serverBlocks) {
            for (let [key, typeStr] of this.serverBlocks.entries()) {
                const [bx, by, bz] = key.split(',').map(Number);
                if (Math.floor(bx / CHUNK_SIZE) === cx && Math.floor(bz / CHUNK_SIZE) === cz) {
                    const typeId = typeStr === 'air' ? 0 : BLOCK_TYPES[typeStr];
                    const idx = this.getBlockIndex(bx - cx*CHUNK_SIZE, by + Y_OFFSET, bz - cz*CHUNK_SIZE);
                    if (idx !== -1) data[idx] = typeId;
                }
            }
        }

        this.chunkDataState.set(cKey, 'done');
    }

    buildChunkMesh(cx, cz) {
        const cKey = this.getChunkKey(cx, cz); const neighbors = [ this.getChunkKey(cx+1, cz), this.getChunkKey(cx-1, cz), this.getChunkKey(cx, cz+1), this.getChunkKey(cx, cz-1) ];
        if (this.chunkDataState.get(cKey) !== 'done') return; for (let n of neighbors) { if (this.chunkDataState.get(n) !== 'done') return; }
        const data = this.chunkData.get(cKey); if (!data) return;

        const chunkGroup = new THREE.Group(); chunkGroup.userData.isChunk = true;
        const instances = {}; for(let i = 1; i <= 17; i++) instances[i] = []; 
        
        // 🔧 FIX: Flat planes added for Culling
        const waterPlanes = { top: [], bot: [], left: [], right: [], front: [], back: [] }; 
        const lavaPlanes = { top: [], bot: [], left: [], right: [], front: [], back: [] };

        const startX = cx * CHUNK_SIZE; const startZ = cz * CHUNK_SIZE; const matrix = new THREE.Matrix4();
        const isSolid = (id) => id > 0 && id !== 7 && id !== 8 && id !== 11 && id !== 14 && id !== 15 && id !== 17;

        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
            for (let lz = 0; lz < CHUNK_SIZE; lz++) {
                for (let ly = 0; ly < CHUNK_HEIGHT; ly++) {
                    const id = data[this.getBlockIndex(lx, ly, lz)]; if (id === 0) continue; 
                    const wx = startX + lx; const wy = ly - Y_OFFSET; const wz = startZ + lz;

                    // 🔧 FIX: Fluid Culling Logic ensures no vertical grid lines!
                    if (id === 8 || id === 17) {
                        const t = id === 8 ? 'water' : 'lava';
                        const tPlanes = id === 8 ? waterPlanes : lavaPlanes;
                        
                        const top = this.getBlockType(wx, wy+1, wz); const bot = this.getBlockType(wx, wy-1, wz); 
                        const left = this.getBlockType(wx-1, wy, wz); const right = this.getBlockType(wx+1, wy, wz); 
                        const front = this.getBlockType(wx, wy, wz+1); const back = this.getBlockType(wx, wy, wz-1);

                        const h = (top !== t) ? -0.2 : 0.0; 
                        
                        if (top !== t) { matrix.makeTranslation(wx, wy + 0.5 + h, wz); tPlanes.top.push(matrix.clone()); }
                        if (bot !== t && bot === 'air') { matrix.makeTranslation(wx, wy, wz); tPlanes.bot.push(matrix.clone()); }
                        if (left !== t && left === 'air') { matrix.makeTranslation(wx, wy + (h/2), wz); matrix.scale(new THREE.Vector3(1, 1+h, 1)); tPlanes.left.push(matrix.clone()); }
                        if (right !== t && right === 'air') { matrix.makeTranslation(wx, wy + (h/2), wz); matrix.scale(new THREE.Vector3(1, 1+h, 1)); tPlanes.right.push(matrix.clone()); }
                        if (front !== t && front === 'air') { matrix.makeTranslation(wx, wy + (h/2), wz); matrix.scale(new THREE.Vector3(1, 1+h, 1)); tPlanes.front.push(matrix.clone()); }
                        if (back !== t && back === 'air') { matrix.makeTranslation(wx, wy + (h/2), wz); matrix.scale(new THREE.Vector3(1, 1+h, 1)); tPlanes.back.push(matrix.clone()); }
                        continue;
                    }

                    if (isSolid(id)) {
                        const top = this.getBlockType(wx, wy+1, wz); const bot = this.getBlockType(wx, wy-1, wz); const left = this.getBlockType(wx-1, wy, wz); const right = this.getBlockType(wx+1, wy, wz); const front = this.getBlockType(wx, wy, wz+1); const back = this.getBlockType(wx, wy, wz-1);
                        if (isSolid(BLOCK_TYPES[top]) && isSolid(BLOCK_TYPES[bot]) && isSolid(BLOCK_TYPES[left]) && isSolid(BLOCK_TYPES[right]) && isSolid(BLOCK_TYPES[front]) && isSolid(BLOCK_TYPES[back])) continue;
                    }

                    matrix.makeTranslation(wx, wy, wz);
                    if (id === 15) { 
                        const n = this.torchNormals.get(`${wx},${wy},${wz}`);
                        if (n) { if (n.x === 1) { matrix.makeTranslation(wx - 0.4, wy + 0.1, wz); matrix.multiply(new THREE.Matrix4().makeRotationZ(-0.4)); } else if (n.x === -1) { matrix.makeTranslation(wx + 0.4, wy + 0.1, wz); matrix.multiply(new THREE.Matrix4().makeRotationZ(0.4)); } else if (n.z === 1) { matrix.makeTranslation(wx, wy + 0.1, wz - 0.4); matrix.multiply(new THREE.Matrix4().makeRotationX(0.4)); } else if (n.z === -1) { matrix.makeTranslation(wx, wy + 0.1, wz + 0.4); matrix.multiply(new THREE.Matrix4().makeRotationX(-0.4)); } else matrix.makeTranslation(wx, wy - 0.25, wz); } else matrix.makeTranslation(wx, wy - 0.25, wz);
                    }
                    instances[id].push({ matrix: matrix.clone(), x: wx, y: wy, z: wz });
                }
            }
        }

        for (let i = 1; i <= 17; i++) {
            if (i === 8 || i === 17 || instances[i].length === 0) continue; 
            const geo = (i === 15) ? this.geoTorch : this.geoBlock; const mat = this.materials[i]; const iMesh = new THREE.InstancedMesh(geo, mat, instances[i].length); iMesh.castShadow = true; iMesh.receiveShadow = true; 
            iMesh.userData.positions = []; iMesh.userData.isTerrain = true;
            for (let j = 0; j < instances[i].length; j++) { iMesh.setMatrixAt(j, instances[i][j].matrix); iMesh.userData.positions.push({ x: instances[i][j].x, y: instances[i][j].y, z: instances[i][j].z }); }
            chunkGroup.add(iMesh);
        }

        // Render Culled Fluids
        const addPlanes = (geo, mat, arr) => {
            if (arr.length > 0) {
                const mesh = new THREE.InstancedMesh(geo, mat, arr.length);
                for(let j=0; j<arr.length; j++) mesh.setMatrixAt(j, arr[j]);
                chunkGroup.add(mesh);
            }
        };
        addPlanes(this.wGeoTop, this.materials[8], waterPlanes.top); addPlanes(this.wGeoBot, this.materials[8], waterPlanes.bot); addPlanes(this.wGeoLeft, this.materials[8], waterPlanes.left); addPlanes(this.wGeoRight, this.materials[8], waterPlanes.right); addPlanes(this.wGeoFront, this.materials[8], waterPlanes.front); addPlanes(this.wGeoBack, this.materials[8], waterPlanes.back);
        addPlanes(this.wGeoTop, this.materials[17], lavaPlanes.top); addPlanes(this.wGeoBot, this.materials[17], lavaPlanes.bot); addPlanes(this.wGeoLeft, this.materials[17], lavaPlanes.left); addPlanes(this.wGeoRight, this.materials[17], lavaPlanes.right); addPlanes(this.wGeoFront, this.materials[17], lavaPlanes.front); addPlanes(this.wGeoBack, this.materials[17], lavaPlanes.back);


        if (this.chunks.has(cKey)) { const oldGroup = this.chunks.get(cKey); this.scene.remove(oldGroup); oldGroup.children.forEach(mesh => { if(mesh.dispose) mesh.dispose(); }); }
        this.scene.add(chunkGroup); this.chunks.set(cKey, chunkGroup); this.chunkMeshState.set(cKey, 'done');
    }

    updateChunks(playerPos) {
        const currentChunkX = Math.floor(playerPos.x / CHUNK_SIZE); const currentChunkZ = Math.floor(playerPos.z / CHUNK_SIZE); const activeChunks = new Set();
        
        for (let x = -(RENDER_DISTANCE + 1); x <= (RENDER_DISTANCE + 1); x++) {
            for (let z = -(RENDER_DISTANCE + 1); z <= (RENDER_DISTANCE + 1); z++) {
                const cx = currentChunkX + x; const cz = currentChunkZ + z; const cKey = this.getChunkKey(cx, cz);
                if (Math.abs(x) <= RENDER_DISTANCE && Math.abs(z) <= RENDER_DISTANCE) activeChunks.add(cKey);
                if (!this.chunkDataState.has(cKey) && !this.chunkQueue.some(c => c.key === cKey && c.type === 'data')) this.chunkQueue.push({ cx, cz, key: cKey, type: 'data' });
            }
        }

        for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
            for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
                const cx = currentChunkX + x; const cz = currentChunkZ + z; const cKey = this.getChunkKey(cx, cz);
                if (this.chunkDataState.get(cKey) === 'done' && !this.chunkMeshState.has(cKey) && !this.chunkQueue.some(c => c.key === cKey && c.type === 'mesh')) { this.chunkQueue.push({ cx, cz, key: cKey, type: 'mesh' }); }
            }
        }

        for (const [key, chunkGroup] of this.chunks.entries()) {
            if (!activeChunks.has(key)) { this.scene.remove(chunkGroup); chunkGroup.children.forEach(mesh => { if(mesh.geometry) mesh.geometry.dispose(); }); this.chunks.delete(key); this.chunkMeshState.delete(key); }
        }
        for (const key of this.chunkDataState.keys()) {
            const [cx, cz] = key.split(',').map(Number);
            if (Math.abs(cx - currentChunkX) > RENDER_DISTANCE + 2 || Math.abs(cz - currentChunkZ) > RENDER_DISTANCE + 2) { this.chunkData.delete(key); this.chunkDataState.delete(key); }
        }
    }

    processChunkQueue() {
        if (this.chunkQueue.length > 0) {
            const task = this.chunkQueue.shift();
            if (task.type === 'data' && !this.chunkDataState.has(task.key)) this.generateChunkData(task.cx, task.cz);
            else if (task.type === 'mesh' && !this.chunkMeshState.has(task.key)) this.buildChunkMesh(task.cx, task.cz);
        }
    }

    spawnNetworkedDrop(id, x, y, z, typeStr) {
        if (typeStr === 'air' || typeStr === 'water' || this.drops.some(d => d.id === id)) return;
        const geo = typeStr === 'torch' ? this.dropGeoTorch : this.dropGeoBlock;
        const mesh = new THREE.Mesh(geo, this.itemMaterials[typeStr] || this.itemMaterials['stone']);
        mesh.position.set(x + (Math.random()-0.5)*0.2, y, z + (Math.random()-0.5)*0.2);
        this.dropGroup.add(mesh);
        this.drops.push({ id: id, mesh: mesh, type: typeStr, velocityY: 4.0, pickupDelay: 1.5 });
    }

    removeNetworkedDrop(id) {
        const index = this.drops.findIndex(d => d.id === id);
        if(index !== -1) { this.dropGroup.remove(this.drops[index].mesh); this.drops[index].mesh.geometry.dispose(); this.drops.splice(index, 1); }
    }

    updateDrops(delta) {
        for (let drop of this.drops) {
            if (drop.pickupDelay > 0) drop.pickupDelay -= delta; 
            drop.mesh.rotation.y += delta * 2; drop.velocityY -= 20.0 * delta; 
            let nextY = drop.mesh.position.y + (drop.velocityY * delta);
            if (this.hasBlock(Math.round(drop.mesh.position.x), Math.round(nextY - 0.65), Math.round(drop.mesh.position.z))) { drop.velocityY = 0; drop.mesh.position.y = Math.round(nextY - 0.65) + 0.65; } else { drop.mesh.position.y = nextY; }
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i]; p.life -= delta * 1.5;
            if(p.life <= 0) { this.particleGroup.remove(p.mesh); this.particles.splice(i, 1); continue; }
            p.vel.y -= 15.0 * delta; p.mesh.position.addScaledVector(p.vel, delta); p.mesh.rotation.x += delta * 5; p.mesh.rotation.y += delta * 5; p.mesh.material.opacity = p.life;
        }
    }
}