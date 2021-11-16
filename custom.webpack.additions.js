const path = require("path");

module.exports = {
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.js$/,
        include: /node_modules\/pdfjs-dist.*/,
        loader: "babel-loader",
        options: {
          cacheDirectory: true,
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
        },
      },
      {
        test: /\.scss$/,
        use: ["sass-loader"],
      },
      {
        test: /\.css$/,
        use: ["sass-loader"],
      },
    ],
  },
};
