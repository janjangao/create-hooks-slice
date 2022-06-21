import { useSelector } from "react-redux";
import { useMemo } from "react";
import type { DataStatusState } from "./createReducerActions.ts";
import type {
  CaseDataSelectors,
  RootState,
  Selector,
  Selectors,
} from "./converter/selectorConverter.ts";
import selectorConverter, {
  createSelectors as coreCreateSelectors,
  memoizeWithArgs,
} from "./converter/selectorConverter.ts";

export type { CaseDataSelectors, Selectors, Selector };

export type RootDataStatusState<Data = unknown> = RootState<
  DataStatusState<Data>
>;

export type SelectorHook<Data = unknown, Result = unknown> = (
  selectorTransformer?: (data: Data) => Result,
  deps?: unknown[]
) => Result;

export type SelectorHooks<Data = unknown, Result = unknown> = {
  [key: string]: SelectorHook<Data, Result>;
};

function getSelectorHookName(selectorName: string): string {
  return `useSelector${selectorName[0].toUpperCase() + selectorName.slice(1)}`;
}

function makeSelector<State>(
  selector: Selector<State>,
  selectorTransformer: (data: unknown) => unknown
): Selector<State> {
  return (state: State) => selectorTransformer(selector(state));
}

export const getResourceStatusSelectorName = "_getResourceStatus";

function makeGetResourceStatusSelector(name: string) {
  return (state: RootDataStatusState<unknown>) => state[name]?.status;
}

export function createSelectors<Data = unknown, Name extends string = string>(
  name: Name,
  dataSelectors: CaseDataSelectors<Data>
) {
  const selectors = coreCreateSelectors<
    DataStatusState,
    RootDataStatusState<Data>
  >(selectorConverter(name, dataSelectors));
  // add internal getResourceStatus selector
  selectors[getResourceStatusSelectorName] =
    makeGetResourceStatusSelector(name);
  return selectors;
}

export function createSelectorHooksFromSelectors<State = unknown>(
  selectors: Selectors<State>
) {
  const selectorHooks: SelectorHooks = {};
  Object.keys(selectors).forEach((selectorName) => {
    const selector = selectors[selectorName];
    const selectorHookName = getSelectorHookName(selectorName);
    selectorHooks[selectorHookName] = (selectorTransformer, deps) => {
      const finalSelector =
        selectorTransformer && deps
          ? useMemo(
              () =>
                makeSelector(selector, memoizeWithArgs(selectorTransformer)),
              deps
            )
          : selectorTransformer
          ? makeSelector(selector, selectorTransformer)
          : selector;
      return useSelector(finalSelector);
    };
  });
  return selectorHooks;
}

export default function createSelectorHooks<
  Data = unknown,
  Name extends string = string
>(name: Name, dataSelectors: CaseDataSelectors<Data>) {
  return createSelectorHooksFromSelectors<RootDataStatusState<Data>>(
    createSelectors<Data, Name>(name, dataSelectors)
  );
}
