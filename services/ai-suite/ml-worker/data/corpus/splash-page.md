---
title: Challenge: Creepy-crawly splash page
doc_id: splash-page
source_url: https://developer.mozilla.org/en-US/docs/learn-web-development/core/structuring-content/splash-page
license: CC BY-SA 2.5 (MDN Web Docs)
---

In this challenge, we'll test your knowledge of some of the techniques discussed in the last couple of lessons, getting you to add some images and a video to a splash page all about bugs and other creepy crawlies.

## Starting point

To solve this challenge we are expecting you to create a simple website project, either inside a folder on your computer's hard drive, or using an online editor such as [CodePen](https://codepen.io/) or [JSFiddle](https://jsfiddle.net/). Much of the code you need is already provided.

1. Create a new folder in an appropriate location on your computer called `splash-page-challenge` (or open an online editor and take the required steps to create a new project).
2. Save the following HTML listing inside a file inside your folder called `index.html` (or paste it into your online editor's HTML pane).

3. Save the following CSS listing inside a file inside your folder called `style.css` (or paste it into your online editor's CSS pane).

Later on, you will need to include the following URLs in your page.

- `bee.jpg`: [Image for the "Bees, Wasps, Ants (Hymenoptera)" section](https://mdn.github.io/shared-assets/images/examples/learn/crawlies/bee.jpg).
- `beetle.png`: [Image for the "Beetles (Coleoptera)" section](https://mdn.github.io/shared-assets/images/examples/learn/crawlies/beetle.png).
- `butterfly.jpg`: [Image for the "Butterflies & Moths (Lepidoptera)" section](https://mdn.github.io/shared-assets/images/examples/learn/crawlies/butterfly.jpg).
- `fly.jpg`: [Image for the "Flies & Mosquitoes (Diptera)" section](https://mdn.github.io/shared-assets/images/examples/learn/crawlies/fly.jpg).
- `spider.jpg`: [Image for the "Spiders (Araneae)" section](https://mdn.github.io/shared-assets/images/examples/learn/crawlies/spider.jpg).
- `true_bug.jpg`: [Image for the "True Bugs (Hemiptera)" section](https://mdn.github.io/shared-assets/images/examples/learn/crawlies/true_bug.jpg).
- `bug_video_640.mp4`: [header video](https://mdn.github.io/shared-assets/videos/learn/bug_video_640.mp4).

## Project brief

In this assessment we are presenting you with a mostly-finished splash page about different creepy-crawlies. Unfortunately, no images or video have been added yet — this is your job! You need to add some media to make the page look more interesting. The following subsections detail what you need to do.

### Adding a video to the header

Just below the ``, add a `` element that embeds our header video into the page. We'd like it to do the following:

- Autoplay the video on load (for this to work in at least some browsers, you'll also need to specify that the video should be muted).
- Loop endlessly rather than playing once.
- Preload the video content.
- Not show any controls.

### Adding section images

In the expanded information sections on each type of bug, below each ``, we'd like you to add an image element that embeds the appropriate image for each section. Give each image some appropriate alternative text for the benefit of screen reader users (and in case the image doesn't load), and constrain each image to dimensions of 250 x 180.

In addition, we'd like you to include a caption for each image; think about what container element is needed to semantically associate the two together. Don't just make the caption repeat the alternative text; it should work alongside the alternative text and the image.

### Add bug emojis or icons to the nav menu and ``s

For a bit of fun, we'd like you to add icons to the start of each nav list item, and the same icon to the start of each corresponding ``. You could do this using embedded images, but it's easier to just find appropriate emojis and add them to the HTML text itself.

## Hints and tips

- You can use the [W3C HTML validator](https://validator.w3.org/) to catch mistakes in your HTML.
- You don't need to know any CSS to do this assessment; you just need to edit the provided HTML file. The CSS part is already done for you.

## Example

The following screenshot shows what the splash page should look like. If you are getting stuck on how to achieve some of this, see the solution below the live example.

![Our example splash page](finished-splash-example.png)

Click here to show the solution

Your finished HTML should look something like this:
