import type { Dispatch } from "https://esm.sh/redux";
import { shallowEqual, useDispatch, useSelector } from "https://esm.sh/react-redux";
import { useCallback, useMemo } from "https://esm.sh/react";
import type { ActionCreator, PayloadAction } from "./core/createAction.ts";
import type { Status, StatusProps } from "./createActionHooks.ts";
import type { AnySelector, AnySelectors } from "./createSelectorHooks.ts";
import type { ThunkAction, ThunkActions } from "./createThunkHooks.ts";
export type CaseQueryResources = {
  [key: string]: string;
};
export type ResourceResult<Result> = {
  data: Result;
  useData: <DataTransformer = undefined>(dataTransformer?: DataTransformer | ((result: Result) => any), deps?: any[]) => DataTransformer extends undefined ? Result : DataTransformer extends (result: any) => infer TransformedResult ? TransformedResult : never;
  refetch: () => Promise<Result>;
} & StatusProps;
export type ResourceHook<S extends AnySelector<any, any>, TA extends ThunkAction<any, any>, HT extends HookType> = TA extends (query?: infer Query, thunkCallback?: any) => any ? S extends (state: any) => infer Result ? HT extends HookType.STATUS ? () => StatusProps : Query extends undefined ? (query?: undefined, deps?: any[]) => ResourceResult<Result> : (query: Query, deps?: any[]) => ResourceResult<Result> : never : never;
type CkeyResourceHook<CKey, S extends AnySelector<any, any>, TAS extends ThunkActions, HT extends HookType> = { [TKey in Extract<keyof TAS, CKey>]: ResourceHook<S, TAS[TKey], HT> }[Extract<keyof TAS, CKey>];
export type ResourceHooks<CQRS extends CaseQueryResources, SS extends AnySelectors<any>, TAS extends ThunkActions> = { [Key in Extract<keyof CQRS, keyof SS> as `useResource${Capitalize<Key & string>}`]: CkeyResourceHook<CQRS[Key], SS[Key], TAS, HookType.RESOURCE> } & { [Key in Extract<keyof CQRS, keyof SS> as `useSuspense${Capitalize<Key & string>}`]: CkeyResourceHook<CQRS[Key], SS[Key], TAS, HookType.SUSPENSE> } & { [Key in Extract<keyof CQRS, keyof SS> as `useStatus${Capitalize<Key & string>}`]: CkeyResourceHook<CQRS[Key], SS[Key], TAS, HookType.STATUS> };
enum HookType {
  RESOURCE = "useResource",
  SUSPENSE = "useSuspense",
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

function makeStatusSelector<State>(getResourceStatus: AnySelector<State, Status>, thunkActionName: string) {
  return (state: State) => {
    const resourceStatus = getResourceStatus(state);
    return resourceStatus && resourceStatus[thunkActionName] ? resourceStatus[thunkActionName] : initialStatus;
  };
}

function makeStatusAction(setResourceStatus: ActionCreator<Status>, thunkActionName: string) {
  return (payload: StatusProps) => setResourceStatus({
    [thunkActionName]: payload
  });
}

function makeUseData<D, R = D>(data: D) {
  return (dataTransformer: (data: D) => D | R = data => data, deps: any[] = []) => useMemo(() => dataTransformer(data), [data, ...deps]);
}

function makeRefetch(query: any | undefined, deps: any[] | undefined, status: StatusProps, statusAction: (payload: StatusProps) => PayloadAction<StatusProps>, thunkAction: ThunkAction<any, any> | undefined, dispatch: Dispatch) {
  return () => thunkAction && thunkAction(query, {
    pending: (_, dispatch) => {
      const payload: StatusProps = {
        isFetching: true
      };
      if (!status.isLoaded) payload.isLoading = true;
      dispatch(statusAction(payload));
    },
    fulfilled: (_, dispatch) => {
      const payload: StatusProps = {
        isFetching: false,
        isSuccess: true,
        isError: false,
        error: undefined
      };

      if (!status.isLoaded) {
        payload.isLoading = false;
        payload.isLoaded = true;
      }

      if (deps !== undefined) payload.deps = deps;
      dispatch(statusAction(payload));
    },
    rejected: (error, dispatch) => {
      const payload: StatusProps = {
        isFetching: false,
        isSuccess: false,
        isError: true,
        error
      };

      if (!status.isLoaded) {
        payload.isLoading = false;
        payload.isLoaded = false;
      }

      if (deps !== undefined) payload.deps = deps;
      dispatch(statusAction(payload));
    }
  })(dispatch);
}

function makeResourceHook<State>(selector: AnySelector<State, any>, statusSelector: AnySelector<State, StatusProps>, statusAction: (payload: StatusProps) => PayloadAction<StatusProps>, thunkAction?: ThunkAction<any, any>) {
  return (query?: any, deps?: any[], hookType: HookType = HookType.RESOURCE) => {
    const dispatch = useDispatch();
    const data = useSelector(selector);
    const status = useSelector(statusSelector);
    const useData = useCallback(makeUseData(data), [data]);
    const refetch = useCallback(makeRefetch(query, deps, status, statusAction, thunkAction, dispatch), [query, deps, status, statusAction, thunkAction, dispatch]);
    if (hookType === HookType.STATUS) return status;
    const {
      deps: statusDeps,
      isLoaded,
      isFetching,
      isError
    } = status;

    if (!isFetching && (deps !== undefined && !shallowEqual(statusDeps, deps) || !isLoaded && !isError)) {
      const resultPromise = refetch();
      if (hookType === HookType.SUSPENSE) throw resultPromise;
    }

    return {
      data,
      useData,
      refetch,
      ...status
    };
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
      const statusSelector = makeStatusSelector(getResourceStatus, thunkActionName);
      const statusAction = makeStatusAction(setResourceStatus, thunkActionName);
      const resourceHook = makeResourceHook(selector, statusSelector, statusAction, thunkActions[thunkActionName]);

      resourceHooks[getResourceHookName(resourceName)] = (query?: any, deps?: any[]) => resourceHook(query, deps, HookType.RESOURCE);

      resourceHooks[getResourceHookName(resourceName, HookType.SUSPENSE)] = (query?: any, deps?: any[]) => resourceHook(query, deps, HookType.SUSPENSE);

      resourceHooks[getResourceHookName(resourceName, HookType.STATUS)] = () => resourceHook(undefined, undefined, HookType.STATUS);
    }
  });
  return (resourceHooks as ResourceHooks<CQRS, SS, TAS>);
}