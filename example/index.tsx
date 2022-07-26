import React from "react";
import { createStore, combineReducers } from "redux";
import { Provider } from "react-redux";
import { petReducerName, petReducer } from "./redux/PetSlice.ts";
import PetNav from "./component/PetNav.tsx";
import PetList from "./component/PetList.tsx";
import PetDetail from "./component/PetDetail.tsx";

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

export default function main() {
  return (
    <Provider store={store}>
      <PetNav />
      <PetList />
      <PetDetail />
    </Provider>
  );
}
