---
title: Functions — reusable blocks of code
doc_id: functions
source_url: https://developer.mozilla.org/en-US/docs/learn-web-development/core/scripting/functions
license: CC BY-SA 2.5 (MDN Web Docs)
---

Another essential concept in coding is **functions**, which allow you to store a piece of code that does a single task inside a defined block, and then call that code whenever you need it using a single short command — rather than having to type out the same code multiple times. In this article, we'll explore fundamental function concepts like basic syntax, how to invoke and define them, scope, and parameters.

      Prerequisites:
      An understanding of HTML and the fundamentals of CSS, familiarity with JavaScript basics as covered in previous lessons.

      Learning outcomes:

          The purpose of functions — to enable the creation of reusable blocks of code that can be called wherever needed.
          Functions are used everywhere in JavaScript.
          Some functions are built into the browser, and some are user-defined.
          The difference between functions and methods.
          Invoking functions.
          Anonymous functions and arrow functions.
          Defining function parameters and passing in arguments to function calls.
          Global scope and function/block scope.
          An understanding of what callback functions are.

## Where do I find functions?

In JavaScript, you'll find functions everywhere. In fact, we've been using functions throughout the course so far; we've just not talked about them very much. Now is the time, however, for us to start talking about functions explicitly and exploring their syntax.

Pretty much anytime you make use of a JavaScript structure that features a pair of parentheses — `()` — and you're **not** using a common language structure like a [for loop](/en-US/docs/Learn_web_development/Core/Scripting/Loops#the_standard_for_loop), [while or do...while loop](/en-US/docs/Learn_web_development/Core/Scripting/Loops#while_and_do...while), or [if...else statement](/en-US/docs/Learn_web_development/Core/Scripting/Conditionals#if...else_statements), you are making use of a function.

## Built-in browser functions

We've made extensive use of built-in browser functions in this course.

Every time we manipulated a text string, for example:

Or every time we manipulated an array:

Or every time we generate a random number:

We were using a _function_!

> [!NOTE]
> Feel free to enter these lines into your browser's JavaScript console to re-familiarize yourself with their functionality if needed.

The JavaScript language has many built-in functions that allow you to do useful things without writing all that code yourself. In fact, some of the code you are calling when you **invoke** (a fancy word for run, or execute) a built-in browser function couldn't be written in JavaScript — many of these functions are calling parts of the background browser code, which is written largely in low-level system languages like C++, not web languages like JavaScript.

Bear in mind that some built-in browser functions are not part of the core JavaScript language — some are defined as part of browser APIs, which build on top of the default language to provide even more functionality (refer to [this early section of our course](/en-US/docs/Learn_web_development/Core/Scripting/What_is_JavaScript#so_what_can_it_really_do) for more descriptions). We'll look at using browser APIs in more detail in a later module.

## Functions versus methods

**Functions** that are part of objects are called **methods**; you'll learn about objects later in the module. For now, we just wanted to clear up any possible confusion about methods versus functions — you are likely to meet both terms as you look at related resources across the Web.

The built-in code we've used so far comes in both forms: **functions** and **methods.** You can check the full list of built-in functions, as well as built-in objects and their corresponding methods [in our JavaScript reference](/en-US/docs/Web/JavaScript/Reference/Global_Objects).

You've also seen a lot of **custom functions** in the course so far — functions defined in your code, not inside the browser. Anytime you saw a custom name with parentheses straight after it, you were using a custom function. In our [random-canvas-circles.html](https://mdn.github.io/learning-area/javascript/building-blocks/loops/random-canvas-circles.html) example (see also the full [source code](https://github.com/mdn/learning-area/blob/main/javascript/building-blocks/loops/random-canvas-circles.html)) from our [loops article](/en-US/docs/Learn_web_development/Core/Scripting/Loops), we included a custom `draw()` function that looked like this:

This function draws 100 random circles inside a canvas element. Every time we want to do that, we can invoke the function like this, rather than having to write all that code out again every time we want to repeat it:

Functions can contain whatever code you like, even other function calls. For example, the `draw()` function seen above calls the `random()` function three times; `random()` is defined by the following code:

We needed this function because the browser's built-in [`Math.random()`](/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random) function only generates a random decimal number between 0 and 1. We wanted a random whole number between 0 and a specified number.

## Invoking functions

You are probably clear on this by now, but just in case, to actually use a function after it has been defined, you've got to run — or invoke — it. This is done by including the function's name in the code somewhere, followed by parentheses.

> [!NOTE]
> This form of creating a function is also known as _function declaration_. It is always hoisted, which means you can call the function above its definition and it will work fine.

## Function arguments and parameters

Some functions require **arguments** when you invoke them — values that need to be included inside the function parentheses for the function to do its job properly.

You'll also hear the term **parameters** used, often interchangeably with _arguments_. This is often OK in informal discussions, but they have different meanings. Parameters are the variables listed in a function definition, while arguments are the values passed to the function to represent the parameters when the function is called.

Let's look at some examples. The [`Math.random()`](/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random) function doesn't require any arguments. When called, it always returns a random number between 0 and 1:

The string [`replace()`](/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace) function, however, needs two arguments — the substring to find in the main string, and the substring to replace that string with:

> [!NOTE]
> When you need to specify multiple parameters or arguments, you separate them with commas.

### Optional parameters

Sometimes parameters are defined as optional — you don't have to specify the equivalent arguments when calling the function. If you don't, the function generally uses a default value. As an example, the array [`join()`](/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/join) function's parameter is optional:

If no argument is included to specify a joining/delimiting character, a comma is used by default.

### Default parameters

If you're writing a function and want to define optional parameters, you can specify default values by adding `=` after the name of the parameter, followed by the default value:

## Anonymous functions and arrow functions

So far, we have just created functions like so:

But you can also create a function that doesn't have a name:

This is called an **anonymous function**, because it has no name. You'll often see anonymous functions when a function expects to receive another function as an argument. In this case, an anonymous function is often passed as the argument.

> [!NOTE]
> This form of creating a function is also known as _function expression_. Unlike function declarations, function expressions are not hoisted.

### Anonymous function example

For example, let's say you want to run some code when the user types into a text box. To do this, you can call the  function of the text box. This function expects at least two arguments:

- The name of the event to listen for, which in this case is Element.keydown_event", "keydown
- A function to run when the event happens.

When the user presses a key, the browser will call the function you provided and pass it a parameter containing information about this event, including the particular key that the user pressed:

Instead of defining a separate `logKey()` function, you can pass an anonymous function into `addEventListener()`:

### Arrow functions

If you pass an anonymous function like this, there's an alternative form you can use, called an **arrow function**. Instead of `function(event)`, you write `(event) =>`:

If the function only takes one argument, you can omit the parentheses around it:

Finally, if your function contains only a single line that's a `return` statement, you can omit the braces and the `return` keyword, and implicitly return the expression. In the following example, we're using the  method of `Array` to double every value in the original array:

The `map()` method passes each item in the array to the given function, then takes the function's return value and adds it to a new array.

The arrow function is very concise; rewriting our `map()` code to use a regular anonymous callback function would look like this:

You can use the same concise arrow function syntax to rewrite the `addEventListener()` example:

In this case, the value of `console.log()`, which is `undefined`, is implicitly returned from the callback function.

We recommend using arrow functions, as they can make your code shorter and more readable. To learn more, see the [section on arrow functions in the JavaScript guide](/en-US/docs/Web/JavaScript/Guide/Functions#arrow_functions), and our [reference page on arrow functions](/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions).

> [!NOTE]
> There are some subtle differences between arrow functions and normal functions. They're outside the scope of this introductory tutorial and are unlikely to make a difference in the cases we've discussed here. To learn more, see the [arrow function reference documentation](/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions).

### Arrow function live sample

Here's a complete working version of the `keydown` example we discussed above:

The HTML:

The JavaScript:

The result - try typing into the text box and see the output:

## Function scope and conflicts

Let's talk a bit about scope — an important concept when dealing with functions. When you create a function, the variables and other things defined inside the function are inside their own separate **scope**. This means that they are locked away in their own separate compartment, unreachable from code outside the function.

The top-level outside all your functions is called the **global scope**. Values defined in the global scope are accessible from everywhere in the code.

JavaScript works like this mainly for security and organization. Sometimes you don't want variables to be accessible from everywhere in the code. External scripts called in from elsewhere could mess with your code and cause problems if they use the same variable names, causing conflicts. This might be done maliciously or just by accident.

For example, say you have an HTML file referencing two external JavaScript files, and both of them have a variable and a function defined that use the same name:

You can see this example [running live on GitHub](https://mdn.github.io/learning-area/javascript/building-blocks/functions/conflict.html) (see also the [source code](https://github.com/mdn/learning-area/tree/main/javascript/building-blocks/functions)). Load it in a separate browser tab before reading the explanation below.

- When the example renders in a browser, you will first see an alert box displaying `Hello Chris: welcome to our company.`, meaning that the `greeting()` function defined inside the first script file has been called by the `greeting()` call inside the internal script.

- The second script, however, does not load and run at all, and an error is printed in the console: `Uncaught SyntaxError: Identifier 'name' has already been declared`. This is because the `name` constant is already declared in `first.js`, and you can't declare the same constant twice in the same scope. Because the second script did not load, the `greeting()` function from `second.js` is not available to call.

- If we were to remove the `const name = "Zaptec";` line from `second.js` and reload the page, both scripts would execute. The alert box would now say `Our company is called Chris.` If a function is _redeclared_, the last declaration in the source order is used. The previous declarations are effectively overwritten.

Locking parts of your code away in functions avoids such problems and is considered a best practice.

It is a bit like a zoo. The lions, zebras, tigers, and penguins are kept in their own enclosures and only have access to the things inside, similar to function scopes. If they were able to get into other enclosures, problems would occur. At best, different animals would feel really uncomfortable inside unfamiliar habitats — a lion or tiger would feel terrible inside the penguins' watery, icy domain. At worst, the lions and tigers might try to eat the penguins!

![Four different animals enclosed in their respective habitat in a Zoo](mdn-mozilla-zoo.png)

The zoo keeper is like the global scope — they have the keys to access every enclosure, restock food, tend to sick animals, etc.

### Playing with scope

Let's look at a real example to demonstrate scoping.

1. First, make a local copy of our [function-scope.html](https://github.com/mdn/learning-area/blob/main/javascript/building-blocks/functions/function-scope.html) example. This contains two functions called `a()` and `b()`, and three variables — `x`, `y`, and `z` — two of which are defined inside the functions, and one in the global scope. It also contains a third function called `output()`, which takes a single argument and outputs it to a paragraph on the page.
2. Open the example up in a browser and in your text editor.
3. Open the JavaScript console in your browser developer tools. In the JavaScript console, enter the following command:

   You should see the value of variable `x` printed to the browser viewport.

4. Now try entering the following in your console

   Both of these should throw an error into the console along the lines of "[ReferenceError: y is not defined](/en-US/docs/Web/JavaScript/Reference/Errors/Not_defined)". Why is that? Because of function scope: `y` and `z` are locked inside the `a()` and `b()` functions, so `output()` can't access them when called from the global scope.

5. However, what about when it's called from inside another function? Try editing `a()` and `b()` so they look like this:

   Save the code and reload it in your browser, then try calling the `a()` and `b()` functions from the JavaScript console:

   You should see the `y` and `z` values printed in the browser viewport. This works fine because the `output()` function is called inside the other functions, in the same scope as the variables it prints are defined in. `output()` itself is available from anywhere, as it is defined in the global scope.

6. Now try updating your code like this:

7. Save and reload again, and try this again in your JavaScript console:

   Both the `a()` and `b()` calls should print the value of x to the browser viewport. These work fine because, even though the `output()` calls are not in the same scope as `x` is defined in, `x` is a global variable — it is available inside all code, everywhere.

8. Finally, try updating your code like this:

9. Save and reload again, and try this again in your JavaScript console:

   This time the `a()` and `b()` calls will throw that annoying [ReferenceError: _variable name_ is not defined](/en-US/docs/Web/JavaScript/Reference/Errors/Not_defined) error into the console — this is because the `output()` calls and the variables they are trying to print are not in the same function scopes — the variables are effectively invisible to those function calls.

> [!NOTE]
> The [ReferenceError: "x" is not defined](/en-US/docs/Web/JavaScript/Reference/Errors/Not_defined) error is one of the most common you'll encounter. If you get this error and you are sure that you have defined the variable in question, check what scope it is in.

#### An aside on loop and conditional scope

It is worth noting that the scope of values declared inside [conditionals](/en-US/docs/Learn_web_development/Core/Scripting/Conditionals) and [loops](/en-US/docs/Learn_web_development/Core/Scripting/Loops) works the same as function scope when declaring values with `let` and `const`. For example, if you added the following blocks to the above example:

Calling `output(c)`, `output(d)`, `output(e)`, or `output(f)` would result in the same **"ReferenceError: [variable-name] is not defined"** error seen earlier. The `output()` function cannot access these variables because they are locked inside their own scope.

The legacy `var` keyword works differently. If `c`, `d`, `e`, and `f` were declared using `var`:

They would be hoisted to the global scope; therefore, outputting them to the console (for example, with `output(c)`) would work. Variables declared with `var` inside functions, however, still have their scope limited to those functions.

This inconsistency can cause confusion and errors and is another reason why `let` and `const` should be used instead of `var`.

## Summary

This article has explored the fundamental concepts behind functions, paving the way for the next one, in which we get practical and take you through the steps to build your own custom function.

## See also

- [Functions detailed guide](/en-US/docs/Web/JavaScript/Guide/Functions) — covers some advanced features not included here.
- [Functions reference](/en-US/docs/Web/JavaScript/Reference/Functions)
- [Using functions to write less code](https://scrimba.com/the-frontend-developer-career-path-c0j/~04g?via=mdn), Scrimba [_MDN learning partner_](/en-US/docs/MDN/Writing_guidelines/Learning_content#partner_links_and_embeds) - An interactive lesson providing a useful functions introduction.
