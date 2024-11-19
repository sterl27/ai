import { API, FileInfo } from 'jscodeshift';

export default function transformer(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);
  let hasChanges = false;

  // Replace imports at ImportDeclaration level
  root
    .find(j.ImportDeclaration)
    .filter(path => path.node.source.value === 'ai')
    .forEach(path => {
      const newSpecifiers = path.node.specifiers?.map(spec => {
        if (spec.type !== 'ImportSpecifier') return spec;

        const oldName = spec.imported.name;
        if (
          ![
            'TokenUsage',
            'CompletionTokenUsage',
            'EmbeddingTokenUsage',
          ].includes(oldName)
        ) {
          return spec;
        }

        hasChanges = true;
        const newName =
          oldName === 'EmbeddingTokenUsage'
            ? 'EmbeddingModelUsage'
            : 'LanguageModelUsage';

        return j.importSpecifier(j.identifier(newName));
      });

      if (newSpecifiers !== path.node.specifiers) {
        hasChanges = true;
        path.node.specifiers = newSpecifiers;
      }
    });

  // Replace type references
  root
    .find(j.TSTypeReference)
    .filter(
      path =>
        path.node.typeName.type === 'Identifier' &&
        ['TokenUsage', 'CompletionTokenUsage', 'EmbeddingTokenUsage'].includes(
          path.node.typeName.name,
        ),
    )
    .forEach(path => {
      if (path.node.typeName.type === 'Identifier') {
        hasChanges = true;
        const oldName = path.node.typeName.name;
        const newName =
          oldName === 'EmbeddingTokenUsage'
            ? 'EmbeddingModelUsage'
            : 'LanguageModelUsage';

        path.node.typeName = j.identifier(newName);
      }
    });

  return hasChanges ? root.toSource() : null;
}