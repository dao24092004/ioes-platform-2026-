---
title: Challenge: Sizing and decorating a content panel
doc_id: size-decorate-content-panel
source_url: https://developer.mozilla.org/en-US/docs/learn-web-development/core/styling-basics/size-decorate-content-panel
license: CC BY-SA 2.5 (MDN Web Docs)
---

In this challenge you are provided with a lightly-styled page structure that renders a content panel containing text and images, with a heading at the top and a button bar at the bottom. We want you to follow the instructions to size and decorate it, producing an interesting layout as a result. Along the way, we'll test your knowledge of CSS values and units, sizing, overflow, and backgrounds and borders.

## Starting point

We are going to get you to solve this challenge on your local development environment; ideally, you'll want to view the example in a full browser window to make sure you are going in the right direction.

1. Create a new folder on your computer called `size-decorate-content-panel`.
2. Inside the folder, create an `index.html` file and paste the following content into it:

3. Inside the folder, create a `style.css` file and paste the following content into it:

4. Save your files and load `index.html` in a browser ready to test.

## Project brief

Follow the steps below to complete the project, sizing the content pane appropriately and adding the required decorations.

### Headings

1. Use generated content to make a book emoji (📖) appear at the start of the top-level heading. Add `20px` of spacing in between the emoji and the heading text.
2. Currently, the headings are sized in `em`s. We'd like you to change the sizing so that it is responsive, changing based on the viewport width but also remaining zoomable. To achieve this, make each heading level's sizing equal to a suitable percentage of the viewport width plus a smaller `em` value.

### Container sizing

1. Make the width of the `` wrapper element with a class of `pane` equal to `60%`, but give it a maximum width of `1000px` and minimum width of `480px`. See if you can find a CSS function that allows you to set this using a single declaration.
2. Center the `pane` `` horizontally on the page using `auto` margins.
3. Set the `` and the `` with a class of `controls` to both be `100px` high. Set the `` with a class of `content` to be `100%` of the `` height, minus the height of the `` and the ``. This should give you a UI that always stretches to be the height of the viewport, with a flexible content container and a fixed height heading and button bar.
4. The buttons look a bit thin and hard to read. Give them a height of `100%` of their container, and a font size of `1.2em`.
5. Give the `pane` `` and the `content` `` top/bottom padding of `0` on both sides and left/right padding of `20px` on both sides.

### Image placement

1. The images currently overflow the content container. Set a maximum width of `90%` on them to stop this happening.
2. Center the images horizontally using `auto` margins.

### Decoration

1. Apply a linear gradient to the `pane` `` that changes smoothly from `#9fb4c7` at the top to `#7f7caf` at the bottom.
2. Give the images a `1px solid` border and the `content` `` a `2px solid` border. Give the borders a color of `#28587b`.
3. Give the `content` `` a background color of `#eeeeff`, and a background image of `https://mdn.github.io/shared-assets/images/examples/big-star.png`. The background image should not repeat, should be sized at `40px` by `40px`, and should be placed `5px` from the top of the container and `15px` from the right.
4. Give the buttons a text color of `white` and a background color of `rgb(40 88 123 / 0.8)`. On hover or focus, the buttons should change to have a fully opaque version of the same background color.
5. Set a `10px` border radius on the `content` `` and the buttons.

### Overflow

At this point, you should still notice a problem with the UI — the content contained in the `content` `` overflows its container, and the whole page scrolls to allow you to access it all. We want the `content` `` to scroll instead. How can you achieve this?

## Hints and tips

- Use the [W3C CSS Validator](https://jigsaw.w3.org/css-validator/) to catch unintended mistakes in your CSS — mistakes you might have otherwise missed — so that you can fix them.
- You don't need to alter the HTML in any way.

## Example

The starting state of the project will render like this:

The finished project should look like this (we've rendered this at `90%` width, not `60%`, so it looks better in the narrow output pane):

Click here to show a possible solution

The finished CSS looks like so:
