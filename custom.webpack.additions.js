module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules(?!(\/|\\)pdfjs-dist)/,
        loader: "babel-loader",
        options: {
          presets: [
            "@babel/preset-react",
            [
              "@babel/preset-env",
              {
                targets: {
                  esmodules: true,
                },
              },
            ],
          ],
          //          plugins: ["@babel/plugin-transform-runtime", "@babel/plugin-proposal-optional-chaining"],
        },
      },
    ],
  },
};
