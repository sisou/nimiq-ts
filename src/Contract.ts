import { Account } from "./Account";
import { BasicAccount } from "./BasicAccount";
import { Transaction } from "./Transaction";

export abstract class Contract extends Account {
    constructor(type: Account.Type, balance: number) {
        super(type, balance);
    }

    static verifyIncomingTransaction(transaction: Transaction): boolean {
        if (!transaction.recipient.equals(transaction.getContractCreationAddress())) {
            return false;
        }
        return true;
    }

    override withIncomingTransaction(transaction: Transaction, blockHeight: number, revert = false): Account {
        if (!revert && transaction.hasFlag(Transaction.Flag.CONTRACT_CREATION)) {
            // Contract already created
            throw new Error('Data error');
        }
        return super.withIncomingTransaction(transaction, blockHeight, revert);
    }


    override withContractCommand(transaction: Transaction, blockHeight: number, revert = false): Account {
        if (revert && transaction.hasFlag(Transaction.Flag.CONTRACT_CREATION)) {
            // Revert contract creation
            return new BasicAccount(this.balance);
        }
        return this;
    }
}
