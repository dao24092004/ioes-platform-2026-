---
title: Images, media, and form elements
doc_id: images-media-forms
source_url: https://developer.mozilla.org/en-US/docs/learn-web-development/core/styling-basics/images-media-forms
license: CC BY-SA 2.5 (MDN Web Docs)
---

In this lesson we will take a look at how certain special elements are treated in CSS. Images, other media, and form elements behave a little differently from regular boxes in terms of your ability to style them with CSS. Understanding what is and isn't possible can save some frustration, and this lesson will highlight some of the main things that you need to know.

      Prerequisites:

        HTML images, video, and forms. CSS Values and units and Sizing.

      Learning outcomes:

          Understand how replaced elements are sized and laid out.
          Basic styling of easy-to-style form elements, like text inputs.
          Using a CSS reset as base on which to style tricky elements like forms.
          Understand that not all form elements are easy to style, and why.

## Replaced elements

Images and video are described as **replaced elements**. This means that CSS cannot affect the internal layout of these elements — only their position on the page amongst other elements. As we will see however, there are various things that CSS can do with an image.

Certain replaced elements, such as images and video, are also described as having an **aspect ratio**. This means that it has a size in both the horizontal (x) and vertical (y) dimensions, and will be displayed using the intrinsic dimensions of the file by default.

## Sizing images

As you already know from following these lessons, everything in CSS generates a box. If you place an image inside a box that is smaller or larger than the intrinsic dimensions of the image file in either direction, it will either appear smaller than the box, or overflow the box. You need to make a decision about what happens with the overflow.

In the example below we have two boxes, both 200 pixels in size:

- One contains an image that is smaller than 200 pixels — it is smaller than the box and doesn't stretch to fill it.
- The other is larger than 200 pixels and overflows the box.

What can we do about the overflow issue?

As we learned in [Sizing items in CSS](/en-US/docs/Learn_web_development/Core/Styling_basics/Sizing), a common technique is to set the max-width of the image to `100%`. This will enable the image to become smaller in size than the box but not larger. This technique will also work with other replaced elements such as [``](/en-US/docs/Web/HTML/Reference/Elements/video)s, or [``](/en-US/docs/Web/HTML/Reference/Elements/iframe)s.

Try adding `max-width: 100%` to the `` element rule in the example above. You will see that the smaller image remains unchanged, but the larger one becomes smaller to fit into the box.

### Handling image display issues with `object-fit`

The above example uncovers another set of issues with displaying images inside containers. You'll notice that, after you set `max-width: 100%` on the images, the second image doesn't quite fill its container; there's a gap left at the bottom. This is because giving an image a specific width causes its height to be set so that its aspect ratio is preserved.

How can we size the image so it completely covers its container? We could set the container to have a fixed `width` _and_ `height`, and then give the image a `width` and `height` of `100%`, as shown in the next example:

However, the image is distorted as its aspect ratio has been changed — it looks _stretched_. To fix this, you can use the object-fit property, which sets how the image is resized to fit its container (the `` element). The `object-fit` property can take a few different values, the most useful of which are as follows:

- `cover`: The image completely fills the `` element while maintaining its aspect ratio, therefore some parts of the image are not displayed.
- `contain`: The image completely fits inside the `` element while maintaining its aspect ratio, therefore some parts of the `` element are not filled. This results in "letterboxing" or "pillarboxing".

The next example shows the `cover` and `contain` values set on two copies of the image shown in the previous example, so you can see what their effects are:

> [!NOTE]
> Key takeaway points here are:
>
> 1. The `object-fit` property resizes the image itself to fit inside the `` element that is embedding it onto the page
> 2. The `` needs to be resized for `object-fit` to have any effect.
>
> If the `` element is not resized, the image will be shown at its original (or _intrinsic_) size and aspect ratio, therefore `object-fit` will have no effect.

## Replaced elements in layout

When using various CSS layout techniques on replaced elements, you may well find that they behave slightly differently from other elements. For example, in a grid layout, elements are stretched by default to fill their entire [grid areas](/en-US/docs/Glossary/Grid_Areas). Images do not stretch; instead, they are aligned to the start of their grid areas.

You can see this happening in the example below where we have a two column, two row grid container, which has four items in it. All of the `` elements have a background color and stretch to fill the row and column. The image, however, does not stretch.

You won't study layout until a later module. For now, just keep in mind that replaced elements, when they become part of a specific layout system such as grid or flexbox, have different default behaviors, essentially to avoid them being stretched strangely by the layout.

## Form elements

Form elements have issues when it comes to styling with CSS. The [Web Forms extensions module](/en-US/docs/Learn_web_development/Extensions/Forms) covers the trickier aspects of styling certain form input types, which we will not go into here. There are, however, a few key basics worth highlighting in this section.

Many form controls are added to your page by way of the [``](/en-US/docs/Web/HTML/Reference/Elements/input) element — this defines simple form fields such as text inputs, through to more complex fields such as color and date pickers. There are some additional elements, such as [``](/en-US/docs/Web/HTML/Reference/Elements/textarea) for multiline text input, and also elements used to contain and label parts of forms such as [``](/en-US/docs/Web/HTML/Reference/Elements/fieldset) and [``](/en-US/docs/Web/HTML/Reference/Elements/legend).

HTML also contains attributes that enable web developers to indicate which fields are required, and even the type of content that needs to be entered. If the user enters something unexpected, or leaves a required field blank, the browser can show an error message. Different browsers vary with one another in how much styling and customization they allow for such items.

## Styling text input elements

Elements that allow for text input such as ``, the more specific ``, and the `` element, are quite easy to style and tend to behave just like other boxes on your page. The default styling of these elements will differ, however, based on the operating system and browser that your user visits the site with.

In the example below, we have styled some text inputs using CSS. You can see that things such as borders, margins and padding all apply as you would expect. We are using attribute selectors to target the different input types.

Try editing the example to change how the form looks by adjusting the borders, adding background colors to the fields, and changing fonts and padding.

> [!WARNING]
> You should take care when changing the styling of form elements to make sure it is still obvious to the user they are form elements. You could create a form input with no borders and background that is almost indistinguishable from the content around it, but this would make it very hard to recognize and interact with.

Many of the more complex input types are rendered by the operating system and are inaccessible to styling. You should, therefore, always assume that forms are going to look quite different for different visitors and test complex forms in a number of browsers.

## Normalizing form behavior

Form elements behave differently across different browsers and operating systems. This section looks at a few of the most common issues and provides strategies for dealing with them.

### Inheritance and form elements

In some browsers, form elements do not inherit font styling by default. Therefore, if you want to be sure that your form fields use the font defined on the body, or on a parent element, you should add this rule to your CSS.

### Form elements and box-sizing

Across browsers, form elements use different box sizing rules for different widgets. You learned about the `box-sizing` property in [our box model lesson](/en-US/docs/Learn_web_development/Core/Styling_basics/Box_model) and you can use this knowledge when styling forms to ensure a consistent experience when setting widths and heights on form elements.

For consistency, it is a good idea to set margins and padding to `0` on all elements, then add these back in when styling particular controls:

### Other useful settings

In addition to the rules mentioned above, you should also set `overflow: auto` on `` elements to stop some older browsers from showing a scrollbar when there is no need for one:

### Putting it all together into a "reset"

As a final step, we can wrap up the various properties discussed above into the following "form reset" to provide a consistent base to work from. This includes all the items mentioned in the last three sections:

> [!NOTE]
> Normalizing stylesheets are used by many developers to create a set of baseline styles to use on all projects. Typically these do similar things to those described above, making sure that anything different across browsers is set to a consistent default before you do your own work on the CSS. They are not as important as they once were, as browsers are typically more consistent than in the past. However, if you want to take a look at an example, check out [Normalize.css](https://necolas.github.io/normalize.css/), which is a very popular stylesheet used as a base by many projects.

## Summary

This lesson has highlighted some of the differences you will encounter when working with images, media, and other unusual elements in CSS.

In the next article, we'll give you some tests that you can use to check how well you've understood and retained the information we've provided on handling images and form elements in CSS.

## See also

- [Styling web forms](/en-US/docs/Learn_web_development/Extensions/Forms/Styling_web_forms)
- [Advanced form styling](/en-US/docs/Learn_web_development/Extensions/Forms/Advanced_form_styling)
