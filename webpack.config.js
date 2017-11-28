var path = require("path");
var webpack = require("webpack");
var nodeExternals = require("webpack-node-externals");
var uglifyPlugin = require("uglifyjs-webpack-plugin");

var bundleName = "prism";
var outputFile = bundleName + ".js";

var config = {
    target: "node",
    node: {
        __dirname: false
    },
    devtool: "source-map",
    externals: [nodeExternals()],
    entry: __dirname + "/build/app.js",
    output: {
        path: __dirname + "/dist",
        filename: outputFile,
        library: bundleName,
        libraryTarget: "umd",
        umdNamedDefine: true
    },
    resolve: {
        modules: [path.resolve(__dirname, "build"), "node_modules"],
        extensions: ['*', '.js']
    },
    plugins: [
        new webpack.DefinePlugin({
            "process.env.NODE_ENV": JSON.stringify("production")
        }),
        new webpack.LoaderOptionsPlugin({
            minimize: true,
            debug: false
        }),
        new uglifyPlugin({
            sourceMap: true,
            uglifyOptions: {
                sourceMap: true,
                beautify: false,
                ecma: 6,
                compress: true,
                comments: false
            }
        })
    ]
};

module.exports = config;