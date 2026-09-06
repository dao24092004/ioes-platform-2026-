---
title: Flexbox
doc_id: flexbox
source_url: https://developer.mozilla.org/en-US/docs/learn-web-development/core/css-layout/flexbox
license: CC BY-SA 2.5 (MDN Web Docs)
---

[Flexbox](/en-US/docs/Web/CSS/Guides/Flexible_box_layout) is a one-dimensional layout method for arranging items in rows or columns. Items _flex_ (expand) to fill additional space or shrink to fit into smaller spaces. This article explains all the fundamentals.

      Prerequisites:

        Structuring content with HTML,
        CSS Styling basics,
        Fundamental text and font styling,
        familiarity with CSS layout fundamental concepts.

      Learning outcomes:

          The purpose of flexbox — flexibly lay out a set of block or inline elements in one dimension.
          Flex terminology — flex container, flex item, main axis, and cross axis.
          Understand what display: flex gives you by default.
          How to wrap content onto new rows and columns.
          Flexible sizing and ordering of flex items.
          Justifying and aligning content.

## Why flexbox?

CSS flexible box layout enables you to:

- Vertically center a block of content inside its parent.
- Make all the children of a container take up an equal amount of the available width/height, regardless of how much width/height is available.
- Make all columns in a multiple-column layout adopt the same height even if they contain a different amount of content.

Flexbox features may be the perfect solution for your one dimensional layout needs. Let's dig in and find out!

> [!NOTE]
> Scrimba's introductory [Flexbox](https://scrimba.com/learn-html-and-css-c0p/~017?via=mdn) [_MDN learning partner_](/en-US/docs/MDN/Writing_guidelines/Learning_content#partner_links_and_embeds) scrim provides an interactive guide covering how common flexbox is on the web and therefore why it is so important to learn, and walks you through a typical use case that demonstrates the power of flexbox.

## Introducing a simple example

In this article, you'll work through a series of exercises to help you understand how flexbox works. To get started, you should make a local copy of the HTML and CSS. Load it in a modern browser (like Firefox or Chrome) and have a look at the code in your code editor. Alternatively click the "Play" button to open it in the playground.

You'll see that we have a header element with a top level heading inside it and a section element containing three articles. We're going to use these to create a fairly standard three column layout.

## Specifying what elements to lay out as flexible boxes

To start with, we need to select which elements are to be laid out as flexible boxes. To do this, we set a special value of display on the parent element of the elements you want to affect. In this case we want to lay out the article elements, so we set this on the section:

This causes the `` element to become a **flex container** and its children become **flex items**. This is what it looks like:

This single declaration gives us everything we need. Incredible, right? We have a multiple column layout with equal-sized columns, and the columns are all the same height. This is because the default values given to flex items (the children of the flex container) are set up to solve common problems such as this.

Let's recap what's happening here. Adding a display value of `flex` to an element makes it a flex container. The container is displayed as [Block-level content](/en-US/docs/Glossary/Block-level_content) in terms of how it interacts with the rest of the page. When the element is converted to a flex container, its children are converted to (and laid out as) flex items.

You can make the container inline using an [outside `display` value](/en-US/docs/Web/CSS/Reference/Properties/display#outside) (e.g., `display: inline flex`), which affects how the container itself is laid out in the page.
The legacy `inline-flex` display value displays the container as inline as well.
We'll focus on how the contents of the container behave in this tutorial, but if you want to see the effect of inline versus block layout, you can have a look at the [value comparison](/en-US/docs/Web/CSS/Reference/Properties/display#display_value_comparison) on the `display` property page.

The next sections explain in more detail what flex items are and what happens inside an element when you make it a flex container.

## The flex model

When elements are laid out as flex items, they are laid out along two axes:

![Three flex items in a left-to-right language are laid out side-by-side in a flex container. The main axis — the axis of the flex container in the direction in which the flex items are laid out — is horizontal. The ends of the axis are main-start and main-end and are on the left and right respectively. The cross axis is vertical; perpendicular to the main axis. The cross-start and cross-end are at the top and bottom respectively. The length of the flex item along the main axis, in this case, the width, is called the main size, and the length of the flex item along the cross axis, in this case, the height, is called the cross size.](flex_terms.png)

- The **main axis** is the axis running in the direction the flex items are laid out in (for example, as a row across the page, or a column down the page.) The start and end points of this axis are called the **main start** and **main end**. The length of a flex item along the main axis is the **main size**.
- The **cross axis** is the axis running perpendicular to the direction the flex items are laid out in. The start and end points of this axis are called the **cross start** and **cross end**. The length of a flex item along the cross axis is the **cross size**.
- The parent element that has `display: flex` set on it (the section in our example) is called the **flex container**.
- The items laid out as flexible boxes inside the flex container are called **flex items** (the article elements in our example).

Bear this terminology in mind as you go through subsequent sections. You can always refer back to it if you get confused about any of the terms being used.

## Columns or rows?

Flexbox provides a property called flex-direction that specifies which direction the main axis runs (which direction the flexbox children are laid out in). By default this is set to `row`, which causes them to be laid out in a row in the direction your browser's default language works in (left to right, in the case of an English browser).

Try adding the following declaration to your section rule:

You'll see that this puts the items back in a column layout, much like they were before we added any CSS. Before you move on, delete this declaration from your example.

> [!NOTE]
> You can also lay out flex items in a reverse direction using the `row-reverse` and `column-reverse` values. Experiment with these values too!

## Wrapping

One issue that arises when you have a fixed width or height in your layout is that eventually your flexbox children will overflow their container, breaking the layout. In the following example we have 5 articles, which don't fit, because they have a `min-width` of `400px`, so there is a horizontal scroll.

Here we see that the children are indeed breaking out of their container. By default, the browser tries to place all the flex items in a single row if the `flex-direction` is set to `row` or a single column if the `flex-direction` is set to `column`.

One way in which you can fix this is to add the following declaration to your section rule:

You'll see that the layout looks much better with this included:

We now have multiple rows. Each row has as many flexbox children fitted into it as is sensible. Any overflow is moved down to the next line.

But there's more we can do here. First of all, try changing your flex-direction property value to `row-reverse`. Now you'll see that you still have your multiple row layout, but it starts from the opposite corner of the browser window and flows in reverse.

## flex-flow shorthand

At this point it's worth noting that a shorthand exists for flex-direction and flex-wrap: flex-flow. So, for example, you can replace

with

## Flexible sizing of flex items

Let's now return to our first example and look at how we can control what proportion of space flex items take up compared to the other flex items.

In your local copy, add the following rule to the bottom of your CSS:

This is a unitless proportion value that dictates how much available space along the main axis each flex item will take up compared to other flex items. In this case, we're giving each article element the same value (a value of `1`), which means they'll all take up an equal amount of the spare space left after properties like padding and margin have been set. This value is proportionally shared among the flex items: giving each flex item a value of `400000` would have exactly the same effect.

Now add the following rule below the previous one:

Now when you refresh, you'll see that the third article takes up twice as much of the available width as the other two. There are now four proportion units available in total (since 1 + 1 + 2 = 4). The first two flex items have one unit each, so they each take 1/4 of the available space. The third one has two units, so it takes up 2/4 of the available space (or one-half).

You can also specify a minimum size value within the flex value. Try updating your existing article rules like so:

This basically states, "Each flex item will first be given `100px` of the available space. After that, the rest of the available space will be shared according to the proportion units." You'll see a difference in how the space is shared.

All the flex items have a minimum width of 100 pixels—set using 'flex'. The value of flex for first two flex items is 1 and for the third item is 2. This splits the remaining space in the flex container into 4 proportion units. One unit is assigned to each of the first two flex items and 2 units are assigned to the third flex item, making the third flex item wider than the other two, which are of the same width.

The real value of flexbox can be seen in its flexibility/responsiveness. If you resize the browser window or add another article element, the layout continues to work just fine.

## flex: shorthand versus longhand

flex is a shorthand property that can specify up to three different values:

- The unitless proportion value we discussed above. This can be specified separately using the flex-grow longhand property.
- A second unitless proportion value, flex-shrink, which comes into play when the flex items are overflowing their container. This value specifies how much an item will shrink in order to prevent overflow. This is quite an advanced flexbox feature and we won't be covering it any further in this article.
- The minimum size value we discussed above. This can be specified separately using the flex-basis longhand value.

We'd advise against using the longhand flex properties unless you really have to (for example, to override something previously set). They lead to a lot of extra code being written and can be somewhat confusing.

## Horizontal and vertical alignment

You can also use flexbox features to align flex items along the main or cross axis. Let's explore this by looking at a new example:

We're going to turn this into a neat, flexible button/toolbar. At the moment you'll see a horizontal menu bar with some buttons jammed into the top left-hand corner.

First, take a local copy of this example.

Now, add the following to the bottom of the example's CSS:

Refresh the page and you'll see that the buttons are now nicely centered horizontally and vertically. We've done this via two new properties. The flex items are positioned at the center of the cross-axis by setting the `align-items` property to `center`. The flex items are spaced evenly along the main-axis by setting the `justify-content` property to `space-around`.

The align-items property controls where the flex items sit on the cross axis.

- By default, the value `normal` which behaves as `stretch` in flexbox. This stretches all flex items to fill the parent in the direction of the cross axis. If the parent doesn't have a fixed size in the cross axis direction, then all flex items will become as tall (or wide) as the tallest (or widest) flex item. This is how our first example had columns of equal height by default.
- The `center` value that we used in our above code causes the items to maintain their intrinsic dimensions, but be centered along the cross axis. This is why our current example's buttons are centered vertically.
- You can also have values like `flex-start`, `self-start` or `start` and `flex-end`, `self-end` or `end`, which will align all items at the start and end of the cross axis respectively. The `baseline` values will line up the flex items by their baseline; basically the bottom of each flex items first line of text will be lined up with the bottom of the first line of the element with the greatest distance between the cross start and that baseline. See align-items for the full details.

You can override the align-items behavior for individual flex items by applying the align-self property to them. For example, try adding the following to your CSS:

Have a look at what effect this has and remove it again when you've finished.

justify-content controls where the flex items sit on the main axis.

- The default value is `normal`, which behaves as `start`, which makes all the items sit at the start of the main axis.
- You can use `end` or `flex-end` to make them sit at the end.
- The `left` and `right` values behave as `start` or `end` depending on the writing mode direction.
- `center` is also a value for `justify-content`. It'll make the flex items sit in the center of the main axis.
- The value we've used above, `space-around`, is useful — it distributes all the items evenly along the main axis with a bit of space left at either end.
- There is another value, `space-between`, which is very similar to `space-around` except that it doesn't leave any space at either end.

The justify-items property is ignored in flexbox layouts.

We'd like to encourage you to play with these values to see how they work before you continue.

## Ordering flex items

Flexbox also has a feature for changing the layout order of flex items without affecting the source order. This is another thing that is impossible to do with traditional layout methods.

Try adding the following CSS to your button bar example code:

Refresh and you'll see that the "Smile" button has moved to the end of the main axis. Let's talk about how this works in a bit more detail:

- By default, all flex items have an order value of `0`.
- Flex items with higher specified order values will appear later in the display order than items with lower order values.
- Flex items with the same order value will appear in their source order. So if you have four items whose order values have been set as `2`, `1`, `1`, and `0` respectively, their display order would be 4th, 2nd, 3rd, then 1st.
- The 3rd item appears after the 2nd because it has the same order value and is after it in the source order.

You can set negative order values to make items appear earlier than items whose value is `0`. For example, you could make the "Blush" button appear at the start of the main axis using the following rule:

While you can change the order using `order`, the tabbing order remains the same as the code order. Changing the order of focusable elements can negatively impact usability for your keyboard users!

## Nested flex boxes

It's possible to create some pretty complex layouts with flexbox. It's perfectly OK to set a flex item to also be a flex container, so that its children are also laid out like flexible boxes.

This complex layout has a few flex items that are also flex containers. The HTML for this is fairly straightforward. We've got a section element containing three articles. The third article contains three divs, and the first div contains five buttons:

Let's look at the code we've used for the layout.

First of all, we set the children of the section to be laid out as flexible boxes.

Next, we set some flex values on the articles themselves. Take special note of the second rule here: we're setting the third article to have its children laid out like flex items too, but this time we're laying them out like a column.

Next, we select the first div. We first use `flex: 1 100px;` to effectively give it a minimum height of `100px`, then we set its children (the button elements) to also be laid out like flex items. Here we lay them out in a wrapping row and align them in the center of the available space as we did with the individual button example we saw earlier.

Finally, we set some sizing on the button. This time by giving it a flex value of `1 auto`. This has a very interesting effect, which you'll see if you try resizing your browser window width. The buttons will take up as much space as they can. As many will fit on a line as is comfortable; beyond that, they'll drop to a new line.

## Summary

That concludes our tour of the basics of flexbox. We hope you had fun and will have a good play around with it as you proceed further with your learning. In the next article, we'll give you some tests that you can use to check how well you've understood and retained all this information.

## See also

- [Basic concepts of flexbox](/en-US/docs/Web/CSS/Guides/Flexible_box_layout/Basic_concepts)
- [Aligning items in a flex container](/en-US/docs/Web/CSS/Guides/Flexible_box_layout/Aligning_items)
- [Ordering flex items](/en-US/docs/Web/CSS/Guides/Flexible_box_layout/Ordering_items)
- [Controlling ratios of flex items along the main axis](/en-US/docs/Web/CSS/Guides/Flexible_box_layout/Controlling_flex_item_ratios)
- [CSS flexible box layout](/en-US/docs/Web/CSS/Guides/Flexible_box_layout) module
- [CSS-Tricks guide to flexbox](https://css-tricks.com/snippets/css/a-guide-to-flexbox/) — an article explaining everything about flexbox in a visually appealing way
- [Flexbox Froggy](https://flexboxfroggy.com/) — an educational game to learn and better understand the basics of flexbox
