import { build, stop } from "https://deno.land/x/esbuild@v0.12.1/mod.js";
import * as importMap from "https://esm.sh/esbuild-plugin-import-map";
// import httpFetch from "https://deno.land/x/esbuild_plugin_http_fetch/index.js";

// Must not start with "/" or "./" or "../"
const NON_NODE_MODULE_RE = /^[^.\/]|^\.[^.\/]|^\.\.[^\/]/;

export function externalAll(skipNodeModulesBundle = true) {
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
importMap.load("import_map.json");

await build({
  bundle: true,
  entryPoints: ["index.ts"],
  outfile: "mod.js",
  platform: "neutral",
  plugins: [
    // httpFetch,
    importMap.plugin(),
  ],
});

stop();
