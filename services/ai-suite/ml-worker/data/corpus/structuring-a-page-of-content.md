---
title: Challenge: Structuring a page of content
doc_id: structuring-a-page-of-content
source_url: https://developer.mozilla.org/en-US/docs/learn-web-development/core/structuring-content/structuring-a-page-of-content
license: CC BY-SA 2.5 (MDN Web Docs)
---

Structuring a page of content ready for laying it out using CSS is a very important skill to master, so in this challenge you'll be tested on your ability to think about how a page might end up looking, and choose appropriate structural semantics to build a layout on top of.

## Starting point

To solve this challenge we are expecting you to create a simple website project, either inside a folder on your computer's hard drive, or using an online editor such as [CodePen](https://codepen.io/) or [JSFiddle](https://jsfiddle.net/). Much of the code you need is already provided.

1. Create a new folder in an appropriate location on your computer called `structuring-html-challenge` (or open an online editor and take the required steps to create a new project).
2. Save the following HTML listing inside a file inside your folder called `index.html` (or paste it into your online editor's HTML pane).

3. Save the following CSS listing inside a file inside your folder called `style.css` (or paste it into your online editor's CSS pane).

Later on, you will need to include the following URLs in your page.

- `dove.png`: [The site logo](https://mdn.github.io/shared-assets/images/examples/learn/birds/dove.png)
- `favorite-bird-1.jpg`: [Full-size version of the first sidebar image](https://mdn.github.io/shared-assets/images/examples/learn/birds/favorite-bird-1.jpg)
- `favorite-bird-1_th.jpg`: [Thumbnail of the first sidebar image](https://mdn.github.io/shared-assets/images/examples/learn/birds/favorite-bird-1_th.jpg)
- `favorite-bird-2.jpg`: [Full-size version of the second sidebar image](https://mdn.github.io/shared-assets/images/examples/learn/birds/favorite-bird-2.jpg)
- `favorite-bird-2_th.jpg`: [Thumbnail of the second sidebar image](https://mdn.github.io/shared-assets/images/examples/learn/birds/favorite-bird-2_th.jpg)
- `favorite-bird-3.jpg`: [Full-size version of the third sidebar image](https://mdn.github.io/shared-assets/images/examples/learn/birds/favorite-bird-3.jpg)
- `favorite-bird-3_th.jpg`: [Thumbnail of the third sidebar image](https://mdn.github.io/shared-assets/images/examples/learn/birds/favorite-bird-3_th.jpg)
- `favorite-bird-4.jpg`: [Full-size version of the fourth sidebar image](https://mdn.github.io/shared-assets/images/examples/learn/birds/favorite-bird-4.jpg)
- `favorite-bird-4_th.jpg`: [Thumbnail of the fourth sidebar image](https://mdn.github.io/shared-assets/images/examples/learn/birds/favorite-bird-4_th.jpg)

## Project brief

For this project, your task is to take the content for the homepage of a bird watching website and add structural elements to it so it can have a page layout applied to it. You also need to make a few additions to the content.

### Content additions

1. Inside the `` element, add an `` element that includes the dove logo on the page. Give it blank alternative text ("").
2. The "Home", "Get started", "Photos", "Gear", and "Forum" text items should be turned into a navigation menu.
   1. Mark them up as an unordered list.
   2. Inside each list item, wrap the text inside an `` element that points to a URL of `#` (which creates a dummy link).
3. Remove the `<!-- Link images here. -->` comment. Replace it with a set of four thumbnail images of the "favorite birds". Each one should include some appropriate alternative text to describe the image, and be wrapped in an `` element that links to the full-sized equivalent.

### Structural requirements

The site structure needs to consist of the following:

1. A header that wraps the top-level page heading and the navigation menu list.
2. An additional wrapper around the navigation menu list.
3. A main content area containing two columns — a main article to contain the welcome text, and a sidebar (aside) to contain the image thumbnails.
4. A footer containing the copyright information and credits.

In other words, you need to add a suitable wrapper for:

- The header
- The navigation menu
- The main content
- The welcome article
- The image aside
- The footer

### Styling the page

If required, apply the provided CSS to the page by adding another link element just below the existing one provided in the starting HTML (some online code editors will apply the CSS automatically).

## Hints and tips

- Use the [W3C HTML validator](https://validator.w3.org/) to catch unintended mistakes in your HTML — so that you can fix them.
- You don't need to know any CSS to do this challenge; you just need to apply the provided CSS to your HTML.
- If you are getting stuck and can't envisage what elements to put where, draw out a simple block diagram of the page layout, and write on the elements you think should wrap each block. This is extremely helpful.

## Example

The following screenshot shows an example of what the homepage might look like after being marked up. If you are getting stuck on how to achieve some of this, see the solution below the live example.

![The finished example for the challenge; a simple webpage about birdwatching, including a heading of "Birdwatching", bird photos, and a welcome message](example-page.png)

Click here to show the solution

Your finished HTML should look like this:
