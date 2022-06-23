import type { Reducer } from "https://esm.sh/redux";
import type { CaseDataReducers, DataStatusState, ActionCreators, PayloadAction, ActionHook, Status } from "./createReducerActions.ts";
import createReducerActions, { createActionHooksFromActions, setResourceStatusReducerName } from "./createReducerActions.ts";
import type { CaseQueryThunks, ThunkActions, ThunkHook } from "./createThunkActions.ts";
import createThunkActions, { createThunkHooksFromThunkActions } from "./createThunkActions.ts";
import type { CaseDataSelectors, Selectors, Selector, SelectorHook } from "./createSelectorHooks.ts";
import { createSelectors, createSelectorHooksFromSelectors, getResourceStatusSelectorName } from "./createSelectorHooks.ts";
import type { CaseQueryResources, ResourceHook } from "./createResourceHooks.ts";
import createResourceHooks from "./createResourceHooks.ts";
export type CreateHooksSliceOptions<Data = unknown, Name extends string = string> = {
  name: Name;
  initialData: Data | (() => Data);
  reducers: CaseDataReducers<Data>;
  thunks?: CaseQueryThunks;
  selectors?: CaseDataSelectors<Data>;
  resources?: CaseQueryResources;
};
export type HooksSlice<State = unknown, Name extends string = string> = {
  name: Name;
  reducer: Reducer<State, PayloadAction>;
  actions: ActionCreators;
  thunkActions: ThunkActions;
  selectors: Selectors<State>;
  hooks: {
    [key: string]: ActionHook | ThunkHook | SelectorHook | ResourceHook;
  };
};
export default function createHooksSlice<Data, Name extends string = string>(options: CreateHooksSliceOptions<Data, Name>): HooksSlice<DataStatusState<Data>> {
  const {
    name: optionName,
    initialData,
    reducers,
    thunks,
    selectors: dataSelectors,
    resources
  } = options;
  const {
    name,
    reducer,
    actions
  } = createReducerActions<Data>(optionName, initialData, reducers);
  const thunkActions: ThunkActions = {};
  const selectors: Selectors = {};
  const actionHooks = createActionHooksFromActions(actions);
  const hooks = { ...actionHooks
  };

  if (thunks) {
    Object.assign(thunkActions, createThunkActions(thunks, actions));
    const thunkHooks = createThunkHooksFromThunkActions(thunkActions);
    Object.assign(hooks, thunkHooks);
  }

  if (dataSelectors) {
    Object.assign(selectors, createSelectors(name, dataSelectors));
    const selectorHooks = createSelectorHooksFromSelectors(selectors);
    Object.assign(hooks, selectorHooks);
  }

  if (resources) {
    const getResourceStatus = (selectors[getResourceStatusSelectorName] as Selector<unknown, Status>);
    const setResourceStatus = actions[setResourceStatusReducerName];
    const resourceHooks = createResourceHooks(resources, selectors, thunkActions, getResourceStatus, setResourceStatus);
    Object.assign(hooks, resourceHooks);
  }

  return {
    name,
    reducer,
    actions,
    thunkActions,
    selectors,
    hooks
  };
}