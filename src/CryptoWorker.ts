import { Hash } from "./Hash";
import { SerialBuffer } from "./SerialBuffer";
import { WasmHelper } from "./WasmHelper";

/**
 * @interface
 */
export abstract class CryptoWorker {
	private static _workerAsync: CryptoWorker | null = null

    static async getInstanceAsync(): Promise<CryptoWorker> {
        if (!CryptoWorker._workerAsync) {
			CryptoWorker._workerAsync = new CryptoWorkerImpl();
        }
        return CryptoWorker._workerAsync;
    }

    abstract computeArgon2d(input: Uint8Array): Promise<Uint8Array>;

    abstract computeArgon2dBatch(inputs: Uint8Array[]): Promise<Uint8Array[]>;

    /** @deprecated */
    abstract kdfLegacy(key: Uint8Array, salt: Uint8Array, iterations: number, outputSize: number): Promise<Uint8Array>;

    abstract kdf(key: Uint8Array, salt: Uint8Array, iterations: number, outputSize: number): Promise<Uint8Array>;

    // abstract blockVerify(
	// 	block: Uint8Array,
	// 	transactionValid: boolean[],
	// 	timeNow: number,
	// 	genesisHash: Uint8Array,
	// 	networkId: number,
	// ): Promise<{
	// 	valid: boolean,
	// 	pow: SerialBuffer,
	// 	interlinkHash: SerialBuffer,
	// 	bodyHash: SerialBuffer,
	// }>;
}

class CryptoWorkerImpl extends CryptoWorker {
    async computeArgon2d(input: Uint8Array): Promise<Uint8Array> {
		let stackPtr;
		const Module = WasmHelper.Module;
		try {
			stackPtr = Module.stackSave();
			const hashSize = Hash.getSize(Hash.Algorithm.ARGON2D);
			const wasmOut = Module.stackAlloc(hashSize);
			const wasmIn = Module.stackAlloc(input.length);
			new Uint8Array(Module.HEAPU8.buffer, wasmIn, input.length).set(input);
			const res = Module._nimiq_argon2(wasmOut, wasmIn, input.length, 512);
			if (res !== 0) {
				throw res;
			}
			const hash = new Uint8Array(hashSize);
			hash.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, hashSize));
			return hash;
		} catch (e) {
			// Log.w(CryptoWorkerImpl, e); // TODO Log
			throw e;
		} finally {
			if (stackPtr !== undefined) Module.stackRestore(stackPtr);
		}
	}

    async computeArgon2dBatch(inputs: Uint8Array[]): Promise<Uint8Array[]> {
        const hashes = [];
		let stackPtr;
		const Module = WasmHelper.Module;
		try {
			stackPtr = Module.stackSave();
			const hashSize = Hash.getSize(Hash.Algorithm.ARGON2D);
			const wasmOut = Module.stackAlloc(hashSize);
			const stackTmp = Module.stackSave();
			for (const input of inputs) {
				Module.stackRestore(stackTmp);
				const wasmIn = Module.stackAlloc(input.length);
				new Uint8Array(Module.HEAPU8.buffer, wasmIn, input.length).set(input);
				const res = Module._nimiq_argon2(wasmOut, wasmIn, input.length, 512);
				if (res !== 0) {
					throw res;
				}
				const hash = new Uint8Array(hashSize);
				hash.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, hashSize));
				hashes.push(hash);
			}
			return hashes;
		} catch (e) {
			// Log.w(CryptoWorkerImpl, e); // TODO Log
			throw e;
		} finally {
			if (stackPtr !== undefined) Module.stackRestore(stackPtr);
		}
	}

    /** @deprecated */
    async kdfLegacy(key: Uint8Array, salt: Uint8Array, iterations: number, outputSize: number = Hash.getSize(Hash.Algorithm.ARGON2D)): Promise<Uint8Array> {
		let stackPtr;
		const Module = WasmHelper.Module;
		try {
			stackPtr = Module.stackSave();
			const wasmOut = Module.stackAlloc(outputSize);
			const wasmIn = Module.stackAlloc(key.length);
			new Uint8Array(Module.HEAPU8.buffer, wasmIn, key.length).set(key);
			const wasmSalt = Module.stackAlloc(salt.length);
			new Uint8Array(Module.HEAPU8.buffer, wasmSalt, salt.length).set(salt);
			const res = Module._nimiq_kdf_legacy(wasmOut, outputSize, wasmIn, key.length, wasmSalt, salt.length, 512, iterations);
			if (res !== 0) {
				throw res;
			}
			const hash = new Uint8Array(outputSize);
			hash.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, outputSize));
			return hash;
		} catch (e) {
			// Log.w(CryptoWorkerImpl, e); // TODO Log
			throw e;
		} finally {
			if (stackPtr !== undefined) Module.stackRestore(stackPtr);
		}
	}

    async kdf(key: Uint8Array, salt: Uint8Array, iterations: number, outputSize: number = Hash.getSize(Hash.Algorithm.ARGON2D)): Promise<Uint8Array> {
		let stackPtr;
		const Module = WasmHelper.Module;
		try {
			stackPtr = Module.stackSave();
			const wasmOut = Module.stackAlloc(outputSize);
			const wasmIn = Module.stackAlloc(key.length);
			new Uint8Array(Module.HEAPU8.buffer, wasmIn, key.length).set(key);
			const wasmSalt = Module.stackAlloc(salt.length);
			new Uint8Array(Module.HEAPU8.buffer, wasmSalt, salt.length).set(salt);
			const res = Module._nimiq_kdf(wasmOut, outputSize, wasmIn, key.length, wasmSalt, salt.length, 512, iterations);
			if (res !== 0) {
				throw res;
			}
			const hash = new Uint8Array(outputSize);
			hash.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, outputSize));
			return hash;
		} catch (e) {
			// Log.w(CryptoWorkerImpl, e); // TODO Log
			throw e;
		} finally {
			if (stackPtr !== undefined) Module.stackRestore(stackPtr);
		}
	}

    // async blockVerify(
	// 	block: Uint8Array,
	// 	transactionValid: boolean[],
	// 	timeNow: number,
	// 	genesisHash: Uint8Array,
	// 	networkId: number,
	// ): Promise<{
	// 	valid: boolean,
	// 	pow: SerialBuffer,
	// 	interlinkHash: SerialBuffer,
	// 	bodyHash: SerialBuffer,
	// }> {
    //     // The worker only uses a stub genesis config.
    //     GenesisConfig = { // TODO GenesisConfig
    //         GENESIS_HASH: Hash.unserialize(new SerialBuffer(genesisHash)),
    //         NETWORK_ID: networkId
    //     };

    //     const block = Block.unserialize(new SerialBuffer(blockSerialized)); // TODO Block
    //     for (let i = 0; i < transactionValid.length; i++) {
    //         block.body.transactions[i]._valid = transactionValid[i];
    //     }

    //     const valid = await block._verify(timeNow);
    //     const pow = await block.header.pow();
    //     const interlinkHash = block.interlink.hash();
    //     const bodyHash = block.body.hash();
    //     return { valid: valid, pow: pow.serialize(), interlinkHash: interlinkHash.serialize(), bodyHash: bodyHash.serialize() };
    // }
}
