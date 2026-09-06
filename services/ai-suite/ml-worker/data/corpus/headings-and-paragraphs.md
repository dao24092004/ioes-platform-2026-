---
title: Headings and paragraphs
doc_id: headings-and-paragraphs
source_url: https://developer.mozilla.org/en-US/docs/learn-web-development/core/structuring-content/headings-and-paragraphs
license: CC BY-SA 2.5 (MDN Web Docs)
---

One of HTML's main jobs is to give text structure so that a browser can display an HTML document the way its developer intends. This article explains how HTML can be used to provide fundamental page structure by defining headings and paragraphs.

      Prerequisites:

        Basic HTML familiarity, as covered in
        Basic HTML Syntax.

      Learning outcomes:

          How to create a good document structure with headings and content beneath those headings.
          Using semantic HTML rather than presentational HTML, and why this is important.
          The need for heading levels to be used logically, i.e., no skipping levels or using them arbitrarily because you want to achieve a certain font size (that's a job for CSS).
          SEO benefits: for example, keywords are boosted in headings.
          Accessibility benefits: Assistive technology (AT) such as screen readers use headings (and other landmarks) as signposts to navigate content. HTML documents are very difficult for AT users to use without headings.

## Headings and paragraphs

Most structured text consists of headings and paragraphs, whether you are reading a story, a newspaper, a college textbook, a magazine, etc.

![An example of a newspaper front cover, showing use of a top level heading, subheadings and paragraphs.](newspaper_small.jpg)

Structured content makes the reading experience easier and more enjoyable.

In HTML, each paragraph has to be wrapped in a p element, like so:

Each heading has to be wrapped in a heading element:

There are six heading elements: Heading_Elements", "h1, Heading_Elements", "h2, Heading_Elements", "h3, Heading_Elements", "h4, Heading_Elements", "h5, and Heading_Elements", "h6. Each element represents a different level of content in the document; `` represents the main heading, `` represents subheadings, `` represents sub-subheadings, and so on.

## Implementing structural hierarchy

For example, in this story, the `` element represents the title of the story, the `` elements represent the title of each chapter, and the `` elements represent subsections of each chapter:

It's really up to you what the elements involved represent, as long as the hierarchy makes sense. You just need to bear in mind a few best practices as you create such structures:

- Preferably, you should use a single `` per page—this is the top level heading, and all others sit below this in the hierarchy.
- Make sure you use the headings in the correct order in the hierarchy. Don't use `` elements to represent subheadings, followed by `` elements to represent sub-subheadings—that doesn't make sense and will lead to weird results.
- Of the six heading levels available, you should aim to use no more than three per page, unless you feel it is necessary. Documents with many levels (for example, a deep heading hierarchy) become unwieldy and difficult to navigate. On such occasions, it is advisable to spread the content over multiple pages if possible.

## Why do we need structure?

To answer this question, let's take a look at [text-start.html](https://github.com/mdn/learning-area/blob/main/html/introduction-to-html/html-text-formatting/text-start.html)—a nice hummus recipe. This document's body currently contains multiple pieces of content. They aren't marked up in any way, but they are separated with line breaks (Enter/Return pressed to go onto the next line).

However, when you open the document in your browser, you'll see that the text appears as a big chunk!

![A webpage that shows a wall of unformatted text, because there are no elements on the page to structure it.](screen_shot_2017-03-29_at_09.20.35.png)

This is because there are no elements to give the content structure, so the browser does not know what is a heading and what is a paragraph. Furthermore:

- Users looking at a web page tend to scan quickly to find relevant content, often just reading the headings, to begin with. (We usually [spend a very short time on a web page](https://www.nngroup.com/articles/how-long-do-users-stay-on-web-pages/).) If they can't see anything useful within a few seconds, they'll likely get frustrated and go somewhere else.
- Search engines indexing your page consider the contents of headings as important keywords for influencing the page's search rankings. Without headings, your page will perform poorly in terms of SEO (Search Engine Optimization).
- Severely visually impaired people often don't read web pages; they listen to them instead. This is done with software called a [screen reader](https://en.wikipedia.org/wiki/Screen_reader). This software provides ways to get fast access to given text content. Among the various techniques used, they provide an outline of the document by reading out the headings, allowing their users to find the information they need quickly. If headings are not available, they will be forced to listen to the whole document read out loud.
- To style content with CSS, or make it do interesting things with JavaScript, you need to have elements wrapping the relevant content, so CSS/JavaScript can effectively target it.

Therefore, we need to give our content structural markup.

## Giving content structure

Let's jump straight in and get you to solve a small code challenge to gain practice with HTML headings and paragraphs:

1. Click **"Play"** in the code block below to edit the example in the MDN Playground.
2. Wrap the appropriate text at the start of the content inside an `` element to turn it into a main heading.
3. There are two pairs of words that should be wrapped inside `` elements to turn them into second level headings.
4. Wrap the remaining sentences in `` elements to turn them into paragraphs. One `` element should sit below each `` element.

If you make a mistake, you can clear your work using the _Reset_ button in the MDN Playground. If you get really stuck, you can view the solution below the code block.

Click here to show the solution

Your finished HTML element should look like this:

## Why do we need semantics?

Semantics are relied on everywhere around us—we rely on previous experience to tell us what the function of an everyday object is; when we see something, we know what its function will be. So, for example, we expect a red traffic light to mean "stop," and a green traffic light to mean "go." Things can get tricky very quickly if the wrong semantics are applied. (Do any countries use red to mean "go"? We hope not.)

In a similar way, we need to make sure we are using the correct elements, giving our content the correct meaning, function, or appearance. In this context, the `Heading_Elements", "&lt;h1>` element is also a semantic element, which gives the text it wraps around the role (or meaning) of "a top level heading on your page."

By default, the browser will give it a large font size to make it look like a heading (although you could style it to look like anything you wanted using CSS). More importantly, its semantic value will be used in multiple ways, for example by search engines and screen readers (as mentioned above).

On the other hand, you could make any element _look_ like a top level heading. Consider the following:

This is a span element. It has no semantics. You use it to wrap content when you want to apply CSS to it (or do something to it with JavaScript) without giving it any extra meaning. (You'll find out more about these later on in the course.) We've applied some CSS to it to make it look like a top level heading, but since it has no semantic value, it will not get any of the extra benefits described above. It is a good idea to use the relevant HTML element for the job.

## Summary

This concludes our study of HTML headings and paragraphs. Next, we will look at more aspects of semantic HTML: giving words emphasis.
