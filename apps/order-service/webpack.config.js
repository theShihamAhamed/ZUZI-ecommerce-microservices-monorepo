const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  externals: [
    ({ request }, callback) => {
      if (
        request === '@prisma/client' ||
        request?.startsWith('@prisma/client/') ||
        request === 'ioredis' ||
        request === 'nodemailer' ||
        request === 'stripe'
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
      '@middleware': join(__dirname, '../../packages/middleware'),
      '@error-handler': join(__dirname, '../../packages/error-handler'),
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
      assets: [],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
      mergeExternals: true,
      sourceMap: true,
    })
  ],
};
