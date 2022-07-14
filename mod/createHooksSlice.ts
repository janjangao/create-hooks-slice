import type { CaseDataReducers } from "./core/createActions.ts";
import createActionHooks, { createReducerActions, setResourceStatusReducerName } from "./createActionHooks.ts";
import type { CaseQueryThunks, ThunkActions } from "./core/createThunkActions.ts";
import type { ThunkHooks } from "./createThunkHooks.ts";
import createThunkHooks, { createThunkActions } from "./createThunkHooks.ts";
import type { CaseDataSelectors, Selectors, SelectorHooks } from "./createSelectorHooks.ts";
import createSelectorHooks, { createSelectors, getResourceStatusSelectorName } from "./createSelectorHooks.ts";
import type { CaseQueryResources, ResourceHooks } from "./createResourceHooks.ts";
import createResourceHooks from "./createResourceHooks.ts";
export type CreateHooksSliceOptions<Name, Data, CaseDataReducers, CaseQueryThunks, CaseDataSelectors, CaseQueryResources> = {
  name: Name;
  initialData: Data | (() => Data);
  reducers: CaseDataReducers;
  thunks?: CaseQueryThunks;
  selectors?: CaseDataSelectors;
  resources?: CaseQueryResources;
};
export default function createHooksSlice<Name extends string = string, Data = any, CDRS extends CaseDataReducers<Data> = CaseDataReducers<Data>, CQTS extends CaseQueryThunks = CaseQueryThunks, CDSS extends CaseDataSelectors<Data> = CaseDataSelectors<Data>, CQRS extends CaseQueryResources = CaseQueryResources>(options: CreateHooksSliceOptions<Name, Data, CDRS, CQTS, CDSS, CQRS>) {
  const {
    name: optionName,
    initialData,
    reducers,
    thunks,
    selectors: caseDataSelectors,
    resources
  } = options;
  const {
    name,
    reducer,
    caseReducers,
    actions
  } = createReducerActions(optionName, initialData, reducers);
  const actionHooks = createActionHooks(actions);
  let thunkActions = ({} as ThunkActions<CQTS>);
  let thunkHooks = ({} as ThunkHooks<typeof thunkActions>);
  let selectors = ({} as Selectors<Data, CDSS>);
  let selectorHooks = ({} as SelectorHooks<typeof selectors>);
  let resourceHooks = ({} as ResourceHooks<CQRS, typeof selectors, typeof thunkActions>);

  if (thunks) {
    thunkActions = createThunkActions(thunks, actions);
    thunkHooks = createThunkHooks(thunkActions);
  }

  if (caseDataSelectors) {
    selectors = createSelectors(name, caseDataSelectors);
    selectorHooks = createSelectorHooks(selectors);
  }

  if (resources) {
    const getResourceStatus = selectors[getResourceStatusSelectorName];
    const setResourceStatus = actions[setResourceStatusReducerName];
    resourceHooks = createResourceHooks(resources, selectors, thunkActions, getResourceStatus, setResourceStatus);
  }

  const hooks = { ...actionHooks,
    ...thunkHooks,
    ...selectorHooks,
    ...resourceHooks
  };
  return {
    name,
    reducer,
    caseReducers,
    actions,
    thunkActions,
    selectors,
    hooks
  };
}