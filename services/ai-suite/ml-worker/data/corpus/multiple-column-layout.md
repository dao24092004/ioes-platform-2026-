---
title: Multiple-column layout
doc_id: multiple-column-layout
source_url: https://developer.mozilla.org/en-US/docs/learn-web-development/core/css-layout/multiple-column-layout
license: CC BY-SA 2.5 (MDN Web Docs)
---

The multiple-column layout specification provides you with a method for laying content out in columns, as you might see in a newspaper. This article explains how to use this feature.

      Prerequisites:

        HTML basics (study
        Structuring content with HTML), and an idea of How CSS works (study
        CSS Styling basics.)

      Objective:

        To learn how to create multiple-column layout on webpages, such as you
        might find in a newspaper.

## A basic example

Let's explore how to use multiple-column layout — often referred to as _multicol_ — by building up an example step by step. To follow along, create a new HTML on your local system and add the following content into it:

You'll see various live examples below showing you what the rendered output should look like at each stage.

### A three-column layout

Our starting point file contains some very simple HTML: a wrapper with a class of `container`, inside of which is a heading and some paragraphs.

The div with a class of container will become our multicol container. We enable multicol by using one of two properties: column-count or column-width. The `column-count` property takes a number as its value and creates that number of columns. If you add the following CSS to your stylesheet and reload the page, you'll get three columns:

The columns that you create have flexible widths — the browser works out how much space to assign each column.

### Setting column-width

Change your CSS to use `column-width` as follows:

The browser will now give you as many columns as it can of the size that you specify; any remaining space is then shared between the existing columns. This means that you won't get exactly the width that you specify unless your container is exactly divisible by that width.

## Styling the columns

The columns created by multicol cannot be styled individually. There's no way to make one column bigger than other columns or to change the background or text color of a single column. You have two opportunities to change the way that columns display:

- Changing the size of the gap between columns using the column-gap.
- Adding a rule between columns with column-rule.

Using your example above, change the size of the gap by adding a `column-gap` property. You can play around with different values — the property accepts any length unit.

Now add a rule between the columns with `column-rule`. In a similar way to the border property that you encountered in previous lessons, `column-rule` is a shorthand for column-rule-color, column-rule-style, and column-rule-width, and accepts the same values as `border`.

Try adding rules of different styles and colors.

Something to take note of is that the rule doesn't take up any width of its own. It lies across the gap you created with `column-gap`. To make more space on either side of the rule, you'll need to increase the `column-gap` size.

## Spanning columns

You can cause an element to span across all the columns. In this case, the content breaks where the spanning element's introduced and then continues below the element, creating a new set of columns. To cause an element to span all the columns, specify the value of `all` for the column-span property.

> [!NOTE]
> It isn't possible to cause an element to span just _some_ columns. The property can only have the values of `none` (which is the default) or `all`.

Add the following rule to your CSS, below the previous ones:

Now add a second-level heading between the first and second paragraphs:

You rendered code should now look like this:

## Columns and fragmentation

The content of a multi-column layout is fragmented. It essentially behaves the same way as content behaves in paged media, such as when you print a webpage. When you turn your content into a multicol container, it fragments into columns. In order for the content to do this, it must _break_.

### Fragmented boxes

Sometimes, this breaking will happen in places that lead to a poor reading experience. In the example below, I have used multicol to lay out a series of boxes, each of which has a heading and some text inside. The heading becomes separated from the text if the columns fragment between the two.

### Setting break-inside

To control this behavior, we can use properties from the [CSS Fragmentation](/en-US/docs/Web/CSS/Guides/Fragmentation) specification. This specification gives us properties to control the breaking of content in multicol and in paged media. For example, by adding the property break-inside with a value of `avoid` to the rules for `.card`. This is the container of the heading and text, so we don't want it fragmented.

The addition of this property causes the boxes to stay in one piece—they now do not _fragment_ across the columns.

## Summary

You now know how to use the basic features of multiple-column layout, another tool at your disposal when choosing a layout method for the designs you're building.

## See also

- [CSS Fragmentation](/en-US/docs/Web/CSS/Guides/Fragmentation)
- [Using multi-column layouts](/en-US/docs/Web/CSS/Guides/Multicol_layout/Using)
