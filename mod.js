// lib/core/createAction.ts
function createAction(type, prepareAction) {
  function actionCreator(...args) {
    if (prepareAction) {
      const prepared = prepareAction(...args);
      if (!prepared) {
        throw new Error("prepareAction did not return an object");
      }
      return {
        type,
        payload: prepared.payload,
        ..."meta" in prepared && { meta: prepared.meta },
        ..."error" in prepared && { error: prepared.error }
      };
    }
    return { type, payload: args[0] };
  }
  actionCreator.toString = () => `${type}`;
  return actionCreator;
}

// lib/core/createReducer.ts
import createNextState from "https://esm.sh/immer";
function createReducer(initialState, caseReducers) {
  return function reducer(state = initialState, action) {
    const caseReducer = caseReducers[action.type];
    if (caseReducer) {
      state = createNextState(state, (draft) => {
        caseReducer(draft, action);
      });
    }
    return state;
  };
}

// lib/converter/reducerConverter.ts
function convertToCaseReducer(caseDataReducer) {
  if ("reducer" in caseDataReducer) {
    return {
      reducer: (state, action) => {
        const draftData = caseDataReducer.reducer(state.data, action.payload);
        if (draftData !== void 0) {
          state.data = draftData;
          return state;
        }
      },
      prepare: caseDataReducer.prepare
    };
  } else {
    return (state, action) => {
      const draftData = caseDataReducer(state.data, action.payload);
      if (draftData !== void 0) {
        state.data = draftData;
        return state;
      }
    };
  }
}
function getAsyncReducerName(reducerName, asyncType) {
  return `${reducerName}${asyncType[0].toUpperCase() + asyncType.slice(1)}`;
}
function extractCaseReducer(maybeReducerWithPrepare) {
  let caseReducer;
  let prepareCallback;
  if ("reducer" in maybeReducerWithPrepare) {
    caseReducer = maybeReducerWithPrepare.reducer;
    prepareCallback = maybeReducerWithPrepare.prepare;
  } else {
    caseReducer = maybeReducerWithPrepare;
  }
  return { caseReducer, prepareCallback };
}
function getType(name, actionKey) {
  return `${name}/${actionKey}`;
}
function createActions(name, reducers) {
  if (!name) {
    throw new Error("`name` is a required");
  }
  const reducerNames = Object.keys(reducers);
  const caseReducers = {};
  const actions = {};
  reducerNames.forEach((reducerName) => {
    const maybeAsyncReducer = reducers[reducerName];
    const type = getType(name, reducerName);
    if ("fulfilled" in maybeAsyncReducer) {
      Object.keys(maybeAsyncReducer).forEach((key) => {
        const asyncType = key;
        const asyncReducerName = getAsyncReducerName(reducerName, asyncType);
        const asyncReducerType = getType(name, asyncReducerName);
        const asyncFullNameReducer = maybeAsyncReducer[asyncType];
        if (asyncFullNameReducer) {
          const { caseReducer, prepareCallback } = extractCaseReducer(convertToCaseReducer(asyncFullNameReducer));
          caseReducers[asyncReducerType] = caseReducer;
          actions[asyncReducerName] = prepareCallback ? createAction(asyncReducerType, prepareCallback) : createAction(asyncReducerType);
        }
      });
    } else {
      const { caseReducer, prepareCallback } = extractCaseReducer(convertToCaseReducer(maybeAsyncReducer));
      caseReducers[type] = caseReducer;
      actions[reducerName] = prepareCallback ? createAction(type, prepareCallback) : createAction(type);
    }
  });
  return { actions, caseReducers };
}
function converter(name, reducers) {
  return createActions(name, reducers);
}

// lib/createReducerActions.ts
import { useDispatch } from "https://esm.sh/react-redux";
function isFunction(x) {
  return typeof x === "function";
}
function getActionHookName(actionName) {
  return `useAction${actionName[0].toUpperCase() + actionName.slice(1)}`;
}
function createActionHooksFromActions(actions) {
  const actionHooks = {};
  Object.keys(actions).forEach((actionName) => {
    const action = actions[actionName];
    const actionHookName = getActionHookName(actionName);
    actionHooks[actionHookName] = (payload) => {
      const dispatch = useDispatch();
      const payloadAction = action(payload);
      return dispatch(payloadAction);
    };
  });
  return actionHooks;
}
var setResourceStatusReducerName = "_setResourceStatus";
function setResourceStatusCaseReducer(state, action) {
  Object.assign(state.status, action.payload);
}
function createReducerActions(name, initialData, reducers) {
  const initialState = {
    data: isFunction(initialData) ? initialData() : initialData,
    status: {}
  };
  const { actions, caseReducers } = converter(name, reducers);
  const setResourceStatusType = getType(name, setResourceStatusReducerName);
  caseReducers[setResourceStatusType] = setResourceStatusCaseReducer;
  actions[setResourceStatusReducerName] = createAction(setResourceStatusType);
  const reducer = createReducer(initialState, caseReducers);
  return {
    name,
    reducer,
    actions
  };
}

// lib/createThunkActions.ts
import { useDispatch as useDispatch2 } from "https://esm.sh/react-redux";
import { useMemo } from "https://esm.sh/react";

// lib/core/createThunkActions.ts
function normalizeThunkCallback(thunkCallback) {
  let pendingThunkCallback;
  let fulfilledThunkCallback;
  let rejectedThunkCallback;
  if ("fulfilled" in thunkCallback) {
    pendingThunkCallback = thunkCallback["pending"];
    fulfilledThunkCallback = thunkCallback["fulfilled"];
    rejectedThunkCallback = thunkCallback["rejected"];
  } else {
    fulfilledThunkCallback = thunkCallback;
  }
  return {
    pending: pendingThunkCallback,
    fulfilled: fulfilledThunkCallback,
    rejected: rejectedThunkCallback
  };
}
function combineTwoThunkCallbacks(first, second) {
  return first && second ? (dispatch, payloadOrError) => {
    first(dispatch, payloadOrError);
    second(dispatch, payloadOrError);
  } : first || second;
}
function combineThunkCallbacks(...thunkCallbacks) {
  return thunkCallbacks.length > 0 ? thunkCallbacks.reduce((prev, next) => {
    const prevThunkCallback = normalizeThunkCallback(prev);
    const nextThunkCallback = normalizeThunkCallback(next);
    const resultThunkCallback = {
      pending: combineTwoThunkCallbacks(prevThunkCallback.pending, nextThunkCallback.pending),
      fulfilled: combineTwoThunkCallbacks(prevThunkCallback.fulfilled, nextThunkCallback.fulfilled),
      rejected: combineTwoThunkCallbacks(prevThunkCallback.rejected, nextThunkCallback.rejected)
    };
    return resultThunkCallback;
  }) : {};
}
function actionToThunkCallBack(action) {
  return (dispatch, payloadOrError) => {
    dispatch(action(payloadOrError));
  };
}
function createThunkActions(thunks, actions = {}) {
  const thunkActions = {};
  Object.keys(thunks).forEach((thunkName) => {
    const thunk = thunks[thunkName];
    const actionThunkCallbacks = {};
    const pendingActionName = `${thunkName}Pending`;
    const fulfilledActionName = `${thunkName}Fulfilled`;
    const rejectedActionName = `${thunkName}Rejected`;
    if (thunkName in actions || fulfilledActionName in actions) {
      const action = actions[thunkName];
      const pendingAction = actions[pendingActionName];
      const fulfilledAction = actions[fulfilledActionName];
      const rejectedAction = actions[rejectedActionName];
      const actionThunkCallback = action ? actionToThunkCallBack(action) : {
        pending: pendingAction ? actionToThunkCallBack(pendingAction) : void 0,
        fulfilled: actionToThunkCallBack(fulfilledAction),
        rejected: rejectedAction ? actionToThunkCallBack(rejectedAction) : void 0
      };
      actionThunkCallbacks[thunkName] = actionThunkCallback;
    }
    thunkActions[thunkName] = (query, thunkCallback) => async (dispatch) => {
      const actionThunkCallback = actionThunkCallbacks[thunkName];
      const thunkCallbacks = [actionThunkCallback, thunkCallback].filter((v) => !!v);
      const finalThunkCallback = combineThunkCallbacks(...thunkCallbacks);
      const { pending, fulfilled, rejected } = finalThunkCallback;
      if (pending)
        pending(dispatch);
      try {
        const result = await thunk(query);
        if (fulfilled)
          fulfilled(dispatch, result);
        return result;
      } catch (error) {
        if (rejected) {
          rejected(dispatch, error);
        } else {
          throw error;
        }
      }
    };
  });
  return thunkActions;
}

// lib/createThunkActions.ts
function getThunkHookName(thunkName) {
  return `useThunk${thunkName[0].toUpperCase() + thunkName.slice(1)}`;
}
function isFunction2(x) {
  return typeof x === "function";
}
function createThunkHooksFromThunkActions(thunkActions) {
  const thunkHooks = {};
  Object.keys(thunkActions).forEach((actionName) => {
    const thunkAction = thunkActions[actionName];
    const actionHookName = getThunkHookName(actionName);
    thunkHooks[actionHookName] = (query, thunkCallback, deps) => {
      const dispatch = useDispatch2();
      let finalThunkCallback;
      if (isFunction2(thunkCallback)) {
        finalThunkCallback = thunkCallback;
      } else if (!deps && Array.isArray(thunkCallback)) {
        deps = thunkCallback;
      }
      return useMemo(() => thunkAction(query, finalThunkCallback)(dispatch), deps);
    };
  });
  return thunkHooks;
}

// lib/createSelectorHooks.ts
import { useSelector } from "https://esm.sh/react-redux";
import { useMemo as useMemo2 } from "https://esm.sh/react";

// lib/core/createSelectors.ts
import proxyMemoize from "https://esm.sh/proxy-memoize";
function memoize(fn, options) {
  return proxyMemoize(fn, options);
}
function memoizeWithArgs(fnWithArgs, options) {
  const fn = proxyMemoize((args) => fnWithArgs(...args), options);
  return (...args) => fn(args);
}
function createSelector(caseSelector) {
  return memoize(caseSelector);
}
function createSelectors(caseSelectors) {
  const selectorNames = Object.keys(caseSelectors);
  const selectors = {};
  selectorNames.forEach((selectorName) => {
    const caseSelector = caseSelectors[selectorName];
    selectors[selectorName] = createSelector(caseSelector);
  });
  return selectors;
}

// lib/converter/selectorConverter.ts
function converter2(name, dataSelectors) {
  const selectorNames = Object.keys(dataSelectors);
  const selectors = {};
  selectorNames.forEach((selectorName) => {
    const dataSelector = dataSelectors[selectorName];
    selectors[selectorName] = (state) => dataSelector(state[name]?.data);
  });
  return selectors;
}

// lib/createSelectorHooks.ts
function getSelectorHookName(selectorName) {
  return `useSelector${selectorName[0].toUpperCase() + selectorName.slice(1)}`;
}
function makeSelector(selector, selectorTransformer) {
  return (state) => selectorTransformer(selector(state));
}
var getResourceStatusSelectorName = "_getResourceStatus";
function makeGetResourceStatusSelector(name) {
  return (state) => state[name]?.status;
}
function createSelectors2(name, dataSelectors) {
  const selectors = createSelectors(converter2(name, dataSelectors));
  selectors[getResourceStatusSelectorName] = makeGetResourceStatusSelector(name);
  return selectors;
}
function createSelectorHooksFromSelectors(selectors) {
  const selectorHooks = {};
  Object.keys(selectors).forEach((selectorName) => {
    const selector = selectors[selectorName];
    const selectorHookName = getSelectorHookName(selectorName);
    selectorHooks[selectorHookName] = (selectorTransformer, deps) => {
      const finalSelector = selectorTransformer && deps ? useMemo2(() => makeSelector(selector, memoizeWithArgs(selectorTransformer)), deps) : selectorTransformer ? makeSelector(selector, selectorTransformer) : selector;
      return useSelector(finalSelector);
    };
  });
  return selectorHooks;
}

// lib/createResourceHooks.ts
import { useSelector as useSelector2, useDispatch as useDispatch3, shallowEqual } from "https://esm.sh/react-redux";
var HookType;
(function(HookType2) {
  HookType2["RESOURCE"] = "useResource";
  HookType2["SUSPENSE"] = "useSuspense";
  HookType2["ERROR_SUSPENSE"] = "useErrorSuspense";
  HookType2["STATUS"] = "useStatus";
})(HookType || (HookType = {}));
function getResourceHookName(resourceName, hookType = HookType.RESOURCE) {
  const prefix = hookType.toString();
  return `${prefix}${resourceName[0].toUpperCase() + resourceName.slice(1)}`;
}
var initialStatus = {
  deps: void 0,
  isLoading: false,
  isLoaded: false,
  isFetching: false,
  isSuccess: false,
  isError: false,
  error: void 0
};
function makeStatusSelector(getResourceStatus, resourceName) {
  return (state) => {
    const resourceStatus = getResourceStatus(state);
    return resourceStatus ? resourceStatus[resourceName] : initialStatus;
  };
}
function makeStatusAction(setResourceStatus, resourceName) {
  return (payload) => setResourceStatus({ [resourceName]: payload });
}
function makeResourceHook(selector, statusSelector, statusAction, thunkAction) {
  return (query, deps, hookType = HookType.RESOURCE) => {
    const dispatch = useDispatch3();
    const data = useSelector2(selector);
    const status = useSelector2(statusSelector);
    if (hookType === HookType.STATUS)
      return status;
    const { deps: statusDeps, isLoaded, isFetching } = status;
    if (thunkAction && !isFetching && (deps !== void 0 && !shallowEqual(statusDeps, deps) || !isLoaded)) {
      const resultPromise = thunkAction(query, {
        pending: (dispatch2) => {
          const payload = { isFetching: true };
          if (!isLoaded)
            payload.isLoading = true;
          dispatch2(statusAction(payload));
        },
        fulfilled: (dispatch2) => {
          const payload = {
            isFetching: false,
            isSuccess: true,
            isError: false,
            error: void 0
          };
          if (!isLoaded) {
            payload.isLoading = false;
            payload.isLoaded = true;
          }
          if (deps !== void 0)
            payload.deps = deps;
          dispatch2(statusAction(payload));
        },
        rejected: (dispatch2, error) => {
          const payload = {
            isFetching: false,
            isSuccess: false,
            isError: true,
            error
          };
          if (!isLoaded) {
            payload.isLoading = false;
            payload.isLoaded = false;
          }
          dispatch2(statusAction(payload));
          if (hookType === HookType.ERROR_SUSPENSE)
            throw error;
        }
      })(dispatch);
      if (hookType === HookType.SUSPENSE || hookType === HookType.ERROR_SUSPENSE)
        throw resultPromise;
    }
    return hookType === HookType.RESOURCE ? { data, ...status } : data;
  };
}
function createResourceHooks(resources, selectors, thunkActions, getResourceStatus, setResourceStatus) {
  const resourceHooks = {};
  Object.keys(resources).forEach((resourceName) => {
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

// lib/createHooksSlice.ts
function createHooksSlice(options) {
  const {
    name: optionName,
    initialData,
    reducers,
    thunks,
    selectors: dataSelectors,
    resources
  } = options;
  const { name, reducer, actions } = createReducerActions(optionName, initialData, reducers);
  const thunkActions = {};
  const selectors = {};
  const actionHooks = createActionHooksFromActions(actions);
  const hooks = { ...actionHooks };
  if (thunks) {
    Object.assign(thunkActions, createThunkActions(thunks, actions));
    const thunkHooks = createThunkHooksFromThunkActions(thunkActions);
    Object.assign(hooks, thunkHooks);
  }
  if (dataSelectors) {
    Object.assign(selectors, createSelectors2(name, dataSelectors));
    const selectorHooks = createSelectorHooksFromSelectors(selectors);
    Object.assign(hooks, selectorHooks);
  }
  if (resources) {
    const getResourceStatus = selectors[getResourceStatusSelectorName];
    const setResourceStatus = actions[setResourceStatusReducerName];
    const resourceHooks = createResourceHooks(resources, selectors, thunkActions, getResourceStatus, setResourceStatus);
    Object.assign(hooks, resourceHooks);
  }
  return { name, reducer, actions, thunkActions, selectors, hooks };
}
export {
  createHooksSlice as default
};
