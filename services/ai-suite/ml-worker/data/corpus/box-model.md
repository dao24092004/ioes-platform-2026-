---
title: The box model
doc_id: box-model
source_url: https://developer.mozilla.org/en-US/docs/learn-web-development/core/styling-basics/box-model
license: CC BY-SA 2.5 (MDN Web Docs)
---

Everything in CSS has a box around it, and understanding these boxes is key to being able to create more complex layouts with CSS, or to align items with other items. In this lesson, we will take a look at the CSS _Box model_. You'll get an understanding of how it works and the terminology that relates to it.

      Prerequisites:

        HTML basics (study
        Basic HTML syntax)

      Learning outcomes:

          Block and inline elements
          The different boxes that make up an element and how to style them — content, margin, border, padding.
          The alternative box model (accessed via box-sizing: border-box) and how it differs from the regular box model.
          Margin collapsing.
          Basic display values and how they affect box behavior — block, inline, inline-block, none.

## Block and inline boxes

In CSS we have several types of boxes that generally fit into the categories of **block boxes** and **inline boxes**. The type refers to how the box behaves in terms of page flow and in relation to other boxes on the page. Boxes have an **inner display type** and an **outer display type**.

In general, you can set various values for the display type using the display property.

If a box has a display value of `block`, then:

- The box will break onto a new line.
- The width and height properties are respected.
- Padding, margin and border will cause other elements to be pushed away from the box.
- If width is not specified, the box will extend in the inline direction to fill the space available in its container. In most cases, the box will become as wide as its container, filling up 100% of the space available.

Some HTML elements, such as `` and ``, use `block` as their outer display type by default.

If a box has a display type of `inline`, then:

- The box will not break onto a new line.
- The width, height, and top and bottom margins will have no effect.
- **Top and bottom** padding and borders will change the size of the box without affecting the position of surrounding content, which can cause overlapping.
- **Left and right** padding, margins, and borders will affect the position of surrounding inline content.

Some HTML elements, such as ``, ``, `` and `` use `inline` as their outer display type by default.

Block and inline layout is the default way things behave on the web. By default and without any other instruction, the elements inside a box are also laid out in **[normal flow](/en-US/docs/Learn_web_development/Core/CSS_layout/Introduction#normal_layout_flow)** and behave as block or inline boxes.

## Inner and outer display types

`block` and `inline` display values are said to be **outer display** types — they affect how the box is laid out in relation to other boxes around it. Boxes also have an **inner display** type, which dictates how elements inside that box are laid out.

You can change the inner display type by setting an inner display value, for example `display: flex;`. The element will still use the outer display type `block` but this changes the inner display type to `flex`. Any direct children of this box will become flex items and behave according to the [Flexbox](/en-US/docs/Learn_web_development/Core/CSS_layout/Flexbox) specification.

When you move on to learn about CSS Layout in more detail, you will encounter [`flex`](/en-US/docs/Learn_web_development/Core/CSS_layout/Flexbox), and various other inner values that your boxes can have, for example [`grid`](/en-US/docs/Learn_web_development/Core/CSS_layout/Grids).

Don't worry too much about the inner and outer terminology for now; this is what is happening internally, and we mentioned it here in case you come across it elsewhere. Generally, you will just deal with single `display` values, and won't need to think about it much.

## Examples of different display types

The example below has three different HTML elements, all of which have an outer display type of `block`.

- A paragraph with a border added in CSS. The browser renders this as a block box. The paragraph starts on a new line and extends horizontally to fill the entire available width.

- A list, which is laid out using `display: flex`. This establishes flex layout for the children of the container, which are flex items that are by default laid out in a row. The list itself is a block box and — like the paragraph — expands to the full container width and breaks onto a new line.

- A block-level paragraph, inside which are two `` elements. These elements would normally be `inline`, however, one of the elements has a class of `block` and gets set to `display: block`. As a result, that single word starts on a new line that spans the full width of its parent.

In the next example, we can see how `inline` elements behave.

- The `` elements in the first paragraph are inline by default and so do not force line breaks.

- The `` element that is set to `display: inline-flex` creates an inline box containing some flex items.

- The two paragraphs are both set to `display: inline`. The inline flex container and paragraphs all run together on one line rather than breaking onto new lines (as they would do if they were displaying as block-level elements).

To toggle between the display modes, you can change `display: inline` to `display: block` or `display: inline-flex` to `display: flex`:

The key thing to remember for now is: Changing the value of the `display` property can change whether the outer display type of a box is block or inline. This changes the way it displays alongside other elements in the layout.

## What is the CSS box model?

The CSS box model as a whole applies to block boxes and defines how the different parts of a box — margin, border, padding, and content — work together to create a box that you can see on a page. Inline boxes use just _some_ of the behavior defined in the box model.

To add complexity, there is a standard and an alternate box model. By default, browsers use the standard box model.

### Parts of a box

Making up a block box in CSS we have the:

- **Content box**: The area where your content is displayed; size it using properties like width and height.
- **Padding box**: The padding sits around the content as white space; size it using padding and related properties.
- **Border box**: The border box wraps the content and any padding; size it using border and related properties.
- **Margin box**: The margin is the outermost layer, wrapping the content, padding, and border as whitespace between this box and other elements; size it using margin and related properties.

The below diagram shows these layers:

![Diagram of the box model](box-model.png)

### The standard CSS box model

In the standard box model, if you set `width` and `height` property values on a box, these values define the `width` and `height` of the _content box_. Any padding and borders are then added to those dimensions to get the total size taken up by the box (see the image below).

If we assume that a box has the following CSS:

The _actual_ space taken up by the box will be `410px` wide (350 + 25 + 25 + 5 + 5) and `210px` high (150 + 25 + 25 + 5 + 5).

![Showing the size of the box when the standard box model is being used.](standard-box-model.png)

> [!NOTE]
> The margin is not counted towards the actual size of the box — sure, it affects the total space that the box will take up on the page, but only the space outside the box. The box's area stops at the border — it does not extend into the margin.

### The alternative CSS box model

In the alternative box model, any width is the width of the visible box on the page. The content area width is that width minus the width for the padding and border (see image below). This is convenient as there is no need to add up the border and padding to get the real size of the box.

To turn on the alternative model for an element, set `box-sizing: border-box` on it:

If we assume the box has the same CSS as above:

The _actual_ space taken up by the box will now be `350px` in the inline direction and `150px` in the block direction.

![Showing the size of the box when the alternate box model is being used.](alternate-box-model.png)

To use the alternative box model for all of your elements (which is a common choice among developers), set the `box-sizing` property on the `` element and set all other elements to inherit that value:

To understand the underlying idea, you can read [the CSS Tricks article on box-sizing](https://css-tricks.com/inheriting-box-sizing-probably-slightly-better-best-practice/).

## Playing with box models

In the example below, you can see two boxes. Both have a class of `.box`, which gives them the same `width`, `height`, `margin`, `border`, and `padding`. The only difference is that the second box has been set to use the alternative box model.
Can you change the size of the second box (by adding CSS to the `.alternate` class) to make it match the first box in width and height?

> [!NOTE]
> You can find a solution for this task [in our css-examples repo](https://github.com/mdn/css-examples/blob/main/learn/solutions.md#the-box-model).

### Using browser DevTools to view the box model

Your [browser developer tools](/en-US/docs/Learn_web_development/Howto/Tools_and_setup/What_are_browser_developer_tools) can make understanding the box model far easier — they can show you the size of the element plus its margin, padding, and border. Inspecting an element in this way is a great way to find out if your box is really the size you think it is!

![Inspecting the box model of an element using Firefox DevTools](box-model-devtools.png)

## Margins, padding, and borders

You've already seen the margin, padding, and border properties at work in the example above. The properties used in that example are **shorthands** and allow us to set all four sides of the box at once. These shorthands also have equivalent longhand properties, which allow control over the different sides of the box individually.

Let's explore these properties in more detail.

### Margin

The margin is an invisible space around your box. It pushes other elements away from the box. Margins can have positive or negative values. Setting a negative margin on one side of your box can cause it to overlap other things on the page. Whether you are using the standard or alternative box model, the margin is always added after the size of the visible box has been calculated.

We can control all margins of an element at once using the margin property, or each side individually using the equivalent longhand properties:

- margin-top
- margin-right
- margin-bottom
- margin-left

#### Playing with margins

Edit the example below. Try changing the margin values to see how the box is pushed around due to the margin creating or removing space (if it is a negative margin) between this element and the containing element.

#### Margin collapsing

Depending on whether two elements whose margins touch have positive or negative margins, the results will be different:

- Two positive margins will combine to become one margin. Its size will be equal to the largest individual margin.
- Two negative margins will collapse and the smallest (furthest from zero) value will be used.
- If one margin is negative, its value will be _subtracted_ from the total.

In the example below, we have two paragraphs. The top paragraph has a `margin-bottom` of 50 pixels, the other has a `margin-top` of 30 pixels. The margins have collapsed together so the actual margin between the boxes is 50 pixels and not the total of the two margins.

You can test this by setting the `margin-top` of paragraph two to `0`. The visible margin between the two paragraphs will not change — it retains the 50 pixels set in the `margin-bottom` of paragraph one. If you set it to `-10px`, you'll see that the overall margin becomes `40px` — it subtracts from the `50px`.

A number of rules dictate when margins do and do not collapse. For further information see the detailed page on [mastering margin collapsing](/en-US/docs/Web/CSS/Guides/Box_model/Margin_collapsing). The main thing to remember is that margin collapsing is a thing that happens if you are creating space with margins and don't get the space you expect.

> [!NOTE]
> [Learn margins via flags](https://scrimba.com/frontend-path-c0j/~01e?via=mdn) [_MDN learning partner_](/en-US/docs/MDN/Writing_guidelines/Learning_content#partner_links_and_embeds) from Scrimba is an interactive lesson providing some useful practice with margins.

### Borders

The border is drawn between the margin and the padding of a box. If you are using the standard box model, the size of the border is added to the `width` and `height` of the content box. If you are using the alternative box model, then the bigger the border is, the smaller the content box is, as the border takes up some of that available `width` and `height` of the element box.

For styling borders, there are a large number of properties — there are four borders, and each border has a style, width, and color that we might want to manipulate.

You can set the width, style, or color of all four borders at once using the border property.

To set the properties of each side individually, use:

- border-top
- border-right
- border-bottom
- border-left

To set the width, style, or color of all sides, use:

- border-width
- border-style
- border-color

To set the width, style, or color of a single side, use one of the more granular longhand properties:

- border-top-width
- border-top-style
- border-top-color
- border-right-width
- border-right-style
- border-right-color
- border-bottom-width
- border-bottom-style
- border-bottom-color
- border-left-width
- border-left-style
- border-left-color

#### Playing with borders

In the example below, we have used various shorthands and longhands to create borders. Edit the different properties to check that you understand how they work. The MDN pages for the border properties give you information about the different available border styles.

### Padding

The padding sits between the border and the content area and is used to push the content away from the border. Unlike margins, you cannot have a negative padding. Any background applied to your element will display behind the padding.

The padding property controls the padding on all sides of an element. To control each side individually, use these longhand properties:

- padding-top
- padding-right
- padding-bottom
- padding-left

#### Playing with padding

In the example below, edit the values for padding on the class `.box` and see how this changes where the text begins in relation to the box. You can also change the padding on the class `.container` to create space between the container and the box. You can change the padding on any element to create space between its border and whatever is inside the element.

## The box model and inline boxes

All of the above fully applies to block boxes. Some of the properties can apply to inline boxes too, such as those created by a `` element.

In the example below, we have a `` inside a paragraph. We have applied a `width`, `height`, `margin`, `border`, and `padding` to it. You can see that the width, height, and top and bottom margins do not affect the ``. The top and bottom padding and borders alter the size of the inline box but don't affect the position of the surrounding content. Instead, the top and bottom padding and borders overlap other words in the paragraph. Only the left and right padding, margins, and borders affect the position of the text surrounding the ``.

## Using display: inline-block

`display: inline-block` is a special value of `display`, which provides a middle ground between `inline` and `block`. Use it if you do not want an item to break onto a new line, but do want it to respect `width` and `height` and avoid the overlapping seen above.

An element with `display: inline-block` does a subset of the block things we already know about:

- The `width` and `height` properties are respected.
- `padding`, `margin`, and `border` will cause other elements to be pushed away from the box.

It does not, however, break onto a new line, and will only become larger than its content if you explicitly add `width` and `height` properties.

### Playing with inline-block

In this next example, we have added `display: inline-block` to our `` element. Try changing this to `display: block` or removing the line completely to see the difference in display models:

Where this can be useful is when you want to give a link a larger hit area by adding `padding`. `` is an inline element like ``; you can use `display: inline-block` to allow padding to be set on it, making it easier for a user to click the link.

You see this fairly frequently in navigation bars. The navigation below is displayed in a row using flexbox and we have added padding to the `` element as we want to be able to change the `background-color` when the `` is hovered. The padding appears to overlap the border on the `` element. This is because the `` is an inline element.

Add `display: inline-block;` to the rule with the `.links-list a` selector, and you will see how it fixes this issue by causing the padding to be respected by other elements:

## Summary

That's most of what you need to understand about the box model. You may want to return to this lesson in the future if you ever find yourself confused about how big boxes are in your layout.

In the next article, we'll give you some tests that you can use to check how well you've understood and retained the information we've provided on the CSS box model.
