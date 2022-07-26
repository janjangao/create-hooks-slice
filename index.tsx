import React, { useEffect } from "react";
import { createStore, combineReducers } from "redux";
import { Provider } from "react-redux";
import createHooksSlice from "./lib/index.ts";

/**
 * API: https://petstore3.swagger.io/
 * create reducer and hooks according to the data source
 */
type Pet = {
  id: number;
  name: string;
  photoUrls?: string[];
  tags?: { id: number; name: string }[];
  status: "available" | "pending" | "sold";
};
const API_HOST = "https://petstore3.swagger.io/api/v3/";

const initialData: { list?: Pet[]; selectedId?: number; current?: Pet } = {};
const petSlice = createHooksSlice({
  name: "pet",
  initialData,
  reducers: {
    availableList(data, payload: Pet[]) {
      data.list = payload;
    },
    selectedPet(data, payload: Pet) {
      data.current = payload;
    },
    selectedId(data, payload: number) {
      data.selectedId = payload;
    },
    tagList(data, payload: Pet[]) {
      data.list = payload;
    },
  },
  thunks: {
    availableList() {
      console.log("fetching pets...");
      return fetch(`${API_HOST}pet/findByStatus?status=available`).then(
        (resp) => resp.json()
      );
    },
    selectedPet(id: number) {
      return fetch(`${API_HOST}pet/${id}`).then((resp) => resp.json());
    },
  },
  selectors: {
    pets(data) {
      console.log("select pets...");
      return data.list
        ? data.list.map((pet) => {
            const result = {
              id: pet.id,
              name: pet.name,
              photoUrls: pet.photoUrls || [],
              tags: pet.tags ? pet.tags.map((tag) => tag.name) : [],
            };
            return result;
          })
        : [];
    },
    tags(data) {
      console.log("select tags...");
      const tagSet = new Set<string>();
      data.list?.forEach((pet) => {
        pet.tags?.forEach((tag) => {
          if (tag) tagSet.add(tag.name);
        });
      });
      return [...tagSet];
    },
    currentPet(data) {
      console.log("select current pet...");
      return data.current;
    },
  },
  resources: {
    pets: "availableList",
    tags: "availableList",
  },
});
const {
  name: petReducerName,
  reducer: petReducer,
  actionHooks,
  thunkHooks,
  selectorHooks,
  resourceHooks,
} = petSlice;

/**
 * create redux store
 */
const store = createStore(
  combineReducers({
    [petReducerName]: petReducer,
  })
);
store.subscribe(() => {
  console.log("=================== the store data ===================");
  console.log(store.getState());
});

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

export function PetNav() {
  const { useResourceTags } = resourceHooks;
  const {
    data: tags,
    useData,
    refetch,
    isLoaded,
    isLoading,
    isSuccess,
  } = useResourceTags();

  return (
    <section>
      <h1>tags: </h1>
      {!isLoaded && isLoading ? (
        <div>{"first loading..."}</div>
      ) : (
        isSuccess && (
          <div style={{ display: "flex", cursor: "pointer" }}>
            <div style={{ marginRight: 20 }} onClick={refetch}>
              {"ALL"}
            </div>
            {tags.map((tag) => (
              <div
                style={{ marginRight: 20, cursor: "pointer" }}
                onClick={refetch}
              >
                {tag.toUpperCase()}
              </div>
            ))}
          </div>
        )
      )}
    </section>
  );
}

export function PetList() {
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

export function PetDetail() {
  const { useSelectorCurrentPet } = selectorHooks;
  const currentPet = useSelectorCurrentPet();
  return (
    <section>
      <h1>detail: </h1>
      <div>{JSON.stringify(currentPet)}</div>
    </section>
  );
}

export function TestResource() {
  return (
    <>
      <PetNav />
      <PetList />
      <PetDetail />
    </>
  );
}

export default function main() {
  return (
    <Provider store={store}>
      {/* <TestAction /> */}
      {/* <TestThunk /> */}
      {/* <TestThunk>
        <TestSelector />
      </TestThunk> */}
      <TestResource />
    </Provider>
  );
}
