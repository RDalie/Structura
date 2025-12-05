# Variable Normalization Example

## Source Code
```js
const answer = 42;
```

## Tree-sitter Parse (summary)
- `program`
  - `lexical_declaration` (`const`)
    - `variable_declarator`
      - `identifier` `answer`
      - `number` `42`

## Normalized Output
```json
{
  "type": "Variable",
  "id": "<deterministic-id>",
  "originalType": "variable_declarator",
  "location": { "startLine": 0, "startCol": 6, "endLine": 0, "endCol": 17 },
  "name": "answer",
  "kind": "const",
  "initializer": {
    "type": "Literal",
    "id": "<deterministic-id>",
    "literalType": "number",
    "value": 42,
    "originalType": "number",
    "location": { "startLine": 0, "startCol": 16, "endLine": 0, "endCol": 18 }
  }
}
```

## Mapping Notes
- Each `variable_declarator` becomes a `Variable` node capturing the declared name, declaration kind (`const`, `let`, or `var`), and optional initializer.
- Initializers are recursively normalized, so literals, identifiers, or more complex expressions retain their unified Structura shapes.
- When a single declaration contains multiple variables, Structura returns a `Block` containing one `ExpressionStatement` per variable to keep every variable accessible as a standalone node.
