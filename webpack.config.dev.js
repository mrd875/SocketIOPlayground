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
  name: 'cjs',
  target: 'node',
  entry: './src/index.js',
  output: {
    libraryTarget: 'commonjs2',
    filename: 'gt.cjs.dev.js'
  },
  module: {
    rules: [
      {
        test: /\.(js)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['@babel/plugin-transform-runtime',
              '@babel/plugin-transform-modules-commonjs']
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['*', '.js']
  },
  devtool: 'source-map'
}]
