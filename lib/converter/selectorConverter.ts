import type {
  CaseSelectors,
  RootState,
  Selector,
  Selectors,
} from "../core/createSelectors.ts";
export {
  default as createSelectors,
  memoizeWithArgs,
} from "../core/createSelectors.ts";
import type { DataState } from "./reducerConverter.ts";

export type { RootState, Selector, Selectors, DataState };

export type CaseDataSelector<Data = unknown, Result = unknown> = (
  data: Data
) => Result;

export type CaseDataSelectors<Data = unknown, Result = unknown> = {
  [key: string]: CaseDataSelector<Data, Result>;
};

export default function converter<Data = unknown>(
  name: string,
  dataSelectors: CaseDataSelectors<Data>
) {
  const selectorNames = Object.keys(dataSelectors);

  const selectors: CaseSelectors<RootState<DataState<Data>>> = {};

  selectorNames.forEach((selectorName) => {
    const dataSelector = dataSelectors[selectorName];
    selectors[selectorName] = (state: RootState<DataState<Data>>) =>
      dataSelector(state[name]?.data);
  });
  return selectors;
}
