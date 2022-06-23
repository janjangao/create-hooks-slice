import { useSelector, useDispatch, shallowEqual } from "https://esm.sh/react-redux";
import type { StatusProps, ActionCreator, Status, PayloadAction } from "./createReducerActions.ts";
import type { Selectors, Selector, RootDataStatusState } from "./createSelectorHooks.ts";
import type { ThunkActions, ThunkAction } from "./createThunkActions.ts";
export type CaseQueryResources<ThunkActionName = string> = {
  [key: string]: ThunkActionName;
};
export type ResourceResult<Result> = {
  data: Result;
} & StatusProps;
export type ResourceHook<Query = unknown, Result = unknown> = (query?: Query, deps?: unknown[]) => ResourceResult<Result> | Result;
export type ResourceHooks<Query = unknown, Result = unknown> = {
  [key: string]: ResourceHook<Query, Result>;
};
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

function makeStatusSelector(getResourceStatus: Selector<RootDataStatusState, Status>, resourceName: string) {
  return (state: RootDataStatusState) => {
    const resourceStatus = getResourceStatus(state);
    return resourceStatus ? resourceStatus[resourceName] : initialStatus;
  };
}

function makeStatusAction(setResourceStatus: ActionCreator, resourceName: string) {
  return (payload: StatusProps) => setResourceStatus({
    [resourceName]: payload
  });
}

function makeResourceHook(selector: Selector, statusSelector: Selector<RootDataStatusState, StatusProps>, statusAction: (payload: StatusProps) => PayloadAction<unknown>, thunkAction?: ThunkAction) {
  return (query?: unknown, deps?: unknown[], hookType: HookType = HookType.RESOURCE) => {
    const dispatch = useDispatch();
    const data = useSelector(selector);
    const status = useSelector(statusSelector);
    if (hookType === HookType.STATUS) return status;
    const {
      deps: statusDeps,
      isLoaded,
      isFetching
    } = status;

    if (thunkAction && !isFetching && (deps !== undefined && !shallowEqual(statusDeps, deps) || !isLoaded)) {
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

export default function createResourceHooks(resources: CaseQueryResources, selectors: Selectors, thunkActions: ThunkActions, getResourceStatus: Selector<RootDataStatusState, Status>, setResourceStatus: ActionCreator) {
  const resourceHooks: ResourceHooks = {};
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
  return resourceHooks;
}