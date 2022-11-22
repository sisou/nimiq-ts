import { BufferUtils } from "./BufferUtils";
import { Commitment } from "./Commitment";
import { CryptoUtils } from "./CryptoUtils";
import { RandomSecret } from "./RandomSecret";
import { SerialBuffer } from "./SerialBuffer";
import { Serializable } from "./Serializable";
import { Signature } from "./Signature";
import { WasmHelper } from "./WasmHelper";

export class CommitmentPair extends Serializable {
	static SERIALIZED_SIZE = RandomSecret.SIZE + Signature.SIZE;
	static RANDOMNESS_SIZE = 32;

	private _secret: RandomSecret;
	private _commitment: Commitment;

    constructor(secret: RandomSecret, commitment: Commitment) {
        super();
        if (!(secret instanceof RandomSecret)) throw new Error('Primitive: Invalid type');
        if (!(commitment instanceof Commitment)) throw new Error('Primitive: Invalid type');
        this._secret = secret;
        this._commitment = commitment;
    }

    static generate(): CommitmentPair {
        const randomness = new Uint8Array(CommitmentPair.RANDOMNESS_SIZE);
        CryptoUtils.getRandomValues(randomness);
        const raw = CommitmentPair._commitmentCreate(randomness);
        return new CommitmentPair(new RandomSecret(raw.secret), new Commitment(raw.commitment));
    }

    static unserialize(buf: SerialBuffer): CommitmentPair {
        const secret = RandomSecret.unserialize(buf);
        const commitment = Commitment.unserialize(buf);
        return new CommitmentPair(secret, commitment);
    }

    static fromHex(hexBuf: string): CommitmentPair {
        return this.unserialize(BufferUtils.fromHex(hexBuf));
    }

    serialize(buf?: SerialBuffer): SerialBuffer {
        buf = buf || new SerialBuffer(this.serializedSize);
        this.secret.serialize(buf);
        this.commitment.serialize(buf);
        return buf;
    }

    get secret(): RandomSecret {
        return this._secret;
    }

    get commitment(): Commitment {
        return this._commitment;
    }

    get serializedSize(): number {
        return this.secret.serializedSize + this.commitment.serializedSize;
    }

    override equals(o: unknown): boolean {
        return o instanceof CommitmentPair && super.equals(o);
    }

    static _commitmentCreate(randomness: Uint8Array): { commitment: Uint8Array, secret: Uint8Array } {
		const Module = WasmHelper.Module;
		let stackPtr;
		try {
			stackPtr = Module.stackSave();
			const wasmOutCommitment = Module.stackAlloc(Commitment.SIZE);
			const wasmOutSecret = Module.stackAlloc(Commitment.SIZE);
			const wasmIn = Module.stackAlloc(randomness.length);
			new Uint8Array(Module.HEAPU8.buffer, wasmIn, randomness.length).set(randomness);
			const res = Module._ed25519_create_commitment(wasmOutSecret, wasmOutCommitment, wasmIn);
			if (res !== 1) {
				throw new Error(`Secret must not be 0 or 1: ${res}`);
			}
			const commitment = new Uint8Array(Commitment.SIZE);
			const secret = new Uint8Array(Commitment.SIZE);
			commitment.set(new Uint8Array(Module.HEAPU8.buffer, wasmOutCommitment, Commitment.SIZE));
			secret.set(new Uint8Array(Module.HEAPU8.buffer, wasmOutSecret, Commitment.SIZE));
			return {commitment, secret};
		} catch (e) {
			// Log.w(CommitmentPair, e); // TODO: Log
			throw e;
		} finally {
			if (stackPtr !== undefined) Module.stackRestore(stackPtr);
		}
	}
}
