import React from "react";
import { selectorHooks } from "../redux/PetSlice.ts";

export default function PetDetail() {
  const { useSelectorCurrentPet } = selectorHooks;
  const currentPet = useSelectorCurrentPet();
  return (
    <section>
      <h1>detail: </h1>
      <div>{JSON.stringify(currentPet)}</div>
    </section>
  );
}
