import type { AnyAction } from "https://esm.sh/redux";
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
export type ActionCreator<Payload, FinalPayload = Payload> = (payload: Payload) => PayloadAction<FinalPayload>;
export type ActionCreatorWithoutPayload<FinalPayload = undefined> = () => PayloadAction<FinalPayload>;
export type ActionCreatorOptionalPayload<Payload = any> = Payload extends undefined ? ActionCreatorWithoutPayload : ActionCreator<Payload>;
export type ActionCreators = {
  [key: string]: ActionCreatorOptionalPayload<any>;
};
export default function createAction<Payload, PreparedPayload = Payload>(type: string, prepareAction?: PrepareAction<Payload, PreparedPayload>) {
  function actionCreator(payload?: Payload) {
    if (prepareAction) {
      const prepared = prepareAction(payload);

      if (!prepared) {
        throw new Error("prepareAction did not return an object");
      }

      return {
        type,
        payload: prepared.payload,
        ...("meta" in prepared && {
          meta: prepared.meta
        }),
        ...("error" in prepared && {
          error: prepared.error
        })
      };
    }

    return {
      type,
      payload
    };
  }

  actionCreator.toString = () => type;

  return actionCreator;
}