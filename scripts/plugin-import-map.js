const importMap = require("../import_map.json");

const moduleMap = importMap.imports;

function removeExtension(path) {
  const { source } = path.node;
  if (!source || !moduleMap[source.value]) {
    return;
  }
  source.value = moduleMap[source.value];
}

module.exports = function () {
  return {
    visitor: {
      ImportDeclaration: removeExtension,
      ExportNamedDeclaration: removeExtension,
    },
  };
};
