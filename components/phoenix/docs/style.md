# Coding Conventions

## JavaScript

### Language

#### Semicolon

  - Always end statements with `;`

#### Variable declarations

  - Declare on first use, not at top of function
  - Give descriptive names
    - Do not use similar names or synonyms for different variables unless following a convention
    - `for...in` iterators should use descriptive names
    - Use combination of plural for array and singular for each item in the array
  - Use camelCase, never underscores
  - Avoid using numbered variables (e.g. i1, i2, i3)
  - Prefer objects with named keys over arrays for structured data
  - Classes named with leading capital. Instances/fields lowercase first letter. Constants ALL_CAPS.

  - Prefer module local vars over publicly accessible var where possible.
    - Ex: `var CarouselView vs. Phoenix.Views.CarouselView`
  - Make module local vars distinct to prevent name conflicts with other module local vars.

#### Blocks

  - No implicit or single statement blocks
  - All blocks must be wrapped in `{}`
  ```javascript
  if (condition) {
    return;
  }
  ```

#### For loops

  - Iterator variable should be declared inside the `for` parentheses, unless already defined
  - Use `_.each` or `for` with arrays, `_.each` for objects

#### Prototype members

  - Prefix private members with `_`
  ```javascript
  Example.prototype.method = function() {
    this.public = 'external';
    this._private = 'internal';
  };
  ```

  - Define `self` for passing `this` into nested functions
  ```javascript
  Example.prototype.method = function() {
    var self = this;

    call(123, function(err) {
      self.display(err);
    });
  };
  ```

#### Function declaration

  - Declare functions via statement when possible
  ``` javascript
  function method() {

  }

  var method = _.bind(function() {}, this);
  ```

### Style

#### Whitespace

  - Always spaces, never tabs
  - 2 spaces indents
  - No trailing whitespace at end-of-line
  - Blank line at the end of files (Sublime Text can do this for you)

  ```javascript
  if (test) {
    if (value === 12) {
      console.log('result');
    }
  }
  ```

#### String literals

  - Always `'` never `"`
  ```javascript
  var string = 'text in single quotes';
  ```

#### Newlines

  - Newline after `{` except for inlined or empty objects
    - Inline an object when it improves readability and unlikely to change often
    - No inline object in assignment unless empty

  ```javascript
  if (condition) {
    execute(value, { strict: true });
  }

  if (condition) {
    var options = {
      strict: true
    };
    execute(value, options);
  }

  var empty = {};
  ```

  - Newline after `}`
    - Exception when followed by `,`, `;`, `);`, `else`, `catch` which must be followed by a newline
    - Empty line after `}` if not last statement in scope

  ```javascript
  if (condition) {
    value = {
      func: function() {
        console.log('example');
      },
      message: 'hello'
    };

    execute(value, function(err) {
      console.log(err);
    });
  } else {
    console.log('otherwise');
  }
  ```

  - No empty line before end of scope
  ```javascript
  if (condition) {
    if (otherCondition) {
      console.log('done');
    }
  }
  ```

#### Spaces

  - Use one and only one space (when required)
  ```javascript
  var value = calculate(1, 3);
  ```

  - No space between function name and `(`
  ```javascript
  function example() {
    return value;
  }

  var key = example();
  ```

  - No space after `(` or before `)`
   ```javascript
  execute('order', 34);

  if (result === 'ok') {
    console.log('success');
  }
  ```

  - No space before object key `:`, always after object key `:`
  ```javascript
  var obj = {
      a: 1,
      b: 2,
      c: 3
  };
  ```

  - No space before `;`, always after `;` if not end-of-line
  ```javascript
  var name = 'john';

  for (var i = 0, len = name.length; i < len; ++i) {
    console.log(name[i]);
  }
  ```

  - Always space after reserved keywords (`if`, `else`, `for`, `return`, etc.)
  ```javascript
  for (var book in books) {
    if (books.hasOwnProperty(book)) {
      console.log(book.name);
    }
  }

  ```

  - Always space after `//`
  ```javascript
  // Some comment
  ```

  - No space before `,`, always after `,` unless end-of-line
  ```javascript
  var numbers = [1, 2, 3];
  var user = { name: 'john', email: 'john@example.com' };

  for (var i = 0, len = name.length; i < len; ++i) {
    console.log(name[i]);
  }
  ```

  - Always space before and after operators, unless following ident or end-of-line

  ```javascript
  var a = 1 + 3,
      b = 'john'
        + ' '
        + 'doe';
  ```

#### Operators

  - Chained operators over multiple lines should indent twice and have the operator starting the new line.
  ```javascript
  var message = 'Hello '
      + 'Steve, '
      + 'How are you?';

  if (value === 'hello'
      && result === 'ok') {

      console.log('yes');
  }
  ```

#### Commas

  - Never begin a line with `,` (always at the end of the previous line)
  ```javascript
  // Right
  execute('some error message',
          12345,
          this);

  // Wrong
  execute('some error message'
          ,12345
          ,this);
  ```

  - When possible prefer chaining var declarations when defined consecutively. Each var should be
    indented twice, and any new lines in the declaration statement should be indented relative to
    the var name. Exception is non-inlined object literals should be defined on a distinct var
    statement.

  ```javascript
  var a = 1,
      b = 'foo'
        + 'bar';

  var c = {
    bar: 1,
    baz: 2
  };
  ```

#### Comments

  - Always use `//` unless it's a jsDoc declaration or license header
  - Always begin sentences with an upper case
  - No trailing `.` unless comment contains multiple sentences
  - Formal style, consistent voice, no humor, present tense
  - No developer name or other personal notes
  - No TODOs. Further action items should be fixed prior to merge or listed in JIRA.

  - Provides narrative for a section of code. May be a summary of a particular section,
    highlight known limitations of the design, or explain issues seen in developing the code
    that led to those choices.

  - Should explain the why of the code not the what unless the what covers multiple lines that
    may not be immediately apparent.
  - Should protect the code from any attempts at optimizations in the future that might miss
    particular nuances of the code that required a particular implementation.

  ```javascript
  function execute() {
    // Initialize state
    var position = 0;

    // WARN: This fails if llorum ipsum but works if bacon ipsum.
    if (condition) {
      return 'hello';
    }
  }
  ```

#### Multi-line statements

  - Statements should only be broken into multiple lines to improve readability
  - Break statements if they are longer than ~100 characters long
  - No empty lines in the middle of a single statement
  - Indent multi-line statements

  - Conditions should be indented to the first character of the condition in the first line

  ```javascript
  if (result
      && result.status
      && result.status.code === 200) {
    console.log('success');
  }
  ```

  - Variable should be indented to the first character of the value in the first line
  ```javascript
  var message = "hello" +
                " and welcome";
  ```

### Unit testing

  - Unit tests should be written for
    - Core components that are intended for reuse. Ex: Carousel View.
    - Background behavior whose failure might not be immediately visible. Ex: Analytics
    - Timing-based behaviors. Ex: Loading indicators
    - Non-trivial data handlers. Ex: price helper

  Less concerned about "does this div exist" than "does this behavior happen" although the two can
  be one and the same in the actual testing.

  All data for unit tests should come from mocks or files that are internal to the build. They should
  execute without failures even if there is not external network avaliable.

## Stylus

  - Do not use `;`, `:`, `{` or `}` except where necessary (i.e. interpolation)
  - Mixin, function, and class names use hyphens
  - Variable names are prefixed with `$` and camel cased.


  - Insert new lines when increasing indent
  ```css
    .votd
      text-align center

      > h1
        margin 0
        padding 0 0 ($contentPadding / 2) $contentPadding
  ```
  - Blank line after a rule definition.
    Exception is 1 property nested rules that are conceptually similar, i.e. `> .next` and `> .prev`
  - `&` should be used for associated rules and states.
  ```css
    .button
      background red
      padding $contentPadding

      &.active
        background orange
      &:last-child
        padding-bottom 0
  ```

  - Use `>` combinator when possible
  - Avoid tag selectors unless combined with `>`
  - `*` should be avoided entirely
  - `!important` should be avoided unless in a very specific selector and increasing the specificity
    makes the selector less efficient or harder to maintain
  - Do not use `tag.class` selectors unless overriding a specific field the class for that element type.

  - Favor specific class names over deep nesting.
    Generally nesting of more than 3 or 4 levels should be avoided.
    ```css
      // Right
      .root-entry
        > a
          color red

      // Wrong
      .root-class
        > div
          > ul
            > .root-entry
              > a
                color red
    ```

  - Use of the `url()` function must be paired with `background-size`. Preferred use is through
    image mixins such as `image-background`
  - Comment per javascript rules

## Handlebars/HTML

  - When possible logic should be in the views
  - All comments should be handlebars comments, not html `{{! comment}}`
  - Prefer handlebars templates over inlined html in javascript
  - View templates should use thorax-created element rather than a single root element in template (when possible)

## General

  - File and folder names should be specified with hyphens.
  - 3rd party libraries must be pulled in via mixins or placed in lib directories with proper
    licence and attribution information.
