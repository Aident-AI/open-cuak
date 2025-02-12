export function addCross(x, y) {
  crossCanvas = document.createElement('canvas');
  crossCanvas.className = 'aident-cross';
  crossCanvas.width = window.innerWidth;
  crossCanvas.height = window.innerHeight;
  crossCanvas.style.position = 'fixed';
  crossCanvas.style.top = 0;
  crossCanvas.style.left = 0;
  crossCanvas.style.zIndex = '9999';
  document.body.appendChild(crossCanvas);

  const ctx = crossCanvas.getContext('2d');
  ctx.lineWidth = 2;

  // Draw the vertical line
  let isBlack = true;
  const step = 100;

  // From mouse position downward
  for (let startY = y; startY < crossCanvas.height; startY += step) {
    const endY = startY + step;
    ctx.beginPath();
    ctx.strokeStyle = isBlack ? 'black' : 'red';
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
    ctx.stroke();
    isBlack = !isBlack;
  }

  // From mouse position upward
  isBlack = false;
  for (let startY = y; startY >= 0; startY -= step) {
    const endY = startY - step;
    ctx.beginPath();
    ctx.strokeStyle = isBlack ? 'black' : 'red';
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
    ctx.stroke();
    isBlack = !isBlack;
  }

  // Draw the horizontal line
  isBlack = true;

  // From mouse position rightward
  for (let startX = x; startX < crossCanvas.width; startX += step) {
    const endX = startX + step;
    ctx.beginPath();
    ctx.strokeStyle = isBlack ? 'black' : 'red';
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();
    isBlack = !isBlack;
  }

  // From mouse position leftward
  isBlack = false;
  for (let startX = x; startX >= 0; startX -= step) {
    const endX = startX - step;
    ctx.beginPath();
    ctx.strokeStyle = isBlack ? 'black' : 'red';
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();
    isBlack = !isBlack;
  }
}
