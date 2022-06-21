import { build, stop } from "https://deno.land/x/esbuild@v0.12.1/mod.js";
// import httpFetch from "https://deno.land/x/esbuild_plugin_http_fetch/index.js";

await build({
  bundle: true,
  entryPoints: ["index.ts"],
  outdir: "dist",
  platform: "neutral",
  plugins: [
    // httpFetch,
    externalAll(),
  ],
});

stop();

export function externalAll(skipNodeModulesBundle = true) {
  // Must not start with "/" or "./" or "../"
  const NON_NODE_MODULE_RE = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/;
  return {
    name: `external`,

    setup(build) {
      if (skipNodeModulesBundle) {
        build.onResolve({ filter: /.*/ }, (args) => {
          if (NON_NODE_MODULE_RE.test(args.path)) {
            return {
              path: args.path,
              external: true,
            };
          }
        });
      }
    },
  };
}
