import { BufferUtils } from "./BufferUtils";
import { SerialBuffer } from "./SerialBuffer";
import { Serializable } from "./Serializable";

export class PeerId extends Serializable {
    static SERIALIZED_SIZE = 16;

    static copy(o: PeerId): PeerId {
        if (!o) return o;
        const obj = new Uint8Array(o._obj);
        return new PeerId(obj);
    }

    private _obj: Uint8Array;

    constructor(arg: Uint8Array) {
        super();
        if (!(arg instanceof Uint8Array)) throw new Error('Primitive: Invalid type');
        if (arg.length !== PeerId.SERIALIZED_SIZE) throw new Error('Primitive: Invalid length');
        this._obj = arg;
    }

    /**
     * Create Address object from binary form.
     */
    static unserialize(buf: SerialBuffer): PeerId {
        return new PeerId(buf.read(PeerId.SERIALIZED_SIZE));
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
        return PeerId.SERIALIZED_SIZE;
    }

    equals(o: Serializable): boolean {
        return o instanceof PeerId
            && super.equals(o);
    }

    toString(): string {
        return this.toHex();
    }

    static fromBase64(base64: string): PeerId {
        return new PeerId(BufferUtils.fromBase64(base64));
    }

    static fromHex(hex: string): PeerId {
        return new PeerId(BufferUtils.fromHex(hex));
    }
}
