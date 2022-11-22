import { CryptoUtils } from "./CryptoUtils";
import { Hash } from "./Hash";
import { PublicKey } from "./PublicKey";
import { Secret } from "./Secret";
import { SerialBuffer } from "./SerialBuffer";
import { WasmHelper } from "./WasmHelper";

export class PrivateKey extends Secret {
    static SIZE = Secret.SIZE;
    static PURPOSE_ID = 0x42000001;

    private _obj: Uint8Array;

    constructor(arg: Uint8Array) {
        super(Secret.Type.PRIVATE_KEY, PrivateKey.PURPOSE_ID);
        if (!(arg instanceof Uint8Array)) throw new Error('Primitive: Invalid type');
        if (arg.length !== PrivateKey.SIZE) throw new Error('Primitive: Invalid length');
        this._obj = arg;
    }

    static generate(): PrivateKey {
        const privateKey = new Uint8Array(PrivateKey.SIZE);
        CryptoUtils.getRandomValues(privateKey);
        return new PrivateKey(privateKey);
    }

    static unserialize(buf: SerialBuffer): PrivateKey {
        return new PrivateKey(buf.read(PrivateKey.SIZE));
    }

    serialize(buf?: SerialBuffer): SerialBuffer {
        buf = buf || new SerialBuffer(this.serializedSize);
        buf.write(this._obj);
        return buf;
    }

    get serializedSize(): number {
        return PrivateKey.SIZE;
    }

    /**
     * Overwrite this private key with a replacement in-memory
     */
    overwrite(privateKey: PrivateKey): void {
        this._obj.set(privateKey._obj);
    }

    equals(o: unknown): boolean {
        return o instanceof PrivateKey && super.equals(o);
    }

    static _privateKeyDelinearize(privateKey: Uint8Array, publicKey: Uint8Array, publicKeysHash: Uint8Array): Uint8Array {
        if (privateKey.byteLength !== PrivateKey.SIZE
            || publicKey.byteLength !== PublicKey.SIZE
            || publicKeysHash.byteLength !== Hash.getSize(Hash.Algorithm.SHA512)) {
            throw Error('Wrong buffer size.');
        }
        const Module = WasmHelper.Module;
        let stackPtr;
        try {
            stackPtr = Module.stackSave();
            const wasmOut = Module.stackAlloc(PublicKey.SIZE);
            const wasmInPrivateKey = Module.stackAlloc(privateKey.length);
            const wasmInPublicKey = Module.stackAlloc(publicKey.length);
            const wasmInPublicKeysHash = Module.stackAlloc(publicKeysHash.length);
            new Uint8Array(Module.HEAPU8.buffer, wasmInPrivateKey, privateKey.length).set(privateKey);
            new Uint8Array(Module.HEAPU8.buffer, wasmInPublicKey, publicKey.length).set(publicKey);
            new Uint8Array(Module.HEAPU8.buffer, wasmInPublicKeysHash, publicKeysHash.length).set(publicKeysHash);
            Module._ed25519_derive_delinearized_private_key(wasmOut, wasmInPublicKeysHash, wasmInPublicKey, wasmInPrivateKey);
            const delinearizedPrivateKey = new Uint8Array(PrivateKey.SIZE);
            delinearizedPrivateKey.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, PrivateKey.SIZE));
            return delinearizedPrivateKey;
        } catch (e) {
            // Log.w(CryptoWorkerImpl, e); // TODO Log
            throw e;
        } finally {
            if (stackPtr !== undefined) Module.stackRestore(stackPtr);
        }
    }
}
