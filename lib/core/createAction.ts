import type { AnyAction } from "redux";

export type PrepareAction<Payload> = (...args: unknown[]) => {
  payload: Payload;
  meta?: unknown;
  error?: unknown;
};

export interface PayloadAction<Payload = unknown>
  extends AnyAction {
  payload: Payload;
}

export type ActionCreator<Payload = unknown> = (
  payload?: Payload
) => PayloadAction<Payload>;

export type ActionCreators<Payload = unknown> = {
  [key: string]: ActionCreator<Payload>;
};

export default function createAction(
  type: string,
  prepareAction?: PrepareAction<unknown>
): ActionCreator {
  function actionCreator(...args: unknown[]) {
    if (prepareAction) {
      const prepared = prepareAction(...args);
      if (!prepared) {
        throw new Error("prepareAction did not return an object");
      }

      return {
        type,
        payload: prepared.payload,
        ...("meta" in prepared && { meta: prepared.meta }),
        ...("error" in prepared && { error: prepared.error }),
      };
    }
    return { type, payload: args[0] };
  }

  actionCreator.toString = () => `${type}`;

  return actionCreator;
}
