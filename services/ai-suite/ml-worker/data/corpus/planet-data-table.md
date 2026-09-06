---
title: Challenge: Structuring a planet data table
doc_id: planet-data-table
source_url: https://developer.mozilla.org/en-US/docs/learn-web-development/core/structuring-content/planet-data-table
license: CC BY-SA 2.5 (MDN Web Docs)
---

In this challenge, we provide data on the planets in our solar system. Your job is to structure it into an accessible HTML table.

## Starting point

1. Create a new folder in an appropriate location on your computer called `planet-data-table` (or open an online editor and take the required steps to create a new project).
2. Save the following HTML listing inside a file inside your folder called `index.html` (or paste it into your online editor's HTML pane).

3. Save the following CSS listing inside a file inside your folder called `style.css` (or paste it into your online editor's CSS pane).

4. Keep the following data handy; you'll need to turn this into an HTML data table inside your HTML.

## Project brief

You are working at a school; currently, your students are studying the planets of our solar system, and you want to provide them with an easy-to-follow set of data to look up facts and figures about the planets. An HTML data table would be ideal — you need to take the raw data you have available and turn it into a table, following the steps below.

All the data you need is contained in the data listing provided above. If you have trouble visualizing the data, take a look at the live example below, or try drawing a diagram.

1. Start the table off by giving it an outer container, a table header, and a table body. You don't need a table footer for this example.
2. Add the provided caption to your table.
3. Add a row to the table header containing all the column headers.
4. Create all the content rows inside the table body, remembering to make all the row headings into headings semantically.
5. Ensure all the content is placed into the right cells — in the raw data, each row of planet data is shown next to its associated planet.
6. Add attributes to make the row and column headers unambiguously associated with the rows, columns, or row groups that they act as headings for.
7. Add a black [border](/en-US/docs/Web/CSS/Reference/Properties/border) just around the column that contains all the planet name row headers. Do this using a suitable ``/`` structure and the `.column-border` class style provided in the CSS.

## Hints and tips

- The first cell of the header row needs to be blank, and span two columns.
- The group row headings (e.g., _Jovian planets_) that sit to the left of the planet name row headings (e.g., _Saturn_) are a little tricky to sort out — you need to make sure each one spans the correct number of rows and columns.
- One way of associating headers with their rows/columns is a lot easier than the other way.

## Example

The table should look like the following after being marked up correctly. If you get stuck, check out the solution below the live example.

Click here to show the solution

Your finished HTML should look like this:
