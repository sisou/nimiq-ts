import { BufferUtils } from "./BufferUtils";
import { CryptoUtils } from "./CryptoUtils";
import { Entropy } from "./Entropy";
import { Hash } from "./Hash";
import { PrivateKey } from "./PrivateKey";
import { PublicKey } from "./PublicKey";
import { SerialBuffer } from "./SerialBuffer";
import { Serializable } from "./Serializable";

abstract class Secret extends Serializable {
    private _type: Secret.Type;
    private _purposeId: number;

    static SIZE = 32;

    static ENCRYPTION_SALT_SIZE = 16;
    static ENCRYPTION_KDF_ROUNDS = 256;
    static ENCRYPTION_CHECKSUM_SIZE = 4;
    static ENCRYPTION_CHECKSUM_SIZE_V3 = 2;

    constructor(type: Secret.Type, purposeId: number) {
        super();
        this._type = type;
        this._purposeId = purposeId;
    }

    static async fromEncrypted(buf: SerialBuffer, key: Uint8Array): Promise<PrivateKey | Entropy> {
        const version = buf.readUint8();

        const roundsLog = buf.readUint8();
        if (roundsLog > 32) throw new Error('Rounds out-of-bounds');
        const rounds = Math.pow(2, roundsLog);

        switch (version) {
            case 1:
                return Secret._decryptV1(buf, key, rounds);
            case 2:
                return Secret._decryptV2(buf, key, rounds);
            case 3:
                return Secret._decryptV3(buf, key, rounds);
            default:
                throw new Error('Unsupported version');
        }
    }

    private static async _decryptV1(buf: SerialBuffer, key: Uint8Array, rounds: number): Promise<PrivateKey> {
        const ciphertext = buf.read(Secret.SIZE);
        const salt = buf.read(Secret.ENCRYPTION_SALT_SIZE);
        const check = buf.read(Secret.ENCRYPTION_CHECKSUM_SIZE);
        const plaintext = await CryptoUtils.otpKdfLegacy(ciphertext, key, salt, rounds);

        const privateKey = new PrivateKey(plaintext);
        const publicKey = PublicKey.derive(privateKey);
        const checksum = publicKey.hash().subarray(0, Secret.ENCRYPTION_CHECKSUM_SIZE);
        if (!BufferUtils.equals(check, checksum)) {
            throw new Error('Invalid key');
        }

        return privateKey;
    }

    private static async _decryptV2(buf: SerialBuffer, key: Uint8Array, rounds: number): Promise<PrivateKey> {
        const ciphertext = buf.read(Secret.SIZE);
        const salt = buf.read(Secret.ENCRYPTION_SALT_SIZE);
        const check = buf.read(Secret.ENCRYPTION_CHECKSUM_SIZE);
        const plaintext = await CryptoUtils.otpKdfLegacy(ciphertext, key, salt, rounds);

        const checksum = Hash.computeBlake2b(plaintext).subarray(0, Secret.ENCRYPTION_CHECKSUM_SIZE);
        if (!BufferUtils.equals(check, checksum)) {
            throw new Error('Invalid key');
        }

        return new PrivateKey(plaintext);
    }

    private static async _decryptV3(buf: SerialBuffer, key: Uint8Array, rounds: number): Promise<PrivateKey | Entropy> {
        const salt = buf.read(Secret.ENCRYPTION_SALT_SIZE);
        const ciphertext = buf.read(Secret.ENCRYPTION_CHECKSUM_SIZE_V3 + /*purposeId*/ 4 + Secret.SIZE);
        const plaintext = await CryptoUtils.otpKdf(ciphertext, key, salt, rounds);

        const check = plaintext.subarray(0, Secret.ENCRYPTION_CHECKSUM_SIZE_V3);
        const payload = plaintext.subarray(Secret.ENCRYPTION_CHECKSUM_SIZE_V3);
        const checksum = Hash.computeBlake2b(payload).subarray(0, Secret.ENCRYPTION_CHECKSUM_SIZE_V3);
        if (!BufferUtils.equals(check, checksum)) {
            throw new Error('Invalid key');
        }

        const purposeId = payload[0] << 24 | payload[1] << 16 | payload[2] << 8 | payload[3];
        const secret = payload.subarray(4);
        switch (purposeId) {
            case PrivateKey.PURPOSE_ID:
                return new PrivateKey(secret);
            case Entropy.PURPOSE_ID:
            default:
                return new Entropy(secret);
        }
    }

    async exportEncrypted(key: Uint8Array): Promise<SerialBuffer> {
        const salt = new Uint8Array(Secret.ENCRYPTION_SALT_SIZE);
        CryptoUtils.getRandomValues(salt);

        const data = new SerialBuffer(/*purposeId*/ 4 + Secret.SIZE);
        data.writeUint32(this._purposeId);
        data.write(this.serialize());

        const checksum = Hash.computeBlake2b(data).subarray(0, Secret.ENCRYPTION_CHECKSUM_SIZE_V3);
        const plaintext = new SerialBuffer(checksum.byteLength + data.byteLength);
        plaintext.write(checksum);
        plaintext.write(data);
        const ciphertext = await CryptoUtils.otpKdf(plaintext, key, salt, Secret.ENCRYPTION_KDF_ROUNDS);

        const buf = new SerialBuffer(/*version*/ 1 + /*kdf rounds*/ 1 + salt.byteLength + ciphertext.byteLength);
        buf.writeUint8(3); // version
        buf.writeUint8(Math.log2(Secret.ENCRYPTION_KDF_ROUNDS));
        buf.write(salt);
        buf.write(ciphertext);

        return buf;
    }

    get encryptedSize(): number {
        return /*version*/ 1
            + /*kdf rounds*/ 1
            + Secret.ENCRYPTION_SALT_SIZE
            + Secret.ENCRYPTION_CHECKSUM_SIZE_V3
            + /*purposeId*/ 4
            + Secret.SIZE;
    }

    get type(): Secret.Type {
        return this._type;
    }
}

namespace Secret {
    export enum Type {
        PRIVATE_KEY = 1,
        ENTROPY = 2,
    }
}

export { Secret };
