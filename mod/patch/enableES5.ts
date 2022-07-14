import { enableES5 as immerEnableES5 } from "https://esm.sh/immer";
import { replaceNewProxy } from "https://esm.sh/proxy-memoize";
import TinyProxyPolyfill from "./TinyProxyPolyfill.ts";
const hasProxies = typeof Proxy !== "undefined" && typeof Proxy.revocable !== "undefined" && typeof Reflect !== "undefined";

function proxyMemoizeEnableES5() {
  if (!hasProxies) replaceNewProxy((target, handler) => new (TinyProxyPolyfill as any)(target, handler));
}

export default function enableES5() {
  immerEnableES5();
  proxyMemoizeEnableES5();
}