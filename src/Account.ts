import { BufferUtils } from "./BufferUtils";
import { NumberUtils } from "./NumberUtils";
import { SerialBuffer } from "./SerialBuffer";
import { Transaction } from "./Transaction";

export type PlainAccount = {
    type: string,
    balance: number,
}

abstract class Account {
	static TYPE_MAP = new Map<Account.Type, {
		copy?: (o: Account) => Account,
		unserialize: (buf: SerialBuffer) => Account,
		create?: (balance: number, blockHeight: number, transaction: Transaction) => Account,
		verifyOutgoingTransaction: (transaction: Transaction) => boolean,
		verifyIncomingTransaction: (transaction: Transaction) => boolean,
		fromPlain: (o: object) => Account,
		dataToPlain: (data: Uint8Array) => Record<string, any>,
		proofToPlain: (proof: Uint8Array) => Record<string, any>,
	}>();
    static INITIAL: Account;

	static BalanceError = class extends Error { constructor() { super('Balance Error!'); }};
	static DoubleTransactionError = class extends Error { constructor() { super('Double Transaction Error!'); }};
	static ProofError = class extends Error { constructor() { super('Proof Error!'); }};
	static ValidityError = class extends Error { constructor() { super('Validity Error!'); }};

	protected _type: Account.Type;
	protected _balance: number;

    constructor(type: Account.Type, balance: number) {
        if (!NumberUtils.isUint8(type)) throw new Error('Malformed type');
        if (!NumberUtils.isUint64(balance)) throw new Error('Malformed balance');

        this._type = type;
        this._balance = balance;
    }

    /**
     * Create Account object from binary form.
     */
    static unserialize(buf: SerialBuffer): Account {
        const type = buf.readUint8() as Account.Type;
        buf.readPos--;

        if (!Account.TYPE_MAP.has(type)) {
            throw new Error('Unknown account type');
        }

        return Account.TYPE_MAP.get(type)!.unserialize(buf);
    }

    /**
     * Serialize this Account object into binary form.
     */
    serialize(buf?: SerialBuffer): SerialBuffer {
        buf = buf || new SerialBuffer(this.serializedSize);
        buf.writeUint8(this._type);
        buf.writeUint64(this._balance);
        return buf;
    }

    get serializedSize(): number {
        return /*type*/ 1
            + /*balance*/ 8;
    }

    /**
     * Check if two Accounts are the same.
     */
    equals(o: Account): boolean {
        return BufferUtils.equals(this.serialize(), o.serialize());
    }

    toString() {
        return `Account{type=${this._type}, balance=${this._balance.toString()}`;
    }

    static fromAny(o: Account | Record<string, any>): Account {
        if (o instanceof Account) return o;
        return Account.fromPlain(o);
    }

    static fromPlain(plain: Record<string, any>): Account {
        if (!plain || plain.type === undefined) throw new Error('Invalid account');
        const type = Account.Type.fromAny(plain.type);
        return Account.TYPE_MAP.get(type)!.fromPlain(plain);
    }

    toPlain(): PlainAccount {
        return {
            type: Account.Type.toString(this.type),
            balance: this.balance
        };
    }

    get balance(): number {
        return this._balance;
    }

    get type(): Account.Type {
        return this._type;
    }

    withBalance(balance: number): Account {
		throw new Error('Not yet implemented.');
	}

    // withOutgoingTransaction(transaction: Transaction, blockHeight: number, transactionsCache: TransactionCache, revert = false): Account { // TODO: TransactionCache
    //     if (!revert) {
    //         const newBalance = this._balance - transaction.value - transaction.fee;
    //         if (newBalance < 0) {
    //             throw new Account.BalanceError();
    //         }
    //         if (blockHeight < transaction.validityStartHeight
    //             || blockHeight >= transaction.validityStartHeight + Policy.TRANSACTION_VALIDITY_WINDOW) { // TODO: Policy
    //             throw new Account.ValidityError();
    //         }
    //         if (transactionsCache.containsTransaction(transaction)) {
    //             throw new Account.DoubleTransactionError();
    //         }
    //         return this.withBalance(newBalance);
    //     } else {
    //         if (blockHeight < transaction.validityStartHeight
    //             || blockHeight >= transaction.validityStartHeight + Policy.TRANSACTION_VALIDITY_WINDOW) {
    //             throw new Account.ValidityError();
    //         }
    //         return this.withBalance(this._balance + transaction.value + transaction.fee);
    //     }
    // }

    withIncomingTransaction(transaction: Transaction, blockHeight: number, revert = false): Account {
        if (!revert) {
            return this.withBalance(this._balance + transaction.value);
        } else {
            const newBalance = this._balance - transaction.value;
            if (newBalance < 0) {
                throw new Account.BalanceError();
            }
            return this.withBalance(newBalance);
        }
    }

    withContractCommand(transaction: Transaction, blockHeight: number, revert = false): Account {
        throw new Error('Not yet implemented');
    }

    isInitial(): boolean {
        return this === Account.INITIAL;
    }

    isToBePruned(): boolean {
        return this._balance === 0 && !this.isInitial();
    }

    static dataToPlain(data: Uint8Array): Record<string, any> {
        return {};
    }

    static proofToPlain(proof: Uint8Array): Record<string, any> {
        return {};
    }
}

namespace Account {
	/**
	 * Enum for Account types.
	 * Non-zero values are contracts.
	 */
	export enum Type {
		/**
		 * Basic account type.
		 * @see {BasicAccount}
		 */
		BASIC = 0,
		/**
		 * Account with vesting functionality.
		 * @see {VestingContract}
		 */
		VESTING = 1,
		/**
		 * Hashed Time-Locked Contract
		 * @see {HashedTimeLockedContract}
		 */
		HTLC = 2
	}

	export namespace Type {
		export function toString(type: Account.Type): string {
			switch (type) {
				case Account.Type.BASIC: return 'basic';
				case Account.Type.VESTING: return 'vesting';
				case Account.Type.HTLC: return 'htlc';
				default: throw new Error('Invalid account type');
			}
		}
		export function fromAny(type: unknown): Account.Type {
			if (typeof type === 'number') return type;
			switch (type) {
				case 'basic': return Account.Type.BASIC;
				case 'vesting': return Account.Type.VESTING;
				case 'htlc': return Account.Type.HTLC;
				default: throw new Error('Invalid account type');
			}
		}
	}
}

export { Account };
