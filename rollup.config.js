import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';

export default {
  input: 'src/main.js',
  output: [
    {
      file: 'dist/bundle-umd.js',
      format: 'umd',
      name: 'YmlHelper',
      compact: true
    },
    {
      file: 'dist/bundle-es.js',
      format: 'es'
    }
  ],
  plugins: [
    commonjs(),
    resolve(),
    babel({
      exclude: 'node_modules/**'
    })
  ]
};
