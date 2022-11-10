import { BufferUtils } from './BufferUtils';

export class WasmHelper {
    private static _module: any;

    static async doImport(): Promise<void> {
        if (WasmHelper._module) return;

        const moduleSettings: Record<string, any> = {};

        const wasmBase64 = (await import('./wasm/wasm.base64')).default;
        moduleSettings.wasmBinary = BufferUtils.fromBase64(wasmBase64);

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
