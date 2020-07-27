module.exports = [{
  name: 'umd',
  entry: './src/index.js',
  output: {
    library: 'GT',
    libraryTarget: 'umd',
    filename: 'gt.umd.js'
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
              '@babel/plugin-transform-modules-umd']
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['*', '.js']
  }
},
{
  name: 'cjs',
  target: 'node',
  entry: './src/index.js',
  output: {
    libraryTarget: 'commonjs2',
    filename: 'gt.cjs.js'
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
  }
}]
