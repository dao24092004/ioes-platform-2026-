---
title: Structuring documents
doc_id: structuring-documents
source_url: https://developer.mozilla.org/en-US/docs/learn-web-development/core/structuring-content/structuring-documents
license: CC BY-SA 2.5 (MDN Web Docs)
---

In addition to defining individual parts of your page (such as "a paragraph" or "an image"), HTML also boasts a number of block level elements used to define areas of your website such as "the header", "the navigation menu", or "the main content column". This article looks into how to plan a basic website structure, and write the HTML to represent this structure.

      Prerequisites:

        Basic HTML familiarity, as covered in
        Basic HTML Syntax. Text-level semantics such as headings and paragraphs and lists.

      Learning outcomes:

          The common HTML semantic structural elements, for example &lt;main&gt;, &lt;section&gt;, &lt;article&gt;, &lt;header&gt;, &lt;nav&gt;, and &lt;footer&gt;, and how to use them correctly.
          The need to use semantic elements in appropriate places, rather than just using &lt;div&gt; elements wherever a block-level container is required, and the benefits of this (such as improved accessibility).

## Basic sections of a document

Webpages can and will look pretty different from one another, but they all tend to share similar standard components, unless the page is displaying a fullscreen video or game, is part of some kind of art project, or is just badly structured:

- header:
  - : Usually a big strip across the top with a big heading, logo, and perhaps a tagline. This usually stays the same from one page of a website to another.
- navigation bar:
  - : Links to the site's main sections; usually represented by menu buttons, links, or tabs. Like the header, this content usually remains consistent from one webpage to another — having inconsistent navigation on your website will just lead to confused, frustrated users. Many web designers consider the navigation bar to be part of the header rather than an individual component, but that's not a requirement; in fact, some also argue that having the two separate is better for [accessibility](/en-US/docs/Learn_web_development/Core/Accessibility), as screen readers can read the two features better if they are separate.
- main content:
  - : A big area in the center that contains most of the unique content of a given webpage, for example, the video you want to watch, or the main story you're reading, or the map you want to view, or the news headlines, etc. This is the one part of the website that definitely will vary from page to page!
- sidebar:
  - : Some peripheral info, links, quotes, ads, etc. Usually, this is contextual to what is contained in the main content (for example on a news article page, the sidebar might contain the author's bio, or links to related articles) but there are also cases where you'll find some recurring elements like a secondary navigation system.
- footer:
  - : A strip across the bottom of the page that generally contains fine print, copyright notices, or contact info. It's a place to put common information (like the header) but usually, that information is not critical or secondary to the website itself. The footer is also sometimes used for SEO purposes, by providing links for quick access to popular content.

A "typical website" could be structured something like this:

![a simple website structure example featuring a main heading, navigation menu, main content, side bar, and footer.](sample-website.png)

> [!NOTE]
> The image above illustrates the main sections of a document, which you can define with HTML. However, the _appearance_ of the page shown here — including the layout, colors, and fonts — is achieved by applying [CSS](/en-US/docs/Learn_web_development/Core/Styling_basics) to the HTML.

## HTML for structuring content

The example shown above isn't pretty, but it is perfectly fine for illustrating a typical website layout example. Some websites have more columns, some are a lot more complex, but you get the idea. With the right CSS, you could use pretty much any elements to wrap around the different sections and get it looking how you wanted, but as discussed before, we need to respect semantics and **use the right element for the right job**.

This is because visuals don't tell the whole story. We use color and font size to draw sighted users' attention to the most useful parts of the content, like the navigation menu and related links, but what about visually impaired people for example, who might not find concepts like "pink" and "large font" very useful?

> [!NOTE]
> [Roughly 8% of men and 0.5% of women](https://www.color-blindness.com/) are colorblind; or, to put it another way, approximately 1 in every 12 men and 1 in every 200 women. Blind and visually impaired people represent roughly 4-5% of the world population (in 2015 there were [940 million people with some degree of vision loss](https://en.wikipedia.org/wiki/Visual_impairment), while the total population was [around 7.5 billion](https://en.wikipedia.org/wiki/World_human_population#/media/File:World_population_history.svg)).

In your HTML code, you can mark up sections of content based on their _functionality_ — you can use elements that represent the sections of content described above unambiguously, and assistive technologies like screen readers can recognize those elements and help with tasks like "find the main navigation", or "find the main content." As we mentioned earlier in the course, there are a number of [consequences of not using the right element structure and semantics for the right job](/en-US/docs/Learn_web_development/Core/Structuring_content/Headings_and_paragraphs#why_do_we_need_structure).

To implement such semantic mark up, HTML provides dedicated tags that you can use to represent such sections, for example:

- **header:** header.
- **navigation bar:** nav.
- **main content:** main, with various content subsections represented by article, section, and div elements.
- **sidebar:** aside; often placed inside main.
- **footer:** footer.

### Exploring the code for our example

The example seen above is represented by the following code (you can also [find the example in our GitHub repository](https://github.com/mdn/learning-area/blob/main/html/introduction-to-html/document_and_website_structure/index.html)). We'd like you to look at the listing below to see what parts make up each section of the visual output.

Take some time to look over the code and understand it — the comments inside the code should also help you to understand it. We aren't asking you to do much else in this article, because the key to understanding document layout is writing a sound HTML structure, and then laying it out with CSS. We'll wait for this until you start to study CSS layout as part of the CSS topic.

## HTML layout elements in more detail

It's good to understand the overall meaning of all the HTML sectioning elements in detail — this is something you'll work on gradually as you start to get more experience with web development. You can find a lot of detail by reading our [HTML element reference](/en-US/docs/Web/HTML/Reference/Elements). For now, these are the main definitions that you should try to understand:

- main is for content _unique to this page._ Use `` only _once_ per page, and put it directly inside body. Ideally this shouldn't be nested within other elements.
- article encloses a block of related content that makes sense on its own without the rest of the page (for example, a single blog post).
- section is similar to ``, but it is more for grouping together a single part of the page that constitutes one single piece of functionality (like a mini map, or a set of article headlines and summaries), or a theme. It's considered best practice to begin each section with a [heading](/en-US/docs/Learn_web_development/Core/Structuring_content/Headings_and_paragraphs); also note that you can break ``s up into different ``s, or ``s up into different ``s, depending on the context.
- aside contains content that is not directly related to the main content but can provide additional information indirectly related to it (glossary entries, author biography, related links, etc.).
- header represents a group of introductory content. If it is a child of body it defines the global header of a webpage, but if it's a child of an article or section it defines a specific header for that section (try not to confuse this with [titles and headings](/en-US/docs/Learn_web_development/Core/Structuring_content/Webpage_metadata#adding_a_title)).
- nav contains the main navigation functionality for the page. Secondary links, etc., would not go in the navigation.
- footer represents a group of end content for a page.

Each of the aforementioned elements can be clicked on to read the corresponding article in the "HTML element reference" section, providing more detail about each one.

### Non-semantic wrappers

Sometimes you'll come across a situation where you can't find an ideal semantic element to group some items together or wrap some content. Sometimes you might want to just group a set of elements together to affect them all as a single entity with some CSS or JavaScript. For cases like these, HTML provides the div and span elements. You should use these preferably with a suitable [`class`](/en-US/docs/Web/HTML/Reference/Global_attributes/class) attribute, to provide some kind of label for them so they can be easily targeted.

span is an inline non-semantic element, which you should only use if you can't think of a better semantic text element to wrap your content, or don't want to add any specific meaning. For example:

In this case, the editor's note is supposed to merely provide extra direction for the director of the play; it is not supposed to have extra semantic meaning. For sighted users, CSS would perhaps be used to distance the note slightly from the main text.

div is a block level non-semantic element, which you should only use if you can't think of a better semantic block element to use, or don't want to add any specific meaning. For example, imagine a shopping cart widget that you could choose to pull up at any point during your time on an e-commerce site:

This isn't really an ``, as it doesn't necessarily relate to the main content of the page (you want it viewable from anywhere). It doesn't even particularly warrant using a ``, as it isn't part of the main content of the page. So a `` is fine in this case. We've included a heading as a signpost to aid screen reader users in finding it.

> [!WARNING]
> Divs are so convenient to use that it's easy to use them too much. As they carry no semantic value, they just clutter your HTML code. Take care to use them only when there is no better semantic solution and try to reduce their usage to the minimum otherwise you'll have a hard time updating and maintaining your documents.

> [!NOTE]
> Scrimba's [Semantic HTML](https://scrimba.com/learn-accessible-web-design-c031/~0b?via=mdn) [_MDN learning partner_](/en-US/docs/MDN/Writing_guidelines/Learning_content#partner_links_and_embeds) interactive tutorial provides a useful recap of semantic markup and why you should use it, plus a challenge that tests your ability to improve an HTML codebase with semantic elements.

### Line breaks and horizontal rules

Two elements that you'll use occasionally and will want to know about are br and hr.

#### \: the line break element

`` creates a line break in a paragraph; it is the only way to force a rigid structure in a situation where you want a series of fixed short lines, such as in a postal address or a poem. For example:

Without the `` elements, the paragraph would just be rendered in one long line (as we said earlier in the course, [HTML ignores most whitespace](/en-US/docs/Learn_web_development/Core/Structuring_content/Basic_HTML_syntax#whitespace_in_html)); with `` elements in the code, the markup renders like this:

#### \: the thematic break element

`` elements create a horizontal rule in the document that denotes a thematic change in the text (such as a change in topic or scene). Visually it just looks like a horizontal line. As an example:

Would render like this:

## Structuring a basic website

The next stage after planning out the structure of a single webpage is to plan out the structure of a whole multi-page website, including how they should be arranged and link to one another for the best possible user experience. This is called Information architecture.

In a large, complex website, a lot of planning can go into this process, but for a basic website with a few pages, it can be a quick and fun exercise.

The process might look like this:

1. You'll have a few elements common to most (if not all) pages — such as the navigation menu, and the footer content. If your site is for a business, for example, it's a good idea to have your contact information available in the footer on each page. Note down what you want to have common to every page. For example:
   - Header:
     - Title and logo
     - Site language chooser
   - Navigation menu
   - Footer:
     - Copyright notice
     - Link to terms and conditions, contact details, and accessibility policy

2. Next, draw a rough sketch of what you might want the structure of each page to look like (it might look like our simple website above). Note what each block is going to be.![A simple diagram of a sample site structure, with a header, main content area, two optional sidebars, and footer](/shared-assets/images/diagrams/learn/structuring-documents/site-structure.svg)
3. Now, brainstorm all the other (not common to every page) content you want to have on your website. For example:
   - Flights
   - Accommodation
   - Transport
   - Things to do
   - Special offers
   - Popular holiday packages, for example winter sun, skiing
   - Search results
   - Reviews
   - Visa/entry requirements
   - Currency
   - Languages and culture
   - Buy holidays

4. Next, try to sort all these content items into groups, to give you an idea of what parts might live together on different pages. This is very similar to a technique called Card sorting.
   - Search
     - Flights
     - Accommodation
     - Transport
     - Things to do
   - Special offers
     - Popular holidays
     - Winter sun
     - Skiing
   - Search results
     - Reviews
     - Country-specific info
       - Visa/entry requirements
       - Currency
       - Languages and culture
   - Buy holidays

5. Now try to sketch a rough sitemap — have a box for each page on your site, and draw lines to show the typical workflow between pages. The homepage will probably be in the top or at the center, and link to most if not all of the others. Most of the pages in a small site should be available from the main navigation, although there are exceptions. You might also want to include notes about how things might be presented.![A map of the site showing the homepage, country page, search results, specials page, and checkout and purchase flow](/shared-assets/images/diagrams/learn/structuring-documents/site-map.svg)

Try carrying out the above exercise for a website of your own creation. What would you like to make a site about? As a stretch goal, use the HTML knowledge you've gained so far to create a few of the pages on the site. You could use our [basic HTML template](https://github.com/mdn/learning-area/blob/main/html/introduction-to-html/getting-started/index.html) as a starting point.

## Summary

At this point, you should have a better idea about how to structure a web page/site. In the next article of this module, we'll look at how to create hyperlinks, one of the fundamental features of the web.
