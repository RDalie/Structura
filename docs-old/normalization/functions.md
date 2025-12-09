# Function Normalization Example

## Source Code

```js
function check(value) {
  return call(value);
}
```

## Tree-sitter Parse (summary)

- `program`
  - `function_declaration` (`name`: `check`)
    - `formal_parameters` → `identifier` `value`
    - `statement_block`
      - `return_statement`
        - `call_expression` (`identifier` `call`, `arguments` containing `identifier` `value`)

## Normalized Output

```json
{
  "type": "Function",
  "id": "<deterministic-id>",
  "originalType": "function_declaration",
  "location": { "startLine": 0, "startCol": 0, "endLine": 2, "endCol": 1 },
  "name": "check",
  "params": [
    {
      "type": "Parameter",
      "id": "<deterministic-id>",
      "name": "value",
      "originalType": "identifier",
      "location": { "startLine": 0, "startCol": 15, "endLine": 0, "endCol": 20 }
    }
  ],
  "returnType": null,
  "body": {
    "type": "Block",
    "id": "<deterministic-id>",
    "originalType": "statement_block",
    "location": { "startLine": 0, "startCol": 21, "endLine": 2, "endCol": 1 },
    "statements": [
      {
        "type": "Return",
        "id": "<deterministic-id>",
        "originalType": "return_statement",
        "location": { "startLine": 1, "startCol": 2, "endLine": 1, "endCol": 18 },
        "value": {
          "type": "Call",
          "id": "<deterministic-id>",
          "originalType": "call_expression",
          "location": { "startLine": 1, "startCol": 9, "endLine": 1, "endCol": 18 },
          "callee": {
            "type": "Identifier",
            "id": "<deterministic-id>",
            "name": "call",
            "originalType": "identifier",
            "location": { "startLine": 1, "startCol": 9, "endLine": 1, "endCol": 13 }
          },
          "args": [
            {
              "type": "Identifier",
              "id": "<deterministic-id>",
              "name": "value",
              "originalType": "identifier",
              "location": { "startLine": 1, "startCol": 14, "endLine": 1, "endCol": 19 }
            }
          ]
        }
      }
    ]
  }
}
```

## Mapping Notes

- Function declarations become `Function` nodes with `params` converted to `Parameter` entries and a `Block` body.
- The body’s statements are recursively normalized; return statements become `Return` nodes containing normalized values.
- Calls inside functions normalize callee/args to Structura’s unified `Call` shape, preserving deterministic `id`, `location`, and `originalType` fields from the Tree-sitter nodes.
