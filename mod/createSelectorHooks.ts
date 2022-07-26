import { useSelector } from "https://esm.sh/react-redux";
import { useMemo } from "https://esm.sh/react";
import type { DataState } from "./core/createActions.ts";
import type { DataStatusState, Status } from "./createActionHooks.ts";
import type { Selectors as CoreSelectors } from "./core/createSelectors.ts";
import coreCreateSelectors, { memoizeWithArgs } from "./core/createSelectors.ts";
export type RootState<NameState> = {
  [name: string]: NameState;
};
export type CaseDataSelector<Data, Result> = (data: Data) => Result;
export type CaseDataSelectors<Data> = {
  [key: string]: CaseDataSelector<Data, any>;
};
export type CaseSelector<State, CDS extends CaseDataSelector<any, any>> = CDS extends (data: any) => infer Result ? (state: State) => Result : never;
export type CaseSelectors<State, CDSS extends CaseDataSelectors<any>> = { [Key in keyof CDSS]: CaseSelector<State, CDSS[Key]> };
export type RootDataStatusState<Data> = RootState<DataStatusState<Data>>;
export type AnySelector<State, Result> = (state: State) => Result;
export type AnySelectors<State> = {
  [key: string]: AnySelector<State, any>;
};
type GetResourceStatusSelectors<State> = {
  _getResourceStatus: AnySelector<State, Status>;
};
export type Selectors<Data, CDSS extends CaseDataSelectors<Data>> = CoreSelectors<CaseSelectors<RootDataStatusState<Data>, CDSS>> & GetResourceStatusSelectors<RootDataStatusState<Data>>;
export type SelectorHook<SS extends AnySelector<any, any>> = SS extends (state: any) => infer Result ? <SelectorTransformer = undefined>(selectorTransformer?: SelectorTransformer | ((result: Result) => any), deps?: any[]) => SelectorTransformer extends undefined ? Result : SelectorTransformer extends (result: any) => infer TransformedResult ? TransformedResult : never : never;
export type SelectorHooks<SS extends AnySelectors<any>> = { [Key in keyof SS as `useSelector${Capitalize<Key & string>}`]: SelectorHook<SS[Key]> };

function getSelectorHookName(selectorName: string): string {
  return `useSelector${selectorName[0].toUpperCase() + selectorName.slice(1)}`;
}

function makeSelector<State, Result>(selector: AnySelector<State, Result>, selectorTransformer: (data: any) => any): AnySelector<State, Result> {
  return (state: State) => selectorTransformer(selector(state));
}

export const getResourceStatusSelectorName = "_getResourceStatus";

function makeGetResourceStatusSelector(name: string) {
  return (state: RootDataStatusState<any>) => state[name]?.status;
}

export function selectorConverter<Data = any, CDSS extends CaseDataSelectors<Data> = CaseDataSelectors<Data>>(name: string, caseDataSelectors: CDSS) {
  const selectorNames = Object.keys(caseDataSelectors);
  const selectors: {
    [k: string]: any;
  } = {};
  selectorNames.forEach(selectorName => {
    const dataSelector = caseDataSelectors[selectorName];

    selectors[selectorName] = (state: RootState<DataState<Data>>) => dataSelector(state[name]?.data);
  });
  return (selectors as CaseSelectors<RootState<DataState<Data>>, CDSS>);
}
export function createSelectors<Data = any, Name extends string = string, CDSS extends CaseDataSelectors<Data> = CaseDataSelectors<Data>>(name: Name, caseDataSelectors: CDSS) {
  const selectors = coreCreateSelectors<RootDataStatusState<Data>>(selectorConverter<Data>(name, caseDataSelectors)); // add internal getResourceStatus selector

  const getResourceStatusSelectors: GetResourceStatusSelectors<any> = {
    [getResourceStatusSelectorName]: makeGetResourceStatusSelector(name)
  };
  return ({ ...selectors,
    ...getResourceStatusSelectors
  } as Selectors<Data, CDSS>);
}
export function createSelectorHook<S extends AnySelector<any, any>>(selector: S) {
  const selectorHooks = (selectorTransformer?: (data: any) => any, deps?: any[]) => {
    const finalSelector = selectorTransformer && deps ? useMemo(() => makeSelector(selector, memoizeWithArgs(selectorTransformer)), deps) : selectorTransformer ? makeSelector(selector, selectorTransformer) : selector;
    return useSelector(finalSelector);
  };

  return (selectorHooks as SelectorHook<S>);
}
export default function createSelectorHooks<SS extends AnySelectors<any> = AnySelectors<any>>(selectors: SS) {
  const selectorHooks: {
    [k: string]: any;
  } = {};
  Object.keys(selectors).forEach(selectorName => {
    const selector = selectors[selectorName];
    const selectorHookName = getSelectorHookName(selectorName);
    selectorHooks[selectorHookName] = createSelectorHook(selector);
  });
  return (selectorHooks as SelectorHooks<SS>);
}