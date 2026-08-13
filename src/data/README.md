# Structured content

`room-processing-checklist.json` is the single source of truth for the Room Processing Checklist at `/processing`.

On the page, General, Room Notes, and Cabinet Notes Checklist are pinned first in that order. All other sections are displayed alphabetically by `name`, so newly added sections are placed automatically.

To add a checklist item, append an object to the appropriate `sections[].entries` array with a unique kebab-case `id`, a `tags` array, a `rule`, and an optional `example`. No component changes are needed. Keep entry IDs stable after publishing because they are used for shareable links.

When a rule has multiple alternative Cabinet Vision values, use `examples` instead of `example`. Each option receives its own Copy button:

```json
{
  "id": "back-thickness",
  "tags": ["backs"],
  "rule": "Back Thickness - inset or applied?",
  "examples": [
    { "id": "inset", "label": "Inset", "text": "3/4\" inset back" },
    { "id": "applied", "label": "Applied", "text": "1/4\" applied back" }
  ]
}
```

Use a unique kebab-case `id` for each option. `label` is optional; `text` is the exact value displayed and copied.

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
