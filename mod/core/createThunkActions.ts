import type { Dispatch } from "https://esm.sh/redux";
import type { ActionCreators, ActionCreatorOptionalPayload } from "./createAction.ts";
export type CaseQueryThunk<Query, Result> = (query?: Query) => Promise<Result>;
export type CaseQueryThunks = {
  [key: string]: CaseQueryThunk<any, any>;
};
type ThunkCallback<Payload, Error> = (payloadOrError: Payload | Error | undefined, dispatch: Dispatch) => void;
export type PeriodThunkCallback<Payload, Error> = {
  pending?: ThunkCallback<Payload, Error>;
  fulfilled: ThunkCallback<Payload, Error>;
  rejected?: ThunkCallback<Payload, Error>;
};
export type OptionalThunkCallback<Payload, Error> = ThunkCallback<Payload, Error> | PeriodThunkCallback<Payload, Error>;
export type ThunkAction<CQT extends CaseQueryThunk<any, any>> = CQT extends () => Promise<infer Result> ? (query?: undefined, thunkCallback?: OptionalThunkCallback<Result, any>) => (dispatch: Dispatch) => Promise<Result> : CQT extends (query: infer Query) => Promise<infer Result> ? (query: Query, thunkCallback?: OptionalThunkCallback<Result, any>) => (dispatch: Dispatch) => Promise<Result> : never;
export type ThunkActions<CQTS extends CaseQueryThunks> = { [Key in keyof CQTS]: ThunkAction<CQTS[Key]> };

function normalizeThunkCallback<Payload, Error>(thunkCallback: OptionalThunkCallback<Payload, Error>): PeriodThunkCallback<Payload, Error> {
  let pendingThunkCallback: ThunkCallback<Payload, Error> | undefined;
  let fulfilledThunkCallback: ThunkCallback<Payload, Error> | undefined;
  let rejectedThunkCallback: ThunkCallback<Payload, Error> | undefined;

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

function combineTwoThunkCallbacks<Payload, Error>(first?: ThunkCallback<Payload, Error>, second?: ThunkCallback<Payload, Error>) {
  return first && second ? (payloadOrError: any, dispatch: Dispatch) => {
    first(payloadOrError, dispatch);
    second(payloadOrError, dispatch);
  } : first || second;
}

function combineThunkCallbacks<Payload, Error>(...thunkCallbacks: OptionalThunkCallback<Payload, Error>[]): PeriodThunkCallback<Payload, Error> {
  return ((thunkCallbacks.length > 0 ? thunkCallbacks.length === 1 ? normalizeThunkCallback(thunkCallbacks[0]) : thunkCallbacks.reduce((prev, next) => {
    const prevThunkCallback = normalizeThunkCallback(prev);
    const nextThunkCallback = normalizeThunkCallback(next);
    const resultThunkCallback: PeriodThunkCallback<Payload, Error> = {
      pending: combineTwoThunkCallbacks(prevThunkCallback.pending, nextThunkCallback.pending),
      fulfilled: (combineTwoThunkCallbacks(prevThunkCallback.fulfilled, nextThunkCallback.fulfilled) as ThunkCallback<Payload, Error>),
      rejected: combineTwoThunkCallbacks(prevThunkCallback.rejected, nextThunkCallback.rejected)
    };
    return resultThunkCallback;
  }) : {}) as PeriodThunkCallback<Payload, Error>);
}

function actionToThunkCallBack(action: ActionCreatorOptionalPayload): ThunkCallback<any, any> {
  return (payloadOrError: any, dispatch: Dispatch) => {
    dispatch(action(payloadOrError));
  };
}

export default function createThunkActions<CQTS extends CaseQueryThunks>(thunks: CQTS, actions: ActionCreators = {}) {
  const thunkActions: {
    [k: string]: any;
  } = {};
  Object.keys(thunks).forEach(thunkName => {
    const thunk = thunks[thunkName];
    let actionThunkCallback: any = undefined;
    const pendingActionName = `${thunkName}Pending`;
    const fulfilledActionName = `${thunkName}Fulfilled`;
    const rejectedActionName = `${thunkName}Rejected`;

    if (thunkName in actions || fulfilledActionName in actions) {
      const action = actions[thunkName];
      const pendingAction = actions[pendingActionName];
      const fulfilledAction = actions[fulfilledActionName];
      const rejectedAction = actions[rejectedActionName];
      actionThunkCallback = action ? actionToThunkCallBack(action) : {
        pending: pendingAction ? actionToThunkCallBack(pendingAction) : undefined,
        fulfilled: actionToThunkCallBack(fulfilledAction),
        rejected: rejectedAction ? actionToThunkCallBack(rejectedAction) : undefined
      };
    }

    thunkActions[thunkName] = (query?: any, thunkCallback?: OptionalThunkCallback<any, any>) => async (dispatch: Dispatch) => {
      const thunkCallbacks = [actionThunkCallback, thunkCallback].filter((v): v is OptionalThunkCallback<any, any> => !!v);
      const finalThunkCallback = combineThunkCallbacks(...thunkCallbacks);
      const {
        pending,
        fulfilled,
        rejected
      } = finalThunkCallback;
      if (pending) pending(undefined, dispatch);

      try {
        const result = await thunk(query);
        if (fulfilled) fulfilled(result, dispatch);
        return result;
      } catch (error) {
        if (rejected) {
          rejected(error, dispatch);
        } else {
          throw error;
        }
      }
    };
  });
  return (thunkActions as ThunkActions<CQTS>);
}