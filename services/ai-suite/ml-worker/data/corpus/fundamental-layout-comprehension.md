---
title: Challenge: Fundamental layout comprehension
doc_id: fundamental-layout-comprehension
source_url: https://developer.mozilla.org/en-US/docs/learn-web-development/core/css-layout/fundamental-layout-comprehension
license: CC BY-SA 2.5 (MDN Web Docs)
---

This challenge will test your knowledge of the layout features we've covered so far in the module, namely flexbox, floats, grid, and positioning. By the end, you will have developed a webpage layout using all of these fundamental tools.

## Starting point

We are going to get you to solve this challenge in your local development environment; ideally, you'll want to view the example in a full browser window to make sure the layout features are working as expected.

1. Create a new folder on your computer called `layout-challenge`.
2. Inside the folder, create an `index.html` file and paste the following content into it:

3. Inside the folder, create a `style.css` file and paste the following content into it:

4. Inside the folder, create a subfolder called `images` and save the following image files inside it:
   - [`square1.jpg`](https://mdn.github.io/shared-assets/images/examples/learn/balloons/square1.jpg)
   - [`square2.jpg`](https://mdn.github.io/shared-assets/images/examples/learn/balloons/square2.jpg)
   - [`square3.jpg`](https://mdn.github.io/shared-assets/images/examples/learn/balloons/square3.jpg)
   - [`square4.jpg`](https://mdn.github.io/shared-assets/images/examples/learn/balloons/square4.jpg)
   - [`square5.jpg`](https://mdn.github.io/shared-assets/images/examples/learn/balloons/square5.jpg)
   - [`square6.jpg`](https://mdn.github.io/shared-assets/images/examples/learn/balloons/square6.jpg)
5. Save your files and load `index.html` in a browser, ready to test. The starting point of the page has basic styling but no layout, and should look something like this:

   ![Starting point of the layout task. The elements are not laid out neatly. There is a website title, above a black nav bar with 5 links flush left, followed by the blog post title and post content. Between the blog title and blog content there is a photo that is flush left.](layout-task-start.png)

## Project brief

You have been provided with some raw HTML, basic CSS, and images — now you need to create a layout for the design.

The tasks you need to achieve are:

1. Display the navigation items in a row, with an equal amount of space between the items and a smaller amount of space at either end of the row.
2. Style the navigation bar so it scrolls with the content normally but then becomes stuck at the top of the viewport when it reaches it.
3. Cause the "feature" image inside the article to have text wrapped around it to the right and bottom, with a suitable amount of space between the image and the text.
4. Display the article and aside elements as a two-column layout, with the former three times as wide as the latter. The columns should be a flexible size so that if the browser window gets narrower, the columns become narrower. Include a 20-pixel gap between the two columns.
5. The photographs should display as a two-column grid with equal-sized columns and a 5-pixel gap between the images.

## Hints and tips

- You don't need to edit the HTML to complete this challenge.
- There are a few ways to achieve some of the tasks in the project brief, and there often isn't a single right or wrong way to do things. Try a few different approaches and see what works best. Make notes as you experiment.

## Example

The following screenshot shows an example of what the finished layout for the design should look like:

![Finished layout task website. The elements are laid out neatly. There is a website title, above a black nav bar containing 5 equally spaced links. Below the nav bar, there are two sections. On the left there is a blog post: A blog post title followed by the post content. The blog content wraps around a photo that is flush left. On the right side there is a 'photography' title about a group of images laid out in a two-image wide grid.](layout-task-complete.png)

Click here to show a potential solution

The finished CSS looks like so:
