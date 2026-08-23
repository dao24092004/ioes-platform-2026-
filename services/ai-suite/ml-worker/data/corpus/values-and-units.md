---
title: CSS values and units
doc_id: values-and-units
source_url: https://developer.mozilla.org/en-US/docs/learn-web-development/core/styling-basics/values-and-units
license: CC BY-SA 2.5 (MDN Web Docs)
---

CSS rules contain [declarations](/en-US/docs/Web/CSS/Guides/Syntax/Introduction#css_declarations), which in turn are composed of properties and values.
Each property used in CSS has a **value type** that describes what kind of values it is allowed to have.
In this lesson, we will take a look at some of the most frequently used value types, what they are, and how they work.

> [!NOTE]
> Each [CSS property page](/en-US/docs/Web/CSS/Reference#index) has a syntax section that lists the value types you can use with that property.

      Prerequisites:

        HTML basics (study
        Basic HTML syntax), CSS basic syntax, CSS selectors.

      Learning outcomes:

          Understand that property values can take many different types, and what these types represent.
          Familiarity with using the fundamental types: Numbers, lengths, percentages, colors, images, positions, strings and identifiers, and functions.
          Understand what absolute and relative units are, and the difference between them.

## What is a CSS value?

CSS values define what types of value are valid for each CSS property. For example, you can specify colors for the values of color or border-color, but not lengths or percentages.

In CSS specifications, and on the property pages here on MDN, you will be able to spot value types as they will be surrounded by angle brackets (`<`, `>`) — such as &lt;color&gt; or length. When you see the value type `` as valid for a particular property, that means you can use any valid color as a value for that property, as listed on the &lt;color&gt; reference page.

Sometimes value types and properties can have the same, or similar names — For example, there is a color property and a &lt;color&gt; data type. You can use the angle brackets to determine which one you are studying in each case. HTML elements also use angle brackets, but it should be clear from the context which one you are looking at. If you are not sure, try searching for it on MDN.

> [!NOTE]
> You'll see CSS value types referred to as _data types_. The terms are basically interchangeable — when you see something in CSS referred to as a data type, it is really just a fancy way of saying value type. The term _value_ refers to any particular expression supported by a value type that you choose to use.

In the following example, we have set the text color of our heading using a color keyword, and the background using a different type of color value — the `rgb()` function:

A value type in CSS defines a collection of allowable values. This means that if you see `` as valid you don't need to wonder which of the different types of color value can be used — keywords, hex values, `rgb()` functions, etc. You can use _any_ available `` values, assuming they are supported by your browser. The page on MDN for each value will give you information about browser support. For example, if you look at the page for &lt;color&gt; you will see that the browser compatibility section lists different types of color values and support for them.

Let's have a look at some of the types of values and units you may frequently encounter, with examples so that you can try out different possible values.

## Numbers, lengths, and percentages

There are various numeric value types that you might find yourself using in CSS. The following are all classed as numeric:

      Data type
      Description

        &#x3C;integer>

        An &#x3C;integer> is a whole number such as
        1024 or -55.

        &#x3C;number>

        A &#x3C;number> represents a decimal number — it may or may
        not have a decimal point with a fractional component. For
        example, 0.255, 128, or -1.2.

        &#x3C;dimension>

        A &#x3C;dimension> is a &#x3C;number> with a
        unit attached to it. For example, 45deg, 5s,
        or 10px. &#x3C;dimension> is an umbrella
        category that includes the length, &#x3C;angle>, &#x3C;time>, and
        &#x3C;resolution>
        types.

      percentage

        A &#x3C;percentage> represents a fraction of some other
        value. For example, 50%. Percentage values are always
        relative to another quantity. For example, an element's length is
        relative to its parent element's length.

### Lengths

The numeric type you will come across most frequently is length. For example, `10px` (pixels) or `30em`. There are two types of lengths used in CSS — relative and absolute. It's important to know the difference in order to understand how big things will become.

#### Absolute length units

The following are all **absolute** length units — they are not relative to anything else, and are generally considered to always be the same size.

| Unit | Name                | Equivalent to            |
| ---- | ------------------- | ------------------------ |
| `cm` | Centimeters         | 1cm = 37.8px = 25.2/64in |
| `mm` | Millimeters         | 1mm = 1/10th of 1cm      |
| `Q`  | Quarter-millimeters | 1Q = 1/40th of 1cm       |
| `in` | Inches              | 1in = 2.54cm = 96px      |
| `pc` | Picas               | 1pc = 1/6th of 1in       |
| `pt` | Points              | 1pt = 1/72nd of 1in      |
| `px` | Pixels              | 1px = 1/96th of 1in      |

Most of these units are more useful when used for print, rather than screen output. For example, we don't typically use `cm` (centimeters) on screen. The only value that you will commonly use is `px` (pixels).

Note that `1px` doesn't necessarily equal one physical device pixel. On HD displays, it may span multiple physical pixels.
Similarly, `1cm` in CSS often doesn't correspond to one hundredth of [SI](https://en.wikipedia.org/wiki/International_System_of_Units) meter. On a large TV screen, it typically is longer than that.
The lengths are perceptual: `16px` looks roughly the same on a phone, laptop, or TV screen at typical viewing distance.

#### Relative length units

Relative length units are relative to something else. For example:

- `em` is relative to the font size of this element, or the font size of the parent element when used for font-size. `rem` is relative to the font size of the root element.
- `vh` and `vw` are relative to the viewport's height and width, respectively.

The benefit of using relative units is that with some careful planning you can make it so the size of text or other elements scales relative to everything else on the page. For a complete list of the relative units available, see the reference page for the length type.

In this section we'll explore some of the most common relative units.

#### Exploring an example

In the example below, you can see how some relative and absolute length units behave. The first box has a width set in pixels. As an absolute unit, this width will remain the same no matter what else changes.

The second box has a width set in `vw` (viewport width) units. This value is relative to the viewport width, and so `10vw` is 10 percent of the width of the viewport. If you change the width of your browser window, the size of the box should change. However this example is embedded into the page using an [``](/en-US/docs/Web/HTML/Reference/Elements/iframe), so this won't work. To see this in action you'll have to [try the example after opening it in its own browser tab](https://mdn.github.io/css-examples/learn/values-units/length.html).

The third box uses `em` units. These are relative to the element's font size. I've set a font size of `1em` on the containing div, which has a class of `.wrapper`. Change this value to `1.5em` and you will see that the font size of all the elements increases, but only the last item will get wider, as its width is relative to that font size.

After following the instructions above, try playing with the values in other ways, to see what you get.

#### ems and rems

`em` and `rem` are the two relative lengths you are likely to encounter most frequently when sizing anything from boxes to text. It's worth understanding how these work, and the differences between them, especially when you start getting on to more complex subjects like [styling text](/en-US/docs/Learn_web_development/Core/Text_styling) or [CSS layout](/en-US/docs/Learn_web_development/Core/CSS_layout). The below example provides a demonstration.

The next example is a set of nested lists — we have two lists in total and both examples have the same HTML. The only difference is that the first has a class of _ems_ and the second a class of _rems_.

To start with, we set `16px` as the font size on the `` element.

To recap, the `em` unit means **"my parent element's font-size"** if used for `font-size`, and **"my own font-size"** when used for anything else. The li elements inside the ul with a `class` of `ems` take their sizing from their parent. So each successive level of nesting gets progressively larger, as each has its font size set to `1.3em` — 1.3 times its parent element's font size.

To recap, the `rem` unit means **"The root element's font-size"** (rem stands for "root em"). The li elements inside the ul with a `class` of `rems` take their sizing from the root element (``). This means that each successive level of nesting does not keep getting larger.

However, if you change the `` element's `font-size` in the CSS you will see that everything else changes relative to it — both `rem`- and `em`-sized text. Try this now in MDN Playground.

### Percentages

In a lot of cases, a percentage is treated in the same way as a length. The thing with percentages is that they are always set relative to some other value. For example, if you set an element's `font-size` as a percentage, it will be a percentage of the `font-size` of the element's parent. If you use a percentage for a `width` value, it will be a percentage of the `width` of the parent.

In the next example, the two pairs of percentage-sized and pixel-sized boxes have the same class names. The boxes inside each pair are `40%` and `200px` wide, respectively.

The difference is that the second set of two boxes is inside a wrapper that is `400px` wide. The second `200px`-wide box is the same width as the first one, but the second `40%` box is now `40%` of `400px` — a lot narrower than the first one!

Try changing the width of the wrapper or the percentage value to see how this works:

The next example has font sizes set in percentages. Each `` has a `font-size` of `80%`; therefore, the nested list items become progressively smaller as they inherit their sizing from their parent.

While many properties accept a length or a percentage as a value, some only accept a length, for example border-width. MDN's property reference pages detail which value types they accept. If the allowed value includes length-percentage, then you can use a length or a percentage. If the allowed value only includes ``, it is not possible to use a percentage.

### Numbers

Some value types accept unitless numbers; an example is the `opacity` property, which controls the opacity of an element (how transparent it is). This property accepts a number between `0` (fully transparent) and `1` (fully opaque).

In the below example, try changing the value of `opacity` to various decimal values between `0` and `1` and see how the box and its contents become more or less opaque:

> [!NOTE]
> When you use a number in CSS as a value it should not be surrounded in quotes.

## Color

Color values can be used in many places in CSS, whether you are specifying the color of text, backgrounds, borders, and lots more.
There are many ways to set color in CSS, allowing you to control plenty of exciting properties.

The standard color system available in modern computers supports 24-bit colors, which allows displaying about 16.7 million distinct colors via a combination of different red, green, and blue channels with 256 different values per channel (256 x 256 x 256 = 16,777,216).

In this section, we'll first look at the most commonly seen ways of specifying colors: using keywords, hexadecimal, and `rgb()` values.
We'll also take a quick look at additional color functions, enabling you to recognize them when you see them or experiment with different ways of applying color.

You will likely decide on a color palette and then use those colors — and your favorite way of specifying color — throughout your project.
You can mix and match color models, but it's usually best if your entire project uses the same method of declaring colors for consistency!

### Color keywords

You will see the color keywords (or "named colors") used in many MDN code examples. Because the named-color data type contains a very finite number of color values, they are not commonly used on production websites with a sophisticated design language. On the other hand, named colors are used in code examples to clearly tell the user what color is expected so the learner can focus on the content being taught.

In the next example, try playing with different color keywords, to get more of an idea how they work. You can look them up using the named-color reference page.

### Hexadecimal RGB values

The next type of color value you are likely to encounter is hexadecimal (hex) codes.

Hexadecimal numbers use 16 characters from `0-9` and `a-f`, so the entire range is `0123456789abcdef`. Each hex color value consists of a hash/pound symbol (`#`) followed by six hexadecimal characters (`#ffc0cb`, for example). Each **pair** of hexadecimal characters represents one of the channels of an RGB color — red, green, and blue — and allows us to specify any of the 256 available values for each (16 x 16 = 256).

These values are less intuitive than keywords for defining colors, but they are a lot more versatile because you can _represent_ any RGB color with them.

In the next example, try changing the values to see how the colors vary:

> [!NOTE]
> You might see hex color values written with three characters instead of six. This is a shorthand that can be used when the characters in each pair are the same. For example, `#ff00ff` and `#f0f` are equivalent. You might also see hex color values written using eight (or four) characters, with the fourth value representing the alpha-transparency of the previous three values — for example `#ff00ff66`.

### RGB values

To create RGB values directly, the color_value/rgb function takes three parameters representing **red**, **green**, and **blue** channel values of the colors, with an optional fourth value separated by a slash (`/`) representing opacity, in much the same way as hex values. The difference with RGB is that each channel is represented not by two hex digits, but by a decimal number ranging from `0` and `255` or a percentage ranging from `0%` and `100%` (but not a mixture of the two).

Let's rewrite our last example to use RGB colors:

#### An RGB example with opacity

In the next example, we have added a background image to the containing block of our colored boxes. We have then set the boxes to have different opacity values — notice how the background shows through more when the alpha channel value is smaller. If you set this value to `0` it will make the color fully transparent, whereas `1` will make it fully opaque. Values in between give you different levels of transparency.

Try changing the alpha channel values to see how it affects the color output.

> [!NOTE]
> Setting an alpha channel on a color has one key difference to using the opacity property we mentioned earlier. When you use `opacity` you make the element and everything inside it transparent, whereas using RGB with an alpha parameter only makes the color you are specifying transparent.

### Using hues to specify a color

If you want to go beyond keywords, hexadecimal, and color_value/rgb for colors, you might want to try using hue.
Hue is the value type that allows us to tell the difference or similarity between colors like red, orange, yellow, green, blue, etc.
The key concept is that you can specify a hue in an angle because most of the color models describe hues using a color wheel.

There are several color functions that include a hue component, including color_value/hsl, color_value/hwb, and color_value/lch. Other color functions, like color_value/lab, define colors based on what humans can see.

If you want to find out more about these functions and color spaces, see the [Applying color to HTML elements using CSS](/en-US/docs/Web/CSS/Guides/Colors/Applying_color) guide, the &lt;color&gt; reference that lists all the different ways you can use colors in CSS, and the [CSS color module](/en-US/docs/Web/CSS/Guides/Colors) that provides an overview of all the color types in CSS and the properties that use color values.

### HWB

A great starting point for using hues in CSS is the color_value/hwb function, which specifies an `srgb()` color.
The three parts are:

- **Hue**: The base shade of the color. This takes a hue value between `0` and `360`, representing the angles around a color wheel.
- **Whiteness**: How white is the color? This takes a value from `0%` (no whiteness) to `100%` (full whiteness).
- **Blackness**: How black is the color? This takes a value from `0%` (no blackness) to `100%` (full blackness).

### HSL

Similar to the color_value/hwb function is the color_value/hsl function, which also specifies an `srgb()` color.
HSL uses `Hue`, in addition to `Saturation` and `Lightness`:

- **Hue**: Again, this represents the base shade of the color.
- **Saturation**: How saturated is the color? This takes a value from `0`–`100%`, where `0` is no color (it will appear as a shade of grey), and `100%` is full color saturation.
- **Lightness**: How light or bright is the color? This takes a value from `0`–`100%`, where `0` is no light (it will appear completely black) and `100%` is full light (it will appear completely white).

The color_value/hsl color value also has an optional fourth value, separated from the color with a slash (`/`), representing the alpha transparency.

Let's update the RGB example to use HSL colors instead:

Just like with `rgb()` you can pass an alpha parameter to `hsl()` to specify opacity:

Before you move on, try modifying the previous two examples to use some hue-based color values. Try varying the hue value in each case to see how this affects the base color, and then try varying the other parameters too.

## Images

The image value type is used wherever an image is a valid value. This can be an actual image file pointed to via a `url()` function, or a gradient.

In the example below, we are using an image and a gradient as values for the CSS `background-image` property.

> [!NOTE]
> There are some other possible values for ``, however these are newer and currently have poor browser support. Check out the page on MDN for the image data type if you want to read about them.

You'll learn about image values in more depth in our [Background and borders](/en-US/docs/Learn_web_development/Core/Styling_basics/Backgrounds_and_borders) article later on.

## Position

The &lt;position&gt; value type represents a set of 2D coordinates, used to position an item such as a background image (via background-position). It can take keywords such as `top`, `left`, `bottom`, `right`, and `center` to align items with specific bounds of a 2D box, and lengths, which represent offsets from the top and left-hand edges of the box.

A typical position value consists of two values — the first sets the position horizontally, the second vertically. If you only specify values for one axis the other will default to `center`.

In the following example we have positioned a background image `60px` from the top and to the `right` of the container using a keyword.

Try playing around with these values to see how you can push the image around.

## Strings and identifiers

Throughout the examples above, we've seen places where keywords are used as a value (for example `` keywords like `red`, `black`, `rebeccapurple`, and `goldenrod`). These keywords are more accurately described as _identifiers_, a special value that CSS understands. As such they are not quoted — they are not treated as strings.

There are places where you use strings in CSS. For example, [when specifying generated content](/en-US/docs/Learn_web_development/Core/Styling_basics/Pseudo_classes_and_elements#generating_content_with_before_and_after). In this case, the value is quoted to demonstrate that it is a string. In the example below, we use unquoted color keywords along with a quoted generated content string.

## Functions

In programming, a function is a piece of code that does a specific task.
Functions are useful because you can write code once then reuse it many times instead of writing the same logic over and over.
Most programming languages not only support functions but also come with convenient built-in functions for common tasks so you don't have to write them yourself from scratch.

CSS also has [functions](/en-US/docs/Web/CSS/Reference/Values/Functions), which work in a similar way to functions in other languages.
In fact, we've already seen CSS functions in the [Color](#color) section above, such as color_value/rgb and color_value/hsl.

Aside from applying colors, you can use functions in CSS to do a lot of other things.
For example, [Transform functions](/en-US/docs/Web/CSS/Reference/Values/Functions#transform_functions) are a common way to move, rotate, and scale elements on a page.
You might see transform-function/translate for moving something horizontally or vertically, transform-function/rotate to rotate something, or transform-function/scale to make something bigger or smaller.

### Math functions

When you are creating styles for a project, you will probably start off with numbers like `300px` for lengths or `200ms` for durations.
If you want to have these values change based on other values, you will need to do some math.
You could calculate the percentage of a value or add a number to another number, then update your CSS with the result.

CSS has support for [Math functions](/en-US/docs/Web/CSS/Reference/Values/Functions#math_functions), which allow us to perform calculations in CSS instead of relying on static values or doing the math in JavaScript.
One of the most common math functions is , which lets you do operations like addition, subtraction, multiplication, and division.

For example, let's say we want to set the width of an element to be `20%` of its parent container plus `100px`.
We can't specify this width with a static value — if the parent uses a percentage width (or a relative unit like `em` or `rem`) then it will vary depending on the context it is used in, and other factors such as the user's device or browser window width.
However, we can use `calc()` to set the width of the element to be `20%` of its parent container plus `100px`.
The `20%` is based on the width of the parent container (`.wrapper`) and if that width changes, the calculation will change too:

There are many other math functions that you can use in CSS, such as , , and ; respectively these let you pick the smallest, largest, or middle value from a set of values. Explore our [CSS value functions](/en-US/docs/Web/CSS/Reference/Values/Functions) reference page to check out all the available CSS functions.

Knowing about CSS functions is useful so you recognize them when you see them. You should start experimenting with them in your projects — they will help you avoid writing custom or repetitive code to achieve results that you can get with regular CSS.

## Summary

This has been a quick run-through of the most common types of values and units you might encounter. You can have a look at all of the different types on the [CSS Values and units](/en-US/docs/Web/CSS/Guides/Values_and_units) module page — you will encounter many of these in use as you work through these lessons.

The key thing to remember is that each property has a defined list of allowed value types, and each value type has a definition explaining what the values are. You can then look up the specifics here on MDN. For example, understanding that image also allows you to create a color gradient is useful but perhaps non-obvious knowledge to have!

In the next article, we'll give you some tests that you can use to check how well you've understood and retained the information we've provided on values and units.
