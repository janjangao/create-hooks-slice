import { enableES5 as immerEnableES5 } from "immer";
import { replaceNewProxy } from "proxy-memoize";
import TinyProxyPolyfill from "./TinyProxyPolyfill.ts";

const hasProxies =
  typeof Proxy !== "undefined" &&
  typeof Proxy.revocable !== "undefined" &&
  typeof Reflect !== "undefined";

function proxyMemoizeEnableES5() {
  if (!hasProxies)
    replaceNewProxy(
      (target, handler) => new (TinyProxyPolyfill as any)(target, handler)
    );
}

export default function enableES5() {
  immerEnableES5();
  proxyMemoizeEnableES5();
}
