// Tallyoh — HTMX Utilities

(function() {
  'use strict';

  // Toast notifications
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderToast(message, type);
    const toast = wrapper.firstElementChild;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-exit');
      toast.addEventListener('animationend', () => toast.remove());
    }, 4000);
  }

  function renderToast(message, type) {
    const icons = {
      success: `<div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>`,
      error: `<div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>`,
    };
    return `
      <div class="toast-enter pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm max-w-sm bg-white border-surface-200">
        ${icons[type] || icons.success}
        <div class="text-sm font-medium text-surface-800">${escapeHtml(message)}</div>
      </div>
    `;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Listen for HX-Trigger headers to show toasts
  document.body.addEventListener('htmx:afterRequest', function(evt) {
    const trigger = evt.detail.xhr.getResponseHeader('HX-Trigger');
    if (trigger) {
      try {
        const data = JSON.parse(trigger);
        if (data.showToast) {
          showToast(data.showToast.message, data.showToast.type || 'info');
        }
      } catch (e) {
        // Not JSON, ignore
      }
    }

    // Handle redirect headers from HTMX
    const redirect = evt.detail.xhr.getResponseHeader('HX-Redirect');
    if (redirect) {
      window.location.href = redirect;
    }
  });

  // Handle 401 by redirecting to login
  document.body.addEventListener('htmx:responseError', function(evt) {
    if (evt.detail.xhr.status === 401) {
      const redirect = evt.detail.xhr.getResponseHeader('HX-Redirect');
      if (redirect) {
        window.location.href = redirect;
      } else {
        window.location.href = '/login';
      }
    }
  });

  // Privacy mode toggle
  window.togglePrivacy = function() {
    const body = document.getElementById('body-root');
    const current = body.getAttribute('data-privacy') === 'true';
    body.setAttribute('data-privacy', String(!current));
    localStorage.setItem('pl-privacy', String(!current));
  };

  // Restore privacy mode on load
  const savedPrivacy = localStorage.getItem('pl-privacy');
  if (savedPrivacy === 'true') {
    document.getElementById('body-root')?.setAttribute('data-privacy', 'true');
  }

  // Expose showToast globally
  window.showToast = showToast;
})();
