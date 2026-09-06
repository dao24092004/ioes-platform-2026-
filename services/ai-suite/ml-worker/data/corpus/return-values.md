---
title: Function return values
doc_id: return-values
source_url: https://developer.mozilla.org/en-US/docs/learn-web-development/core/scripting/return-values
license: CC BY-SA 2.5 (MDN Web Docs)
---

There's one last essential concept about functions for us to discuss — return values. Some functions don't return a significant value, but others do. It's important to understand what their values are, how to use them in your code, and how to make functions return useful values. We'll cover all of these below.

      Prerequisites:
      An understanding of HTML and the fundamentals of CSS, familiarity with JavaScript function basics as covered in the previous lesson.

      Learning outcomes:

          What return values are.
          How to use the return values of existing functions.
          Adding return values to your own functions.

## What are return values?

**Return values** are just what they sound like — the values that a function returns when it completes. You've already met return values several times, although you may not have thought about them explicitly.

Let's return to a familiar example (from a [previous article](/en-US/docs/Learn_web_development/Core/Scripting/Functions#built-in_browser_functions) in this series):

The [`replace()`](/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace) function is invoked on the `myText` string, and is passed two parameters:

- The substring to find (`"cold"`).
- The string to replace it with (`"warm"`).

When the function completes (finishes running), it returns a value, which is a new string with the replacement made. In the code above, the result of this return value is saved in the variable `newString`.

If you look at the [`replace()`](/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace) function MDN reference page, you'll see a section called [return value](/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#return_value). It is very useful to know and understand what values are returned by functions, so we try to include this information wherever possible.

Some functions don't return any value. (In these cases, our reference pages list the return value as [`void`](/en-US/docs/Web/JavaScript/Reference/Operators/void) or [`undefined`](/en-US/docs/Web/JavaScript/Reference/Global_Objects/undefined).) For example, in the [`displayMessage()`](https://github.com/mdn/learning-area/blob/main/javascript/building-blocks/functions/function-stage-4.html#L50) function we built in the previous article, no specific value is returned when the function is invoked. It just makes a box appear somewhere on the screen — that's it!

Generally, a return value is used where the function is an intermediate step in a calculation of some kind. You want to get to a final result, which involves some values that need to be calculated by a function. After the function calculates the value, it can return the result so it can be stored in a variable; and you can use this variable in the next stage of the calculation.

## How to return a value

To return a value from a custom function, you need to use the [`return`](/en-US/docs/Web/JavaScript/Reference/Statements/return) keyword. We saw this in action recently in our [random-canvas-circles.html](https://github.com/mdn/learning-area/blob/main/javascript/building-blocks/loops/random-canvas-circles.html) example. Our `draw()` function draws 100 random circles somewhere on an HTML canvas:

Inside each loop iteration, three calls are made to the `random()` function, to generate a random value for the current circle's _x-coordinate_, _y-coordinate_, and _radius_, respectively. The `random()` function takes one parameter — a whole number — and returns a random whole number between `0` and that number. It looks like this:

This could be written as follows:

But the first version is quicker to write, and more compact.

We are returning the result of the calculation `Math.floor(Math.random() * number)` each time the function is called. This return value appears at the point the function was called, and the code continues.

So when you execute the following:

If the three `random()` calls returned the values `500`, `200`, and `35`, respectively, the line would actually be run as if it were this:

The function calls on the line are run first, and their return values are substituted for the function calls, before the line itself is then executed.

## Implementing function return values

Let's have a go at writing some functions featuring return values.

1. Make a local copy of the [function-library.html](https://github.com/mdn/learning-area/blob/main/javascript/building-blocks/functions/function-library.html) file from GitHub. This is a simple HTML page containing a text input field and a paragraph. There's also a script element, in which we have stored a reference to both HTML elements in two variables. This page will allow you to enter a number into the text box, and display different numbers related to it below.

2. Add some useful functions to this `` element below the two existing lines:

   The `squared()` and `cubed()` functions are fairly obvious — they return the square or cube of the number that was given as a parameter. The `factorial()` function returns the [factorial](https://en.wikipedia.org/wiki/Factorial) of the given number.

3. Include a way to print out information about the number entered into the text input by adding the following event handler below the existing functions:

4. Save your code, load it in a browser, and try it out.

Here are some explanations for the `addEventListener()` function in step 3 above:

- By adding a `change` event listener, this function runs whenever the `change` event fires on the text input — that is when a new value is entered into the text `input`, and submitted (enter a value, then un-focus the input by pressing Tab or Return). When this anonymous function runs, the value in the `input` is stored in the `num` constant.
- The `if` statement prints an error message if the entered value is not a number. The condition checks if the expression `isNaN(num)` returns `true`. The [`isNaN()`](/en-US/docs/Web/JavaScript/Reference/Global_Objects/isNaN) function tests whether the `num` value is not a number — if so, it returns `true`, and if not, it returns `false`.
- If the condition returns `false`, the `num` value is a number and the function prints out a sentence inside the paragraph element that states the square, cube, and factorial values of the number. The sentence calls the `squared()`, `cubed()`, and `factorial()` functions to calculate the required values.

> [!NOTE]
> If you have trouble getting the example to work, check your code against the [finished version on GitHub](https://github.com/mdn/learning-area/blob/main/javascript/building-blocks/functions/function-library-finished.html) ([see it running live](https://mdn.github.io/learning-area/javascript/building-blocks/functions/function-library-finished.html) also).

### Add some functions of your own!

At this point, we'd like you to have a go at writing out a couple of functions of your own and adding them to the library. How about the square or cube root of the number? Or the circumference of a circle with a given radius?

Some extra function-related tips:

- Look at another example of writing _error handling_ into functions. It is generally a good idea to check that any necessary parameters are validated, and that any optional parameters have some kind of default value provided. This way, your program will be less likely to throw errors.
- Think about the idea of creating a _function library_. As you go further into your programming career, you'll start doing the same kinds of things over and over again. It is a good idea to create your own library of utility functions to do these sorts of things. You can copy them over to new code, or even just apply them to HTML pages wherever you need them.

## Summary

So there we have it — functions are fun, very useful, and although there's a lot to talk about in regards to their syntax and functionality, they are fairly understandable.

In the next article, we'll give you some tests that you can use to check how well you've understood and retained all the information we gave you on functions in the last few articles.

## See also

- [Functions in-depth](/en-US/docs/Web/JavaScript/Reference/Functions) — a detailed guide covering more advanced functions-related information.
- [Callback functions in JavaScript](https://www.impressivewebs.com/callback-functions-javascript/) — a common JavaScript pattern is to pass a function into another function _as an argument_. It is then called inside the first function. This is a little beyond the scope of this course, but worth studying before too long.
