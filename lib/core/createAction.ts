import type { AnyAction } from "redux";

export type PrepareAction<Payload, PreparedPayload> = (payload?: Payload) => {
  payload?: PreparedPayload;
  meta?: any;
  error?: any;
};

export interface PayloadAction<Payload> extends AnyAction {
  payload?: Payload;
  meta?: any;
  error?: any;
}

export type ActionCreator<Payload, finalPayload = Payload> = (
  payload: Payload
) => PayloadAction<finalPayload>;

export type ActionCreatorWithoutPayload<finalPayload = undefined> =
  () => PayloadAction<finalPayload>;

export type ActionCreatorOptionalPayload<Payload = undefined> =
  Payload extends undefined
    ? ActionCreatorWithoutPayload
    : ActionCreator<Payload>;

export type ActionCreators = {
  [key: string]: ActionCreatorOptionalPayload<any>;
};

export default function createAction<Payload, PreparedPayload = Payload>(
  type: string,
  prepareAction?: PrepareAction<Payload, PreparedPayload>
) {
  function actionCreator(payload?: Payload) {
    if (prepareAction) {
      const prepared = prepareAction(payload);
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
    return { type, payload };
  }

  actionCreator.toString = () => `${type}`;

  return actionCreator;
}
