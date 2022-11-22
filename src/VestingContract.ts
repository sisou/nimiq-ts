import { Account } from "./Account";
import { Address } from "./Address";
import { Contract } from "./Contract";
import { NumberUtils } from "./NumberUtils";
import { SerialBuffer } from "./SerialBuffer";
import { SignatureProof } from "./SignatureProof";
import { Transaction } from "./Transaction";

export type PlainVestingContract = {
	type: 'vesting',
	balance: number,
	owner: string,
	vestingStart: number,
	vestingStepBlocks: number,
	vestingStepAmount: number,
	vestingTotalAmount: number,
}

export class VestingContract extends Contract {
	private _owner: Address;
	private _vestingStart: number;
	private _vestingStepBlocks: number;
	private _vestingStepAmount: number;
	private _vestingTotalAmount: number;

    constructor(
		balance = 0,
		owner = Address.NULL,
		vestingStart = 0,
		vestingStepBlocks = 0,
		vestingStepAmount = balance,
		vestingTotalAmount = balance,
	) {
        super(Account.Type.VESTING, balance);
        if (!(owner instanceof Address)) throw new Error('Malformed owner address');
        if (!NumberUtils.isUint32(vestingStart)) throw new Error('Malformed vestingStart');
        if (!NumberUtils.isUint32(vestingStepBlocks)) throw new Error('Malformed vestingStepBlocks');
        if (!NumberUtils.isUint64(vestingStepAmount)) throw new Error('Malformed vestingStepAmount');
        if (!NumberUtils.isUint64(vestingTotalAmount)) throw new Error('Malformed vestingTotalAmount');

        this._owner = owner;
        this._vestingStart = vestingStart;
        this._vestingStepBlocks = vestingStepBlocks;
        this._vestingStepAmount = vestingStepAmount;
        this._vestingTotalAmount = vestingTotalAmount;
    }

    static create(balance: number, blockHeight: number, transaction: Transaction): VestingContract {
        /** @type {number} */
        let vestingStart, vestingStepBlocks, vestingStepAmount, vestingTotalAmount;
        const buf = new SerialBuffer(transaction.data);
        const owner = Address.unserialize(buf);
        vestingTotalAmount = transaction.value;
        switch (transaction.data.length) {
            case Address.SERIALIZED_SIZE + 4:
                // Only block number: vest full amount at that block
                vestingStart = 0;
                vestingStepBlocks = buf.readUint32();
                vestingStepAmount = vestingTotalAmount;
                break;
            case Address.SERIALIZED_SIZE + 16:
                vestingStart = buf.readUint32();
                vestingStepBlocks = buf.readUint32();
                vestingStepAmount = buf.readUint64();
                break;
            case Address.SERIALIZED_SIZE + 24:
                // Create a vesting account with some instantly vested funds or additional funds considered.
                vestingStart = buf.readUint32();
                vestingStepBlocks = buf.readUint32();
                vestingStepAmount = buf.readUint64();
                vestingTotalAmount = buf.readUint64();
                break;
            default:
                throw new Error('Invalid transaction data');
        }
        return new VestingContract(balance, owner, vestingStart, vestingStepBlocks, vestingStepAmount, vestingTotalAmount);
    }

    static unserialize(buf: SerialBuffer): VestingContract {
        const type = buf.readUint8();
        if (type !== Account.Type.VESTING) throw new Error('Invalid account type');

        const balance = buf.readUint64();
        const owner = Address.unserialize(buf);
        const vestingStart = buf.readUint32();
        const vestingStepBlocks = buf.readUint32();
        const vestingStepAmount = buf.readUint64();
        const vestingTotalAmount = buf.readUint64();
        return new VestingContract(balance, owner, vestingStart, vestingStepBlocks, vestingStepAmount, vestingTotalAmount);
    }

    static fromPlain(plain: Record<string, any>): VestingContract {
        if (!plain) throw new Error('Invalid account');
        return new VestingContract(plain.balance, Address.fromAny(plain.owner), plain.vestingStart, plain.vestingStepBlocks, plain.vestingStepAmount, plain.vestingTotalAmount);
    }

    /**
     * Serialize this VestingContract object into binary form.
     */
    serialize(buf?: SerialBuffer): SerialBuffer {
        buf = buf || new SerialBuffer(this.serializedSize);
        super.serialize(buf);
        this._owner.serialize(buf);
        buf.writeUint32(this._vestingStart);
        buf.writeUint32(this._vestingStepBlocks);
        buf.writeUint64(this._vestingStepAmount);
        buf.writeUint64(this._vestingTotalAmount);
        return buf;
    }

    get serializedSize(): number {
        return super.serializedSize
            + this._owner.serializedSize
            + /*vestingStart*/ 4
            + /*vestingStepBlocks*/ 4
            + /*vestingStepAmount*/ 8
            + /*vestingTotalAmount*/ 8;
    }

    get owner(): Address {
        return this._owner;
    }

    get vestingStart(): number {
        return this._vestingStart;
    }

    get vestingStepBlocks(): number {
        return this._vestingStepBlocks;
    }

    get vestingStepAmount(): number {
        return this._vestingStepAmount;
    }

    get vestingTotalAmount(): number {
        return this._vestingTotalAmount;
    }

    toString(): string {
        return `VestingAccount{balance=${this._balance}, owner=${this._owner.toUserFriendlyAddress()}`;
    }

    toPlain(): PlainVestingContract {
        const plain = super.toPlain() as Partial<PlainVestingContract>;
        plain.owner = this.owner.toPlain();
        plain.vestingStart = this.vestingStart;
        plain.vestingStepBlocks = this.vestingStepBlocks;
        plain.vestingStepAmount = this.vestingStepAmount;
        plain.vestingTotalAmount = this.vestingTotalAmount;
        return plain as PlainVestingContract;
    }

    /**
     * Check if two Accounts are the same.
     */
    equals(o: unknown): boolean {
        return o instanceof VestingContract
            && this._type === o._type
            && this._balance === o._balance
            && this._owner.equals(o._owner)
            && this._vestingStart === o._vestingStart
            && this._vestingStepBlocks === o._vestingStepBlocks
            && this._vestingStepAmount === o._vestingStepAmount
            && this._vestingTotalAmount === o._vestingTotalAmount;
    }

    static verifyOutgoingTransaction(transaction: Transaction): boolean {
        const buf = new SerialBuffer(transaction.proof);

        if (!SignatureProof.unserialize(buf).verify(null, transaction.serializeContent())) {
            return false;
        }

        if (buf.readPos !== buf.byteLength) {
            return false;
        }

        return true;
    }

    static verifyIncomingTransaction(transaction: Transaction): boolean {
        switch (transaction.data.length) {
            case Address.SERIALIZED_SIZE + 4:
            case Address.SERIALIZED_SIZE + 16:
            case Address.SERIALIZED_SIZE + 24:
                return Contract.verifyIncomingTransaction(transaction);
            default:
                return false;
        }
    }

    withBalance(balance: number): VestingContract {
        return new VestingContract(balance, this._owner, this._vestingStart, this._vestingStepBlocks, this._vestingStepAmount, this._vestingTotalAmount);
    }

    // withOutgoingTransaction(transaction: Transaction, blockHeight: number, transactionsCache: TransactionCache, revert = false): VestingContract { // TODO: TransactionCache
    //     if (!revert) {
    //         const minCap = this.getMinCap(blockHeight);
    //         const newBalance = this._balance - transaction.value - transaction.fee;
    //         if (newBalance < minCap) {
    //             throw new Account.BalanceError();
    //         }

    //         const buf = new SerialBuffer(transaction.proof);
    //         if (!SignatureProof.unserialize(buf).isSignedBy(this._owner)) {
    //             throw new Account.ProofError();
    //         }
    //     }
    //     return super.withOutgoingTransaction(transaction, blockHeight, transactionsCache, revert);
    // }

    withIncomingTransaction(transaction: Transaction, blockHeight: number, revert = false): VestingContract {
        throw new Error('Illegal incoming transaction');
    }

    getMinCap(blockHeight: number): number {
        return this._vestingStepBlocks && this._vestingStepAmount > 0
            ? Math.max(0, this._vestingTotalAmount - Math.floor((blockHeight - this._vestingStart) / this._vestingStepBlocks) * this._vestingStepAmount)
            : 0;
    }


    static dataToPlain(data: Uint8Array): Record<string, any> {
        try {
            let vestingStart, vestingStepBlocks, vestingStepAmount, vestingTotalAmount;
            const buf = new SerialBuffer(data);
            const owner = Address.unserialize(buf);
            switch (data.length) {
                case Address.SERIALIZED_SIZE + 4:
                    vestingStart = 0;
                    vestingStepBlocks = buf.readUint32();
                    break;
                case Address.SERIALIZED_SIZE + 16:
                    vestingStart = buf.readUint32();
                    vestingStepBlocks = buf.readUint32();
                    vestingStepAmount = buf.readUint64();
                    break;
                case Address.SERIALIZED_SIZE + 24:
                    vestingStart = buf.readUint32();
                    vestingStepBlocks = buf.readUint32();
                    vestingStepAmount = buf.readUint64();
                    vestingTotalAmount = buf.readUint64();
                    break;
                default:
                    throw new Error('Invalid transaction data');
            }
            return {
                owner: owner.toPlain(),
                vestingStart,
                vestingStepBlocks,
                vestingStepAmount,
                vestingTotalAmount
            };
        } catch (e) {
            return Account.dataToPlain(data);
        }
    }

    static proofToPlain(proof: Uint8Array): Record<string, any> {
        try {
            const signatureProof = SignatureProof.unserialize(new SerialBuffer(proof));
            return {
                signature: signatureProof.signature?.toHex(),
                publicKey: signatureProof.publicKey.toHex(),
                signer: signatureProof.publicKey.toAddress().toPlain(),
                pathLength: signatureProof.merklePath.nodes.length
            };
        } catch (e) {
            return Account.proofToPlain(proof);
        }
    }
}

Account.TYPE_MAP.set(Account.Type.VESTING, VestingContract);
