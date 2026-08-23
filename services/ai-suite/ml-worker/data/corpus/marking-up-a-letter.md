---
title: Challenge: Marking up a letter
doc_id: marking-up-a-letter
source_url: https://developer.mozilla.org/en-US/docs/learn-web-development/core/structuring-content/marking-up-a-letter
license: CC BY-SA 2.5 (MDN Web Docs)
---

We all learn to write a letter sooner or later; it is also a useful example to test our text formatting skills. In this challenge, we give you a letter to mark up as a test for your HTML text formatting skills and knowledge of the HTML `` contents.

## Starting point

To begin, click the **Play** button in the code sample panel below to open the provided body text in the MDN Playground. You'll follow the instructions in the sections that follow to mark up the text appropriately.

## Project brief

For this project, your task is to mark up a letter that needs to be hosted on a university intranet. The letter is a response from a research fellow to a prospective PhD student concerning their application to the university.

### Block/structural semantics

- Add an appropriate HTML structure including doctype, and html, head and body elements.
- In general, the letter should be marked up as an organization of headings and paragraphs, except for the addresses mentioned in the next bullet. There is one top level heading (the "Re:" line) and three second level headings.
- Put the two addresses inside address elements. Each line of the address should sit on a new line, but not be in a new paragraph.
- Use an appropriate list type to mark up the semester start dates, study subjects, and exotic dances.

### Inline semantics

- The names of the sender and receiver (and _Tel_ and _Email_) should be marked up with strong importance.
- The four dates in the document should be wrapped in appropriate elements containing machine-readable dates.
- The first address and first date in the letter should have a `class` attribute value of `sender-column` set on them. The CSS you'll add later will cause these to be right aligned, as it should be in the case in a classic letter layout.
- Mark up the following five acronyms/abbreviations in the main text of the letter — "PhD," "HTML," "CSS," "BCE," and "Esq." — to provide expansions of each one.
- The six sub/superscripts should be marked up appropriately — in the chemical formulae, and the numbers 103 and 104 (they should be 10 to the power of 3 and 4, respectively).
- Mark up at least two other appropriate words in the text with strong importance/emphasis.
- Mark up the university motto quote and citation with appropriate elements.

### The head of the document

- The character set of the document should be set as `utf-8` using the appropriate `` tag.
- The author of the letter should be specified in an appropriate `` tag.
- You should set the language of the document as `en-US`.
- Include the following text inside a document title element: "Awesome science application correspondence".
- The following CSS should be included inside an appropriate element inside the head:

## Hints and tips

- Use the [W3C HTML validator](https://validator.w3.org/) to validate your HTML. Award yourself bonus points if it validates.
- You don't need to know any CSS to do this assignment. You just need to put the provided CSS inside an HTML element.

## Example

The following live example shows what the letter should look like after being marked up. If you are getting stuck on how to achieve some of this, see the solution below the live example.

Click here to show the solution

Your finished HTML should look like this:
