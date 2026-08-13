# Structured content

`room-processing-checklist.json` is the single source of truth for the Room Processing Checklist at `/processing`.

To add a checklist item, append an object to the appropriate `sections[].entries` array with a unique kebab-case `id`, a `tags` array, a `rule`, and an optional `example`. No component changes are needed. Keep entry IDs stable after publishing because they are used for shareable links.

Entries can also contain a `children` array of entries. Children use the same fields, can contain their own children, and receive their own searchable tags, copyable Cabinet Vision text, and unique deep link:

```json
{
  "id": "parent-rule",
  "tags": ["example"],
  "rule": "Parent instruction.",
  "children": [
    {
      "id": "child-rule",
      "tags": ["example", "child"],
      "rule": "More specific child instruction.",
      "example": "First copied line\nSecond copied line"
    }
  ]
}
```

Use `\n` inside an `example` when the displayed and copied Cabinet Vision text needs a line break.
