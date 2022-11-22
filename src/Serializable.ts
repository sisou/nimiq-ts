import { BufferUtils } from "./BufferUtils";
import { SerialBuffer } from "./SerialBuffer";

export abstract class Serializable {
    equals(o: unknown): boolean {
        return o instanceof Serializable && BufferUtils.equals(this.serialize(), o.serialize());
    }

    /**
     * Returns a negative number if `this` is smaller than o, a positive number if `this` is larger than o, and zero if equal.
     */
    compare(o: Serializable): number {
        return BufferUtils.compare(this.serialize(), o.serialize());
    }

    hashCode(): string {
        return this.toBase64();
    }

    abstract serialize(buf?: SerialBuffer): SerialBuffer;

    toString(): string {
        return this.toBase64();
    }

    toBase64(): string {
        return BufferUtils.toBase64(this.serialize());
    }

    toHex(): string {
        return BufferUtils.toHex(this.serialize());
    }
}
