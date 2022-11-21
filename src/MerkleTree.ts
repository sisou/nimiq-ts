import { BufferUtils } from "./BufferUtils";
import { Hash } from "./Hash";

export type Hashable = Hash | Uint8Array | { hash: () => Hash } | { serialize: () => Uint8Array };

export class MerkleTree {
    static computeRoot<T extends Hashable>(values: T[], fnHash: (o: T) => Hash = MerkleTree.hash): Hash {
        return MerkleTree._computeRoot(values, fnHash);
    }

    private static _computeRoot<T>(values: T[], fnHash: (o: T) => Hash): Hash {
        const len = values.length;
        if (len === 0) {
            return Hash.light(new Uint8Array(0));
        }
        if (len === 1) {
            return fnHash(values[0]);
        }

        const mid = Math.round(len / 2);
        const left = values.slice(0, mid);
        const right = values.slice(mid);
        const leftHash = MerkleTree._computeRoot(left, fnHash);
        const rightHash = MerkleTree._computeRoot(right, fnHash);
        return Hash.light(BufferUtils.concatTypedArrays(leftHash.serialize(), rightHash.serialize()));
    }

    static hash(o: Hashable): Hash {
        if (o instanceof Hash) {
            return o;
        }
        if ('hash' in o && typeof o.hash === 'function') {
            return o.hash();
        }
        if ('serialize' in o && typeof o.serialize === 'function') {
            return Hash.light(o.serialize());
        }
        if (o instanceof Uint8Array) {
            return Hash.light(o);
        }
        throw new Error('MerkleTree objects must be Uint8Array or have a .hash()/.serialize() method');
    }
}
