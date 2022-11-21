import wasm from '@rollup/plugin-wasm'
import copy from 'rollup-plugin-copy'
import dts from 'rollup-plugin-dts'
import esbuild from 'rollup-plugin-esbuild'

const external = id => !/^[./]/.test(id)

/**
 * @param {'umd' | 'cjs' | 'es'} fmt
 * @param {'standard' | 'node' | 'slim'} env
 */
const rolls = (fmt, env) => ({
  input: env !== "slim" ? "src/index.ts" : "src/index_slim.ts",
  output: {
    dir: `dist/${env}/${fmt}`,
    format: fmt,
    name: 'Nimiq',
    sourcemap: true,
    inlineDynamicImports: true,
  },
  plugins: [
    esbuild(),
    env !== "slim" &&
      wasm(
        env === "node"
          ? { maxFileSize: 0, targetEnv: "node" }
          : { targetEnv: "auto-inline" }
      ),
    env === "slim" &&
      copy({
        targets: [{ src: "src/wasm/worker-wasm.wasm", dest: "dist", rename: 'nimiq.wasm' }],
        copyOnce: true,
      }),
  ],
  external,
})

export default [
  rolls("umd", "standard"),
  rolls("es", "standard"),
  rolls("cjs", "standard"),
  rolls("cjs", "node"),
  rolls("es", "slim"),
  rolls("cjs", "slim"),
  // Type declarations:
  {
    input: 'src/index.ts',
    output: {
      file: `dist/index.d.ts`,
      format: 'es',
    },
    plugins: [dts()],
    external,
  }
]
