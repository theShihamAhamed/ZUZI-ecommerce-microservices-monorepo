const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  externals: [
    ({ request }, callback) => {
      if (
        request === '@prisma/client' ||
        request?.startsWith('@prisma/client/') ||
        request === '@tensorflow/tfjs' ||
        request?.startsWith('@tensorflow/tfjs/') ||
        request === 'cookie-parser' ||
        request === 'jsonwebtoken'
      ) {
        return callback(null, `commonjs ${request}`);
      }

      callback();
    },
  ],
  resolve: {
    alias: {
      '@packages': join(__dirname, '../../packages'),
      '@utils': join(__dirname, '../../packages/utils'),
      '@libs': join(__dirname, '../../packages/libs'),
    },
  },
  output: {
    path: join(__dirname, 'dist'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ["./src/assets"],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
      mergeExternals: true,
      sourceMap: true,
    })
  ],
};
