import { Account } from "./Account";
import { Address } from "./Address";
import { Assert } from "./Assert";
import { GenesisConfig } from "./GenesisConfig";
import { PublicKey } from "./PublicKey";
import { SerialBuffer } from "./SerialBuffer";
import { Signature } from "./Signature";
import { SignatureProof } from "./SignatureProof";
import { Transaction } from "./Transaction";

export class BasicTransaction extends Transaction {
	private _signatureProof: SignatureProof;

    constructor(
		senderPubKey: PublicKey,
		recipient: Address,
		value: number,
		fee: number,
		validityStartHeight: number,
		signature?: Signature,
		networkId?: number,
	) {
        if (!(senderPubKey instanceof PublicKey)) throw new Error('Malformed senderPubKey');
        // Signature may be initially empty and can be set later.
        if (signature !== undefined && !(signature instanceof Signature)) throw new Error('Malformed signature');

        const proof = SignatureProof.singleSig(senderPubKey, signature);
        super(Transaction.Format.BASIC, senderPubKey.toAddress(), Account.Type.BASIC, recipient, Account.Type.BASIC, value, fee, validityStartHeight, Transaction.Flag.NONE, new Uint8Array(0), proof.serialize(), networkId);

        this._signatureProof = proof;
    }

    static unserialize(buf: SerialBuffer): Transaction {
        const type = buf.readUint8();
        Assert.that(type === Transaction.Format.BASIC);

        const senderPubKey = PublicKey.unserialize(buf);
        const recipient = Address.unserialize(buf);
        const value = buf.readUint64();
        const fee = buf.readUint64();
        const validityStartHeight = buf.readUint32();
        const networkId = buf.readUint8();
        const signature = Signature.unserialize(buf);
        return new BasicTransaction(senderPubKey, recipient, value, fee, validityStartHeight, signature, networkId);
    }

    static fromPlain(plain: Record<string, any>): BasicTransaction {
        if (!plain) throw new Error('Invalid transaction format');
        return new BasicTransaction(
            PublicKey.fromAny(plain.proof.publicKey || plain.senderPubKey),
            Address.fromAny(plain.recipient),
            plain.value,
            plain.fee,
            plain.validityStartHeight,
            Signature.fromAny(plain.proof.signature || plain.signature),
            GenesisConfig.networkIdFromAny(plain.network || plain.networkId)
        );
    }

    serialize(buf?: SerialBuffer): SerialBuffer {
        buf = buf || new SerialBuffer(this.serializedSize);
        buf.writeUint8(Transaction.Format.BASIC);
        this.senderPubKey.serialize(buf);
        this._recipient.serialize(buf);
        buf.writeUint64(this._value);
        buf.writeUint64(this._fee);
        buf.writeUint32(this._validityStartHeight);
        buf.writeUint8(this._networkId);
        if (this.signature) this.signature.serialize(buf);
        return buf;
    }

    get serializedSize(): number {
        return /*type*/ 1
            + this.senderPubKey.serializedSize
            + this._recipient.serializedSize
            + /*value*/ 8
            + /*fee*/ 8
            + /*validityStartHeight*/ 4
            + /*networkId*/ 1
            + (this.signature ? this.signature.serializedSize : 0);
    }

    get senderPubKey(): PublicKey {
        return this._signatureProof.publicKey;
    }

    get signature(): Signature | undefined {
        return this._signatureProof.signature;
    }

    set signature(signature: Signature | undefined) {
        this._signatureProof.signature = signature;
        this._proof = this._signatureProof.serialize();
    }
}

Transaction.FORMAT_MAP.set(Transaction.Format.BASIC, BasicTransaction);
