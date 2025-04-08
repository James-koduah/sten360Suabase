export const disableNumberInputScroll = () => {
  // Function to disable scroll on a single input
  const disableScroll = (input: Element) => {
    if (input instanceof HTMLInputElement && input.type === 'number') {
      input.addEventListener('wheel', (e) => {
        e.preventDefault();
      }, { passive: false });
    }
  };

  // Disable scroll on existing number inputs
  document.querySelectorAll('input[type="number"]').forEach(disableScroll);

  // Set up MutationObserver to handle dynamically added inputs
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) {
          // Check the added node itself
          if (node.tagName === 'INPUT' && (node as HTMLInputElement).type === 'number') {
            disableScroll(node);
          }
          // Check all descendants
          node.querySelectorAll('input[type="number"]').forEach(disableScroll);
        }
      });
    });
  });

  // Start observing the document with the configured parameters
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Return cleanup function
  return () => observer.disconnect();
};

// Call this function when the app initializes
disableNumberInputScroll();