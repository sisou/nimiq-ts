import { Address } from "./Address";
import { BufferUtils } from "./BufferUtils";
import { CryptoUtils } from "./CryptoUtils";
import { NumberUtils } from "./NumberUtils";
import { PrivateKey } from "./PrivateKey";
import { PublicKey } from "./PublicKey";
import { SerialBuffer } from "./SerialBuffer";
import { Serializable } from "./Serializable";

export class ExtendedPrivateKey extends Serializable {
    static CHAIN_CODE_SIZE = 32;

    private _key: PrivateKey;
    private _chainCode: Uint8Array;

    constructor(key: PrivateKey, chainCode: Uint8Array) {
        super();
        if (!(key instanceof PrivateKey)) throw new Error('ExtendedPrivateKey: Invalid key');
        if (!(chainCode instanceof Uint8Array)) throw new Error('ExtendedPrivateKey: Invalid chainCode');
        if (chainCode.length !== ExtendedPrivateKey.CHAIN_CODE_SIZE) throw new Error('ExtendedPrivateKey: Invalid chainCode length');
        this._key = key;
        this._chainCode = chainCode;
    }

    static generateMasterKey(seed: Uint8Array): ExtendedPrivateKey {
        const bCurve = BufferUtils.fromAscii('ed25519 seed');
        const hash = CryptoUtils.computeHmacSha512(bCurve, seed);
        return new ExtendedPrivateKey(new PrivateKey(hash.slice(0, 32)), hash.slice(32));
    }

    derive(index: number): ExtendedPrivateKey {
        // Only hardened derivation is allowed for ed25519.
        if (index < 0x80000000) index += 0x80000000;

        const data = new SerialBuffer(1 + PrivateKey.SIZE + 4);
        data.writeUint8(0);
        this._key.serialize(data);
        data.writeUint32(index);

        const hash = CryptoUtils.computeHmacSha512(this._chainCode, data);
        return new ExtendedPrivateKey(new PrivateKey(hash.slice(0, 32)), hash.slice(32));
    }

    static isValidPath(path: string): boolean {
        if (path.match(/^m(\/[0-9]+')*$/) === null) return false;

        // Overflow check.
        const segments = path.split('/');
        for (let i = 1; i < segments.length; i++) {
            if (!NumberUtils.isUint32(parseInt(segments[i]))) return false;
        }

        return true;
    }

    derivePath(path: string): ExtendedPrivateKey {
        if (!ExtendedPrivateKey.isValidPath(path)) throw new Error('Invalid path');

        let extendedKey: ExtendedPrivateKey = this;
        const segments = path.split('/');
        for (let i = 1; i < segments.length; i++) {
            const index = parseInt(segments[i]);
            extendedKey = extendedKey.derive(index);
        }
        return extendedKey;
    }

    static derivePathFromSeed(path: string, seed: Uint8Array): ExtendedPrivateKey {
        let extendedKey = ExtendedPrivateKey.generateMasterKey(seed);
        return extendedKey.derivePath(path);
    }

    static unserialize(buf: SerialBuffer): ExtendedPrivateKey {
        const privateKey = PrivateKey.unserialize(buf);
        const chainCode = buf.read(ExtendedPrivateKey.CHAIN_CODE_SIZE);
        return new ExtendedPrivateKey(privateKey, chainCode);
    }

    serialize(buf?: SerialBuffer): SerialBuffer {
        buf = buf || new SerialBuffer(this.serializedSize);
        this._key.serialize(buf);
        buf.write(this._chainCode);
        return buf;
    }

    get serializedSize(): number {
        return this._key.serializedSize + ExtendedPrivateKey.CHAIN_CODE_SIZE;
    }

    override equals(o: unknown): boolean {
        return o instanceof ExtendedPrivateKey && super.equals(o);
    }

    get privateKey(): PrivateKey {
        return this._key;
    }

    toAddress(): Address {
        return PublicKey.derive(this._key).toAddress();
    }
}
