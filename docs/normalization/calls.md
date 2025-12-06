# Call Normalization Example

## Source Code

```js
runTask('build', 3);
```

## Tree-sitter Parse (summary)

- `program`
  - `expression_statement`
    - `call_expression`
      - `identifier` `runTask`
      - `arguments`
        - `string` `"build"`
        - `number` `3`

## Normalized Output

```json
{
  "type": "Call",
  "id": "<deterministic-id>",
  "originalType": "call_expression",
  "location": { "startLine": 0, "startCol": 0, "endLine": 0, "endCol": 19 },
  "callee": {
    "type": "Identifier",
    "id": "<deterministic-id>",
    "name": "runTask",
    "originalType": "identifier",
    "location": { "startLine": 0, "startCol": 0, "endLine": 0, "endCol": 7 }
  },
  "args": [
    {
      "type": "Literal",
      "id": "<deterministic-id>",
      "literalType": "string",
      "value": "build",
      "originalType": "string",
      "location": { "startLine": 0, "startCol": 8, "endLine": 0, "endCol": 15 }
    },
    {
      "type": "Literal",
      "id": "<deterministic-id>",
      "literalType": "number",
      "value": 3,
      "originalType": "number",
      "location": { "startLine": 0, "startCol": 17, "endLine": 0, "endCol": 18 }
    }
  ]
}
```

## Mapping Notes

- The call’s callee and each argument are normalized separately, yielding consistent `Identifier` and `Literal` nodes.
- The shared `id`, `location`, and `originalType` fields make it clear where each node originated in the Tree-sitter parse.
- Argument order is preserved, so downstream tooling can reconstruct invocation semantics accurately.
