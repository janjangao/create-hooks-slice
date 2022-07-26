import React from "react";
import { resourceHooks } from "../redux/PetSlice.ts";

export default function PetNav() {
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
