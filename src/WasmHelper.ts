export type WasmSource = BufferSource | WebAssembly.Module | Promise<BufferSource | WebAssembly.Module>;

let loadModule: (() => WasmSource) | undefined;

export function setWasmInit(init: () => WasmSource) {
    loadModule = init
}

export class WasmHelper {
    private static _module: any;

    static async doImport(): Promise<void> {
        if (WasmHelper._module) return;

        if (!loadModule) throw new Error('No WebAssembly.Module available');

        const moduleSettings: Record<string, any> = {};
        const wasmSource = await loadModule();
        if (wasmSource instanceof WebAssembly.Module) {
            moduleSettings.wasmModule = wasmSource;
        } else {
            moduleSettings.wasmBinary = wasmSource;
        }

        const { init } = await import('./wasm/worker-wasm');

        const runtimeInitialized = new Promise((resolve) => {
            moduleSettings.onRuntimeInitialized = () => resolve(true);
        });

        WasmHelper._module = init(moduleSettings);

        await runtimeInitialized;
    }

    static get Module() {
        if (!WasmHelper._module) throw new Error('WebAssembly not loaded, call WasmHelper.doImport() first');
        return WasmHelper._module;
    }
}
