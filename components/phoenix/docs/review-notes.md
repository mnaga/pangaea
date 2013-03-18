# Common Review Items

- Rule number one: how can it be minimized.
  - CSS selector performance
  - Total code size
  - Duplicated code (both on wire and in files)
    - Can it be parameterized
  - Empty statements
  - Unnecessary elements (wrapper el in template AND view constructor)

- Can not use `url()` directly for images. Need to use `image-background()` to handle 2x images properly. In
    general should use the image mixins where possible.

- `display-flex-box` is powerful but deserves review scrutiny
  - Spec changed
  - Doesn't always do what is expected

- span + display block = div
  - Related: What properties are forcing the use of overrides?

- All ajax calls: Ask what the loading behavior should be.

- Is try/catch tracking needed on event loop entry points
  - `_.defer`, _.delay, `_.debounce`
  - setTimeout, setInterval
  - Non thorax-bound DOM events

- How is the coupling between components?
  - Is a particular component focused on the minimal set of features?
  - Are components not mucking with other components in the system.
    - Exception for going downward. A child component you own, but still keep interface to bare minimum.
  - Global events should only be used when absolutely need decoupling across modules.

- Lookup by index (particularly for DOM) is a maintenance concern.

- Does the code (and inlined comments) stand for itself?
  - Is there anything that doesn't make sense with your current knowledge of the system?

- nits: Does it follow the style guidelines?

- Are you cleaning up more than you created?
  - I.e. `model.off()` when others may have events on the model.
