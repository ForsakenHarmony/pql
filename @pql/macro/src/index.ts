import { Babel, Path, State } from 'babel-plugin-macros';
import * as macro from 'babel-plugin-macros';
import { parse, visit, print } from 'graphql';

module.exports = macro.createMacro(({ references, state, babel }) => {
  references.gql.map(referencePath => {
    if (referencePath.parentPath.type === 'TaggedTemplateExpression') {
      asTag(referencePath.parentPath.get('quasi'), state, babel);
    } else {
      throw new Error(
        'You can only use `@pql/macro` as a tagged template expression'
      );
    }
  });
});
function asTag(
  quasiPath: Path,
  { file: { opts: fileOptions } }: State,
  babel: Babel
) {
  const string = quasiPath.parentPath.get('quasi').evaluate().value;
  const gqlAst = parse(string);
  visit(gqlAst, {
    Field(field) {
      field.selectionSet &&
        // @ts-ignore
        field.selectionSet.selections.unshift({
          kind: 'Field',
          name: {
            kind: 'Name',
            value: '__typename',
          },
          arguments: [],
          directives: [],
        });
    },
  });
  const expr = `
    const x = (() => {
      const {gql} = require('@pql/client');
      return gql\`${print(gqlAst)}\`;
    })();
  `;
  const variableDeclarationNode = babel.template(expr, {
    preserveComments: true,
    placeholderPattern: false,
    ...fileOptions.parserOpts,
    sourceType: 'module',
  })();
  const ast = variableDeclarationNode.declarations[0].init;
  quasiPath.parentPath.replaceWith(ast);
}
