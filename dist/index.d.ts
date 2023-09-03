declare type WasmSource = BufferSource | WebAssembly.Module | Promise<BufferSource | WebAssembly.Module>;

declare type Config = {
    NETWORK_ID: number;
    NETWORK_NAME: string;
};
declare class GenesisConfig {
    static CONFIGS: Record<string, Config>;
    static _config?: Config;
    static main(): void;
    static test(): void;
    static dev(): void;
    static init(config: Config): void;
    static get NETWORK_ID(): number;
    static get NETWORK_NAME(): string;
    static networkIdToNetworkName(networkId: number): string;
    static networkIdFromAny(networkId: number | string): number;
}

declare class Policy {
    /**
     * Targeted block time in seconds.
     */
    static BLOCK_TIME: number;
    /**
     * Maximum block size in bytes.
     */
    static BLOCK_SIZE_MAX: number;
    /**
     * The highest (easiest) block PoW target.
     */
    static BLOCK_TARGET_MAX: bigint;
    /**
     * Number of blocks we take into account to calculate next difficulty.
     */
    static DIFFICULTY_BLOCK_WINDOW: number;
    /**
     * Limits the rate at which the difficulty is adjusted min/max.
     */
    static DIFFICULTY_MAX_ADJUSTMENT_FACTOR: number;
    /**
     * Number of blocks a transaction is valid.
     */
    static TRANSACTION_VALIDITY_WINDOW: number;
    /**
     * Number of Satoshis per Nimiq.
     */
    static LUNAS_PER_COIN: number;
    /**
     * Targeted total supply in lunas.
     */
    static TOTAL_SUPPLY: number;
    /**
     * Initial supply before genesis block in lunas.
     */
    static INITIAL_SUPPLY: number;
    /**
     * Emission speed.
     */
    static EMISSION_SPEED: number;
    /**
     * First block using constant tail emission until total supply is reached.
     */
    static EMISSION_TAIL_START: number;
    /**
     * Constant tail emission in lunas until total supply is reached.
     */
    static EMISSION_TAIL_REWARD: number;
    /**
     * NIPoPoW Security parameter M
     * FIXME naming
     */
    static M: number;
    /**
     * NIPoPoW Security parameter K
     * FIXME naming
     */
    static K: number;
    /**
     * NIPoPoW Security parameter DELTA
     * FIXME naming
     */
    static DELTA: number;
    /**
     * Number of blocks the light client downloads to verify the AccountsTree construction.
     * FIXME naming
     */
    static NUM_BLOCKS_VERIFICATION: number;
    /**
     * Maximum number of snapshots.
     */
    static NUM_SNAPSHOTS_MAX: number;
    /**
     * Stores the circulating supply before the given block.
     */
    private static _supplyCache;
    private static _supplyCacheMax;
    private static _supplyCacheInterval;
    /**
     * Convert Nimiq decimal to Number of Satoshis.
     */
    static coinsToLunas(coins: number): number;
    /**
     * Convert Number of Satoshis to Nimiq decimal.
     */
    static lunasToCoins(lunas: number): number;
    /** @deprecated Use coinsToLunas instead */
    static coinsToSatoshis(coins: number): number;
    /** @deprecated Use lunasToCoins instead */
    static satoshisToCoins(satoshis: number): number;
    /** @deprecated Use LUNAS_PER_COIN instead */
    static get SATOSHIS_PER_COIN(): number;
    /**
     * Circulating supply after block.
     */
    static supplyAfter(blockHeight: number): number;
    /**
     * Circulating supply after block.
     */
    private static _supplyAfter;
    /**
     * Miner reward per block.
     */
    static blockRewardAt(blockHeight: number): number;
    /**
     * Miner reward per block.
     */
    private static _blockRewardAt;
}

declare class SerialBuffer extends Uint8Array {
    private _view;
    private _readPos;
    private _writePos;
    static EMPTY: SerialBuffer;
    constructor(length: number);
    constructor(array: ArrayLike<number> | ArrayBufferLike);
    subarray(start?: number, end?: number): Uint8Array;
    get readPos(): number;
    set readPos(value: number);
    get writePos(): number;
    set writePos(value: number);
    /**
     * Resets the read and write position of the buffer to zero.
     */
    reset(): void;
    read(length: number): Uint8Array;
    write(array: Uint8Array): void;
    readUint8(): number;
    writeUint8(value: number): void;
    readUint16(): number;
    writeUint16(value: number): void;
    readUint32(): number;
    writeUint32(value: number): void;
    readUint64(): number;
    writeUint64(value: number): void;
    readVarUint(): number;
    writeVarUint(value: number): void;
    static varUintSize(value: number): number;
    readFloat64(): number;
    writeFloat64(value: number): void;
    readString(length: number): string;
    writeString(value: string, length: number): void;
    readPaddedString(length: number): string;
    writePaddedString(value: string, length: number): void;
    readVarLengthString(): string;
    writeVarLengthString(value: string): void;
    static varLengthStringSize(value: string): number;
}

declare type TypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Uint8ClampedArray | Float32Array | Float64Array;
declare class BufferUtils {
    static BASE64_ALPHABET: string;
    static BASE32_ALPHABET: {
        RFC4648: string;
        RFC4648_HEX: string;
        NIMIQ: string;
    };
    static HEX_ALPHABET: string;
    static _BASE64_LOOKUP: string[];
    private static _ISO_8859_15_DECODER?;
    private static _UTF8_ENCODER?;
    static toAscii(buffer: Uint8Array): string;
    static fromAscii(string: string): Uint8Array;
    static _codePointTextDecoder(buffer: Uint8Array): string;
    static _tripletToBase64(num: number): string;
    static _base64encodeChunk(u8: Uint8Array, start: number, end: number): string;
    static _base64fromByteArray(u8: Uint8Array): string;
    static toBase64(buffer: Uint8Array): string;
    static fromBase64(base64: string, length?: number): SerialBuffer;
    static toBase64Url(buffer: Uint8Array): string;
    static fromBase64Url(base64: string, length?: number): SerialBuffer;
    static toBase32(buf: Uint8Array, alphabet?: string): string;
    static fromBase32(base32: string, alphabet?: string): Uint8Array;
    static toHex(buffer: Uint8Array): string;
    static fromHex(hex: string, length?: number): SerialBuffer;
    static toBinary(buffer: ArrayLike<number>): string;
    private static _strToUint8Array;
    private static _utf8TextEncoder;
    static fromUtf8(str: string): Uint8Array;
    static fromAny(o: Uint8Array | string, length?: number): SerialBuffer;
    static concatTypedArrays<T extends TypedArray>(a: T, b: T): T;
    static equals(a: TypedArray, b: TypedArray): boolean;
    /**
     * Returns -1 if a is smaller than b, 1 if a is larger than b, 0 if a equals b.
     */
    static compare(a: TypedArray, b: TypedArray): number;
    static xor(a: Uint8Array, b: Uint8Array): Uint8Array;
    private static _toUint8View;
}

declare abstract class Serializable {
    equals(o: unknown): boolean;
    /**
     * Returns a negative number if `this` is smaller than o, a positive number if `this` is larger than o, and zero if equal.
     */
    compare(o: Serializable): number;
    hashCode(): string;
    abstract serialize(buf?: SerialBuffer): SerialBuffer;
    toString(): string;
    toBase64(): string;
    toHex(): string;
}

declare class Hash extends Serializable {
    static SIZE: Map<Hash.Algorithm, number>;
    static NULL: Hash;
    private _obj;
    private _algorithm;
    constructor(arg?: Uint8Array, algorithm?: Hash.Algorithm);
    /** @deprecated */
    static light(arr: Uint8Array): Hash;
    static blake2b(arr: Uint8Array): Hash;
    /** @deprecated */
    static hard(arr: Uint8Array): Promise<Hash>;
    static argon2d(arr: Uint8Array): Promise<Hash>;
    static sha256(arr: Uint8Array): Hash;
    static sha512(arr: Uint8Array): Hash;
    static compute(arr: Uint8Array, algorithm: Hash.Algorithm): Hash;
    static unserialize(buf: SerialBuffer, algorithm?: Hash.Algorithm): Hash;
    serialize(buf?: SerialBuffer): SerialBuffer;
    subarray(begin?: number, end?: number): Uint8Array;
    get serializedSize(): number;
    get array(): Uint8Array;
    get algorithm(): Hash.Algorithm;
    equals(o: unknown): boolean;
    static fromAny(hash: Hash | Uint8Array | string, algorithm?: Hash.Algorithm): Hash;
    toPlain(): string;
    static fromBase64(base64: string): Hash;
    static fromHex(hex: string): Hash;
    static fromPlain(str: string): Hash;
    static fromString(str: string): Hash;
    static isHash(o: unknown): o is Hash;
    static getSize(algorithm: Hash.Algorithm): number;
    static computeBlake2b(input: Uint8Array): Uint8Array;
    static computeSha256(input: Uint8Array): Uint8Array;
    static computeSha512(input: Uint8Array): Uint8Array;
}
declare namespace Hash {
    enum Algorithm {
        BLAKE2B = 1,
        ARGON2D = 2,
        SHA256 = 3,
        SHA512 = 4
    }
    namespace Algorithm {
        function toString(hashAlgorithm: Hash.Algorithm): string;
        function fromAny(algorithm: unknown): Hash.Algorithm;
    }
}

declare class Address extends Serializable {
    static CCODE: string;
    static SERIALIZED_SIZE: number;
    static HEX_SIZE: number;
    static NULL: Address;
    static CONTRACT_CREATION: Address;
    static copy(o: Address): Address;
    static fromHash(hash: Hash): Address;
    private _obj;
    constructor(arg: Uint8Array);
    /**
     * Create Address object from binary form.
     */
    static unserialize(buf: SerialBuffer): Address;
    /**
     * Serialize this Address object into binary form.
     */
    serialize(buf?: SerialBuffer): SerialBuffer;
    subarray(begin?: number, end?: number): Uint8Array;
    get serializedSize(): number;
    equals(o: unknown): boolean;
    static fromAny(addr: Address | string): Address;
    toPlain(): string;
    static fromString(str: string): Address;
    static fromBase64(base64: string): Address;
    static fromHex(hex: string): Address;
    static fromUserFriendlyAddress(str: string): Address;
    private static _ibanCheck;
    toUserFriendlyAddress(withSpaces?: boolean): string;
}

declare class Commitment extends Serializable {
    static SIZE: number;
    static copy(o: Commitment): Commitment;
    static sum(commitments: Commitment[]): Commitment;
    private _obj;
    constructor(arg: Uint8Array);
    static unserialize(buf: SerialBuffer): Commitment;
    serialize(buf?: SerialBuffer): SerialBuffer;
    get serializedSize(): number;
    equals(o: unknown): boolean;
    private static _commitmentsAggregate;
}

declare class CryptoUtils {
    static SHA512_BLOCK_SIZE: number;
    static getRandomValues(buf: Uint8Array): Uint8Array;
    static computeHmacSha512(key: Uint8Array, data: Uint8Array): Uint8Array;
    static computePBKDF2sha512(password: Uint8Array, salt: Uint8Array, iterations: number, derivedKeyLength: number): SerialBuffer;
    /** @deprecated */
    static otpKdfLegacy(message: Uint8Array, key: Uint8Array, salt: Uint8Array, iterations: number): Promise<Uint8Array>;
    static otpKdf(message: Uint8Array, key: Uint8Array, salt: Uint8Array, iterations: number): Promise<Uint8Array>;
}

declare abstract class Secret extends Serializable {
    private _type;
    private _purposeId;
    static SIZE: number;
    static ENCRYPTION_SALT_SIZE: number;
    static ENCRYPTION_KDF_ROUNDS: number;
    static ENCRYPTION_CHECKSUM_SIZE: number;
    static ENCRYPTION_CHECKSUM_SIZE_V3: number;
    constructor(type: Secret.Type, purposeId: number);
    static fromEncrypted(buf: SerialBuffer, key: Uint8Array): Promise<PrivateKey | Entropy>;
    private static _decryptV1;
    private static _decryptV2;
    private static _decryptV3;
    exportEncrypted(key: Uint8Array): Promise<SerialBuffer>;
    get encryptedSize(): number;
    get type(): Secret.Type;
}
declare namespace Secret {
    enum Type {
        PRIVATE_KEY = 1,
        ENTROPY = 2
    }
}

declare class PrivateKey extends Secret {
    static SIZE: number;
    static PURPOSE_ID: number;
    private _obj;
    constructor(arg: Uint8Array);
    static generate(): PrivateKey;
    static unserialize(buf: SerialBuffer): PrivateKey;
    serialize(buf?: SerialBuffer): SerialBuffer;
    get serializedSize(): number;
    /**
     * Overwrite this private key with a replacement in-memory
     */
    overwrite(privateKey: PrivateKey): void;
    equals(o: unknown): boolean;
    static _privateKeyDelinearize(privateKey: Uint8Array, publicKey: Uint8Array, publicKeysHash: Uint8Array): Uint8Array;
}

declare class ExtendedPrivateKey extends Serializable {
    static CHAIN_CODE_SIZE: number;
    private _key;
    private _chainCode;
    constructor(key: PrivateKey, chainCode: Uint8Array);
    static generateMasterKey(seed: Uint8Array): ExtendedPrivateKey;
    derive(index: number): ExtendedPrivateKey;
    static isValidPath(path: string): boolean;
    derivePath(path: string): ExtendedPrivateKey;
    static derivePathFromSeed(path: string, seed: Uint8Array): ExtendedPrivateKey;
    static unserialize(buf: SerialBuffer): ExtendedPrivateKey;
    serialize(buf?: SerialBuffer): SerialBuffer;
    get serializedSize(): number;
    equals(o: unknown): boolean;
    get privateKey(): PrivateKey;
    toAddress(): Address;
}

declare class Entropy extends Secret {
    static SIZE: number;
    static PURPOSE_ID: number;
    private _obj;
    constructor(arg: Uint8Array);
    static generate(): Entropy;
    toExtendedPrivateKey(password?: string, wordlist?: string[]): ExtendedPrivateKey;
    toMnemonic(wordlist?: string[]): string[];
    static unserialize(buf: SerialBuffer): Entropy;
    serialize(buf?: SerialBuffer): SerialBuffer;
    get serializedSize(): number;
    /**
     * Overwrite this entropy with a replacement in-memory
     */
    overwrite(entropy: Entropy): void;
    equals(o: unknown): boolean;
}

declare class PublicKey extends Serializable {
    static SIZE: number;
    static copy(o: PublicKey): PublicKey;
    private _obj;
    constructor(arg: Uint8Array);
    static derive(privateKey: PrivateKey): PublicKey;
    static sum(publicKeys: PublicKey[]): PublicKey;
    static unserialize(buf: SerialBuffer): PublicKey;
    static fromAny(o: PublicKey | Uint8Array | string): PublicKey;
    serialize(buf?: SerialBuffer): SerialBuffer;
    get serializedSize(): number;
    equals(o: unknown): boolean;
    hash(): Hash;
    compare(o: PublicKey): number;
    toAddress(): Address;
    static _delinearizeAndAggregatePublicKeys(publicKeys: PublicKey[]): PublicKey;
    private static _publicKeyDerive;
    static _publicKeysHash(publicKeys: Uint8Array[]): Uint8Array;
    static _publicKeyDelinearize(publicKey: Uint8Array, publicKeysHash: Uint8Array): Uint8Array;
    static _publicKeysDelinearizeAndAggregate(publicKeys: Uint8Array[], publicKeysHash: Uint8Array): Uint8Array;
}

declare class KeyPair extends Serializable {
    static LOCK_KDF_ROUNDS: number;
    private _locked;
    private _lockedInternally;
    private _lockSalt;
    private _publicKey;
    private _internalPrivateKey;
    private _unlockedPrivateKey;
    constructor(privateKey: PrivateKey, publicKey: PublicKey, locked?: boolean, lockSalt?: Uint8Array | null);
    static generate(): KeyPair;
    static derive(privateKey: PrivateKey): KeyPair;
    static fromHex(hexBuf: string): KeyPair;
    static unserialize(buf: SerialBuffer): KeyPair;
    serialize(buf?: SerialBuffer): SerialBuffer;
    /**
     * The unlocked private key.
     */
    get privateKey(): PrivateKey;
    /**
     * The private key in its current state, i.e., depending on this._locked.
     * If this._locked, it is the internally locked private key.
     * If !this._locked, it is either the internally unlocked private key (if !this._lockedInternally)
     * or this._unlockedPrivateKey.
     */
    private get _privateKey();
    get publicKey(): PublicKey;
    get serializedSize(): number;
    lock(key: Uint8Array, lockSalt?: Uint8Array): Promise<void>;
    unlock(key: Uint8Array): Promise<void>;
    /**
     * Destroy cached unlocked private key if the internal key is in locked state.
     */
    relock(): void;
    private _clearUnlockedPrivateKey;
    private _otpPrivateKey;
    get isLocked(): boolean;
    static fromEncrypted(buf: SerialBuffer, key: Uint8Array): Promise<KeyPair>;
    exportEncrypted(key: Uint8Array): Promise<SerialBuffer>;
    get encryptedSize(): number;
    equals(o: unknown): boolean;
}

declare type Hashable = Hash | Uint8Array | {
    hash: () => Hash;
} | {
    serialize: () => Uint8Array;
};
declare class MerkleTree {
    static computeRoot<T extends Hashable>(values: T[], fnHash?: (o: T) => Hash): Hash;
    private static _computeRoot;
    static hash(o: Hashable): Hash;
}

declare class MerklePath {
    private _nodes;
    constructor(nodes: MerklePathNode[]);
    static compute<T extends Hashable>(values: T[], leafValue: T, fnHash?: (o: T) => Hash): MerklePath;
    private static _compute;
    computeRoot<T extends Hashable>(leafValue: T, fnHash?: (o: T) => Hash): Hash;
    private static _compress;
    static unserialize(buf: SerialBuffer): MerklePath;
    serialize(buf?: SerialBuffer): SerialBuffer;
    get serializedSize(): number;
    equals(o: unknown): boolean;
    get nodes(): MerklePathNode[];
}
declare class MerklePathNode {
    private _hash;
    private _left;
    constructor(hash: Hash, left: boolean);
    get hash(): Hash;
    get left(): boolean;
    equals(o: unknown): boolean;
}

declare class MnemonicUtils {
    static ENGLISH_WORDLIST: string[];
    static DEFAULT_WORDLIST: string[];
    private static _crcChecksum;
    private static _sha256Checksum;
    private static _entropyToBits;
    private static _normalizeEntropy;
    private static _bitsToMnemonic;
    private static _mnemonicToBits;
    private static _bitsToEntropy;
    static entropyToMnemonic(entropy: string | ArrayBuffer | Uint8Array | Entropy, wordlist?: string[]): string[];
    /** @deprecated */
    static entropyToLegacyMnemonic(entropy: string | ArrayBuffer | Uint8Array | Entropy, wordlist?: string[]): string[];
    static mnemonicToEntropy(mnemonic: string[] | string, wordlist?: string[]): Entropy;
    /** @deprecated */
    static legacyMnemonicToEntropy(mnemonic: string[] | string, wordlist?: string[]): Entropy;
    private static _salt;
    static mnemonicToSeed(mnemonic: string[] | string, password?: string): SerialBuffer;
    static mnemonicToExtendedPrivateKey(mnemonic: string[] | string, password?: string): ExtendedPrivateKey;
    static isCollidingChecksum(entropy: Entropy): boolean;
    static getMnemonicType(mnemonic: string[] | string, wordlist?: string[]): MnemonicUtils.MnemonicType;
}
declare namespace MnemonicUtils {
    enum MnemonicType {
        UNKNOWN = -1,
        LEGACY = 0,
        BIP39 = 1
    }
}

declare class RandomSecret extends Serializable {
    static SIZE: number;
    private _obj;
    constructor(arg: Uint8Array);
    static unserialize(buf: SerialBuffer): RandomSecret;
    serialize(buf?: SerialBuffer): SerialBuffer;
    get serializedSize(): number;
    equals(o: unknown): boolean;
}

declare class CommitmentPair extends Serializable {
    static SERIALIZED_SIZE: number;
    static RANDOMNESS_SIZE: number;
    private _secret;
    private _commitment;
    constructor(secret: RandomSecret, commitment: Commitment);
    static generate(): CommitmentPair;
    static unserialize(buf: SerialBuffer): CommitmentPair;
    static fromHex(hexBuf: string): CommitmentPair;
    serialize(buf?: SerialBuffer): SerialBuffer;
    get secret(): RandomSecret;
    get commitment(): Commitment;
    get serializedSize(): number;
    equals(o: unknown): boolean;
    static _commitmentCreate(randomness: Uint8Array): {
        commitment: Uint8Array;
        secret: Uint8Array;
    };
}

declare class PartialSignature extends Serializable {
    static SIZE: number;
    private _obj;
    constructor(arg: Uint8Array);
    static create(privateKey: PrivateKey, publicKey: PublicKey, publicKeys: PublicKey[], secret: RandomSecret, aggregateCommitment: Commitment, data: Uint8Array): PartialSignature;
    static unserialize(buf: SerialBuffer): PartialSignature;
    serialize(buf?: SerialBuffer): SerialBuffer;
    get serializedSize(): number;
    equals(o: unknown): boolean;
    static _delinearizedPartialSignatureCreate(publicKeys: Uint8Array[], privateKey: Uint8Array, publicKey: Uint8Array, secret: Uint8Array, aggregateCommitment: Uint8Array, message: Uint8Array): Uint8Array;
}

declare class Signature extends Serializable {
    static SIZE: number;
    static copy(o: Signature): Signature;
    private _obj;
    constructor(arg: Uint8Array);
    static create(privateKey: PrivateKey, publicKey: PublicKey, data: Uint8Array): Signature;
    static fromPartialSignatures(commitment: Commitment, signatures: PartialSignature[]): Signature;
    static unserialize(buf: SerialBuffer): Signature;
    static fromAny(o: Signature | Uint8Array | string): Signature;
    serialize(buf?: SerialBuffer): SerialBuffer;
    get serializedSize(): number;
    verify(publicKey: PublicKey, data: Uint8Array): boolean;
    equals(o: unknown): boolean;
    private static _combinePartialSignatures;
    private static _aggregatePartialSignatures;
    private static _scalarsAdd;
    static _signatureCreate(privateKey: Uint8Array, publicKey: Uint8Array, message: Uint8Array): Uint8Array;
    static _signatureVerify(publicKey: Uint8Array, message: Uint8Array, signature: Uint8Array): boolean;
}

declare type PlainAccount = {
    type: string;
    balance: number;
};
declare abstract class Account {
    static TYPE_MAP: Map<Account.Type, {
        copy?: ((o: Account) => Account) | undefined;
        unserialize: (buf: SerialBuffer) => Account;
        create?: ((balance: number, blockHeight: number, transaction: Transaction) => Account) | undefined;
        verifyOutgoingTransaction: (transaction: Transaction) => boolean;
        verifyIncomingTransaction: (transaction: Transaction) => boolean;
        fromPlain: (o: object) => Account;
        dataToPlain: (data: Uint8Array) => Record<string, any>;
        proofToPlain: (proof: Uint8Array) => Record<string, any>;
    }>;
    static INITIAL: Account;
    static BalanceError: {
        new (): {
            name: string;
            message: string;
            stack?: string | undefined;
            cause?: unknown;
        };
        captureStackTrace(targetObject: object, constructorOpt?: Function | undefined): void;
        prepareStackTrace?: ((err: Error, stackTraces: NodeJS.CallSite[]) => any) | undefined;
        stackTraceLimit: number;
    };
    static DoubleTransactionError: {
        new (): {
            name: string;
            message: string;
            stack?: string | undefined;
            cause?: unknown;
        };
        captureStackTrace(targetObject: object, constructorOpt?: Function | undefined): void;
        prepareStackTrace?: ((err: Error, stackTraces: NodeJS.CallSite[]) => any) | undefined;
        stackTraceLimit: number;
    };
    static ProofError: {
        new (): {
            name: string;
            message: string;
            stack?: string | undefined;
            cause?: unknown;
        };
        captureStackTrace(targetObject: object, constructorOpt?: Function | undefined): void;
        prepareStackTrace?: ((err: Error, stackTraces: NodeJS.CallSite[]) => any) | undefined;
        stackTraceLimit: number;
    };
    static ValidityError: {
        new (): {
            name: string;
            message: string;
            stack?: string | undefined;
            cause?: unknown;
        };
        captureStackTrace(targetObject: object, constructorOpt?: Function | undefined): void;
        prepareStackTrace?: ((err: Error, stackTraces: NodeJS.CallSite[]) => any) | undefined;
        stackTraceLimit: number;
    };
    protected _type: Account.Type;
    protected _balance: number;
    constructor(type: Account.Type, balance: number);
    /**
     * Create Account object from binary form.
     */
    static unserialize(buf: SerialBuffer): Account;
    /**
     * Serialize this Account object into binary form.
     */
    serialize(buf?: SerialBuffer): SerialBuffer;
    get serializedSize(): number;
    /**
     * Check if two Accounts are the same.
     */
    equals(o: unknown): boolean;
    toString(): string;
    static fromAny(o: Account | Record<string, any>): Account;
    static fromPlain(plain: Record<string, any>): Account;
    toPlain(): PlainAccount;
    get balance(): number;
    get type(): Account.Type;
    withBalance(balance: number): Account;
    withIncomingTransaction(transaction: Transaction, blockHeight: number, revert?: boolean): Account;
    withContractCommand(transaction: Transaction, blockHeight: number, revert?: boolean): Account;
    isInitial(): boolean;
    isToBePruned(): boolean;
    static dataToPlain(data: Uint8Array): Record<string, any>;
    static proofToPlain(proof: Uint8Array): Record<string, any>;
}
declare namespace Account {
    /**
     * Enum for Account types.
     * Non-zero values are contracts.
     */
    enum Type {
        /**
         * Basic account type.
         * @see {BasicAccount}
         */
        BASIC = 0,
        /**
         * Account with vesting functionality.
         * @see {VestingContract}
         */
        VESTING = 1,
        /**
         * Hashed Time-Locked Contract
         * @see {HashedTimeLockedContract}
         */
        HTLC = 2
    }
    namespace Type {
        function toString(type: Account.Type): string;
        function fromAny(type: unknown): Account.Type;
    }
}

declare abstract class Transaction {
    static FORMAT_MAP: Map<Transaction.Format, {
        unserialize: (buf: SerialBuffer) => Transaction;
        fromPlain: (plain: object) => Transaction;
    }>;
    protected _format: Transaction.Format;
    protected _sender: Address;
    protected _senderType: Account.Type;
    protected _recipient: Address;
    protected _recipientType: Account.Type;
    protected _value: number;
    protected _fee: number;
    protected _networkId: number;
    protected _validityStartHeight: number;
    protected _flags: Transaction.Flag;
    protected _data: Uint8Array;
    protected _proof: Uint8Array;
    protected _valid?: boolean;
    protected _hash?: Hash;
    constructor(format: Transaction.Format, sender: Address, senderType: Account.Type, recipient: Address, recipientType: Account.Type, value: number, fee: number, validityStartHeight: number, flags: Transaction.Flag, data: Uint8Array, proof: Uint8Array, networkId?: number);
    static unserialize(buf: SerialBuffer): Transaction;
    serializeContent(buf?: SerialBuffer): SerialBuffer;
    get serializedContentSize(): number;
    verify(networkId?: number): boolean;
    private _verify;
    get serializedSize(): number;
    serialize(buf?: SerialBuffer): SerialBuffer;
    hash(): Hash;
    compare(o: Transaction): number;
    compareBlockOrder(o: Transaction): number;
    equals(o: unknown): boolean;
    toString(): string;
    toPlain(): {
        transactionHash: string;
        format: string;
        sender: string;
        senderType: string;
        recipient: string;
        recipientType: string;
        value: number;
        fee: number;
        feePerByte: number;
        validityStartHeight: number;
        network: string;
        flags: number;
        data: Record<string, any>;
        proof: Record<string, any>;
        size: number;
        valid: boolean;
    };
    static fromPlain(plain: Record<string, any>): Transaction;
    static fromAny(tx: Transaction | string | Record<string, any>): Transaction;
    getContractCreationAddress(): Address;
    get format(): Transaction.Format;
    get sender(): Address;
    get senderType(): Account.Type;
    get recipient(): Address;
    get recipientType(): Account.Type;
    get value(): number;
    get fee(): number;
    get feePerByte(): number;
    get networkId(): number;
    get validityStartHeight(): number;
    get flags(): number;
    hasFlag(flag: Transaction.Flag): boolean;
    get data(): Uint8Array;
    get proof(): Uint8Array;
    set proof(proof: Uint8Array);
}
declare namespace Transaction {
    enum Format {
        BASIC = 0,
        EXTENDED = 1
    }
    namespace Format {
        function toString(format: Transaction.Format): string;
        function fromAny(format: unknown): Transaction.Format;
    }
    enum Flag {
        NONE = 0,
        CONTRACT_CREATION = 1,
        ALL = 1
    }
}

declare class SignatureProof {
    static verifyTransaction(transaction: Transaction): boolean;
    static singleSig(publicKey: PublicKey, signature?: Signature): SignatureProof;
    static multiSig(signerKey: PublicKey, publicKeys: PublicKey[], signature: Signature): SignatureProof;
    private _publicKey;
    private _merklePath;
    private _signature?;
    constructor(publicKey: PublicKey, merklePath: MerklePath, signature?: Signature);
    static unserialize(buf: SerialBuffer): SignatureProof;
    serialize(buf?: SerialBuffer): SerialBuffer;
    get serializedSize(): number;
    static get SINGLE_SIG_SIZE(): number;
    equals(o: unknown): boolean;
    verify(sender: Address | null, data: Uint8Array): boolean;
    isSignedBy(sender: Address): boolean;
    get publicKey(): PublicKey;
    get merklePath(): MerklePath;
    get signature(): Signature | undefined;
    set signature(signature: Signature | undefined);
}

declare class Wallet {
    /**
     * Create a new Wallet.
     */
    static generate(): Wallet;
    static loadPlain(buf: Uint8Array | string): Wallet;
    static loadEncrypted(buf: Uint8Array | string, key: Uint8Array | string): Promise<Wallet>;
    protected _keyPair: KeyPair;
    protected _address: Address;
    /**
     * Create a new Wallet object.
     */
    constructor(keyPair: KeyPair);
    createTransaction(recipient: Address, value: number, fee: number, validityStartHeight: number): Transaction;
    /**
     * Sign a transaction by the owner of this Wallet.
     */
    signTransaction(transaction: Transaction): SignatureProof;
    exportPlain(): SerialBuffer;
    exportEncrypted(key: Uint8Array | string): Promise<SerialBuffer>;
    get isLocked(): boolean;
    lock(key: Uint8Array | string): Promise<void>;
    relock(): void;
    unlock(key: Uint8Array | string): Promise<void>;
    equals(o: unknown): boolean;
    /**
     * The address of the Wallet owner.
     */
    get address(): Address;
    /**
     * The public key of the Wallet owner
     */
    get publicKey(): PublicKey;
    get keyPair(): KeyPair;
}

declare class MultiSigWallet extends Wallet {
    /**
     * Create a new MultiSigWallet object.
     */
    static fromPublicKeys(keyPair: KeyPair, minSignatures: number, publicKeys: PublicKey[]): MultiSigWallet;
    private static _loadMultiSig;
    static loadPlain(buf: Uint8Array | string): MultiSigWallet;
    static loadEncrypted(buf: Uint8Array | string, key: Uint8Array | string): Promise<MultiSigWallet>;
    private _minSignatures;
    private _publicKeys;
    constructor(keyPair: KeyPair, minSignatures: number, publicKeys: PublicKey[]);
    exportPlain(): SerialBuffer;
    get exportedSize(): number;
    exportEncrypted(key: Uint8Array | string): Promise<SerialBuffer>;
    get encryptedSize(): number;
    /**
     * Create a Transaction that still needs to be signed.
     */
    createTransaction(recipientAddr: Address, value: number, fee: number, validityStartHeight: number): Transaction;
    /**
     * Creates a commitment pair for signing a transaction.
     */
    createCommitment(): CommitmentPair;
    partiallySignTransaction(transaction: Transaction, publicKeys: PublicKey[], aggregatedCommitment: Commitment, secret: RandomSecret): PartialSignature;
    /**
     * Sign a transaction by the owner of this Wallet.
     * @ts-expect-error Cannot change arguments for method overrides */
    signTransaction(transaction: Transaction, aggregatedPublicKey: PublicKey, aggregatedCommitment: Commitment, signatures: PartialSignature[]): SignatureProof;
    completeTransaction(transaction: Transaction, aggregatedPublicKey: PublicKey, aggregatedCommitment: Commitment, signatures: PartialSignature[]): Transaction;
    get minSignatures(): number;
    get publicKeys(): PublicKey[];
}

/**
 * This is a classic account that can send all his funds and receive any transaction.
 * All outgoing transactions are signed using the key corresponding to this address.
 */
declare class BasicAccount extends Account {
    static copy(o: BasicAccount): BasicAccount;
    constructor(balance?: number);
    static unserialize(buf: SerialBuffer): BasicAccount;
    static fromPlain(o: Record<string, any>): BasicAccount;
    /**
     * Check if two Accounts are the same.
     */
    equals(o: unknown): boolean;
    toString(): string;
    static verifyOutgoingTransaction(transaction: Transaction): boolean;
    static verifyIncomingTransaction(transaction: Transaction): boolean;
    withBalance(balance: number): BasicAccount;
    isInitial(): boolean;
    static dataToPlain(data: Uint8Array): Record<string, any>;
    static proofToPlain(proof: Uint8Array): Record<string, any>;
}

declare abstract class Contract extends Account {
    constructor(type: Account.Type, balance: number);
    static verifyIncomingTransaction(transaction: Transaction): boolean;
    withIncomingTransaction(transaction: Transaction, blockHeight: number, revert?: boolean): Account;
    withContractCommand(transaction: Transaction, blockHeight: number, revert?: boolean): Account;
}

declare type PlainVestingContract = {
    type: 'vesting';
    balance: number;
    owner: string;
    vestingStart: number;
    vestingStepBlocks: number;
    vestingStepAmount: number;
    vestingTotalAmount: number;
};
declare class VestingContract extends Contract {
    private _owner;
    private _vestingStart;
    private _vestingStepBlocks;
    private _vestingStepAmount;
    private _vestingTotalAmount;
    constructor(balance?: number, owner?: Address, vestingStart?: number, vestingStepBlocks?: number, vestingStepAmount?: number, vestingTotalAmount?: number);
    static create(balance: number, blockHeight: number, transaction: Transaction): VestingContract;
    static unserialize(buf: SerialBuffer): VestingContract;
    static fromPlain(plain: Record<string, any>): VestingContract;
    /**
     * Serialize this VestingContract object into binary form.
     */
    serialize(buf?: SerialBuffer): SerialBuffer;
    get serializedSize(): number;
    get owner(): Address;
    get vestingStart(): number;
    get vestingStepBlocks(): number;
    get vestingStepAmount(): number;
    get vestingTotalAmount(): number;
    toString(): string;
    toPlain(): PlainVestingContract;
    /**
     * Check if two Accounts are the same.
     */
    equals(o: unknown): boolean;
    static verifyOutgoingTransaction(transaction: Transaction): boolean;
    static verifyIncomingTransaction(transaction: Transaction): boolean;
    withBalance(balance: number): VestingContract;
    withIncomingTransaction(transaction: Transaction, blockHeight: number, revert?: boolean): VestingContract;
    getMinCap(blockHeight: number): number;
    static dataToPlain(data: Uint8Array): Record<string, any>;
    static proofToPlain(proof: Uint8Array): Record<string, any>;
}

declare type PlainHashedTimeLockedContract = {
    type: 'htlc';
    balance: number;
    sender: string;
    recipient: string;
    hashAlgorithm: string;
    hashRoot: string;
    hashCount: number;
    timeout: number;
    totalAmount: number;
};
declare class HashedTimeLockedContract extends Contract {
    private _sender;
    private _recipient;
    private _hashRoot;
    private _hashCount;
    private _timeout;
    private _totalAmount;
    constructor(balance?: number, sender?: Address, recipient?: Address, hashRoot?: Hash, hashCount?: number, timeout?: number, totalAmount?: number);
    static create(balance: number, blockHeight: number, transaction: Transaction): HashedTimeLockedContract;
    static unserialize(buf: SerialBuffer): HashedTimeLockedContract;
    static fromPlain(plain: Record<string, any>): HashedTimeLockedContract;
    /**
     * Serialize this HTLC object into binary form.
     */
    serialize(buf?: SerialBuffer): SerialBuffer;
    get serializedSize(): number;
    get sender(): Address;
    get recipient(): Address;
    get hashAlgorithm(): Hash.Algorithm;
    get hashRoot(): Hash;
    get hashCount(): number;
    get timeout(): number;
    get totalAmount(): number;
    toString(): string;
    toPlain(): PlainHashedTimeLockedContract;
    /**
     * Check if two Accounts are the same.
     */
    equals(o: unknown): boolean;
    static verifyOutgoingTransaction(transaction: Transaction): boolean;
    static verifyIncomingTransaction(transaction: Transaction): boolean;
    withBalance(balance: number): HashedTimeLockedContract;
    withIncomingTransaction(transaction: Transaction, blockHeight: number, revert?: boolean): HashedTimeLockedContract;
    static dataToPlain(data: Uint8Array): Record<string, any>;
    static proofToPlain(proof: Uint8Array): Record<string, any>;
}
declare namespace HashedTimeLockedContract {
    enum ProofType {
        REGULAR_TRANSFER = 1,
        EARLY_RESOLVE = 2,
        TIMEOUT_RESOLVE = 3
    }
    namespace ProofType {
        function toString(proofType: HashedTimeLockedContract.ProofType): string;
    }
}

declare class BasicTransaction extends Transaction {
    private _signatureProof;
    constructor(senderPubKey: PublicKey, recipient: Address, value: number, fee: number, validityStartHeight: number, signature?: Signature, networkId?: number);
    static unserialize(buf: SerialBuffer): Transaction;
    static fromPlain(plain: Record<string, any>): BasicTransaction;
    serialize(buf?: SerialBuffer): SerialBuffer;
    get serializedSize(): number;
    get senderPubKey(): PublicKey;
    get signature(): Signature | undefined;
    set signature(signature: Signature | undefined);
}

declare class ExtendedTransaction extends Transaction {
    constructor(sender: Address, senderType: Account.Type, recipient: Address, recipientType: Account.Type, value: number, fee: number, validityStartHeight: number, flags: Transaction.Flag, data: Uint8Array, proof?: Uint8Array, networkId?: number);
    static unserialize(buf: SerialBuffer): ExtendedTransaction;
    static fromPlain(plain: Record<string, any>): ExtendedTransaction;
    serialize(buf?: SerialBuffer): SerialBuffer;
    get serializedSize(): number;
}

declare function initialize(options?: {
    wasm: WasmSource;
}): Promise<void>;

export { Account, Address, BasicAccount, BasicTransaction, BufferUtils, Commitment, CommitmentPair, CryptoUtils, Entropy, ExtendedPrivateKey, ExtendedTransaction, GenesisConfig, Hash, HashedTimeLockedContract, KeyPair, MerklePath, MerkleTree, MnemonicUtils, MultiSigWallet, PartialSignature, Policy, PrivateKey, PublicKey, RandomSecret, Secret, SerialBuffer, Signature, SignatureProof, Transaction, VestingContract, Wallet, initialize };
