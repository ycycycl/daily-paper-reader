const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadDocsifyPlugin() {
  const noop = () => {};
  const fakeClassList = {
    add: noop,
    remove: noop,
    contains: () => false,
  };
  const fakeElement = {
    addEventListener: noop,
    removeEventListener: noop,
    classList: fakeClassList,
    dataset: {},
    style: {},
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  const document = {
    documentElement: { clientWidth: 1280, classList: fakeClassList },
    body: fakeElement,
    head: { appendChild: noop },
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: () => Object.assign({}, fakeElement),
    addEventListener: noop,
    dispatchEvent: noop,
  };
  const context = {
    window: {
      marked: null,
      location: {
        href: 'http://localhost/#/',
        origin: 'http://localhost',
      },
      innerWidth: 1280,
      localStorage: null,
      addEventListener: noop,
    },
    document,
    console,
    URL,
    CustomEvent: function CustomEvent() {},
    setTimeout,
    clearTimeout,
  };
  context.window.document = document;
  context.global = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('app/docsify-plugin.js', 'utf8'), context);

  const hooks = {
    beforeEach(fn) {
      this.beforeEachFn = fn;
    },
    doneEach() {},
  };
  context.window.$docsify.plugins[0](hooks, {
    route: {
      file: '202605/19/2605.17682v1-gem.md',
      path: '/202605/19/2605.17682v1-gem',
    },
  });
  return hooks.beforeEachFn;
}

function testProtectsLatexBeforeMarkdownParsing() {
  const beforeEach = loadDocsifyPlugin();
  const markdown = `---
title: Test
---

\\[
G(u)=\\exp\\left(-\\frac{1}{2}(u-\\mu_{4D})^\\top \\Sigma^{-1}_{4D}(u-\\mu_{4D})\\right)
\\]

Inline \\(\\Sigma_{s|t}\\) should also survive markdown parsing.
`;
  const output = beforeEach(markdown);

  assert.match(
    output,
    /<div class="dpr-latex-block">\$\$\nG\(u\)=\\exp\\left/,
  );
  assert.ok(output.includes('\\mu_{4D}'));
  assert.ok(output.includes('\\Sigma^{-1}_{4D}'));
  assert.match(
    output,
    /<span class="dpr-latex-inline">\$\\Sigma_\{s\|t\}\$<\/span>/,
  );
}

function testDoesNotProtectLatexInsideCode() {
  const beforeEach = loadDocsifyPlugin();
  const markdown = [
    'Inline code `\\(x_i\\)` should remain code.',
    '',
    '```',
    '\\[',
    'x_i',
    '\\]',
    '```',
  ].join('\n');
  const output = beforeEach(markdown);

  assert.ok(output.includes('`\\(x_i\\)`'));
  assert.ok(output.includes('```\n\\[\nx_i\n\\]\n```'));
  assert.ok(!output.includes('dpr-latex-inline'));
  assert.ok(!output.includes('dpr-latex-block'));
}

testProtectsLatexBeforeMarkdownParsing();
testDoesNotProtectLatexInsideCode();

console.log('docsify latex protection tests passed');
