# create-hooks-slice

STILL IN PROGRESS....

[create-hooks-slice](https://github.com/hayond/create-hooks-slice) is an alternative for [createSlice](https://redux-toolkit.js.org/api/createSlice) in redux-toolkit. it force on the hooks and association.

## Usage

### define redux reducer

```javascript
const slice = createHooksSlice({
  name: "unpkgMeta",
  initialData: { meta: {} },
  reducers: {
    meta: (data, payload) => {
      data.meta = payload;
    },
    asyncMeta: {
      pending: (data) => {
        console.log("pending status and do nothing");
      },
      fulfilled: (data, payload) => {
        data.meta = payload;
      },
      rejected: (data, error) => {
        throw error;
      },
    },
  },
  thunks: {
    asyncMeta(query = {}) {
      return fetch(`https://unpkg.com/${query.name}?meta`).then((resp) => {
        if (!resp.headers.get("content-type")) {
          return Promise.reject(
            new Error(`fetch ${query.name} unpkg meta error`)
          );
        }
        return { name: moduleName, ...resp.json() };
      });
    },
  },
  selectors: {
    metaPath(data) {
      return data?.meta?.path;
    },
    metaSize(data) {
      return data?.meta?.size;
    },
    metaLastModified(data) {
      return data?.meta?.lastModified;
    },
  },
  resources: {
    metaPath: "asyncMeta",
    metaSize: "asyncMeta",
  },
});

const store = createStore(
  combineReducers({
    [slice.name]: slice.reducer,
  })
);
```

### export action, selector, and hooks

```javascript
const { actions, thunkActions, selectors, hooks } = slice;
const { meta, asyncMetaFulfilled } = actions;
const { asyncMeta } = thunkActions
const { metaPath, metaSize } = selectors
const { useResourceMetaPath, useSuspenseMetaPath } = hooks;

// use normal action
dispath(meta({ name: "react" path: "index.js" }))
// use thunk action
asyncMeta({ name: "react" })(dispath)
// use selector
useSelector(metaPath)
```

### use hooks in react component

```javascript
export function ModulePath() {
  const { data, isSuccess } = useResourceMetaPath({ name: "react" });
  return isSuccess ? <div>{data}</div> : <>{"isFetching"}</>;
}
// or work with suspense
export function ModulePath() {
  return (
    <React.Suspense fallback={<>{"isFetching"}</>}>
      {() => {
        const metaPath = useSuspenseMetaPath({ name: "react" });
        return <div>{metaPath}</div>;
      }}
    </React.Suspense>
  );
}
```
