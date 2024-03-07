export class Policy {
	/**
	 * Targeted block time in seconds.
	 */
	static BLOCK_TIME: number = 60;

	/**
	 * Maximum block size in bytes.
	 */
	static BLOCK_SIZE_MAX: number = 1e5; // 100 kb

	/**
	 * The highest (easiest) block PoW target.
	 */
	static BLOCK_TARGET_MAX: bigint = BigInt(2) ** BigInt(240);

	/**
	 * Number of blocks we take into account to calculate next difficulty.
	 */
	static DIFFICULTY_BLOCK_WINDOW: number = 120;

	/**
	 * Limits the rate at which the difficulty is adjusted min/max.
	 */
	static DIFFICULTY_MAX_ADJUSTMENT_FACTOR = 2;

	/**
	 * Number of blocks a transaction is valid.
	 */
	static TRANSACTION_VALIDITY_WINDOW: number = 120;


	/* Supply & Emission Parameters */

	/**
	 * Number of Satoshis per Nimiq.
	 */
	static LUNAS_PER_COIN: number = 1e5;

	/**
	 * Targeted total supply in lunas.
	 */
	static TOTAL_SUPPLY: number = 21e14;

	/**
	 * Initial supply before genesis block in lunas.
	 */
	static INITIAL_SUPPLY: number = 252000000000000;

	/**
	 * Emission speed.
	 */
	static EMISSION_SPEED: number = Math.pow(2, 22);

	/**
	 * First block using constant tail emission until total supply is reached.
	 */
	static EMISSION_TAIL_START: number = 48692960;

	/**
	 * Constant tail emission in lunas until total supply is reached.
	 */
	static EMISSION_TAIL_REWARD: number = 4000;

	/* Security parameters */

	/**
	 * NIPoPoW Security parameter M
	 * FIXME naming
	 */
	static M: number = 240;

	/**
	 * NIPoPoW Security parameter K
	 * FIXME naming
	 */
	static K: number = 120;

	/**
	 * NIPoPoW Security parameter DELTA
	 * FIXME naming
	 */
	static DELTA: number = 0.15;

	/**
	 * Number of blocks the light client downloads to verify the AccountsTree construction.
	 * FIXME naming
	 */
	static NUM_BLOCKS_VERIFICATION: number = 250;


	/* Snapshot Parameters */

	/**
	 * Maximum number of snapshots.
	 */
	static NUM_SNAPSHOTS_MAX: number = 20;

	/**
	 * Stores the circulating supply before the given block.
	 */
	private static _supplyCache = new Map<number, number>();
	private static _supplyCacheMax = 0; // blocks
	private static _supplyCacheInterval = 5000; // blocks

    /**
     * Convert Nimiq decimal to Number of Satoshis.
     */
    static coinsToLunas(coins: number): number {
        return Math.round(coins * Policy.LUNAS_PER_COIN);
    }

    /**
     * Convert Number of Satoshis to Nimiq decimal.
     */
    static lunasToCoins(lunas: number): number {
        return lunas / Policy.LUNAS_PER_COIN;
    }

    /** @deprecated Use coinsToLunas instead */
    static coinsToSatoshis(coins: number): number {
        return Policy.coinsToLunas(coins);
    }

    /** @deprecated Use lunasToCoins instead */
    static satoshisToCoins(satoshis: number): number {
        return Policy.lunasToCoins(satoshis);
    }

    /** @deprecated Use LUNAS_PER_COIN instead */
    static get SATOSHIS_PER_COIN(): number {
        return Policy.LUNAS_PER_COIN;
    }

    /**
     * Circulating supply after block.
     */
    static supplyAfter(blockHeight: number): number {
        // Calculate last entry in supply cache that is below blockHeight.
        let startHeight = Math.floor(blockHeight / Policy._supplyCacheInterval) * Policy._supplyCacheInterval;
        startHeight = Math.max(0, Math.min(startHeight, Policy._supplyCacheMax));

        // Calculate respective block for the last entry of the cache and the targeted height.
        const startI = startHeight / Policy._supplyCacheInterval;
        const endI = Math.floor(blockHeight / Policy._supplyCacheInterval);

        // The starting supply is the initial supply at the beginning and a cached value afterwards.
        let supply = startHeight === 0 ? Policy.INITIAL_SUPPLY : Policy._supplyCache.get(startHeight)!;
        // Use and update cache.
        for (let i = startI; i < endI; ++i) {
            startHeight = i * Policy._supplyCacheInterval;
            // Since the cache stores the supply *before* a certain block, subtract one.
            const endHeight = (i + 1) * Policy._supplyCacheInterval - 1;
            supply = Policy._supplyAfter(supply, endHeight, startHeight);
            // Don't forget to add one again.
            Policy._supplyCache.set(endHeight + 1, supply);
            Policy._supplyCacheMax = endHeight + 1;
        }

        // Calculate remaining supply (this also adds the block reward for endI*interval).
        return Policy._supplyAfter(supply, blockHeight, endI * Policy._supplyCacheInterval);
    }

    /**
     * Circulating supply after block.
     */
    private static _supplyAfter(initialSupply: number, blockHeight: number, startHeight = 0): number {
        let supply = initialSupply;
        for (let i = startHeight; i <= blockHeight; ++i) {
            supply += Policy._blockRewardAt(supply, i);
        }
        return supply;
    }

    /**
     * Miner reward per block.
     */
    static blockRewardAt(blockHeight: number): number {
        const currentSupply = Policy.supplyAfter(blockHeight - 1);
        return Policy._blockRewardAt(currentSupply, blockHeight);
    }

    /**
     * Miner reward per block.
     */
    private static _blockRewardAt(currentSupply: number, blockHeight: number): number {
        if (blockHeight <= 0) return 0;
        const remaining = Policy.TOTAL_SUPPLY - currentSupply;
        if (blockHeight >= Policy.EMISSION_TAIL_START && remaining >= Policy.EMISSION_TAIL_REWARD) {
            return Policy.EMISSION_TAIL_REWARD;
        }
        const remainder = remaining % Policy.EMISSION_SPEED;
        return (remaining - remainder) / Policy.EMISSION_SPEED;
    }
}
