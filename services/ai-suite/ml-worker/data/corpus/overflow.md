---
title: Overflowing content
doc_id: overflow
source_url: https://developer.mozilla.org/en-US/docs/learn-web-development/core/styling-basics/overflow
license: CC BY-SA 2.5 (MDN Web Docs)
---

Overflow is what happens when there is too much content to fit inside an element box. In this lesson, you will learn how to manage overflow using CSS.

      Prerequisites:

        HTML basics (study
        Basic HTML syntax), CSS Values and units and Sizing.

      Learning outcomes:

          Understand what overflow is.
          Control overflow with the overflow property. 

## What is overflow?

Everything in CSS is a box. You can constrain the size of these boxes by assigning values such as width and height. **Overflow happens when there is too much content to fit in a box.** CSS provides various tools to manage overflow. As you go further with CSS layout and writing CSS, you will encounter more overflow situations.

## CSS tries to avoid "data loss"

Let's consider two examples that demonstrate the default behavior of CSS when overflow occurs.

The first example features a box that has been restricted by setting a `height`. The box's content exceeds the available space, therefore it overflows the box and falls into the paragraph below.

The second example features a word in a box. The box has been made too small for the word and so it breaks out of the box.

You might wonder why CSS works in such a messy way, displaying content outside of its intended container. Why not hide overflowing content? Why not scale the size of the container to fit all the content?

Wherever possible, CSS does not hide content. This would cause data loss. The problem with data loss is that you, or visitors to your website, may not notice. If the submit button on a form disappears and no one can complete the form, this could be a big problem! Instead, CSS overflows in visible ways. You are more likely to see there is a problem. At worst, a site visitor will let you know that content is overlapping.

If you restrict a box with a `width` or a `height`, CSS trusts you to know what you are doing. CSS assumes that you are managing the potential for overflow. In general, restricting the block dimension is problematic when the box contains text. There may be more text than you expected when designing the site, or the text may be larger (for example, if the user has increased their font size).

## The overflow property

The overflow property allows you to specify how the browser should handle overflowing content. The default value of the &lt;overflow&gt; value type is `visible`. With this default setting, one can see content when it overflows.

### Hiding overflowing content

To hide content when it overflows, you can set `overflow: hidden`. This does exactly what it says: it hides overflow. Beware that this can make some content invisible. You should only do this if hiding content won't cause problems.

Try editing the above example to set the `overflow` value to `visible`, then back to `hidden`, to see what the effect is.

### Scrolling overflowing content

Instead, perhaps you would like to allow your users to scroll the content to read it all? When you set `overflow: scroll` on overflowing content, browsers with visible scrollbars will always display them—even if there is not enough content to overflow. This offers the advantage of keeping the layout consistent, instead of scrollbars appearing or disappearing, depending upon the amount of content in the container.

Let's see this in action. Edit the following example to remove some content from the `box` ``. Notice how the scrollbars remain, even if there is no need for scrolling:

> [!NOTE]
> Scrollbar visibility depends on the operating system.
> You may have to change your browser settings to always show scroll bars in order for the scroll bars to always show in the following examples.

In the example above, we only need to scroll on the `y` axis, however we get scrollbars on both axes. To just scroll on the `y` axis, you could use the overflow-y property, setting `overflow-y: scroll`. Try setting this property in the example above.

You can also enable scrolling along the x-axis by using overflow-x, although this is not a recommended way to accommodate long words! If you have a long word in a small box, consider using the word-break or overflow-wrap properties. In addition, some of the methods discussed in [Sizing items in CSS](/en-US/docs/Learn_web_development/Core/Styling_basics/Sizing) may help you create boxes that scale better with varying amounts of content.

As with `scroll`, you get a scrollbar in the scrolling dimension whether or not there is enough content to cause a scrollbar.

> [!NOTE]
> You can specify x- and y-axis scrolling using the `overflow` property, passing two values. If two keywords are specified, the first applies to `overflow-x` and the second applies to `overflow-y`. Otherwise, both `overflow-x` and `overflow-y` are set to the same value. For example, `overflow: scroll hidden` would set `overflow-x` to `scroll` and `overflow-y` to `hidden`.

### Only displaying scrollbars when needed

If you only want scrollbars to appear when there is more content than can fit in the box, use `overflow: auto`. This allows the browser to determine if it should display scrollbars.

In the example below, remove content until it fits into the box. You should see the scrollbars disappear:

## Unwanted overflow in web design

Modern layout methods (which you'll meet later in the [CSS layout](/en-US/docs/Learn_web_development/Core/CSS_layout) module) manage overflow. They largely work without assumptions or dependencies for how much content there will be on a web page.

This was not always the norm. In the past, some sites were built with fixed-height containers to align box bottoms. These boxes may otherwise have had no relationship to each other. This was fragile. If you encounter a box where content is overlaying other content, you will now recognize that overflow may well be the cause of this. Ideally, you will refactor the layout to not rely on fixed-height containers.

When developing a site, always keep overflow in mind. Test designs with large and small amounts of content. Increase and decrease font sizes by at least two increments. Ensure your CSS is robust. Changing overflow values to hide content or to add scrollbars is reserved for a few select use cases (for example, where you intend to have a scrolling box).

## Summary

This lesson introduced the concept of overflow. You should understand that default CSS avoids making overflowing content invisible. You have discovered that you can manage potential overflow, and also, that you should test work to make sure it does not accidentally cause problematic overflow.

In the next article, we'll give you some tests that you can use to check how well you've understood and retained the information we've provided on overflow.
