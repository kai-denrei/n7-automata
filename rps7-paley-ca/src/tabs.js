// tabs.js — minimal tab bar. Buttons carry data-tab="<view-id>"; clicking one
// shows that .view and hides the others. Switching to a canvas-backed view
// dispatches a resize so the now-visible canvas (which had 0 size while hidden)
// re-fits itself. Pattern borrowed from oskar-procedure.

const CANVAS_VIEWS = new Set(['view-organic']);

export function initTabs() {
  const tabButtons = document.querySelectorAll('[role="tab"]');
  const views = document.querySelectorAll('.view');

  function activate(tabId) {
    tabButtons.forEach((btn) => {
      const on = btn.dataset.tab === tabId;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', String(on));
    });
    views.forEach((v) => {
      if (v.id === tabId) v.removeAttribute('hidden');
      else v.setAttribute('hidden', '');
    });
    if (CANVAS_VIEWS.has(tabId)) {
      // let layout settle, then tell the canvas view to re-measure
      requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    }
  }

  tabButtons.forEach((btn) =>
    btn.addEventListener('click', () => activate(btn.dataset.tab))
  );

  const start = (location.hash === '#hex') ? 'view-hex' : 'view-organic';
  activate(start);
}

initTabs();
