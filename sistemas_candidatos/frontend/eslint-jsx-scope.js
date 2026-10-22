// ESLint core does not count JSX tag names as variable references.
// Mark only component bindings, retaining no-unused-vars for genuine dead code.
export default {
  rules: {
    'component-references': {
      meta: { type: 'problem', schema: [] },
      create(context) {
        return {
          JSXOpeningElement(node) {
            let name = node.name
            const member = name.type === 'JSXMemberExpression'
            while (name.type === 'JSXMemberExpression') name = name.object
            if (name.type === 'JSXIdentifier' && (member || /^[A-Z]/.test(name.name))) {
              context.sourceCode.markVariableAsUsed(name.name, node)
            }
          },
        }
      },
    },
  },
}
