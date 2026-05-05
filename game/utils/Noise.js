export class SimpleNoise {
    constructor(seed = 1) {
        this.seed = seed;
    }

    random(x, z) {
        // Deterministic sine wave hash. NO BITWISE MATH for stability across environments.
        const sin = Math.sin(Math.floor(x) * 12.9898 + Math.floor(z) * 78.233 + this.seed) * 43758.5453;
        return sin - Math.floor(sin);
    }

    getNoise(x, z) {
        const intX = Math.floor(x); 
        const intZ = Math.floor(z);
        const fractX = x - intX; 
        const fractZ = z - intZ;

        const v1 = this.random(intX, intZ);
        const v2 = this.random(intX + 1, intZ);
        const v3 = this.random(intX, intZ + 1);
        const v4 = this.random(intX + 1, intZ + 1);

        // Smooth cosine interpolation
        const fX = (1 - Math.cos(fractX * Math.PI)) * 0.5;
        const fZ = (1 - Math.cos(fractZ * Math.PI)) * 0.5;

        const i1 = v1 * (1 - fX) + v2 * fX;
        const i2 = v3 * (1 - fX) + v4 * fX;

        return (i1 * (1 - fZ) + i2 * fZ) * 2.0 - 1.0; 
    }
}