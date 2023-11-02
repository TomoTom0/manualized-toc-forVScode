# manualized-toc

## Install

You can install this extension with `manualized-toc-X.X.X.vsix` in `Extension: install from VSIX` at Command Pallet (Ctrl+Shift+P).

## feature

This extension adds TOC into the sidebar whose contents are made from the file content.

- TOC with Comment Symbols (for program languages): `comment symbol + # + Header` (the number of `#` means the intent of the header)
    - c, cpp, js: `// #`
    - python: `# #`
    - php: `# #` or `// #`
    - you can add spaces or tabs before/after comment symbol.
- TOC with Header Symbols: (for markdown): `^# + Header` (the number of `#` means the intent of the header)

You can move by clicking the content in TOC such like Jupyter TOC extension.

## Update

Now you can edit config about comment out / header symbols per language! (added in v1.0.0 on 2023-11-03)

You can check languageId to specify the file types on https://code.visualstudio.com/docs/languages/identifiers#_known-language-identifiers .
