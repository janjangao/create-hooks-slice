import type { Draft } from "immer";
import type {
  PrepareAction,
  PayloadAction,
  ActionCreator,
  ActionCreators,
} from "../core/createAction.ts";
import createAction from "../core/createAction.ts";
import type { CaseReducer, CaseReducers } from "../core/createReducer.ts";
import createReducer from "../core/createReducer.ts";

export type { PayloadAction, ActionCreator, ActionCreators };

export { createAction, createReducer };

export type CaseDataReducer<Data = unknown, Payload = unknown> = (
  data: Data | Draft<Data>,
  payload: Payload
) => Data | void | Draft<Data>;

export type CaseDataReducerWithPrepare<Data, Payload = unknown> = {
  reducer: CaseDataReducer<Data>;
  prepare?: PrepareAction<Payload>;
};

export type SyncCaseDataReducer<Data = unknown, Payload = unknown> =
  | CaseDataReducer<Data, Payload>
  | CaseDataReducerWithPrepare<Data, Payload>;

export type AsyncCaseDataReducer<Data = unknown, Payload = unknown> = {
  pending?: SyncCaseDataReducer<Data, Payload>;
  fulfilled: SyncCaseDataReducer<Data, Payload>;
  rejected?: SyncCaseDataReducer<Data, Payload>;
};

export type CaseDataReducers<Data = unknown, Payload = unknown> = {
  [key: string]:
    | SyncCaseDataReducer<Data, Payload>
    | AsyncCaseDataReducer<Data, Payload>;
};

export type DataState<Data = unknown> = {
  data: Data;
};

export type CaseReducerWithPrepare<State, Payload = unknown> = {
  reducer: CaseReducer<State, PayloadAction<Payload>>;
  prepare?: PrepareAction<Payload>;
};

export type SyncCaseReducer<State, Payload = unknown> =
  | CaseReducer<State, PayloadAction<Payload>>
  | CaseReducerWithPrepare<State, Payload>;

function convertToCaseReducer<
  Data,
  State extends DataState<Data> = DataState<Data>,
  Payload = unknown
>(
  caseDataReducer: SyncCaseDataReducer<Data, Payload>
): SyncCaseReducer<State, Payload> {
  if ("reducer" in caseDataReducer) {
    return {
      reducer: (state, action) => {
        const draftData = caseDataReducer.reducer(state.data, action.payload);
        if (draftData !== undefined) {
          state.data = draftData;
          return state;
        }
      },
      prepare: caseDataReducer.prepare,
    };
  } else {
    return (state, action: PayloadAction<Payload>) => {
      const draftData = caseDataReducer(state.data, action.payload);
      if (draftData !== undefined) {
        state.data = draftData;
        return state;
      }
    };
  }
}

function getAsyncReducerName(reducerName: string, asyncType: string): string {
  return `${reducerName}${asyncType[0].toUpperCase() + asyncType.slice(1)}`;
}

function extractCaseReducer<State>(
  maybeReducerWithPrepare: SyncCaseReducer<State>
) {
  let caseReducer: CaseReducer<State, PayloadAction<unknown>>;
  let prepareCallback: PrepareAction<unknown> | undefined;

  if ("reducer" in maybeReducerWithPrepare) {
    caseReducer = maybeReducerWithPrepare.reducer;
    prepareCallback = maybeReducerWithPrepare.prepare;
  } else {
    caseReducer = maybeReducerWithPrepare;
  }
  return { caseReducer, prepareCallback };
}

export function getType(name: string, actionKey: string): string {
  return `${name}/${actionKey}`;
}

export function createActions<
  Data = unknown,
  State extends DataState<Data> = DataState<Data>,
  Name extends string = string
>(name: Name, reducers: CaseDataReducers<Data>) {
  if (!name) {
    throw new Error("`name` is a required");
  }

  const reducerNames = Object.keys(reducers);

  const caseReducers: CaseReducers<State, PayloadAction> = {};
  const actions: ActionCreators = {};

  reducerNames.forEach((reducerName) => {
    const maybeAsyncReducer = reducers[reducerName];
    const type = getType(name, reducerName);

    if ("fulfilled" in maybeAsyncReducer) {
      Object.keys(maybeAsyncReducer).forEach((key) => {
        const asyncType = key as keyof AsyncCaseDataReducer;
        const asyncReducerName = getAsyncReducerName(reducerName, asyncType);
        const asyncFullNameReducer = maybeAsyncReducer[asyncType];
        if (asyncFullNameReducer) {
          const { caseReducer, prepareCallback } = extractCaseReducer<State>(
            convertToCaseReducer(asyncFullNameReducer)
          );
          caseReducers[type] = caseReducer;
          actions[asyncReducerName] = prepareCallback
            ? createAction(type, prepareCallback)
            : createAction(type);
        }
      });
    } else {
      const { caseReducer, prepareCallback } = extractCaseReducer<State>(
        convertToCaseReducer(maybeAsyncReducer)
      );
      caseReducers[type] = caseReducer;
      actions[reducerName] = prepareCallback
        ? createAction(type, prepareCallback)
        : createAction(type);
    }
  });

  return { actions, caseReducers };
}

export default function converter<
  Data = unknown,
  State extends DataState<Data> = DataState<Data>,
  Name extends string = string
>(name: Name, reducers: CaseDataReducers<Data>) {
  return createActions<Data, State, Name>(name, reducers);
}
