const regExp = /\.(ts|tsx)$/i;

function removeExtension(path) {
  const { source } = path.node;
  if (!source || !source.value.match(regExp)) {
    return;
  }
  source.value = source.value.replace(regExp, "");
}

module.exports = function () {
  return {
    visitor: {
      ImportDeclaration: removeExtension,
      ExportNamedDeclaration: removeExtension,
    },
  };
};
