const supportedTraps = ["get", "set", "apply", "construct"];

const objectCtorString = Object.prototype.constructor.toString();

function isPlainObject(value: any): boolean {
  if (!value || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  if (proto === null) return true;

  const constructor =
    Object.hasOwnProperty.call(proto, "constructor") && proto.constructor;
  if (constructor === Object) return true;

  return (
    typeof constructor == "function" &&
    Function.toString.call(constructor) === objectCtorString
  );
}

export default function TinyProxyPolyfill(this: any, 
  target: any,
  handler: Record<string, Function>
) {
  if (!isPlainObject(target) || !isPlainObject(handler)) {
    throw new TypeError(
      "Cannot create proxy with a non-object as target or handler"
    );
  }

  const unsafeHandler = handler;
  handler = {};
  // only supported traps
  for (const k in unsafeHandler) {
    if (supportedTraps.indexOf(k) !== -1) handler[k] = unsafeHandler[k];
  }

  let proxy = this;
  let isMethod = false;
  if (handler.apply || handler.construct) {
    proxy = function Proxy(this: any, ...args: any[]) {
      const usingNew = this && this.constructor === proxy;

      if (usingNew && handler.construct) {
        return handler.construct.call(this, target, args);
      } else if (!usingNew && handler.apply) {
        return handler.apply(target, this, args);
      }
      throw new TypeError(usingNew ? "not a constructor" : "not a function");
    };
    isMethod = true;
  }

  const getter = handler.get
    ? function (this: any, prop: string) {
        return handler.get(this, prop, proxy);
      }
    : function (this: any, prop: string) {
        return this[prop];
      };
  const setter = handler.set
    ? function (this: any, prop: string, value: any) {
        handler.set(this, prop, value, proxy);
      }
    : function (this: any, prop: string, value: any) {
        this[prop] = value;
      };

  const propertyNames = Object.getOwnPropertyNames(target);
  propertyNames.forEach(function (prop) {
    if (isMethod && prop in proxy) {
      return; // ignore internal properties
    }
    const real = Object.getOwnPropertyDescriptor(target, prop);
    const desc = {
      enumerable: !!real?.enumerable,
      get: getter.bind(target, prop),
      set: setter.bind(target, prop),
    };
    Object.defineProperty(proxy, prop, desc);
  });

  return proxy;
}
