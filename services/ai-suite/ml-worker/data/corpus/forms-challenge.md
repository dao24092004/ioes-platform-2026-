---
title: Challenge: Structuring a feedback form
doc_id: forms-challenge
source_url: https://developer.mozilla.org/en-US/docs/learn-web-development/core/structuring-content/forms-challenge
license: CC BY-SA 2.5 (MDN Web Docs)
---

In this challenge, we are going to test your ability to create and structure a form, as well as add some other HTML features to it.

## Starting point

To solve this challenge, we are expecting you to create a basic website project, either inside a folder on your computer's hard drive, or using an online editor such as [CodePen](https://codepen.io/) or [JSFiddle](https://jsfiddle.net/). Much of the code you need is already provided on this page.

1. Create a new folder in an appropriate location on your computer called `forms-challenge` (or open an online editor and take the required steps to create a new project).
2. Save the following HTML listing inside a file inside your folder called `index.html` (or paste it into your online editor's HTML pane).

3. Save the following CSS listing inside a file inside your folder called `style.css` (or paste it into your online editor's CSS pane).

## Project brief

We'd like you to imagine that you have just been to stay at a hotel called the little house in the woods (well, at least you thought it was a hotel). We want you to help us create a fictional feedback form for the hotel. As well as marking up the required features and structuring the form, there are a few additional HTML features we want you to implement.

### Implementing form controls

1. In the "Facilities" section, we want you to turn the first two sets of lines into sets of radio buttons plus a label to describe each one and a legend describing the whole group. Add an attribute to make the first radio button in each case selected by default.
2. In the "Facilities" section, turn the third set of lines into a set of checkboxes, with a label to describe each one and a legend describing the whole group.
3. In the "About your hosts" section, turn both sets of lines into a drop-down menu of options, with a label to describe each one.
4. In the "Any other feedback?" section, add a multi-line text entry box and turn the existing line into its descriptive label.
5. In the "Your details" section, add a suitable type of text input to collect each of the three listed values. Turn the existing lines into their labels.
6. Turn "Submit" into a submit button for the form.

### Structuring the form

1. Wrap the form in a suitable wrapper element to specify the whole thing as a form.
2. Add repeating structural elements inside the form, to wrap each form section. Give each form section element a `class` of `form-section`. To make things easier, each form section is surrounded by two sets of double-hyphens (`--`). You can remove the double-hyphens when you've added your structural elements.
3. You'll need to include additional structural elements around some of the control/label pairs to make them sit on their own separate lines. Add these now, giving each one a `class` of `separator`.
4. Add a line break element between the multi-line text entry box and its label to make the two sit on separate lines.

### Additional HTML features

1. There are several headings in the text that need marking up with suitable elements:
   1. The top level-heading: "We want your feedback!".
   2. Second level headings: "Facilities", "About your hosts", "Any other feedback?", and "Your details".
2. The opening paragraph below the top-level heading needs to be marked up appropriately.
3. Also in the opening paragraph, turn the text "little house in the woods" and "prize draw" into links. We don't have pages to link to yet, so for now, just set the target URL as `#` for a placeholder.
4. We want you to place a wide, flat image below the opening paragraph as a decoration. The image path is `https://mdn.github.io/shared-assets/images/examples/learn/woodland-strip.jpg`, and we'd like you to set the alternative text for it to an empty value, given that it is decorative only.
5. Following on from the previous point, as a stretch goal, research a better way to include the decorative image on the page, and have a go at doing so (this involves a different technology to HTML, which we haven't touched on in this module).

## Hints and tips

- Use the [W3C HTML validator](https://validator.w3.org/) to catch unintended mistakes in your HTML — so that you can fix them.
- If you are getting stuck and can't envisage what elements to put where, draw out a simple block diagram of the page layout, and write on the elements you think should wrap each block. This is extremely helpful.

## Example

The following live example shows what the form might look like after being marked up. If you are getting stuck on how to achieve some of this, see the solution below.

Click here to show the solution

Your finished HTML should look like this:

For the stretch goal, arguably a better way to add decorative images to a web page is using [CSS background images](/en-US/docs/Learn_web_development/Core/Styling_basics/Backgrounds_and_borders#background_images). Delete the `` element and use the CSS background property to place the image on the page instead. A good element to place the background image on would be the `` element, and you need to tell the browser not to repeat the image. You also need to provide some margin and padding to space out the background image so it doesn't overlap the text.
