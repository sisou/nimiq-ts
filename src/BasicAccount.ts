import { Account } from "./Account";
import { SerialBuffer } from "./SerialBuffer";
import { SignatureProof } from "./SignatureProof";
import { Transaction } from "./Transaction";

/**
 * This is a classic account that can send all his funds and receive any transaction.
 * All outgoing transactions are signed using the key corresponding to this address.
 */
export class BasicAccount extends Account {
    static copy(o: BasicAccount): BasicAccount {
        if (!o) return o;
        return new BasicAccount(o._balance);
    }

    constructor(balance = 0) {
        super(Account.Type.BASIC, balance);
    }

    static override unserialize(buf: SerialBuffer): BasicAccount {
        const type = buf.readUint8();
        if (type !== Account.Type.BASIC) throw new Error('Invalid account type');

        const balance = buf.readUint64();
        return new BasicAccount(balance);
    }

    static override fromPlain(o: Record<string, any>): BasicAccount {
        if (!o) throw new Error('Invalid account');
        return new BasicAccount(o.balance);
    }

    /**
     * Check if two Accounts are the same.
     */
     override equals(o: unknown): boolean {
        return o instanceof BasicAccount
            && this._type === o._type
            && this._balance === o._balance;
    }

    override toString(): string {
        return `BasicAccount{balance=${this._balance}}`;
    }

    static verifyOutgoingTransaction(transaction: Transaction): boolean {
        return SignatureProof.verifyTransaction(transaction);
    }

    static verifyIncomingTransaction(transaction: Transaction): boolean {
        if (transaction.data.byteLength > 64) return false;
        return true;
    }

    override withBalance(balance: number): BasicAccount {
        return new BasicAccount(balance);
    }

    // /**
    //  * @param {Transaction} transaction
    //  * @param {number} blockHeight
    //  * @param {boolean} [revert]
    //  * @return {Account}
    //  */
    // withIncomingTransaction(transaction, blockHeight, revert = false) {
    //     if (!revert) {
    //         const isContractCreation = transaction.hasFlag(Transaction.Flag.CONTRACT_CREATION);
    //         const isTypeChange = transaction.recipientType !== this._type;
    //         if (isContractCreation !== isTypeChange) {
    //             throw new Error('Data Error!');
    //         }
    //     }
    //     return super.withIncomingTransaction(transaction, blockHeight, revert);
    // }

    // /**
    //  * @param {Transaction} transaction
    //  * @param {number} blockHeight
    //  * @param {boolean} [revert]
    //  * @return {Account}
    //  */
    // withContractCommand(transaction, blockHeight, revert = false) {
    //     if (!revert && transaction.recipientType !== this._type && transaction.hasFlag(Transaction.Flag.CONTRACT_CREATION)) {
    //         // Contract creation
    //         return Account.TYPE_MAP.get(transaction.recipientType).create(this._balance, blockHeight, transaction);
    //     }
    //     return this;
    // }

    override isInitial(): boolean {
        return this._balance === 0;
    }

    static override dataToPlain(data: Uint8Array): Record<string, any> {
        return Account.dataToPlain(data);
    }

    static override proofToPlain(proof: Uint8Array): Record<string, any> {
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

Account.INITIAL = new BasicAccount(0);
Account.TYPE_MAP.set(Account.Type.BASIC, BasicAccount);
