const Dotenv = require('dotenv-webpack');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const path = require('path');
const webpack = require('webpack');

const isDevelopment = process.env.NEXT_PUBLIC_BUILD_ENV !== 'production';
const isPackaging = process.env.IS_PACKAGING === 'true';

module.exports = {
  devtool: 'source-map',
  entry: {
    'service-worker/index': {
      import: ['./ci/service-worker-pre-setup.js', './src/scripts/service-worker/index.ts'],
      filename: 'service-worker/index.js',
    },
    'content-injection/index': {
      import: ['./src/scripts/content-injection/index.ts'],
      filename: 'content-injection/index.js',
      publicPath: '/',
    },
    'sandbox/index': {
      import: ['./src/scripts/sandbox/index.ts'],
      filename: 'sandbox/index.js',
    },
  },
  output: {
    path: path.resolve(__dirname, 'out/scripts'),
    filename: 'bundles/[name].js',
    publicPath: '/scripts/',
  },
  optimization: {
    minimize: isPackaging,
  },
  performance: {
    maxEntrypointSize: 20_000_000,
    maxAssetSize: 20_000_000,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    fallback: {
      // polyfills
      assert: false,
      buffer: require.resolve('buffer/'),
      child_process: path.resolve('ci/child-process-mock.js'),
      cluster: false,
      constants: false,
      crypto: false,
      dgram: false,
      dns: false,
      domain: false,
      events: false,
      'fs/promises': false,
      fs: require.resolve('browserify-fs'),
      http2: false,
      http: require.resolve('stream-http'),
      https: false,
      inspector: false,
      module: false,
      net: false,
      os: false,
      path: require.resolve('path-browserify'),
      perf_hooks: false,
      process: require.resolve('process'),
      punycode: false,
      querystring: false,
      readline: false,
      repl: false,
      stream: require.resolve('stream-browserify'),
      string_decoder: false,
      tls: false,
      trace_events: false,
      tty: false,
      url: require.resolve('url-polyfill'),
      util: require.resolve('util/'),
      v8: false,
      vm: false,
      wasi: false,
      worker_threads: false,
      yargs: false,
      zlib: false,
    },
    alias: {
      '../common/BrowserWebSocketTransport.js': path.resolve(
        __dirname,
        './src/common/puppeteer/override/transport/ChromeExtensionTransport',
      ),
      '../util/Function.js': path.resolve(__dirname, './src/common/puppeteer/override/AsyncFunction'),
    },
    plugins: [new TsconfigPathsPlugin({ configFile: 'tsconfig.json' })],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: [/node_modules/, /__test__/],
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-react', '@babel/preset-typescript'],
              plugins: [
                ['@babel/plugin-proposal-decorators', { legacy: true }],
                '@babel/plugin-transform-class-properties',
                '@babel/plugin-transform-private-methods',
              ],
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          'postcss-loader', // Add this to process your CSS with Tailwind and other PostCSS plugins
        ],
      },
      {
        test: /\.svg$/,
        use: ['file-loader'],
      },
      {
        test: /\.html$/,
        use: 'html-loader',
      },
      {
        // make sure `BrowserWebSocketTransport` dependency is bundled
        test: /BrowserWebSocketTransport\.(ts|js)$/, // regex to match the specific file
        sideEffects: true,
      },
    ],
  },
  plugins: [
    new webpack.IgnorePlugin({ resourceRegExp: /__test__/ }),
    new ForkTsCheckerWebpackPlugin(),

    // suppress critical dependency warnings for yargs
    new webpack.ContextReplacementPlugin(
      /yargs/,
      path.resolve(__dirname, 'path-to-yargs-sub-directory-holding-those-files/'),
    ),

    new Dotenv({
      path: path.resolve(__dirname, isDevelopment ? './.env.local' : './.env.production'),
      systemvars: true,
    }),

    // polyfills
    new webpack.ProvidePlugin({ process: 'process', Buffer: ['buffer', 'Buffer'] }),
    new webpack.NormalModuleReplacementPlugin(/fs-extra/, path.resolve(__dirname, 'ci/fs-extra-wrapper.js')),
  ],
  watchOptions: {
    ignored: ['out', 'dist', 'coverage'],
  },
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename],
    },
  },
  devServer: {
    hot: true, // Enable HMR
    static: './out', // Where to serve static files from
  },
  stats: {
    warningsFilter: (warning) => {
      const warningKeyword = 'Critical dependency: the request of a dependency is an expression';
      if (typeof warning === 'object' && warning.message) return warning.message.includes(warningKeyword);
      else if (typeof warning === 'string') return warning.includes(warningKeyword);
      else return false;
    },
  },
};
