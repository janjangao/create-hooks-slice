import type { Dispatch } from "https://esm.sh/redux";
import { useDispatch } from "https://esm.sh/react-redux";
import type { OptionalThunkCallback } from "./core/createThunkActions.ts";
export { default as createThunkActions } from "./core/createThunkActions.ts";
export type ThunkAction<Query, Result> = (query?: Query, thunkCallback?: OptionalThunkCallback<Result, any>) => (dispatch: Dispatch) => Promise<Result>;
export type ThunkActions = {
  [key: string]: ThunkAction<any, any>;
};
export type ThunkHook<TA extends ThunkAction<any, any>> = TA extends (query?: undefined, thunkCallback?: infer ThunkCallback) => (dispatch: any) => Promise<infer Result> ? (query?: undefined, thunkCallback?: ThunkCallback) => (query?: undefined, thunkCallback?: ThunkCallback) => Promise<Result> : TA extends (query: infer Query, thunkCallback: infer ThunkCallback) => (dispatch: any) => Promise<infer Result> ? <HookQuery extends Query | undefined, HookThunkCallback extends ThunkCallback | undefined>(query?: HookQuery, thunkCallback?: HookThunkCallback) => HookQuery extends undefined ? (query: Query, thunkCallback?: ThunkCallback) => Promise<Result> : (query?: Query, thunkCallback?: ThunkCallback) => Promise<Result> : never;
export type ThunkHooks<TAS extends ThunkActions> = { [Key in keyof TAS as `useThunk${Capitalize<Key & string>}`]: ThunkHook<TAS[Key]> };

function getThunkHookName(thunkName: string): string {
  return `useThunk${thunkName[0].toUpperCase() + thunkName.slice(1)}`;
}

export default function createThunkHooks<TAS extends ThunkActions = ThunkActions>(thunkActions: TAS) {
  const thunkHooks: {
    [k: string]: any;
  } = {};
  Object.keys(thunkActions).forEach(actionName => {
    const thunkAction = thunkActions[actionName];
    const actionHookName = getThunkHookName(actionName);

    thunkHooks[actionHookName] = (hookQuery: any, hookThunkCallback?: OptionalThunkCallback<any, any>) => {
      const dispatch = useDispatch();
      return (query: any, thunkCallback?: OptionalThunkCallback<any, any>) => {
        if (query === undefined && hookQuery !== undefined) query = hookQuery;
        if (thunkCallback === undefined && hookThunkCallback !== undefined) thunkCallback = hookThunkCallback;
        return thunkAction(query, thunkCallback)(dispatch);
      };
    };
  });
  return (thunkHooks as ThunkHooks<TAS>);
}