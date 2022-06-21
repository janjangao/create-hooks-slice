import type { Dispatch } from "redux";
import type { ActionCreators, ActionCreator } from "./createAction.ts";

export type CaseQueryThunk<Query = unknown, Result = unknown> = (
  query?: Query
) => Promise<Result>;

export type CaseQueryThunks<Query = unknown, Result = unknown> = {
  [key: string]: CaseQueryThunk<Query, Result>;
};

type ThunkCallback<Payload = unknown, Error = unknown> = (
  dispatch: Dispatch,
  payloadOrError?: Payload | Error
) => void;

export type PeriodThunkCallback<Payload = unknown, Error = unknown> = {
  pending?: ThunkCallback;
  fulfilled: ThunkCallback<Payload>;
  rejected?: ThunkCallback<Payload, Error>;
};

export type OptionalThunkCallback<Payload = unknown, Error = unknown> =
  | ThunkCallback<Payload, Error>
  | PeriodThunkCallback<Payload, Error>;

export type ThunkAction<Query = unknown, Result = unknown> = (
  query: Query | null,
  thunkCallback?: OptionalThunkCallback
) => (dispatch: Dispatch) => Promise<Result>;

export type ThunkActions<Query = unknown, Result = unknown> = {
  [key: string]: ThunkAction<Query, Result>;
};

function normalizeThunkCallback(
  thunkCallback: OptionalThunkCallback
): PeriodThunkCallback {
  let pendingThunkCallback: ThunkCallback | undefined;
  let fulfilledThunkCallback: ThunkCallback | undefined;
  let rejectedThunkCallback: ThunkCallback | undefined;
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
    rejected: rejectedThunkCallback,
  };
}

function combineTwoThunkCallbacks(
  first?: ThunkCallback,
  second?: ThunkCallback
) {
  return first && second
    ? (dispatch: Dispatch, payloadOrError?: unknown) => {
        first(dispatch, payloadOrError);
        second(dispatch, payloadOrError);
      }
    : first || second;
}

function combineThunkCallbacks(
  ...thunkCallbacks: OptionalThunkCallback[]
): PeriodThunkCallback {
  return (
    thunkCallbacks.length > 0
      ? thunkCallbacks.reduce((prev, next) => {
          const prevThunkCallback = normalizeThunkCallback(prev);
          const nextThunkCallback = normalizeThunkCallback(next);
          const resultThunkCallback: PeriodThunkCallback = {
            pending: combineTwoThunkCallbacks(
              prevThunkCallback.pending,
              nextThunkCallback.pending
            ),
            fulfilled: combineTwoThunkCallbacks(
              prevThunkCallback.fulfilled,
              nextThunkCallback.fulfilled
            ) as ThunkCallback,
            rejected: combineTwoThunkCallbacks(
              prevThunkCallback.rejected,
              nextThunkCallback.rejected
            ),
          };
          return resultThunkCallback;
        })
      : {}
  ) as PeriodThunkCallback;
}

function actionToThunkCallBack(action: ActionCreator): ThunkCallback {
  return (dispatch: Dispatch, payloadOrError?: unknown) => {
    dispatch(action(payloadOrError));
  };
}

export default function createThunkActions(
  thunks: CaseQueryThunks,
  actions: ActionCreators = {}
) {
  const thunkActions: ThunkActions = {};
  Object.keys(thunks).forEach((thunkName) => {
    const thunk = thunks[thunkName];

    const actionThunkCallbacks: Record<string, OptionalThunkCallback> = {};
    const pendingActionName = `${thunkName}Pending`;
    const fulfilledActionName = `${thunkName}Fulfilled`;
    const rejectedActionName = `${thunkName}Rejected`;
    if (thunkName in actions || fulfilledActionName in actions) {
      const action = actions[thunkName];
      const pendingAction = actions[pendingActionName];
      const fulfilledAction = actions[fulfilledActionName];
      const rejectedAction = actions[rejectedActionName];
      const actionThunkCallback: OptionalThunkCallback = action
        ? actionToThunkCallBack(action)
        : {
            pending: pendingAction
              ? actionToThunkCallBack(pendingAction)
              : undefined,
            fulfilled: actionToThunkCallBack(fulfilledAction),
            rejected: rejectedAction
              ? actionToThunkCallBack(rejectedAction)
              : undefined,
          };
      actionThunkCallbacks[thunkName] = actionThunkCallback;
    }

    thunkActions[thunkName] =
      (query: unknown, thunkCallback?: OptionalThunkCallback) =>
      async (dispatch: Dispatch) => {
        const actionThunkCallback = actionThunkCallbacks[thunkName];
        const thunkCallbacks = [actionThunkCallback, thunkCallback].filter(
          (v): v is OptionalThunkCallback => !!v
        );
        const finalThunkCallback = combineThunkCallbacks(...thunkCallbacks);
        const { pending, fulfilled, rejected } = finalThunkCallback;
        if (pending) pending(dispatch);
        try {
          const result = await thunk(query);
          if (fulfilled) fulfilled(dispatch, result);
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
