import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';

export default {
  input: 'src/main.js',
  output: [{
    file: 'bundle-umd.js',
    format: 'umd',
    name: 'YmlHelper'
  },
  {
    file: 'bundle-es.js',
    format: 'es',
  }],
  plugins: [
    resolve(),
    babel({
      exclude: 'node_modules/**'
    })
  ]
};
