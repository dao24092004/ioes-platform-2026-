---
title: Lists
doc_id: lists
source_url: https://developer.mozilla.org/en-US/docs/learn-web-development/core/structuring-content/lists
license: CC BY-SA 2.5 (MDN Web Docs)
---

Now let's turn our attention to lists. Lists are everywhere in life—from your shopping list to the list of directions you subconsciously follow to get to your house every day, to the lists of instructions you are following in these tutorials! It may not surprise you that HTML has a convenient set of elements that allows us to define different types of list. On the web, we have three types of lists: unordered, ordered, and description lists. This lesson shows you how to use the different types.

      Prerequisites:

        Basic HTML familiarity, as covered in
        Basic HTML Syntax.

      Learning outcomes:

          The HTML structure for the three types of lists — unordered, ordered, and description.
          The correct usage for each list type.
          The broader use cases of lists, such as navigation menus.

## Unordered lists

Unordered lists are used to mark up lists of items for which the order of the items doesn't matter. Let's take a grocery shopping list as an example:

In this example, the items can be in any order. To create this list in HTML, we first wrap the whole list in a ul (unordered list) element.
Then, we wrap each item in a li (list item) element:

### Marking up an unordered list

To give you some practice, we want you to have a go at marking up the previous list yourself:

1. Click **"Play"** in the rendered code output below to edit the example in the MDN Playground.
2. Turn the individual text items into an unordered list.

If you make a mistake, you can clear your work using the _Reset_ button in the MDN Playground. If you get stuck, refer back to the previous code snippet.

## Ordered

Ordered lists are lists in which the order of the items _does_ matter. Let's take a set of directions as an example:

The markup structure is the same as for unordered lists, except that you have to wrap the list items in an ol element, rather than ``:

### Marking up an ordered list

Practice time again! In the same way as the previous task, we want you to have a go at marking up the previous ordered list yourself.

1. Click **"Play"** in the rendered code output below to edit the example in the MDN Playground.
2. Turn the individual text items into an ordered list.

If you make a mistake, you can clear your work using the _Reset_ button in the MDN Playground. If you get stuck, refer back to the previous code snippet.

## Marking up our recipe page

Now for a real challenge! At this point in the article, you have all the information you need to mark up a slightly more complex section of content. We want you to mark up the instructions for our favorite hummus recipe.

You can choose to either:

- Save a local copy of our [text-start.html](https://github.com/mdn/learning-area/blob/main/html/introduction-to-html/html-text-formatting/text-start.html) starting file and do the work in your code editor.
- Click **"Play"** in the rendered code output below to edit the example in the MDN Playground.

The instructions you need to follow are:

1. Mark up the main page title using an `` element, and the three subtitles using `` elements.
2. There are five lines of text that make sense to be marked up with `` elements. Do this now.
3. Mark up the list of ingredients as an unordered list.
4. Mark up the list of instructions as an ordered list.

If you make a mistake, you can clear your work using the _Reset_ button in the MDN Playground. If you get really stuck, you can view the solution below the code output.

Click here to show the solution

You can find an example of the correct HTML for this example at [text-complete.html](https://github.com/mdn/learning-area/blob/main/html/introduction-to-html/html-text-formatting/text-complete.html) in our GitHub repo.

## Nesting lists

It is perfectly OK to nest one list inside another one. You might want to have some sub-bullets sitting below a top-level bullet. Let's take the second list from our recipe example:

Since the last two bullets are very closely related to the one before them (they read like sub-instructions or choices that fit below that bullet), it might make sense to nest them inside their own unordered list and put that list inside the current fourth bullet. This would look like so:

Try going back to the previous task and updating the second list like this.

## Description lists

The purpose of description lists is to mark up a set of items and their associated descriptions, such as terms and definitions, or questions and answers. Let's look at an example of a set of terms and definitions:

Description lists use a different wrapper than the other list types — dl; in addition each term is wrapped in a dt (description term) element, and each description is wrapped in a dd (description definition) element.

### Description list example

Let's finish marking up our example:

The browser default styles will display description lists with the descriptions indented somewhat from the terms.

### Multiple descriptions for one term

Note that it is permitted to have a single term with multiple descriptions, for example:

### Marking up a set of definitions

It's time to try your hand at marking up a description list:

1. Click **"Play"** in the code block below to edit the example in the MDN Playground.
2. Use suitable elements to mark up the three terms and four descriptions in the content. Bear in mind that the third term has two descriptions.

If you make a mistake, you can clear your work using the _Reset_ button in the MDN Playground. If you get really stuck, you can view the solution below the code block.

Click here to show the solution

Your finished HTML should look like this:

## Summary

That's it for lists. Next we'll give you some tests that you can use to check how well you've understood and retained the information we've provided on HTML text basics.
