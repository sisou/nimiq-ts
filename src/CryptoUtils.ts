import { BufferUtils } from "./BufferUtils";
import { CryptoWorker } from "./CryptoWorker";
import { Hash } from "./Hash";
import { SerialBuffer } from "./SerialBuffer";

export class CryptoUtils {
    static SHA512_BLOCK_SIZE = 128;

    static getRandomValues(buf: Uint8Array): Uint8Array {
        if (typeof window !== 'undefined') {
            // Browser and Deno
            return window.crypto.getRandomValues(buf);
        } else {
            // NodeJS
            const crypto = require("crypto");
            if (!(buf instanceof Uint8Array)) {
                throw new TypeError('expected Uint8Array');
            }
            if (buf.length > 65536) {
                const e = new Error();
                // e.code = 22;
                e.message = `Failed to execute 'getRandomValues' on 'Crypto': The ArrayBufferView's byte length ${buf.length} exceeds the number of bytes of entropy available via this API (65536).`;
                e.name = 'QuotaExceededError';
                throw e;
            }
            const bytes = crypto.randomBytes(buf.length);
            buf.set(bytes);
            return buf;
        }
    }

    static computeHmacSha512(key: Uint8Array, data: Uint8Array): Uint8Array {
        if (key.length > CryptoUtils.SHA512_BLOCK_SIZE) {
            key = new SerialBuffer(Hash.computeSha512(key));
        }

        const iKey = new SerialBuffer(CryptoUtils.SHA512_BLOCK_SIZE);
        const oKey = new SerialBuffer(CryptoUtils.SHA512_BLOCK_SIZE);
        for (let i = 0; i < CryptoUtils.SHA512_BLOCK_SIZE; ++i) {
            const byte = key[i] || 0;
            iKey[i] = 0x36 ^ byte;
            oKey[i] = 0x5c ^ byte;
        }

        const innerHash = Hash.computeSha512(BufferUtils.concatTypedArrays(iKey, data));
        return Hash.computeSha512(BufferUtils.concatTypedArrays(oKey, innerHash));
    }

    static computePBKDF2sha512(password: Uint8Array, salt: Uint8Array, iterations: number, derivedKeyLength: number): SerialBuffer {
        // Following https://www.ietf.org/rfc/rfc2898.txt
        const hashLength = Hash.SIZE.get(Hash.Algorithm.SHA512)!;

        if (derivedKeyLength > (Math.pow(2, 32) - 1) * hashLength) {
            throw new Error('Derived key too long');
        }

        const l = Math.ceil(derivedKeyLength / hashLength);
        const r = derivedKeyLength - (l - 1) * hashLength;

        const derivedKey = new SerialBuffer(derivedKeyLength);
        for (let i = 1; i <= l; i++) {
            let u1 = new SerialBuffer(salt.length + 4);
            u1.write(salt);
            u1.writeUint32(i);

            let u2 = CryptoUtils.computeHmacSha512(password, u1);
            const t = u2;
            for (let j = 1; j < iterations; j++) {
                u2 = CryptoUtils.computeHmacSha512(password, u2);
                for (let k = 0; k < t.length; k++) {
                    t[k] ^= u2[k];
                }
            }

            if (i < l) {
                derivedKey.write(t);
            } else {
                derivedKey.write(t.slice(0, r));
            }
        }
        return derivedKey;
    }

    /**
     * @deprecated
     */
    static async otpKdfLegacy(message: Uint8Array, key: Uint8Array, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
        const worker = await CryptoWorker.getInstanceAsync();
        const derivedKey = await worker.kdfLegacy(key, salt, iterations, message.byteLength);
        return BufferUtils.xor(message, derivedKey);
    }

    static async otpKdf(message: Uint8Array, key: Uint8Array, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
        const worker = await CryptoWorker.getInstanceAsync();
        const derivedKey = await worker.kdf(key, salt, iterations, message.byteLength);
        return BufferUtils.xor(message, derivedKey);
    }

}
