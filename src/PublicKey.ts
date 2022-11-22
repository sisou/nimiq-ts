import { Address } from "./Address";
import { BufferUtils } from "./BufferUtils";
import { Hash } from "./Hash";
import { PeerId } from "./PeerId";
import { PrivateKey } from "./PrivateKey";
import { SerialBuffer } from "./SerialBuffer";
import { Serializable } from "./Serializable";
import { WasmHelper } from "./WasmHelper";

export class PublicKey extends Serializable {
    static SIZE = 32;

    static copy(o: PublicKey): PublicKey {
        if (!o) return o;
        return new PublicKey(new Uint8Array(o._obj));
    }

    private _obj: Uint8Array;

    constructor(arg: Uint8Array) {
        super();
        if (!(arg instanceof Uint8Array)) throw new Error('Primitive: Invalid type');
        if (arg.length !== PublicKey.SIZE) throw new Error('Primitive: Invalid length');
        this._obj = arg;
    }

    static derive(privateKey: PrivateKey): PublicKey {
        return new PublicKey(PublicKey._publicKeyDerive(privateKey.serialize()));
    }

    static sum(publicKeys: PublicKey[]): PublicKey {
        publicKeys = publicKeys.slice();
        publicKeys.sort((a, b) => a.compare(b));
        return PublicKey._delinearizeAndAggregatePublicKeys(publicKeys);
    }

    static unserialize(buf: SerialBuffer): PublicKey {
        return new PublicKey(buf.read(PublicKey.SIZE));
    }

    static fromAny(o: PublicKey | Uint8Array | string): PublicKey {
        if (!o) throw new Error('Invalid public key format');
        if (o instanceof PublicKey) return o;
        try {
            return new PublicKey(BufferUtils.fromAny(o, PublicKey.SIZE));
        } catch (e) {
            throw new Error('Invalid public key format');
        }
    }

    serialize(buf?: SerialBuffer): SerialBuffer {
        buf = buf || new SerialBuffer(this.serializedSize);
        buf.write(this._obj);
        return buf;
    }

    get serializedSize(): number {
        return PublicKey.SIZE;
    }

    equals(o: unknown): boolean {
        return o instanceof PublicKey && super.equals(o);
    }

    hash(): Hash {
        return Hash.blake2b(this.serialize());
    }

    compare(o: PublicKey): number {
        return BufferUtils.compare(this._obj, o._obj);
    }

    toAddress(): Address {
        return Address.fromHash(this.hash());
    }

    toPeerId(): PeerId {
        return new PeerId(this.hash().subarray(0, 16));
    }

    static _delinearizeAndAggregatePublicKeys(publicKeys: PublicKey[]): PublicKey {
        const publicKeysObj = publicKeys.map(k => k.serialize());
        const publicKeysHash = PublicKey._publicKeysHash(publicKeysObj);
        const raw = PublicKey._publicKeysDelinearizeAndAggregate(publicKeysObj, publicKeysHash);
        return new PublicKey(raw);
    }

    private static _publicKeyDerive(privateKey: Uint8Array): Uint8Array {
        if (privateKey.byteLength !== PrivateKey.SIZE) {
            throw Error('Wrong buffer size.');
        }
        const Module = WasmHelper.Module;
        let stackPtr;
        try {
            stackPtr = Module.stackSave();
            const wasmOut = Module.stackAlloc(PublicKey.SIZE);
            const pubKeyBuffer = new Uint8Array(Module.HEAP8.buffer, wasmOut, PrivateKey.SIZE);
            pubKeyBuffer.set(privateKey);
            const wasmIn = Module.stackAlloc(privateKey.length);
            const privKeyBuffer = new Uint8Array(Module.HEAP8.buffer, wasmIn, PrivateKey.SIZE);
            privKeyBuffer.set(privateKey);

            Module._ed25519_public_key_derive(wasmOut, wasmIn);
            privKeyBuffer.fill(0);
            const publicKey = new Uint8Array(PublicKey.SIZE);
            publicKey.set(pubKeyBuffer);
            return publicKey;
        } catch (e) {
            // Log.w(PublicKey, e); // TODO Log
            throw e;
        } finally {
            if (stackPtr !== undefined) Module.stackRestore(stackPtr);
        }
    }

    static _publicKeysHash(publicKeys: Uint8Array[]): Uint8Array {
        if (publicKeys.some(publicKey => publicKey.byteLength !== PublicKey.SIZE)) {
            throw Error('Wrong buffer size.');
        }
        const concatenatedPublicKeys = new Uint8Array(publicKeys.length * PublicKey.SIZE);
        for (let i = 0; i < publicKeys.length; ++i) {
            concatenatedPublicKeys.set(publicKeys[i], i * PublicKey.SIZE);
        }
        const Module = WasmHelper.Module;
        let stackPtr;
        try {
            stackPtr = Module.stackSave();
            const hashSize = Hash.getSize(Hash.Algorithm.SHA512);
            const wasmOut = Module.stackAlloc(hashSize);
            const wasmInPublicKeys = Module.stackAlloc(concatenatedPublicKeys.length);
            new Uint8Array(Module.HEAPU8.buffer, wasmInPublicKeys, concatenatedPublicKeys.length).set(concatenatedPublicKeys);
            Module._ed25519_hash_public_keys(wasmOut, wasmInPublicKeys, publicKeys.length);
            const hashedPublicKey = new Uint8Array(hashSize);
            hashedPublicKey.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, hashSize));
            return hashedPublicKey;
        } catch (e) {
            // Log.w(PublicKey, e); // TODO Log
            throw e;
        } finally {
            if (stackPtr !== undefined) Module.stackRestore(stackPtr);
        }
    }

    static _publicKeyDelinearize(publicKey: Uint8Array, publicKeysHash: Uint8Array): Uint8Array {
        if (publicKey.byteLength !== PublicKey.SIZE
            || publicKeysHash.byteLength !== Hash.getSize(Hash.Algorithm.SHA512)) {
            throw Error('Wrong buffer size.');
        }
        const Module = WasmHelper.Module;
        let stackPtr;
        try {
            stackPtr = Module.stackSave();
            const wasmOut = Module.stackAlloc(PublicKey.SIZE);
            const wasmInPublicKey = Module.stackAlloc(publicKey.length);
            const wasmInPublicKeysHash = Module.stackAlloc(publicKeysHash.length);
            new Uint8Array(Module.HEAPU8.buffer, wasmInPublicKey, publicKey.length).set(publicKey);
            new Uint8Array(Module.HEAPU8.buffer, wasmInPublicKeysHash, publicKeysHash.length).set(publicKeysHash);
            Module._ed25519_delinearize_public_key(wasmOut, wasmInPublicKeysHash, wasmInPublicKey);
            const delinearizedPublicKey = new Uint8Array(PublicKey.SIZE);
            delinearizedPublicKey.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, PublicKey.SIZE));
            return delinearizedPublicKey;
        } catch (e) {
            // Log.w(PublicKey, e); // TODO Log
            throw e;
        } finally {
            if (stackPtr !== undefined) Module.stackRestore(stackPtr);
        }
    }

    static _publicKeysDelinearizeAndAggregate(publicKeys: Uint8Array[], publicKeysHash: Uint8Array): Uint8Array{
        if (publicKeys.some(publicKey => publicKey.byteLength !== PublicKey.SIZE)
            || publicKeysHash.byteLength !== Hash.getSize(Hash.Algorithm.SHA512)) {
            throw Error('Wrong buffer size.');
        }
        const concatenatedPublicKeys = new Uint8Array(publicKeys.length * PublicKey.SIZE);
        for (let i = 0; i < publicKeys.length; ++i) {
            concatenatedPublicKeys.set(publicKeys[i], i * PublicKey.SIZE);
        }
        const Module = WasmHelper.Module;
        let stackPtr;
        try {
            stackPtr = Module.stackSave();
            const wasmOut = Module.stackAlloc(PublicKey.SIZE);
            const wasmInPublicKeys = Module.stackAlloc(concatenatedPublicKeys.length);
            const wasmInPublicKeysHash = Module.stackAlloc(publicKeysHash.length);
            new Uint8Array(Module.HEAPU8.buffer, wasmInPublicKeys, concatenatedPublicKeys.length).set(concatenatedPublicKeys);
            new Uint8Array(Module.HEAPU8.buffer, wasmInPublicKeysHash, publicKeysHash.length).set(publicKeysHash);
            Module._ed25519_aggregate_delinearized_public_keys(wasmOut, wasmInPublicKeysHash, wasmInPublicKeys, publicKeys.length);
            const aggregatePublicKey = new Uint8Array(PublicKey.SIZE);
            aggregatePublicKey.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, PublicKey.SIZE));
            return aggregatePublicKey;
        } catch (e) {
            // Log.w(PublicKey, e); // TODO Log
            throw e;
        } finally {
            if (stackPtr !== undefined) Module.stackRestore(stackPtr);
        }
    }
}
