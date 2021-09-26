# PDF Tools

A set of tools for really basic highlighting and reading PDFs because every tool I tried to use couldn't just act like an handful of highlighters

## Notes to Self.

This is an electron app that `electron-webpack` to handle most of the magic, including ReactJSX ect. ect.

## How to run:

run `npm run dev` in a terminal.

## current tasklist:

- [x] file browser
  - [x] live file updates
  - [ ] finder interoperability
- [x] new window opens to view pdf
- [x] pdf viewer / renderer
- text selection, highlighting, underlining, comments
  - [x] live preview
  - [x] interactive highlighting
  - [x] render highlights and annotations
  - [ ] saving new annotations back to pdf
    - BUG! Need to implement my own save functionality, rather than using annotpdf. There's some sort of issue with quadpoint placement and compression.
- [ ] tool selection
- outline

  - [x] outline view
  - [x] fast-browse
  - [ ] live update on scroll
  - [ ] outline editing

- tests

  - [x] lol, just kidding.

- build process
- OS iteroperability
