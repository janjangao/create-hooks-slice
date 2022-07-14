import type { Draft } from "immer";
import type {
  PrepareAction,
  PayloadAction,
  ActionCreatorOptionalPayload,
} from "./createAction.ts";
import createAction from "./createAction.ts";
import type { CaseReducer } from "./createReducer.ts";

export type UnionToIntersection<T> = (
  T extends any ? (args: T) => void : never
) extends (args: infer R) => void
  ? R
  : never;

export type CaseDataReducer<Data, Payload> = (
  data: Data | Draft<Data>,
  payload?: Payload
) => Data | void | Draft<Data>;

export type CaseDataReducerWithPrepare<Data, Payload, PreparedPayload> = {
  reducer: CaseDataReducer<Data, PreparedPayload>;
  prepare: PrepareAction<Payload, PreparedPayload>;
};

export type SyncCaseDataReducer<Data, Payload> =
  | CaseDataReducer<Data, Payload>
  | CaseDataReducerWithPrepare<Data, Payload, any>;

export type AsyncCaseDataReducer<Data, Payload> = {
  pending?: SyncCaseDataReducer<Data, Payload>;
  fulfilled: SyncCaseDataReducer<Data, Payload>;
  rejected?: SyncCaseDataReducer<Data, Payload>;
};

export type CaseDataReducers<Data> = {
  [key: string]:
    | SyncCaseDataReducer<Data, any>
    | AsyncCaseDataReducer<Data, any>;
};

export type DataState<Data> = {
  data: Data;
};

export type CaseReducerWithPrepare<State, Payload> = {
  reducer: CaseReducer<State, PayloadAction<Payload>>;
  prepare?: PrepareAction<Payload, any>;
};

export type SyncCaseReducer<State, Payload> =
  | CaseReducer<State, PayloadAction<Payload>>
  | CaseReducerWithPrepare<State, Payload>;

type UnpackedPayloadFromCaseDataReducer<CDR extends CaseDataReducer<any, any>> =
  CDR extends (data: any) => any
    ? undefined
    : CDR extends (data: any, payload: infer Payload) => any
    ? Payload
    : never;

type UnpackedPayloadFromCaseDataReducerWithPrepare<
  CDRWP extends CaseDataReducerWithPrepare<any, any, any>
> = CDRWP["prepare"] extends () => any
  ? undefined
  : CDRWP["prepare"] extends (payload: infer Payload) => any
  ? Payload
  : never;

type UnpackedPreparedPayloadFromCaseDataReducerWithPrepare<
  CDRWP extends CaseDataReducerWithPrepare<any, any, any>
> = CDRWP["prepare"] extends (...args: any[]) => { payload: infer Payload }
  ? Payload
  : never;

type SyncCaseDataReducerToCaseReducers<
  Name,
  Data,
  State extends DataState<Data>,
  Key extends string | number | symbol,
  SCDR extends SyncCaseDataReducer<Data, any>
> = SCDR extends CaseDataReducer<Data, any>
  ? {
      [TKey in Key as `${Name & string}/${TKey & string}`]: CaseReducer<
        State,
        PayloadAction<UnpackedPayloadFromCaseDataReducer<SCDR>>
      >;
    }
  : SCDR extends CaseDataReducerWithPrepare<Data, any, any>
  ? {
      [TKey in Key as `${Name & string}/${TKey & string}`]: CaseReducer<
        State,
        PayloadAction<
          UnpackedPreparedPayloadFromCaseDataReducerWithPrepare<SCDR>
        >
      >;
    }
  : never;

type AsyncCaseDataReducerToCaseReducers<
  Name,
  Data,
  State extends DataState<Data>,
  Key extends string | number | symbol,
  ACDR extends AsyncCaseDataReducer<Data, any>
> = UnionToIntersection<
  {
    [Suffix in keyof ACDR]: ACDR[Suffix] extends SyncCaseDataReducer<Data, any>
      ? SyncCaseDataReducerToCaseReducers<
          Name,
          Data,
          State,
          `${Key & string}${Capitalize<Suffix & string>}`,
          ACDR[Suffix]
        >
      : never;
  }[keyof ACDR]
>;

type CaseReducers<
  Name,
  Data,
  State extends DataState<Data>,
  CDRS extends CaseDataReducers<Data>
> = UnionToIntersection<
  {
    [Key in keyof CDRS]: CDRS[Key] extends SyncCaseDataReducer<Data, any>
      ? SyncCaseDataReducerToCaseReducers<Name, Data, State, Key, CDRS[Key]>
      : CDRS[Key] extends AsyncCaseDataReducer<Data, any>
      ? AsyncCaseDataReducerToCaseReducers<Name, Data, State, Key, CDRS[Key]>
      : never;
  }[keyof CDRS]
>;

type SyncCaseDataReducerToActionCreators<
  Key extends string | number | symbol,
  SCDR extends SyncCaseDataReducer<any, any>
> = SCDR extends CaseDataReducer<any, any>
  ? {
      [TKey in Key]: ActionCreatorOptionalPayload<
        UnpackedPayloadFromCaseDataReducer<SCDR>
      >;
    }
  : SCDR extends CaseDataReducerWithPrepare<any, any, any>
  ? {
      [TKey in Key]: ActionCreatorOptionalPayload<
        UnpackedPayloadFromCaseDataReducerWithPrepare<SCDR>
      >;
    }
  : never;

type AsyncCaseDataReducerToActionCreators<
  Key extends string | number | symbol,
  ACDR extends AsyncCaseDataReducer<any, any>
> = UnionToIntersection<
  {
    [Suffix in keyof ACDR]: ACDR[Suffix] extends SyncCaseDataReducer<any, any>
      ? SyncCaseDataReducerToActionCreators<
          `${Key & string}${Capitalize<Suffix & string>}`,
          ACDR[Suffix]
        >
      : never;
  }[keyof ACDR]
>;

type ActionCreators<CDRS extends CaseDataReducers<any>> = UnionToIntersection<
  {
    [Key in keyof CDRS]: CDRS[Key] extends SyncCaseDataReducer<any, any>
      ? SyncCaseDataReducerToActionCreators<Key, CDRS[Key]>
      : CDRS[Key] extends AsyncCaseDataReducer<any, any>
      ? AsyncCaseDataReducerToActionCreators<Key, CDRS[Key]>
      : never;
  }[keyof CDRS]
>;

function convertToCaseReducer<
  Data,
  Payload,
  State extends DataState<Data> = DataState<Data>
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

function extractCaseReducer<State, Payload>(
  maybeReducerWithPrepare: SyncCaseReducer<State, Payload>
) {
  let caseReducer: CaseReducer<State, PayloadAction<Payload>>;
  let prepareCallback: PrepareAction<Payload, any> | undefined;

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

function extractSyncCaseDataReducer<Data, Payload>(
  syncCaseDataReducer: SyncCaseDataReducer<Data, Payload>,
  type: string
) {
  const { caseReducer, prepareCallback } = extractCaseReducer(
    convertToCaseReducer(syncCaseDataReducer)
  );
  const action = prepareCallback
    ? createAction(type, prepareCallback)
    : createAction<Payload>(type);
  return { caseReducer, action };
}

export default function createActions<
  Data = any,
  State extends DataState<Data> = DataState<Data>,
  Name extends string = string,
  CDRS extends CaseDataReducers<Data> = CaseDataReducers<Data>
>(name: Name, reducers: CDRS) {
  if (!name) {
    throw new Error("`name` is a required");
  }

  const reducerNames = Object.keys(reducers);

  const caseReducers: { [k: string]: any } = {};
  const actions: { [k: string]: any } = {};

  reducerNames.forEach((reducerName) => {
    const maybeAsyncReducer = reducers[reducerName];
    const type = getType(name, reducerName);

    if ("fulfilled" in maybeAsyncReducer) {
      Object.keys(maybeAsyncReducer).forEach((key) => {
        const asyncType = key as keyof AsyncCaseDataReducer<any, any>;
        const asyncReducerName = getAsyncReducerName(reducerName, asyncType);
        const asyncReducerType = getType(name, asyncReducerName);
        const asyncFullNameReducer = maybeAsyncReducer[asyncType];
        if (asyncFullNameReducer) {
          const { caseReducer, action } = extractSyncCaseDataReducer(
            asyncFullNameReducer,
            asyncReducerType
          );
          caseReducers[asyncReducerType] = caseReducer;
          actions[asyncReducerName] = action;
        }
      });
    } else {
      const { caseReducer, action } = extractSyncCaseDataReducer(
        maybeAsyncReducer,
        type
      );
      caseReducers[type] = caseReducer;
      actions[reducerName] = action;
    }
  });

  return { actions, caseReducers } as {
    actions: {
      [Key in keyof ActionCreators<CDRS>]: ActionCreators<CDRS>[Key];
    };
    caseReducers: {
      [Key in keyof CaseReducers<Name, Data, State, CDRS>]: CaseReducers<
        Name,
        Data,
        State,
        CDRS
      >[Key];
    };
  };
}
