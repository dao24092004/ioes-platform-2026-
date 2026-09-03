---
title: Emphasis and importance
doc_id: emphasis-and-importance
source_url: https://developer.mozilla.org/en-US/docs/learn-web-development/core/structuring-content/emphasis-and-importance
license: CC BY-SA 2.5 (MDN Web Docs)
---

The previous article looked at why semantics are important in HTML, and focused on headings and paragraphs. This article continues on the theme of semantics, looking at HTML elements that apply emphasis and importance to text (parallel to italics and bold text in print media).

      Prerequisites:

        Basic HTML familiarity, as covered in
        Basic HTML Syntax.

      Learning outcomes:

          The meaning of emphasis and importance, and the basic elements that apply them in HTML, such as &lt;em&gt; and &lt;strong&gt;.
          Identify presentational markup that should no longer be used at all (e.g., &lt;big&gt; and &lt;font&gt;); it is deprecated.
          Identify presentational markup that has been repurposed to have new semantic meaning (e.g., &lt;i&gt; and &lt;b&gt;).

## What are emphasis and importance?

In human language, we often emphasize certain words to alter the meaning of a sentence, and we often want to mark certain words as important or different in some way. HTML provides various semantic elements to allow us to mark up textual content with such effects, and in this section, we'll look at a few of the most common ones.

### Emphasis

When we want to add emphasis in spoken language, we _stress_ certain words, subtly altering the meaning of what we are saying. Similarly, in written language we tend to stress words by putting them in italics. For example, the following two sentences have different meanings.

> I am glad you weren't late.
>
> I am _glad_ you weren't _late_.

The first sentence sounds genuinely relieved that the person wasn't late. In contrast, the second one, with both the words "glad" and "late" in italics, sounds sarcastic or passive-aggressive, expressing annoyance that the person arrived a bit late.

In HTML we use the em (emphasis) element to mark up such instances. As well as making the document more interesting to read, these are recognized by screen readers, which can be configured to speak them in a different tone of voice. Browsers style this as italic by default, but you shouldn't use this tag purely to get italic styling. To do that, you'd use a span element and some CSS, or perhaps an i element (see below).

### Strong importance

To emphasize important words, we tend to stress them in spoken language and **bold** them in written language. For example:

> This liquid is **highly toxic**.
>
> I am counting on you. **Do not** be late!

In HTML we use the strong (strong importance) element to mark up such instances. As well as making the document more useful, again these are recognized by screen readers, which can be configured to speak them in a different tone of voice. Browsers style this as bold text by default, but you shouldn't use this tag purely to get bold styling. To do that, you'd use a span element and some CSS, or perhaps a b element (see below).

You can nest strong and emphasis inside one another if desired:

## Let's play with emphasis and importance

In this section, we want you to play with emphasis and importance:

1. Click **"Play"** in the code block below to edit the example in the MDN Playground.
2. In the main heading give the word "Emphasis" emphasis, and the word "importance" strong importance.
3. In the first paragraph, give the coffee machine name strong importance, and emphasize the adjectives used to describe the coffee.
4. In the second paragraph, give the temperature description ("cold") and the action you should take ("wrap up warm to avoid falling ill") strong importance. Give "falling ill" some extra markup so it is both emphasized and important.

If you make a mistake, you can clear your work using the _Reset_ button in the MDN Playground. If you get really stuck, you can view the solution below the code block.

Click here to show the solution

Your finished HTML should look like this:

## Italic, bold, underline…

The elements we've discussed so far have clear-cut associated semantics. The situation with b, i, and u is somewhat more complicated. They came about so people could write bold, italics, or underlined text in an era when CSS was still supported poorly or not at all. Elements like this, which only affect presentation and not semantics, are known as **presentational elements** and should no longer be used because, as we've seen before, semantics is so important to accessibility, SEO, etc.

HTML5 redefined ``, ``, and `` with new, somewhat confusing, semantic roles.

Here's the best rule you can remember: It's only appropriate to use ``, ``, or `` to convey a meaning traditionally conveyed with bold, italics, or underline when there isn't a more suitable element; and there usually is. Consider whether ``, ``, ``, or `` might be more appropriate.

Always keep an accessibility mindset. The concept of italics isn't very helpful to people using screen readers, or to people using a writing system other than the Latin alphabet.

- i is used to convey a meaning traditionally conveyed by italic: foreign words, taxonomic designation, technical terms, a thought…
- b is used to convey a meaning traditionally conveyed by bold: keywords, product names, lead sentence…
- u is used to convey a meaning traditionally conveyed by underline: proper name, misspelling…

> [!NOTE]
> People strongly associate underlining with hyperlinks. Therefore, on the web, it's best to only underline links. Use the `` element when it's semantically appropriate, but consider using CSS to change the default underline to something more appropriate on the web. The example below illustrates how it can be done.

<!-- cSpell:ignore spel -->

## Summary

We are done looking at emphasis and importance for the moment. Let's move on to looking at how we represent lists in HTML.
