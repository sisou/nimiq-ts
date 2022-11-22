import { Account } from "./Account";
import { Address } from "./Address";
import { ArrayUtils } from "./ArrayUtils";
import { BufferUtils } from "./BufferUtils";
import { Commitment } from "./Commitment";
import { CommitmentPair } from "./CommitmentPair";
import { ExtendedTransaction } from "./ExtendedTransaction";
import { KeyPair } from "./KeyPair";
import { MerkleTree } from "./MerkleTree";
import { PartialSignature } from "./PartialSignature";
import { PublicKey } from "./PublicKey";
import { RandomSecret } from "./RandomSecret";
import { SerialBuffer } from "./SerialBuffer";
import { Signature } from "./Signature";
import { SignatureProof } from "./SignatureProof";
import { Transaction } from "./Transaction";
import { Wallet } from "./Wallet";

export class MultiSigWallet extends Wallet {
    /**
     * Create a new MultiSigWallet object.
     */
    static fromPublicKeys(keyPair: KeyPair, minSignatures: number, publicKeys: PublicKey[]): MultiSigWallet {
        if (publicKeys.length === 0) throw new Error('publicKeys may not be empty');
        if (minSignatures <= 0) throw new Error('minSignatures must be greater than 0');
        if (!publicKeys.some(key => key.equals(keyPair.publicKey))) throw new Error('Own publicKey must be part of publicKeys');

        // Sort public keys so that the order when signing and construction does not matter.
        publicKeys = publicKeys.slice();
        publicKeys.sort((a, b) => a.compare(b));
        const combinations = [...ArrayUtils.k_combinations(publicKeys, minSignatures)];
        const multiSigKeys = combinations.map(arr => PublicKey.sum(arr));
        return new MultiSigWallet(keyPair, minSignatures, multiSigKeys);
    }

    private static _loadMultiSig(keyPair: KeyPair, buf: SerialBuffer): MultiSigWallet {
        const minSignatures = buf.readUint8();
        const numPublicKeys = buf.readUint8();
        const publicKeys = [];
        for (let i = 0; i < numPublicKeys; ++i) {
            publicKeys.push(PublicKey.unserialize(buf));
        }
        return new MultiSigWallet(keyPair, minSignatures, publicKeys);
    }

    static override loadPlain(buf: Uint8Array | string): MultiSigWallet {
        if (typeof buf === 'string') buf = BufferUtils.fromHex(buf);
        if (!buf || buf.byteLength === 0) {
            throw new Error('Invalid wallet seed');
        }

        const serialBuf = new SerialBuffer(buf);
        const keyPair = KeyPair.unserialize(serialBuf);
        return MultiSigWallet._loadMultiSig(keyPair, serialBuf);
    }

    static override async loadEncrypted(buf: Uint8Array | string, key: Uint8Array | string): Promise<MultiSigWallet> {
        if (typeof buf === 'string') buf = BufferUtils.fromHex(buf);
        if (typeof key === 'string') key = BufferUtils.fromUtf8(key);

        const serialBuf = new SerialBuffer(buf);
        const keyPair = await KeyPair.fromEncrypted(serialBuf, key);
        return MultiSigWallet._loadMultiSig(keyPair, serialBuf);
    }

    private _minSignatures: number;
    private _publicKeys: PublicKey[];

    constructor(keyPair: KeyPair, minSignatures: number, publicKeys: PublicKey[]) {
        super(keyPair);
        this._minSignatures = minSignatures;
        this._publicKeys = publicKeys;
        this._publicKeys.sort((a, b) => a.compare(b));

        const merkleRoot = MerkleTree.computeRoot(this._publicKeys);
        /** @type {Address} */
        this._address = Address.fromHash(merkleRoot);
    }

    override exportPlain(): SerialBuffer {
        const buf = new SerialBuffer(this.exportedSize);
        this._keyPair.serialize(buf);
        buf.writeUint8(this._minSignatures);
        buf.writeUint8(this._publicKeys.length);
        for (const pubKey of this._publicKeys) {
            pubKey.serialize(buf);
        }
        return buf;
    }

    get exportedSize(): number {
        return this._keyPair.serializedSize
            + /*minSignatures*/ 1
            + /*count*/ 1
            + this._publicKeys.reduce((sum, pubKey) => sum + pubKey.serializedSize, 0);
    }

    override async exportEncrypted(key: Uint8Array | string): Promise<SerialBuffer> {
        if (typeof key === 'string') key = BufferUtils.fromUtf8(key);

        const buf = new SerialBuffer(this.encryptedSize);
        buf.write(await this._keyPair.exportEncrypted(key));
        buf.writeUint8(this._minSignatures);
        buf.writeUint8(this._publicKeys.length);
        for (const pubKey of this._publicKeys) {
            pubKey.serialize(buf);
        }

        return buf;
    }

    get encryptedSize(): number {
        return this._keyPair.encryptedSize
            + /*minSignatures*/ 1
            + /*count*/ 1
            + this._publicKeys.reduce((sum, pubKey) => sum + pubKey.serializedSize, 0);
    }

    /**
     * Create a Transaction that still needs to be signed.
     */
    override createTransaction(recipientAddr: Address, value: number, fee: number, validityStartHeight: number): Transaction {
        return new ExtendedTransaction(this._address, Account.Type.BASIC,
            recipientAddr, Account.Type.BASIC, value, fee, validityStartHeight,
            Transaction.Flag.NONE, new Uint8Array(0));
    }

    /**
     * Creates a commitment pair for signing a transaction.
     */
    createCommitment(): CommitmentPair {
        return CommitmentPair.generate();
    }

    partiallySignTransaction(transaction: Transaction, publicKeys: PublicKey[], aggregatedCommitment: Commitment, secret: RandomSecret): PartialSignature {
        // Sort public keys to get the right combined public key.
        publicKeys = publicKeys.slice();
        publicKeys.sort((a, b) => a.compare(b));

        return PartialSignature.create(this._keyPair.privateKey, this._keyPair.publicKey, publicKeys,
            secret, aggregatedCommitment, transaction.serializeContent());
    }

    /**
     * Sign a transaction by the owner of this Wallet.
     * @ts-expect-error Cannot change arguments for method overrides */
    override signTransaction(transaction: Transaction, aggregatedPublicKey: PublicKey, aggregatedCommitment: Commitment, signatures: PartialSignature[]): SignatureProof {
        if (signatures.length !== this._minSignatures) {
            throw new Error('Not enough signatures to complete this transaction');
        }

        const signature = Signature.fromPartialSignatures(aggregatedCommitment, signatures);
        return SignatureProof.multiSig(aggregatedPublicKey, this._publicKeys, signature);
    }

    completeTransaction(transaction: Transaction, aggregatedPublicKey: PublicKey, aggregatedCommitment: Commitment, signatures: PartialSignature[]): Transaction {
        const proof = this.signTransaction(transaction, aggregatedPublicKey, aggregatedCommitment, signatures);
        transaction.proof = proof.serialize();
        return transaction;
    }

    get minSignatures(): number {
        return this._minSignatures;
    }

    get publicKeys(): PublicKey[] {
        return this._publicKeys;
    }
}
