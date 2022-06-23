import { useDispatch } from "https://esm.sh/react-redux";
import { useMemo } from "https://esm.sh/react";
import type { ThunkActions, ThunkAction, OptionalThunkCallback, CaseQueryThunks } from "./core/createThunkActions.ts";
export { default } from "./core/createThunkActions.ts";
export type { CaseQueryThunks, ThunkActions, ThunkAction };
export type ThunkHook<Query = unknown, Result = unknown> = (query: Query | null, thunkCallback?: OptionalThunkCallback, deps?: unknown[]) => Promise<Result>;
export type ThunkHooks<Query = unknown, Result = unknown> = {
  [key: string]: ThunkHook<Query, Result>;
};

function getThunkHookName(thunkName: string): string {
  return `useThunk${thunkName[0].toUpperCase() + thunkName.slice(1)}`;
}

function isFunction<S>(x: unknown): x is () => S {
  return typeof x === "function";
}

export function createThunkHooksFromThunkActions(thunkActions: ThunkActions) {
  const thunkHooks: ThunkHooks = {};
  Object.keys(thunkActions).forEach(actionName => {
    const thunkAction = thunkActions[actionName];
    const actionHookName = getThunkHookName(actionName);

    thunkHooks[actionHookName] = (query: unknown, thunkCallback?: OptionalThunkCallback | unknown[], deps?: unknown[]) => {
      const dispatch = useDispatch();
      let finalThunkCallback: OptionalThunkCallback | undefined;

      if (isFunction(thunkCallback)) {
        finalThunkCallback = thunkCallback;
      } else if (!deps && Array.isArray(thunkCallback)) {
        deps = thunkCallback;
      }

      return useMemo(() => thunkAction(query, finalThunkCallback)(dispatch), deps);
    };
  });
  return thunkHooks;
}