import path from "node:path";
import url from "node:url";
import fs from "node:fs";
import { defineConfig } from "@rspack/cli";
import { rspack } from "@rspack/core";

const baseHref = process.env.BASE_HREF || "/";
console.log("BUILDING WITH BASE_HREF OF", baseHref);

const dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.dirname(dirname);
const repoRoot = path.dirname(root);

const entries = {}
for (const folder of fs.readdirSync(path.join(root))) {
  if (!fs.existsSync(path.join(root, folder))) continue
  if (!fs.statSync(path.join(root, folder)).isDirectory()) continue
  if (!fs.existsSync(path.join(root, folder, 'index.tsx'))) continue
  if (!fs.statSync(path.join(root, folder, 'index.tsx')).isFile()) continue
  entries[folder] = path.join(root, folder, 'index.tsx')
}

export default defineConfig({
  experiments: {
    css: true,
    outputModule: true,
  },
  entry: entries,
  output: {
    filename: "[name].js",
    path: path.join(root, "dist"),
    publicPath: baseHref,
    module: true,
    chunkFormat: "module",
    chunkLoading: "import",
    workerChunkLoading: "import",
  },
  resolve: {
    extensions: ["...", ".ts", ".tsx", ".jsx"],
    extensionAlias: {
      ".js": [".ts", ".tsx", ".js"],
    },
    alias: {
      "mvvm": path.join(repoRoot, "src", "index.ts"),
      "mvvm/preact": path.join(repoRoot, "src", "preact", "index.ts"),
      "preact": path.join(root, 'node_modules', 'preact', 'dist', 'preact.module.js'),
      'preact/hooks': path.join(root, 'node_modules', 'preact','hooks','dist','hooks.module.js'),
      react: "preact/compat",
      "react-dom/test-utils": "preact/test-utils",
      "react-dom": "preact/compat", // Must be below test-utils
      "react/jsx-runtime": "preact/jsx-runtime",
    },
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        use: {
          loader: "builtin:swc-loader",
          options: {
            jsc: {
              parser: {
                syntax: "ecmascript",
                jsx: true,
              },
            },
          },
        },
        type: "javascript/auto",
      },
      {
        test: /\.tsx?$/,
        use: {
          loader: "builtin:swc-loader",
          options: {
            jsc: {
              parser: {
                syntax: "typescript",
                tsx: true,
                decorators: true,
              },
              transform: {
                react: {
                  pragma: "h",
                  pragmaFrag: "Fragment",
                },
                decoratorVersion: "2022-03",
                decoratorMetadata: true,
              },
            },
          },
        },
        type: "javascript/auto",
      },
    ],
  },
  plugins: [
  ],
  devServer: {
    hot: false,
    port: 4200,
    historyApiFallback: true,
    allowedHosts: "all",
    host: "0.0.0.0",
    headers: [
      {
        key: "Cache-Control",
        value: "no-store",
      },
    ],
    devMiddleware: {
      writeToDisk: true,
    },
  },
});
