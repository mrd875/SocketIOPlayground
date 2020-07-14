module.exports = [{
  name: 'umd.dev',
  entry: './src/index.js',
  output: {
    library: 'GT',
    libraryTarget: 'umd',
    filename: 'gt.umd.dev.js'
  },
  devtool: 'source-map'
},
{
  name: 'cjs.dev',
  entry: './src/index.js',
  output: {
    libraryTarget: 'commonjs2',
    filename: 'gt.cjs.dev.js'
  },
  devtool: 'source-map'
}]
