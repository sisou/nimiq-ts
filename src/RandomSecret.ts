import { SerialBuffer } from "./SerialBuffer";
import { Serializable } from "./Serializable";

export class RandomSecret extends Serializable {
	static SIZE = 32;

	private _obj: Uint8Array;

    constructor(arg: Uint8Array) {
        super();
        if (!(arg instanceof Uint8Array)) throw new Error('Primitive: Invalid type');
        if (arg.length !== RandomSecret.SIZE) throw new Error('Primitive: Invalid length');
        this._obj = arg;
    }

    static unserialize(buf: SerialBuffer): RandomSecret {
        return new RandomSecret(buf.read(RandomSecret.SIZE));
    }

    serialize(buf?: SerialBuffer): SerialBuffer {
        buf = buf || new SerialBuffer(this.serializedSize);
        buf.write(this._obj);
        return buf;
    }

    get serializedSize(): number {
        return RandomSecret.SIZE;
    }

    override equals(o: unknown): boolean {
        return o instanceof RandomSecret && super.equals(o);
    }
}
