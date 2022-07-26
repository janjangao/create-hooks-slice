import { enableES5 as immerEnableES5 } from "immer";
// import { replaceNewProxy } from "proxy-memoize";
import TinyProxyPolyfill from "./TinyProxyPolyfill.ts";

type AnyObject = { [key: string]: any };

const ownKeys: (target: AnyObject) => PropertyKey[] =
  typeof Reflect !== "undefined" && Reflect.ownKeys
    ? Reflect.ownKeys
    : typeof Object.getOwnPropertySymbols !== "undefined"
    ? (obj) =>
        Object.getOwnPropertyNames(obj).concat(
          Object.getOwnPropertySymbols(obj) as any
        )
    : Object.getOwnPropertyNames;

function proxyMemoizeEnableES5() {
  if (typeof Proxy === "undefined" || typeof Proxy.revocable === "undefined")
    // replaceNewProxy(
    //   (target, handler) => new (TinyProxyPolyfill as any)(target, handler)
    // );
  if (typeof Reflect === "undefined")
    self.Reflect = { ownKeys } as unknown as any;
}

export default function enableES5() {
  immerEnableES5();
  proxyMemoizeEnableES5();
}
