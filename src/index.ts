import nimiqWasm from "./wasm/worker-wasm.wasm";
import { setWasmInit, WasmHelper, WasmSource } from "./WasmHelper";
setWasmInit(() => nimiqWasm());

export * from "./lib";

export async function initialize(options?: { wasm: WasmSource }) {
	if (options?.wasm) console.warn('Calling initialize() with options.wasm is not necessary for the standard version of this library, as the WASM is already included.');
	return WasmHelper.doImport();
};
