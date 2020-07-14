module.exports = [{
  name: 'umd',
  entry: './src/index.js',
  output: {
    library: 'GT',
    libraryTarget: 'umd',
    filename: 'gt.umd.js'
  }
},
{
  name: 'cjs',
  entry: './src/index.js',
  output: {
    libraryTarget: 'commonjs2',
    filename: 'gt.cjs.js'
  }
}]
