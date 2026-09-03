---
title: Challenge: A mobile-first layout
doc_id: mobile-first-challenge
source_url: https://developer.mozilla.org/en-US/docs/learn-web-development/core/css-layout/mobile-first-challenge
license: CC BY-SA 2.5 (MDN Web Docs)
---

This challenge rounds off the [CSS layout](/en-US/docs/Learn_web_development/Core/CSS_layout) module by asking you to update an existing mobile layout so that it also works well on desktop browsers. Along the way, you'll also be tested on responsive layout features such as media queries, CSS grid, flexbox, and responsive images.

After you're done with this challenge, you can move on to learning about implementing dynamic behavior with [JavaScript](/en-US/docs/Learn_web_development/Core/Scripting).

## Starting point

We are going to get you to solve this challenge in your local development environment; ideally, you'll want to view the example in a full browser window to make sure the layout features are working as expected.

1. Create a new folder on your computer called `mobile-first-challenge`.
2. Inside the folder, create an `index.html` file and paste the following content into it:

3. Inside the folder, create a `style.css` file and paste the following content into it:

4. Inside the folder, create a `script.js` file and paste the following content into it:

5. Inside the folder, create a subfolder called `images` and save the following image files inside it:
   - [`square1.jpg`](https://mdn.github.io/shared-assets/images/examples/learn/balloons/square1.jpg)
   - [`square2.jpg`](https://mdn.github.io/shared-assets/images/examples/learn/balloons/square2.jpg)
   - [`square3.jpg`](https://mdn.github.io/shared-assets/images/examples/learn/balloons/square3.jpg)
   - [`square4.jpg`](https://mdn.github.io/shared-assets/images/examples/learn/balloons/square4.jpg)
   - [`square5.jpg`](https://mdn.github.io/shared-assets/images/examples/learn/balloons/square5.jpg)
   - [`square6.jpg`](https://mdn.github.io/shared-assets/images/examples/learn/balloons/square6.jpg)
6. Save your files and load `index.html` in a browser, ready to test. The starting point of the page should look something like this when viewed in a narrow viewport:

   ![Starting point of the mobile-first task. A single column layout with a logo at the top and a hamburger menu icon, followed by a top-level heading, followed by text content with a floated image.](rwd-task-start.png)

## Project brief

The content provided for this example is the same as the content from the previous challenge, [Fundamental layout comprehension](/en-US/docs/Learn_web_development/Core/CSS_layout/Fundamental_Layout_Comprehension), with some minor structural differences. It also has a mostly complete layout from the beginning, although as you may have noticed from checking it out, it looks terrible in a widescreen viewport!

This is because we've provided you with a mobile layout to begin with. Note how the navigation menu is accessed by pressing the "hamburger menu" icon, and can be dismissed by clicking a menu item or pressing the Esc key. This functionality is handled using JavaScript, and only works when the viewport is less than `800px` wide so that it doesn't interfere with the wider-screen layouts you'll be implementing.

Specifically, we want you to implement two layouts: the first one triggers when the width is more than `800px`, and the second triggers at above `1300px`. We'll also get you to fix a couple of issues with the existing code and implement some additional features.

### Fixing a couple of display issues

First of all, you'll need to solve a couple of problems that we've left in the starting template.

1. At the moment, your layouts won't display properly in mobile browsers. Add a tag to the `` of your `` document to fix this.
2. With the browser window set to a narrow width, look at the bottom of the page — you'll see that the photo gallery is not displaying properly because the photographs are breaking out of their containers. Add a declaration to your CSS file to fix this.

### Creating the middle layout

The middle layout needs to be applied to the page above a viewport width of `800px`. Follow these steps to complete the layout:

1. Hide the menu `` and show the ``. We only want to use the hide/show menu in the mobile layout.
2. Change the positioning of the `` so that, instead of sitting over the top of most of the content, it sits at the top of the site, just below the "My exciting website!" logo. We also want it to stick to the top of the viewport once the content has scrolled up that far.
3. The navigation list items are currently displaying in a column. For this layout, you instead want them to display as a row across the entire screen.
4. Adjust the `` elements inside the list items to give them `10px` of top and bottom padding, and a smaller font size (say `100%`).
5. The ``, ``, and `` elements are all children of the `` element. We'd like you to lay them out as a grid, using named grid template areas, in the following structure:

   The `` element should have a width three times that of the `` element; both elements should sit on the same row. The `` element should be on a separate row above the other two elements and span all the available width. We'd also like you to include a gap of `20px` between the different grid items.

### Creating the widescreen layout

The widescreen layout needs to be applied to the page above a viewport width of `1300px`. Follow these steps to complete the layout:

1. Change the grid layout you implemented for the middle layout to a different one, again using named grid template areas. This time, the structure should be like this:

   This time, all three elements are on the same row. The `` and `` elements should take up the same width; the `` element should be three times the width of the other two.
2. The navigation list items are displaying in a row as a result of the middle layout; for the widescreen layout to work, you'll need to adjust the list styling so that the list items display in a column again, like they did in the mobile layout.
3. The list items currently have a `flex` value of `1`, meaning that they'll stretch to fill the entire height of the column. Adjust this property value so that the nav items are only as tall as their content and the set `padding`.

### Implementing responsive typography

We want you to adjust the styling of the `` and `` elements so that they:

1. Have their top and bottom `margin` removed so they fit more snugly with the content above and below.
2. Change their size responsively as the viewport is widened or narrowed, while still being zoomable. You should choose appropriate units so that the headings fill up the available space nicely without breaking onto multiple lines.

### Adjusting the layout for print

Add a style block that removes the `` and `` elements from the layout when you are printing the page.

## Hints and tips

1. You don't need to edit the JavaScript to complete this challenge.
2. There are a few ways to achieve some of the tasks in the project brief, and there often isn't a single right or wrong way to do things. Try a few different approaches and see what works best. Make notes as you experiment.
3. Sometimes, a property value set for a previous layout will cause problems with subsequent layouts. Some of the skill with responsive design is knowing when to unset or override previously-set property values.

## Example

The following screenshot shows what the finished middle layout should look like:

![Finished rwd task website middle layout. A logo at the top, followed by a horizontal nav menu, followed by two columns, text content on the left and a photo gallery on the right.](rwd-task-middle.png)

The following screenshot shows what the finished widescreen layout should look like:

![Finished rwd task website widescreen layout. A logo at the top, followed by three columns, vertical nav menu on the left, text content in the center, and a photo gallery on the right.](rwd-task-widescreen.png)

Click here to show a possible solution

To cause the layouts to display properly in mobile browsers, you need to add a viewport `` tag inside the `` of the HTML document:

The finished CSS should look something like this:
