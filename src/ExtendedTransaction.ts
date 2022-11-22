import { Account } from "./Account";
import { Address } from "./Address";
import { Assert } from "./Assert";
import { BufferUtils } from "./BufferUtils";
import { GenesisConfig } from "./GenesisConfig";
import { SerialBuffer } from "./SerialBuffer";
import { Transaction } from "./Transaction";

export class ExtendedTransaction extends Transaction {
    constructor(
		sender: Address,
		senderType: Account.Type,
		recipient: Address,
		recipientType: Account.Type,
		value: number,
		fee: number,
		validityStartHeight: number,
		flags: Transaction.Flag,
		data: Uint8Array,
		proof: Uint8Array = new Uint8Array(0),
		networkId?: number,
	) {
        super(Transaction.Format.EXTENDED, sender, senderType, recipient, recipientType, value, fee, validityStartHeight, flags, data, proof, networkId);
    }

    static unserialize(buf: SerialBuffer): ExtendedTransaction {
        const type = /** @type {Transaction.Format} */ buf.readUint8();
        Assert.that(type === Transaction.Format.EXTENDED);

        const dataSize = buf.readUint16();
        const data = buf.read(dataSize);
        const sender = Address.unserialize(buf);
        const senderType = /** @type {Account.Type} */ buf.readUint8();
        const recipient = Address.unserialize(buf);
        const recipientType = /** @type {Account.Type} */ buf.readUint8();
        const value = buf.readUint64();
        const fee = buf.readUint64();
        const validityStartHeight = buf.readUint32();
        const networkId = buf.readUint8();
        const flags = buf.readUint8();
        const proofSize = buf.readUint16();
        const proof = buf.read(proofSize);
        return new ExtendedTransaction(sender, senderType, recipient, recipientType, value, fee, validityStartHeight, flags, data, proof, networkId);
    }

    static fromPlain(plain: Record<string, any>): ExtendedTransaction {
        if (!plain) throw new Error('Invalid transaction format');
        return new ExtendedTransaction(
            Address.fromAny(plain.sender),
            Account.Type.fromAny(plain.senderType),
            Address.fromAny(plain.recipient),
            Account.Type.fromAny(plain.recipientType),
            plain.value,
            plain.fee,
            plain.validityStartHeight,
            plain.flags,
            BufferUtils.fromAny(plain.data.raw === undefined ? plain.data : plain.data.raw),
            BufferUtils.fromAny(plain.proof.raw === undefined ? plain.proof : plain.proof.raw),
            GenesisConfig.networkIdFromAny(plain.network || plain.networkId)
        );
    }

    serialize(buf?: SerialBuffer): SerialBuffer {
        buf = buf || new SerialBuffer(this.serializedSize);
        buf.writeUint8(Transaction.Format.EXTENDED);
        this.serializeContent(buf);
        buf.writeUint16(this._proof.byteLength);
        buf.write(this._proof);
        return buf;
    }

    get serializedSize(): number {
        return /*type*/ 1
            + this.serializedContentSize
            + /*proofSize*/ 2
            + this._proof.byteLength;
    }
}

Transaction.FORMAT_MAP.set(Transaction.Format.EXTENDED, ExtendedTransaction);
