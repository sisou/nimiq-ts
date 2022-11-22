import { SerialBuffer } from "./SerialBuffer";
import { Serializable } from "./Serializable";
import { WasmHelper } from "./WasmHelper";

export class Commitment extends Serializable {
	static SIZE = 32;

    static copy(o: Commitment): Commitment {
        if (!o) return o;
        return new Commitment(new Uint8Array(o._obj));
    }

    static sum(commitments: Commitment[]): Commitment {
        return new Commitment(Commitment._commitmentsAggregate(commitments.map(c => c._obj)));
    }

	private _obj: Uint8Array;

    constructor(arg: Uint8Array) {
        super();
        if (!(arg instanceof Uint8Array)) throw new Error('Primitive: Invalid type');
        if (arg.length !== Commitment.SIZE) throw new Error('Primitive: Invalid length');
        this._obj = arg;
    }

    static unserialize(buf: SerialBuffer): Commitment {
        return new Commitment(buf.read(Commitment.SIZE));
    }

    serialize(buf?: SerialBuffer): SerialBuffer {
        buf = buf || new SerialBuffer(this.serializedSize);
        buf.write(this._obj);
        return buf;
    }

    get serializedSize(): number {
        return Commitment.SIZE;
    }

    equals(o: unknown): boolean {
        return o instanceof Commitment && super.equals(o);
    }

    private static _commitmentsAggregate(commitments: Uint8Array[]): Uint8Array {
        if (commitments.some(commitment => commitment.byteLength !== Commitment.SIZE)) {
            throw Error('Wrong buffer size.');
        }
        const concatenatedCommitments = new Uint8Array(commitments.length * Commitment.SIZE);
        for (let i = 0; i < commitments.length; ++i) {
            concatenatedCommitments.set(commitments[i], i * Commitment.SIZE);
        }
		const Module = WasmHelper.Module;
		let stackPtr;
		try {
			stackPtr = Module.stackSave();
			const wasmOut = Module.stackAlloc(Commitment.SIZE);
			const wasmInCommitments = Module.stackAlloc(concatenatedCommitments.length);
			new Uint8Array(Module.HEAPU8.buffer, wasmInCommitments, concatenatedCommitments.length).set(concatenatedCommitments);
			Module._ed25519_aggregate_commitments(wasmOut, wasmInCommitments, commitments.length);
			const aggCommitments = new Uint8Array(Commitment.SIZE);
			aggCommitments.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, Commitment.SIZE));
			return aggCommitments;
		} catch (e) {
			// Log.w(CryptoWorkerImpl, e); // TODO: Log
			throw e;
		} finally {
			if (stackPtr !== undefined) Module.stackRestore(stackPtr);
		}
    }
}
