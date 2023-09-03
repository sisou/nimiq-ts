'use strict';

function _loadWasmModule (sync, filepath, src, imports) {
  function _instantiateOrCompile(source, imports, stream) {
    var instantiateFunc = stream ? WebAssembly.instantiateStreaming : WebAssembly.instantiate;
    var compileFunc = stream ? WebAssembly.compileStreaming : WebAssembly.compile;

    if (imports) {
      return instantiateFunc(source, imports)
    } else {
      return compileFunc(source)
    }
  }

  
var buf = null;
if (filepath) {
  
var fs = require("fs");
var path = require("path");

return new Promise((resolve, reject) => {
  fs.readFile(path.resolve(__dirname, filepath), (error, buffer) => {
    if (error != null) {
      reject(error);
    }

    resolve(_instantiateOrCompile(buffer, imports, false));
  });
});

}


buf = Buffer.from(src, 'base64');



  if(sync) {
    var mod = new WebAssembly.Module(buf);
    return imports ? new WebAssembly.Instance(mod, imports) : mod
  } else {
    return _instantiateOrCompile(buf, imports, false)
  }
}

function nimiqWasm(imports){return _loadWasmModule(0, '193db452c088d27c.wasm', null, imports)}

let loadModule;
function setWasmInit(init) {
  loadModule = init;
}
class WasmHelper {
  static _module;
  static async doImport() {
    if (WasmHelper._module)
      return;
    if (!loadModule)
      throw new Error("No WebAssembly.Module available");
    const moduleSettings = {};
    const wasmSource = await loadModule();
    if (wasmSource instanceof WebAssembly.Module) {
      moduleSettings.wasmModule = wasmSource;
    } else {
      moduleSettings.wasmBinary = wasmSource;
    }
    const { init } = await Promise.resolve().then(function () { return workerWasm; });
    const runtimeInitialized = new Promise((resolve) => {
      moduleSettings.onRuntimeInitialized = () => resolve(true);
    });
    WasmHelper._module = init(moduleSettings);
    await runtimeInitialized;
  }
  static get Module() {
    if (!WasmHelper._module)
      throw new Error("WebAssembly not loaded, call WasmHelper.doImport() first");
    return WasmHelper._module;
  }
}

class GenesisConfig {
  static CONFIGS = {
    "main": {
      NETWORK_ID: 42,
      NETWORK_NAME: "main"
    },
    "test": {
      NETWORK_ID: 1,
      NETWORK_NAME: "test"
    },
    "dev": {
      NETWORK_ID: 2,
      NETWORK_NAME: "dev"
    }
  };
  static _config;
  static main() {
    GenesisConfig.init(GenesisConfig.CONFIGS["main"]);
  }
  static test() {
    GenesisConfig.init(GenesisConfig.CONFIGS["test"]);
  }
  static dev() {
    GenesisConfig.init(GenesisConfig.CONFIGS["dev"]);
  }
  static init(config) {
    if (GenesisConfig._config)
      throw new Error("GenesisConfig already initialized");
    if (!config.NETWORK_ID)
      throw new Error("Config is missing network id");
    if (!config.NETWORK_NAME)
      throw new Error("Config is missing network name");
    GenesisConfig._config = config;
  }
  static get NETWORK_ID() {
    if (!GenesisConfig._config)
      throw new Error("GenesisConfig not initialized");
    return GenesisConfig._config.NETWORK_ID;
  }
  static get NETWORK_NAME() {
    if (!GenesisConfig._config)
      throw new Error("GenesisConfig not initialized");
    return GenesisConfig._config.NETWORK_NAME;
  }
  static networkIdToNetworkName(networkId) {
    for (const key of Object.keys(GenesisConfig.CONFIGS)) {
      const config = GenesisConfig.CONFIGS[key];
      if (networkId === config.NETWORK_ID) {
        return config.NETWORK_NAME;
      }
    }
    throw new Error(`Unable to find networkName for networkId ${networkId}`);
  }
  static networkIdFromAny(networkId) {
    if (typeof networkId === "number")
      return networkId;
    if (GenesisConfig.CONFIGS[networkId]) {
      return GenesisConfig.CONFIGS[networkId].NETWORK_ID;
    }
    throw new Error(`Unable to find networkId for ${networkId}`);
  }
}

class Policy {
  static BLOCK_TIME = 60;
  static BLOCK_SIZE_MAX = 1e5;
  static BLOCK_TARGET_MAX = BigInt(2) ** BigInt(240);
  static DIFFICULTY_BLOCK_WINDOW = 120;
  static DIFFICULTY_MAX_ADJUSTMENT_FACTOR = 2;
  static TRANSACTION_VALIDITY_WINDOW = 120;
  static LUNAS_PER_COIN = 1e5;
  static TOTAL_SUPPLY = 21e14;
  static INITIAL_SUPPLY = 252e12;
  static EMISSION_SPEED = Math.pow(2, 22);
  static EMISSION_TAIL_START = 48692960;
  static EMISSION_TAIL_REWARD = 4e3;
  static M = 240;
  static K = 120;
  static DELTA = 0.15;
  static NUM_BLOCKS_VERIFICATION = 250;
  static NUM_SNAPSHOTS_MAX = 20;
  static _supplyCache = /* @__PURE__ */ new Map();
  static _supplyCacheMax = 0;
  static _supplyCacheInterval = 5e3;
  static coinsToLunas(coins) {
    return Math.round(coins * Policy.LUNAS_PER_COIN);
  }
  static lunasToCoins(lunas) {
    return lunas / Policy.LUNAS_PER_COIN;
  }
  static coinsToSatoshis(coins) {
    return Policy.coinsToLunas(coins);
  }
  static satoshisToCoins(satoshis) {
    return Policy.lunasToCoins(satoshis);
  }
  static get SATOSHIS_PER_COIN() {
    return Policy.LUNAS_PER_COIN;
  }
  static supplyAfter(blockHeight) {
    let startHeight = Math.floor(blockHeight / Policy._supplyCacheInterval) * Policy._supplyCacheInterval;
    startHeight = Math.max(0, Math.min(startHeight, Policy._supplyCacheMax));
    const startI = startHeight / Policy._supplyCacheInterval;
    const endI = Math.floor(blockHeight / Policy._supplyCacheInterval);
    let supply = startHeight === 0 ? Policy.INITIAL_SUPPLY : Policy._supplyCache.get(startHeight);
    for (let i = startI; i < endI; ++i) {
      startHeight = i * Policy._supplyCacheInterval;
      const endHeight = (i + 1) * Policy._supplyCacheInterval - 1;
      supply = Policy._supplyAfter(supply, endHeight, startHeight);
      Policy._supplyCache.set(endHeight + 1, supply);
      Policy._supplyCacheMax = endHeight + 1;
    }
    return Policy._supplyAfter(supply, blockHeight, endI * Policy._supplyCacheInterval);
  }
  static _supplyAfter(initialSupply, blockHeight, startHeight = 0) {
    let supply = initialSupply;
    for (let i = startHeight; i <= blockHeight; ++i) {
      supply += Policy._blockRewardAt(supply, i);
    }
    return supply;
  }
  static blockRewardAt(blockHeight) {
    const currentSupply = Policy.supplyAfter(blockHeight - 1);
    return Policy._blockRewardAt(currentSupply, blockHeight);
  }
  static _blockRewardAt(currentSupply, blockHeight) {
    if (blockHeight <= 0)
      return 0;
    const remaining = Policy.TOTAL_SUPPLY - currentSupply;
    if (blockHeight >= Policy.EMISSION_TAIL_START && remaining >= Policy.EMISSION_TAIL_REWARD) {
      return Policy.EMISSION_TAIL_REWARD;
    }
    const remainder = remaining % Policy.EMISSION_SPEED;
    return (remaining - remainder) / Policy.EMISSION_SPEED;
  }
}

class ArrayUtils {
  static randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  static subarray(uintarr, begin, end) {
    function clamp(v, min, max) {
      return v < min ? min : v > max ? max : v;
    }
    if (begin === void 0) {
      begin = 0;
    }
    if (end === void 0) {
      end = uintarr.byteLength;
    }
    begin = clamp(begin, 0, uintarr.byteLength);
    end = clamp(end, 0, uintarr.byteLength);
    let len = end - begin;
    if (len < 0) {
      len = 0;
    }
    return new Uint8Array(uintarr.buffer, uintarr.byteOffset + begin, len);
  }
  static *k_combinations(list, k) {
    const n = list.length;
    if (k > n) {
      return;
    }
    const indices = Array.from(new Array(k), (x, i) => i);
    yield indices.map((i) => list[i]);
    const reverseRange = Array.from(new Array(k), (x, i) => k - i - 1);
    while (true) {
      let i = k - 1, found = false;
      for (i of reverseRange) {
        if (indices[i] !== i + n - k) {
          found = true;
          break;
        }
      }
      if (!found) {
        return;
      }
      indices[i] += 1;
      for (const j of Array.from(new Array(k - i - 1), (x, k2) => i + k2 + 1)) {
        indices[j] = indices[j - 1] + 1;
      }
      yield indices.map((i2) => list[i2]);
    }
  }
}

class NumberUtils {
  static UINT8_MAX = 255;
  static UINT16_MAX = 65535;
  static UINT32_MAX = 4294967295;
  static UINT64_MAX = Number.MAX_SAFE_INTEGER;
  static isInteger(val) {
    return Number.isInteger(val);
  }
  static isUint8(val) {
    return NumberUtils.isInteger(val) && val >= 0 && val <= NumberUtils.UINT8_MAX;
  }
  static isUint16(val) {
    return NumberUtils.isInteger(val) && val >= 0 && val <= NumberUtils.UINT16_MAX;
  }
  static isUint32(val) {
    return NumberUtils.isInteger(val) && val >= 0 && val <= NumberUtils.UINT32_MAX;
  }
  static isUint64(val) {
    return NumberUtils.isInteger(val) && val >= 0 && val <= NumberUtils.UINT64_MAX;
  }
  static randomUint32() {
    return Math.floor(Math.random() * (NumberUtils.UINT32_MAX + 1));
  }
  static randomUint64() {
    return Math.floor(Math.random() * (NumberUtils.UINT64_MAX + 1));
  }
  static fromBinary(bin) {
    return parseInt(bin, 2);
  }
}

class StringUtils {
  static isMultibyte(str) {
    return /[\uD800-\uDFFF]/.test(str);
  }
  static isHex(str) {
    return /^[0-9A-Fa-f]*$/.test(str);
  }
  static isHexBytes(str, length) {
    if (!StringUtils.isHex(str))
      return false;
    if (str.length % 2 !== 0)
      return false;
    if (typeof length === "number" && str.length / 2 !== length)
      return false;
    return true;
  }
  static commonPrefix(str1, str2) {
    let i = 0;
    for (; i < str1.length; ++i) {
      if (str1[i] !== str2[i])
        break;
    }
    return str1.substring(0, i);
  }
  static lpad(str, padString, length) {
    while (str.length < length)
      str = padString + str;
    return str;
  }
}

class SerialBuffer extends Uint8Array {
  _view;
  _readPos;
  _writePos;
  static EMPTY = new SerialBuffer(0);
  constructor(bufferOrArrayOrLength) {
    super(bufferOrArrayOrLength);
    this._view = new DataView(this.buffer);
    this._readPos = 0;
    this._writePos = 0;
  }
  subarray(start, end) {
    return ArrayUtils.subarray(this, start, end);
  }
  get readPos() {
    return this._readPos;
  }
  set readPos(value) {
    if (value < 0 || value > this.byteLength)
      throw `Invalid readPos ${value}`;
    this._readPos = value;
  }
  get writePos() {
    return this._writePos;
  }
  set writePos(value) {
    if (value < 0 || value > this.byteLength)
      throw `Invalid writePos ${value}`;
    this._writePos = value;
  }
  reset() {
    this._readPos = 0;
    this._writePos = 0;
  }
  read(length) {
    const value = this.subarray(this._readPos, this._readPos + length);
    this._readPos += length;
    return new Uint8Array(value);
  }
  write(array) {
    this.set(array, this._writePos);
    this._writePos += array.byteLength;
  }
  readUint8() {
    return this._view.getUint8(this._readPos++);
  }
  writeUint8(value) {
    this._view.setUint8(this._writePos++, value);
  }
  readUint16() {
    const value = this._view.getUint16(this._readPos);
    this._readPos += 2;
    return value;
  }
  writeUint16(value) {
    this._view.setUint16(this._writePos, value);
    this._writePos += 2;
  }
  readUint32() {
    const value = this._view.getUint32(this._readPos);
    this._readPos += 4;
    return value;
  }
  writeUint32(value) {
    this._view.setUint32(this._writePos, value);
    this._writePos += 4;
  }
  readUint64() {
    const value = this._view.getUint32(this._readPos) * Math.pow(2, 32) + this._view.getUint32(this._readPos + 4);
    if (!NumberUtils.isUint64(value))
      throw new Error("Malformed value");
    this._readPos += 8;
    return value;
  }
  writeUint64(value) {
    if (!NumberUtils.isUint64(value))
      throw new Error("Malformed value");
    this._view.setUint32(this._writePos, Math.floor(value / Math.pow(2, 32)));
    this._view.setUint32(this._writePos + 4, value);
    this._writePos += 8;
  }
  readVarUint() {
    const value = this.readUint8();
    if (value < 253) {
      return value;
    } else if (value === 253) {
      return this.readUint16();
    } else if (value === 254) {
      return this.readUint32();
    } else {
      return this.readUint64();
    }
  }
  writeVarUint(value) {
    if (!NumberUtils.isUint64(value))
      throw new Error("Malformed value");
    if (value < 253) {
      this.writeUint8(value);
    } else if (value <= 65535) {
      this.writeUint8(253);
      this.writeUint16(value);
    } else if (value <= 4294967295) {
      this.writeUint8(254);
      this.writeUint32(value);
    } else {
      this.writeUint8(255);
      this.writeUint64(value);
    }
  }
  static varUintSize(value) {
    if (!NumberUtils.isUint64(value))
      throw new Error("Malformed value");
    if (value < 253) {
      return 1;
    } else if (value <= 65535) {
      return 3;
    } else if (value <= 4294967295) {
      return 5;
    } else {
      return 9;
    }
  }
  readFloat64() {
    const value = this._view.getFloat64(this._readPos);
    this._readPos += 8;
    return value;
  }
  writeFloat64(value) {
    this._view.setFloat64(this._writePos, value);
    this._writePos += 8;
  }
  readString(length) {
    const bytes = this.read(length);
    return BufferUtils.toAscii(bytes);
  }
  writeString(value, length) {
    if (StringUtils.isMultibyte(value) || value.length !== length)
      throw new Error("Malformed value/length");
    const bytes = BufferUtils.fromAscii(value);
    this.write(bytes);
  }
  readPaddedString(length) {
    const bytes = this.read(length);
    let i = 0;
    while (i < length && bytes[i] !== 0)
      i++;
    const view = new Uint8Array(bytes.buffer, bytes.byteOffset, i);
    return BufferUtils.toAscii(view);
  }
  writePaddedString(value, length) {
    if (StringUtils.isMultibyte(value) || value.length > length)
      throw new Error("Malformed value/length");
    const bytes = BufferUtils.fromAscii(value);
    this.write(bytes);
    const padding = length - bytes.byteLength;
    this.write(new Uint8Array(padding));
  }
  readVarLengthString() {
    const length = this.readUint8();
    if (this._readPos + length > this.length)
      throw new Error("Malformed length");
    const bytes = this.read(length);
    return BufferUtils.toAscii(bytes);
  }
  writeVarLengthString(value) {
    if (StringUtils.isMultibyte(value) || !NumberUtils.isUint8(value.length))
      throw new Error("Malformed value");
    const bytes = BufferUtils.fromAscii(value);
    this.writeUint8(bytes.byteLength);
    this.write(bytes);
  }
  static varLengthStringSize(value) {
    if (StringUtils.isMultibyte(value) || !NumberUtils.isUint8(value.length))
      throw new Error("Malformed value");
    return 1 + value.length;
  }
}

class BufferUtils {
  static BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  static BASE32_ALPHABET = {
    RFC4648: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567=",
    RFC4648_HEX: "0123456789ABCDEFGHIJKLMNOPQRSTUV=",
    NIMIQ: "0123456789ABCDEFGHJKLMNPQRSTUVXY"
  };
  static HEX_ALPHABET = "0123456789abcdef";
  static _BASE64_LOOKUP = [];
  static _ISO_8859_15_DECODER;
  static _UTF8_ENCODER;
  static toAscii(buffer) {
    const chunkSize = 8192;
    const buf = BufferUtils._toUint8View(buffer);
    let ascii = "";
    for (let i = 0; i < buf.length; i += chunkSize) {
      ascii += String.fromCharCode.apply(null, [...buf.subarray(i, i + chunkSize)]);
    }
    return ascii;
  }
  static fromAscii(string) {
    const buf = new Uint8Array(string.length);
    for (let i = 0; i < string.length; ++i) {
      buf[i] = string.charCodeAt(i);
    }
    return buf;
  }
  static _codePointTextDecoder(buffer) {
    if (typeof TextDecoder === "undefined")
      throw new Error("TextDecoder not supported");
    if (BufferUtils._ISO_8859_15_DECODER === null)
      throw new Error("TextDecoder does not support iso-8859-15");
    if (BufferUtils._ISO_8859_15_DECODER === void 0) {
      try {
        BufferUtils._ISO_8859_15_DECODER = new TextDecoder("iso-8859-15");
      } catch (e) {
        BufferUtils._ISO_8859_15_DECODER = null;
        throw new Error("TextDecoder does not support iso-8859-15");
      }
    }
    const uint8View = BufferUtils._toUint8View(buffer);
    return BufferUtils._ISO_8859_15_DECODER.decode(uint8View).replace(/\u20ac/g, "\xA4").replace(/\u0160/g, "\xA6").replace(/\u0161/g, "\xA8").replace(/\u017d/g, "\xB4").replace(/\u017e/g, "\xB8").replace(/\u0152/g, "\xBC").replace(/\u0153/g, "\xBD").replace(/\u0178/g, "\xBE");
  }
  static _tripletToBase64(num) {
    return BufferUtils._BASE64_LOOKUP[num >> 18 & 63] + BufferUtils._BASE64_LOOKUP[num >> 12 & 63] + BufferUtils._BASE64_LOOKUP[num >> 6 & 63] + BufferUtils._BASE64_LOOKUP[num & 63];
  }
  static _base64encodeChunk(u8, start, end) {
    let tmp;
    const output = [];
    for (let i = start; i < end; i += 3) {
      tmp = (u8[i] << 16 & 16711680) + (u8[i + 1] << 8 & 65280) + (u8[i + 2] & 255);
      output.push(BufferUtils._tripletToBase64(tmp));
    }
    return output.join("");
  }
  static _base64fromByteArray(u8) {
    let tmp;
    const len = u8.length;
    const extraBytes = len % 3;
    let output = "";
    const parts = [];
    const maxChunkLength = 16383;
    for (let i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
      parts.push(BufferUtils._base64encodeChunk(u8, i, i + maxChunkLength > len2 ? len2 : i + maxChunkLength));
    }
    if (extraBytes === 1) {
      tmp = u8[len - 1];
      output += BufferUtils._BASE64_LOOKUP[tmp >> 2];
      output += BufferUtils._BASE64_LOOKUP[tmp << 4 & 63];
      output += "==";
    } else if (extraBytes === 2) {
      tmp = (u8[len - 2] << 8) + u8[len - 1];
      output += BufferUtils._BASE64_LOOKUP[tmp >> 10];
      output += BufferUtils._BASE64_LOOKUP[tmp >> 4 & 63];
      output += BufferUtils._BASE64_LOOKUP[tmp << 2 & 63];
      output += "=";
    }
    parts.push(output);
    return parts.join("");
  }
  static toBase64(buffer) {
    if (typeof TextDecoder !== "undefined" && BufferUtils._ISO_8859_15_DECODER !== null) {
      try {
        return btoa(BufferUtils._codePointTextDecoder(buffer));
      } catch (e) {
      }
    }
    return BufferUtils._base64fromByteArray(BufferUtils._toUint8View(buffer));
  }
  static fromBase64(base64, length) {
    const arr = new Uint8Array(atob(base64).split("").map((c) => c.charCodeAt(0)));
    if (length !== void 0 && arr.length !== length)
      throw new Error("Decoded length does not match expected length");
    return new SerialBuffer(arr);
  }
  static toBase64Url(buffer) {
    return BufferUtils.toBase64(buffer).replace(/\//g, "_").replace(/\+/g, "-").replace(/=/g, ".");
  }
  static fromBase64Url(base64, length) {
    return BufferUtils.fromBase64(base64.replace(/_/g, "/").replace(/-/g, "+").replace(/\./g, "="), length);
  }
  static toBase32(buf, alphabet = BufferUtils.BASE32_ALPHABET.NIMIQ) {
    let shift = 3, carry = 0, byte, symbol, i, res = "";
    for (i = 0; i < buf.length; i++) {
      byte = buf[i];
      symbol = carry | byte >> shift;
      res += alphabet[symbol & 31];
      if (shift > 5) {
        shift -= 5;
        symbol = byte >> shift;
        res += alphabet[symbol & 31];
      }
      shift = 5 - shift;
      carry = byte << shift;
      shift = 8 - shift;
    }
    if (shift !== 3) {
      res += alphabet[carry & 31];
    }
    while (res.length % 8 !== 0 && alphabet.length === 33) {
      res += alphabet[32];
    }
    return res;
  }
  static fromBase32(base32, alphabet = BufferUtils.BASE32_ALPHABET.NIMIQ) {
    const charmap = {};
    alphabet.toUpperCase().split("").forEach((c, i) => {
      if (!(c in charmap))
        charmap[c] = i;
    });
    let symbol, shift = 8, carry = 0, buf = [];
    base32.toUpperCase().split("").forEach((char) => {
      if (alphabet.length === 33 && char === alphabet[32])
        return;
      symbol = charmap[char] & 255;
      shift -= 5;
      if (shift > 0) {
        carry |= symbol << shift;
      } else if (shift < 0) {
        buf.push(carry | symbol >> -shift);
        shift += 8;
        carry = symbol << shift & 255;
      } else {
        buf.push(carry | symbol);
        shift = 8;
        carry = 0;
      }
    });
    if (shift !== 8 && carry !== 0) {
      buf.push(carry);
    }
    return new Uint8Array(buf);
  }
  static toHex(buffer) {
    let hex = "";
    for (let i = 0; i < buffer.length; i++) {
      const code = buffer[i];
      hex += BufferUtils.HEX_ALPHABET[code >>> 4];
      hex += BufferUtils.HEX_ALPHABET[code & 15];
    }
    return hex;
  }
  static fromHex(hex, length) {
    hex = hex.trim();
    if (!StringUtils.isHexBytes(hex, length))
      throw new Error("String is not an hex string (of matching length)");
    return new SerialBuffer(new Uint8Array((hex.match(/.{2}/g) || []).map((byte) => parseInt(byte, 16))));
  }
  static toBinary(buffer) {
    let bin = "";
    for (let i = 0; i < buffer.length; i++) {
      const code = buffer[i];
      bin += StringUtils.lpad(code.toString(2), "0", 8);
    }
    return bin;
  }
  static _strToUint8Array(str) {
    const out = [];
    let p = 0;
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c < 128) {
        out[p++] = c;
      } else if (c < 2048) {
        out[p++] = c >> 6 | 192;
        out[p++] = c & 63 | 128;
      } else if ((c & 64512) === 55296 && i + 1 < str.length && (str.charCodeAt(i + 1) & 64512) === 56320) {
        c = 65536 + ((c & 1023) << 10) + (str.charCodeAt(++i) & 1023);
        out[p++] = c >> 18 | 240;
        out[p++] = c >> 12 & 63 | 128;
        out[p++] = c >> 6 & 63 | 128;
        out[p++] = c & 63 | 128;
      } else {
        out[p++] = c >> 12 | 224;
        out[p++] = c >> 6 & 63 | 128;
        out[p++] = c & 63 | 128;
      }
    }
    return new Uint8Array(out);
  }
  static _utf8TextEncoder(str) {
    if (typeof TextEncoder === "undefined")
      throw new Error("TextEncoder not supported");
    if (BufferUtils._UTF8_ENCODER === null)
      throw new Error("TextEncoder does not support utf8");
    if (BufferUtils._UTF8_ENCODER === void 0) {
      try {
        BufferUtils._UTF8_ENCODER = new TextEncoder();
      } catch (e) {
        BufferUtils._UTF8_ENCODER = null;
        throw new Error("TextEncoder does not support utf8");
      }
    }
    return BufferUtils._UTF8_ENCODER.encode(str);
  }
  static fromUtf8(str) {
    if (typeof TextEncoder !== "undefined" && BufferUtils._UTF8_ENCODER !== null) {
      try {
        return BufferUtils._utf8TextEncoder(str);
      } catch (e) {
      }
    }
    return BufferUtils._strToUint8Array(str);
  }
  static fromAny(o, length) {
    if (o === "")
      return SerialBuffer.EMPTY;
    if (!o)
      throw new Error("Invalid buffer format");
    if (o instanceof Uint8Array)
      return new SerialBuffer(o);
    try {
      return BufferUtils.fromHex(o, length);
    } catch (e) {
    }
    try {
      return BufferUtils.fromBase64(o, length);
    } catch (e) {
    }
    throw new Error("Invalid buffer format");
  }
  static concatTypedArrays(a, b) {
    const c = new a.constructor(a.length + b.length);
    c.set(a, 0);
    c.set(b, a.length);
    return c;
  }
  static equals(a, b) {
    const viewA = BufferUtils._toUint8View(a);
    const viewB = BufferUtils._toUint8View(b);
    if (viewA.length !== viewB.length)
      return false;
    for (let i = 0; i < viewA.length; i++) {
      if (viewA[i] !== viewB[i])
        return false;
    }
    return true;
  }
  static compare(a, b) {
    if (a.length < b.length)
      return -1;
    if (a.length > b.length)
      return 1;
    for (let i = 0; i < a.length; i++) {
      if (a[i] < b[i])
        return -1;
      if (a[i] > b[i])
        return 1;
    }
    return 0;
  }
  static xor(a, b) {
    const res = new Uint8Array(a.byteLength);
    for (let i = 0; i < a.byteLength; ++i) {
      res[i] = a[i] ^ b[i];
    }
    return res;
  }
  static _toUint8View(arrayLike) {
    if (arrayLike instanceof Uint8Array) {
      return arrayLike;
    } else if (arrayLike instanceof ArrayBuffer) {
      return new Uint8Array(arrayLike);
    } else if (arrayLike.buffer instanceof ArrayBuffer) {
      return new Uint8Array(arrayLike.buffer);
    } else {
      throw new Error("TypedArray or ArrayBuffer required");
    }
  }
}
for (let i = 0, len = BufferUtils.BASE64_ALPHABET.length; i < len; ++i) {
  BufferUtils._BASE64_LOOKUP[i] = BufferUtils.BASE64_ALPHABET[i];
}

class Serializable {
  equals(o) {
    return o instanceof Serializable && BufferUtils.equals(this.serialize(), o.serialize());
  }
  compare(o) {
    return BufferUtils.compare(this.serialize(), o.serialize());
  }
  hashCode() {
    return this.toBase64();
  }
  toString() {
    return this.toBase64();
  }
  toBase64() {
    return BufferUtils.toBase64(this.serialize());
  }
  toHex() {
    return BufferUtils.toHex(this.serialize());
  }
}

class Address extends Serializable {
  static CCODE = "NQ";
  static SERIALIZED_SIZE = 20;
  static HEX_SIZE = 40;
  static NULL = new Address(new Uint8Array(Address.SERIALIZED_SIZE));
  static CONTRACT_CREATION = new Address(new Uint8Array(Address.SERIALIZED_SIZE));
  static copy(o) {
    if (!o)
      return o;
    const obj = new Uint8Array(o._obj);
    return new Address(obj);
  }
  static fromHash(hash) {
    return new Address(hash.subarray(0, Address.SERIALIZED_SIZE));
  }
  _obj;
  constructor(arg) {
    super();
    if (!(arg instanceof Uint8Array))
      throw new Error("Primitive: Invalid type");
    if (arg.length !== Address.SERIALIZED_SIZE)
      throw new Error("Primitive: Invalid length");
    this._obj = arg;
  }
  static unserialize(buf) {
    return new Address(buf.read(Address.SERIALIZED_SIZE));
  }
  serialize(buf) {
    buf = buf || new SerialBuffer(this.serializedSize);
    buf.write(this._obj);
    return buf;
  }
  subarray(begin, end) {
    return this._obj.subarray(begin, end);
  }
  get serializedSize() {
    return Address.SERIALIZED_SIZE;
  }
  equals(o) {
    return o instanceof Address && super.equals(o);
  }
  static fromAny(addr) {
    if (addr instanceof Address)
      return addr;
    if (typeof addr === "string")
      return Address.fromString(addr);
    throw new Error("Invalid address format");
  }
  toPlain() {
    return this.toUserFriendlyAddress();
  }
  static fromString(str) {
    try {
      return Address.fromUserFriendlyAddress(str);
    } catch (e) {
    }
    try {
      return Address.fromHex(str);
    } catch (e) {
    }
    try {
      return Address.fromBase64(str);
    } catch (e) {
    }
    throw new Error("Invalid address format");
  }
  static fromBase64(base64) {
    return new Address(BufferUtils.fromBase64(base64));
  }
  static fromHex(hex) {
    return new Address(BufferUtils.fromHex(hex));
  }
  static fromUserFriendlyAddress(str) {
    str = str.replace(/ /g, "");
    if (str.substring(0, 2).toUpperCase() !== Address.CCODE) {
      throw new Error("Invalid Address: Wrong country code");
    }
    if (str.length !== 36) {
      throw new Error("Invalid Address: Should be 36 chars (ignoring spaces)");
    }
    if (Address._ibanCheck(str.substring(4) + str.substring(0, 4)) !== 1) {
      throw new Error("Invalid Address: Checksum invalid");
    }
    return new Address(BufferUtils.fromBase32(str.substring(4)));
  }
  static _ibanCheck(str) {
    const num = str.split("").map((c) => {
      const code = c.toUpperCase().charCodeAt(0);
      return code >= 48 && code <= 57 ? c : (code - 55).toString();
    }).join("");
    let tmp = "";
    for (let i = 0; i < Math.ceil(num.length / 6); i++) {
      tmp = (parseInt(tmp + num.substring(i * 6, i * 6 + 6)) % 97).toString();
    }
    return parseInt(tmp);
  }
  toUserFriendlyAddress(withSpaces = true) {
    const base32 = BufferUtils.toBase32(this.serialize());
    const check = ("00" + (98 - Address._ibanCheck(base32 + Address.CCODE + "00"))).slice(-2);
    let res = Address.CCODE + check + base32;
    if (withSpaces)
      res = res.replace(/.{4}/g, "$& ").trim();
    return res;
  }
}

class Commitment extends Serializable {
  static SIZE = 32;
  static copy(o) {
    if (!o)
      return o;
    return new Commitment(new Uint8Array(o._obj));
  }
  static sum(commitments) {
    return new Commitment(Commitment._commitmentsAggregate(commitments.map((c) => c._obj)));
  }
  _obj;
  constructor(arg) {
    super();
    if (!(arg instanceof Uint8Array))
      throw new Error("Primitive: Invalid type");
    if (arg.length !== Commitment.SIZE)
      throw new Error("Primitive: Invalid length");
    this._obj = arg;
  }
  static unserialize(buf) {
    return new Commitment(buf.read(Commitment.SIZE));
  }
  serialize(buf) {
    buf = buf || new SerialBuffer(this.serializedSize);
    buf.write(this._obj);
    return buf;
  }
  get serializedSize() {
    return Commitment.SIZE;
  }
  equals(o) {
    return o instanceof Commitment && super.equals(o);
  }
  static _commitmentsAggregate(commitments) {
    if (commitments.some((commitment) => commitment.byteLength !== Commitment.SIZE)) {
      throw Error("Wrong buffer size.");
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
      throw e;
    } finally {
      if (stackPtr !== void 0)
        Module.stackRestore(stackPtr);
    }
  }
}

class Hash extends Serializable {
  static SIZE = /* @__PURE__ */ new Map();
  static NULL;
  _obj;
  _algorithm;
  constructor(arg, algorithm = Hash.Algorithm.BLAKE2B) {
    if (arg === null) {
      arg = new Uint8Array(Hash.getSize(algorithm));
    } else {
      if (!(arg instanceof Uint8Array))
        throw new Error("Primitive: Invalid type");
      if (arg.length !== Hash.getSize(algorithm))
        throw new Error("Primitive: Invalid length");
    }
    super();
    this._obj = arg;
    this._algorithm = algorithm;
  }
  static light(arr) {
    return Hash.blake2b(arr);
  }
  static blake2b(arr) {
    return new Hash(Hash.computeBlake2b(arr), Hash.Algorithm.BLAKE2B);
  }
  static hard(arr) {
    return Hash.argon2d(arr);
  }
  static async argon2d(arr) {
    return new Hash(await (await CryptoWorker.getInstanceAsync()).computeArgon2d(arr), Hash.Algorithm.ARGON2D);
  }
  static sha256(arr) {
    return new Hash(Hash.computeSha256(arr), Hash.Algorithm.SHA256);
  }
  static sha512(arr) {
    return new Hash(Hash.computeSha512(arr), Hash.Algorithm.SHA512);
  }
  static compute(arr, algorithm) {
    switch (algorithm) {
      case Hash.Algorithm.BLAKE2B:
        return Hash.blake2b(arr);
      case Hash.Algorithm.SHA256:
        return Hash.sha256(arr);
      default:
        throw new Error("Invalid hash algorithm");
    }
  }
  static unserialize(buf, algorithm = Hash.Algorithm.BLAKE2B) {
    return new Hash(buf.read(Hash.getSize(algorithm)), algorithm);
  }
  serialize(buf) {
    buf = buf || new SerialBuffer(this.serializedSize);
    buf.write(this._obj);
    return buf;
  }
  subarray(begin, end) {
    return this._obj.subarray(begin, end);
  }
  get serializedSize() {
    return Hash.SIZE.get(this._algorithm);
  }
  get array() {
    return this._obj;
  }
  get algorithm() {
    return this._algorithm;
  }
  equals(o) {
    return o instanceof Hash && o._algorithm === this._algorithm && super.equals(o);
  }
  static fromAny(hash, algorithm = Hash.Algorithm.BLAKE2B) {
    if (hash instanceof Hash)
      return hash;
    try {
      return new Hash(BufferUtils.fromAny(hash, Hash.SIZE.get(algorithm)), algorithm);
    } catch (e) {
      throw new Error("Invalid hash format");
    }
  }
  toPlain() {
    return this.toHex();
  }
  static fromBase64(base64) {
    return new Hash(BufferUtils.fromBase64(base64));
  }
  static fromHex(hex) {
    return new Hash(BufferUtils.fromHex(hex));
  }
  static fromPlain(str) {
    return Hash.fromString(str);
  }
  static fromString(str) {
    try {
      return Hash.fromHex(str);
    } catch (e) {
    }
    try {
      return Hash.fromBase64(str);
    } catch (e) {
    }
    throw new Error("Invalid hash format");
  }
  static isHash(o) {
    return o instanceof Hash;
  }
  static getSize(algorithm) {
    const size = Hash.SIZE.get(algorithm);
    if (typeof size !== "number")
      throw new Error("Invalid hash algorithm");
    return size;
  }
  static computeBlake2b(input) {
    const Module = WasmHelper.Module;
    let stackPtr;
    try {
      stackPtr = Module.stackSave();
      const hashSize = Hash.getSize(Hash.Algorithm.BLAKE2B);
      const wasmOut = Module.stackAlloc(hashSize);
      const wasmIn = Module.stackAlloc(input.length);
      new Uint8Array(Module.HEAPU8.buffer, wasmIn, input.length).set(input);
      const res = Module._nimiq_blake2(wasmOut, wasmIn, input.length);
      if (res !== 0) {
        throw res;
      }
      const hash = new Uint8Array(hashSize);
      hash.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, hashSize));
      return hash;
    } catch (e) {
      throw e;
    } finally {
      if (stackPtr !== void 0)
        Module.stackRestore(stackPtr);
    }
  }
  static computeSha256(input) {
    const Module = WasmHelper.Module;
    let stackPtr;
    try {
      stackPtr = Module.stackSave();
      const hashSize = Hash.getSize(Hash.Algorithm.SHA256);
      const wasmOut = Module.stackAlloc(hashSize);
      const wasmIn = Module.stackAlloc(input.length);
      new Uint8Array(Module.HEAPU8.buffer, wasmIn, input.length).set(input);
      Module._nimiq_sha256(wasmOut, wasmIn, input.length);
      const hash = new Uint8Array(hashSize);
      hash.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, hashSize));
      return hash;
    } catch (e) {
      throw e;
    } finally {
      if (stackPtr !== void 0)
        Module.stackRestore(stackPtr);
    }
  }
  static computeSha512(input) {
    const Module = WasmHelper.Module;
    let stackPtr;
    try {
      stackPtr = Module.stackSave();
      const hashSize = Hash.getSize(Hash.Algorithm.SHA512);
      const wasmOut = Module.stackAlloc(hashSize);
      const wasmIn = Module.stackAlloc(input.length);
      new Uint8Array(Module.HEAPU8.buffer, wasmIn, input.length).set(input);
      Module._nimiq_sha512(wasmOut, wasmIn, input.length);
      const hash = new Uint8Array(hashSize);
      hash.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, hashSize));
      return hash;
    } catch (e) {
      throw e;
    } finally {
      if (stackPtr !== void 0)
        Module.stackRestore(stackPtr);
    }
  }
}
((Hash2) => {
  ((Algorithm2) => {
    Algorithm2[Algorithm2["BLAKE2B"] = 1] = "BLAKE2B";
    Algorithm2[Algorithm2["ARGON2D"] = 2] = "ARGON2D";
    Algorithm2[Algorithm2["SHA256"] = 3] = "SHA256";
    Algorithm2[Algorithm2["SHA512"] = 4] = "SHA512";
  })(Hash2.Algorithm || (Hash2.Algorithm = {}));
  ((Algorithm2) => {
    function toString(hashAlgorithm) {
      switch (hashAlgorithm) {
        case 1 /* BLAKE2B */:
          return "blake2b";
        case 2 /* ARGON2D */:
          return "argon2d";
        case 3 /* SHA256 */:
          return "sha256";
        case 4 /* SHA512 */:
          return "sha512";
        default:
          throw new Error("Invalid hash algorithm");
      }
    }
    Algorithm2.toString = toString;
    function fromAny(algorithm) {
      if (typeof algorithm === "number" && Hash2.SIZE.has(algorithm))
        return algorithm;
      switch (algorithm) {
        case "blake2b":
          return 1 /* BLAKE2B */;
        case "argon2d":
          return 2 /* ARGON2D */;
        case "sha256":
          return 3 /* SHA256 */;
        case "sha512":
          return 4 /* SHA512 */;
        default:
          throw new Error("Invalid hash algorithm");
      }
    }
    Algorithm2.fromAny = fromAny;
  })(Hash2.Algorithm || (Hash2.Algorithm = {}));
})(Hash || (Hash = {}));
Hash.SIZE.set(1 /* BLAKE2B */, 32);
Hash.SIZE.set(2 /* ARGON2D */, 32);
Hash.SIZE.set(3 /* SHA256 */, 32);
Hash.SIZE.set(4 /* SHA512 */, 64);
Hash.NULL = new Hash(new Uint8Array(32));

class CryptoWorker {
  static _workerAsync = null;
  static async getInstanceAsync() {
    if (!CryptoWorker._workerAsync) {
      CryptoWorker._workerAsync = new CryptoWorkerImpl();
    }
    return CryptoWorker._workerAsync;
  }
}
class CryptoWorkerImpl extends CryptoWorker {
  async computeArgon2d(input) {
    const Module = WasmHelper.Module;
    let stackPtr;
    try {
      stackPtr = Module.stackSave();
      const hashSize = Hash.getSize(Hash.Algorithm.ARGON2D);
      const wasmOut = Module.stackAlloc(hashSize);
      const wasmIn = Module.stackAlloc(input.length);
      new Uint8Array(Module.HEAPU8.buffer, wasmIn, input.length).set(input);
      const res = Module._nimiq_argon2(wasmOut, wasmIn, input.length, 512);
      if (res !== 0) {
        throw res;
      }
      const hash = new Uint8Array(hashSize);
      hash.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, hashSize));
      return hash;
    } catch (e) {
      throw e;
    } finally {
      if (stackPtr !== void 0)
        Module.stackRestore(stackPtr);
    }
  }
  async computeArgon2dBatch(inputs) {
    const hashes = [];
    const Module = WasmHelper.Module;
    let stackPtr;
    try {
      stackPtr = Module.stackSave();
      const hashSize = Hash.getSize(Hash.Algorithm.ARGON2D);
      const wasmOut = Module.stackAlloc(hashSize);
      const stackTmp = Module.stackSave();
      for (const input of inputs) {
        Module.stackRestore(stackTmp);
        const wasmIn = Module.stackAlloc(input.length);
        new Uint8Array(Module.HEAPU8.buffer, wasmIn, input.length).set(input);
        const res = Module._nimiq_argon2(wasmOut, wasmIn, input.length, 512);
        if (res !== 0) {
          throw res;
        }
        const hash = new Uint8Array(hashSize);
        hash.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, hashSize));
        hashes.push(hash);
      }
      return hashes;
    } catch (e) {
      throw e;
    } finally {
      if (stackPtr !== void 0)
        Module.stackRestore(stackPtr);
    }
  }
  async kdfLegacy(key, salt, iterations, outputSize = Hash.getSize(Hash.Algorithm.ARGON2D)) {
    const Module = WasmHelper.Module;
    let stackPtr;
    try {
      stackPtr = Module.stackSave();
      const wasmOut = Module.stackAlloc(outputSize);
      const wasmIn = Module.stackAlloc(key.length);
      new Uint8Array(Module.HEAPU8.buffer, wasmIn, key.length).set(key);
      const wasmSalt = Module.stackAlloc(salt.length);
      new Uint8Array(Module.HEAPU8.buffer, wasmSalt, salt.length).set(salt);
      const res = Module._nimiq_kdf_legacy(wasmOut, outputSize, wasmIn, key.length, wasmSalt, salt.length, 512, iterations);
      if (res !== 0) {
        throw res;
      }
      const hash = new Uint8Array(outputSize);
      hash.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, outputSize));
      return hash;
    } catch (e) {
      throw e;
    } finally {
      if (stackPtr !== void 0)
        Module.stackRestore(stackPtr);
    }
  }
  async kdf(key, salt, iterations, outputSize = Hash.getSize(Hash.Algorithm.ARGON2D)) {
    const Module = WasmHelper.Module;
    let stackPtr;
    try {
      stackPtr = Module.stackSave();
      const wasmOut = Module.stackAlloc(outputSize);
      const wasmIn = Module.stackAlloc(key.length);
      new Uint8Array(Module.HEAPU8.buffer, wasmIn, key.length).set(key);
      const wasmSalt = Module.stackAlloc(salt.length);
      new Uint8Array(Module.HEAPU8.buffer, wasmSalt, salt.length).set(salt);
      const res = Module._nimiq_kdf(wasmOut, outputSize, wasmIn, key.length, wasmSalt, salt.length, 512, iterations);
      if (res !== 0) {
        throw res;
      }
      const hash = new Uint8Array(outputSize);
      hash.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, outputSize));
      return hash;
    } catch (e) {
      throw e;
    } finally {
      if (stackPtr !== void 0)
        Module.stackRestore(stackPtr);
    }
  }
}

class CryptoUtils {
  static SHA512_BLOCK_SIZE = 128;
  static getRandomValues(buf) {
    if (typeof window !== "undefined") {
      return window.crypto.getRandomValues(buf);
    } else {
      const crypto = require("crypto");
      if (!(buf instanceof Uint8Array)) {
        throw new TypeError("expected Uint8Array");
      }
      if (buf.length > 65536) {
        const e = new Error();
        e.message = `Failed to execute 'getRandomValues' on 'Crypto': The ArrayBufferView's byte length ${buf.length} exceeds the number of bytes of entropy available via this API (65536).`;
        e.name = "QuotaExceededError";
        throw e;
      }
      const bytes = crypto.randomBytes(buf.length);
      buf.set(bytes);
      return buf;
    }
  }
  static computeHmacSha512(key, data) {
    if (key.length > CryptoUtils.SHA512_BLOCK_SIZE) {
      key = new SerialBuffer(Hash.computeSha512(key));
    }
    const iKey = new SerialBuffer(CryptoUtils.SHA512_BLOCK_SIZE);
    const oKey = new SerialBuffer(CryptoUtils.SHA512_BLOCK_SIZE);
    for (let i = 0; i < CryptoUtils.SHA512_BLOCK_SIZE; ++i) {
      const byte = key[i] || 0;
      iKey[i] = 54 ^ byte;
      oKey[i] = 92 ^ byte;
    }
    const innerHash = Hash.computeSha512(BufferUtils.concatTypedArrays(iKey, data));
    return Hash.computeSha512(BufferUtils.concatTypedArrays(oKey, innerHash));
  }
  static computePBKDF2sha512(password, salt, iterations, derivedKeyLength) {
    const hashLength = Hash.SIZE.get(Hash.Algorithm.SHA512);
    if (derivedKeyLength > (Math.pow(2, 32) - 1) * hashLength) {
      throw new Error("Derived key too long");
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
  static async otpKdfLegacy(message, key, salt, iterations) {
    const worker = await CryptoWorker.getInstanceAsync();
    const derivedKey = await worker.kdfLegacy(key, salt, iterations, message.byteLength);
    return BufferUtils.xor(message, derivedKey);
  }
  static async otpKdf(message, key, salt, iterations) {
    const worker = await CryptoWorker.getInstanceAsync();
    const derivedKey = await worker.kdf(key, salt, iterations, message.byteLength);
    return BufferUtils.xor(message, derivedKey);
  }
}

class CRC8 {
  static _table = null;
  static _createTable() {
    const table = [];
    for (let i = 0; i < 256; ++i) {
      let curr = i;
      for (let j = 0; j < 8; ++j) {
        if ((curr & 128) !== 0) {
          curr = (curr << 1 ^ 151) % 256;
        } else {
          curr = (curr << 1) % 256;
        }
      }
      table[i] = curr;
    }
    return table;
  }
  static compute(buf) {
    if (!CRC8._table)
      CRC8._table = CRC8._createTable();
    let c = 0;
    for (let i = 0; i < buf.length; i++) {
      c = CRC8._table[(c ^ buf[i]) % 256];
    }
    return c;
  }
}

class PublicKey extends Serializable {
  static SIZE = 32;
  static copy(o) {
    if (!o)
      return o;
    return new PublicKey(new Uint8Array(o._obj));
  }
  _obj;
  constructor(arg) {
    super();
    if (!(arg instanceof Uint8Array))
      throw new Error("Primitive: Invalid type");
    if (arg.length !== PublicKey.SIZE)
      throw new Error("Primitive: Invalid length");
    this._obj = arg;
  }
  static derive(privateKey) {
    return new PublicKey(PublicKey._publicKeyDerive(privateKey.serialize()));
  }
  static sum(publicKeys) {
    publicKeys = publicKeys.slice();
    publicKeys.sort((a, b) => a.compare(b));
    return PublicKey._delinearizeAndAggregatePublicKeys(publicKeys);
  }
  static unserialize(buf) {
    return new PublicKey(buf.read(PublicKey.SIZE));
  }
  static fromAny(o) {
    if (!o)
      throw new Error("Invalid public key format");
    if (o instanceof PublicKey)
      return o;
    try {
      return new PublicKey(BufferUtils.fromAny(o, PublicKey.SIZE));
    } catch (e) {
      throw new Error("Invalid public key format");
    }
  }
  serialize(buf) {
    buf = buf || new SerialBuffer(this.serializedSize);
    buf.write(this._obj);
    return buf;
  }
  get serializedSize() {
    return PublicKey.SIZE;
  }
  equals(o) {
    return o instanceof PublicKey && super.equals(o);
  }
  hash() {
    return Hash.blake2b(this.serialize());
  }
  compare(o) {
    return BufferUtils.compare(this._obj, o._obj);
  }
  toAddress() {
    return Address.fromHash(this.hash());
  }
  static _delinearizeAndAggregatePublicKeys(publicKeys) {
    const publicKeysObj = publicKeys.map((k) => k.serialize());
    const publicKeysHash = PublicKey._publicKeysHash(publicKeysObj);
    const raw = PublicKey._publicKeysDelinearizeAndAggregate(publicKeysObj, publicKeysHash);
    return new PublicKey(raw);
  }
  static _publicKeyDerive(privateKey) {
    if (privateKey.byteLength !== PrivateKey.SIZE) {
      throw Error("Wrong buffer size.");
    }
    const Module = WasmHelper.Module;
    let stackPtr;
    try {
      stackPtr = Module.stackSave();
      const wasmOut = Module.stackAlloc(PublicKey.SIZE);
      const pubKeyBuffer = new Uint8Array(Module.HEAP8.buffer, wasmOut, PrivateKey.SIZE);
      pubKeyBuffer.set(privateKey);
      const wasmIn = Module.stackAlloc(privateKey.length);
      const privKeyBuffer = new Uint8Array(Module.HEAP8.buffer, wasmIn, PrivateKey.SIZE);
      privKeyBuffer.set(privateKey);
      Module._ed25519_public_key_derive(wasmOut, wasmIn);
      privKeyBuffer.fill(0);
      const publicKey = new Uint8Array(PublicKey.SIZE);
      publicKey.set(pubKeyBuffer);
      return publicKey;
    } catch (e) {
      throw e;
    } finally {
      if (stackPtr !== void 0)
        Module.stackRestore(stackPtr);
    }
  }
  static _publicKeysHash(publicKeys) {
    if (publicKeys.some((publicKey) => publicKey.byteLength !== PublicKey.SIZE)) {
      throw Error("Wrong buffer size.");
    }
    const concatenatedPublicKeys = new Uint8Array(publicKeys.length * PublicKey.SIZE);
    for (let i = 0; i < publicKeys.length; ++i) {
      concatenatedPublicKeys.set(publicKeys[i], i * PublicKey.SIZE);
    }
    const Module = WasmHelper.Module;
    let stackPtr;
    try {
      stackPtr = Module.stackSave();
      const hashSize = Hash.getSize(Hash.Algorithm.SHA512);
      const wasmOut = Module.stackAlloc(hashSize);
      const wasmInPublicKeys = Module.stackAlloc(concatenatedPublicKeys.length);
      new Uint8Array(Module.HEAPU8.buffer, wasmInPublicKeys, concatenatedPublicKeys.length).set(concatenatedPublicKeys);
      Module._ed25519_hash_public_keys(wasmOut, wasmInPublicKeys, publicKeys.length);
      const hashedPublicKey = new Uint8Array(hashSize);
      hashedPublicKey.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, hashSize));
      return hashedPublicKey;
    } catch (e) {
      throw e;
    } finally {
      if (stackPtr !== void 0)
        Module.stackRestore(stackPtr);
    }
  }
  static _publicKeyDelinearize(publicKey, publicKeysHash) {
    if (publicKey.byteLength !== PublicKey.SIZE || publicKeysHash.byteLength !== Hash.getSize(Hash.Algorithm.SHA512)) {
      throw Error("Wrong buffer size.");
    }
    const Module = WasmHelper.Module;
    let stackPtr;
    try {
      stackPtr = Module.stackSave();
      const wasmOut = Module.stackAlloc(PublicKey.SIZE);
      const wasmInPublicKey = Module.stackAlloc(publicKey.length);
      const wasmInPublicKeysHash = Module.stackAlloc(publicKeysHash.length);
      new Uint8Array(Module.HEAPU8.buffer, wasmInPublicKey, publicKey.length).set(publicKey);
      new Uint8Array(Module.HEAPU8.buffer, wasmInPublicKeysHash, publicKeysHash.length).set(publicKeysHash);
      Module._ed25519_delinearize_public_key(wasmOut, wasmInPublicKeysHash, wasmInPublicKey);
      const delinearizedPublicKey = new Uint8Array(PublicKey.SIZE);
      delinearizedPublicKey.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, PublicKey.SIZE));
      return delinearizedPublicKey;
    } catch (e) {
      throw e;
    } finally {
      if (stackPtr !== void 0)
        Module.stackRestore(stackPtr);
    }
  }
  static _publicKeysDelinearizeAndAggregate(publicKeys, publicKeysHash) {
    if (publicKeys.some((publicKey) => publicKey.byteLength !== PublicKey.SIZE) || publicKeysHash.byteLength !== Hash.getSize(Hash.Algorithm.SHA512)) {
      throw Error("Wrong buffer size.");
    }
    const concatenatedPublicKeys = new Uint8Array(publicKeys.length * PublicKey.SIZE);
    for (let i = 0; i < publicKeys.length; ++i) {
      concatenatedPublicKeys.set(publicKeys[i], i * PublicKey.SIZE);
    }
    const Module = WasmHelper.Module;
    let stackPtr;
    try {
      stackPtr = Module.stackSave();
      const wasmOut = Module.stackAlloc(PublicKey.SIZE);
      const wasmInPublicKeys = Module.stackAlloc(concatenatedPublicKeys.length);
      const wasmInPublicKeysHash = Module.stackAlloc(publicKeysHash.length);
      new Uint8Array(Module.HEAPU8.buffer, wasmInPublicKeys, concatenatedPublicKeys.length).set(concatenatedPublicKeys);
      new Uint8Array(Module.HEAPU8.buffer, wasmInPublicKeysHash, publicKeysHash.length).set(publicKeysHash);
      Module._ed25519_aggregate_delinearized_public_keys(wasmOut, wasmInPublicKeysHash, wasmInPublicKeys, publicKeys.length);
      const aggregatePublicKey = new Uint8Array(PublicKey.SIZE);
      aggregatePublicKey.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, PublicKey.SIZE));
      return aggregatePublicKey;
    } catch (e) {
      throw e;
    } finally {
      if (stackPtr !== void 0)
        Module.stackRestore(stackPtr);
    }
  }
}

class Secret extends Serializable {
  _type;
  _purposeId;
  static SIZE = 32;
  static ENCRYPTION_SALT_SIZE = 16;
  static ENCRYPTION_KDF_ROUNDS = 256;
  static ENCRYPTION_CHECKSUM_SIZE = 4;
  static ENCRYPTION_CHECKSUM_SIZE_V3 = 2;
  constructor(type, purposeId) {
    super();
    this._type = type;
    this._purposeId = purposeId;
  }
  static async fromEncrypted(buf, key) {
    const version = buf.readUint8();
    const roundsLog = buf.readUint8();
    if (roundsLog > 32)
      throw new Error("Rounds out-of-bounds");
    const rounds = Math.pow(2, roundsLog);
    switch (version) {
      case 1:
        return Secret._decryptV1(buf, key, rounds);
      case 2:
        return Secret._decryptV2(buf, key, rounds);
      case 3:
        return Secret._decryptV3(buf, key, rounds);
      default:
        throw new Error("Unsupported version");
    }
  }
  static async _decryptV1(buf, key, rounds) {
    const ciphertext = buf.read(Secret.SIZE);
    const salt = buf.read(Secret.ENCRYPTION_SALT_SIZE);
    const check = buf.read(Secret.ENCRYPTION_CHECKSUM_SIZE);
    const plaintext = await CryptoUtils.otpKdfLegacy(ciphertext, key, salt, rounds);
    const privateKey = new PrivateKey(plaintext);
    const publicKey = PublicKey.derive(privateKey);
    const checksum = publicKey.hash().subarray(0, Secret.ENCRYPTION_CHECKSUM_SIZE);
    if (!BufferUtils.equals(check, checksum)) {
      throw new Error("Invalid key");
    }
    return privateKey;
  }
  static async _decryptV2(buf, key, rounds) {
    const ciphertext = buf.read(Secret.SIZE);
    const salt = buf.read(Secret.ENCRYPTION_SALT_SIZE);
    const check = buf.read(Secret.ENCRYPTION_CHECKSUM_SIZE);
    const plaintext = await CryptoUtils.otpKdfLegacy(ciphertext, key, salt, rounds);
    const checksum = Hash.computeBlake2b(plaintext).subarray(0, Secret.ENCRYPTION_CHECKSUM_SIZE);
    if (!BufferUtils.equals(check, checksum)) {
      throw new Error("Invalid key");
    }
    return new PrivateKey(plaintext);
  }
  static async _decryptV3(buf, key, rounds) {
    const salt = buf.read(Secret.ENCRYPTION_SALT_SIZE);
    const ciphertext = buf.read(Secret.ENCRYPTION_CHECKSUM_SIZE_V3 + 4 + Secret.SIZE);
    const plaintext = await CryptoUtils.otpKdf(ciphertext, key, salt, rounds);
    const check = plaintext.subarray(0, Secret.ENCRYPTION_CHECKSUM_SIZE_V3);
    const payload = plaintext.subarray(Secret.ENCRYPTION_CHECKSUM_SIZE_V3);
    const checksum = Hash.computeBlake2b(payload).subarray(0, Secret.ENCRYPTION_CHECKSUM_SIZE_V3);
    if (!BufferUtils.equals(check, checksum)) {
      throw new Error("Invalid key");
    }
    const purposeId = payload[0] << 24 | payload[1] << 16 | payload[2] << 8 | payload[3];
    const secret = payload.subarray(4);
    switch (purposeId) {
      case PrivateKey.PURPOSE_ID:
        return new PrivateKey(secret);
      case Entropy.PURPOSE_ID:
      default:
        return new Entropy(secret);
    }
  }
  async exportEncrypted(key) {
    const salt = new Uint8Array(Secret.ENCRYPTION_SALT_SIZE);
    CryptoUtils.getRandomValues(salt);
    const data = new SerialBuffer(4 + Secret.SIZE);
    data.writeUint32(this._purposeId);
    data.write(this.serialize());
    const checksum = Hash.computeBlake2b(data).subarray(0, Secret.ENCRYPTION_CHECKSUM_SIZE_V3);
    const plaintext = new SerialBuffer(checksum.byteLength + data.byteLength);
    plaintext.write(checksum);
    plaintext.write(data);
    const ciphertext = await CryptoUtils.otpKdf(plaintext, key, salt, Secret.ENCRYPTION_KDF_ROUNDS);
    const buf = new SerialBuffer(1 + 1 + salt.byteLength + ciphertext.byteLength);
    buf.writeUint8(3);
    buf.writeUint8(Math.log2(Secret.ENCRYPTION_KDF_ROUNDS));
    buf.write(salt);
    buf.write(ciphertext);
    return buf;
  }
  get encryptedSize() {
    return 1 + 1 + Secret.ENCRYPTION_SALT_SIZE + Secret.ENCRYPTION_CHECKSUM_SIZE_V3 + 4 + Secret.SIZE;
  }
  get type() {
    return this._type;
  }
}
((Secret2) => {
  ((Type2) => {
    Type2[Type2["PRIVATE_KEY"] = 1] = "PRIVATE_KEY";
    Type2[Type2["ENTROPY"] = 2] = "ENTROPY";
  })(Secret2.Type || (Secret2.Type = {}));
})(Secret || (Secret = {}));

class PrivateKey extends Secret {
  static SIZE = Secret.SIZE;
  static PURPOSE_ID = 1107296257;
  _obj;
  constructor(arg) {
    super(Secret.Type.PRIVATE_KEY, PrivateKey.PURPOSE_ID);
    if (!(arg instanceof Uint8Array))
      throw new Error("Primitive: Invalid type");
    if (arg.length !== PrivateKey.SIZE)
      throw new Error("Primitive: Invalid length");
    this._obj = arg;
  }
  static generate() {
    const privateKey = new Uint8Array(PrivateKey.SIZE);
    CryptoUtils.getRandomValues(privateKey);
    return new PrivateKey(privateKey);
  }
  static unserialize(buf) {
    return new PrivateKey(buf.read(PrivateKey.SIZE));
  }
  serialize(buf) {
    buf = buf || new SerialBuffer(this.serializedSize);
    buf.write(this._obj);
    return buf;
  }
  get serializedSize() {
    return PrivateKey.SIZE;
  }
  overwrite(privateKey) {
    this._obj.set(privateKey._obj);
  }
  equals(o) {
    return o instanceof PrivateKey && super.equals(o);
  }
  static _privateKeyDelinearize(privateKey, publicKey, publicKeysHash) {
    if (privateKey.byteLength !== PrivateKey.SIZE || publicKey.byteLength !== PublicKey.SIZE || publicKeysHash.byteLength !== Hash.getSize(Hash.Algorithm.SHA512)) {
      throw Error("Wrong buffer size.");
    }
    const Module = WasmHelper.Module;
    let stackPtr;
    try {
      stackPtr = Module.stackSave();
      const wasmOut = Module.stackAlloc(PublicKey.SIZE);
      const wasmInPrivateKey = Module.stackAlloc(privateKey.length);
      const wasmInPublicKey = Module.stackAlloc(publicKey.length);
      const wasmInPublicKeysHash = Module.stackAlloc(publicKeysHash.length);
      new Uint8Array(Module.HEAPU8.buffer, wasmInPrivateKey, privateKey.length).set(privateKey);
      new Uint8Array(Module.HEAPU8.buffer, wasmInPublicKey, publicKey.length).set(publicKey);
      new Uint8Array(Module.HEAPU8.buffer, wasmInPublicKeysHash, publicKeysHash.length).set(publicKeysHash);
      Module._ed25519_derive_delinearized_private_key(wasmOut, wasmInPublicKeysHash, wasmInPublicKey, wasmInPrivateKey);
      const delinearizedPrivateKey = new Uint8Array(PrivateKey.SIZE);
      delinearizedPrivateKey.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, PrivateKey.SIZE));
      return delinearizedPrivateKey;
    } catch (e) {
      throw e;
    } finally {
      if (stackPtr !== void 0)
        Module.stackRestore(stackPtr);
    }
  }
}

class ExtendedPrivateKey extends Serializable {
  static CHAIN_CODE_SIZE = 32;
  _key;
  _chainCode;
  constructor(key, chainCode) {
    super();
    if (!(key instanceof PrivateKey))
      throw new Error("ExtendedPrivateKey: Invalid key");
    if (!(chainCode instanceof Uint8Array))
      throw new Error("ExtendedPrivateKey: Invalid chainCode");
    if (chainCode.length !== ExtendedPrivateKey.CHAIN_CODE_SIZE)
      throw new Error("ExtendedPrivateKey: Invalid chainCode length");
    this._key = key;
    this._chainCode = chainCode;
  }
  static generateMasterKey(seed) {
    const bCurve = BufferUtils.fromAscii("ed25519 seed");
    const hash = CryptoUtils.computeHmacSha512(bCurve, seed);
    return new ExtendedPrivateKey(new PrivateKey(hash.slice(0, 32)), hash.slice(32));
  }
  derive(index) {
    if (index < 2147483648)
      index += 2147483648;
    const data = new SerialBuffer(1 + PrivateKey.SIZE + 4);
    data.writeUint8(0);
    this._key.serialize(data);
    data.writeUint32(index);
    const hash = CryptoUtils.computeHmacSha512(this._chainCode, data);
    return new ExtendedPrivateKey(new PrivateKey(hash.slice(0, 32)), hash.slice(32));
  }
  static isValidPath(path) {
    if (path.match(/^m(\/[0-9]+')*$/) === null)
      return false;
    const segments = path.split("/");
    for (let i = 1; i < segments.length; i++) {
      if (!NumberUtils.isUint32(parseInt(segments[i])))
        return false;
    }
    return true;
  }
  derivePath(path) {
    if (!ExtendedPrivateKey.isValidPath(path))
      throw new Error("Invalid path");
    let extendedKey = this;
    const segments = path.split("/");
    for (let i = 1; i < segments.length; i++) {
      const index = parseInt(segments[i]);
      extendedKey = extendedKey.derive(index);
    }
    return extendedKey;
  }
  static derivePathFromSeed(path, seed) {
    let extendedKey = ExtendedPrivateKey.generateMasterKey(seed);
    return extendedKey.derivePath(path);
  }
  static unserialize(buf) {
    const privateKey = PrivateKey.unserialize(buf);
    const chainCode = buf.read(ExtendedPrivateKey.CHAIN_CODE_SIZE);
    return new ExtendedPrivateKey(privateKey, chainCode);
  }
  serialize(buf) {
    buf = buf || new SerialBuffer(this.serializedSize);
    this._key.serialize(buf);
    buf.write(this._chainCode);
    return buf;
  }
  get serializedSize() {
    return this._key.serializedSize + ExtendedPrivateKey.CHAIN_CODE_SIZE;
  }
  equals(o) {
    return o instanceof ExtendedPrivateKey && super.equals(o);
  }
  get privateKey() {
    return this._key;
  }
  toAddress() {
    return PublicKey.derive(this._key).toAddress();
  }
}

class MnemonicUtils {
  static ENGLISH_WORDLIST;
  static DEFAULT_WORDLIST;
  static _crcChecksum(entropy) {
    const ENT = entropy.length * 8;
    const CS = ENT / 32;
    const hash = CRC8.compute(entropy);
    return BufferUtils.toBinary([hash]).slice(0, CS);
  }
  static _sha256Checksum(entropy) {
    const ENT = entropy.length * 8;
    const CS = ENT / 32;
    const hash = Hash.computeSha256(entropy);
    return BufferUtils.toBinary(hash).slice(0, CS);
  }
  static _entropyToBits(entropy) {
    if (entropy.length < 16)
      throw new Error("Invalid key, length < 16");
    if (entropy.length > 32)
      throw new Error("Invalid key, length > 32");
    if (entropy.length % 4 !== 0)
      throw new Error("Invalid key, length % 4 != 0");
    return BufferUtils.toBinary(entropy);
  }
  static _normalizeEntropy(entropy) {
    let normalized;
    if (typeof entropy === "string")
      normalized = BufferUtils.fromHex(entropy);
    else if (entropy instanceof Entropy)
      normalized = entropy.serialize();
    else if (entropy instanceof ArrayBuffer)
      normalized = new Uint8Array(entropy);
    else
      normalized = entropy;
    return normalized;
  }
  static _bitsToMnemonic(bits, wordlist) {
    const chunks = bits.match(/(.{11})/g);
    if (!chunks)
      throw new Error("Invalid bits, less than 11 characters");
    const words = chunks.map((chunk) => {
      const index = NumberUtils.fromBinary(chunk);
      return wordlist[index];
    });
    return words;
  }
  static _mnemonicToBits(mnemonic, wordlist) {
    const words = mnemonic;
    if (words.length < 12)
      throw new Error("Invalid mnemonic, less than 12 words");
    if (words.length > 24)
      throw new Error("Invalid mnemonic, more than 24 words");
    if (words.length % 3 !== 0)
      throw new Error("Invalid mnemonic, words % 3 != 0");
    const bits = words.map(function(word) {
      const index = wordlist.indexOf(word.toLowerCase());
      if (index === -1)
        throw new Error(`Invalid mnemonic, word >${word}< is not in wordlist`);
      return StringUtils.lpad(index.toString(2), "0", 11);
    }).join("");
    return bits;
  }
  static _bitsToEntropy(bits, legacy = false) {
    const dividerIndex = bits.length - (bits.length % 8 || 8);
    const entropyBits = bits.slice(0, dividerIndex);
    const checksumBits = bits.slice(dividerIndex);
    const chunks = entropyBits.match(/(.{8})/g);
    if (!chunks)
      throw new Error("Invalid entropyBits, less than 8 characters");
    const entropyBytes = chunks.map(NumberUtils.fromBinary);
    if (entropyBytes.length < 16)
      throw new Error("Invalid generated key, length < 16");
    if (entropyBytes.length > 32)
      throw new Error("Invalid generated key, length > 32");
    if (entropyBytes.length % 4 !== 0)
      throw new Error("Invalid generated key, length % 4 != 0");
    const entropy = new Uint8Array(entropyBytes);
    const checksum = legacy ? MnemonicUtils._crcChecksum(entropy) : MnemonicUtils._sha256Checksum(entropy);
    if (checksum !== checksumBits)
      throw new Error("Invalid checksum");
    return entropy;
  }
  static entropyToMnemonic(entropy, wordlist) {
    wordlist = wordlist || MnemonicUtils.DEFAULT_WORDLIST;
    const normalized = MnemonicUtils._normalizeEntropy(entropy);
    const entropyBits = MnemonicUtils._entropyToBits(normalized);
    const checksumBits = MnemonicUtils._sha256Checksum(normalized);
    const bits = entropyBits + checksumBits;
    return MnemonicUtils._bitsToMnemonic(bits, wordlist);
  }
  static entropyToLegacyMnemonic(entropy, wordlist) {
    wordlist = wordlist || MnemonicUtils.DEFAULT_WORDLIST;
    const normalized = MnemonicUtils._normalizeEntropy(entropy);
    const entropyBits = MnemonicUtils._entropyToBits(normalized);
    const checksumBits = MnemonicUtils._crcChecksum(normalized);
    const bits = entropyBits + checksumBits;
    return MnemonicUtils._bitsToMnemonic(bits, wordlist);
  }
  static mnemonicToEntropy(mnemonic, wordlist) {
    if (!Array.isArray(mnemonic))
      mnemonic = mnemonic.trim().split(/\s+/g);
    wordlist = wordlist || MnemonicUtils.DEFAULT_WORDLIST;
    const bits = MnemonicUtils._mnemonicToBits(mnemonic, wordlist);
    return new Entropy(MnemonicUtils._bitsToEntropy(bits, false));
  }
  static legacyMnemonicToEntropy(mnemonic, wordlist) {
    if (!Array.isArray(mnemonic))
      mnemonic = mnemonic.trim().split(/\s+/g);
    wordlist = wordlist || MnemonicUtils.DEFAULT_WORDLIST;
    const bits = MnemonicUtils._mnemonicToBits(mnemonic, wordlist);
    return new Entropy(MnemonicUtils._bitsToEntropy(bits, true));
  }
  static _salt(password) {
    return `mnemonic${password || ""}`;
  }
  static mnemonicToSeed(mnemonic, password) {
    if (Array.isArray(mnemonic))
      mnemonic = mnemonic.join(" ");
    const mnemonicBuffer = BufferUtils.fromAscii(mnemonic);
    const saltBuffer = BufferUtils.fromAscii(MnemonicUtils._salt(password));
    return CryptoUtils.computePBKDF2sha512(mnemonicBuffer, saltBuffer, 2048, 64);
  }
  static mnemonicToExtendedPrivateKey(mnemonic, password) {
    const seed = MnemonicUtils.mnemonicToSeed(mnemonic, password);
    return ExtendedPrivateKey.generateMasterKey(seed);
  }
  static isCollidingChecksum(entropy) {
    const normalizedEntropy = MnemonicUtils._normalizeEntropy(entropy);
    return MnemonicUtils._crcChecksum(normalizedEntropy) === MnemonicUtils._sha256Checksum(normalizedEntropy);
  }
  static getMnemonicType(mnemonic, wordlist) {
    if (!Array.isArray(mnemonic))
      mnemonic = mnemonic.trim().split(/\s+/g);
    wordlist = wordlist || MnemonicUtils.DEFAULT_WORDLIST;
    const bits = MnemonicUtils._mnemonicToBits(mnemonic, wordlist);
    let isBIP39 = true;
    try {
      MnemonicUtils._bitsToEntropy(bits, false);
    } catch (e) {
      isBIP39 = false;
    }
    let isLegacy = true;
    try {
      MnemonicUtils._bitsToEntropy(bits, true);
    } catch (e) {
      isLegacy = false;
    }
    if (isBIP39 && isLegacy)
      return MnemonicUtils.MnemonicType.UNKNOWN;
    if (!isBIP39 && !isLegacy)
      throw new Error("Invalid checksum");
    return isBIP39 ? MnemonicUtils.MnemonicType.BIP39 : MnemonicUtils.MnemonicType.LEGACY;
  }
}
MnemonicUtils.ENGLISH_WORDLIST = ["abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract", "absurd", "abuse", "access", "accident", "account", "accuse", "achieve", "acid", "acoustic", "acquire", "across", "act", "action", "actor", "actress", "actual", "adapt", "add", "addict", "address", "adjust", "admit", "adult", "advance", "advice", "aerobic", "affair", "afford", "afraid", "again", "age", "agent", "agree", "ahead", "aim", "air", "airport", "aisle", "alarm", "album", "alcohol", "alert", "alien", "all", "alley", "allow", "almost", "alone", "alpha", "already", "also", "alter", "always", "amateur", "amazing", "among", "amount", "amused", "analyst", "anchor", "ancient", "anger", "angle", "angry", "animal", "ankle", "announce", "annual", "another", "answer", "antenna", "antique", "anxiety", "any", "apart", "apology", "appear", "apple", "approve", "april", "arch", "arctic", "area", "arena", "argue", "arm", "armed", "armor", "army", "around", "arrange", "arrest", "arrive", "arrow", "art", "artefact", "artist", "artwork", "ask", "aspect", "assault", "asset", "assist", "assume", "asthma", "athlete", "atom", "attack", "attend", "attitude", "attract", "auction", "audit", "august", "aunt", "author", "auto", "autumn", "average", "avocado", "avoid", "awake", "aware", "away", "awesome", "awful", "awkward", "axis", "baby", "bachelor", "bacon", "badge", "bag", "balance", "balcony", "ball", "bamboo", "banana", "banner", "bar", "barely", "bargain", "barrel", "base", "basic", "basket", "battle", "beach", "bean", "beauty", "because", "become", "beef", "before", "begin", "behave", "behind", "believe", "below", "belt", "bench", "benefit", "best", "betray", "better", "between", "beyond", "bicycle", "bid", "bike", "bind", "biology", "bird", "birth", "bitter", "black", "blade", "blame", "blanket", "blast", "bleak", "bless", "blind", "blood", "blossom", "blouse", "blue", "blur", "blush", "board", "boat", "body", "boil", "bomb", "bone", "bonus", "book", "boost", "border", "boring", "borrow", "boss", "bottom", "bounce", "box", "boy", "bracket", "brain", "brand", "brass", "brave", "bread", "breeze", "brick", "bridge", "brief", "bright", "bring", "brisk", "broccoli", "broken", "bronze", "broom", "brother", "brown", "brush", "bubble", "buddy", "budget", "buffalo", "build", "bulb", "bulk", "bullet", "bundle", "bunker", "burden", "burger", "burst", "bus", "business", "busy", "butter", "buyer", "buzz", "cabbage", "cabin", "cable", "cactus", "cage", "cake", "call", "calm", "camera", "camp", "can", "canal", "cancel", "candy", "cannon", "canoe", "canvas", "canyon", "capable", "capital", "captain", "car", "carbon", "card", "cargo", "carpet", "carry", "cart", "case", "cash", "casino", "castle", "casual", "cat", "catalog", "catch", "category", "cattle", "caught", "cause", "caution", "cave", "ceiling", "celery", "cement", "census", "century", "cereal", "certain", "chair", "chalk", "champion", "change", "chaos", "chapter", "charge", "chase", "chat", "cheap", "check", "cheese", "chef", "cherry", "chest", "chicken", "chief", "child", "chimney", "choice", "choose", "chronic", "chuckle", "chunk", "churn", "cigar", "cinnamon", "circle", "citizen", "city", "civil", "claim", "clap", "clarify", "claw", "clay", "clean", "clerk", "clever", "click", "client", "cliff", "climb", "clinic", "clip", "clock", "clog", "close", "cloth", "cloud", "clown", "club", "clump", "cluster", "clutch", "coach", "coast", "coconut", "code", "coffee", "coil", "coin", "collect", "color", "column", "combine", "come", "comfort", "comic", "common", "company", "concert", "conduct", "confirm", "congress", "connect", "consider", "control", "convince", "cook", "cool", "copper", "copy", "coral", "core", "corn", "correct", "cost", "cotton", "couch", "country", "couple", "course", "cousin", "cover", "coyote", "crack", "cradle", "craft", "cram", "crane", "crash", "crater", "crawl", "crazy", "cream", "credit", "creek", "crew", "cricket", "crime", "crisp", "critic", "crop", "cross", "crouch", "crowd", "crucial", "cruel", "cruise", "crumble", "crunch", "crush", "cry", "crystal", "cube", "culture", "cup", "cupboard", "curious", "current", "curtain", "curve", "cushion", "custom", "cute", "cycle", "dad", "damage", "damp", "dance", "danger", "daring", "dash", "daughter", "dawn", "day", "deal", "debate", "debris", "decade", "december", "decide", "decline", "decorate", "decrease", "deer", "defense", "define", "defy", "degree", "delay", "deliver", "demand", "demise", "denial", "dentist", "deny", "depart", "depend", "deposit", "depth", "deputy", "derive", "describe", "desert", "design", "desk", "despair", "destroy", "detail", "detect", "develop", "device", "devote", "diagram", "dial", "diamond", "diary", "dice", "diesel", "diet", "differ", "digital", "dignity", "dilemma", "dinner", "dinosaur", "direct", "dirt", "disagree", "discover", "disease", "dish", "dismiss", "disorder", "display", "distance", "divert", "divide", "divorce", "dizzy", "doctor", "document", "dog", "doll", "dolphin", "domain", "donate", "donkey", "donor", "door", "dose", "double", "dove", "draft", "dragon", "drama", "drastic", "draw", "dream", "dress", "drift", "drill", "drink", "drip", "drive", "drop", "drum", "dry", "duck", "dumb", "dune", "during", "dust", "dutch", "duty", "dwarf", "dynamic", "eager", "eagle", "early", "earn", "earth", "easily", "east", "easy", "echo", "ecology", "economy", "edge", "edit", "educate", "effort", "egg", "eight", "either", "elbow", "elder", "electric", "elegant", "element", "elephant", "elevator", "elite", "else", "embark", "embody", "embrace", "emerge", "emotion", "employ", "empower", "empty", "enable", "enact", "end", "endless", "endorse", "enemy", "energy", "enforce", "engage", "engine", "enhance", "enjoy", "enlist", "enough", "enrich", "enroll", "ensure", "enter", "entire", "entry", "envelope", "episode", "equal", "equip", "era", "erase", "erode", "erosion", "error", "erupt", "escape", "essay", "essence", "estate", "eternal", "ethics", "evidence", "evil", "evoke", "evolve", "exact", "example", "excess", "exchange", "excite", "exclude", "excuse", "execute", "exercise", "exhaust", "exhibit", "exile", "exist", "exit", "exotic", "expand", "expect", "expire", "explain", "expose", "express", "extend", "extra", "eye", "eyebrow", "fabric", "face", "faculty", "fade", "faint", "faith", "fall", "false", "fame", "family", "famous", "fan", "fancy", "fantasy", "farm", "fashion", "fat", "fatal", "father", "fatigue", "fault", "favorite", "feature", "february", "federal", "fee", "feed", "feel", "female", "fence", "festival", "fetch", "fever", "few", "fiber", "fiction", "field", "figure", "file", "film", "filter", "final", "find", "fine", "finger", "finish", "fire", "firm", "first", "fiscal", "fish", "fit", "fitness", "fix", "flag", "flame", "flash", "flat", "flavor", "flee", "flight", "flip", "float", "flock", "floor", "flower", "fluid", "flush", "fly", "foam", "focus", "fog", "foil", "fold", "follow", "food", "foot", "force", "forest", "forget", "fork", "fortune", "forum", "forward", "fossil", "foster", "found", "fox", "fragile", "frame", "frequent", "fresh", "friend", "fringe", "frog", "front", "frost", "frown", "frozen", "fruit", "fuel", "fun", "funny", "furnace", "fury", "future", "gadget", "gain", "galaxy", "gallery", "game", "gap", "garage", "garbage", "garden", "garlic", "garment", "gas", "gasp", "gate", "gather", "gauge", "gaze", "general", "genius", "genre", "gentle", "genuine", "gesture", "ghost", "giant", "gift", "giggle", "ginger", "giraffe", "girl", "give", "glad", "glance", "glare", "glass", "glide", "glimpse", "globe", "gloom", "glory", "glove", "glow", "glue", "goat", "goddess", "gold", "good", "goose", "gorilla", "gospel", "gossip", "govern", "gown", "grab", "grace", "grain", "grant", "grape", "grass", "gravity", "great", "green", "grid", "grief", "grit", "grocery", "group", "grow", "grunt", "guard", "guess", "guide", "guilt", "guitar", "gun", "gym", "habit", "hair", "half", "hammer", "hamster", "hand", "happy", "harbor", "hard", "harsh", "harvest", "hat", "have", "hawk", "hazard", "head", "health", "heart", "heavy", "hedgehog", "height", "hello", "helmet", "help", "hen", "hero", "hidden", "high", "hill", "hint", "hip", "hire", "history", "hobby", "hockey", "hold", "hole", "holiday", "hollow", "home", "honey", "hood", "hope", "horn", "horror", "horse", "hospital", "host", "hotel", "hour", "hover", "hub", "huge", "human", "humble", "humor", "hundred", "hungry", "hunt", "hurdle", "hurry", "hurt", "husband", "hybrid", "ice", "icon", "idea", "identify", "idle", "ignore", "ill", "illegal", "illness", "image", "imitate", "immense", "immune", "impact", "impose", "improve", "impulse", "inch", "include", "income", "increase", "index", "indicate", "indoor", "industry", "infant", "inflict", "inform", "inhale", "inherit", "initial", "inject", "injury", "inmate", "inner", "innocent", "input", "inquiry", "insane", "insect", "inside", "inspire", "install", "intact", "interest", "into", "invest", "invite", "involve", "iron", "island", "isolate", "issue", "item", "ivory", "jacket", "jaguar", "jar", "jazz", "jealous", "jeans", "jelly", "jewel", "job", "join", "joke", "journey", "joy", "judge", "juice", "jump", "jungle", "junior", "junk", "just", "kangaroo", "keen", "keep", "ketchup", "key", "kick", "kid", "kidney", "kind", "kingdom", "kiss", "kit", "kitchen", "kite", "kitten", "kiwi", "knee", "knife", "knock", "know", "lab", "label", "labor", "ladder", "lady", "lake", "lamp", "language", "laptop", "large", "later", "latin", "laugh", "laundry", "lava", "law", "lawn", "lawsuit", "layer", "lazy", "leader", "leaf", "learn", "leave", "lecture", "left", "leg", "legal", "legend", "leisure", "lemon", "lend", "length", "lens", "leopard", "lesson", "letter", "level", "liar", "liberty", "library", "license", "life", "lift", "light", "like", "limb", "limit", "link", "lion", "liquid", "list", "little", "live", "lizard", "load", "loan", "lobster", "local", "lock", "logic", "lonely", "long", "loop", "lottery", "loud", "lounge", "love", "loyal", "lucky", "luggage", "lumber", "lunar", "lunch", "luxury", "lyrics", "machine", "mad", "magic", "magnet", "maid", "mail", "main", "major", "make", "mammal", "man", "manage", "mandate", "mango", "mansion", "manual", "maple", "marble", "march", "margin", "marine", "market", "marriage", "mask", "mass", "master", "match", "material", "math", "matrix", "matter", "maximum", "maze", "meadow", "mean", "measure", "meat", "mechanic", "medal", "media", "melody", "melt", "member", "memory", "mention", "menu", "mercy", "merge", "merit", "merry", "mesh", "message", "metal", "method", "middle", "midnight", "milk", "million", "mimic", "mind", "minimum", "minor", "minute", "miracle", "mirror", "misery", "miss", "mistake", "mix", "mixed", "mixture", "mobile", "model", "modify", "mom", "moment", "monitor", "monkey", "monster", "month", "moon", "moral", "more", "morning", "mosquito", "mother", "motion", "motor", "mountain", "mouse", "move", "movie", "much", "muffin", "mule", "multiply", "muscle", "museum", "mushroom", "music", "must", "mutual", "myself", "mystery", "myth", "naive", "name", "napkin", "narrow", "nasty", "nation", "nature", "near", "neck", "need", "negative", "neglect", "neither", "nephew", "nerve", "nest", "net", "network", "neutral", "never", "news", "next", "nice", "night", "noble", "noise", "nominee", "noodle", "normal", "north", "nose", "notable", "note", "nothing", "notice", "novel", "now", "nuclear", "number", "nurse", "nut", "oak", "obey", "object", "oblige", "obscure", "observe", "obtain", "obvious", "occur", "ocean", "october", "odor", "off", "offer", "office", "often", "oil", "okay", "old", "olive", "olympic", "omit", "once", "one", "onion", "online", "only", "open", "opera", "opinion", "oppose", "option", "orange", "orbit", "orchard", "order", "ordinary", "organ", "orient", "original", "orphan", "ostrich", "other", "outdoor", "outer", "output", "outside", "oval", "oven", "over", "own", "owner", "oxygen", "oyster", "ozone", "pact", "paddle", "page", "pair", "palace", "palm", "panda", "panel", "panic", "panther", "paper", "parade", "parent", "park", "parrot", "party", "pass", "patch", "path", "patient", "patrol", "pattern", "pause", "pave", "payment", "peace", "peanut", "pear", "peasant", "pelican", "pen", "penalty", "pencil", "people", "pepper", "perfect", "permit", "person", "pet", "phone", "photo", "phrase", "physical", "piano", "picnic", "picture", "piece", "pig", "pigeon", "pill", "pilot", "pink", "pioneer", "pipe", "pistol", "pitch", "pizza", "place", "planet", "plastic", "plate", "play", "please", "pledge", "pluck", "plug", "plunge", "poem", "poet", "point", "polar", "pole", "police", "pond", "pony", "pool", "popular", "portion", "position", "possible", "post", "potato", "pottery", "poverty", "powder", "power", "practice", "praise", "predict", "prefer", "prepare", "present", "pretty", "prevent", "price", "pride", "primary", "print", "priority", "prison", "private", "prize", "problem", "process", "produce", "profit", "program", "project", "promote", "proof", "property", "prosper", "protect", "proud", "provide", "public", "pudding", "pull", "pulp", "pulse", "pumpkin", "punch", "pupil", "puppy", "purchase", "purity", "purpose", "purse", "push", "put", "puzzle", "pyramid", "quality", "quantum", "quarter", "question", "quick", "quit", "quiz", "quote", "rabbit", "raccoon", "race", "rack", "radar", "radio", "rail", "rain", "raise", "rally", "ramp", "ranch", "random", "range", "rapid", "rare", "rate", "rather", "raven", "raw", "razor", "ready", "real", "reason", "rebel", "rebuild", "recall", "receive", "recipe", "record", "recycle", "reduce", "reflect", "reform", "refuse", "region", "regret", "regular", "reject", "relax", "release", "relief", "rely", "remain", "remember", "remind", "remove", "render", "renew", "rent", "reopen", "repair", "repeat", "replace", "report", "require", "rescue", "resemble", "resist", "resource", "response", "result", "retire", "retreat", "return", "reunion", "reveal", "review", "reward", "rhythm", "rib", "ribbon", "rice", "rich", "ride", "ridge", "rifle", "right", "rigid", "ring", "riot", "ripple", "risk", "ritual", "rival", "river", "road", "roast", "robot", "robust", "rocket", "romance", "roof", "rookie", "room", "rose", "rotate", "rough", "round", "route", "royal", "rubber", "rude", "rug", "rule", "run", "runway", "rural", "sad", "saddle", "sadness", "safe", "sail", "salad", "salmon", "salon", "salt", "salute", "same", "sample", "sand", "satisfy", "satoshi", "sauce", "sausage", "save", "say", "scale", "scan", "scare", "scatter", "scene", "scheme", "school", "science", "scissors", "scorpion", "scout", "scrap", "screen", "script", "scrub", "sea", "search", "season", "seat", "second", "secret", "section", "security", "seed", "seek", "segment", "select", "sell", "seminar", "senior", "sense", "sentence", "series", "service", "session", "settle", "setup", "seven", "shadow", "shaft", "shallow", "share", "shed", "shell", "sheriff", "shield", "shift", "shine", "ship", "shiver", "shock", "shoe", "shoot", "shop", "short", "shoulder", "shove", "shrimp", "shrug", "shuffle", "shy", "sibling", "sick", "side", "siege", "sight", "sign", "silent", "silk", "silly", "silver", "similar", "simple", "since", "sing", "siren", "sister", "situate", "six", "size", "skate", "sketch", "ski", "skill", "skin", "skirt", "skull", "slab", "slam", "sleep", "slender", "slice", "slide", "slight", "slim", "slogan", "slot", "slow", "slush", "small", "smart", "smile", "smoke", "smooth", "snack", "snake", "snap", "sniff", "snow", "soap", "soccer", "social", "sock", "soda", "soft", "solar", "soldier", "solid", "solution", "solve", "someone", "song", "soon", "sorry", "sort", "soul", "sound", "soup", "source", "south", "space", "spare", "spatial", "spawn", "speak", "special", "speed", "spell", "spend", "sphere", "spice", "spider", "spike", "spin", "spirit", "split", "spoil", "sponsor", "spoon", "sport", "spot", "spray", "spread", "spring", "spy", "square", "squeeze", "squirrel", "stable", "stadium", "staff", "stage", "stairs", "stamp", "stand", "start", "state", "stay", "steak", "steel", "stem", "step", "stereo", "stick", "still", "sting", "stock", "stomach", "stone", "stool", "story", "stove", "strategy", "street", "strike", "strong", "struggle", "student", "stuff", "stumble", "style", "subject", "submit", "subway", "success", "such", "sudden", "suffer", "sugar", "suggest", "suit", "summer", "sun", "sunny", "sunset", "super", "supply", "supreme", "sure", "surface", "surge", "surprise", "surround", "survey", "suspect", "sustain", "swallow", "swamp", "swap", "swarm", "swear", "sweet", "swift", "swim", "swing", "switch", "sword", "symbol", "symptom", "syrup", "system", "table", "tackle", "tag", "tail", "talent", "talk", "tank", "tape", "target", "task", "taste", "tattoo", "taxi", "teach", "team", "tell", "ten", "tenant", "tennis", "tent", "term", "test", "text", "thank", "that", "theme", "then", "theory", "there", "they", "thing", "this", "thought", "three", "thrive", "throw", "thumb", "thunder", "ticket", "tide", "tiger", "tilt", "timber", "time", "tiny", "tip", "tired", "tissue", "title", "toast", "tobacco", "today", "toddler", "toe", "together", "toilet", "token", "tomato", "tomorrow", "tone", "tongue", "tonight", "tool", "tooth", "top", "topic", "topple", "torch", "tornado", "tortoise", "toss", "total", "tourist", "toward", "tower", "town", "toy", "track", "trade", "traffic", "tragic", "train", "transfer", "trap", "trash", "travel", "tray", "treat", "tree", "trend", "trial", "tribe", "trick", "trigger", "trim", "trip", "trophy", "trouble", "truck", "true", "truly", "trumpet", "trust", "truth", "try", "tube", "tuition", "tumble", "tuna", "tunnel", "turkey", "turn", "turtle", "twelve", "twenty", "twice", "twin", "twist", "two", "type", "typical", "ugly", "umbrella", "unable", "unaware", "uncle", "uncover", "under", "undo", "unfair", "unfold", "unhappy", "uniform", "unique", "unit", "universe", "unknown", "unlock", "until", "unusual", "unveil", "update", "upgrade", "uphold", "upon", "upper", "upset", "urban", "urge", "usage", "use", "used", "useful", "useless", "usual", "utility", "vacant", "vacuum", "vague", "valid", "valley", "valve", "van", "vanish", "vapor", "various", "vast", "vault", "vehicle", "velvet", "vendor", "venture", "venue", "verb", "verify", "version", "very", "vessel", "veteran", "viable", "vibrant", "vicious", "victory", "video", "view", "village", "vintage", "violin", "virtual", "virus", "visa", "visit", "visual", "vital", "vivid", "vocal", "voice", "void", "volcano", "volume", "vote", "voyage", "wage", "wagon", "wait", "walk", "wall", "walnut", "want", "warfare", "warm", "warrior", "wash", "wasp", "waste", "water", "wave", "way", "wealth", "weapon", "wear", "weasel", "weather", "web", "wedding", "weekend", "weird", "welcome", "west", "wet", "whale", "what", "wheat", "wheel", "when", "where", "whip", "whisper", "wide", "width", "wife", "wild", "will", "win", "window", "wine", "wing", "wink", "winner", "winter", "wire", "wisdom", "wise", "wish", "witness", "wolf", "woman", "wonder", "wood", "wool", "word", "work", "world", "worry", "worth", "wrap", "wreck", "wrestle", "wrist", "write", "wrong", "yard", "year", "yellow", "you", "young", "youth", "zebra", "zero", "zone", "zoo"];
MnemonicUtils.DEFAULT_WORDLIST = MnemonicUtils.ENGLISH_WORDLIST;
((MnemonicUtils2) => {
  ((MnemonicType2) => {
    MnemonicType2[MnemonicType2["UNKNOWN"] = -1] = "UNKNOWN";
    MnemonicType2[MnemonicType2["LEGACY"] = 0] = "LEGACY";
    MnemonicType2[MnemonicType2["BIP39"] = 1] = "BIP39";
  })(MnemonicUtils2.MnemonicType || (MnemonicUtils2.MnemonicType = {}));
})(MnemonicUtils || (MnemonicUtils = {}));
Object.freeze(MnemonicUtils);

class Entropy extends Secret {
  static SIZE = Secret.SIZE;
  static PURPOSE_ID = 1107296258;
  _obj;
  constructor(arg) {
    super(Secret.Type.ENTROPY, Entropy.PURPOSE_ID);
    if (!(arg instanceof Uint8Array))
      throw new Error("Primitive: Invalid type");
    if (arg.length !== Entropy.SIZE)
      throw new Error("Primitive: Invalid length");
    this._obj = arg;
  }
  static generate() {
    const entropy = new Uint8Array(Entropy.SIZE);
    CryptoUtils.getRandomValues(entropy);
    return new Entropy(entropy);
  }
  toExtendedPrivateKey(password, wordlist) {
    return MnemonicUtils.mnemonicToExtendedPrivateKey(this.toMnemonic(wordlist), password);
  }
  toMnemonic(wordlist) {
    return MnemonicUtils.entropyToMnemonic(this, wordlist);
  }
  static unserialize(buf) {
    return new Entropy(buf.read(Entropy.SIZE));
  }
  serialize(buf) {
    buf = buf || new SerialBuffer(this.serializedSize);
    buf.write(this._obj);
    return buf;
  }
  get serializedSize() {
    return Entropy.SIZE;
  }
  overwrite(entropy) {
    this._obj.set(entropy._obj);
  }
  equals(o) {
    return o instanceof Entropy && super.equals(o);
  }
}

class KeyPair extends Serializable {
  static LOCK_KDF_ROUNDS = 256;
  _locked;
  _lockedInternally;
  _lockSalt;
  _publicKey;
  _internalPrivateKey;
  _unlockedPrivateKey = null;
  constructor(privateKey, publicKey, locked = false, lockSalt = null) {
    if (!(privateKey instanceof Object))
      throw new Error("Primitive: Invalid type");
    if (!(publicKey instanceof Object))
      throw new Error("Primitive: Invalid type");
    super();
    this._locked = locked;
    this._lockedInternally = locked;
    this._lockSalt = lockSalt;
    this._publicKey = publicKey;
    this._internalPrivateKey = new PrivateKey(privateKey.serialize());
  }
  static generate() {
    const privateKey = PrivateKey.generate();
    return new KeyPair(privateKey, PublicKey.derive(privateKey));
  }
  static derive(privateKey) {
    return new KeyPair(privateKey, PublicKey.derive(privateKey));
  }
  static fromHex(hexBuf) {
    return KeyPair.unserialize(BufferUtils.fromHex(hexBuf));
  }
  static unserialize(buf) {
    const privateKey = PrivateKey.unserialize(buf);
    const publicKey = PublicKey.unserialize(buf);
    let locked = false;
    let lockSalt = null;
    if (buf.readPos < buf.byteLength) {
      const extra = buf.readUint8();
      if (extra === 1) {
        locked = true;
        lockSalt = buf.read(32);
      }
    }
    return new KeyPair(privateKey, publicKey, locked, lockSalt);
  }
  serialize(buf) {
    buf = buf || new SerialBuffer(this.serializedSize);
    this._privateKey.serialize(buf);
    this.publicKey.serialize(buf);
    if (this._locked) {
      buf.writeUint8(1);
      buf.write(this._lockSalt);
    } else {
      buf.writeUint8(0);
    }
    return buf;
  }
  get privateKey() {
    if (this.isLocked)
      throw new Error("KeyPair is locked");
    return this._privateKey;
  }
  get _privateKey() {
    return this._unlockedPrivateKey || this._internalPrivateKey;
  }
  get publicKey() {
    return this._publicKey;
  }
  get serializedSize() {
    return this._privateKey.serializedSize + this.publicKey.serializedSize + (this._locked ? this._lockSalt.byteLength + 1 : 1);
  }
  async lock(key, lockSalt) {
    if (this._locked)
      throw new Error("KeyPair already locked");
    if (lockSalt)
      this._lockSalt = lockSalt;
    if (!this._lockSalt || this._lockSalt.length === 0) {
      this._lockSalt = new Uint8Array(32);
      CryptoUtils.getRandomValues(this._lockSalt);
    }
    this._internalPrivateKey.overwrite(await this._otpPrivateKey(key));
    this._clearUnlockedPrivateKey();
    this._locked = true;
    this._lockedInternally = true;
  }
  async unlock(key) {
    if (!this._locked)
      throw new Error("KeyPair not locked");
    const privateKey = await this._otpPrivateKey(key);
    const verifyPub = PublicKey.derive(privateKey);
    if (verifyPub.equals(this.publicKey)) {
      this._unlockedPrivateKey = privateKey;
      this._locked = false;
    } else {
      throw new Error("Invalid key");
    }
  }
  relock() {
    if (this._locked)
      throw new Error("KeyPair already locked");
    if (!this._lockedInternally)
      throw new Error("KeyPair was never locked");
    this._clearUnlockedPrivateKey();
    this._locked = true;
  }
  _clearUnlockedPrivateKey() {
    if (!this._lockedInternally || this._locked)
      return;
    if (!this._unlockedPrivateKey)
      throw new Error("No unlocked private key to clear");
    this._unlockedPrivateKey.overwrite(PrivateKey.unserialize(new SerialBuffer(this._unlockedPrivateKey.serializedSize)));
    this._unlockedPrivateKey = null;
  }
  async _otpPrivateKey(key) {
    return new PrivateKey(await CryptoUtils.otpKdfLegacy(this._privateKey.serialize(), key, this._lockSalt, KeyPair.LOCK_KDF_ROUNDS));
  }
  get isLocked() {
    return this._locked;
  }
  static async fromEncrypted(buf, key) {
    const privateKey = await Secret.fromEncrypted(buf, key);
    if (privateKey.type !== Secret.Type.PRIVATE_KEY)
      throw new Error("Expected privateKey, got Entropy");
    return KeyPair.derive(privateKey);
  }
  exportEncrypted(key) {
    return this._privateKey.exportEncrypted(key);
  }
  get encryptedSize() {
    return this._privateKey.encryptedSize;
  }
  equals(o) {
    return o instanceof KeyPair && super.equals(o);
  }
}

class MerkleTree {
  static computeRoot(values, fnHash = MerkleTree.hash) {
    return MerkleTree._computeRoot(values, fnHash);
  }
  static _computeRoot(values, fnHash) {
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
  static hash(o) {
    if (o instanceof Hash) {
      return o;
    }
    if ("hash" in o && typeof o.hash === "function") {
      return o.hash();
    }
    if ("serialize" in o && typeof o.serialize === "function") {
      return Hash.light(o.serialize());
    }
    if (o instanceof Uint8Array) {
      return Hash.light(o);
    }
    throw new Error("MerkleTree objects must be Uint8Array or have a .hash()/.serialize() method");
  }
}

class MerklePath {
  _nodes;
  constructor(nodes) {
    if (!Array.isArray(nodes) || !NumberUtils.isUint8(nodes.length) || nodes.some((it) => !(it instanceof MerklePathNode)))
      throw new Error("Malformed nodes");
    this._nodes = nodes;
  }
  static compute(values, leafValue, fnHash = MerkleTree.hash) {
    const leafHash = fnHash(leafValue);
    const path = [];
    MerklePath._compute(values, leafHash, path, fnHash);
    return new MerklePath(path);
  }
  static _compute(values, leafHash, path, fnHash) {
    const len = values.length;
    let hash;
    if (len === 0) {
      hash = Hash.light(new Uint8Array(0));
      return { containsLeaf: false, inner: hash };
    }
    if (len === 1) {
      hash = fnHash(values[0]);
      return { containsLeaf: hash.equals(leafHash), inner: hash };
    }
    const mid = Math.round(len / 2);
    const left = values.slice(0, mid);
    const right = values.slice(mid);
    const { containsLeaf: leftLeaf, inner: leftHash } = MerklePath._compute(left, leafHash, path, fnHash);
    const { containsLeaf: rightLeaf, inner: rightHash } = MerklePath._compute(right, leafHash, path, fnHash);
    hash = Hash.light(BufferUtils.concatTypedArrays(leftHash.serialize(), rightHash.serialize()));
    if (leftLeaf) {
      path.push(new MerklePathNode(rightHash, false));
      return { containsLeaf: true, inner: hash };
    } else if (rightLeaf) {
      path.push(new MerklePathNode(leftHash, true));
      return { containsLeaf: true, inner: hash };
    }
    return { containsLeaf: false, inner: hash };
  }
  computeRoot(leafValue, fnHash = MerkleTree.hash) {
    let root = fnHash(leafValue);
    for (const node of this._nodes) {
      const left = node.left;
      const hash = node.hash;
      const concat = new SerialBuffer(hash.serializedSize * 2);
      if (left)
        hash.serialize(concat);
      root.serialize(concat);
      if (!left)
        hash.serialize(concat);
      root = Hash.light(concat);
    }
    return root;
  }
  static _compress(nodes) {
    const count = nodes.length;
    const leftBitsSize = Math.ceil(count / 8);
    const leftBits = new Uint8Array(leftBitsSize);
    for (let i = 0; i < count; i++) {
      if (nodes[i].left) {
        leftBits[Math.floor(i / 8)] |= 128 >>> i % 8;
      }
    }
    return leftBits;
  }
  static unserialize(buf) {
    const count = buf.readUint8();
    const leftBitsSize = Math.ceil(count / 8);
    const leftBits = buf.read(leftBitsSize);
    const nodes = [];
    for (let i = 0; i < count; i++) {
      const left = (leftBits[Math.floor(i / 8)] & 128 >>> i % 8) !== 0;
      const hash = Hash.unserialize(buf);
      nodes.push(new MerklePathNode(hash, left));
    }
    return new MerklePath(nodes);
  }
  serialize(buf) {
    buf = buf || new SerialBuffer(this.serializedSize);
    buf.writeUint8(this._nodes.length);
    buf.write(MerklePath._compress(this._nodes));
    for (const node of this._nodes) {
      node.hash.serialize(buf);
    }
    return buf;
  }
  get serializedSize() {
    const leftBitsSize = Math.ceil(this._nodes.length / 8);
    return 1 + leftBitsSize + this._nodes.reduce((sum, node) => sum + node.hash.serializedSize, 0);
  }
  equals(o) {
    return o instanceof MerklePath && this._nodes.length === o._nodes.length && this._nodes.every((node, i) => node.equals(o._nodes[i]));
  }
  get nodes() {
    return this._nodes;
  }
}
class MerklePathNode {
  _hash;
  _left;
  constructor(hash, left) {
    this._hash = hash;
    this._left = left;
  }
  get hash() {
    return this._hash;
  }
  get left() {
    return this._left;
  }
  equals(o) {
    return o instanceof MerklePathNode && this._hash.equals(o.hash) && this._left === o.left;
  }
}

class Account {
  static TYPE_MAP = /* @__PURE__ */ new Map();
  static INITIAL;
  static BalanceError = class extends Error {
    constructor() {
      super("Balance Error!");
    }
  };
  static DoubleTransactionError = class extends Error {
    constructor() {
      super("Double Transaction Error!");
    }
  };
  static ProofError = class extends Error {
    constructor() {
      super("Proof Error!");
    }
  };
  static ValidityError = class extends Error {
    constructor() {
      super("Validity Error!");
    }
  };
  _type;
  _balance;
  constructor(type, balance) {
    if (!NumberUtils.isUint8(type))
      throw new Error("Malformed type");
    if (!NumberUtils.isUint64(balance))
      throw new Error("Malformed balance");
    this._type = type;
    this._balance = balance;
  }
  static unserialize(buf) {
    const type = buf.readUint8();
    buf.readPos--;
    if (!Account.TYPE_MAP.has(type)) {
      throw new Error("Unknown account type");
    }
    return Account.TYPE_MAP.get(type).unserialize(buf);
  }
  serialize(buf) {
    buf = buf || new SerialBuffer(this.serializedSize);
    buf.writeUint8(this._type);
    buf.writeUint64(this._balance);
    return buf;
  }
  get serializedSize() {
    return 1 + 8;
  }
  equals(o) {
    return o instanceof Account && BufferUtils.equals(this.serialize(), o.serialize());
  }
  toString() {
    return `Account{type=${this._type}, balance=${this._balance.toString()}`;
  }
  static fromAny(o) {
    if (o instanceof Account)
      return o;
    return Account.fromPlain(o);
  }
  static fromPlain(plain) {
    if (!plain || plain.type === void 0)
      throw new Error("Invalid account");
    const type = Account.Type.fromAny(plain.type);
    return Account.TYPE_MAP.get(type).fromPlain(plain);
  }
  toPlain() {
    return {
      type: Account.Type.toString(this.type),
      balance: this.balance
    };
  }
  get balance() {
    return this._balance;
  }
  get type() {
    return this._type;
  }
  withBalance(balance) {
    throw new Error("Not yet implemented.");
  }
  withIncomingTransaction(transaction, blockHeight, revert = false) {
    if (!revert) {
      return this.withBalance(this._balance + transaction.value);
    } else {
      const newBalance = this._balance - transaction.value;
      if (newBalance < 0) {
        throw new Account.BalanceError();
      }
      return this.withBalance(newBalance);
    }
  }
  withContractCommand(transaction, blockHeight, revert = false) {
    throw new Error("Not yet implemented");
  }
  isInitial() {
    return this === Account.INITIAL;
  }
  isToBePruned() {
    return this._balance === 0 && !this.isInitial();
  }
  static dataToPlain(data) {
    return {};
  }
  static proofToPlain(proof) {
    return {};
  }
}
((Account2) => {
  ((Type2) => {
    Type2[Type2["BASIC"] = 0] = "BASIC";
    Type2[Type2["VESTING"] = 1] = "VESTING";
    Type2[Type2["HTLC"] = 2] = "HTLC";
  })(Account2.Type || (Account2.Type = {}));
  ((Type2) => {
    function toString(type) {
      switch (type) {
        case 0 /* BASIC */:
          return "basic";
        case 1 /* VESTING */:
          return "vesting";
        case 2 /* HTLC */:
          return "htlc";
        default:
          throw new Error("Invalid account type");
      }
    }
    Type2.toString = toString;
    function fromAny(type) {
      if (typeof type === "number")
        return type;
      switch (type) {
        case "basic":
          return 0 /* BASIC */;
        case "vesting":
          return 1 /* VESTING */;
        case "htlc":
          return 2 /* HTLC */;
        default:
          throw new Error("Invalid account type");
      }
    }
    Type2.fromAny = fromAny;
  })(Account2.Type || (Account2.Type = {}));
})(Account || (Account = {}));

class RandomSecret extends Serializable {
  static SIZE = 32;
  _obj;
  constructor(arg) {
    super();
    if (!(arg instanceof Uint8Array))
      throw new Error("Primitive: Invalid type");
    if (arg.length !== RandomSecret.SIZE)
      throw new Error("Primitive: Invalid length");
    this._obj = arg;
  }
  static unserialize(buf) {
    return new RandomSecret(buf.read(RandomSecret.SIZE));
  }
  serialize(buf) {
    buf = buf || new SerialBuffer(this.serializedSize);
    buf.write(this._obj);
    return buf;
  }
  get serializedSize() {
    return RandomSecret.SIZE;
  }
  equals(o) {
    return o instanceof RandomSecret && super.equals(o);
  }
}

class PartialSignature extends Serializable {
  static SIZE = 32;
  _obj;
  constructor(arg) {
    super();
    if (!(arg instanceof Uint8Array))
      throw new Error("Primitive: Invalid type");
    if (arg.length !== PartialSignature.SIZE)
      throw new Error("Primitive: Invalid length");
    this._obj = arg;
  }
  static create(privateKey, publicKey, publicKeys, secret, aggregateCommitment, data) {
    const raw = PartialSignature._delinearizedPartialSignatureCreate(
      publicKeys.map((o) => o.serialize()),
      privateKey.serialize(),
      publicKey.serialize(),
      secret.serialize(),
      aggregateCommitment.serialize(),
      data
    );
    return new PartialSignature(raw);
  }
  static unserialize(buf) {
    return new PartialSignature(buf.read(PartialSignature.SIZE));
  }
  serialize(buf) {
    buf = buf || new SerialBuffer(this.serializedSize);
    buf.write(this._obj);
    return buf;
  }
  get serializedSize() {
    return PartialSignature.SIZE;
  }
  equals(o) {
    return o instanceof PartialSignature && super.equals(o);
  }
  static _delinearizedPartialSignatureCreate(publicKeys, privateKey, publicKey, secret, aggregateCommitment, message) {
    if (publicKeys.some((publicKey2) => publicKey2.byteLength !== PublicKey.SIZE) || privateKey.byteLength !== PrivateKey.SIZE || publicKey.byteLength !== PublicKey.SIZE || secret.byteLength !== RandomSecret.SIZE || aggregateCommitment.byteLength !== Commitment.SIZE) {
      throw Error("Wrong buffer size.");
    }
    const concatenatedPublicKeys = new Uint8Array(publicKeys.length * PublicKey.SIZE);
    for (let i = 0; i < publicKeys.length; ++i) {
      concatenatedPublicKeys.set(publicKeys[i], i * PublicKey.SIZE);
    }
    const Module = WasmHelper.Module;
    let stackPtr;
    try {
      stackPtr = Module.stackSave();
      const wasmOut = Module.stackAlloc(PartialSignature.SIZE);
      const wasmInPublicKeys = Module.stackAlloc(concatenatedPublicKeys.length);
      const wasmInPrivateKey = Module.stackAlloc(privateKey.length);
      const wasmInPublicKey = Module.stackAlloc(publicKey.length);
      const wasmInSecret = Module.stackAlloc(secret.length);
      const wasmInCommitment = Module.stackAlloc(aggregateCommitment.length);
      const wasmInMessage = Module.stackAlloc(message.length);
      new Uint8Array(Module.HEAPU8.buffer, wasmInPublicKeys, concatenatedPublicKeys.length).set(concatenatedPublicKeys);
      new Uint8Array(Module.HEAPU8.buffer, wasmInPrivateKey, privateKey.length).set(privateKey);
      new Uint8Array(Module.HEAPU8.buffer, wasmInPublicKey, publicKey.length).set(publicKey);
      new Uint8Array(Module.HEAPU8.buffer, wasmInSecret, secret.length).set(secret);
      new Uint8Array(Module.HEAPU8.buffer, wasmInCommitment, aggregateCommitment.length).set(aggregateCommitment);
      new Uint8Array(Module.HEAPU8.buffer, wasmInMessage, message.length).set(message);
      Module._ed25519_delinearized_partial_sign(wasmOut, wasmInMessage, message.length, wasmInCommitment, wasmInSecret, wasmInPublicKeys, publicKeys.length, wasmInPublicKey, wasmInPrivateKey);
      const partialSignature = new Uint8Array(PartialSignature.SIZE);
      partialSignature.set(new Uint8Array(Module.HEAPU8.buffer, wasmOut, PartialSignature.SIZE));
      return partialSignature;
    } catch (e) {
      throw e;
    } finally {
      if (stackPtr !== void 0)
        Module.stackRestore(stackPtr);
    }
  }
}

class Signature extends Serializable {
  static SIZE = 64;
  static copy(o) {
    if (!o)
      return o;
    const obj = new Uint8Array(o._obj);
    return new Signature(obj);
  }
  _obj;
  constructor(arg) {
    super();
    if (!(arg instanceof Uint8Array))
      throw new Error("Primitive: Invalid type");
    if (arg.length !== Signature.SIZE)
      throw new Error("Primitive: Invalid length");
    this._obj = arg;
  }
  static create(privateKey, publicKey, data) {
    return new Signature(Signature._signatureCreate(privateKey.serialize(), publicKey.serialize(), data));
  }
  static fromPartialSignatures(commitment, signatures) {
    const raw = Signature._combinePartialSignatures(commitment.serialize(), signatures.map((s) => s.serialize()));
    return new Signature(raw);
  }
  static unserialize(buf) {
    return new Signature(buf.read(Signature.SIZE));
  }
  static fromAny(o) {
    if (!o)
      throw new Error("Invalid signature format");
    if (o instanceof Signature)
      return o;
    try {
      return new Signature(BufferUtils.fromAny(o, Signature.SIZE));
    } catch (e) {
      throw new Error("Invalid signature format");
    }
  }
  serialize(buf) {
    buf = buf || new SerialBuffer(this.serializedSize);
    buf.write(this._obj);
    return buf;
  }
  get serializedSize() {
    return Signature.SIZE;
  }
  verify(publicKey, data) {
    return Signature._signatureVerify(publicKey.serialize(), data, this._obj);
  }
  equals(o) {
    return o instanceof Signature && super.equals(o);
  }
  static _combinePartialSignatures(combinedCommitment, partialSignatures) {
    const combinedSignature = Signature._aggregatePartialSignatures(partialSignatures);
    return BufferUtils.concatTypedArrays(combinedCommitment, combinedSignature);
  }
  static _aggregatePartialSignatures(partialSignatures) {
    return partialSignatures.reduce((sigA, sigB) => Signature._scalarsAdd(sigA, sigB));
  }
  static _scalarsAdd(a, b) {
    if (a.byteLength !== PartialSignature.SIZE || b.byteLength !== PartialSignature.SIZE) {
      throw Error("Wrong buffer size.");
    }
    const Module = WasmHelper.Module;
    let stackPtr;
    try {
      stackPtr = Module.stackSave();
      const wasmOutSum = Module.stackAlloc(PartialSignature.SIZE);
      const wasmInA = Module.stackAlloc(a.length);
      const wasmInB = Module.stackAlloc(b.length);
      new Uint8Array(Module.HEAPU8.buffer, wasmInA, a.length).set(a);
      new Uint8Array(Module.HEAPU8.buffer, wasmInB, b.length).set(b);
      Module._ed25519_add_scalars(wasmOutSum, wasmInA, wasmInB);
      const sum = new Uint8Array(PartialSignature.SIZE);
      sum.set(new Uint8Array(Module.HEAPU8.buffer, wasmOutSum, PartialSignature.SIZE));
      return sum;
    } catch (e) {
      throw e;
    } finally {
      if (stackPtr !== void 0)
        Module.stackRestore(stackPtr);
    }
  }
  static _signatureCreate(privateKey, publicKey, message) {
    if (publicKey.byteLength !== PublicKey.SIZE || privateKey.byteLength !== PrivateKey.SIZE) {
      throw Error("Wrong buffer size.");
    }
    const Module = WasmHelper.Module;
    let stackPtr;
    try {
      stackPtr = Module.stackSave();
      const wasmOutSignature = Module.stackAlloc(Signature.SIZE);
      const signatureBuffer = new Uint8Array(Module.HEAP8.buffer, wasmOutSignature, Signature.SIZE);
      const wasmInMessage = Module.stackAlloc(message.length);
      new Uint8Array(Module.HEAP8.buffer, wasmInMessage, message.length).set(message);
      const wasmInPubKey = Module.stackAlloc(publicKey.length);
      new Uint8Array(Module.HEAP8.buffer, wasmInPubKey, publicKey.length).set(publicKey);
      const wasmInPrivKey = Module.stackAlloc(privateKey.length);
      const privKeyBuffer = new Uint8Array(Module.HEAP8.buffer, wasmInPrivKey, privateKey.length);
      privKeyBuffer.set(privateKey);
      Module._ed25519_sign(wasmOutSignature, wasmInMessage, message.byteLength, wasmInPubKey, wasmInPrivKey);
      privKeyBuffer.fill(0);
      const signature = new Uint8Array(Signature.SIZE);
      signature.set(signatureBuffer);
      return signature;
    } catch (e) {
      throw e;
    } finally {
      if (stackPtr !== void 0)
        Module.stackRestore(stackPtr);
    }
  }
  static _signatureVerify(publicKey, message, signature) {
    const Module = WasmHelper.Module;
    let stackPtr;
    try {
      stackPtr = Module.stackSave();
      const wasmInPubKey = Module.stackAlloc(publicKey.length);
      new Uint8Array(Module.HEAP8.buffer, wasmInPubKey, publicKey.length).set(publicKey);
      const wasmInMessage = Module.stackAlloc(message.length);
      new Uint8Array(Module.HEAP8.buffer, wasmInMessage, message.length).set(message);
      const wasmInSignature = Module.stackAlloc(signature.length);
      new Uint8Array(Module.HEAP8.buffer, wasmInSignature, signature.length).set(signature);
      return !!Module._ed25519_verify(wasmInSignature, wasmInMessage, message.byteLength, wasmInPubKey);
    } catch (e) {
      throw e;
    } finally {
      if (stackPtr !== void 0)
        Module.stackRestore(stackPtr);
    }
  }
}

class CommitmentPair extends Serializable {
  static SERIALIZED_SIZE = RandomSecret.SIZE + Signature.SIZE;
  static RANDOMNESS_SIZE = 32;
  _secret;
  _commitment;
  constructor(secret, commitment) {
    super();
    if (!(secret instanceof RandomSecret))
      throw new Error("Primitive: Invalid type");
    if (!(commitment instanceof Commitment))
      throw new Error("Primitive: Invalid type");
    this._secret = secret;
    this._commitment = commitment;
  }
  static generate() {
    const randomness = new Uint8Array(CommitmentPair.RANDOMNESS_SIZE);
    CryptoUtils.getRandomValues(randomness);
    const raw = CommitmentPair._commitmentCreate(randomness);
    return new CommitmentPair(new RandomSecret(raw.secret), new Commitment(raw.commitment));
  }
  static unserialize(buf) {
    const secret = RandomSecret.unserialize(buf);
    const commitment = Commitment.unserialize(buf);
    return new CommitmentPair(secret, commitment);
  }
  static fromHex(hexBuf) {
    return this.unserialize(BufferUtils.fromHex(hexBuf));
  }
  serialize(buf) {
    buf = buf || new SerialBuffer(this.serializedSize);
    this.secret.serialize(buf);
    this.commitment.serialize(buf);
    return buf;
  }
  get secret() {
    return this._secret;
  }
  get commitment() {
    return this._commitment;
  }
  get serializedSize() {
    return this.secret.serializedSize + this.commitment.serializedSize;
  }
  equals(o) {
    return o instanceof CommitmentPair && super.equals(o);
  }
  static _commitmentCreate(randomness) {
    const Module = WasmHelper.Module;
    let stackPtr;
    try {
      stackPtr = Module.stackSave();
      const wasmOutCommitment = Module.stackAlloc(Commitment.SIZE);
      const wasmOutSecret = Module.stackAlloc(Commitment.SIZE);
      const wasmIn = Module.stackAlloc(randomness.length);
      new Uint8Array(Module.HEAPU8.buffer, wasmIn, randomness.length).set(randomness);
      const res = Module._ed25519_create_commitment(wasmOutSecret, wasmOutCommitment, wasmIn);
      if (res !== 1) {
        throw new Error(`Secret must not be 0 or 1: ${res}`);
      }
      const commitment = new Uint8Array(Commitment.SIZE);
      const secret = new Uint8Array(Commitment.SIZE);
      commitment.set(new Uint8Array(Module.HEAPU8.buffer, wasmOutCommitment, Commitment.SIZE));
      secret.set(new Uint8Array(Module.HEAPU8.buffer, wasmOutSecret, Commitment.SIZE));
      return { commitment, secret };
    } catch (e) {
      throw e;
    } finally {
      if (stackPtr !== void 0)
        Module.stackRestore(stackPtr);
    }
  }
}

class Assert {
  static that(condition, message = "Assertion failed") {
    if (!condition) {
      throw new Error(message);
    }
  }
}

class Transaction {
  static FORMAT_MAP = /* @__PURE__ */ new Map();
  _format;
  _sender;
  _senderType;
  _recipient;
  _recipientType;
  _value;
  _fee;
  _networkId;
  _validityStartHeight;
  _flags;
  _data;
  _proof;
  _valid;
  _hash;
  constructor(format, sender, senderType, recipient, recipientType, value, fee, validityStartHeight, flags, data, proof, networkId = GenesisConfig.NETWORK_ID) {
    if (!(sender instanceof Address))
      throw new Error("Malformed sender");
    if (!NumberUtils.isUint8(senderType))
      throw new Error("Malformed sender type");
    if (!(recipient instanceof Address))
      throw new Error("Malformed recipient");
    if (!NumberUtils.isUint8(recipientType))
      throw new Error("Malformed recipient type");
    if (!NumberUtils.isUint64(value) || value === 0)
      throw new Error("Malformed value");
    if (!NumberUtils.isUint64(fee))
      throw new Error("Malformed fee");
    if (!NumberUtils.isUint32(validityStartHeight))
      throw new Error("Malformed validityStartHeight");
    if (!NumberUtils.isUint8(flags) && (flags & ~Transaction.Flag.ALL) > 0)
      throw new Error("Malformed flags");
    if (!(data instanceof Uint8Array) || !NumberUtils.isUint16(data.byteLength))
      throw new Error("Malformed data");
    if (!(proof instanceof Uint8Array) || !NumberUtils.isUint16(proof.byteLength))
      throw new Error("Malformed proof");
    if (!NumberUtils.isUint8(networkId))
      throw new Error("Malformed networkId");
    this._format = format;
    this._sender = sender;
    this._senderType = senderType;
    this._recipient = recipient;
    this._recipientType = recipientType;
    this._value = value;
    this._fee = fee;
    this._networkId = networkId;
    this._validityStartHeight = validityStartHeight;
    this._flags = flags;
    this._data = data;
    this._proof = proof;
    if (this._recipient === Address.CONTRACT_CREATION)
      this._recipient = this.getContractCreationAddress();
  }
  static unserialize(buf) {
    const format = buf.readUint8();
    buf.readPos--;
    if (!Transaction.FORMAT_MAP.has(format))
      throw new Error("Invalid transaction type");
    return Transaction.FORMAT_MAP.get(format).unserialize(buf);
  }
  serializeContent(buf) {
    buf = buf || new SerialBuffer(this.serializedContentSize);
    buf.writeUint16(this._data.byteLength);
    buf.write(this._data);
    this._sender.serialize(buf);
    buf.writeUint8(this._senderType);
    this._recipient.serialize(buf);
    buf.writeUint8(this._recipientType);
    buf.writeUint64(this._value);
    buf.writeUint64(this._fee);
    buf.writeUint32(this._validityStartHeight);
    buf.writeUint8(this._networkId);
    buf.writeUint8(this._flags);
    return buf;
  }
  get serializedContentSize() {
    return 2 + this._data.byteLength + this._sender.serializedSize + 1 + this._recipient.serializedSize + 1 + 8 + 8 + 4 + 1 + 1;
  }
  verify(networkId) {
    if (this._valid === void 0) {
      this._valid = this._verify(networkId);
    }
    return this._valid;
  }
  _verify(networkId = GenesisConfig.NETWORK_ID) {
    if (this._networkId !== networkId) {
      return false;
    }
    if (this._recipient.equals(this._sender)) {
      return false;
    }
    if (!Account.TYPE_MAP.has(this._senderType) || !Account.TYPE_MAP.has(this._recipientType)) {
      return false;
    }
    if (!Account.TYPE_MAP.get(this._senderType).verifyOutgoingTransaction(this)) {
      return false;
    }
    if (!Account.TYPE_MAP.get(this._recipientType).verifyIncomingTransaction(this)) {
      return false;
    }
    return true;
  }
  get serializedSize() {
    throw new Error("Getter needs to be overwritten by subclasses");
  }
  serialize(buf) {
    throw new Error("Method needs to be overwritten by subclasses");
  }
  hash() {
    this._hash = this._hash || Hash.light(this.serializeContent());
    return this._hash;
  }
  compare(o) {
    if (this.fee / this.serializedSize > o.fee / o.serializedSize)
      return -1;
    if (this.fee / this.serializedSize < o.fee / o.serializedSize)
      return 1;
    if (this.serializedSize > o.serializedSize)
      return -1;
    if (this.serializedSize < o.serializedSize)
      return 1;
    if (this.fee > o.fee)
      return -1;
    if (this.fee < o.fee)
      return 1;
    if (this.value > o.value)
      return -1;
    if (this.value < o.value)
      return 1;
    return this.compareBlockOrder(o);
  }
  compareBlockOrder(o) {
    const recCompare = this._recipient.compare(o._recipient);
    if (recCompare !== 0)
      return recCompare;
    if (this._validityStartHeight < o._validityStartHeight)
      return -1;
    if (this._validityStartHeight > o._validityStartHeight)
      return 1;
    if (this._fee > o._fee)
      return -1;
    if (this._fee < o._fee)
      return 1;
    if (this._value > o._value)
      return -1;
    if (this._value < o._value)
      return 1;
    const senderCompare = this._sender.compare(o._sender);
    if (senderCompare !== 0)
      return senderCompare;
    if (this._recipientType < o._recipientType)
      return -1;
    if (this._recipientType > o._recipientType)
      return 1;
    if (this._senderType < o._senderType)
      return -1;
    if (this._senderType > o._senderType)
      return 1;
    if (this._flags < o._flags)
      return -1;
    if (this._flags > o._flags)
      return 1;
    return BufferUtils.compare(this._data, o._data);
  }
  equals(o) {
    return o instanceof Transaction && this._sender.equals(o._sender) && this._senderType === o._senderType && this._recipient.equals(o._recipient) && this._recipientType === o._recipientType && this._value === o._value && this._fee === o._fee && this._validityStartHeight === o._validityStartHeight && this._networkId === o._networkId && this._flags === o._flags && BufferUtils.equals(this._data, o._data);
  }
  toString() {
    return `Transaction{sender=${this._sender.toBase64()}, recipient=${this._recipient.toBase64()}, value=${this._value}, fee=${this._fee}, validityStartHeight=${this._validityStartHeight}, networkId=${this._networkId}}`;
  }
  toPlain() {
    const data = Account.TYPE_MAP.get(this.recipientType).dataToPlain(this.data);
    data.raw = BufferUtils.toHex(this.data);
    const proof = Account.TYPE_MAP.get(this.senderType).proofToPlain(this.proof);
    proof.raw = BufferUtils.toHex(this.proof);
    return {
      transactionHash: this.hash().toPlain(),
      format: Transaction.Format.toString(this._format),
      sender: this.sender.toPlain(),
      senderType: Account.Type.toString(this.senderType),
      recipient: this.recipient.toPlain(),
      recipientType: Account.Type.toString(this.recipientType),
      value: this.value,
      fee: this.fee,
      feePerByte: this.feePerByte,
      validityStartHeight: this.validityStartHeight,
      network: GenesisConfig.networkIdToNetworkName(this.networkId),
      flags: this.flags,
      data,
      proof,
      size: this.serializedSize,
      valid: this.verify()
    };
  }
  static fromPlain(plain) {
    if (!plain)
      throw new Error("Invalid transaction format");
    const format = Transaction.Format.fromAny(plain.format);
    if (!Transaction.FORMAT_MAP.has(format))
      throw new Error("Invalid transaction type");
    return Transaction.FORMAT_MAP.get(format).fromPlain(plain);
  }
  static fromAny(tx) {
    if (tx instanceof Transaction)
      return tx;
    if (typeof tx === "object")
      return Transaction.fromPlain(tx);
    if (typeof tx === "string")
      return Transaction.unserialize(new SerialBuffer(BufferUtils.fromHex(tx)));
    throw new Error("Invalid transaction format");
  }
  getContractCreationAddress() {
    const tx = Transaction.unserialize(this.serialize());
    tx._recipient = Address.NULL;
    tx._hash = void 0;
    return Address.fromHash(tx.hash());
  }
  get format() {
    return this._format;
  }
  get sender() {
    return this._sender;
  }
  get senderType() {
    return this._senderType;
  }
  get recipient() {
    return this._recipient;
  }
  get recipientType() {
    return this._recipientType;
  }
  get value() {
    return this._value;
  }
  get fee() {
    return this._fee;
  }
  get feePerByte() {
    return this._fee / this.serializedSize;
  }
  get networkId() {
    return this._networkId;
  }
  get validityStartHeight() {
    return this._validityStartHeight;
  }
  get flags() {
    return this._flags;
  }
  hasFlag(flag) {
    return (this._flags & flag) > 0;
  }
  get data() {
    return this._data;
  }
  get proof() {
    return this._proof;
  }
  set proof(proof) {
    this._proof = proof;
  }
}
((Transaction2) => {
  ((Format2) => {
    Format2[Format2["BASIC"] = 0] = "BASIC";
    Format2[Format2["EXTENDED"] = 1] = "EXTENDED";
  })(Transaction2.Format || (Transaction2.Format = {}));
  ((Format2) => {
    function toString(format) {
      switch (format) {
        case 0 /* BASIC */:
          return "basic";
        case 1 /* EXTENDED */:
          return "extended";
        default:
          throw new Error("Invalid transaction format");
      }
    }
    Format2.toString = toString;
    function fromAny(format) {
      if (typeof format === "number")
        return format;
      switch (format) {
        case "basic":
          return 0 /* BASIC */;
        case "extended":
          return 1 /* EXTENDED */;
        default:
          throw new Error("Invalid transaction format");
      }
    }
    Format2.fromAny = fromAny;
  })(Transaction2.Format || (Transaction2.Format = {}));
  ((Flag2) => {
    Flag2[Flag2["NONE"] = 0] = "NONE";
    Flag2[Flag2["CONTRACT_CREATION"] = 1] = "CONTRACT_CREATION";
    Flag2[Flag2["ALL"] = 1] = "ALL";
  })(Transaction2.Flag || (Transaction2.Flag = {}));
})(Transaction || (Transaction = {}));

class ExtendedTransaction extends Transaction {
  constructor(sender, senderType, recipient, recipientType, value, fee, validityStartHeight, flags, data, proof = new Uint8Array(0), networkId) {
    super(Transaction.Format.EXTENDED, sender, senderType, recipient, recipientType, value, fee, validityStartHeight, flags, data, proof, networkId);
  }
  static unserialize(buf) {
    const type = buf.readUint8();
    Assert.that(type === Transaction.Format.EXTENDED);
    const dataSize = buf.readUint16();
    const data = buf.read(dataSize);
    const sender = Address.unserialize(buf);
    const senderType = buf.readUint8();
    const recipient = Address.unserialize(buf);
    const recipientType = buf.readUint8();
    const value = buf.readUint64();
    const fee = buf.readUint64();
    const validityStartHeight = buf.readUint32();
    const networkId = buf.readUint8();
    const flags = buf.readUint8();
    const proofSize = buf.readUint16();
    const proof = buf.read(proofSize);
    return new ExtendedTransaction(sender, senderType, recipient, recipientType, value, fee, validityStartHeight, flags, data, proof, networkId);
  }
  static fromPlain(plain) {
    if (!plain)
      throw new Error("Invalid transaction format");
    return new ExtendedTransaction(
      Address.fromAny(plain.sender),
      Account.Type.fromAny(plain.senderType),
      Address.fromAny(plain.recipient),
      Account.Type.fromAny(plain.recipientType),
      plain.value,
      plain.fee,
      plain.validityStartHeight,
      plain.flags,
      BufferUtils.fromAny(plain.data.raw === void 0 ? plain.data : plain.data.raw),
      BufferUtils.fromAny(plain.proof.raw === void 0 ? plain.proof : plain.proof.raw),
      GenesisConfig.networkIdFromAny(plain.network || plain.networkId)
    );
  }
  serialize(buf) {
    buf = buf || new SerialBuffer(this.serializedSize);
    buf.writeUint8(Transaction.Format.EXTENDED);
    this.serializeContent(buf);
    buf.writeUint16(this._proof.byteLength);
    buf.write(this._proof);
    return buf;
  }
  get serializedSize() {
    return 1 + this.serializedContentSize + 2 + this._proof.byteLength;
  }
}
Transaction.FORMAT_MAP.set(Transaction.Format.EXTENDED, ExtendedTransaction);

class SignatureProof {
  static verifyTransaction(transaction) {
    if (!transaction.proof)
      return false;
    try {
      const buffer = new SerialBuffer(transaction.proof);
      const proof = SignatureProof.unserialize(buffer);
      if (buffer.readPos !== buffer.byteLength) {
        return false;
      }
      return proof.verify(transaction.sender, transaction.serializeContent());
    } catch (e) {
      return false;
    }
  }
  static singleSig(publicKey, signature) {
    return new SignatureProof(publicKey, new MerklePath([]), signature);
  }
  static multiSig(signerKey, publicKeys, signature) {
    const merklePath = MerklePath.compute(publicKeys, signerKey);
    return new SignatureProof(signerKey, merklePath, signature);
  }
  _publicKey;
  _merklePath;
  _signature;
  constructor(publicKey, merklePath, signature) {
    if (!(publicKey instanceof PublicKey))
      throw new Error("Malformed publickKey");
    if (!(merklePath instanceof MerklePath))
      throw new Error("Malformed merklePath");
    if (signature && !(signature instanceof Signature))
      throw new Error("Malformed signature");
    this._publicKey = publicKey;
    this._merklePath = merklePath;
    this._signature = signature;
  }
  static unserialize(buf) {
    const publicKey = PublicKey.unserialize(buf);
    const merklePath = MerklePath.unserialize(buf);
    const signature = Signature.unserialize(buf);
    return new SignatureProof(publicKey, merklePath, signature);
  }
  serialize(buf) {
    buf = buf || new SerialBuffer(this.serializedSize);
    this._publicKey.serialize(buf);
    this._merklePath.serialize(buf);
    if (this._signature) {
      this._signature.serialize(buf);
    }
    return buf;
  }
  get serializedSize() {
    return this._publicKey.serializedSize + this._merklePath.serializedSize + (this._signature ? this._signature.serializedSize : 0);
  }
  static get SINGLE_SIG_SIZE() {
    return PublicKey.SIZE + new MerklePath([]).serializedSize + Signature.SIZE;
  }
  equals(o) {
    return o instanceof SignatureProof && this._publicKey.equals(o._publicKey) && this._merklePath.equals(o._merklePath) && (this._signature ? this._signature.equals(o._signature) : this._signature === o._signature);
  }
  verify(sender, data) {
    if (sender !== null && !this.isSignedBy(sender)) {
      return false;
    }
    if (!this._signature) {
      return false;
    }
    if (!this._signature.verify(this._publicKey, data)) {
      return false;
    }
    return true;
  }
  isSignedBy(sender) {
    const merkleRoot = this._merklePath.computeRoot(this._publicKey);
    const signerAddr = Address.fromHash(merkleRoot);
    return signerAddr.equals(sender);
  }
  get publicKey() {
    return this._publicKey;
  }
  get merklePath() {
    return this._merklePath;
  }
  get signature() {
    return this._signature;
  }
  set signature(signature) {
    this._signature = signature;
  }
}

class BasicTransaction extends Transaction {
  _signatureProof;
  constructor(senderPubKey, recipient, value, fee, validityStartHeight, signature, networkId) {
    if (!(senderPubKey instanceof PublicKey))
      throw new Error("Malformed senderPubKey");
    if (signature !== void 0 && !(signature instanceof Signature))
      throw new Error("Malformed signature");
    const proof = SignatureProof.singleSig(senderPubKey, signature);
    super(Transaction.Format.BASIC, senderPubKey.toAddress(), Account.Type.BASIC, recipient, Account.Type.BASIC, value, fee, validityStartHeight, Transaction.Flag.NONE, new Uint8Array(0), proof.serialize(), networkId);
    this._signatureProof = proof;
  }
  static unserialize(buf) {
    const type = buf.readUint8();
    Assert.that(type === Transaction.Format.BASIC);
    const senderPubKey = PublicKey.unserialize(buf);
    const recipient = Address.unserialize(buf);
    const value = buf.readUint64();
    const fee = buf.readUint64();
    const validityStartHeight = buf.readUint32();
    const networkId = buf.readUint8();
    const signature = Signature.unserialize(buf);
    return new BasicTransaction(senderPubKey, recipient, value, fee, validityStartHeight, signature, networkId);
  }
  static fromPlain(plain) {
    if (!plain)
      throw new Error("Invalid transaction format");
    return new BasicTransaction(
      PublicKey.fromAny(plain.proof.publicKey || plain.senderPubKey),
      Address.fromAny(plain.recipient),
      plain.value,
      plain.fee,
      plain.validityStartHeight,
      Signature.fromAny(plain.proof.signature || plain.signature),
      GenesisConfig.networkIdFromAny(plain.network || plain.networkId)
    );
  }
  serialize(buf) {
    buf = buf || new SerialBuffer(this.serializedSize);
    buf.writeUint8(Transaction.Format.BASIC);
    this.senderPubKey.serialize(buf);
    this._recipient.serialize(buf);
    buf.writeUint64(this._value);
    buf.writeUint64(this._fee);
    buf.writeUint32(this._validityStartHeight);
    buf.writeUint8(this._networkId);
    if (this.signature)
      this.signature.serialize(buf);
    return buf;
  }
  get serializedSize() {
    return 1 + this.senderPubKey.serializedSize + this._recipient.serializedSize + 8 + 8 + 4 + 1 + (this.signature ? this.signature.serializedSize : 0);
  }
  get senderPubKey() {
    return this._signatureProof.publicKey;
  }
  get signature() {
    return this._signatureProof.signature;
  }
  set signature(signature) {
    this._signatureProof.signature = signature;
    this._proof = this._signatureProof.serialize();
  }
}
Transaction.FORMAT_MAP.set(Transaction.Format.BASIC, BasicTransaction);

class Wallet {
  static generate() {
    return new Wallet(KeyPair.generate());
  }
  static loadPlain(buf) {
    if (typeof buf === "string")
      buf = BufferUtils.fromHex(buf);
    if (!buf || buf.byteLength === 0) {
      throw new Error("Invalid wallet seed");
    }
    return new Wallet(KeyPair.unserialize(new SerialBuffer(buf)));
  }
  static async loadEncrypted(buf, key) {
    if (typeof buf === "string")
      buf = BufferUtils.fromHex(buf);
    if (typeof key === "string")
      key = BufferUtils.fromUtf8(key);
    return new Wallet(await KeyPair.fromEncrypted(new SerialBuffer(buf), key));
  }
  _keyPair;
  _address;
  constructor(keyPair) {
    this._keyPair = keyPair;
    this._address = this._keyPair.publicKey.toAddress();
  }
  createTransaction(recipient, value, fee, validityStartHeight) {
    const transaction = new BasicTransaction(this._keyPair.publicKey, recipient, value, fee, validityStartHeight);
    transaction.signature = Signature.create(this._keyPair.privateKey, this._keyPair.publicKey, transaction.serializeContent());
    return transaction;
  }
  signTransaction(transaction) {
    const signature = Signature.create(this._keyPair.privateKey, this._keyPair.publicKey, transaction.serializeContent());
    return SignatureProof.singleSig(this._keyPair.publicKey, signature);
  }
  exportPlain() {
    return this._keyPair.serialize();
  }
  exportEncrypted(key) {
    if (typeof key === "string")
      key = BufferUtils.fromUtf8(key);
    return this._keyPair.exportEncrypted(key);
  }
  get isLocked() {
    return this.keyPair.isLocked;
  }
  lock(key) {
    if (typeof key === "string")
      key = BufferUtils.fromUtf8(key);
    return this.keyPair.lock(key);
  }
  relock() {
    this.keyPair.relock();
  }
  unlock(key) {
    if (typeof key === "string")
      key = BufferUtils.fromUtf8(key);
    return this.keyPair.unlock(key);
  }
  equals(o) {
    return o instanceof Wallet && this.keyPair.equals(o.keyPair) && this.address.equals(o.address);
  }
  get address() {
    return this._address;
  }
  get publicKey() {
    return this._keyPair.publicKey;
  }
  get keyPair() {
    return this._keyPair;
  }
}

class MultiSigWallet extends Wallet {
  static fromPublicKeys(keyPair, minSignatures, publicKeys) {
    if (publicKeys.length === 0)
      throw new Error("publicKeys may not be empty");
    if (minSignatures <= 0)
      throw new Error("minSignatures must be greater than 0");
    if (!publicKeys.some((key) => key.equals(keyPair.publicKey)))
      throw new Error("Own publicKey must be part of publicKeys");
    publicKeys = publicKeys.slice();
    publicKeys.sort((a, b) => a.compare(b));
    const combinations = [...ArrayUtils.k_combinations(publicKeys, minSignatures)];
    const multiSigKeys = combinations.map((arr) => PublicKey.sum(arr));
    return new MultiSigWallet(keyPair, minSignatures, multiSigKeys);
  }
  static _loadMultiSig(keyPair, buf) {
    const minSignatures = buf.readUint8();
    const numPublicKeys = buf.readUint8();
    const publicKeys = [];
    for (let i = 0; i < numPublicKeys; ++i) {
      publicKeys.push(PublicKey.unserialize(buf));
    }
    return new MultiSigWallet(keyPair, minSignatures, publicKeys);
  }
  static loadPlain(buf) {
    if (typeof buf === "string")
      buf = BufferUtils.fromHex(buf);
    if (!buf || buf.byteLength === 0) {
      throw new Error("Invalid wallet seed");
    }
    const serialBuf = new SerialBuffer(buf);
    const keyPair = KeyPair.unserialize(serialBuf);
    return MultiSigWallet._loadMultiSig(keyPair, serialBuf);
  }
  static async loadEncrypted(buf, key) {
    if (typeof buf === "string")
      buf = BufferUtils.fromHex(buf);
    if (typeof key === "string")
      key = BufferUtils.fromUtf8(key);
    const serialBuf = new SerialBuffer(buf);
    const keyPair = await KeyPair.fromEncrypted(serialBuf, key);
    return MultiSigWallet._loadMultiSig(keyPair, serialBuf);
  }
  _minSignatures;
  _publicKeys;
  constructor(keyPair, minSignatures, publicKeys) {
    super(keyPair);
    this._minSignatures = minSignatures;
    this._publicKeys = publicKeys;
    this._publicKeys.sort((a, b) => a.compare(b));
    const merkleRoot = MerkleTree.computeRoot(this._publicKeys);
    this._address = Address.fromHash(merkleRoot);
  }
  exportPlain() {
    const buf = new SerialBuffer(this.exportedSize);
    this._keyPair.serialize(buf);
    buf.writeUint8(this._minSignatures);
    buf.writeUint8(this._publicKeys.length);
    for (const pubKey of this._publicKeys) {
      pubKey.serialize(buf);
    }
    return buf;
  }
  get exportedSize() {
    return this._keyPair.serializedSize + 1 + 1 + this._publicKeys.reduce((sum, pubKey) => sum + pubKey.serializedSize, 0);
  }
  async exportEncrypted(key) {
    if (typeof key === "string")
      key = BufferUtils.fromUtf8(key);
    const buf = new SerialBuffer(this.encryptedSize);
    buf.write(await this._keyPair.exportEncrypted(key));
    buf.writeUint8(this._minSignatures);
    buf.writeUint8(this._publicKeys.length);
    for (const pubKey of this._publicKeys) {
      pubKey.serialize(buf);
    }
    return buf;
  }
  get encryptedSize() {
    return this._keyPair.encryptedSize + 1 + 1 + this._publicKeys.reduce((sum, pubKey) => sum + pubKey.serializedSize, 0);
  }
  createTransaction(recipientAddr, value, fee, validityStartHeight) {
    return new ExtendedTransaction(
      this._address,
      Account.Type.BASIC,
      recipientAddr,
      Account.Type.BASIC,
      value,
      fee,
      validityStartHeight,
      Transaction.Flag.NONE,
      new Uint8Array(0)
    );
  }
  createCommitment() {
    return CommitmentPair.generate();
  }
  partiallySignTransaction(transaction, publicKeys, aggregatedCommitment, secret) {
    publicKeys = publicKeys.slice();
    publicKeys.sort((a, b) => a.compare(b));
    return PartialSignature.create(
      this._keyPair.privateKey,
      this._keyPair.publicKey,
      publicKeys,
      secret,
      aggregatedCommitment,
      transaction.serializeContent()
    );
  }
  signTransaction(transaction, aggregatedPublicKey, aggregatedCommitment, signatures) {
    if (signatures.length !== this._minSignatures) {
      throw new Error("Not enough signatures to complete this transaction");
    }
    const signature = Signature.fromPartialSignatures(aggregatedCommitment, signatures);
    return SignatureProof.multiSig(aggregatedPublicKey, this._publicKeys, signature);
  }
  completeTransaction(transaction, aggregatedPublicKey, aggregatedCommitment, signatures) {
    const proof = this.signTransaction(transaction, aggregatedPublicKey, aggregatedCommitment, signatures);
    transaction.proof = proof.serialize();
    return transaction;
  }
  get minSignatures() {
    return this._minSignatures;
  }
  get publicKeys() {
    return this._publicKeys;
  }
}

class BasicAccount extends Account {
  static copy(o) {
    if (!o)
      return o;
    return new BasicAccount(o._balance);
  }
  constructor(balance = 0) {
    super(Account.Type.BASIC, balance);
  }
  static unserialize(buf) {
    const type = buf.readUint8();
    if (type !== Account.Type.BASIC)
      throw new Error("Invalid account type");
    const balance = buf.readUint64();
    return new BasicAccount(balance);
  }
  static fromPlain(o) {
    if (!o)
      throw new Error("Invalid account");
    return new BasicAccount(o.balance);
  }
  equals(o) {
    return o instanceof BasicAccount && this._type === o._type && this._balance === o._balance;
  }
  toString() {
    return `BasicAccount{balance=${this._balance}}`;
  }
  static verifyOutgoingTransaction(transaction) {
    return SignatureProof.verifyTransaction(transaction);
  }
  static verifyIncomingTransaction(transaction) {
    if (transaction.data.byteLength > 64)
      return false;
    return true;
  }
  withBalance(balance) {
    return new BasicAccount(balance);
  }
  isInitial() {
    return this._balance === 0;
  }
  static dataToPlain(data) {
    return Account.dataToPlain(data);
  }
  static proofToPlain(proof) {
    try {
      const signatureProof = SignatureProof.unserialize(new SerialBuffer(proof));
      return {
        signature: signatureProof.signature?.toHex(),
        publicKey: signatureProof.publicKey.toHex(),
        signer: signatureProof.publicKey.toAddress().toPlain(),
        pathLength: signatureProof.merklePath.nodes.length
      };
    } catch (e) {
      return Account.proofToPlain(proof);
    }
  }
}
Account.INITIAL = new BasicAccount(0);
Account.TYPE_MAP.set(Account.Type.BASIC, BasicAccount);

class Contract extends Account {
  constructor(type, balance) {
    super(type, balance);
  }
  static verifyIncomingTransaction(transaction) {
    if (!transaction.recipient.equals(transaction.getContractCreationAddress())) {
      return false;
    }
    return true;
  }
  withIncomingTransaction(transaction, blockHeight, revert = false) {
    if (!revert && transaction.hasFlag(Transaction.Flag.CONTRACT_CREATION)) {
      throw new Error("Data error");
    }
    return super.withIncomingTransaction(transaction, blockHeight, revert);
  }
  withContractCommand(transaction, blockHeight, revert = false) {
    if (revert && transaction.hasFlag(Transaction.Flag.CONTRACT_CREATION)) {
      return new BasicAccount(this.balance);
    }
    return this;
  }
}

class VestingContract extends Contract {
  _owner;
  _vestingStart;
  _vestingStepBlocks;
  _vestingStepAmount;
  _vestingTotalAmount;
  constructor(balance = 0, owner = Address.NULL, vestingStart = 0, vestingStepBlocks = 0, vestingStepAmount = balance, vestingTotalAmount = balance) {
    super(Account.Type.VESTING, balance);
    if (!(owner instanceof Address))
      throw new Error("Malformed owner address");
    if (!NumberUtils.isUint32(vestingStart))
      throw new Error("Malformed vestingStart");
    if (!NumberUtils.isUint32(vestingStepBlocks))
      throw new Error("Malformed vestingStepBlocks");
    if (!NumberUtils.isUint64(vestingStepAmount))
      throw new Error("Malformed vestingStepAmount");
    if (!NumberUtils.isUint64(vestingTotalAmount))
      throw new Error("Malformed vestingTotalAmount");
    this._owner = owner;
    this._vestingStart = vestingStart;
    this._vestingStepBlocks = vestingStepBlocks;
    this._vestingStepAmount = vestingStepAmount;
    this._vestingTotalAmount = vestingTotalAmount;
  }
  static create(balance, blockHeight, transaction) {
    let vestingStart, vestingStepBlocks, vestingStepAmount, vestingTotalAmount;
    const buf = new SerialBuffer(transaction.data);
    const owner = Address.unserialize(buf);
    vestingTotalAmount = transaction.value;
    switch (transaction.data.length) {
      case Address.SERIALIZED_SIZE + 4:
        vestingStart = 0;
        vestingStepBlocks = buf.readUint32();
        vestingStepAmount = vestingTotalAmount;
        break;
      case Address.SERIALIZED_SIZE + 16:
        vestingStart = buf.readUint32();
        vestingStepBlocks = buf.readUint32();
        vestingStepAmount = buf.readUint64();
        break;
      case Address.SERIALIZED_SIZE + 24:
        vestingStart = buf.readUint32();
        vestingStepBlocks = buf.readUint32();
        vestingStepAmount = buf.readUint64();
        vestingTotalAmount = buf.readUint64();
        break;
      default:
        throw new Error("Invalid transaction data");
    }
    return new VestingContract(balance, owner, vestingStart, vestingStepBlocks, vestingStepAmount, vestingTotalAmount);
  }
  static unserialize(buf) {
    const type = buf.readUint8();
    if (type !== Account.Type.VESTING)
      throw new Error("Invalid account type");
    const balance = buf.readUint64();
    const owner = Address.unserialize(buf);
    const vestingStart = buf.readUint32();
    const vestingStepBlocks = buf.readUint32();
    const vestingStepAmount = buf.readUint64();
    const vestingTotalAmount = buf.readUint64();
    return new VestingContract(balance, owner, vestingStart, vestingStepBlocks, vestingStepAmount, vestingTotalAmount);
  }
  static fromPlain(plain) {
    if (!plain)
      throw new Error("Invalid account");
    return new VestingContract(plain.balance, Address.fromAny(plain.owner), plain.vestingStart, plain.vestingStepBlocks, plain.vestingStepAmount, plain.vestingTotalAmount);
  }
  serialize(buf) {
    buf = buf || new SerialBuffer(this.serializedSize);
    super.serialize(buf);
    this._owner.serialize(buf);
    buf.writeUint32(this._vestingStart);
    buf.writeUint32(this._vestingStepBlocks);
    buf.writeUint64(this._vestingStepAmount);
    buf.writeUint64(this._vestingTotalAmount);
    return buf;
  }
  get serializedSize() {
    return super.serializedSize + this._owner.serializedSize + 4 + 4 + 8 + 8;
  }
  get owner() {
    return this._owner;
  }
  get vestingStart() {
    return this._vestingStart;
  }
  get vestingStepBlocks() {
    return this._vestingStepBlocks;
  }
  get vestingStepAmount() {
    return this._vestingStepAmount;
  }
  get vestingTotalAmount() {
    return this._vestingTotalAmount;
  }
  toString() {
    return `VestingAccount{balance=${this._balance}, owner=${this._owner.toUserFriendlyAddress()}`;
  }
  toPlain() {
    const plain = super.toPlain();
    plain.owner = this.owner.toPlain();
    plain.vestingStart = this.vestingStart;
    plain.vestingStepBlocks = this.vestingStepBlocks;
    plain.vestingStepAmount = this.vestingStepAmount;
    plain.vestingTotalAmount = this.vestingTotalAmount;
    return plain;
  }
  equals(o) {
    return o instanceof VestingContract && this._type === o._type && this._balance === o._balance && this._owner.equals(o._owner) && this._vestingStart === o._vestingStart && this._vestingStepBlocks === o._vestingStepBlocks && this._vestingStepAmount === o._vestingStepAmount && this._vestingTotalAmount === o._vestingTotalAmount;
  }
  static verifyOutgoingTransaction(transaction) {
    const buf = new SerialBuffer(transaction.proof);
    if (!SignatureProof.unserialize(buf).verify(null, transaction.serializeContent())) {
      return false;
    }
    if (buf.readPos !== buf.byteLength) {
      return false;
    }
    return true;
  }
  static verifyIncomingTransaction(transaction) {
    switch (transaction.data.length) {
      case Address.SERIALIZED_SIZE + 4:
      case Address.SERIALIZED_SIZE + 16:
      case Address.SERIALIZED_SIZE + 24:
        return Contract.verifyIncomingTransaction(transaction);
      default:
        return false;
    }
  }
  withBalance(balance) {
    return new VestingContract(balance, this._owner, this._vestingStart, this._vestingStepBlocks, this._vestingStepAmount, this._vestingTotalAmount);
  }
  withIncomingTransaction(transaction, blockHeight, revert = false) {
    throw new Error("Illegal incoming transaction");
  }
  getMinCap(blockHeight) {
    return this._vestingStepBlocks && this._vestingStepAmount > 0 ? Math.max(0, this._vestingTotalAmount - Math.floor((blockHeight - this._vestingStart) / this._vestingStepBlocks) * this._vestingStepAmount) : 0;
  }
  static dataToPlain(data) {
    try {
      let vestingStart, vestingStepBlocks, vestingStepAmount, vestingTotalAmount;
      const buf = new SerialBuffer(data);
      const owner = Address.unserialize(buf);
      switch (data.length) {
        case Address.SERIALIZED_SIZE + 4:
          vestingStart = 0;
          vestingStepBlocks = buf.readUint32();
          break;
        case Address.SERIALIZED_SIZE + 16:
          vestingStart = buf.readUint32();
          vestingStepBlocks = buf.readUint32();
          vestingStepAmount = buf.readUint64();
          break;
        case Address.SERIALIZED_SIZE + 24:
          vestingStart = buf.readUint32();
          vestingStepBlocks = buf.readUint32();
          vestingStepAmount = buf.readUint64();
          vestingTotalAmount = buf.readUint64();
          break;
        default:
          throw new Error("Invalid transaction data");
      }
      return {
        owner: owner.toPlain(),
        vestingStart,
        vestingStepBlocks,
        vestingStepAmount,
        vestingTotalAmount
      };
    } catch (e) {
      return Account.dataToPlain(data);
    }
  }
  static proofToPlain(proof) {
    try {
      const signatureProof = SignatureProof.unserialize(new SerialBuffer(proof));
      return {
        signature: signatureProof.signature?.toHex(),
        publicKey: signatureProof.publicKey.toHex(),
        signer: signatureProof.publicKey.toAddress().toPlain(),
        pathLength: signatureProof.merklePath.nodes.length
      };
    } catch (e) {
      return Account.proofToPlain(proof);
    }
  }
}
Account.TYPE_MAP.set(Account.Type.VESTING, VestingContract);

class HashedTimeLockedContract extends Contract {
  _sender;
  _recipient;
  _hashRoot;
  _hashCount;
  _timeout;
  _totalAmount;
  constructor(balance = 0, sender = Address.NULL, recipient = Address.NULL, hashRoot = Hash.NULL, hashCount = 1, timeout = 0, totalAmount = balance) {
    super(Account.Type.HTLC, balance);
    if (!(sender instanceof Address))
      throw new Error("Malformed sender address");
    if (!(recipient instanceof Address))
      throw new Error("Malformed recipient address");
    if (!(hashRoot instanceof Hash))
      throw new Error("Malformed hashRoot");
    if (!NumberUtils.isUint8(hashCount) || hashCount === 0)
      throw new Error("Malformed hashCount");
    if (!NumberUtils.isUint32(timeout))
      throw new Error("Malformed timeout");
    if (!NumberUtils.isUint64(totalAmount))
      throw new Error("Malformed totalAmount");
    this._sender = sender;
    this._recipient = recipient;
    this._hashRoot = hashRoot;
    this._hashCount = hashCount;
    this._timeout = timeout;
    this._totalAmount = totalAmount;
  }
  static create(balance, blockHeight, transaction) {
    const buf = new SerialBuffer(transaction.data);
    const sender = Address.unserialize(buf);
    const recipient = Address.unserialize(buf);
    const hashAlgorithm = buf.readUint8();
    const hashRoot = Hash.unserialize(buf, hashAlgorithm);
    const hashCount = buf.readUint8();
    const timeout = buf.readUint32();
    return new HashedTimeLockedContract(balance, sender, recipient, hashRoot, hashCount, timeout);
  }
  static unserialize(buf) {
    const type = buf.readUint8();
    if (type !== Account.Type.HTLC)
      throw new Error("Invalid account type");
    const balance = buf.readUint64();
    const sender = Address.unserialize(buf);
    const recipient = Address.unserialize(buf);
    const hashAlgorithm = buf.readUint8();
    const hashRoot = Hash.unserialize(buf, hashAlgorithm);
    const hashCount = buf.readUint8();
    const timeout = buf.readUint32();
    const totalAmount = buf.readUint64();
    return new HashedTimeLockedContract(balance, sender, recipient, hashRoot, hashCount, timeout, totalAmount);
  }
  static fromPlain(plain) {
    if (!plain)
      throw new Error("Invalid account");
    return new HashedTimeLockedContract(plain.balance, Address.fromAny(plain.sender), Address.fromAny(plain.recipient), Hash.fromAny(plain.hashRoot, Hash.Algorithm.fromAny(plain.hashAlgorithm)), plain.hashCount, plain.timeout, plain.totalAmount);
  }
  serialize(buf) {
    buf = buf || new SerialBuffer(this.serializedSize);
    super.serialize(buf);
    this._sender.serialize(buf);
    this._recipient.serialize(buf);
    buf.writeUint8(this._hashRoot.algorithm);
    this._hashRoot.serialize(buf);
    buf.writeUint8(this._hashCount);
    buf.writeUint32(this._timeout);
    buf.writeUint64(this._totalAmount);
    return buf;
  }
  get serializedSize() {
    return super.serializedSize + this._sender.serializedSize + this._recipient.serializedSize + 1 + this._hashRoot.serializedSize + 1 + 4 + 8;
  }
  get sender() {
    return this._sender;
  }
  get recipient() {
    return this._recipient;
  }
  get hashAlgorithm() {
    return this._hashRoot.algorithm;
  }
  get hashRoot() {
    return this._hashRoot;
  }
  get hashCount() {
    return this._hashCount;
  }
  get timeout() {
    return this._timeout;
  }
  get totalAmount() {
    return this._totalAmount;
  }
  toString() {
    return `HashedTimeLockedContract{balance=${this._balance}, sender=${this._sender.toUserFriendlyAddress(false)}, recipient=${this._sender.toUserFriendlyAddress(false)}, amount=${this._totalAmount}/${this._hashCount}, timeout=${this._timeout}}`;
  }
  toPlain() {
    const plain = super.toPlain();
    plain.sender = this.sender.toPlain();
    plain.recipient = this.recipient.toPlain();
    plain.hashAlgorithm = Hash.Algorithm.toString(this.hashRoot.algorithm);
    plain.hashRoot = this.hashRoot.toPlain();
    plain.hashCount = this.hashCount;
    plain.timeout = this.timeout;
    plain.totalAmount = this.totalAmount;
    return plain;
  }
  equals(o) {
    return o instanceof HashedTimeLockedContract && this._type === o._type && this._balance === o._balance && this._sender.equals(o._sender) && this._recipient.equals(o._recipient) && this._hashRoot.equals(o._hashRoot) && this._hashCount === o._hashCount && this._timeout === o._timeout && this._totalAmount === o._totalAmount;
  }
  static verifyOutgoingTransaction(transaction) {
    try {
      const buf = new SerialBuffer(transaction.proof);
      const type = buf.readUint8();
      switch (type) {
        case HashedTimeLockedContract.ProofType.REGULAR_TRANSFER: {
          const hashAlgorithm = buf.readUint8();
          const hashDepth = buf.readUint8();
          const hashRoot = Hash.unserialize(buf, hashAlgorithm);
          let preImage = Hash.unserialize(buf, hashAlgorithm);
          for (let i = 0; i < hashDepth; ++i) {
            preImage = Hash.compute(preImage.array, hashAlgorithm);
          }
          if (!hashRoot.equals(preImage)) {
            return false;
          }
          if (!SignatureProof.unserialize(buf).verify(null, transaction.serializeContent())) {
            return false;
          }
          break;
        }
        case HashedTimeLockedContract.ProofType.EARLY_RESOLVE: {
          if (!SignatureProof.unserialize(buf).verify(null, transaction.serializeContent())) {
            return false;
          }
          if (!SignatureProof.unserialize(buf).verify(null, transaction.serializeContent())) {
            return false;
          }
          break;
        }
        case HashedTimeLockedContract.ProofType.TIMEOUT_RESOLVE:
          if (!SignatureProof.unserialize(buf).verify(null, transaction.serializeContent())) {
            return false;
          }
          break;
        default:
          return false;
      }
      if (buf.readPos !== buf.byteLength) {
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }
  static verifyIncomingTransaction(transaction) {
    try {
      const buf = new SerialBuffer(transaction.data);
      Address.unserialize(buf);
      Address.unserialize(buf);
      const hashAlgorithm = buf.readUint8();
      Hash.unserialize(buf, hashAlgorithm);
      const hashCount = buf.readUint8();
      buf.readUint32();
      if (hashCount === 0) {
        return false;
      }
      if (hashAlgorithm === Hash.Algorithm.ARGON2D) {
        return false;
      }
      if (buf.readPos !== buf.byteLength) {
        return false;
      }
      return Contract.verifyIncomingTransaction(transaction);
    } catch (e) {
      return false;
    }
  }
  withBalance(balance) {
    return new HashedTimeLockedContract(balance, this._sender, this._recipient, this._hashRoot, this._hashCount, this._timeout, this._totalAmount);
  }
  withIncomingTransaction(transaction, blockHeight, revert = false) {
    throw new Error("Illegal incoming transaction");
  }
  static dataToPlain(data) {
    try {
      const buf = new SerialBuffer(data);
      const sender = Address.unserialize(buf);
      const recipient = Address.unserialize(buf);
      const hashAlgorithm = buf.readUint8();
      const hashRoot = Hash.unserialize(buf, hashAlgorithm);
      const hashCount = buf.readUint8();
      const timeout = buf.readUint32();
      return {
        sender: sender.toPlain(),
        recipient: recipient.toPlain(),
        hashAlgorithm: Hash.Algorithm.toString(hashAlgorithm),
        hashRoot: hashRoot.toPlain(),
        hashCount,
        timeout
      };
    } catch (e) {
      return Account.dataToPlain(data);
    }
  }
  static proofToPlain(proof) {
    try {
      const buf = new SerialBuffer(proof);
      const type = buf.readUint8();
      switch (type) {
        case HashedTimeLockedContract.ProofType.REGULAR_TRANSFER: {
          const hashAlgorithm = buf.readUint8();
          const hashDepth = buf.readUint8();
          const hashRoot = Hash.unserialize(buf, hashAlgorithm);
          const preImage = Hash.unserialize(buf, hashAlgorithm);
          const signatureProof = SignatureProof.unserialize(buf);
          return {
            type: HashedTimeLockedContract.ProofType.toString(type),
            hashAlgorithm: Hash.Algorithm.toString(hashAlgorithm),
            hashDepth,
            hashRoot: hashRoot.toPlain(),
            preImage: preImage.toPlain(),
            signer: signatureProof.publicKey.toAddress().toPlain(),
            signature: signatureProof.signature?.toHex(),
            publicKey: signatureProof.publicKey.toHex(),
            pathLength: signatureProof.merklePath.nodes.length
          };
        }
        case HashedTimeLockedContract.ProofType.EARLY_RESOLVE: {
          const signatureProof = SignatureProof.unserialize(buf);
          const creatorSignatureProof = SignatureProof.unserialize(buf);
          return {
            type: HashedTimeLockedContract.ProofType.toString(type),
            signer: signatureProof.publicKey.toAddress().toPlain(),
            signature: signatureProof.signature?.toHex(),
            publicKey: signatureProof.publicKey.toHex(),
            pathLength: signatureProof.merklePath.nodes.length,
            creator: creatorSignatureProof.publicKey.toAddress().toPlain(),
            creatorSignature: creatorSignatureProof.signature?.toHex(),
            creatorPublicKey: creatorSignatureProof.publicKey.toHex(),
            creatorPathLength: creatorSignatureProof.merklePath.nodes.length
          };
        }
        case HashedTimeLockedContract.ProofType.TIMEOUT_RESOLVE: {
          const creatorSignatureProof = SignatureProof.unserialize(buf);
          return {
            type: HashedTimeLockedContract.ProofType.toString(type),
            creator: creatorSignatureProof.publicKey.toAddress().toPlain(),
            creatorSignature: creatorSignatureProof.signature?.toHex(),
            creatorPublicKey: creatorSignatureProof.publicKey.toHex(),
            creatorPathLength: creatorSignatureProof.merklePath.nodes.length
          };
        }
        default:
          throw new Error("Invalid proof type");
      }
    } catch (e) {
      return Account.proofToPlain(proof);
    }
  }
}
((HashedTimeLockedContract2) => {
  ((ProofType2) => {
    ProofType2[ProofType2["REGULAR_TRANSFER"] = 1] = "REGULAR_TRANSFER";
    ProofType2[ProofType2["EARLY_RESOLVE"] = 2] = "EARLY_RESOLVE";
    ProofType2[ProofType2["TIMEOUT_RESOLVE"] = 3] = "TIMEOUT_RESOLVE";
  })(HashedTimeLockedContract2.ProofType || (HashedTimeLockedContract2.ProofType = {}));
  ((ProofType2) => {
    function toString(proofType) {
      switch (proofType) {
        case 1 /* REGULAR_TRANSFER */:
          return "regular-transfer";
        case 2 /* EARLY_RESOLVE */:
          return "early-resolve";
        case 3 /* TIMEOUT_RESOLVE */:
          return "timeout-resolve";
        default:
          throw new Error("Invalid proof type");
      }
    }
    ProofType2.toString = toString;
  })(HashedTimeLockedContract2.ProofType || (HashedTimeLockedContract2.ProofType = {}));
})(HashedTimeLockedContract || (HashedTimeLockedContract = {}));
Account.TYPE_MAP.set(Account.Type.HTLC, HashedTimeLockedContract);

setWasmInit(() => nimiqWasm());
async function initialize(options) {
  if (options?.wasm)
    console.warn("Calling initialize() with options.wasm is not necessary for the standard version of this library, as the WASM is already included.");
  return WasmHelper.doImport();
}

function init(Module) {
  Module = Module || {};
  var Module = Module;
  var Module;
  if (!Module)
    Module = eval("(function() { try { return Module || {} } catch(e) { return {} } })()");
  var moduleOverrides = {};
  for (var key in Module) {
    if (Module.hasOwnProperty(key)) {
      moduleOverrides[key] = Module[key];
    }
  }
  var ENVIRONMENT_IS_WEB = false;
  var ENVIRONMENT_IS_WORKER = false;
  var ENVIRONMENT_IS_NODE = false;
  var ENVIRONMENT_IS_SHELL = false;
  if (Module["ENVIRONMENT"]) {
    if (Module["ENVIRONMENT"] === "WEB") {
      ENVIRONMENT_IS_WEB = true;
    } else if (Module["ENVIRONMENT"] === "WORKER") {
      ENVIRONMENT_IS_WORKER = true;
    } else if (Module["ENVIRONMENT"] === "NODE") {
      ENVIRONMENT_IS_NODE = true;
    } else if (Module["ENVIRONMENT"] === "SHELL") {
      ENVIRONMENT_IS_SHELL = true;
    } else {
      throw new Error("The provided Module['ENVIRONMENT'] value is not valid. It must be one of: WEB|WORKER|NODE|SHELL.");
    }
  } else {
    ENVIRONMENT_IS_WEB = typeof window === "object";
    ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
    ENVIRONMENT_IS_NODE = typeof process === "object" && typeof require === "function" && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
    ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
  }
  if (ENVIRONMENT_IS_NODE) {
    if (!Module["print"])
      Module["print"] = console.log;
    if (!Module["printErr"])
      Module["printErr"] = console.warn;
    var nodeFS;
    var nodePath;
    Module["read"] = function read2(filename, binary) {
      if (!nodeFS)
        nodeFS = require("fs");
      if (!nodePath)
        nodePath = require("path");
      filename = nodePath["normalize"](filename);
      var ret = nodeFS["readFileSync"](filename);
      return binary ? ret : ret.toString();
    };
    Module["readBinary"] = function readBinary(filename) {
      var ret = Module["read"](filename, true);
      if (!ret.buffer) {
        ret = new Uint8Array(ret);
      }
      assert(ret.buffer);
      return ret;
    };
    Module["load"] = function load(f) {
      globalEval(read(f));
    };
    if (!Module["thisProgram"]) {
      if (process["argv"].length > 1) {
        Module["thisProgram"] = process["argv"][1].replace(/\\/g, "/");
      } else {
        Module["thisProgram"] = "unknown-program";
      }
    }
    Module["arguments"] = process["argv"].slice(2);
    if (typeof module !== "undefined") {
      module["exports"] = Module;
    }
    process["on"]("uncaughtException", function(ex) {
      if (!(ex instanceof ExitStatus)) {
        throw ex;
      }
    });
    Module["inspect"] = function() {
      return "[Emscripten Module object]";
    };
  } else if (ENVIRONMENT_IS_SHELL) {
    if (!Module["print"])
      Module["print"] = print;
    if (typeof printErr != "undefined")
      Module["printErr"] = printErr;
    if (typeof read != "undefined") {
      Module["read"] = read;
    } else {
      Module["read"] = function read2() {
        throw "no read() available";
      };
    }
    Module["readBinary"] = function readBinary(f) {
      if (typeof readbuffer === "function") {
        return new Uint8Array(readbuffer(f));
      }
      var data2 = read(f, "binary");
      assert(typeof data2 === "object");
      return data2;
    };
    if (typeof scriptArgs != "undefined") {
      Module["arguments"] = scriptArgs;
    } else if (typeof arguments != "undefined") {
      Module["arguments"] = arguments;
    }
    if (typeof quit === "function") {
      Module["quit"] = function(status, toThrow) {
        quit(status);
      };
    }
    eval("if (typeof gc === 'function' && gc.toString().indexOf('[native code]') > 0) var gc = undefined");
  } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
    Module["read"] = function read2(url) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, false);
      xhr.send(null);
      return xhr.responseText;
    };
    if (ENVIRONMENT_IS_WORKER) {
      Module["readBinary"] = function read2(url) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, false);
        xhr.responseType = "arraybuffer";
        xhr.send(null);
        return xhr.response;
      };
    }
    Module["readAsync"] = function readAsync(url, onload, onerror) {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      xhr.responseType = "arraybuffer";
      xhr.onload = function xhr_onload() {
        if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
          onload(xhr.response);
        } else {
          onerror();
        }
      };
      xhr.onerror = onerror;
      xhr.send(null);
    };
    if (typeof arguments != "undefined") {
      Module["arguments"] = arguments;
    }
    if (typeof console !== "undefined") {
      if (!Module["print"])
        Module["print"] = function print2(x) {
          console.log(x);
        };
      if (!Module["printErr"])
        Module["printErr"] = function printErr2(x) {
          console.warn(x);
        };
    } else {
      var TRY_USE_DUMP = false;
      if (!Module["print"])
        Module["print"] = TRY_USE_DUMP && typeof dump !== "undefined" ? function(x) {
          dump(x);
        } : function(x) {
        };
    }
    if (ENVIRONMENT_IS_WORKER) {
      Module["load"] = importScripts;
    }
    if (typeof Module["setWindowTitle"] === "undefined") {
      Module["setWindowTitle"] = function(title) {
        document.title = title;
      };
    }
  } else {
    throw "Unknown runtime environment. Where are we?";
  }
  function globalEval(x) {
    eval.call(null, x);
  }
  if (!Module["load"] && Module["read"]) {
    Module["load"] = function load(f) {
      globalEval(Module["read"](f));
    };
  }
  if (!Module["print"]) {
    Module["print"] = function() {
    };
  }
  if (!Module["printErr"]) {
    Module["printErr"] = Module["print"];
  }
  if (!Module["arguments"]) {
    Module["arguments"] = [];
  }
  if (!Module["thisProgram"]) {
    Module["thisProgram"] = "./this.program";
  }
  if (!Module["quit"]) {
    Module["quit"] = function(status, toThrow) {
      throw toThrow;
    };
  }
  Module.print = Module["print"];
  Module.printErr = Module["printErr"];
  Module["preRun"] = [];
  Module["postRun"] = [];
  for (var key in moduleOverrides) {
    if (moduleOverrides.hasOwnProperty(key)) {
      Module[key] = moduleOverrides[key];
    }
  }
  moduleOverrides = void 0;
  var Runtime = {
    setTempRet0: function(value) {
      tempRet0 = value;
      return value;
    },
    getTempRet0: function() {
      return tempRet0;
    },
    stackSave: function() {
      return STACKTOP;
    },
    stackRestore: function(stackTop) {
      STACKTOP = stackTop;
    },
    getNativeTypeSize: function(type2) {
      switch (type2) {
        case "i1":
        case "i8":
          return 1;
        case "i16":
          return 2;
        case "i32":
          return 4;
        case "i64":
          return 8;
        case "float":
          return 4;
        case "double":
          return 8;
        default: {
          if (type2[type2.length - 1] === "*") {
            return Runtime.QUANTUM_SIZE;
          } else if (type2[0] === "i") {
            var bits = parseInt(type2.substr(1));
            assert(bits % 8 === 0);
            return bits / 8;
          } else {
            return 0;
          }
        }
      }
    },
    getNativeFieldSize: function(type2) {
      return Math.max(Runtime.getNativeTypeSize(type2), Runtime.QUANTUM_SIZE);
    },
    STACK_ALIGN: 16,
    prepVararg: function(ptr, type2) {
      if (type2 === "double" || type2 === "i64") {
        if (ptr & 7) {
          assert((ptr & 7) === 4);
          ptr += 4;
        }
      } else {
        assert((ptr & 3) === 0);
      }
      return ptr;
    },
    getAlignSize: function(type2, size, vararg) {
      if (!vararg && (type2 == "i64" || type2 == "double"))
        return 8;
      if (!type2)
        return Math.min(size, 8);
      return Math.min(size || (type2 ? Runtime.getNativeFieldSize(type2) : 0), Runtime.QUANTUM_SIZE);
    },
    dynCall: function(sig, ptr, args) {
      if (args && args.length) {
        return Module["dynCall_" + sig].apply(null, [ptr].concat(args));
      } else {
        return Module["dynCall_" + sig].call(null, ptr);
      }
    },
    functionPointers: [],
    addFunction: function(func2) {
      for (var i2 = 0; i2 < Runtime.functionPointers.length; i2++) {
        if (!Runtime.functionPointers[i2]) {
          Runtime.functionPointers[i2] = func2;
          return 2 * (1 + i2);
        }
      }
      throw "Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS.";
    },
    removeFunction: function(index) {
      Runtime.functionPointers[(index - 2) / 2] = null;
    },
    warnOnce: function(text) {
      if (!Runtime.warnOnce.shown)
        Runtime.warnOnce.shown = {};
      if (!Runtime.warnOnce.shown[text]) {
        Runtime.warnOnce.shown[text] = 1;
        Module.printErr(text);
      }
    },
    funcWrappers: {},
    getFuncWrapper: function(func2, sig) {
      assert(sig);
      if (!Runtime.funcWrappers[sig]) {
        Runtime.funcWrappers[sig] = {};
      }
      var sigCache = Runtime.funcWrappers[sig];
      if (!sigCache[func2]) {
        if (sig.length === 1) {
          sigCache[func2] = function dynCall_wrapper() {
            return Runtime.dynCall(sig, func2);
          };
        } else if (sig.length === 2) {
          sigCache[func2] = function dynCall_wrapper(arg2) {
            return Runtime.dynCall(sig, func2, [arg2]);
          };
        } else {
          sigCache[func2] = function dynCall_wrapper() {
            return Runtime.dynCall(sig, func2, Array.prototype.slice.call(arguments));
          };
        }
      }
      return sigCache[func2];
    },
    getCompilerSetting: function(name) {
      throw "You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work";
    },
    stackAlloc: function(size) {
      var ret = STACKTOP;
      STACKTOP = STACKTOP + size | 0;
      STACKTOP = STACKTOP + 15 & -16;
      return ret;
    },
    staticAlloc: function(size) {
      var ret = STATICTOP;
      STATICTOP = STATICTOP + size | 0;
      STATICTOP = STATICTOP + 15 & -16;
      return ret;
    },
    dynamicAlloc: function(size) {
      var ret = HEAP32[DYNAMICTOP_PTR >> 2];
      var end = (ret + size + 15 | 0) & -16;
      HEAP32[DYNAMICTOP_PTR >> 2] = end;
      if (end >= TOTAL_MEMORY) {
        var success = enlargeMemory();
        if (!success) {
          HEAP32[DYNAMICTOP_PTR >> 2] = ret;
          return 0;
        }
      }
      return ret;
    },
    alignMemory: function(size, quantum) {
      var ret = size = Math.ceil(size / (quantum ? quantum : 16)) * (quantum ? quantum : 16);
      return ret;
    },
    makeBigInt: function(low, high, unsigned) {
      var ret = unsigned ? +(low >>> 0) + +(high >>> 0) * 4294967296 : +(low >>> 0) + +(high | 0) * 4294967296;
      return ret;
    },
    GLOBAL_BASE: 1024,
    QUANTUM_SIZE: 4,
    __dummy__: 0
  };
  Runtime["addFunction"] = Runtime.addFunction;
  Runtime["removeFunction"] = Runtime.removeFunction;
  var ABORT = 0;
  function assert(condition, text) {
    if (!condition) {
      abort("Assertion failed: " + text);
    }
  }
  function setValue(ptr, value, type2, noSafe) {
    type2 = type2 || "i8";
    if (type2.charAt(type2.length - 1) === "*")
      type2 = "i32";
    switch (type2) {
      case "i1":
        HEAP8[ptr >> 0] = value;
        break;
      case "i8":
        HEAP8[ptr >> 0] = value;
        break;
      case "i16":
        HEAP16[ptr >> 1] = value;
        break;
      case "i32":
        HEAP32[ptr >> 2] = value;
        break;
      case "i64":
        tempI64 = [value >>> 0, (tempDouble = value, +Math_abs(tempDouble) >= 1 ? tempDouble > 0 ? (Math_min(+Math_floor(tempDouble / 4294967296), 4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~tempDouble >>> 0)) / 4294967296) >>> 0 : 0)], HEAP32[ptr >> 2] = tempI64[0], HEAP32[ptr + 4 >> 2] = tempI64[1];
        break;
      case "float":
        HEAPF32[ptr >> 2] = value;
        break;
      case "double":
        HEAPF64[ptr >> 3] = value;
        break;
      default:
        abort("invalid type for setValue: " + type2);
    }
  }
  function getValue(ptr, type2, noSafe) {
    type2 = type2 || "i8";
    if (type2.charAt(type2.length - 1) === "*")
      type2 = "i32";
    switch (type2) {
      case "i1":
        return HEAP8[ptr >> 0];
      case "i8":
        return HEAP8[ptr >> 0];
      case "i16":
        return HEAP16[ptr >> 1];
      case "i32":
        return HEAP32[ptr >> 2];
      case "i64":
        return HEAP32[ptr >> 2];
      case "float":
        return HEAPF32[ptr >> 2];
      case "double":
        return HEAPF64[ptr >> 3];
      default:
        abort("invalid type for setValue: " + type2);
    }
    return null;
  }
  var ALLOC_NORMAL = 0;
  var ALLOC_STATIC = 2;
  var ALLOC_NONE = 4;
  function allocate(slab, types, allocator, ptr) {
    var zeroinit, size;
    if (typeof slab === "number") {
      zeroinit = true;
      size = slab;
    } else {
      zeroinit = false;
      size = slab.length;
    }
    var singleType = typeof types === "string" ? types : null;
    var ret;
    if (allocator == ALLOC_NONE) {
      ret = ptr;
    } else {
      ret = [typeof _malloc === "function" ? _malloc : Runtime.staticAlloc, Runtime.stackAlloc, Runtime.staticAlloc, Runtime.dynamicAlloc][allocator === void 0 ? ALLOC_STATIC : allocator](Math.max(size, singleType ? 1 : types.length));
    }
    if (zeroinit) {
      var ptr = ret, stop;
      assert((ret & 3) == 0);
      stop = ret + (size & ~3);
      for (; ptr < stop; ptr += 4) {
        HEAP32[ptr >> 2] = 0;
      }
      stop = ret + size;
      while (ptr < stop) {
        HEAP8[ptr++ >> 0] = 0;
      }
      return ret;
    }
    if (singleType === "i8") {
      if (slab.subarray || slab.slice) {
        HEAPU8.set(slab, ret);
      } else {
        HEAPU8.set(new Uint8Array(slab), ret);
      }
      return ret;
    }
    var i2 = 0, type2, typeSize, previousType;
    while (i2 < size) {
      var curr = slab[i2];
      if (typeof curr === "function") {
        curr = Runtime.getFunctionIndex(curr);
      }
      type2 = singleType || types[i2];
      if (type2 === 0) {
        i2++;
        continue;
      }
      if (type2 == "i64")
        type2 = "i32";
      setValue(ret + i2, curr, type2);
      if (previousType !== type2) {
        typeSize = Runtime.getNativeTypeSize(type2);
        previousType = type2;
      }
      i2 += typeSize;
    }
    return ret;
  }
  function Pointer_stringify(ptr, length) {
    if (length === 0 || !ptr)
      return "";
    var hasUtf = 0;
    var t;
    var i2 = 0;
    while (1) {
      t = HEAPU8[ptr + i2 >> 0];
      hasUtf |= t;
      if (t == 0 && !length)
        break;
      i2++;
      if (length && i2 == length)
        break;
    }
    if (!length)
      length = i2;
    var ret = "";
    if (hasUtf < 128) {
      var MAX_CHUNK = 1024;
      var curr;
      while (length > 0) {
        curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
        ret = ret ? ret + curr : curr;
        ptr += MAX_CHUNK;
        length -= MAX_CHUNK;
      }
      return ret;
    }
    return Module["UTF8ToString"](ptr);
  }
  typeof TextDecoder !== "undefined" ? new TextDecoder("utf8") : void 0;
  function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
    if (!(maxBytesToWrite > 0))
      return 0;
    var startIdx = outIdx;
    var endIdx = outIdx + maxBytesToWrite - 1;
    for (var i2 = 0; i2 < str.length; ++i2) {
      var u = str.charCodeAt(i2);
      if (u >= 55296 && u <= 57343)
        u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i2) & 1023;
      if (u <= 127) {
        if (outIdx >= endIdx)
          break;
        outU8Array[outIdx++] = u;
      } else if (u <= 2047) {
        if (outIdx + 1 >= endIdx)
          break;
        outU8Array[outIdx++] = 192 | u >> 6;
        outU8Array[outIdx++] = 128 | u & 63;
      } else if (u <= 65535) {
        if (outIdx + 2 >= endIdx)
          break;
        outU8Array[outIdx++] = 224 | u >> 12;
        outU8Array[outIdx++] = 128 | u >> 6 & 63;
        outU8Array[outIdx++] = 128 | u & 63;
      } else if (u <= 2097151) {
        if (outIdx + 3 >= endIdx)
          break;
        outU8Array[outIdx++] = 240 | u >> 18;
        outU8Array[outIdx++] = 128 | u >> 12 & 63;
        outU8Array[outIdx++] = 128 | u >> 6 & 63;
        outU8Array[outIdx++] = 128 | u & 63;
      } else if (u <= 67108863) {
        if (outIdx + 4 >= endIdx)
          break;
        outU8Array[outIdx++] = 248 | u >> 24;
        outU8Array[outIdx++] = 128 | u >> 18 & 63;
        outU8Array[outIdx++] = 128 | u >> 12 & 63;
        outU8Array[outIdx++] = 128 | u >> 6 & 63;
        outU8Array[outIdx++] = 128 | u & 63;
      } else {
        if (outIdx + 5 >= endIdx)
          break;
        outU8Array[outIdx++] = 252 | u >> 30;
        outU8Array[outIdx++] = 128 | u >> 24 & 63;
        outU8Array[outIdx++] = 128 | u >> 18 & 63;
        outU8Array[outIdx++] = 128 | u >> 12 & 63;
        outU8Array[outIdx++] = 128 | u >> 6 & 63;
        outU8Array[outIdx++] = 128 | u & 63;
      }
    }
    outU8Array[outIdx] = 0;
    return outIdx - startIdx;
  }
  function stringToUTF8(str, outPtr, maxBytesToWrite) {
    return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
  }
  function lengthBytesUTF8(str) {
    var len = 0;
    for (var i2 = 0; i2 < str.length; ++i2) {
      var u = str.charCodeAt(i2);
      if (u >= 55296 && u <= 57343)
        u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i2) & 1023;
      if (u <= 127) {
        ++len;
      } else if (u <= 2047) {
        len += 2;
      } else if (u <= 65535) {
        len += 3;
      } else if (u <= 2097151) {
        len += 4;
      } else if (u <= 67108863) {
        len += 5;
      } else {
        len += 6;
      }
    }
    return len;
  }
  typeof TextDecoder !== "undefined" ? new TextDecoder("utf-16le") : void 0;
  function demangle(func2) {
    var __cxa_demangle_func = Module["___cxa_demangle"] || Module["__cxa_demangle"];
    if (__cxa_demangle_func) {
      try {
        var s = func2.substr(1);
        var len = lengthBytesUTF8(s) + 1;
        var buf = _malloc(len);
        stringToUTF8(s, buf, len);
        var status = _malloc(4);
        var ret = __cxa_demangle_func(buf, 0, 0, status);
        if (getValue(status, "i32") === 0 && ret) {
          return Pointer_stringify(ret);
        }
      } catch (e) {
      } finally {
        if (buf)
          _free(buf);
        if (status)
          _free(status);
        if (ret)
          _free(ret);
      }
      return func2;
    }
    Runtime.warnOnce("warning: build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling");
    return func2;
  }
  function demangleAll(text) {
    var regex = /__Z[\w\d_]+/g;
    return text.replace(regex, function(x) {
      var y = demangle(x);
      return x === y ? x : x + " [" + y + "]";
    });
  }
  function jsStackTrace() {
    var err = new Error();
    if (!err.stack) {
      try {
        throw new Error(0);
      } catch (e) {
        err = e;
      }
      if (!err.stack) {
        return "(no stack trace available)";
      }
    }
    return err.stack.toString();
  }
  function stackTrace() {
    var js = jsStackTrace();
    if (Module["extraStackTrace"])
      js += "\n" + Module["extraStackTrace"]();
    return demangleAll(js);
  }
  var WASM_PAGE_SIZE = 65536;
  var ASMJS_PAGE_SIZE = 16777216;
  function alignUp(x, multiple) {
    if (x % multiple > 0) {
      x += multiple - x % multiple;
    }
    return x;
  }
  var HEAP;
  var buffer;
  var HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
  function updateGlobalBuffer(buf) {
    Module["buffer"] = buffer = buf;
  }
  function updateGlobalBufferViews() {
    Module["HEAP8"] = HEAP8 = new Int8Array(buffer);
    Module["HEAP16"] = HEAP16 = new Int16Array(buffer);
    Module["HEAP32"] = HEAP32 = new Int32Array(buffer);
    Module["HEAPU8"] = HEAPU8 = new Uint8Array(buffer);
    Module["HEAPU16"] = HEAPU16 = new Uint16Array(buffer);
    Module["HEAPU32"] = HEAPU32 = new Uint32Array(buffer);
    Module["HEAPF32"] = HEAPF32 = new Float32Array(buffer);
    Module["HEAPF64"] = HEAPF64 = new Float64Array(buffer);
  }
  var STATIC_BASE, STATICTOP;
  var STACK_BASE, STACKTOP, STACK_MAX;
  var DYNAMIC_BASE, DYNAMICTOP_PTR;
  STATIC_BASE = STATICTOP = STACK_BASE = STACKTOP = STACK_MAX = DYNAMIC_BASE = DYNAMICTOP_PTR = 0;
  function abortOnCannotGrowMemory() {
    abort("Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value " + TOTAL_MEMORY + ", (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which adjusts the size at runtime but prevents some optimizations, (3) set Module.TOTAL_MEMORY to a higher value before the program runs, or if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 ");
  }
  function enlargeMemory() {
    abortOnCannotGrowMemory();
  }
  var TOTAL_STACK = Module["TOTAL_STACK"] || 5242880;
  var TOTAL_MEMORY = Module["TOTAL_MEMORY"] || 16777216;
  if (TOTAL_MEMORY < TOTAL_STACK)
    Module.printErr("TOTAL_MEMORY should be larger than TOTAL_STACK, was " + TOTAL_MEMORY + "! (TOTAL_STACK=" + TOTAL_STACK + ")");
  if (Module["buffer"]) {
    buffer = Module["buffer"];
  } else {
    if (typeof WebAssembly === "object" && typeof WebAssembly.Memory === "function") {
      Module["wasmMemory"] = new WebAssembly.Memory({
        initial: TOTAL_MEMORY / WASM_PAGE_SIZE,
        maximum: TOTAL_MEMORY / WASM_PAGE_SIZE
      });
      buffer = Module["wasmMemory"].buffer;
    } else {
      buffer = new ArrayBuffer(TOTAL_MEMORY);
    }
  }
  updateGlobalBufferViews();
  function getTotalMemory() {
    return TOTAL_MEMORY;
  }
  HEAP32[0] = 1668509029;
  HEAP16[1] = 25459;
  if (HEAPU8[2] !== 115 || HEAPU8[3] !== 99)
    throw "Runtime error: expected the system to be little-endian!";
  Module["HEAP"] = HEAP;
  Module["buffer"] = buffer;
  Module["HEAP8"] = HEAP8;
  Module["HEAP16"] = HEAP16;
  Module["HEAP32"] = HEAP32;
  Module["HEAPU8"] = HEAPU8;
  Module["HEAPU16"] = HEAPU16;
  Module["HEAPU32"] = HEAPU32;
  Module["HEAPF32"] = HEAPF32;
  Module["HEAPF64"] = HEAPF64;
  function callRuntimeCallbacks(callbacks) {
    while (callbacks.length > 0) {
      var callback = callbacks.shift();
      if (typeof callback == "function") {
        callback();
        continue;
      }
      var func2 = callback.func;
      if (typeof func2 === "number") {
        if (callback.arg === void 0) {
          Module["dynCall_v"](func2);
        } else {
          Module["dynCall_vi"](func2, callback.arg);
        }
      } else {
        func2(callback.arg === void 0 ? null : callback.arg);
      }
    }
  }
  var __ATPRERUN__ = [];
  var __ATINIT__ = [];
  var __ATMAIN__ = [];
  var __ATEXIT__ = [];
  var __ATPOSTRUN__ = [];
  var runtimeInitialized = false;
  function preRun() {
    if (Module["preRun"]) {
      if (typeof Module["preRun"] == "function")
        Module["preRun"] = [Module["preRun"]];
      while (Module["preRun"].length) {
        addOnPreRun(Module["preRun"].shift());
      }
    }
    callRuntimeCallbacks(__ATPRERUN__);
  }
  function ensureInitRuntime() {
    if (runtimeInitialized)
      return;
    runtimeInitialized = true;
    callRuntimeCallbacks(__ATINIT__);
  }
  function preMain() {
    callRuntimeCallbacks(__ATMAIN__);
  }
  function exitRuntime() {
    callRuntimeCallbacks(__ATEXIT__);
  }
  function postRun() {
    if (Module["postRun"]) {
      if (typeof Module["postRun"] == "function")
        Module["postRun"] = [Module["postRun"]];
      while (Module["postRun"].length) {
        addOnPostRun(Module["postRun"].shift());
      }
    }
    callRuntimeCallbacks(__ATPOSTRUN__);
  }
  function addOnPreRun(cb) {
    __ATPRERUN__.unshift(cb);
  }
  function addOnPostRun(cb) {
    __ATPOSTRUN__.unshift(cb);
  }
  function intArrayFromString(stringy, dontAddNull, length) {
    var len = length > 0 ? length : lengthBytesUTF8(stringy) + 1;
    var u8array = new Array(len);
    var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
    if (dontAddNull)
      u8array.length = numBytesWritten;
    return u8array;
  }
  if (!Math["imul"] || Math["imul"](4294967295, 5) !== -5)
    Math["imul"] = function imul(a, b) {
      var ah = a >>> 16;
      var al = a & 65535;
      var bh = b >>> 16;
      var bl = b & 65535;
      return al * bl + (ah * bl + al * bh << 16) | 0;
    };
  Math.imul = Math["imul"];
  if (!Math["fround"]) {
    var froundBuffer = new Float32Array(1);
    Math["fround"] = function(x) {
      froundBuffer[0] = x;
      return froundBuffer[0];
    };
  }
  Math.fround = Math["fround"];
  if (!Math["clz32"])
    Math["clz32"] = function(x) {
      x = x >>> 0;
      for (var i2 = 0; i2 < 32; i2++) {
        if (x & 1 << 31 - i2)
          return i2;
      }
      return 32;
    };
  Math.clz32 = Math["clz32"];
  if (!Math["trunc"])
    Math["trunc"] = function(x) {
      return x < 0 ? Math.ceil(x) : Math.floor(x);
    };
  Math.trunc = Math["trunc"];
  var Math_abs = Math.abs;
  var Math_ceil = Math.ceil;
  var Math_floor = Math.floor;
  var Math_min = Math.min;
  var runDependencies = 0;
  var dependenciesFulfilled = null;
  function addRunDependency(id) {
    runDependencies++;
    if (Module["monitorRunDependencies"]) {
      Module["monitorRunDependencies"](runDependencies);
    }
  }
  function removeRunDependency(id) {
    runDependencies--;
    if (Module["monitorRunDependencies"]) {
      Module["monitorRunDependencies"](runDependencies);
    }
    if (runDependencies == 0) {
      if (dependenciesFulfilled) {
        var callback = dependenciesFulfilled;
        dependenciesFulfilled = null;
        callback();
      }
    }
  }
  Module["preloadedImages"] = {};
  Module["preloadedAudios"] = {};
  var memoryInitializer = null;
  function integrateWasmJS(Module) {
    var method = Module["wasmJSMethod"] || "native-wasm";
    Module["wasmJSMethod"] = method;
    var wasmTextFile = Module["wasmTextFile"] || "worker-wasm.wast";
    var wasmBinaryFile = Module["wasmBinaryFile"] || "worker-wasm.wasm";
    var asmjsCodeFile = Module["asmjsCodeFile"] || "worker-wasm.temp.asm.js";
    var wasmPageSize = 64 * 1024;
    var asm2wasmImports = {
      "f64-rem": function(x, y) {
        return x % y;
      },
      "f64-to-int": function(x) {
        return x | 0;
      },
      "i32s-div": function(x, y) {
        return (x | 0) / (y | 0) | 0;
      },
      "i32u-div": function(x, y) {
        return (x >>> 0) / (y >>> 0) >>> 0;
      },
      "i32s-rem": function(x, y) {
        return (x | 0) % (y | 0) | 0;
      },
      "i32u-rem": function(x, y) {
        return (x >>> 0) % (y >>> 0) >>> 0;
      },
      debugger: function() {
        debugger;
      }
    };
    var info = {
      global: null,
      env: null,
      asm2wasm: asm2wasmImports,
      parent: Module
    };
    var exports = null;
    function lookupImport(mod, base) {
      var lookup = info;
      if (mod.indexOf(".") < 0) {
        lookup = (lookup || {})[mod];
      } else {
        var parts = mod.split(".");
        lookup = (lookup || {})[parts[0]];
        lookup = (lookup || {})[parts[1]];
      }
      if (base) {
        lookup = (lookup || {})[base];
      }
      if (lookup === void 0) {
        abort("bad lookupImport to (" + mod + ")." + base);
      }
      return lookup;
    }
    function mergeMemory(newBuffer) {
      var oldBuffer = Module["buffer"];
      if (newBuffer.byteLength < oldBuffer.byteLength) {
        Module["printErr"]("the new buffer in mergeMemory is smaller than the previous one. in native wasm, we should grow memory here");
      }
      var oldView = new Int8Array(oldBuffer);
      var newView = new Int8Array(newBuffer);
      if (!memoryInitializer) {
        oldView.set(newView.subarray(Module["STATIC_BASE"], Module["STATIC_BASE"] + Module["STATIC_BUMP"]), Module["STATIC_BASE"]);
      }
      newView.set(oldView);
      updateGlobalBuffer(newBuffer);
      updateGlobalBufferViews();
    }
    function fixImports(imports) {
      return imports;
    }
    function getBinaryModule() {
      if (Module["wasmModule"]) {
        return Module["wasmModule"];
      }
      var binary;
      if (Module["wasmBinary"]) {
        binary = Module["wasmBinary"];
        binary = new Uint8Array(binary);
      } else if (Module["readBinary"]) {
        binary = Module["readBinary"](wasmBinaryFile);
      } else {
        throw "on the web, we need the wasm binary to be preloaded and set on Module['wasmBinary']. emcc.py will do that for you when generating HTML (but not JS)";
      }
      return WebAssembly.compile(binary);
    }
    function getBinaryModulePromise() {
      if (!Module["wasmModule"] && !Module["wasmBinary"] && typeof fetch === "function") {
        return fetch(wasmBinaryFile).then(function(response) {
          return response.arrayBuffer().then(function(buf) {
            return WebAssembly.compile(buf);
          });
        });
      }
      return new Promise(function(resolve, reject) {
        resolve(getBinaryModule());
      });
    }
    function doJustAsm(global, env, providedBuffer) {
      if (typeof Module["asm"] !== "function" || Module["asm"] === methodHandler) {
        if (!Module["asmPreload"]) {
          eval(Module["read"](asmjsCodeFile));
        } else {
          Module["asm"] = Module["asmPreload"];
        }
      }
      if (typeof Module["asm"] !== "function") {
        Module["printErr"]("asm evalling did not set the module properly");
        return false;
      }
      return Module["asm"](global, env, providedBuffer);
    }
    function doNativeWasm(global2, env2, providedBuffer2) {
      if (typeof WebAssembly !== "object") {
        Module["printErr"]("no native wasm support detected");
        return false;
      }
      if (!(Module["wasmMemory"] instanceof WebAssembly.Memory)) {
        Module["printErr"]("no native wasm Memory in use");
        return false;
      }
      env2["memory"] = Module["wasmMemory"];
      info["global"] = {
        NaN: NaN,
        Infinity: Infinity
      };
      info["global.Math"] = global2.Math;
      info["env"] = env2;
      function receiveInstance(instance) {
        exports = instance.exports;
        if (exports.memory)
          mergeMemory(exports.memory);
        Module["asm"] = exports;
        Module["usingWasm"] = true;
        removeRunDependency();
      }
      addRunDependency();
      if (Module["instantiateWasm"]) {
        try {
          return Module["instantiateWasm"](info, receiveInstance);
        } catch (e) {
          Module["printErr"]("Module.instantiateWasm callback failed with error: " + e);
          return false;
        }
      }
      Module["printErr"]("asynchronously preparing wasm");
      getBinaryModulePromise().then(function(mod) {
        return WebAssembly.instantiate(mod, info);
      }).then(function(instance) {
        receiveInstance(instance);
      }).catch(function(reason) {
        Module["printErr"]("failed to asynchronously prepare wasm: " + reason);
        Module["quit"](1, reason);
      });
      return {};
    }
    function doWasmPolyfill(global2, env2, providedBuffer2, method2) {
      if (typeof WasmJS !== "function") {
        Module["printErr"]("WasmJS not detected - polyfill not bundled?");
        return false;
      }
      var wasmJS = WasmJS({});
      wasmJS["outside"] = Module;
      wasmJS["info"] = info;
      wasmJS["lookupImport"] = lookupImport;
      assert(providedBuffer2 === Module["buffer"]);
      info.global = global2;
      info.env = env2;
      assert(providedBuffer2 === Module["buffer"]);
      env2["memory"] = providedBuffer2;
      assert(env2["memory"] instanceof ArrayBuffer);
      wasmJS["providedTotalMemory"] = Module["buffer"].byteLength;
      var code;
      if (method2 === "interpret-binary") {
        code = getBinary();
      } else {
        code = Module["read"](method2 == "interpret-asm2wasm" ? asmjsCodeFile : wasmTextFile);
      }
      var temp;
      if (method2 == "interpret-asm2wasm") {
        temp = wasmJS["_malloc"](code.length + 1);
        wasmJS["writeAsciiToMemory"](code, temp);
        wasmJS["_load_asm2wasm"](temp);
      } else if (method2 === "interpret-s-expr") {
        temp = wasmJS["_malloc"](code.length + 1);
        wasmJS["writeAsciiToMemory"](code, temp);
        wasmJS["_load_s_expr2wasm"](temp);
      } else if (method2 === "interpret-binary") {
        temp = wasmJS["_malloc"](code.length);
        wasmJS["HEAPU8"].set(code, temp);
        wasmJS["_load_binary2wasm"](temp, code.length);
      } else {
        throw "what? " + method2;
      }
      wasmJS["_free"](temp);
      wasmJS["_instantiate"](temp);
      if (Module["newBuffer"]) {
        mergeMemory(Module["newBuffer"]);
        Module["newBuffer"] = null;
      }
      exports = wasmJS["asmExports"];
      return exports;
    }
    Module["asmPreload"] = Module["asm"];
    Module["reallocBuffer"] = function(size) {
      var PAGE_MULTIPLE = Module["usingWasm"] ? WASM_PAGE_SIZE : ASMJS_PAGE_SIZE;
      size = alignUp(size, PAGE_MULTIPLE);
      var old = Module["buffer"];
      var oldSize = old.byteLength;
      if (Module["usingWasm"]) {
        try {
          var result = Module["wasmMemory"].grow((size - oldSize) / wasmPageSize);
          if (result !== (-1 | 0)) {
            return Module["buffer"] = Module["wasmMemory"].buffer;
          } else {
            return null;
          }
        } catch (e) {
          return null;
        }
      } else {
        exports["__growWasmMemory"]((size - oldSize) / wasmPageSize);
        return Module["buffer"] !== old ? Module["buffer"] : null;
      }
    };
    Module["asm"] = function(global2, env2, providedBuffer2) {
      global2 = fixImports(global2);
      env2 = fixImports(env2);
      if (!env2["table"]) {
        var TABLE_SIZE = Module["wasmTableSize"];
        if (TABLE_SIZE === void 0)
          TABLE_SIZE = 1024;
        var MAX_TABLE_SIZE = Module["wasmMaxTableSize"];
        if (typeof WebAssembly === "object" && typeof WebAssembly.Table === "function") {
          if (MAX_TABLE_SIZE !== void 0) {
            env2["table"] = new WebAssembly.Table({
              initial: TABLE_SIZE,
              maximum: MAX_TABLE_SIZE,
              element: "anyfunc"
            });
          } else {
            env2["table"] = new WebAssembly.Table({
              initial: TABLE_SIZE,
              element: "anyfunc"
            });
          }
        } else {
          env2["table"] = new Array(TABLE_SIZE);
        }
        Module["wasmTable"] = env2["table"];
      }
      if (!env2["memoryBase"]) {
        env2["memoryBase"] = Module["STATIC_BASE"];
      }
      if (!env2["tableBase"]) {
        env2["tableBase"] = 0;
      }
      var exports2;
      var methods = method.split(",");
      for (var i2 = 0; i2 < methods.length; i2++) {
        var curr = methods[i2];
        Module["printErr"]("trying binaryen method: " + curr);
        if (curr === "native-wasm") {
          if (exports2 = doNativeWasm(global2, env2))
            break;
        } else if (curr === "asmjs") {
          if (exports2 = doJustAsm(global2, env2, providedBuffer2))
            break;
        } else if (curr === "interpret-asm2wasm" || curr === "interpret-s-expr" || curr === "interpret-binary") {
          if (exports2 = doWasmPolyfill(global2, env2, providedBuffer2, curr))
            break;
        } else {
          throw "bad method: " + curr;
        }
      }
      if (!exports2)
        throw "no binaryen method succeeded. consider enabling more options, like interpreting, if you want that: https://github.com/kripken/emscripten/wiki/WebAssembly#binaryen-methods";
      Module["printErr"]("binaryen method succeeded.");
      return exports2;
    };
    var methodHandler = Module["asm"];
  }
  integrateWasmJS(Module);
  STATIC_BASE = 1024;
  STATICTOP = STATIC_BASE + 42112;
  __ATINIT__.push();
  memoryInitializer = Module["wasmJSMethod"].indexOf("asmjs") >= 0 || Module["wasmJSMethod"].indexOf("interpret-asm2wasm") >= 0 ? "worker-wasm.js.mem" : null;
  var STATIC_BUMP = 42112;
  Module["STATIC_BASE"] = STATIC_BASE;
  Module["STATIC_BUMP"] = STATIC_BUMP;
  var tempDoublePtr = STATICTOP;
  STATICTOP += 16;
  function ___setErrNo(value) {
    if (Module["___errno_location"])
      HEAP32[Module["___errno_location"]() >> 2] = value;
    return value;
  }
  Module["_sbrk"] = _sbrk;
  function _abort() {
    Module["abort"]();
  }
  Module["_llvm_bswap_i32"] = _llvm_bswap_i32;
  Module["_llvm_bswap_i16"] = _llvm_bswap_i16;
  function _emscripten_memcpy_big(dest, src, num) {
    HEAPU8.set(HEAPU8.subarray(src, src + num), dest);
    return dest;
  }
  Module["_memcpy"] = _memcpy;
  DYNAMICTOP_PTR = allocate(1, "i32", ALLOC_STATIC);
  STACK_BASE = STACKTOP = Runtime.alignMemory(STATICTOP);
  STACK_MAX = STACK_BASE + TOTAL_STACK;
  DYNAMIC_BASE = Runtime.alignMemory(STACK_MAX);
  HEAP32[DYNAMICTOP_PTR >> 2] = DYNAMIC_BASE;
  Module["wasmTableSize"] = 6;
  Module["wasmMaxTableSize"] = 6;
  function invoke_iiii(index, a1, a2, a3) {
    try {
      return Module["dynCall_iiii"](index, a1, a2, a3);
    } catch (e) {
      if (typeof e !== "number" && e !== "longjmp")
        throw e;
      Module["setThrew"](1, 0);
    }
  }
  function invoke_vii(index, a1, a2) {
    try {
      Module["dynCall_vii"](index, a1, a2);
    } catch (e) {
      if (typeof e !== "number" && e !== "longjmp")
        throw e;
      Module["setThrew"](1, 0);
    }
  }
  function invoke_iii(index, a1, a2) {
    try {
      return Module["dynCall_iii"](index, a1, a2);
    } catch (e) {
      if (typeof e !== "number" && e !== "longjmp")
        throw e;
      Module["setThrew"](1, 0);
    }
  }
  Module.asmGlobalArg = {
    Math,
    Int8Array,
    Int16Array,
    Int32Array,
    Uint8Array,
    Uint16Array,
    Uint32Array,
    Float32Array,
    Float64Array,
    NaN: NaN,
    Infinity: Infinity
  };
  Module.asmLibraryArg = {
    abort,
    assert,
    enlargeMemory,
    getTotalMemory,
    abortOnCannotGrowMemory,
    invoke_iiii,
    invoke_vii,
    invoke_iii,
    _abort,
    _emscripten_memcpy_big,
    ___setErrNo,
    DYNAMICTOP_PTR,
    tempDoublePtr,
    ABORT,
    STACKTOP,
    STACK_MAX
  };
  var asm = Module["asm"](Module.asmGlobalArg, Module.asmLibraryArg, buffer);
  Module["asm"] = asm;
  Module["_nimiq_argon2_verify"] = function() {
    return Module["asm"]["_nimiq_argon2_verify"].apply(null, arguments);
  };
  Module["stackSave"] = function() {
    return Module["asm"]["stackSave"].apply(null, arguments);
  };
  Module["getTempRet0"] = function() {
    return Module["asm"]["getTempRet0"].apply(null, arguments);
  };
  Module["_nimiq_kdf_legacy"] = function() {
    return Module["asm"]["_nimiq_kdf_legacy"].apply(null, arguments);
  };
  Module["_ed25519_sign"] = function() {
    return Module["asm"]["_ed25519_sign"].apply(null, arguments);
  };
  Module["_nimiq_blake2"] = function() {
    return Module["asm"]["_nimiq_blake2"].apply(null, arguments);
  };
  Module["_nimiq_argon2_no_wipe"] = function() {
    return Module["asm"]["_nimiq_argon2_no_wipe"].apply(null, arguments);
  };
  Module["_ed25519_delinearized_partial_sign"] = function() {
    return Module["asm"]["_ed25519_delinearized_partial_sign"].apply(null, arguments);
  };
  Module["_nimiq_sha512"] = function() {
    return Module["asm"]["_nimiq_sha512"].apply(null, arguments);
  };
  var _sbrk = Module["_sbrk"] = function() {
    return Module["asm"]["_sbrk"].apply(null, arguments);
  };
  Module["_ed25519_derive_delinearized_private_key"] = function() {
    return Module["asm"]["_ed25519_derive_delinearized_private_key"].apply(null, arguments);
  };
  Module["stackAlloc"] = function() {
    return Module["asm"]["stackAlloc"].apply(null, arguments);
  };
  Module["_ed25519_create_commitment"] = function() {
    return Module["asm"]["_ed25519_create_commitment"].apply(null, arguments);
  };
  Module["_nimiq_argon2_target"] = function() {
    return Module["asm"]["_nimiq_argon2_target"].apply(null, arguments);
  };
  Module["_nimiq_argon2"] = function() {
    return Module["asm"]["_nimiq_argon2"].apply(null, arguments);
  };
  Module["_ed25519_delinearize_public_key"] = function() {
    return Module["asm"]["_ed25519_delinearize_public_key"].apply(null, arguments);
  };
  Module["_ed25519_add_scalars"] = function() {
    return Module["asm"]["_ed25519_add_scalars"].apply(null, arguments);
  };
  Module["_ed25519_public_key_derive"] = function() {
    return Module["asm"]["_ed25519_public_key_derive"].apply(null, arguments);
  };
  Module["setTempRet0"] = function() {
    return Module["asm"]["setTempRet0"].apply(null, arguments);
  };
  Module["_nimiq_kdf"] = function() {
    return Module["asm"]["_nimiq_kdf"].apply(null, arguments);
  };
  var _llvm_bswap_i16 = Module["_llvm_bswap_i16"] = function() {
    return Module["asm"]["_llvm_bswap_i16"].apply(null, arguments);
  };
  Module["_emscripten_get_global_libc"] = function() {
    return Module["asm"]["_emscripten_get_global_libc"].apply(null, arguments);
  };
  Module["_ed25519_verify"] = function() {
    return Module["asm"]["_ed25519_verify"].apply(null, arguments);
  };
  Module["_get_static_memory_size"] = function() {
    return Module["asm"]["_get_static_memory_size"].apply(null, arguments);
  };
  var _llvm_bswap_i32 = Module["_llvm_bswap_i32"] = function() {
    return Module["asm"]["_llvm_bswap_i32"].apply(null, arguments);
  };
  var _free = Module["_free"] = function() {
    return Module["asm"]["_free"].apply(null, arguments);
  };
  Module["runPostSets"] = function() {
    return Module["asm"]["runPostSets"].apply(null, arguments);
  };
  Module["setThrew"] = function() {
    return Module["asm"]["setThrew"].apply(null, arguments);
  };
  Module["establishStackSpace"] = function() {
    return Module["asm"]["establishStackSpace"].apply(null, arguments);
  };
  Module["_get_static_memory_start"] = function() {
    return Module["asm"]["_get_static_memory_start"].apply(null, arguments);
  };
  Module["_nimiq_sha256"] = function() {
    return Module["asm"]["_nimiq_sha256"].apply(null, arguments);
  };
  Module["stackRestore"] = function() {
    return Module["asm"]["stackRestore"].apply(null, arguments);
  };
  Module["_ed25519_hash_public_keys"] = function() {
    return Module["asm"]["_ed25519_hash_public_keys"].apply(null, arguments);
  };
  var _malloc = Module["_malloc"] = function() {
    return Module["asm"]["_malloc"].apply(null, arguments);
  };
  var _memcpy = Module["_memcpy"] = function() {
    return Module["asm"]["_memcpy"].apply(null, arguments);
  };
  Module["_ed25519_aggregate_commitments"] = function() {
    return Module["asm"]["_ed25519_aggregate_commitments"].apply(null, arguments);
  };
  Module["_ed25519_aggregate_delinearized_public_keys"] = function() {
    return Module["asm"]["_ed25519_aggregate_delinearized_public_keys"].apply(null, arguments);
  };
  Module["dynCall_iiii"] = function() {
    return Module["asm"]["dynCall_iiii"].apply(null, arguments);
  };
  Module["dynCall_vii"] = function() {
    return Module["asm"]["dynCall_vii"].apply(null, arguments);
  };
  Module["dynCall_iii"] = function() {
    return Module["asm"]["dynCall_iii"].apply(null, arguments);
  };
  Runtime.stackAlloc = Module["stackAlloc"];
  Runtime.stackSave = Module["stackSave"];
  Runtime.stackRestore = Module["stackRestore"];
  Runtime.establishStackSpace = Module["establishStackSpace"];
  Runtime.setTempRet0 = Module["setTempRet0"];
  Runtime.getTempRet0 = Module["getTempRet0"];
  Module["asm"] = asm;
  if (memoryInitializer) {
    if (typeof Module["locateFile"] === "function") {
      memoryInitializer = Module["locateFile"](memoryInitializer);
    } else if (Module["memoryInitializerPrefixURL"]) {
      memoryInitializer = Module["memoryInitializerPrefixURL"] + memoryInitializer;
    }
    if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
      var data = Module["readBinary"](memoryInitializer);
      HEAPU8.set(data, Runtime.GLOBAL_BASE);
    } else {
      let doBrowserLoad = function() {
        Module["readAsync"](memoryInitializer, applyMemoryInitializer, function() {
          throw "could not load memory initializer " + memoryInitializer;
        });
      };
      addRunDependency();
      var applyMemoryInitializer = function(data2) {
        if (data2.byteLength)
          data2 = new Uint8Array(data2);
        HEAPU8.set(data2, Runtime.GLOBAL_BASE);
        if (Module["memoryInitializerRequest"])
          delete Module["memoryInitializerRequest"].response;
        removeRunDependency();
      };
      if (Module["memoryInitializerRequest"]) {
        let useRequest = function() {
          var request = Module["memoryInitializerRequest"];
          if (request.status !== 200 && request.status !== 0) {
            console.warn("a problem seems to have happened with Module.memoryInitializerRequest, status: " + request.status + ", retrying " + memoryInitializer);
            doBrowserLoad();
            return;
          }
          applyMemoryInitializer(request.response);
        };
        if (Module["memoryInitializerRequest"].response) {
          setTimeout(useRequest, 0);
        } else {
          Module["memoryInitializerRequest"].addEventListener("load", useRequest);
        }
      } else {
        doBrowserLoad();
      }
    }
  }
  function ExitStatus(status) {
    this.name = "ExitStatus";
    this.message = "Program terminated with exit(" + status + ")";
    this.status = status;
  }
  ExitStatus.prototype = new Error();
  ExitStatus.prototype.constructor = ExitStatus;
  var initialStackTop;
  dependenciesFulfilled = function runCaller() {
    if (!Module["calledRun"])
      run();
    if (!Module["calledRun"])
      dependenciesFulfilled = runCaller;
  };
  Module["callMain"] = Module.callMain = function callMain(args) {
    args = args || [];
    ensureInitRuntime();
    var argc = args.length + 1;
    function pad() {
      for (var i3 = 0; i3 < 4 - 1; i3++) {
        argv.push(0);
      }
    }
    var argv = [allocate(intArrayFromString(Module["thisProgram"]), "i8", ALLOC_NORMAL)];
    pad();
    for (var i2 = 0; i2 < argc - 1; i2 = i2 + 1) {
      argv.push(allocate(intArrayFromString(args[i2]), "i8", ALLOC_NORMAL));
      pad();
    }
    argv.push(0);
    argv = allocate(argv, "i32", ALLOC_NORMAL);
    try {
      var ret = Module["_main"](argc, argv, 0);
      exit(ret, true);
    } catch (e) {
      if (e instanceof ExitStatus) {
        return;
      } else if (e == "SimulateInfiniteLoop") {
        Module["noExitRuntime"] = true;
        return;
      } else {
        var toLog = e;
        if (e && typeof e === "object" && e.stack) {
          toLog = [e, e.stack];
        }
        Module.printErr("exception thrown: " + toLog);
        Module["quit"](1, e);
      }
    } finally {
    }
  };
  function run(args) {
    args = args || Module["arguments"];
    if (runDependencies > 0) {
      return;
    }
    preRun();
    if (runDependencies > 0)
      return;
    if (Module["calledRun"])
      return;
    function doRun() {
      if (Module["calledRun"])
        return;
      Module["calledRun"] = true;
      if (ABORT)
        return;
      ensureInitRuntime();
      preMain();
      if (Module["onRuntimeInitialized"])
        Module["onRuntimeInitialized"]();
      if (Module["_main"] && shouldRunNow)
        Module["callMain"](args);
      postRun();
    }
    if (Module["setStatus"]) {
      Module["setStatus"]("Running...");
      setTimeout(function() {
        setTimeout(function() {
          Module["setStatus"]("");
        }, 1);
        doRun();
      }, 1);
    } else {
      doRun();
    }
  }
  Module["run"] = Module.run = run;
  function exit(status, implicit) {
    if (implicit && Module["noExitRuntime"]) {
      return;
    }
    if (Module["noExitRuntime"]) ; else {
      ABORT = true;
      STACKTOP = initialStackTop;
      exitRuntime();
      if (Module["onExit"])
        Module["onExit"](status);
    }
    if (ENVIRONMENT_IS_NODE) {
      process["exit"](status);
    }
    Module["quit"](status, new ExitStatus(status));
  }
  Module["exit"] = Module.exit = exit;
  var abortDecorators = [];
  function abort(what) {
    if (what !== void 0) {
      Module.print(what);
      Module.printErr(what);
      what = JSON.stringify(what);
    } else {
      what = "";
    }
    ABORT = true;
    var extra = "\nIf this abort() is unexpected, build with -s ASSERTIONS=1 which can give more information.";
    var output = "abort(" + what + ") at " + stackTrace() + extra;
    if (abortDecorators) {
      abortDecorators.forEach(function(decorator) {
        output = decorator(output, what);
      });
    }
    throw output;
  }
  Module["abort"] = Module.abort = abort;
  if (Module["preInit"]) {
    if (typeof Module["preInit"] == "function")
      Module["preInit"] = [Module["preInit"]];
    while (Module["preInit"].length > 0) {
      Module["preInit"].pop()();
    }
  }
  var shouldRunNow = true;
  if (Module["noInitialRun"]) {
    shouldRunNow = false;
  }
  Module["noExitRuntime"] = true;
  run();
  return Module;
}

var workerWasm = /*#__PURE__*/Object.freeze({
  __proto__: null,
  init: init
});

exports.Account = Account;
exports.Address = Address;
exports.BasicAccount = BasicAccount;
exports.BasicTransaction = BasicTransaction;
exports.BufferUtils = BufferUtils;
exports.Commitment = Commitment;
exports.CommitmentPair = CommitmentPair;
exports.CryptoUtils = CryptoUtils;
exports.Entropy = Entropy;
exports.ExtendedPrivateKey = ExtendedPrivateKey;
exports.ExtendedTransaction = ExtendedTransaction;
exports.GenesisConfig = GenesisConfig;
exports.Hash = Hash;
exports.HashedTimeLockedContract = HashedTimeLockedContract;
exports.KeyPair = KeyPair;
exports.MerklePath = MerklePath;
exports.MerkleTree = MerkleTree;
exports.MnemonicUtils = MnemonicUtils;
exports.MultiSigWallet = MultiSigWallet;
exports.PartialSignature = PartialSignature;
exports.Policy = Policy;
exports.PrivateKey = PrivateKey;
exports.PublicKey = PublicKey;
exports.RandomSecret = RandomSecret;
exports.Secret = Secret;
exports.SerialBuffer = SerialBuffer;
exports.Signature = Signature;
exports.SignatureProof = SignatureProof;
exports.Transaction = Transaction;
exports.VestingContract = VestingContract;
exports.Wallet = Wallet;
exports.initialize = initialize;
//# sourceMappingURL=index.js.map
