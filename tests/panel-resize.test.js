const baseUrl = process.env.E2E_BASE_URL ?? (process.env.NODE_ENV === 'production'
  ? 'http://localhost:3000/dist/' : 'http://localhost:4000/');

test('changing a panel width keeps its existing resize observation', async () => {
  const tab = await browser.newPage();
  try {
    await tab.setViewport({width: 1200, height: 800});
    await tab.goto(baseUrl + '#src=cube(10);');
    const grip = await tab.waitForSelector('[role="separator"][aria-label="Resize editor"]');
    const initial = await grip.evaluate(el => {
      const panel = el.parentElement;
      const observe = ResizeObserver.prototype.observe;
      ResizeObserver.prototype.observe = function (target, ...options) {
        if (target === panel) panel.dataset.reobserved = 'true';
        return observe.call(this, target, ...options);
      };
      return el.getAttribute('aria-valuenow');
    });
    await grip.focus();
    await tab.keyboard.press('ArrowRight');
    await tab.waitForFunction((el, value) => el.getAttribute('aria-valuenow') !== value, {}, grip, initial);
    expect(await grip.evaluate(el => el.parentElement.dataset.reobserved)).toBeUndefined();
  } finally {
    await tab.close();
  }
}, 45000);

test('each visible panel combination restores its own widths', async () => {
  const context = await browser.createBrowserContext();
  const tab = await context.newPage();
  try {
    await tab.setViewport({width: 1200, height: 800});
    await tab.goto(baseUrl + '#src=' + encodeURIComponent('size = 10;\ncube(size);'));
    const editor = '[aria-label="Resize editor"]';
    const customizer = '[aria-label="Resize customizer"]';
    await tab.waitForSelector(editor);
    await tab.evaluate(() => {
      const prefix = 'openscad-playground.panel-widths.v1.';
      localStorage.setItem(prefix + 'editor-viewer', '[40,60]');
      localStorage.setItem(prefix + 'editor-viewer-customizer', '[20,50,30]');
    });
    await tab.reload();
    const expectWidth = (selector, width) => tab.waitForFunction((s, w) =>
      document.querySelector(s)?.getAttribute('aria-valuenow') === String(w), {}, selector, width);
    const toggleCustomizer = async () => {
      const button = await tab.waitForSelector('text/Customize');
      await button.click();
    };
    await expectWidth(editor, 40);
    await tab.focus(editor);
    await tab.keyboard.press('ArrowRight');
    await expectWidth(editor, 42);
    await toggleCustomizer();
    await expectWidth(editor, 20);
    await expectWidth(customizer, 30);
    const corner = await tab.$eval(customizer, el => {
      const r = el.parentElement.getBoundingClientRect();
      return {x: r.left + 4, y: r.bottom - 4};
    });
    await tab.mouse.move(corner.x, corner.y);
    await tab.mouse.down();
    await tab.mouse.move(corner.x - 24, corner.y, {steps: 4});
    await tab.mouse.up();
    await expectWidth(customizer, 32);
    await toggleCustomizer();
    await expectWidth(editor, 42);
    await tab.reload();
    await expectWidth(editor, 42);
    await toggleCustomizer();
    await expectWidth(customizer, 32);
  } finally {
    await context.close();
  }
}, 60000);
