import type { Reducer, Action } from "redux";
import type { Draft } from "immer";
import createNextState from "immer";

export type CaseReducer<State = unknown, TypeAction extends Action = Action> = (
  state: State | Draft<State>,
  action: TypeAction
) => State | void | Draft<State>;

export type CaseReducers<State, TypeAction extends Action = Action> = {
  [key: string]: CaseReducer<State, TypeAction>;
};

export default function createReducer<
  State,
  TypeAction extends Action = Action
>(
  initialState: State,
  caseReducers: CaseReducers<State, TypeAction>
): Reducer<State, TypeAction> {
  return function reducer(state = initialState, action): State {
    const caseReducer = caseReducers[action.type];
    if (caseReducer) {
      state = createNextState(state, (draft: Draft<State>) => {
        caseReducer(draft, action);
      });
    }
    return state;
  };
}
