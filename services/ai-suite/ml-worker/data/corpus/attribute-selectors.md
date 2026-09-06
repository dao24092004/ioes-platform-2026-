---
title: Attribute selectors
doc_id: attribute-selectors
source_url: https://developer.mozilla.org/en-US/docs/learn-web-development/core/styling-basics/attribute-selectors
license: CC BY-SA 2.5 (MDN Web Docs)
---

As you know from your study of HTML, elements can have attributes that give further detail about the element being marked up. In CSS you can use attribute selectors to target elements with certain attributes. This lesson will show you how to use these very useful selectors.

      Prerequisites:

        HTML basics (study
        Basic HTML syntax), Basic CSS selectors.

      Learning outcomes:

          The basic concept of attribute selectors.
          Presence and value attribute selectors.
          Substring matching attribute selectors.

## Presence and value selectors

These selectors enable the selection of an element based on the presence of an attribute alone (for example `href`), or on various different matches against the value of the attribute.

| Selector         | Example                         | Description                                                                                                                            |
| ---------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `[attr]`         | `a[title]`                      | Matches elements with an _attr_ attribute (whose name is the value in square brackets).                                                |
| `[attr=value]`   | `a[href="https://example.com"]` | Matches elements with an _attr_ attribute whose value is exactly _value_ — the string inside the quotes.                               |
| `[attr~=value]`  | `p[class~="special"]`           | Matches elements with an _attr_ attribute whose value is exactly _value_, or contains _value_ in its (space-separated) list of values. |
| `[attr\|=value]` | `div[lang\|="zh"]`              | Matches elements with an _attr_ attribute whose value is exactly _value_ or begins with _value_ immediately followed by a hyphen.      |

In the example below you can see these selectors being used.

- By using `li[class]` we can match any list item with a class attribute. This matches all of the list items except the first one.
- `li[class="a"]` matches a selector with a class of `a`, but not a selector with a class of `a` with another space-separated class as part of the value. It selects the second list item.
- `li[class~="a"]` will match a class of `a` but also a value that contains the class of `a` as part of a whitespace-separated list. It selects the second and third list items.

Try editing the above CSS to add a rule that selects only list items with a `class` attribute value of `ab`, and gives them a `white` text `color` and a `purple` `background-color`.

## Substring matching selectors

These selectors allow for more advanced matching of substrings inside the value of your attribute. For example, if you had classes of `box-warning` and `box-error` and wanted to match everything that started with the string "box-", you could use `[class^="box-"]` to select them both (or `[class|="box"]` as described in section above).

| Selector        | Example             | Description                                                                                        |
| --------------- | ------------------- | -------------------------------------------------------------------------------------------------- |
| `[attr^=value]` | `li[class^="box-"]` | Matches elements with an _attr_ attribute, whose value begins with _value_.                        |
| `[attr$=value]` | `li[class$="-box"]` | Matches elements with an _attr_ attribute whose value ends with _value_.                           |
| `[attr*=value]` | `li[class*="box"]`  | Matches elements with an _attr_ attribute whose value contains _value_ anywhere within the string. |

The next example shows usage of these selectors:

- `li[class^="a"]` matches any attribute value which starts with `a`, so matches the first two list items.
- `li[class$="a"]` matches any attribute value that ends with `a`, so matches the first and third list item.
- `li[class*="a"]` matches any attribute value where `a` appears anywhere in the string, so it matches all of our list items.

Try editing the above CSS to add a rule that selects only list items with a `class` attribute value that has `b` or `c` at the end of it, and gives them a `2px`-wide, `solid`, `black` `border`. You may have to use a [selector list](/en-US/docs/Learn_web_development/Core/Styling_basics/Basic_selectors#selector_lists) to solve this one.

## Summary

Now that we are done with attribute selectors, you can continue on to the next article and read about pseudo-class and pseudo-element selectors.
