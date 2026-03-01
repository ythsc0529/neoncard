class SeededRNG {
    constructor(seed) {
        // Initialize with a seed, or use Date.now() if none provided
        this.seed = seed !== undefined ? seed : Date.now();
    }

    // Simple Linear Congruential Generator (LCG)
    next() {
        // Constants for the LCG (glibc)
        const a = 1103515245;
        const c = 12345;
        const m = 2 ** 31;

        this.seed = (a * this.seed + c) % m;
        return this.seed / m;
    }

    // Return a random integer between min and max (inclusive)
    nextInt(min, max) {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }

    // Return a boolean with the given true probability (0 to 1)
    nextBoolean(probability = 0.5) {
        return this.next() < probability;
    }

    // Shuffle an array in place using the seeded logic
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(this.next() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}

// Global instance for the game to use
window.GameRNG = new SeededRNG();
