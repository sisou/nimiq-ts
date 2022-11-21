import { BufferUtils } from "./BufferUtils";
import { CryptoWorker } from "./CryptoWorker";
import { SerialBuffer } from "./SerialBuffer";
import { Serializable } from "./Serializable";
import { WasmHelper } from "./WasmHelper";

class Hash extends Serializable {
    static SIZE = new Map<Hash.Algorithm, number>();
    static NULL: Hash;

    private _obj: Uint8Array;
    private _algorithm: Hash.Algorithm;

    constructor(arg?: Uint8Array, algorithm: Hash.Algorithm = Hash.Algorithm.BLAKE2B) {
        if (arg === null) {
            arg = new Uint8Array(Hash.getSize(algorithm));
        } else {
            if (!(arg instanceof Uint8Array)) throw new Error('Primitive: Invalid type');
            if (arg.length !== Hash.getSize(algorithm)) throw new Error('Primitive: Invalid length');
        }
        super();
        this._obj = arg;
        this._algorithm = algorithm;
    }

    /** @deprecated */
    static light(arr: Uint8Array): Hash {
        return Hash.blake2b(arr);
    }

    static blake2b(arr: Uint8Array): Hash {
        return new Hash(Hash.computeBlake2b(arr), Hash.Algorithm.BLAKE2B);
    }

    /** @deprecated */
    static hard(arr: Uint8Array): Promise<Hash> {
        return Hash.argon2d(arr);
    }

    static async argon2d(arr: Uint8Array): Promise<Hash> {
        return new Hash(await (await CryptoWorker.getInstanceAsync()).computeArgon2d(arr), Hash.Algorithm.ARGON2D);
    }

    static sha256(arr: Uint8Array): Hash {
        return new Hash(Hash.computeSha256(arr), Hash.Algorithm.SHA256);
    }

    static sha512(arr: Uint8Array): Hash {
        return new Hash(Hash.computeSha512(arr), Hash.Algorithm.SHA512);
    }

    static compute(arr: Uint8Array, algorithm: Hash.Algorithm): Hash {
        // !! The algorithms supported by this function are the allowed hash algorithms for HTLCs !!
        switch (algorithm) {
            case Hash.Algorithm.BLAKE2B: return Hash.blake2b(arr);
            case Hash.Algorithm.SHA256: return Hash.sha256(arr);
            // Hash.Algorithm.SHA512 postponed until hard-fork
            // Hash.Algorithm.ARGON2 intentionally omitted
            default: throw new Error('Invalid hash algorithm');
        }
    }

    static unserialize(buf: SerialBuffer, algorithm: Hash.Algorithm = Hash.Algorithm.BLAKE2B): Hash {
        return new Hash(buf.read(Hash.getSize(algorithm)), algorithm);
    }

    serialize(buf?: SerialBuffer): SerialBuffer {
        buf = buf || new SerialBuffer(this.serializedSize);
        buf.write(this._obj);
        return buf;
    }

    subarray(begin?: number, end?: number): Uint8Array {
        return this._obj.subarray(begin, end);
    }

    get serializedSize(): number {
        return Hash.SIZE.get(this._algorithm)!;
    }

    get array(): Uint8Array {
        return this._obj;
    }

    get algorithm(): Hash.Algorithm {
        return this._algorithm;
    }

    equals(o: unknown): boolean {
        return o instanceof Hash && o._algorithm === this._algorithm && super.equals(o);
    }

    static fromAny(hash: Hash | Uint8Array | string, algorithm: Hash.Algorithm = Hash.Algorithm.BLAKE2B): Hash {
        if (hash instanceof Hash) return hash;
        try {
            return new Hash(BufferUtils.fromAny(hash, Hash.SIZE.get(algorithm)), algorithm);
        } catch (e) {
            throw new Error('Invalid hash format');
        }
    }

    toPlain(): string {
        return this.toHex();
    }

    static fromBase64(base64: string): Hash {
        return new Hash(BufferUtils.fromBase64(base64));
    }

    static fromHex(hex: string): Hash {
        return new Hash(BufferUtils.fromHex(hex));
    }

    static fromPlain(str: string): Hash {
        return Hash.fromString(str);
    }

    static fromString(str: string): Hash {
        try {
            return Hash.fromHex(str);
        } catch (e) {
            // Ignore
        }

        try {
            return Hash.fromBase64(str);
        } catch (e) {
            // Ignore
        }

        throw new Error('Invalid hash format');
    }

    static isHash(o: unknown): o is Hash {
        return o instanceof Hash;
    }

    static getSize(algorithm: Hash.Algorithm): number {
        const size = Hash.SIZE.get(algorithm);
        if (typeof size !== 'number') throw new Error('Invalid hash algorithm');
        return size;
    }

    static computeBlake2b(input: Uint8Array): Uint8Array {
        const Module = WasmHelper.Module;
        let stackPtr;
        try {
            stackPtr = Module.stackSave();
            const hashSize = Hash.getSize(Hash.Algorithm.BLAKE2B);
            const wasmOut = Module.stackAlloc(hashSize);
            const wasmIn = Module.stackAlloc(input.length);
            new Uint8Array(Module.HEAPU8.buffer, wasmIn, input.length).set(input);
            const res = Module._nimiq_blake2(wasmOut, wasmIn, input.length);
            if (res !== 0) {
                throw res;
            }
            const hash = new Uint8Array(hashSize);
            hash.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, hashSize));
            return hash;
        } catch (e) {
            // Log.w(Hash, e); // TODO Log
            throw e;
        } finally {
            if (stackPtr !== undefined) Module.stackRestore(stackPtr);
        }
    }

    static computeSha256(input: Uint8Array): Uint8Array {
        const Module = WasmHelper.Module;
        let stackPtr;
        try {
            stackPtr = Module.stackSave();
            const hashSize = Hash.getSize(Hash.Algorithm.SHA256);
            const wasmOut = Module.stackAlloc(hashSize);
            const wasmIn = Module.stackAlloc(input.length);
            new Uint8Array(Module.HEAPU8.buffer, wasmIn, input.length).set(input);
            Module._nimiq_sha256(wasmOut, wasmIn, input.length);
            const hash = new Uint8Array(hashSize);
            hash.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, hashSize));
            return hash;
        } catch (e) {
            // Log.w(Hash, e); // TODO Log
            throw e;
        } finally {
            if (stackPtr !== undefined) Module.stackRestore(stackPtr);
        }
    }

    static computeSha512(input: Uint8Array): Uint8Array {
        const Module = WasmHelper.Module;
        let stackPtr;
        try {
            stackPtr = Module.stackSave();
            const hashSize = Hash.getSize(Hash.Algorithm.SHA512);
            const wasmOut = Module.stackAlloc(hashSize);
            const wasmIn = Module.stackAlloc(input.length);
            new Uint8Array(Module.HEAPU8.buffer, wasmIn, input.length).set(input);
            Module._nimiq_sha512(wasmOut, wasmIn, input.length);
            const hash = new Uint8Array(hashSize);
            hash.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, hashSize));
            return hash;
        } catch (e) {
            // Log.w(Hash, e); // TODO Log
            throw e;
        } finally {
            if (stackPtr !== undefined) Module.stackRestore(stackPtr);
        }
    }
}

namespace Hash {
    export enum Algorithm {
        BLAKE2B = 1,
        ARGON2D = 2,
        SHA256 = 3,
        SHA512 = 4,
    }

    export namespace Algorithm {
        export function toString(hashAlgorithm: Hash.Algorithm): string {
            switch (hashAlgorithm) {
                case Hash.Algorithm.BLAKE2B: return 'blake2b';
                case Hash.Algorithm.ARGON2D: return 'argon2d';
                case Hash.Algorithm.SHA256: return 'sha256';
                case Hash.Algorithm.SHA512: return 'sha512';
                default: throw new Error('Invalid hash algorithm');
            }
        }
        export function fromAny(algorithm: unknown): Hash.Algorithm {
            if (typeof algorithm === 'number' && Hash.SIZE.has(algorithm)) return algorithm;
            switch (algorithm) {
                case 'blake2b': return Hash.Algorithm.BLAKE2B;
                case 'argon2d': return Hash.Algorithm.ARGON2D;
                case 'sha256': return Hash.Algorithm.SHA256;
                case 'sha512': return Hash.Algorithm.SHA512;
                default: throw new Error('Invalid hash algorithm');
            }
        }
    }
}

Hash.SIZE.set(Hash.Algorithm.BLAKE2B, 32);
Hash.SIZE.set(Hash.Algorithm.ARGON2D, 32);
Hash.SIZE.set(Hash.Algorithm.SHA256, 32);
Hash.SIZE.set(Hash.Algorithm.SHA512, 64);

// Must be set after the Hash.SIZE map has been created, because the constructor depends on Hash.SIZE
Hash.NULL = new Hash(new Uint8Array(32));

export { Hash };
