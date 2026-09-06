---
title: Advanced text features
doc_id: advanced-text-features
source_url: https://developer.mozilla.org/en-US/docs/learn-web-development/core/structuring-content/advanced-text-features
license: CC BY-SA 2.5 (MDN Web Docs)
---

There are many other elements in HTML for defining text semantics, which we didn't get to in the [Emphasis and importance](/en-US/docs/Learn_web_development/Core/Structuring_content/Emphasis_and_importance) article. The elements described in this article are less known, but still useful to know about (and this is still not a complete list by any means). Here you'll learn about marking up quotations, computer code and other related text, subscript and superscript, contact information, and more.

      Prerequisites:

        Basic HTML familiarity, as covered in
        Basic HTML Syntax. Text-level semantics such as headings and paragraphs and lists.

      Learning outcomes:

          Quotations.
          Abbreviations and acronyms.
          Addresses.
          Times and dates.
          Superscript and subscript.

## Quotations

HTML contains features available for marking up quotations; which element you use depends on whether you are marking up a block or inline quotation.

### Blockquotes

If a section of block level content (be it a paragraph, multiple paragraphs, a list, etc.) is quoted from somewhere else, you should wrap it inside a blockquote element to signify this, and include a URL pointing to the source of the quote inside a [`cite`](/en-US/docs/Web/HTML/Reference/Elements/blockquote#cite) attribute. For example, the following markup is taken from the MDN `` element page:

To turn this into a block quote, we would just do this:

Browser default styling will render this as an indented paragraph, as an indicator that it is a quote; the paragraph above the quotation is there to demonstrate that.

### Inline quotations

Inline quotations work in exactly the same way, except that they use the q element. For example, the below bit of markup contains a quotation from the MDN `` page:

Browser default styling will render this as normal text put in quotes to indicate a quotation, like so:

### Citations

The content of the [`cite`](/en-US/docs/Web/HTML/Reference/Elements/blockquote#cite) attribute sounds useful, but unfortunately browsers, screen readers, etc. don't really do much with it. There is no way to get the browser to display the contents of `cite`, without writing your own solution using JavaScript or CSS. If you want to make the source of the quotation available on the page you need to make it available in the text via a link or some other appropriate way.

There is a cite element, but this is meant to contain the title of the resource being quoted, e.g., the name of the book. There is no reason, however, why you couldn't link the text inside `` to the quote source in some way:

Citations are styled in italic font by default.

### Who said that? Blockquote practice

Time for another task! In this example we'd like you to:

1. Click **"Play"** in the code block below to edit the example in the MDN Playground.
2. Turn the middle paragraph into a blockquote, which includes a `cite` attribute.
3. Turn "The Need To Eliminate Negative Self Talk" in the third paragraph into an inline quote, and include a `cite` attribute.
4. Wrap the title of each source in `` tags and turn each one into a link to that source.

The citation sources you need are:

- `http://www.brainyquote.com/quotes/authors/c/confucius.html` for the Confucius quote
- `http://example.com/affirmationsforpositivethinking` for "The Need To Eliminate Negative Self Talk".

If you make a mistake, you can clear your work using the _Reset_ button in the MDN Playground. If you get really stuck, you can view the solution below the code block.

Click here to show the solution

Your finished HTML should look like this:

## Abbreviations

Another fairly common element you'll meet when looking around the Web is abbr — this is used to wrap around an abbreviation or acronym. When including either, provide a full expansion of the term in plain text on first use, along with the `` to mark up the abbreviation. This provides a hint to user agents on how to announce/display the content while informing all users what the abbreviation means.

If providing the expansion in addition to the abbreviation makes little sense, and the abbreviation or acronym is a fairly shortened term, provide the full expansion of the term as the value of the [`title`](/en-US/docs/Web/HTML/Reference/Global_attributes/title) attribute:

### Abbreviation example

Let's look at an example.

These are rendered as follows:

> [!NOTE]
> Earlier versions of html also included support for the acronym element, but it was removed from the HTML spec in favor of using `` to represent both abbreviations and acronyms. `` should not be used.

### Let's mark up an abbreviation

For this learning task, we'd like you to mark up an abbreviation.

1. Click **"Play"** in the code block below to edit the example in the MDN Playground.
2. Mark up the included abbreviations using appropriate HTML. Feel free also to replace it with one of your own, and try marking that up instead.

If you make a mistake, you can clear your work using the _Reset_ button in the MDN Playground. If you get really stuck, you can view the solution below the code block.

Click here to show the solution

Your finished HTML should look something like the following code snippet:

- Arguably, NASA should be expanded in text on first mention, as it is a useful bit of information for everyone to have available in the text.
- Acronyms like "LGTM", on the other hand, are purely written to save space and time so it wouldn't make sense to also write it out, hence putting the expansion in the `title` attribute. In a real application, you probably wouldn't do this by hand — you'd get some kind of script to add it automatically for known terms.

## Marking up contact details

HTML has an element for marking up contact details — address. This wraps around your contact details, for example:

It could also include more complex markup, and other forms of contact information, for example:

Note that something like this would also be OK, if the linked page contained the contact information:

> [!NOTE]
> The address element should only be used to provide contact information for the document contained by the nearest article or body element. It would be correct to use it in the footer of a site to include the contact information of the entire site, or inside an article for the contact details of the author, but not to mark up a list of addresses unrelated to the content of that page.

## Superscript and subscript

You will occasionally need to use superscript and subscript when marking up items like dates, chemical formulae, and mathematical equations so they have the correct meaning. The sup and sub elements handle this job. For example:

The output of this code looks like so:

## Representing computer code

There are a number of elements available for marking up computer code using HTML:

- code: For marking up generic pieces of computer code.
- pre: For retaining whitespace (generally code blocks) — if you use indentation or excess whitespace inside your text, browsers will ignore it and you will not see it on your rendered page. If you wrap the text in `` tags however, your whitespace will be rendered identically to how you see it in your text editor.
- var: For specifically marking up variable names.
- kbd: For marking up keyboard (and other types of) input entered into the computer.
- samp: For marking up the output of a computer program.

Let's look at examples of these elements and how they're used to represent computer code.
If you want to see the full file, take a look at the [other-semantics.html](https://github.com/mdn/learning-area/blob/main/html/introduction-to-html/advanced-text-formatting/other-semantics.html) sample file.
You can download the file and open it in your browser to see for yourself, but here is a snippet of the code:

The above code will look like so:

## Marking up times and dates

HTML also provides the time element for marking up times and dates in a machine-readable format. For example:

Why is this useful? Well, there are many different ways that humans write down dates. The above date could be written as:

<!-- markdownlint-disable MD033 -->

- 20 January 2016
- 20th January 2016
- Jan 20 2016
- 20/01/16
- 01/20/16
- The 20th of next month
- 20e Janvier 2016
- 2016 年 1 月 20 日
- And so on.

<!-- markdownlint-enable MD033 -->

But these different forms cannot be easily recognized by computers — what if you wanted to automatically grab the dates of all events in a page and insert them into a calendar? The time element allows you to attach an unambiguous, machine-readable time/date for this purpose.

The basic example above just provides a simple machine readable date, but there are many other options that are possible, for example:

## Summary

That marks the end of our study of less-common HTML text semantics. What you have seen during this course is not an exhaustive list of HTML text elements — we wanted to try to cover the essentials, and some of the more common ones you will see in the wild.

Next up, we'll give you some tests that you can use to check how well you've understood and retained the information we've provided on less-common HTML text features.
