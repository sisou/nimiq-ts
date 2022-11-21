import { BufferUtils } from "./BufferUtils";
import { CryptoUtils } from "./CryptoUtils";
import { PrivateKey } from "./PrivateKey";
import { PublicKey } from "./PublicKey";
import { Secret } from "./Secret";
import { SerialBuffer } from "./SerialBuffer";
import { Serializable } from "./Serializable";

export class KeyPair extends Serializable {
	static LOCK_KDF_ROUNDS = 256;

    private _locked: boolean;
    private _lockedInternally: boolean;
    private _lockSalt: Uint8Array | null;
    private _publicKey: PublicKey;
	private _internalPrivateKey: PrivateKey;
	private _unlockedPrivateKey: PrivateKey | null = null;

    constructor(privateKey: PrivateKey, publicKey: PublicKey, locked = false, lockSalt: Uint8Array | null = null) {
        if (!(privateKey instanceof Object)) throw new Error('Primitive: Invalid type');
        if (!(publicKey instanceof Object)) throw new Error('Primitive: Invalid type');
        super();

        this._locked = locked;
        this._lockedInternally = locked;
        this._lockSalt = lockSalt;
        this._publicKey = publicKey;
        this._internalPrivateKey = new PrivateKey(privateKey.serialize());
    }

    static generate(): KeyPair {
        const privateKey = PrivateKey.generate();
        return new KeyPair(privateKey, PublicKey.derive(privateKey));
    }

    static derive(privateKey: PrivateKey): KeyPair {
        return new KeyPair(privateKey, PublicKey.derive(privateKey));
    }

    static fromHex(hexBuf: string): KeyPair {
        return KeyPair.unserialize(BufferUtils.fromHex(hexBuf));
    }

    static unserialize(buf: SerialBuffer): KeyPair {
        const privateKey = PrivateKey.unserialize(buf);
        const publicKey = PublicKey.unserialize(buf);
        let locked = false;
        let lockSalt = null;
        if (buf.readPos < buf.byteLength) {
            const extra = buf.readUint8();
            if (extra === 1) {
                locked = true;
                lockSalt = buf.read(32);
            }
        }
        return new KeyPair(privateKey, publicKey, locked, lockSalt);
    }

    serialize(buf: SerialBuffer): SerialBuffer {
        buf = buf || new SerialBuffer(this.serializedSize);
        this._privateKey.serialize(buf);
        this.publicKey.serialize(buf);
        if (this._locked) {
            buf.writeUint8(1);
            buf.write(this._lockSalt!);
        } else {
            buf.writeUint8(0);
        }
        return buf;
    }

    /**
     * The unlocked private key.
     */
    get privateKey(): PrivateKey {
        if (this.isLocked) throw new Error('KeyPair is locked');
        return this._privateKey;
    }

    /**
     * The private key in its current state, i.e., depending on this._locked.
     * If this._locked, it is the internally locked private key.
     * If !this._locked, it is either the internally unlocked private key (if !this._lockedInternally)
     * or this._unlockedPrivateKey.
     */
    private get _privateKey(): PrivateKey {
        return this._unlockedPrivateKey || this._internalPrivateKey;
    }

    get publicKey(): PublicKey {
        return this._publicKey;
    }

    get serializedSize(): number {
        return this._privateKey.serializedSize + this.publicKey.serializedSize + (this._locked ? this._lockSalt!.byteLength + 1 : 1);
    }

    async lock(key: Uint8Array, lockSalt?: Uint8Array): Promise<void> {
        if (this._locked) throw new Error('KeyPair already locked');

        if (lockSalt) this._lockSalt = lockSalt;
        if (!this._lockSalt || this._lockSalt.length === 0) {
            this._lockSalt = new Uint8Array(32);
            CryptoUtils.getRandomValues(this._lockSalt);
        }

        this._internalPrivateKey.overwrite(await this._otpPrivateKey(key));
        this._clearUnlockedPrivateKey();
        this._locked = true;
        this._lockedInternally = true;
    }

    async unlock(key: Uint8Array): Promise<void> {
        if (!this._locked) throw new Error('KeyPair not locked');

        const privateKey = await this._otpPrivateKey(key);
        const verifyPub = PublicKey.derive(privateKey);
        if (verifyPub.equals(this.publicKey)) {
            // Only set this._unlockedPrivateKey but keep this._internalPrivateKey locked
            this._unlockedPrivateKey = privateKey;
            this._locked = false;
        } else {
            throw new Error('Invalid key');
        }
    }

    /**
     * Destroy cached unlocked private key if the internal key is in locked state.
     */
    relock(): void {
        if (this._locked) throw new Error('KeyPair already locked');
        if (!this._lockedInternally) throw new Error('KeyPair was never locked');
        this._clearUnlockedPrivateKey();
        this._locked = true;
    }

    private _clearUnlockedPrivateKey() {
        // If this wallet is not locked internally and unlocked, this method does not have any effect.
        if (!this._lockedInternally || this._locked) return;

		if (!this._unlockedPrivateKey) throw new Error('No unlocked private key to clear');

        // Overwrite cached key in this._unlockedPrivateKey with 0s.
        this._unlockedPrivateKey.overwrite(PrivateKey.unserialize(new SerialBuffer(this._unlockedPrivateKey.serializedSize)));
        // Then, reset it.
        this._unlockedPrivateKey = null;
    }

    private async _otpPrivateKey(key: Uint8Array): Promise<PrivateKey> {
        return new PrivateKey(await CryptoUtils.otpKdfLegacy(this._privateKey.serialize(), key, this._lockSalt!, KeyPair.LOCK_KDF_ROUNDS));
    }

    get isLocked() {
        return this._locked;
    }

    static async fromEncrypted(buf: SerialBuffer, key: Uint8Array): Promise<KeyPair> {
        const privateKey = await Secret.fromEncrypted(buf, key);
        if (privateKey.type !== Secret.Type.PRIVATE_KEY) throw new Error('Expected privateKey, got Entropy');
        return KeyPair.derive(privateKey as PrivateKey);
    }

    exportEncrypted(key: Uint8Array): Promise<SerialBuffer> {
        return this._privateKey.exportEncrypted(key);
    }

    get encryptedSize(): number {
        return this._privateKey.encryptedSize;
    }

    equals(o: unknown): boolean {
        return o instanceof KeyPair && super.equals(o);
    }
}
