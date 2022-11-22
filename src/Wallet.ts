import { Address } from "./Address";
import { BasicTransaction } from "./BasicTransaction";
import { BufferUtils } from "./BufferUtils";
import { KeyPair } from "./KeyPair";
import { PublicKey } from "./PublicKey";
import { SerialBuffer } from "./SerialBuffer";
import { Signature } from "./Signature";
import { SignatureProof } from "./SignatureProof";
import { Transaction } from "./Transaction";

export class Wallet {
    /**
     * Create a new Wallet.
     */
    static generate(): Wallet {
        return new Wallet(KeyPair.generate());
    }

    static loadPlain(buf: Uint8Array | string): Wallet {
        if (typeof buf === 'string') buf = BufferUtils.fromHex(buf);
        if (!buf || buf.byteLength === 0) {
            throw new Error('Invalid wallet seed');
        }
        return new Wallet(KeyPair.unserialize(new SerialBuffer(buf)));
    }

    static async loadEncrypted(buf: Uint8Array | string, key: Uint8Array | string): Promise<Wallet> {
        if (typeof buf === 'string') buf = BufferUtils.fromHex(buf);
        if (typeof key === 'string') key = BufferUtils.fromUtf8(key);
        return new Wallet(await KeyPair.fromEncrypted(new SerialBuffer(buf), key));
    }

	protected _keyPair: KeyPair;
	protected _address: Address;

    /**
     * Create a new Wallet object.
     */
    constructor(keyPair: KeyPair) {
        this._keyPair = keyPair;
        this._address = this._keyPair.publicKey.toAddress();
    }

    createTransaction(recipient: Address, value: number, fee: number, validityStartHeight: number): Transaction {
        const transaction = new BasicTransaction(this._keyPair.publicKey, recipient, value, fee, validityStartHeight);
        transaction.signature = Signature.create(this._keyPair.privateKey, this._keyPair.publicKey, transaction.serializeContent());
        return transaction;
    }

    /**
     * Sign a transaction by the owner of this Wallet.
     */
    signTransaction(transaction: Transaction): SignatureProof {
        const signature = Signature.create(this._keyPair.privateKey, this._keyPair.publicKey, transaction.serializeContent());
        return SignatureProof.singleSig(this._keyPair.publicKey, signature);
    }

    exportPlain(): SerialBuffer {
        return this._keyPair.serialize();
    }

    exportEncrypted(key: Uint8Array | string): Promise<SerialBuffer> {
        if (typeof key === 'string') key = BufferUtils.fromUtf8(key);
        return this._keyPair.exportEncrypted(key);
    }

    get isLocked(): boolean {
        return this.keyPair.isLocked;
    }

    lock(key: Uint8Array | string): Promise<void> {
        if (typeof key === 'string') key = BufferUtils.fromUtf8(key);
        return this.keyPair.lock(key);
    }

    relock(): void {
        this.keyPair.relock();
    }

    unlock(key: Uint8Array | string): Promise<void> {
        if (typeof key === 'string') key = BufferUtils.fromUtf8(key);
        return this.keyPair.unlock(key);
    }

    equals(o: unknown): boolean {
        return o instanceof Wallet && this.keyPair.equals(o.keyPair) && this.address.equals(o.address);
    }

    /**
     * The address of the Wallet owner.
     */
    get address(): Address {
        return this._address;
    }

    /**
     * The public key of the Wallet owner
     */
    get publicKey(): PublicKey {
        return this._keyPair.publicKey;
    }

    get keyPair(): KeyPair {
        return this._keyPair;
    }
}
