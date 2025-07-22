let isPatched = false;

export function patchHistoryForUrlChange() {
  if (isPatched) {
    return;
  }
  isPatched = true;

  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  const dispatchUrlChange = () => {
    window.dispatchEvent(new Event('urlchange'));
  };

  history.pushState = function (...args) {
    const result = originalPushState.apply(this, args);
    dispatchUrlChange();
    return result;
  };

  history.replaceState = function (...args) {
    const result = originalReplaceState.apply(this, args);
    dispatchUrlChange();
    return result;
  };

  window.addEventListener('popstate', dispatchUrlChange);
}
