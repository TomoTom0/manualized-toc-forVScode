# manualized-toc

## Install

You can install this extension with `manualized-toc-X.X.X.vsix` by selecting `EXtension: install from VSIX` in Command Pallet (Ctrl+Shift+P).

## feature

This extension adds TOC into the sidebar whose contents are made from the file content.

- for program languages: `comment symbol + # + Header` (the number of `#` means the intent of the header)
    - c, cpp, js: `// #`
    - python: `##`
    - you can add spaces or tabs before/after comment symbol.
- for markdown: `^# + Header` (the number of `#` means the intent of the header)

You can move by clicking the content in TOC.# manualized-toc-forVScode
