---
title: Challenge: Styling a home color scheme search app
doc_id: home-color-scheme-search
source_url: https://developer.mozilla.org/en-US/docs/learn-web-development/core/styling-basics/home-color-scheme-search
license: CC BY-SA 2.5 (MDN Web Docs)
---

The final challenge of our [styling basics](/en-US/docs/Learn_web_development/Core/Styling_basics) module features a mockup of a "Home color search app" UI, the idea being to let users input a color and retrieve a range of variations along with sample color scheme ideas. Your task is to style the provided form, table, and button controls, and make sure the images display as expected.

> [!NOTE]
> The tinted images used in this challenge have been adapted from the original available on Flickr: [Chic Living Room](https://flickr.com/photos/145464578@N08/28362250492/), published by [Houseology Interiors](https://flickr.com/photos/145464578@N08/) under [CC BY-NC 2.0](https://creativecommons.org/licenses/by-nc/2.0/deed.en).

## Starting point

To begin, click the **Play** button in one of the code panels below to open the provided example in the MDN Playground. You'll then follow the instructions in the [Project brief](#project_brief) section to style the page appropriately.

## Project brief

Follow the steps below to complete the project, sizing the content pane appropriately and adding the required decorations.

### Add a form reset

First of all, add some "reset" styles to the `` and `` elements to give them a consistent starting state across browsers.

Specifically:

1. Make them inherit the font family set on the rest of the page.
2. Give them a font size of `100%`.
3. Remove all their padding and margin.

### Style the form inputs

Give the `` elements:

1. A `2px` solid border with the color `#999999`.
2. `10px` of padding.
3. `5px` rounded corners.

### Style the buttons

Give the `` elements:

1. No border.
2. A `black` background color and `white` text color.
3. `5px` rounded corners.
4. Vertical padding of `10px` and horizontal padding of `2em`.
5. A background color of `#666666` when hovered or focused.
6. A background color of `#aaaaaa` when disabled.

### Style the table

You should now add some best practice styling to the table, as learned earlier in the module, plus a few extras.

Specifically:

1. Give the table a fixed layout, a width of `100%`, and collapsed borders.
2. Make the table's top and bottom borders `1px` thick, solid, and colored `#999999`.
3. Give the table header cells and normal cells `0.6em` of padding, and make their content vertically aligned to the top of the cells.
4. Give the table header cells a bottom border that is `1px` thick, solid, and colored `#999999`.
5. Give all of the table columns a width of `20%`, except for the fourth column, which should have a width of `40%`.
6. Inside the table body, there are four rows. The second cell inside each of these rows contains text for an `rgb()` color. Give each one of these cells a background color that corresponds to its text.
7. Create zebra stripes: Give each odd-numbered row a background color of `#eeeeee`, inside the table body only.
8. Give the caption padding of `1em`, an italic font style, and letter spacing of `1px`.

### Fixing the image display

At this point, there is a problem with the images in the table — we've set each image to `100%` of the width of its table cell container, and a specific height of `150px`, as we didn't want the table rows to get too high. However, this has distorted the aspect ratio of the images, making them look a bit squashed.

We'd like you to style the images so that:

1. They are displayed at their intrinsic aspect ratio, but with a bit of the image cut off so they still fit inside the size of the `` elements.
2. The bottom of the image is shown, but the top of the image is cut off.

## Hints and tips

- You don't need to alter the HTML in any way.

## Example

The finished project should look like this:

Click here to show the solution

A possible solution could be:
