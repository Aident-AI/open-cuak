export function drawInteractableBoundingBoxes() {
  function getIdentifier(element) {
    const tagName = element.tagName.toLowerCase();
    const text = (element.innerText || '').trim();
    return text ? text : tagName;
  }

  const allElements = Array.from(document.querySelectorAll('*'));
  const viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  const viewportHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

  const interactableElements = allElements
    .map((element) => {
      const rects = Array.from(element.getClientRects());

      const visibleRects = rects
        .map((boundingBox) => {
          const clamped = {
            left: Math.max(0, boundingBox.left),
            top: Math.max(0, boundingBox.top),
            right: Math.min(viewportWidth, boundingBox.right),
            bottom: Math.min(viewportHeight, boundingBox.bottom),
          };
          clamped.width = clamped.right - clamped.left;
          clamped.height = clamped.bottom - clamped.top;
          return clamped;
        })
        .filter((rect) => {
          if (rect.width <= 0 || rect.height <= 0) return false;

          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const elAtCenter = document.elementFromPoint(centerX, centerY);
          return elAtCenter === element || element.contains(elAtCenter);
        });

      const totalArea = visibleRects.reduce((sum, r) => sum + r.width * r.height, 0);

      const tagName = element.tagName;
      const isInteractable =
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT' ||
        tagName === 'BUTTON' ||
        tagName === 'A' ||
        element.onclick != null ||
        window.getComputedStyle(element).cursor === 'pointer' ||
        tagName === 'IFRAME' ||
        tagName === 'VIDEO';

      return {
        element,
        visibleRects,
        totalArea,
        isInteractable,
      };
    })
    .filter((item) => item.isInteractable && item.totalArea >= 16);

  // Only keep innermost interactable elements
  const uniqueElements = interactableElements.filter(
    (outer) => !interactableElements.some((inner) => outer !== inner && outer.element.contains(inner.element)),
  );

  /** @type {import('./types').BoundingBoxInfo[]} */
  const boundingBoxesInfo = [];

  let labelCounter = 1;

  uniqueElements.forEach((item) => {
    const identifier = getIdentifier(item.element);

    item.visibleRects.forEach((rect) => {
      // Calculate center in viewport coordinates
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Draw bounding box overlay
      const boxElement = document.createElement('div');
      boxElement.className = 'aident-bounding-box';
      boxElement.style.outline = '2px dashed black';
      boxElement.style.position = 'fixed';
      boxElement.style.left = rect.left + 'px';
      boxElement.style.top = rect.top + 'px';
      boxElement.style.width = rect.width + 'px';
      boxElement.style.height = rect.height + 'px';
      boxElement.style.pointerEvents = 'none';
      boxElement.style.boxSizing = 'border-box';
      boxElement.style.zIndex = '999999999';
      document.body.appendChild(boxElement);

      // Assign a number id to each box
      const labelElement = document.createElement('div');
      labelElement.className = 'aident-bounding-box';
      labelElement.textContent = String(labelCounter++);
      labelElement.style.position = 'fixed';
      labelElement.style.zIndex = '999999999';
      labelElement.style.backgroundColor = 'black';
      labelElement.style.color = 'white';
      labelElement.style.fontSize = '10px';
      labelElement.style.fontFamily = 'sans-serif';
      labelElement.style.padding = '2px';
      labelElement.style.borderRadius = '2px';
      labelElement.style.pointerEvents = 'none';
      labelElement.style.left = rect.left + 'px';
      labelElement.style.top = rect.top + 'px';
      labelElement.style.transform = 'translate(-70%, -70%)';
      document.body.appendChild(labelElement);

      boundingBoxesInfo.push({
        labelCounter,
        identifier,
        x: Math.round(centerX),
        y: Math.round(centerY),
      });
    });
  });

  return boundingBoxesInfo;
}
