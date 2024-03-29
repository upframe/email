const slsw = require('serverless-webpack')
const nodeExternals = require('webpack-node-externals')
const webpack = require('webpack')
const fs = require('fs')

module.exports = {
  entry: slsw.lib.entries,
  target: 'node',
  devtool: 'source-map',
  mode: slsw.lib.webpack.isLocal ? 'development' : 'production',
  optimization: {
    minimize: false,
  },
  performance: {
    hints: false,
  },
  resolve: {
    mainFields: ['main', 'module'],
    extensions: ['.ts', '.js'],
  },
  externals: [nodeExternals()],
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
          },
          {
            loader: 'ts-loader',
          },
        ],
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
          },
        ],
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin(
      fs.existsSync('.env')
        ? Object.fromEntries(
            fs
              .readFileSync('.env', 'utf-8')
              .split('\n')
              .filter(Boolean)
              .map((v) => v.split('='))
              .map(([k, v]) => [`process.env.${k}`, JSON.stringify(v)])
          )
        : {}
    ),
  ],
}
