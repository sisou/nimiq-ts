import { setWasmInit, WasmHelper, WasmSource } from "./WasmHelper";

export * from "./lib";

export async function initialize(options?: { wasm: WasmSource }) {
	if (!options?.wasm) throw new Error('options.wasm must contain a WASM source');
	setWasmInit(() => options.wasm);
	return WasmHelper.doImport();
}
