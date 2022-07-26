import React from "react";
import { actionHooks, thunkHooks, resourceHooks } from "../redux/PetSlice.ts";

export default function PetList() {
  const { useResourcePets } = resourceHooks;
  const { data, useData, isLoading, isLoaded, isFetching, isSuccess } =
    useResourcePets();
  // use `useMemo` to cache computed values, it's similar with `useMemo(transformerFunc, [data, ...deps])`
  const normalizedPets = useData((pets) => {
    return pets.map((pet) => {
      return {
        id: pet.id,
        name: pet.name,
        photoUrls: pet.photoUrls.join(", "),
        tags: pet.tags.join(", "),
      };
    });
  }, []);

  const { useActionSelectedId } = actionHooks;
  const { useThunkSelectedPet } = thunkHooks;
  // get set selected pet id action function after calling action hook
  const selectedIdAction = useActionSelectedId();
  // get fetch pet detail thunk function after calling thunk hook
  const selectedPetThunk = useThunkSelectedPet();

  return (
    <section>
      <h1>pets: </h1>
      {!isLoaded && isLoading ? (
        <div>{"first loading..."}</div>
      ) : isFetching ? (
        <div>{"fetching..."}</div>
      ) : (
        isSuccess && (
          <div>
            {normalizedPets.map((pet) => {
              return (
                <div
                  style={{ display: "flex", cursor: "pointer" }}
                  onClick={(e) => {
                    selectedPetThunk(pet.id, (petDetail: Pet) => {
                      selectedIdAction(petDetail.id);
                    });
                  }}
                >
                  <div style={{ width: 150 }}>{pet.id}</div>
                  <div style={{ width: 150 }}>{pet.name}</div>
                  <div style={{ width: 150 }}>{pet.photoUrls}</div>
                  <div style={{ width: 150 }}>{pet.tags}</div>
                </div>
              );
            })}
          </div>
        )
      )}
    </section>
  );
}
