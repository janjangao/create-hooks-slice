import type { PayloadAction, ActionCreator, ActionCreators, CaseDataReducers, DataState } from "./converter/reducerConverter.ts";
import reducerConverter, { getType, createAction, createReducer } from "./converter/reducerConverter.ts";
import { useDispatch } from "https://esm.sh/react-redux";
export type { PayloadAction, ActionCreator, ActionCreators, CaseDataReducers };
export type StatusProps = {
  deps?: unknown[];
  isLoading?: boolean;
  isLoaded?: boolean;
  isFetching?: boolean;
  isSuccess?: boolean;
  isError?: boolean;
  error?: unknown;
};
export type Status = {
  [key: string]: StatusProps;
};
export interface DataStatusState<Data = unknown> extends DataState<Data> {
  status: Status;
}
export type ActionHook<Payload = unknown> = (payload?: Payload) => PayloadAction<Payload>;
export type ActionHooks<Payload = unknown> = {
  [key: string]: ActionHook<Payload>;
};

function isFunction<S>(x: unknown): x is () => S {
  return typeof x === "function";
}

function getActionHookName(actionName: string): string {
  return `useAction${actionName[0].toUpperCase() + actionName.slice(1)}`;
}

export function createActionHooksFromActions(actions: ActionCreators) {
  const actionHooks: ActionHooks = {};
  Object.keys(actions).forEach(actionName => {
    const action = actions[actionName];
    const actionHookName = getActionHookName(actionName);

    actionHooks[actionHookName] = (payload?: unknown) => {
      const dispatch = useDispatch();
      const payloadAction = action(payload);
      return dispatch(payloadAction);
    };
  });
  return actionHooks;
}
export const setResourceStatusReducerName = "_setResourceStatus";

function setResourceStatusCaseReducer(state: DataStatusState<unknown>, action: PayloadAction<unknown>) {
  Object.assign(state.status, action.payload);
}

export default function createReducerActions<Data = unknown, Name extends string = string>(name: Name, initialData: Data | (() => Data), reducers: CaseDataReducers<Data>) {
  const initialState: DataStatusState<Data> = {
    data: isFunction(initialData) ? initialData() : initialData,
    status: {}
  };
  const {
    actions,
    caseReducers
  } = reducerConverter<Data, DataStatusState<Data>, Name>(name, reducers); // add internal setResourceStatus reducer

  const setResourceStatusType = getType(name, setResourceStatusReducerName);
  caseReducers[setResourceStatusType] = setResourceStatusCaseReducer;
  actions[setResourceStatusReducerName] = createAction(setResourceStatusType);
  const reducer = createReducer<DataStatusState<Data>, PayloadAction>(initialState, caseReducers);
  return {
    name,
    reducer,
    actions
  };
}