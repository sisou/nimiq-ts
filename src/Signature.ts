import { BufferUtils } from "./BufferUtils";
import { PrivateKey } from "./PrivateKey";
import { PublicKey } from "./PublicKey";
import { SerialBuffer } from "./SerialBuffer";
import { Serializable } from "./Serializable";
import { WasmHelper } from "./WasmHelper";

export class Signature extends Serializable {
	static SIZE = 64;

    static copy(o: Signature): Signature {
        if (!o) return o;
        const obj = new Uint8Array(o._obj);
        return new Signature(obj);
    }

	private _obj: Uint8Array;

    constructor(arg: Uint8Array) {
        super();
        if (!(arg instanceof Uint8Array)) throw new Error('Primitive: Invalid type');
        if (arg.length !== Signature.SIZE) throw new Error('Primitive: Invalid length');
        this._obj = arg;
    }

    static create(privateKey: PrivateKey, publicKey: PublicKey, data: Uint8Array): Signature {
        return new Signature(Signature._signatureCreate(privateKey.serialize(), publicKey.serialize(), data));
    }

    // static fromPartialSignatures(commitment: Commitment, signatures: PartialSignature[]): Signature { // TODO: Commitment, PartialSignature
    //     const raw = Signature._combinePartialSignatures(commitment.serialize(), signatures.map(s => s.serialize()));
    //     return new Signature(raw);
    // }

    static unserialize(buf: SerialBuffer): Signature {
        return new Signature(buf.read(Signature.SIZE));
    }

    static fromAny(o: Signature | Uint8Array | string): Signature {
        if (!o) throw new Error('Invalid signature format');
        if (o instanceof Signature) return o;
        try {
            return new Signature(BufferUtils.fromAny(o, Signature.SIZE));
        } catch (e) {
            throw new Error('Invalid signature format');
        }
    }

    serialize(buf?: SerialBuffer): SerialBuffer {
        buf = buf || new SerialBuffer(this.serializedSize);
        buf.write(this._obj);
        return buf;
    }

    get serializedSize(): number {
        return Signature.SIZE;
    }

    verify(publicKey: PublicKey, data: Uint8Array): boolean {
        return Signature._signatureVerify(publicKey.serialize(), data, this._obj);
    }

    equals(o: unknown): boolean {
        return o instanceof Signature && super.equals(o);
    }

    // private static _combinePartialSignatures(combinedCommitment: Uint8Array, partialSignatures: Uint8Array[]): Uint8Array {
    //     const combinedSignature = Signature._aggregatePartialSignatures(partialSignatures);
    //     return BufferUtils.concatTypedArrays(combinedCommitment, combinedSignature);
    // }

    // private static _aggregatePartialSignatures(partialSignatures: Uint8Array[]): Uint8Array {
    //     return partialSignatures.reduce((sigA, sigB) => Signature._scalarsAdd(sigA, sigB));
    // }

    // private static _scalarsAdd(a: Uint8Array, b: Uint8Array): Uint8Array {
    //     if (a.byteLength !== PartialSignature.SIZE || b.byteLength !== PartialSignature.SIZE) { // TODO: PartialSignature
    //         throw Error('Wrong buffer size.');
    //     }
	// 	const Module = WasmHelper.Module;
	// 	let stackPtr;
	// 	try {
	// 		stackPtr = Module.stackSave();
	// 		const wasmOutSum = Module.stackAlloc(PartialSignature.SIZE);
	// 		const wasmInA = Module.stackAlloc(a.length);
	// 		const wasmInB = Module.stackAlloc(b.length);
	// 		new Uint8Array(Module.HEAPU8.buffer, wasmInA, a.length).set(a);
	// 		new Uint8Array(Module.HEAPU8.buffer, wasmInB, b.length).set(b);
	// 		Module._ed25519_add_scalars(wasmOutSum, wasmInA, wasmInB);
	// 		const sum = new Uint8Array(PartialSignature.SIZE);
	// 		sum.set(new Uint8Array(Module.HEAPU8.buffer, wasmOutSum, PartialSignature.SIZE));
	// 		return sum;
	// 	} catch (e) {
	// 		// Log.w(Signature, e); // TODO: Log
	// 		throw e;
	// 	} finally {
	// 		if (stackPtr !== undefined) Module.stackRestore(stackPtr);
	// 	}
    // }

    static _signatureCreate(privateKey: Uint8Array, publicKey: Uint8Array, message: Uint8Array): Uint8Array {
        if (publicKey.byteLength !== PublicKey.SIZE
            || privateKey.byteLength !== PrivateKey.SIZE) {
            throw Error('Wrong buffer size.');
        }
		const Module = WasmHelper.Module;
		let stackPtr;
		try {
			stackPtr = Module.stackSave();
			const wasmOutSignature = Module.stackAlloc(Signature.SIZE);
			const signatureBuffer = new Uint8Array(Module.HEAP8.buffer, wasmOutSignature, Signature.SIZE);
			const wasmInMessage = Module.stackAlloc(message.length);
			new Uint8Array(Module.HEAP8.buffer, wasmInMessage, message.length).set(message);
			const wasmInPubKey = Module.stackAlloc(publicKey.length);
			new Uint8Array(Module.HEAP8.buffer, wasmInPubKey, publicKey.length).set(publicKey);
			const wasmInPrivKey = Module.stackAlloc(privateKey.length);
			const privKeyBuffer = new Uint8Array(Module.HEAP8.buffer, wasmInPrivKey, privateKey.length);
			privKeyBuffer.set(privateKey);

			Module._ed25519_sign(wasmOutSignature, wasmInMessage, message.byteLength, wasmInPubKey, wasmInPrivKey);
			privKeyBuffer.fill(0);

			const signature = new Uint8Array(Signature.SIZE);
			signature.set(signatureBuffer);
			return signature;
		} catch (e) {
			// Log.w(Signature, e); // TODO: Log
			throw e;
		} finally {
			if (stackPtr !== undefined) Module.stackRestore(stackPtr);
		}
    }

    static _signatureVerify(publicKey: Uint8Array, message: Uint8Array, signature: Uint8Array): boolean {
		const Module = WasmHelper.Module;
		let stackPtr;
		try {
			stackPtr = Module.stackSave();
			const wasmInPubKey = Module.stackAlloc(publicKey.length);
			new Uint8Array(Module.HEAP8.buffer, wasmInPubKey, publicKey.length).set(publicKey);
			const wasmInMessage = Module.stackAlloc(message.length);
			new Uint8Array(Module.HEAP8.buffer, wasmInMessage, message.length).set(message);
			const wasmInSignature = Module.stackAlloc(signature.length);
			new Uint8Array(Module.HEAP8.buffer, wasmInSignature, signature.length).set(signature);

			return !!Module._ed25519_verify(wasmInSignature, wasmInMessage, message.byteLength, wasmInPubKey);
		} catch (e) {
			// Log.w(Signature, e); // TODO: Log
			throw e;
		} finally {
			if (stackPtr !== undefined) Module.stackRestore(stackPtr);
		}
	}
}
