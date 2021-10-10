# PDF Tools

A set of tools for really basic highlighting and reading PDFs because every tool I tried to use couldn't just act like an handful of highlighters

## Notes to Self.

This is an electron app that `electron-webpack` to handle most of the magic, including ReactJSX ect. ect.

## How to run:

run `npm run dev` in a terminal.

## current tasklist:

### file browser

- [x] live file updates
- [x] new window opens to view pdf

### pdf viewer / renderer

- [x] render pdf, dynamic cache of pages not on screen

### outline

- BACKEND
  - [x] read
  - [x] write
  - [ ] OPTIMIZATION merge rather than overwrite
- UI
  - [x] outline view
  - [x] fast-browse
  - [ ] live update current on scroll
  - [ ] outline editing

### highlighting and annotations

- BACKEND
  - [x] backend annotation writer
  - [ ] backend annotation deleter
  - [ ] backend annotation merger?
- UI
  - [x] selection detection
  - [x] tool picker
  - [ ] deletion detection / options popup
  - [ ] comments

### PDF metadata / special features.

- restore zoom, current page, ect.
- global notes for pdf (ie, homework assignment dates, high-level notes)

### tests

- [x] lol, just kidding. manual integration testing 4lyfe

### build process

- [ ] build to a package
- [ ] OS iteroperability (windows, linux??)

### features

- [ ] read config from file
  - [x] tool list
  - [ ] view defaults
- [ ] bluebook my current highlight.
- [ ] docx reader? html reader?
- [ ] finder integration?
- [ ] OS hooks?
