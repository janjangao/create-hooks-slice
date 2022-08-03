import proxyMemoizeModule from "proxy-memoize";

// @ts-expect-error something wrong with the format in the lib `proxy-memoize`, check this thread https://github.com/dai-shi/proxy-memoize/pull/48
const proxyMemoize = proxyMemoizeModule.default || proxyMemoizeModule;

export type CaseSelector<State, Result> = (state: State) => Result;

export type CaseSelectors<State> = {
  [key: string]: CaseSelector<State, any>;
};

export type Selector<CS extends CaseSelector<any, any>> = CS extends (
  state: infer State
) => infer Result
  ? (state: State) => Result
  : never;

export type Selectors<CSS extends CaseSelectors<any>> = {
  [Key in keyof CSS]: Selector<CSS[Key]>;
};

export function memoize<State = any>(
  fn: (obj: State) => any,
  options?: { size?: number }
) {
  return proxyMemoize(fn, options);
}

export function memoizeWithArgs(
  fnWithArgs: (...args: any[]) => any,
  options?: { size?: number }
) {
  const fn = proxyMemoize((args: any[]) => fnWithArgs(...args), options);
  return (...args: any[]) => fn(args);
}

export function createSelector<State, Result>(
  caseSelector: CaseSelector<State, Result>
) {
  return memoize(caseSelector);
}

export default function createSelectors<
  State,
  CSS extends CaseSelectors<State> = CaseSelectors<State>
>(caseSelectors: CSS) {
  const selectorNames = Object.keys(caseSelectors);

  const selectors: { [k: string]: any } = {};

  selectorNames.forEach((selectorName) => {
    const caseSelector = caseSelectors[selectorName];
    selectors[selectorName] = createSelector<State, any>(caseSelector);
  });

  return selectors as Selectors<CSS>;
}
