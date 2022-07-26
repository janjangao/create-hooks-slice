import React, { useEffect } from "react";
import type { Pet } from "../redux/PetSlice.ts";
import { actionHooks, thunkHooks, selectorHooks } from "../redux/PetSlice.ts";

export function TestAction() {
  const pets: Pet[] = [
    { id: 1, name: "kitty", status: "available" },
    { id: 2, name: "mimmk", status: "available" },
  ];
  const { useActionAvailableList, useActionSelectedPet } = actionHooks;
  // get action function after calling action hook
  const availableListAction = useActionAvailableList();
  const selectedPetAction = useActionSelectedPet();
  useEffect(() => {
    // it's similar with `dispatch({ type: "pet/availableList", payload: pets });`
    availableListAction(pets);
    selectedPetAction(pets[0]);
  }, []);
  return null;
}

export function TestThunk({ children }: { children?: React.ReactNode }) {
  const { useThunkAvailableList, useThunkSelectedPet } = thunkHooks;
  // get thunk function after calling action hook
  const availableListThunk = useThunkAvailableList();
  const selectedPetThunk = useThunkSelectedPet();
  useEffect(() => {
    // it's similar with `dispatch((dispatchFun) => { fetch("pet/findByStatus?status=available") ... });`
    availableListThunk(undefined, (result, dispatch) => {
      const pets: Pet[] = result;
      selectedPetThunk(pets[0].id);
    });
  }, []);
  return <>{children}</>;
}

export function TestSelector() {
  const { useSelectorPets, useSelectorTags } = selectorHooks;
  // select and cache pets from redux store
  const pets = useSelectorPets();
  const tags = useSelectorTags();
  // use `useMemo` to cache computed values, it's similar with `useMemo(transformerFunc, [data, ...deps])`
  const petNames = useSelectorPets((pets) => {
    console.log("compute petNames...");
    return pets.map((pet) => pet.name);
  }, []);
  return (
    <>
      <div>{`pets: ${petNames.join(", ")}`}</div>
      <div>{`tags: ${tags.join(", ")}`}</div>
    </>
  );
}
