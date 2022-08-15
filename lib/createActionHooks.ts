import { useDispatch } from "react-redux";
import type { CaseDataReducers, DataState } from "./core/createActions.ts";
import createActions, { getType } from "./core/createActions.ts";
import type {
  ActionCreatorOptionalPayload,
  ActionCreator,
  ActionCreators,
  PayloadAction,
} from "./core/createAction.ts";
import createAction from "./core/createAction.ts";
import createReducer from "./core/createReducer.ts";

export type StatusProps = {
  deps?: any[];
  isLoading?: boolean;
  isLoaded?: boolean;
  isFetching?: boolean;
  isSuccess?: boolean;
  isError?: boolean;
  error?: any;
};

export type Status = {
  [key: string]: StatusProps;
};

export interface DataStatusState<Data> extends DataState<Data> {
  status: Status;
}

export type ActionHook<AC extends ActionCreatorOptionalPayload<any>> =
  AC extends () => infer Result
    ? () => () => Result
    : AC extends (payload: infer Payload) => infer Result
    ? <HookPayload extends Payload | undefined>(
        hookPayload?: HookPayload
      ) => HookPayload extends undefined
        ? (payload: Payload) => Result
        : (payload?: Payload) => Result
    : never;

export type ActionHooks<ACS extends ActionCreators> = {
  [Key in keyof ACS as `useAction${Capitalize<Key & string>}`]: ActionHook<
    ACS[Key]
  >;
};

function isFunction<S>(x: any): x is () => S {
  return typeof x === "function";
}

type SetResourceStatusReducers<Name> = {
  [Key in keyof any as `${Name &
    string}/_setResourceStatus`]: typeof setResourceStatusCaseReducer;
};

type SetResourceStatusActions = {
  _setResourceStatus: ActionCreator<Status>;
};

export const setResourceStatusReducerName = "_setResourceStatus";

function setResourceStatusCaseReducer(
  state: DataStatusState<any>,
  action: PayloadAction<Status>
) {
  if (action.payload) {
    const actionPayload = action.payload;
    Object.keys(action.payload).forEach((thunkName) => {
      const resourceStatus = actionPayload[thunkName];
      if (state.status[thunkName]) {
        Object.assign(state.status[thunkName], resourceStatus);
      } else {
        state.status[thunkName] = resourceStatus;
      }
    });
  }
}

export function createReducerActions<
  Data = any,
  Name extends string = string,
  CDRS extends CaseDataReducers<Data> = CaseDataReducers<Data>
>(name: Name, initialData: Data | (() => Data), reducers: CDRS) {
  const initialState: DataStatusState<Data> = {
    data: isFunction(initialData) ? initialData() : initialData,
    status: {},
  };

  const { actions, caseReducers } = createActions<
    Data,
    DataStatusState<Data>,
    Name,
    CDRS
  >(name, reducers);

  const setResourceStatusType = getType(name, setResourceStatusReducerName);
  // add internal setResourceStatus reducer
  const setResourceStatusReducers: SetResourceStatusReducers<Name> = {
    [setResourceStatusType]: setResourceStatusCaseReducer,
  };
  const finalCaseReducers = {
    ...caseReducers,
    ...setResourceStatusReducers,
  };

  // add internal setResourceStatus action
  const setResourceStatusActions: SetResourceStatusActions = {
    [setResourceStatusReducerName]: createAction<Status>(setResourceStatusType),
  };
  const finalActions = {
    ...actions,
    ...setResourceStatusActions,
  };

  const reducer = createReducer<DataStatusState<Data>>(
    initialState,
    finalCaseReducers
  );

  return {
    name,
    reducer,
    caseReducers: finalCaseReducers,
    actions: finalActions,
  };
}

function getActionHookName(actionName: string): string {
  return `useAction${actionName[0].toUpperCase() + actionName.slice(1)}`;
}

export default function createActionHooks<
  ACS extends ActionCreators = ActionCreators
>(actions: ACS) {
  const actionHooks: { [k: string]: any } = {};
  Object.keys(actions).forEach((actionName) => {
    const action = actions[actionName];
    const actionHookName = getActionHookName(actionName);
    const useActionHook = (hookPayload?: any) => {
      const dispatch = useDispatch();
      return (payload?: any) => {
        if (payload === undefined && hookPayload !== undefined)
          payload = hookPayload;
        const payloadAction = action(payload);
        return dispatch(payloadAction);
      };
    };
    actionHooks[actionHookName] = useActionHook;
  });
  return actionHooks as ActionHooks<ACS>;
}
