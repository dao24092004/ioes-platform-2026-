---
title: Challenge: Image gallery
doc_id: image-gallery
source_url: https://developer.mozilla.org/en-US/docs/learn-web-development/core/scripting/image-gallery
license: CC BY-SA 2.5 (MDN Web Docs)
---

In this challenge, we'll get you to build a fairly common item you'll see on a lot of websites — a JavaScript-powered image gallery. Along the way, you'll be tested on your knowledge of loops, functions, conditionals, events, DOM scripting, and object basics.

## Starting point

To begin, click the **Play** button in one of the code panels below to open the provided example in the MDN Playground. You'll then follow the instructions in the [Project brief](#project_brief) section to complete the JavaScript functionality.

The HTML looks like so:

The starting JavaScript looks like this:

We've hidden the gallery CSS for brevity, but you can see it when you look at the app in the MDN Playground.

## Project brief

You have been provided with some HTML, CSS, and a few lines of JavaScript code. Your job is to follow the instructions below, writing the necessary JavaScript to turn this into a working image gallery.

The gallery will consist of a large image and a row of thumbnails. When a thumbnail is clicked or tabbed to and Enter/Return then pressed, that thumb should then display as the large image. The relevant `` element should also be updated with the correct `alt` text.

In the top-left corner there is a button that, when repeatedly pressed, toggles the large image between a darker and lighter tint, achieved by changing the transparency of a `` element that has been overlaid on top of the large image.

The images you need to embed in the example and their required `alt` text are as follows:

- [`pic1.jpg`](https://mdn.github.io/shared-assets/images/examples/learn/gallery/pic1.jpg): "Closeup of a human eye".
- [`pic2.jpg`](https://mdn.github.io/shared-assets/images/examples/learn/gallery/pic2.jpg): "Rock that looks like a wave".
- [`pic3.jpg`](https://mdn.github.io/shared-assets/images/examples/learn/gallery/pic3.jpg): "Purple and white pansies".
- [`pic4.jpg`](https://mdn.github.io/shared-assets/images/examples/learn/gallery/pic4.jpg): "Section of wall from a pharaoh's tomb".
- [`pic5.jpg`](https://mdn.github.io/shared-assets/images/examples/learn/gallery/pic5.jpg): "Large moth on a leaf".

### Create a data object

First of all, we'd like you to declare an array of objects called `images`. Each object should contain two properties:

- `filename`: The name of the image file (not the full URL).
- `alt`: The image's `alt` text.

### Add the images to the thumbnail bar

Next, we want you to loop through the `images` and use some DOM scripting to embed them all on the page via `` elements. They should be included as children of the `` element with the class of `thumb-bar`, which we've already referenced in the `thumbBar` constant.

1. Create a constant called `baseURL` containing the base URL of each image file (all of the URL not including the filename).
2. Create a `for ... of` loop to loop through the `images`.
3. For each image, create a new `` element.
4. Set the `` source to equal the URL of the image, which should be a combination of the `baseURL` and the `filename`, and the `alt` attribute equal to the `alt` text.
5. Add another attribute to the `` to make it focusable via the keyword.
6. Append the `` to the `thumbBar`.
7. Add a `click` event handler to the `` so that when it is clicked, a function called `updateDisplayedImage()` is run, which displays the clicked image at full size. You'll create this function later on.
8. Add another event handler to the `` so that once it is focused via the keyboard, the clicked image can be displayed at full size by pressing the Enter/Return key (and no other key). This is a stretch goal that will take a bit of research to figure out.

### Create the `updateDisplayedImage()` function

Now it's time to create the function to display an activated thumbnail at full size. We've stored a reference to the full size `` element in the `displayedImage` constant.

1. Define the `updateDisplayedImage()` function.
2. Inside the function body, set the `displayedImage` source to equal the source of the `` that was activated.
3. Set the `displayedImage` alt text to equal the alt text of the `` that was activated.

### Wire up the Darken/Lighten button

We've stored a reference to the "Darken/Lighten" `` in the `btn` constant, and a reference to the transparent `` we have overlaid on top of the full size `` in the `overlay` constant. We'd like you to:

1. Add a `click` event handler to the `` with an anonymous function set as the handler function.
2. Inside the function body, add a conditional structure that tests whether the `` has a `class` set on it of `dark` or not.
3. If the `` has a `class` of `dark` when clicked, change its text content to `Lighten`, and change the `overlay` element's background color to `rgb(0 0 0 / 0.5)`. Remove the `` element's `dark` class.
4. If the `` _does not_ have a `class` of `dark` when clicked, change its text content to `Darken`, and change the `overlay` element's background color to `rgb(0 0 0 / 0)`. Add the `` element's `dark` class.
5. Can you think of a way to toggle the `dark` class using a single line of code, run after the conditional structure? This is another stretch goal, but give it a go.

## Hints and tips

- You don't need to change the HTML or CSS.

## Example

Your finished app should work like the following live example:

Click here to show the solution

The finished JavaScript should look something like this:
