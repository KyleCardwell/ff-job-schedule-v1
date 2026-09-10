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

To display an important sentence in bold directly below a rule, add the optional `boldNote` field:

```json
{
  "id": "example-rule",
  "tags": ["example"],
  "rule": "Example instruction.",
  "boldNote": "Important note displayed in bold."
}
```

Bold notes are included in checklist search results.

## Images

Place Processing checklist images in `public/images/processing/`. An entry can display one image by adding an `image` object:

```json
{
  "id": "example-rule",
  "tags": ["example"],
  "rule": "Example instruction.",
  "image": {
    "src": "/images/processing/example-diagram.svg",
    "alt": "Description of the information shown in the diagram",
    "caption": "Optional caption displayed below the image."
  }
}
```

`alt` is required for accessibility. Use SVG for diagrams, PNG for screenshots, and JPEG or WebP for photographs. The image opens at full size when selected and is included when printing the checklist.
