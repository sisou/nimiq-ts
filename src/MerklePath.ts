import { BufferUtils } from "./BufferUtils";
import { Hash } from "./Hash";
import { Hashable, MerkleTree } from "./MerkleTree";
import { NumberUtils } from "./NumberUtils";
import { SerialBuffer } from "./SerialBuffer";

export class MerklePath {
	private _nodes: MerklePathNode[];

    constructor(nodes: MerklePathNode[]) {
        if (!Array.isArray(nodes) || !NumberUtils.isUint8(nodes.length)
            || nodes.some(it => !(it instanceof MerklePathNode))) throw new Error('Malformed nodes');

        this._nodes = nodes;
    }

    static compute<T extends Hashable>(values: T[], leafValue: T, fnHash: (o: T) => Hash = MerkleTree.hash): MerklePath {
        const leafHash = fnHash(leafValue);
        const path: MerklePathNode[] = [];
        MerklePath._compute(values, leafHash, path, fnHash);
        return new MerklePath(path);
    }

    private static _compute<T>(values: T[], leafHash: Hash, path: MerklePathNode[], fnHash: (o: T) => Hash): { containsLeaf: boolean, inner: Hash } {
        const len = values.length;
        let hash;
        if (len === 0) {
            hash = Hash.light(new Uint8Array(0));
            return {containsLeaf: false, inner: hash};
        }
        if (len === 1) {
            hash = fnHash(values[0]);
            return {containsLeaf: hash.equals(leafHash), inner: hash};
        }

        const mid = Math.round(len / 2);
        const left = values.slice(0, mid);
        const right = values.slice(mid);
        const {containsLeaf: leftLeaf, inner: leftHash} = MerklePath._compute(left, leafHash, path, fnHash);
        const {containsLeaf: rightLeaf, inner: rightHash} = MerklePath._compute(right, leafHash, path, fnHash);
        hash = Hash.light(BufferUtils.concatTypedArrays(leftHash.serialize(), rightHash.serialize()));

        if (leftLeaf) {
            path.push(new MerklePathNode(rightHash, false));
            return {containsLeaf: true, inner: hash};
        } else if (rightLeaf) {
            path.push(new MerklePathNode(leftHash, true));
            return {containsLeaf: true, inner: hash};
        }

        return {containsLeaf: false, inner: hash};
    }

    computeRoot<T extends Hashable>(leafValue: T, fnHash: (o: T) => Hash = MerkleTree.hash): Hash {
        /** @type {Hash} */
        let root = fnHash(leafValue);
        for (const node of this._nodes) {
            const left = node.left;
            const hash = node.hash;
            const concat = new SerialBuffer(hash.serializedSize * 2);
            if (left) hash.serialize(concat);
            root.serialize(concat);
            if (!left) hash.serialize(concat);
            root = Hash.light(concat);
        }
        return root;
    }

    private static _compress(nodes: MerklePathNode[]): Uint8Array {
        const count = nodes.length;
        const leftBitsSize = Math.ceil(count / 8);
        const leftBits = new Uint8Array(leftBitsSize);

        for (let i = 0; i < count; i++) {
            if (nodes[i].left) {
                leftBits[Math.floor(i / 8)] |= 0x80 >>> (i % 8);
            }
        }

        return leftBits;
    }

    static unserialize(buf: SerialBuffer): MerklePath {
        const count = buf.readUint8();
        const leftBitsSize = Math.ceil(count / 8);
        const leftBits = buf.read(leftBitsSize);

        const nodes = [];
        for (let i = 0; i < count; i++) {
            const left = (leftBits[Math.floor(i / 8)] & (0x80 >>> (i % 8))) !== 0;
            const hash = Hash.unserialize(buf);
            nodes.push(new MerklePathNode(hash, left));
        }
        return new MerklePath(nodes);
    }

    serialize(buf?: SerialBuffer): SerialBuffer {
        buf = buf || new SerialBuffer(this.serializedSize);
        buf.writeUint8(this._nodes.length);
        buf.write(MerklePath._compress(this._nodes));

        for (const node of this._nodes) {
            node.hash.serialize(buf);
        }
        return buf;
    }

    get serializedSize(): number {
        const leftBitsSize = Math.ceil(this._nodes.length / 8);
        return /*count*/ 1
            + leftBitsSize
            + this._nodes.reduce((sum, node) => sum + node.hash.serializedSize, 0);
    }

    equals(o: unknown): boolean {
        return o instanceof MerklePath
            && this._nodes.length === o._nodes.length
            && this._nodes.every((node, i) => node.equals(o._nodes[i]));
    }

    get nodes(): MerklePathNode[] {
        return this._nodes;
    }
}

class MerklePathNode {
	private _hash: Hash;
	private _left: boolean;

    constructor(hash: Hash, left: boolean) {
        this._hash = hash;
        this._left = left;
    }

    get hash(): Hash {
        return this._hash;
    }

    get left(): boolean {
        return this._left;
    }

    equals(o: unknown): boolean {
        return o instanceof MerklePathNode
            && this._hash.equals(o.hash)
            && this._left === o.left;
    }
}
