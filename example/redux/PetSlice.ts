import createHooksSlice from "../../lib/index.ts";

/**
 * API: https://petstore3.swagger.io/
 * create reducer and hooks according to the data source
 */
export type Pet = {
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

export {
  petReducerName,
  petReducer,
  actionHooks,
  thunkHooks,
  selectorHooks,
  resourceHooks,
};
