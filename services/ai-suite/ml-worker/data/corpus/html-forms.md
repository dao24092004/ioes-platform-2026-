---
title: Forms and buttons in HTML
doc_id: html-forms
source_url: https://developer.mozilla.org/en-US/docs/learn-web-development/core/structuring-content/html-forms
license: CC BY-SA 2.5 (MDN Web Docs)
---

HTML forms and buttons are powerful tools for interacting with a website's users. Most commonly, they provide users with controls to manipulate a user interface (UI) or input data when required.

In this article, we provide an introduction to the basics of forms and buttons. There is a lot more to know — a lot of input types and form features are not mentioned — but this article will give you a solid foundation for most cases. You can learn the advanced or specialized uses on a need-to-know basis as part of the constant learning you'll do throughout your career.

      Prerequisites:

        Basic HTML familiarity, as covered in
        Basic HTML Syntax. Text-level semantics such as headings and paragraphs and lists. Structural HTML.

      Learning outcomes:

          An appreciation that forms and buttons are the main tools for users to interact with a website, along with links.
          Different button types.
          Common &lt;input&gt; types.
          Common attributes such as name and value.
          The &lt;form&gt; element, and the basics of form submission.
          Making forms accessible with labels and correct semantics.
          Other control types: &lt;textarea&gt;, &lt;select&gt;, and &lt;option&gt;.
          Client-side validation basics.

## Interacting with users

So far in the course, you have seen a couple of ways in which users can interact with the web:

- [Links](/en-US/docs/Learn_web_development/Core/Structuring_content/Creating_links) can be used to navigate to different sections of content, either on the same page or a different page.
- [`` and ``](/en-US/docs/Learn_web_development/Core/Structuring_content/HTML_video_and_audio) elements generally feature controls such as play/pause, fast forward, rewind, etc., which allow users to consume media content as they wish.

However, these features tend to facilitate one-way interactions, with users passively consuming content. This is fine, but the web is a two-way experience. Website users set preferences for how they want to experience content and services. They order taxis and request call backs. They provide feedback and make complaints. They buy products and get them delivered to their homes.

To provide this two-way experience, you need to use buttons and forms.

Buttons are usually created using HTML button elements (they are also sometimes created using input elements with their `type` attributes set to a value like `button` or `submit`). These push buttons are general-purpose — you can wire them up to trigger any functionality you want, limited only by your imagination and coding skills.

Forms are created using elements such as form, label, input, and select. Form elements can be used to create more complex controls than simple buttons allow — for example, a drop-down menu containing multiple options that allow you to choose between different themes for a user interface element.

However, crucially, they can also be used to create forms for users to fill in when they need to submit information to a website server. Think about e-commerce sites — when you want to search for a product to buy, you use a form to enter search terms. When you want to pay for some items and finalize delivery, you use a form to enter your postal address, and another form to enter your credit card details.

We'll be concentrating mainly on this — more traditional — use of form elements in this article. Note that buttons are also commonly used inside forms to submit the entered data to the server.

With this important theory out of the way, let's move on to explore the code and see how buttons and forms are implemented.

## Buttons

As hinted at above, buttons have a couple of main uses on the web. First of all, they are used to trigger functionality, which is useful when creating UI controls. The simplest button is implemented using the following code:

This is rendered as follows:

The text appearing in-between the `` tags is rendered inside the button, and it is given some basic styling by the browser so it will look and behave like a button by default. So far, so good. However, there is an issue here — our lonesome button won't do anything useful on its own. To make it do something useful, you'll need to put it inside a form (which we'll cover later on), or add some JavaScript.

For example, if you applied the following JavaScript to the above button:

It would give you the following output — try clicking it:

You are not expected to understand how the JavaScript works for now. You'll learn more about it later on in the course.

In the next section, you'll see a demonstration of the second main use of buttons — submitting forms.

## The anatomy of a form

A basic form contains three things:

- A form element, which wraps all of the other form content. Any form controls inside the `` tags are part of the same form, and their data is included when the form is submitted.
- One or more pairs each consisting of a label element and a form control element (usually an input element, but there are other types as well, for example select):
  - The form control element allows the user to choose or enter some data, which will be sent to the server when the form is submitted.
  - The `` element provides an identifying label associated with the form control describing the data that should be entered into it.
- A button element, used to submit the form.

Let's look at a basic example that includes the above three items. This form could be used to ask for a user's name and email, to sign them up for a newsletter (don't worry — it isn't connected to any server, so currently won't do anything).

This is rendered as follows:

If you click "Sign me up!" immediately, you'll see a validation error because no data was entered. If you fill out the fields with a name and email address, then click "Sign me up!", you'll see a `404` error message.

We'll explain why later on. Before moving on, copy the previous HTML code listing into a new HTML file using your [code editor](/en-US/docs/Learn_web_development/Getting_started/Environment_setup/Code_editors) and open it in a new browser tab.

### The `` element

As we said earlier, the form element acts as the outer wrapper for the form, grouping all the form controls inside it. When the `` is pressed, all the data represented by the form controls will be submitted to the server. The `` element can take many attributes, but the two most important ones, which we've included in our example, are as follows:

- `action`: Contains a path to the page that we want to send the submitted form data to, to be processed. Later on, after you submit the form, you'll see `/submit_page` included in the URL. You'll also get a 404 error response because the page doesn't actually exist, but that's fine for now.
- `method`: Specifies the data transmission [method](/en-US/docs/Web/HTTP/Reference/Methods) you want to use for sending the form data to the server. Don't worry about this too much for now; the `get` value causes the data to be sent as parameters attached to the end of the URL.

#### Checking out the submitted data

1. Go to the example in the separate tab, try entering a name of "Bob" and an email address of "bob@bob.com".
2. Press the ``.

The `action` and `method` attributes cause the form data to be submitted in a URL along the following lines:

#### Structuring forms

You can include any HTML elements you like inside a `` element to structure the form elements themselves and provide containers to target with CSS for styling, etc.

In our example, we've included a [heading element](/en-US/docs/Web/HTML/Reference/Elements/Heading_Elements) (``) to describe the purpose of the form.

We've also put each input/label pair and the submit button inside a separate p, so that each will appear on a separate line. These elements are all inline by default, meaning that if we didn't do this, they would all sit on the same line.

This is a common pattern for form structuring. Some people use `` elements to separate out their form elements, some use div, section, or even li elements. It doesn't matter a great deal, as long as the elements used make semantic sense. For example, it makes sense to divide form element groups up into separate paragraphs or sections of content, or even items in a list. It would make less sense to represent them as [blockquotes](/en-US/docs/Web/HTML/Reference/Elements/blockquote), [asides](/en-US/docs/Web/HTML/Reference/Elements/aside), or [addresses](/en-US/docs/Web/HTML/Reference/Elements/address).

There is a specialized element for grouping form elements together called fieldset. This is useful in certain circumstances, such as in complex forms and when grouping multiple checkboxes and radio buttons. We'll look at a couple of `` examples later on.

### `` elements

The input elements represent the different data items entered into the form. Let's study one of the examples from our basic form:

The attributes are as follows:

- `type`: Specifies the type of form control to create. There are many different types of form controls, from simple text fields of different types to radio buttons, checkboxes, and more. Type `text` renders a basic text field that can accept any value.
- `name`: Specifies a name for the data item. When the form is submitted, the data is sent in name/value pairs. In each case, the name is equal to this `name` attribute value, and the value is equal to the text entered in the text field.
- `id`: Specifies an ID that can be used to identify the element. In this case, it is used to associate the form control with its ``.
- `required`: Specifies that a value has to be entered into the form element before the form can be submitted. This should only be set on inputs that you require, not on optional fields.

You should be aware that some input types usually don't get their values from text entered into a field. For example, [``](/en-US/docs/Web/HTML/Reference/Elements/input/color) renders a color picker widget that you choose a color from, whereas [``](/en-US/docs/Web/HTML/Reference/Elements/input/radio) renders a radio button control that can be selected, or not.

In the case of radio buttons, you generally need to provide the value that would be submitted if it is selected inside a specific `value` attribute. Note that you _can_ specify a `value` attribute on input types like `text` and `color` — the effect is that the value is pre-filled into the form field when it is first rendered.

#### `required` and `value` attributes in action

1. Again, go to the example you loaded in a separate tab, and try submitting the form with no value entered in either field. You'll see an error message pop up next to the "Name" field saying something like "Please fill in this field" (it will vary across different browsers). This is the `required` attribute — and the browser's default client-side form validation — in action.
2. Now try submitting the form with a valid name entered in the first field, but a value that is not a valid email address in the second field (something like "aaaa" will do). This time you'll see an error message pop up next to the "Email" field saying something like "Please enter an email address".
3. Try editing the form to include `value="Bob"` on the first input. When you reload the code, you'll see that the first field has a value of "Bob" entered into it by default.

#### Specialized text field inputs

The second exercise above raises an interesting point. The second input field specifically expects an email address and validates entered values as such. If you look at the form code again, you'll see why — the second `` has a `type` of `email`.

There are several specialized text field input types designed to handle specific types of data such as [``](/en-US/docs/Web/HTML/Reference/Elements/input/number), [``](/en-US/docs/Web/HTML/Reference/Elements/input/password), [``](/en-US/docs/Web/HTML/Reference/Elements/input/tel), [``](/en-US/docs/Web/HTML/Reference/Elements/input/url), and so on.

Follow some of the links above to find out what these input types are used for. Have a look around our [``](/en-US/docs/Web/HTML/Reference/Elements/input) reference and see if you can find any more specialized text field input types.

### `` elements

As we said above, label elements provide identifying labels associated with form controls that describe the data that should be entered into them. You can put whatever text content you like in `` elements, but they should accurately describe what data the associated form control expects. The association is created by giving the form control an `id` attribute, then giving the `` element a `for` attribute with the same value as the control's `id`.

For example:

`` elements are important for several reasons, most notably that:

- When visually impaired users use a screen reader to help them read and interact with web page content, the screen reader will read out the associated label text when each control is encountered. This makes it easier for the users to understand what content should be entered into each control.
- They enable you to focus the form elements by clicking on their label text as well as the controls. This is especially useful for mobile phone users, where it can be difficult to accurately select a form element with your finger on a touch screen. Making the **hit area** larger is useful in such circumstances.

#### Explicit and implicit form labels

The form label style you saw above is called an **explicit form label** — the association between control and label is explicitly made via the `id` and `for` attributes. You can also implement an **implicit form label** by nesting the control inside the label, like this:

The nesting makes an implicit association between control and label, and you no longer need the `id` and `for` attributes.

Either approach is OK, but we'd recommend using the explicit labeling approach. This is because the explicit association is usually easier to identify and understand, especially as your HTML code gets more complex. In addition, screen readers (and other assistive technologies) don't always handle implicit labels correctly.

You can read more about form labeling best practices in [HTML Inputs and Labels: A Love Story](https://css-tricks.com/html-inputs-and-labels-a-love-story/), csstricks.com (2021).

### The `` element

When a button element is included inside a `` element, its default behavior is that it will submit the form, provided there is no invalid data present, causing submission to be blocked by client-side form validation. You've already seen this behavior when playing with our basic form example above.

Other button behaviors can be specified via the `` element's `type` attribute:

- `` explicitly declares that a button should behave like a submit button. You don't ever really need to declare this, unless for some reason you are including other buttons inside your ``, and you want to make it clear which one the submit button is. This will be very rare.
- `` creates a _reset button_ — this immediately deletes all data out of the form, resetting it to its initial state. **Don't use reset buttons** — they used to be popular in the early days of the web, but they are usually more annoying than they are helpful. Most people have experienced filling out a long form only to click the reset button by accident instead of the submit button, meaning they have to start again.
- `` creates a button with the same behavior as buttons specified outside of `` elements. As we saw earlier, they do absolutely nothing by default, and JavaScript is needed to give them functionality.

Although you can create these button types by using an `` element with the same `type` values – such as [``](/en-US/docs/Web/HTML/Reference/Elements/input/submit), [``](/en-US/docs/Web/HTML/Reference/Elements/input/reset), and [``](/en-US/docs/Web/HTML/Reference/Elements/input/button) – they have many disadvantages compared to their `` counterparts. So you should use `` instead.

> [!NOTE]
> Scrimba[_MDN learning partner_](/en-US/docs/MDN/Writing_guidelines/Learning_content#partner_links_and_embeds) has a free lesson — [The very basics of forms](https://scrimba.com/learn-responsive-web-design-c029/~031?via=mdn) — which provides a useful interactive recap of the form basics we covered previously in this article.

## An aside on accessibility

We've already talked about the importance of form labels for accessibility, but we also wanted to include some commentary on the general importance of using the correct semantic elements to create forms (for example, use a `` to submit your form, and not a `` programmed to behave like a ``.) It is perfectly possible to use a combination of CSS and JavaScript to make pretty much any HTML element look and behave like a form element. Developers usually do this for design reasons — some form controls are hard to style.

However, when you do this, you are making life harder for yourself and your users. The browser provides several `` and form control features by default, with no JavaScript or other extra code required, to make forms more usable for all users.

For example:

- Semantic elements are understood by assistive technology such as screen readers, which communicate their meaning to users who cannot see them.
- Form controls and buttons are keyboard-accessible by default. In the previous example, try moving forward and backward between the form elements using Tab and Shift + Tab (called "tabbing").
- Notice also how tabbing between the form elements causes the focused element to be highlighted using a blue outline (called the **focus outline**). This is an important feature for keyboard users to know where they currently are in the form.

If you don't use the correct semantic elements to implement your forms, your form elements will not behave as users expect and will seem broken. You'll have to re-implement all of this functionality yourself, which all adds up.

## Other control types

There are many other control types you can use to collect data in a form. Let's look at a slightly more complex example, and then we'll explore and explain it.

> [!NOTE]
> In this example, we are assuming the user is already registered and signed in, hence not needing to collect details such as name and email.

This is rendered as follows:

We'd recommend that you open this example in a separate browser tab as you work through the next few sections, in which we look at each control type in turn. To achieve this, copy the code into an HTML file using your code editor, and open it in a browser tab.

Before moving on, play with the different form controls in your local copy and select some values. Try submitting the form and see what the data submitted in the URL looks like.

### Radio buttons

The "Choose hotel room type" buttons are implemented using [``](/en-US/docs/Web/HTML/Reference/Elements/input/radio) controls. These render as a set of push button controls where only one of the set can be selected at any one time — you can't select more than one at once. They are named after the buttons found on old-fashioned radios, where you press one button and the previously-selected one pops out again.

Our example code looks like this:

`radio` input types mostly work the same as `text` input types, but with a few differences:

- The `name` attributes for each set of radio buttons have to contain the same value, to associate them together as one set. If they contain different values, they will effectively be separate sets, with different values on submission.
- You have to include a `value` attribute containing the value to submit for each radio button. The submitted value will be a name/value pair, but the name will always be the same, for example, `hotel=economy` or `hotel=superior`.
- The `` for each radio button should describe that particular value choice, rather than the overall value you are selecting. The preferred way to describe the overall value choice is to wrap them in a fieldset, which takes a legend element as a child that contains the description.

> [!NOTE]
> Besides structuring and labeling forms, fieldsets have other uses, such as [disabling](#disabling_form_controls) an entire set of controls as a single unit.

It's also worth noting that we've applied the `checked` attribute to the first radio button — this causes it to be selected when the page first loads. This means one option will always be selected, and you can't deselect a radio button without selecting another one.

Try removing the `checked` attribute from the first radio button, save, then reload, to see the effect it has. Put it back before you move on.

#### Disabling form controls

In the radio button example, you'll notice that the third radio button has the `disabled` attribute set on it. This causes the rendered control to be grayed out and unselectable. This is useful in many situations where an option is normally available, just not right now. For example, a product might be out of stock, or as in our example's case, penthouse suites are all booked up!

You can set the `disabled` attribute on any form control, including `` elements. `` elements can also accept the `disabled` attribute — this causes every form control inside the fieldset to be disabled.

Try setting the `disabled` attribute on the two `` elements, save, then reload, to see the effect it has. Remove them again before moving on.

### Checkboxes

Our "classes to attend" selectors are implemented using [``](/en-US/docs/Web/HTML/Reference/Elements/input/checkbox) controls. These render as a set of on/off state checkboxes. Unlike radio buttons, you can select more than one at once.

As you can see from the code snippets, radio buttons and checkboxes are implemented in a very similar way (they can also take `checked` attributes to render them pre-selected when the page loads). They also behave in a fairly similar fashion, except that radio buttons allow you to choose zero or one items out of many, and checkboxes allow you to choose zero or more items out of many.

The main difference (apart from the `type` value!) is that each checkbox has a different `name` value, and they generally aren't given `value` attributes. Behavior-wise, this means they represent different data values, whereas a radio button set only represents one. On submission, each value is submitted with a value of `on` if the checkbox was checked — `yoga=on`, `balloon=on`, etc.

> [!NOTE]
> It is possible to change the value submitted for a checkbox by giving it a `value` attribute, for example: `` would result in `yoga=yes` being submitted if checked.

### Drop-down menus

Drop-down menus, for example, the "How are you getting here" selection control in our example, are implemented not with an `` type, but with the select and option elements:

The `` element wraps all the different value choices. It is where you set the `id` attribute that associates the control with its label, and the `name` attribute that sets the name of the data item to be submitted.

Each possible value for the data item is represented by an `` element, nested inside the `` element. Each `` element can take a `value` attribute, which specifies the value to be submitted if that option is chosen from the drop-down list. If you don't specify a `value`, the text inside the `` tags is used as the value.

You can also split the options inside a `` drop-down menu into multiple subgroups using the optgroup element. Take a look at this element's reference page to find out how.

> [!NOTE]
> If you want to have a specific option selected on page load, you can add a `selected` attribute to the relevant `` element.

### Multi-line text input fields

Multi-line text input fields are created using textarea elements:

They behave in the same way as `` elements, except that they allow multiple lines of text to be entered. The `rows` attribute specifies the number of rows tall the text area will be by default, while the `cols` attribute specifies the number of columns wide the text area will be by default. If they are not specified, the values used are `cols="20"` and `rows="2"`.

Most browsers render text areas with a drag handle in one corner, which can be used to resize it. Try using this to resize the text area in our demo.

## Form validation

Earlier on, we looked at some of the basic client-side form validation provided by the browser. The `required` attribute is used to specify that a field must be filled out before the form can be submitted; it also checks the correct value type is entered for specific value types like email addresses, URLs, numbers, etc. Validation is important for two main reasons:

- Making sure that data is submitted in the correct format so that it doesn't cause errors in your application.
- Making sure data does not cause security problems. Bad people know how to submit data formatted specifically so that, on insecure applications, it can execute commands to delete databases or take control of a system.

Form validation is a huge topic that is beyond the scope of this article, so we will leave it here for now. Just bear in mind that there are two types of form validation:

- Client-side validation, which happens in the browser, is implemented using a combination of form validation attributes (like `required`) and JavaScript. Client-side validation is useful for giving users instant hints when they have entered the wrong data, but is not so effective at stopping malicious data from getting through. It is too easy to turn off JavaScript or alter client-side code so that the validation no longer works.
- Server-side validation, which happens on the server, is implemented using whatever language the server is using. Badly-formed messages can be sent to a server by accident or on purpose. Conventional wisdom is to make sure that your server doesn't trust anything a client is sending to avoid bugs or security issues caused by malformed messages. Server-side validation is great for stopping malicious messages, as it's harder to tamper with the code running on the server. Server-side validation is not so good at giving users hints about incorrect data because the data has to go to the server to get validated, then the result has to be sent back to the client before the user can be notified.

In short, don't decide between using either client-side or server-side validation - you will need both. You need client-side validation to give users feedback on their input and server-side validation to make sure messages are in a format your server can safely handle. If you want to start learning more about validation, a good place to start is [Client-side form validation](/en-US/docs/Learn_web_development/Extensions/Forms/Form_validation).

## Summary

That's all for now. There's a lot more to know about forms, but for now, we've given you enough of an understanding to move forward in your studies.

Next up, we'll give you some tests that you can use to check how well you've understood and retained the information we've provided on HTML forms.

## See also

- [Web forms — Working with user data](/en-US/docs/Learn_web_development/Extensions/Forms)
