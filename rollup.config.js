import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import esbuild from 'rollup-plugin-esbuild'
import externals from 'rollup-plugin-node-externals'

export default {
  input: 'app.ts',
  output: {
    file: 'dist/index.js',
    format: 'esm',
    sourcemap: true,
  },
  plugins: [
    // Exclude deps from bundle for faster builds and smaller outputs; do not exclude devDeps
    externals({ deps: true, devDeps: false }),
    resolve({ extensions: ['.ts', '.tsx', '.mjs', '.js', '.json'] }),
    commonjs(),
    esbuild({
      sourceMap: true,
      target: 'node24',
      platform: 'node',
      tsconfig: 'tsconfig.json',
      loaders: {
        '.ts': 'ts',
        '.tsx': 'tsx',
      },
    }),
  ],
}
