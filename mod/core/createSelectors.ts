import proxyMemoize from "https://esm.sh/proxy-memoize";
export type CaseSelector<State = unknown, Result = unknown> = (state: State) => Result;
export type CaseSelectors<State = unknown> = {
  [key: string]: CaseSelector<State>;
};
export type Selector<State = unknown, Result = unknown> = (state: State) => Result;
export type Selectors<State = unknown, Result = unknown> = {
  [key: string]: Selector<State, Result>;
};
export type RootState<NameState> = {
  [name: string]: NameState;
};
export function memoize<State = unknown>(fn: (obj: State) => unknown, options?: {
  size?: number;
}) {
  return proxyMemoize<any, unknown>(fn, options);
}
export function memoizeWithArgs(fnWithArgs: (...args: unknown[]) => unknown, options?: {
  size?: number;
}) {
  const fn = proxyMemoize((args: unknown[]) => fnWithArgs(...args), options);
  return (...args: unknown[]) => fn(args);
}
export function createSelector<State = unknown>(caseSelector: CaseSelector<State>): Selector<State> {
  return memoize(caseSelector);
}
export default function createSelectors<NameState = unknown, State = RootState<NameState>>(caseSelectors: CaseSelectors<State>) {
  const selectorNames = Object.keys(caseSelectors);
  const selectors: Selectors<State> = {};
  selectorNames.forEach(selectorName => {
    const caseSelector = caseSelectors[selectorName];
    selectors[selectorName] = createSelector<State>(caseSelector);
  });
  return selectors;
}