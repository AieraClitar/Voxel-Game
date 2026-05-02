export class SimpleNoise {
    constructor(seed = 1) {
        this.seed = seed;
    }

    random(x, z) {
        let n = x * 331 + z * 337 + this.seed;
        n = (n << 13) ^ n;
        return (1.0 - ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824.0);
    }

    // Basic Bilinear interpolation noise for hills
    getNoise(x, z) {
        const intX = Math.floor(x);
        const intZ = Math.floor(z);
        const fractX = x - intX;
        const fractZ = z - intZ;

        const v1 = this.random(intX, intZ);
        const v2 = this.random(intX + 1, intZ);
        const v3 = this.random(intX, intZ + 1);
        const v4 = this.random(intX + 1, intZ + 1);

        const i1 = v1 * (1 - fractX) + v2 * fractX;
        const i2 = v3 * (1 - fractX) + v4 * fractX;

        return i1 * (1 - fractZ) + i2 * fractZ;
    }
}