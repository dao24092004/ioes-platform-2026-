---
title: Challenge: Fixing blog page styles
doc_id: fixing-blog-styles
source_url: https://developer.mozilla.org/en-US/docs/learn-web-development/core/styling-basics/fixing-blog-styles
license: CC BY-SA 2.5 (MDN Web Docs)
---

In this challenge we give you a basic blog page example that is partially styled. We need you to fix some problems with the existing CSS and add some styles to finish it off. Along the way we will test your knowledge of selectors, the box model, and conflicts/cascade.

## Starting point

To begin, click the **Play** button in one of the code panels below to open the provided example in the MDN Playground. You'll then follow the instructions in the [Project brief](#project_brief) section to style the page appropriately.

## Project brief

The basic blog example you've been given isn't finished, and the existing code has some problems. Follow the steps below to complete the project.

1. We want every element on this page to use the alternative box model. Add a rule to the stylesheet that does this.

2. There is a problem with the rules for the nav menu — the styles are mostly OK, but they are affecting the other unordered list and content links, making them look bad! Can you adjust the selectors for these rules so that they only target the nav menu?

3. Actually, there is another problem with the nav menu — the `` elements are not spanning the full width of their `` element parents like they are meant to. Can you adjust the way they are displaying so that they span the full width?

4. For both the nav menu links and the regular content links, we are setting a different style on hover so that mouse users can see which link they are hovering over. This presents an accessibility issue for keyboard users, who won't be able to see those styles. Can you alter the selectors in the relevant rules so that these styles are also applied when a keyboard user tabs to the links?

5. We want the introduction, summary, and footer to have `20px` of padding on all sides. Make this happen by adding a single declaration somewhere in the stylesheet.

6. Add a rule that selects the first line of every paragraph that appears right after a second-level heading, and turns it bold.

7. As a follow-on from the previous question, can you think of a way to bold the first line in every paragraph following a second-level heading, but only when the parent element is not the introduction, summary, or footer? You can do this in a few different ways, some more concise than others.

8. Further down, you'll see that we are using `.highlight a` to select the `` elements inside the introduction and summary, and coloring them `purple` inside the associated rule. But this is no good — the color contrast is terrible. Assuming you are not allowed to change or remove that rule, can you add another rule above it in the source order that colors the `` elements `yellow`? Being above it in the source order, it will have to have a higher specificity.

9. You'll see that we are trying to select the `` at the bottom of the stylesheet and give it a text shadow, some margin to move it away from the summary, and a different background color to make it stand out. However, it is not getting the desired margin and background color styles because the `.highlight` rule has a higher specificity, so its declarations win. Can you alter the selector to make sure those styles get applied?

## Hints and tips

- Use the [W3C CSS Validator](https://jigsaw.w3.org/css-validator/) to catch unintended mistakes in your CSS — mistakes you might have otherwise missed — so that you can fix them.
- You don't need to alter the HTML in any way.

## Example

The finished project should look like this:

Click here to show the solution

The finished CSS looks like so:
