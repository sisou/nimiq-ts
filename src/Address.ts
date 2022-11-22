import { BufferUtils } from "./BufferUtils";
import { Hash } from "./Hash";
import { SerialBuffer } from "./SerialBuffer";
import { Serializable } from "./Serializable";

export class Address extends Serializable {
    static CCODE = 'NQ';
    static SERIALIZED_SIZE = 20;
    static HEX_SIZE = 40;
    static NULL = new Address(new Uint8Array(Address.SERIALIZED_SIZE));
    static CONTRACT_CREATION = new Address(new Uint8Array(Address.SERIALIZED_SIZE));

    static copy(o: Address): Address {
        if (!o) return o;
        const obj = new Uint8Array(o._obj);
        return new Address(obj);
    }

    static fromHash(hash: Hash): Address {
        return new Address(hash.subarray(0, Address.SERIALIZED_SIZE));
    }

    private _obj: Uint8Array;

    constructor(arg: Uint8Array) {
        super();
        if (!(arg instanceof Uint8Array)) throw new Error('Primitive: Invalid type');
        if (arg.length !== Address.SERIALIZED_SIZE) throw new Error('Primitive: Invalid length');
        this._obj = arg;
    }

    /**
     * Create Address object from binary form.
     */
    static unserialize(buf: SerialBuffer): Address {
        return new Address(buf.read(Address.SERIALIZED_SIZE));
    }

    /**
     * Serialize this Address object into binary form.
     */
    serialize(buf?: SerialBuffer): SerialBuffer {
        buf = buf || new SerialBuffer(this.serializedSize);
        buf.write(this._obj);
        return buf;
    }

    subarray(begin?: number, end?: number): Uint8Array {
        return this._obj.subarray(begin, end);
    }

    get serializedSize(): number {
        return Address.SERIALIZED_SIZE;
    }

    equals(o: unknown): boolean {
        return o instanceof Address
            && super.equals(o);
    }

    static fromAny(addr: Address | string): Address {
        if (addr instanceof Address) return addr;
        if (typeof addr === 'string') return Address.fromString(addr);
        throw new Error('Invalid address format');
    }

    toPlain(): string {
        return this.toUserFriendlyAddress();
    }

    static fromString(str: string): Address {
        try {
            return Address.fromUserFriendlyAddress(str);
        } catch (e) {
            // Ignore
        }

        try {
            return Address.fromHex(str);
        } catch (e) {
            // Ignore
        }

        try {
            return Address.fromBase64(str);
        } catch (e) {
            // Ignore
        }

        throw new Error('Invalid address format');
    }

    static fromBase64(base64: string): Address {
        return new Address(BufferUtils.fromBase64(base64));
    }

    static fromHex(hex: string): Address {
        return new Address(BufferUtils.fromHex(hex));
    }

    static fromUserFriendlyAddress(str: string): Address {
        str = str.replace(/ /g, '');
        if (str.substring(0, 2).toUpperCase() !== Address.CCODE) {
            throw new Error('Invalid Address: Wrong country code');
        }
        if (str.length !== 36) {
            throw new Error('Invalid Address: Should be 36 chars (ignoring spaces)');
        }
        if (Address._ibanCheck(str.substring(4) + str.substring(0, 4)) !== 1) {
            throw new Error('Invalid Address: Checksum invalid');
        }
        return new Address(BufferUtils.fromBase32(str.substring(4)));
    }

    private static _ibanCheck(str: string): number {
        const num = str.split('').map((c) => {
            const code = c.toUpperCase().charCodeAt(0);
            return code >= 48 && code <= 57 ? c : (code - 55).toString();
        }).join('');
        let tmp = '';

        for (let i = 0; i < Math.ceil(num.length / 6); i++) {
            tmp = (parseInt(tmp + num.substring(i * 6, (i * 6) + 6)) % 97).toString();
        }

        return parseInt(tmp);
    }

    toUserFriendlyAddress(withSpaces: boolean = true): string {
        const base32 = BufferUtils.toBase32(this.serialize());
        // eslint-disable-next-line prefer-template
        const check = ('00' + (98 - Address._ibanCheck(base32 + Address.CCODE + '00'))).slice(-2);
        let res = Address.CCODE + check + base32;
        if (withSpaces) res = res.replace(/.{4}/g, '$& ').trim();
        return res;
    }
}
