import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { babel } from '@rollup/plugin-babel';
import { terser } from 'rollup-plugin-terser';

// Environment variables
const isProduction = process.env.NODE_ENV === 'production';
const isBrowser = process.env.BUILD_TARGET === 'browser';

export default {
  input: 'src/index.js',
  output: [
    {
      file: isBrowser 
        ? 'dist/browser.js' 
        : 'dist/node.js',
      format: 'umd',
      name: 'Birdo',
      sourcemap: true,
      globals: {
        'cross-fetch': 'fetch'
      }
    },
    {
      file: isBrowser 
        ? 'dist/browser.esm.js' 
        : 'dist/node.esm.js',
      format: 'esm',
      sourcemap: true
    }
  ],
  plugins: [
    nodeResolve(),
    commonjs(),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**'
    }),
    isProduction && terser()
  ],
  external: isBrowser ? [] : ['os', 'child_process', 'fs', 'util', 'v8'],
  onwarn(warning, warn) {
    // Skip certain warnings
    if (warning.code === 'UNRESOLVED_IMPORT') return;
    if (warning.code === 'CIRCULAR_DEPENDENCY') return;
    warn(warning);
  }
};