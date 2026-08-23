---
title: Advanced styling effects
doc_id: advanced-styling-effects
source_url: https://developer.mozilla.org/en-US/docs/learn-web-development/core/styling-basics/advanced-styling-effects
license: CC BY-SA 2.5 (MDN Web Docs)
---

This article acts as a box of tricks, providing an introduction to some interesting advanced styling features such as box shadows, blend modes, and filters.

      Prerequisites:

        HTML basics (study
        Introduction to HTML) and an idea of how CSS works (study
        CSS Styling basics.)

      Objective:

        To get an idea about how to use some of the advanced styling effects
        available in modern browsers.

## Box shadows

box-shadow allows you to apply one or more drop shadows to an element's box. Like text shadows, box shadows are supported pretty well across browsers, including IE9+ and Edge. Users of older IE versions might just have to cope with no shadows, so just test your designs to make sure your content is legible without them.

### A simple box shadow

Let's look at a simple example to get things started. First, some HTML:

Now the CSS:

This gives us the following result:

You'll see that we've got four items in the `box-shadow` property value:

1. The first length value is the **horizontal offset** — the distance to the right the shadow is offset from the original box (or left, if the value is negative).
2. The second length value is the **vertical offset** — the distance downwards that the shadow is offset from the original box (or upwards, if the value is negative).
3. The third length value is the **blur radius** — the amount of blurring applied to the shadow.
4. The color value is the **base color** of the shadow.

You can use any length and color units that would make sense to do so to define these values.

### Multiple box shadows

You can also specify multiple box shadows in a single `box-shadow` declaration, by separating them with commas:

Now we get this result:

We've done something fun here by creating a raised box with multiple colored layers, but you could use it in any way you want, for example to create a more realistic look with shadows based on multiple light sources.

### Other box shadow features

Unlike text-shadow, box-shadow has an `inset` keyword available — putting this at the start of a shadow declaration causes it to become an inner shadow, rather than an outer shadow. Let's have a look and see what we mean.

First, we'll go with some different HTML for this example:

This gives us the following result:

Here we've set up some button styling along with focus/hover/active states. The button has a simple black box shadow set on it by default, plus a couple of inset shadows, one light and one dark, placed on opposite corners of the button to give it a nice shading effect.

When the button is pressed in, the active state causes the first box shadow to be swapped for a very dark inset shadow, giving the appearance of the button being pressed in.

> [!NOTE]
> There is another item that can be set in the `box-shadow` value — another length value can be optionally set just before the color value, which is a **spread radius**. If set, this causes the shadow to become bigger than the original box. It is not very commonly used, but worth mentioning.

## Filters

While you can't change the composure of an image using CSS, there are some creative things you can do. One very nice property, which can help you bring interest to your designs, is the filter property. This property enables Photoshop-like filters right from CSS.

In the example below we have used two different values for filter. The `first` is `blur()` — this function can be passed a value to indicate how much the image should be blurred.

The second is `grayscale()`; by using a percentage we are setting how much color we want to be removed.

Play with the percentage and pixel parameters in the example below to see how the images change. You could also swap the values for some others. Try `contrast(200%)`, `invert(100%)` or `hue-rotate(20deg)` on the live example above. Take a look at the MDN page for filter for many other options you could try.

You can apply filters to any element and not just images. Some of the filter options available do very similar things to other CSS features, for example `drop-shadow()` works in a very similar way and gives a similar effect to box-shadow or text-shadow. The really nice thing about filters however, is that they work on the exact shapes of the content inside the box, not just the box itself as one big chunk, so it is worth knowing the difference.

In this next example we are applying our filter to a box, and comparing it to a box shadow. As you can see, the drop-shadow filter follows the exact shape of the text and border dashes. The box shadow just follows the square of the box.

You can find a lot more examples than are available here in our [filters.html](https://mdn.github.io/learning-area/css/styling-boxes/advanced_box_effects/filters.html) example page (see [source code](https://github.com/mdn/learning-area/blob/main/css/styling-boxes/advanced_box_effects/filters.html)), and on the filter reference page.

## Blend modes

CSS blend modes allow us to add blend modes to elements that specify a blending effect when two elements overlap — the final color shown for each pixel will be the result of a combination of the original pixel color, and that of the pixel in the layer underneath it. Blend modes are again very familiar to users of graphics applications like Photoshop.

There are two properties that use blend modes in CSS:

- background-blend-mode, which blends together multiple background images and colors set on a single element.
- mix-blend-mode, which blends together the element it is set on with elements it is overlapping — both background and content.

You can find a lot more examples than are available here in our [blend-modes.html](https://mdn.github.io/learning-area/css/styling-boxes/advanced_box_effects/blend-modes.html) example page (see [source code](https://github.com/mdn/learning-area/blob/main/css/styling-boxes/advanced_box_effects/blend-modes.html)), and on the &lt;blend-mode&gt; reference page.

> [!NOTE]
> Blend modes are also very new, and slightly less well supported than filters. There is no support as yet in Edge, and Safari only supports some of the blend mode options.

### background-blend-mode

Again, let's look at some examples so we can understand this better. First, background-blend-mode — here we'll show a couple of simple divs, so you can compare the original with the blended version:

Now some CSS — we are adding to the `` one background image and a green background color:

The result we get is this — you can see the original on the left, and the multiply blend mode on the right:

### mix-blend-mode

Now let's look at mix-blend-mode. Here we'll present the same two ``s, but each one is now sat on top of a simple `` with a purple background, to show how the elements will blend together:

Here's the CSS we'll style this with:

This gives us the following results:

You can see here that the multiply mix blend has blended together not only the two background images, but also the color from the `` below it too.

> [!NOTE]
> Don't worry if you don't understand some of the layout properties above, like position, top, bottom, z-index, etc. We will cover these in detail in our [CSS Layout](/en-US/docs/Learn_web_development/Core/CSS_layout) module.

## CSS shapes

While it is true that everything in CSS is a rectangular box, and images are a physical rectangular box, we can make it look as if our content flows around non-rectangular things by using [CSS Shapes](/en-US/docs/Web/CSS/Guides/Shapes).

The CSS Shapes specification enables the wrapping of text around a non-rectangular shape. It's especially useful when working with an image which has some white-space you might want to float text around.

In the image below we have a pleasingly round balloon. The actual file is rectangular, but by floating the image (shapes only apply to floated elements) and using the shape-outside property with a value of `circle(50%)`, we can give the effect of the text following the line of the balloon.

The shape in this example is not reacting to the content of the image file. Instead, the circle function is taking its center point from the center of the image file, as if we had put a compass in the middle of the file and drawn a circle that fits inside the file. It is that circle that the text flows around.

> [!NOTE]
> In Firefox you can use the DevTools [Shapes Inspector](https://firefox-source-docs.mozilla.org/devtools-user/page_inspector/how_to/edit_css_shapes/index.html) to inspect Shapes.

The `circle()` function is just one of a few basic shapes that are defined, however there are a number of different ways to create shapes. For more information and example code for CSS Shapes see the [Guides to CSS Shapes](/en-US/docs/Web/CSS/Guides/Shapes/Overview) on MDN.

## -webkit-background-clip: text

Another feature we thought we'd mention briefly is the `text` value for background-clip. When used along with the proprietary `-webkit-text-fill-color: transparent;` feature, this allows you to clip background images to the shape of the element's text, making for some nice effects. This is not an official standard, but has been implemented across multiple browsers, as it is popular, and used fairly widely by developers. When used in this context, both of the properties would require a `-webkit-` vendor prefix, even for non-WebKit/Chrome-based browsers.
You can see this in action in the live sample below:

So why have other browsers implemented a `-webkit-` prefix? Mainly for browser compatibility — so many web developers have started implementing websites with `-webkit-` prefixes that it started to look like the other browsers were broken, whereas in actual fact they were following the standards. So they were forced to implement a few such features. This highlights the danger of using non-standard and/or prefixed CSS features in your work — not only do they cause browser compatibility issues, but they are also subject to change, so your code could break at any time. It is much better to stick to the standards.

If you do want to use such features in your production work, make sure to test across browsers thoroughly and check that, where these features don't work, the site is still usable.

## Summary

We hope this article was fun — playing with shiny toys generally is, and it is always interesting to see what kinds of advanced styling tools are becoming available in modern browsers.
