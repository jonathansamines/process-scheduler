'use strict';

module.exports = {
  entry: './src/index.js',
  output: {
    filename: './view/bundle.js',
  },
  module: {
    loaders: [
      {
        test: /\.json$/,
        loader: 'json',
      },
    ],
  },
};
