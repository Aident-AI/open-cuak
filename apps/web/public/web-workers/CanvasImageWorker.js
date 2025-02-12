let currentFrameTs = -1;

self.onmessage = async function (event) {
  if (event.data.type === 'FRAME_PROCESSED') {
    currentFrameTs = event.data.currentFrameTsRef;
    return;
  }
  if (event.data.type !== 'PROCESS_FRAME') return;

  if (!event.data.frame) return;
  const { frame, ts } = event.data;
  if (ts < currentFrameTs) return;

  if (!frame || !frame.data) {
    console.error('Invalid frame data:', frame);
    return;
  }

  try {
    const binary = atob(frame.data);
    const len = binary.length;
    const buffer = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      buffer[i] = binary.charCodeAt(i);
    }

    const blob = new Blob([buffer], { type: 'image/jpeg' });
    const imgBitmap = await createImageBitmap(blob);

    self.postMessage(
      {
        width: imgBitmap.width,
        height: imgBitmap.height,
        image: imgBitmap,
        ts,
      },
      [imgBitmap],
    );
  } catch (err) {
    console.error('Worker image load error:', err);
  }
};
