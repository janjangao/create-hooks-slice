import { shallowEqual, useDispatch, useSelector } from "https://esm.sh/react-redux";
import type { ActionCreator, PayloadAction } from "./core/createAction.ts";
import type { Status, StatusProps } from "./createActionHooks.ts";
import type { AnySelector, AnySelectors } from "./createSelectorHooks.ts";
import type { ThunkAction, ThunkActions } from "./createThunkHooks.ts";
export type CaseQueryResources = {
  [key: string]: string;
};
export type ResourceResult<Result> = {
  data: Result;
} & StatusProps;
export type ResourceHook<S extends AnySelector<any, any>, TA extends ThunkAction<any, any>, HT extends HookType> = TA extends (query: infer Query, thunkCallback: any) => any ? S extends (state: any) => infer Result ? HT extends HookType.RESOURCE ? (query: Query, deps?: any[]) => ResourceResult<Result> : HT extends HookType.STATUS ? () => StatusProps : (query: Query, deps?: any[]) => Result : never : never;
type CkeyResourceHook<CKey, S extends AnySelector<any, any>, TAS extends ThunkActions, HT extends HookType> = { [TKey in Extract<keyof TAS, CKey>]: ResourceHook<S, TAS[TKey], HT> }[Extract<keyof TAS, CKey>];
export type ResourceHooks<CQRS extends CaseQueryResources, SS extends AnySelectors<any>, TAS extends ThunkActions> = { [Key in Extract<keyof CQRS, keyof SS> as `useResource${Capitalize<Key & string>}`]: CkeyResourceHook<CQRS[Key], SS[Key], TAS, HookType.RESOURCE> } & { [Key in Extract<keyof CQRS, keyof SS> as `useSuspense${Capitalize<Key & string>}`]: CkeyResourceHook<CQRS[Key], SS[Key], TAS, HookType.SUSPENSE> } & { [Key in Extract<keyof CQRS, keyof SS> as `useStatus${Capitalize<Key & string>}`]: CkeyResourceHook<CQRS[Key], SS[Key], TAS, HookType.STATUS> };
enum HookType {
  RESOURCE = "useResource",
  SUSPENSE = "useSuspense",
  ERROR_SUSPENSE = "useErrorSuspense",
  STATUS = "useStatus",
}

function getResourceHookName(resourceName: string, hookType: HookType = HookType.RESOURCE): string {
  const prefix = hookType.toString();
  return `${prefix}${resourceName[0].toUpperCase() + resourceName.slice(1)}`;
}

const initialStatus = {
  deps: undefined,
  isLoading: false,
  isLoaded: false,
  isFetching: false,
  isSuccess: false,
  isError: false,
  error: undefined
};

function makeStatusSelector<State>(getResourceStatus: AnySelector<State, Status>, resourceName: string) {
  return (state: State) => {
    const resourceStatus = getResourceStatus(state);
    return resourceStatus ? resourceStatus[resourceName] : initialStatus;
  };
}

function makeStatusAction(setResourceStatus: ActionCreator<Status>, resourceName: string) {
  return (payload: StatusProps) => setResourceStatus({
    [resourceName]: payload
  });
}

function makeResourceHook<State>(selector: AnySelector<State, any>, statusSelector: AnySelector<State, StatusProps>, statusAction: (payload: StatusProps) => PayloadAction<StatusProps>, thunkAction?: ThunkAction<any, any>) {
  return (query?: any, deps?: any[], hookType: HookType = HookType.RESOURCE) => {
    const dispatch = useDispatch();
    const data = useSelector(selector);
    const status = useSelector(statusSelector);
    if (hookType === HookType.STATUS) return status;
    const {
      deps: statusDeps,
      isLoaded,
      isFetching,
      isError
    } = status;

    if (thunkAction && !isFetching && (deps !== undefined && !shallowEqual(statusDeps, deps) || !isLoaded && !isError)) {
      const resultPromise = thunkAction(query, {
        pending: dispatch => {
          const payload: StatusProps = {
            isFetching: true
          };
          if (!isLoaded) payload.isLoading = true;
          dispatch(statusAction(payload));
        },
        fulfilled: dispatch => {
          const payload: StatusProps = {
            isFetching: false,
            isSuccess: true,
            isError: false,
            error: undefined
          };

          if (!isLoaded) {
            payload.isLoading = false;
            payload.isLoaded = true;
          }

          if (deps !== undefined) payload.deps = deps;
          dispatch(statusAction(payload));
        },
        rejected: (dispatch, error) => {
          const payload: StatusProps = {
            isFetching: false,
            isSuccess: false,
            isError: true,
            error
          };

          if (!isLoaded) {
            payload.isLoading = false;
            payload.isLoaded = false;
          }

          if (deps !== undefined) payload.deps = deps;
          dispatch(statusAction(payload));
          if (hookType === HookType.ERROR_SUSPENSE) throw error;
        }
      })(dispatch);
      if (hookType === HookType.SUSPENSE || hookType === HookType.ERROR_SUSPENSE) throw resultPromise;
    }

    return hookType === HookType.RESOURCE ? {
      data,
      ...status
    } : data;
  };
}

export default function createResourceHooks<State = any, CQRS extends CaseQueryResources = CaseQueryResources, SS extends AnySelectors<State> = AnySelectors<State>, TAS extends ThunkActions = ThunkActions>(resources: CQRS, selectors: SS, thunkActions: TAS, getResourceStatus: AnySelector<State, Status>, setResourceStatus: ActionCreator<Status>) {
  const resourceHooks: {
    [k: string]: any;
  } = {};
  Object.keys(resources).forEach(resourceName => {
    if (resourceName in selectors) {
      const selector = selectors[resourceName];
      const thunkActionName = resources[resourceName];
      const statusSelector = makeStatusSelector(getResourceStatus, resourceName);
      const statusAction = makeStatusAction(setResourceStatus, resourceName);
      const resourceHook = makeResourceHook(selector, statusSelector, statusAction, thunkActions[thunkActionName]);
      resourceHooks[getResourceHookName(resourceName)] = resourceHook;
      resourceHooks[getResourceHookName(resourceName, HookType.SUSPENSE)] = resourceHook;
      resourceHooks[getResourceHookName(resourceName, HookType.ERROR_SUSPENSE)] = resourceHook;
      resourceHooks[getResourceHookName(resourceName, HookType.STATUS)] = resourceHook;
    }
  });
  return (resourceHooks as ResourceHooks<CQRS, SS, TAS>);
}