import { Address } from "./Address";
import { MerklePath } from "./MerklePath";
import { PublicKey } from "./PublicKey";
import { SerialBuffer } from "./SerialBuffer";
import { Signature } from "./Signature";
import { Transaction } from "./Transaction";

export class SignatureProof {
    static verifyTransaction(transaction: Transaction): boolean {
		if (!transaction.proof) return false;
        try {
            const buffer = new SerialBuffer(transaction.proof);
            const proof = SignatureProof.unserialize(buffer);

            // Reject proof if it is longer than needed.
            if (buffer.readPos !== buffer.byteLength) {
                // Log.w(SignatureProof, 'Invalid SignatureProof - overlong'); // TODO: Log
                return false;
            }

            return proof.verify(transaction.sender, transaction.serializeContent());
        } catch (e) {
            // Log.w(SignatureProof, `Failed to verify transaction: ${e.message || e}`); // TODO: Log
            return false;
        }
    }

    static singleSig(publicKey: PublicKey, signature: Signature): SignatureProof {
        return new SignatureProof(publicKey, new MerklePath([]), signature);
    }

    static multiSig(signerKey: PublicKey, publicKeys: PublicKey[], signature: Signature): SignatureProof {
        const merklePath = MerklePath.compute(publicKeys, signerKey);
        return new SignatureProof(signerKey, merklePath, signature);
    }

	private _publicKey: PublicKey;
	private _merklePath: MerklePath;
	private _signature: Signature;

    constructor(publicKey: PublicKey, merklePath: MerklePath, signature: Signature) {
        if (!(publicKey instanceof PublicKey)) throw new Error('Malformed publickKey');
        if (!(merklePath instanceof MerklePath)) throw new Error('Malformed merklePath');
        if (signature && !(signature instanceof Signature)) throw new Error('Malformed signature');

        this._publicKey = publicKey;
        this._merklePath = merklePath;
        this._signature = signature;
    }

    static unserialize(buf: SerialBuffer): SignatureProof {
        const publicKey = PublicKey.unserialize(buf);
        const merklePath = MerklePath.unserialize(buf);
        const signature = Signature.unserialize(buf);
        return new SignatureProof(publicKey, merklePath, signature);
    }

    serialize(buf?: SerialBuffer): SerialBuffer {
        buf = buf || new SerialBuffer(this.serializedSize);
        this._publicKey.serialize(buf);
        this._merklePath.serialize(buf);

        // The SignatureProof is sometimes serialized before the signature is set (e.g. when creating transactions).
        // Simply don't serialize the signature if it's missing as this should never go over the wire.
        // We always expect the signature to be present when unserializing.
        if (this._signature) {
            this._signature.serialize(buf);
        }

        return buf;
    }

    get serializedSize(): number {
        return this._publicKey.serializedSize
            + this._merklePath.serializedSize
            + (this._signature ? this._signature.serializedSize : 0);
    }

    static get SINGLE_SIG_SIZE(): number {
        return PublicKey.SIZE + new MerklePath([]).serializedSize + Signature.SIZE;
    }

    equals(o: SignatureProof): boolean {
        return o instanceof SignatureProof
            && this._publicKey.equals(o._publicKey)
            && this._merklePath.equals(o._merklePath)
            && (this._signature ? this._signature.equals(o._signature) : this._signature === o._signature);
    }

    verify(sender: Address | null, data: Uint8Array): boolean {
        if (sender !== null && !this.isSignedBy(sender)) {
            // Log.w(SignatureProof, 'Invalid SignatureProof - signer does not match sender address'); // TODO: Log
            return false;
        }

        if (!this._signature) {
            // Log.w(SignatureProof, 'Invalid SignatureProof - signature is missing'); // TODO: Log
            return false;
        }

        if (!this._signature.verify(this._publicKey, data)) {
            // Log.w(SignatureProof, 'Invalid SignatureProof - signature is invalid'); // TODO: Log
            return false;
        }

        return true;
    }

    isSignedBy(sender: Address): boolean {
        const merkleRoot = this._merklePath.computeRoot(this._publicKey);
        const signerAddr = Address.fromHash(merkleRoot);
        return signerAddr.equals(sender);
    }

    get publicKey(): PublicKey {
        return this._publicKey;
    }

    get merklePath(): MerklePath {
        return this._merklePath;
    }

    get signature(): Signature {
        return this._signature;
    }

    set signature(signature: Signature) {
        this._signature = signature;
    }
}
