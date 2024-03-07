import { Commitment } from "./Commitment";
import { PrivateKey } from "./PrivateKey";
import { PublicKey } from "./PublicKey";
import { RandomSecret } from "./RandomSecret";
import { SerialBuffer } from "./SerialBuffer";
import { Serializable } from "./Serializable";
import { WasmHelper } from "./WasmHelper";

export class PartialSignature extends Serializable {
	static SIZE = 32;

	private _obj: Uint8Array;

    constructor(arg: Uint8Array) {
        super();
        if (!(arg instanceof Uint8Array)) throw new Error('Primitive: Invalid type');
        if (arg.length !== PartialSignature.SIZE) throw new Error('Primitive: Invalid length');
        this._obj = arg;
    }

    static create(
		privateKey: PrivateKey,
		publicKey: PublicKey,
		publicKeys: PublicKey[],
		secret: RandomSecret,
		aggregateCommitment: Commitment,
		data: Uint8Array,
	): PartialSignature {
        const raw = PartialSignature._delinearizedPartialSignatureCreate(
			publicKeys.map(o => o.serialize()),
			privateKey.serialize(),
            publicKey.serialize(),
			secret.serialize(),
			aggregateCommitment.serialize(),
			data,
		);
        return new PartialSignature(raw);
    }

    static unserialize(buf: SerialBuffer): PartialSignature {
        return new PartialSignature(buf.read(PartialSignature.SIZE));
    }

    serialize(buf?: SerialBuffer): SerialBuffer {
        buf = buf || new SerialBuffer(this.serializedSize);
        buf.write(this._obj);
        return buf;
    }

    get serializedSize(): number {
        return PartialSignature.SIZE;
    }

    override equals(o: unknown): boolean {
        return o instanceof PartialSignature && super.equals(o);
    }

    static _delinearizedPartialSignatureCreate(
		publicKeys: Uint8Array[],
		privateKey: Uint8Array,
		publicKey: Uint8Array,
		secret: Uint8Array,
		aggregateCommitment: Uint8Array,
		message: Uint8Array,
	): Uint8Array {
        if (publicKeys.some(publicKey => publicKey.byteLength !== PublicKey.SIZE)
            || privateKey.byteLength !== PrivateKey.SIZE
            || publicKey.byteLength !== PublicKey.SIZE
            || secret.byteLength !== RandomSecret.SIZE
            || aggregateCommitment.byteLength !== Commitment.SIZE) {
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
			const wasmOut = Module.stackAlloc(PartialSignature.SIZE);
			const wasmInPublicKeys = Module.stackAlloc(concatenatedPublicKeys.length);
			const wasmInPrivateKey = Module.stackAlloc(privateKey.length);
			const wasmInPublicKey = Module.stackAlloc(publicKey.length);
			const wasmInSecret = Module.stackAlloc(secret.length);
			const wasmInCommitment = Module.stackAlloc(aggregateCommitment.length);
			const wasmInMessage = Module.stackAlloc(message.length);
			new Uint8Array(Module.HEAPU8.buffer, wasmInPublicKeys, concatenatedPublicKeys.length).set(concatenatedPublicKeys);
			new Uint8Array(Module.HEAPU8.buffer, wasmInPrivateKey, privateKey.length).set(privateKey);
			new Uint8Array(Module.HEAPU8.buffer, wasmInPublicKey, publicKey.length).set(publicKey);
			new Uint8Array(Module.HEAPU8.buffer, wasmInSecret, secret.length).set(secret);
			new Uint8Array(Module.HEAPU8.buffer, wasmInCommitment, aggregateCommitment.length).set(aggregateCommitment);
			new Uint8Array(Module.HEAPU8.buffer, wasmInMessage, message.length).set(message);
			Module._ed25519_delinearized_partial_sign(wasmOut, wasmInMessage, message.length, wasmInCommitment, wasmInSecret, wasmInPublicKeys, publicKeys.length, wasmInPublicKey, wasmInPrivateKey);
			const partialSignature = new Uint8Array(PartialSignature.SIZE);
			partialSignature.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, PartialSignature.SIZE));
			return partialSignature;
		} catch (e) {
			// Log.w(CryptoWorkerImpl, e); // TODO: Log
			throw e;
		} finally {
			if (stackPtr !== undefined) Module.stackRestore(stackPtr);
		}
	}
}
