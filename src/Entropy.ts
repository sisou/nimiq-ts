import { CryptoUtils } from "./CryptoUtils";
import { ExtendedPrivateKey } from "./ExtendedPrivateKey";
import { MnemonicUtils } from "./MnemonicUtils";
import { Secret } from "./Secret";
import { SerialBuffer } from "./SerialBuffer";
import { Serializable } from "./Serializable";

export class Entropy extends Secret {
    static SIZE = Secret.SIZE;
    static PURPOSE_ID = 0x42000002;

    private _obj: Uint8Array;

    constructor(arg: Uint8Array) {
        super(Secret.Type.ENTROPY, Entropy.PURPOSE_ID);
        if (!(arg instanceof Uint8Array)) throw new Error('Primitive: Invalid type');
        if (arg.length !== Entropy.SIZE) throw new Error('Primitive: Invalid length');
        this._obj = arg;
    }

    static generate(): Entropy {
        const entropy = new Uint8Array(Entropy.SIZE);
        CryptoUtils.getRandomValues(entropy);
        return new Entropy(entropy);
    }

    toExtendedPrivateKey(password?: string, wordlist?: string[]): ExtendedPrivateKey {
        return MnemonicUtils.mnemonicToExtendedPrivateKey(this.toMnemonic(wordlist), password);
    }

    toMnemonic(wordlist?: string[]): string[] {
        return MnemonicUtils.entropyToMnemonic(this, wordlist);
    }

    static unserialize(buf: SerialBuffer): Entropy {
        return new Entropy(buf.read(Entropy.SIZE));
    }

    serialize(buf?: SerialBuffer): SerialBuffer {
        buf = buf || new SerialBuffer(this.serializedSize);
        buf.write(this._obj);
        return buf;
    }

    get serializedSize(): number {
        return Entropy.SIZE;
    }

    /**
     * Overwrite this entropy with a replacement in-memory
     */
    overwrite(entropy: Entropy): void {
        this._obj.set(entropy._obj);
    }

    equals(o: Serializable): boolean {
        return o instanceof Entropy && super.equals(o);
    }
}
