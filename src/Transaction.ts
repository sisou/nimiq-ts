import { Account } from "./Account";
import { Address } from "./Address";
import { BufferUtils } from "./BufferUtils";
import { GenesisConfig } from "./GenesisConfig";
import { Hash } from "./Hash";
import { NumberUtils } from "./NumberUtils";
import { SerialBuffer } from "./SerialBuffer";

abstract class Transaction {
	static FORMAT_MAP = new Map<Transaction.Format, {
		unserialize: (buf: SerialBuffer) => Transaction,
		fromPlain: (plain:object) => Transaction,
	}>();

	protected _format: Transaction.Format;
	protected _sender: Address;
	protected _senderType: Account.Type;
	protected _recipient: Address;
	protected _recipientType: Account.Type;
	protected _value: number;
	protected _fee: number;
	protected _networkId: number;
	protected _validityStartHeight: number;
	protected _flags: Transaction.Flag;
	protected _data: Uint8Array;
	protected _proof?: Uint8Array;
	protected _valid?: boolean;
	protected _hash: Hash | null = null;

    constructor(
		format: Transaction.Format,
		sender: Address,
		senderType: Account.Type,
		recipient: Address,
		recipientType: Account.Type,
		value: number,
		fee: number,
		validityStartHeight: number,
		flags: Transaction.Flag,
		data: Uint8Array,
		proof?: Uint8Array,
		networkId: number = GenesisConfig.NETWORK_ID,
	) {
        if (!(sender instanceof Address)) throw new Error('Malformed sender');
        if (!NumberUtils.isUint8(senderType)) throw new Error('Malformed sender type');
        if (!(recipient instanceof Address)) throw new Error('Malformed recipient');
        if (!NumberUtils.isUint8(recipientType)) throw new Error('Malformed recipient type');
        if (!NumberUtils.isUint64(value) || value === 0) throw new Error('Malformed value');
        if (!NumberUtils.isUint64(fee)) throw new Error('Malformed fee');
        if (!NumberUtils.isUint32(validityStartHeight)) throw new Error('Malformed validityStartHeight');
        if (!NumberUtils.isUint8(flags) && (flags & ~(Transaction.Flag.ALL)) > 0) throw new Error('Malformed flags');
        if (!(data instanceof Uint8Array) || !(NumberUtils.isUint16(data.byteLength))) throw new Error('Malformed data');
        if (proof && (!(proof instanceof Uint8Array) || !(NumberUtils.isUint16(proof.byteLength)))) throw new Error('Malformed proof');
        if (!NumberUtils.isUint8(networkId)) throw new Error('Malformed networkId');

        this._format = format;
        this._sender = sender;
        this._senderType = senderType;
        this._recipient = recipient;
        this._recipientType = recipientType;
        this._value = value;
        this._fee = fee;
        this._networkId = networkId;
        this._validityStartHeight = validityStartHeight;
        this._flags = flags;
        this._data = data;
        this._proof = proof;

        if (this._recipient === Address.CONTRACT_CREATION) this._recipient = this.getContractCreationAddress();
    }

    static unserialize(buf: SerialBuffer): Transaction {
        const format = buf.readUint8() as Transaction.Format;
        buf.readPos--;

        if (!Transaction.FORMAT_MAP.has(format)) throw new Error('Invalid transaction type');
        return Transaction.FORMAT_MAP.get(format)!.unserialize(buf);
    }

    serializeContent(buf?: SerialBuffer): SerialBuffer {
        buf = buf || new SerialBuffer(this.serializedContentSize);
        buf.writeUint16(this._data.byteLength);
        buf.write(this._data);
        this._sender.serialize(buf);
        buf.writeUint8(this._senderType);
        this._recipient.serialize(buf);
        buf.writeUint8(this._recipientType);
        buf.writeUint64(this._value);
        buf.writeUint64(this._fee);
        buf.writeUint32(this._validityStartHeight);
        buf.writeUint8(this._networkId);
        buf.writeUint8(this._flags);
        return buf;
    }

    get serializedContentSize(): number {
        return /*dataSize*/ 2
            + this._data.byteLength
            + this._sender.serializedSize
            + /*senderType*/ 1
            + this._recipient.serializedSize
            + /*recipientType*/ 1
            + /*value*/ 8
            + /*fee*/ 8
            + /*validityStartHeight*/ 4
            + /*networkId*/ 1
            + /*flags*/ 1;
    }

    verify(networkId?: number): boolean {
        if (this._valid === undefined) {
            this._valid = this._verify(networkId);
        }
        return this._valid;
    }

    private _verify(networkId: number = GenesisConfig.NETWORK_ID): boolean {
        if (this._networkId !== networkId) {
            // Log.w(Transaction, 'Transaction is not valid in this network', this); // TODO: Log
            return false;
        }
        // Check that sender != recipient.
        if (this._recipient.equals(this._sender)) {
            // Log.w(Transaction, 'Sender and recipient must not match', this); // TODO: Log
            return false;
        }
        if (!Account.TYPE_MAP.has(this._senderType) || !Account.TYPE_MAP.has(this._recipientType)) {
            // Log.w(Transaction, 'Invalid account type', this); // TODO: Log
            return false;
        }
        if (!Account.TYPE_MAP.get(this._senderType)!.verifyOutgoingTransaction(this)) {
            // Log.w(Transaction, 'Invalid for sender', this); // TODO: Log
            return false;
        }
        if (!Account.TYPE_MAP.get(this._recipientType)!.verifyIncomingTransaction(this)) {
            // Log.w(Transaction, 'Invalid for recipient', this); // TODO: Log
            return false;
        }
        return true;
    }

    get serializedSize(): number {
        throw new Error('Getter needs to be overwritten by subclasses');
    }

    serialize(buf?: SerialBuffer): SerialBuffer {
        throw new Error('Method needs to be overwritten by subclasses');
    }

    hash(): Hash {
        // Exclude the signature, we don't want transactions to be malleable.
        this._hash = this._hash || Hash.light(this.serializeContent());
        return this._hash;
    }

    compare(o: Transaction): number {
        if (this.fee / this.serializedSize > o.fee / o.serializedSize) return -1;
        if (this.fee / this.serializedSize < o.fee / o.serializedSize) return 1;
        if (this.serializedSize > o.serializedSize) return -1;
        if (this.serializedSize < o.serializedSize) return 1;
        if (this.fee > o.fee) return -1;
        if (this.fee < o.fee) return 1;
        if (this.value > o.value) return -1;
        if (this.value < o.value) return 1;
        return this.compareBlockOrder(o);
    }

    compareBlockOrder(o: Transaction): number {
        // This function must return 0 iff this.equals(o).
        const recCompare = this._recipient.compare(o._recipient);
        if (recCompare !== 0) return recCompare;
        if (this._validityStartHeight < o._validityStartHeight) return -1;
        if (this._validityStartHeight > o._validityStartHeight) return 1;
        if (this._fee > o._fee) return -1;
        if (this._fee < o._fee) return 1;
        if (this._value > o._value) return -1;
        if (this._value < o._value) return 1;
        const senderCompare = this._sender.compare(o._sender);
        if (senderCompare !== 0) return senderCompare;
        if (this._recipientType < o._recipientType) return -1;
        if (this._recipientType > o._recipientType) return 1;
        if (this._senderType < o._senderType) return -1;
        if (this._senderType > o._senderType) return 1;
        if (this._flags < o._flags) return -1;
        if (this._flags > o._flags) return 1;
        return BufferUtils.compare(this._data, o._data);
    }

    equals(o: unknown): boolean {
        // This ignores format and proof to be consistent with hash():
        //   tx1.hash() == tx2.hash() iff tx1.equals(t2)
        return o instanceof Transaction
            && this._sender.equals(o._sender)
            && this._senderType === o._senderType
            && this._recipient.equals(o._recipient)
            && this._recipientType === o._recipientType
            && this._value === o._value
            && this._fee === o._fee
            && this._validityStartHeight === o._validityStartHeight
            && this._networkId === o._networkId
            && this._flags === o._flags
            && BufferUtils.equals(this._data, o._data);
    }

    toString(): string {
        return `Transaction{`
            + `sender=${this._sender.toBase64()}, `
            + `recipient=${this._recipient.toBase64()}, `
            + `value=${this._value}, `
            + `fee=${this._fee}, `
            + `validityStartHeight=${this._validityStartHeight}, `
            + `networkId=${this._networkId}`
            + `}`;
    }

    toPlain() {
        const data = Account.TYPE_MAP.get(this.recipientType)!.dataToPlain(this.data);
        data.raw = BufferUtils.toHex(this.data);
        let proof: Record<string, any> | undefined;
        if (this.proof) {
            proof = Account.TYPE_MAP.get(this.senderType)!.proofToPlain(this.proof);
            proof.raw = BufferUtils.toHex(this.proof);
        }
        return {
            transactionHash: this.hash().toPlain(),
            format: Transaction.Format.toString(this._format),
            sender: this.sender.toPlain(),
            senderType: Account.Type.toString(this.senderType),
            recipient: this.recipient.toPlain(),
            recipientType: Account.Type.toString(this.recipientType),
            value: this.value,
            fee: this.fee,
            feePerByte: this.feePerByte,
            validityStartHeight: this.validityStartHeight,
            network: GenesisConfig.networkIdToNetworkName(this.networkId),
            flags: this.flags,
            data,
            proof,
            size: this.serializedSize,
            valid: this.verify()
        };
    }

    static fromPlain(plain: Record<string, any>): Transaction {
        if (!plain) throw new Error('Invalid transaction format');
        const format = Transaction.Format.fromAny(plain.format);
        if (!Transaction.FORMAT_MAP.has(format)) throw new Error('Invalid transaction type');
        return Transaction.FORMAT_MAP.get(format)!.fromPlain(plain);
    }

    static fromAny(tx: Transaction | string | Record<string, any>): Transaction {
        if (tx instanceof Transaction) return tx;
        if (typeof tx === 'object') return Transaction.fromPlain(tx);
        if (typeof tx === 'string') return Transaction.unserialize(new SerialBuffer(BufferUtils.fromHex(tx)));
        throw new Error('Invalid transaction format');
    }

    getContractCreationAddress(): Address {
        const tx = Transaction.unserialize(this.serialize());
        tx._recipient = Address.NULL;
        tx._hash = null;
        return Address.fromHash(tx.hash());
    }

    get format(): Transaction.Format {
        return this._format;
    }

    get sender(): Address {
        return this._sender;
    }

    get senderType(): Account.Type {
        return this._senderType;
    }

    get recipient(): Address {
        return this._recipient;
    }

    get recipientType(): Account.Type {
        return this._recipientType;
    }

    get value(): number {
        return this._value;
    }

    get fee(): number {
        return this._fee;
    }

    get feePerByte(): number {
        return this._fee / this.serializedSize;
    }

    get networkId(): number {
        return this._networkId;
    }

    get validityStartHeight(): number {
        return this._validityStartHeight;
    }

    get flags(): number {
        return this._flags;
    }

    hasFlag(flag: Transaction.Flag): boolean {
        return (this._flags & flag) > 0;
    }

    get data(): Uint8Array {
        return this._data;
    }

    get proof(): Uint8Array | undefined {
        return this._proof;
    }

    // Sender proof is set by the Wallet after signing a transaction.
    set proof(proof: Uint8Array | undefined) {
        this._proof = proof;
    }
}

namespace Transaction {
    export enum Format {
        BASIC = 0,
        EXTENDED = 1,
    }

    export namespace Format {
        export function toString(format: Transaction.Format): string {
            switch (format) {
				case Transaction.Format.BASIC: return 'basic';
				case Transaction.Format.EXTENDED: return 'extended';
                default: throw new Error('Invalid transaction format');
            }
        }
        export function fromAny(format: unknown): Transaction.Format {
			if (typeof format === 'number') return format;
			switch (format) {
				case 'basic': return Transaction.Format.BASIC;
				case 'extended': return Transaction.Format.EXTENDED;
				default: throw new Error('Invalid transaction format');
			}
        }
    }

	export enum Flag {
		NONE = 0,
		CONTRACT_CREATION = 0b1,
		ALL = 0b1,
	}
}

export { Transaction };
