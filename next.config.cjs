/**
 * Transpile problematic ESM packages in node_modules (undici)
 * to avoid syntax errors from modern JS features during webpack build.
 */
// Avoid bundling server-only `undici` in client bundles by aliasing it to false.
// This keeps the browser build using the native `fetch` implementation.
// Note: Turbopack (used by `next dev --turbo`) is a different bundler
// and does not consume webpack-specific customizations. The `webpack`
// function below remains for webpack-based builds/fallbacks (e.g. when
// running `next dev` without `--turbo` or in certain production flows).
module.exports = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      undici: false,
    }
    return config
  },
}