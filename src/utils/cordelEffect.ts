export interface CordelOptions {
  zoom: number; // 50 to 180
  detail: number; // 10 to 150
  shadow: number; // 50 to 220
  isMirror: boolean;
  isFrame: boolean;
  posX: number; // -100 to 100
  posY: number; // -100 to 100
}

export const defaultCordelOptions: CordelOptions = {
  zoom: 120,
  detail: 60,
  shadow: 130,
  isMirror: true,
  isFrame: false,
  posX: 0,
  posY: 0,
};

export const processCordelEffectBase64 = (base64Img: string, options: CordelOptions, outSize: number = 200): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const result = processCordelEffect(img, options, outSize);
        resolve(result);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = reject;
    img.src = base64Img;
  });
};

export const processCordelEffect = (img: HTMLImageElement, options: CordelOptions, outSize: number = 200): string => {
  // Pre-center detection based on luminance
  const smallCanvas = document.createElement('canvas');
  const scale = 100 / Math.max(img.width, img.height);
  smallCanvas.width = img.width * scale; 
  smallCanvas.height = img.height * scale;
  const smallCtx = smallCanvas.getContext('2d');
  if (!smallCtx) return '';
  
  smallCtx.drawImage(img, 0, 0, smallCanvas.width, smallCanvas.height);
  const smallData = smallCtx.getImageData(0, 0, smallCanvas.width, smallCanvas.height).data;

  let bgSum = 0;
  const corners = [0, smallCanvas.width - 1, (smallCanvas.height - 1) * smallCanvas.width, (smallCanvas.height - 1) * smallCanvas.width + smallCanvas.width - 1];
  corners.forEach(idx => {
      let j = idx * 4;
      bgSum += 0.299 * smallData[j] + 0.587 * smallData[j+1] + 0.114 * smallData[j+2];
  });
  const threshold = (bgSum / 4) - 20;

  let minX = smallCanvas.width, maxX = 0, minY = smallCanvas.height, maxY = 0;
  for(let y = 0; y < smallCanvas.height; y++){
      for(let x = 0; x < smallCanvas.width; x++){
          let idx = (y * smallCanvas.width + x) * 4;
          let lum = 0.299 * smallData[idx] + 0.587 * smallData[idx+1] + 0.114 * smallData[idx+2];
          if (lum < threshold) { 
              if (x < minX) minX = x; if (x > maxX) maxX = x;
              if (y < minY) minY = y; if (y > maxY) maxY = y;
          }
      }
  }
  
  minX /= scale; maxX /= scale; minY /= scale; maxY /= scale;
  if (minX > maxX) { minX = 0; maxX = img.width; minY = 0; maxY = img.height; }

  let boxSize = Math.max(maxX - minX, maxY - minY);
  if(boxSize === 0) boxSize = Math.min(img.width, img.height);

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  // Apply crop and offsets
  const detailSensibility = 160 - options.detail; 
  const shadowLimit = options.shadow;
  const zoomVal = options.zoom;
  const cropSize = (boxSize * 1.3) / (zoomVal / 100); 
  
  const shiftX = (options.isMirror ? 1 : -1) * (options.posX / 100) * (cropSize / 2);
  const shiftY = - (options.posY / 100) * (cropSize / 2);

  const sX = cx - cropSize / 2 + shiftX;
  const sY = cy - cropSize / 2 + shiftY;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = outSize; tempCanvas.height = outSize;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
  if (!tempCtx) return '';
  
  tempCtx.fillStyle = '#ffffff';
  tempCtx.fillRect(0, 0, outSize, outSize);
  
  if (options.isMirror) {
      tempCtx.translate(outSize, 0);
      tempCtx.scale(-1, 1);
  }
  
  tempCtx.drawImage(img, sX, sY, cropSize, cropSize, 0, 0, outSize, outSize);
  
  const imgData = tempCtx.getImageData(0, 0, outSize, outSize);
  const data = imgData.data;
  const gray = new Float32Array(outSize * outSize);
  for(let i = 0; i < outSize * outSize; i++) {
      gray[i] = 0.299 * data[i*4] + 0.587 * data[i*4+1] + 0.114 * data[i*4+2];
  }

  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = outSize; finalCanvas.height = outSize;
  const finalCtx = finalCanvas.getContext('2d');
  if (!finalCtx) return '';

  const finalImgData = finalCtx.createImageData(outSize, outSize);
  const fData = finalImgData.data;

  for(let y = 0; y < outSize; y++){
      for(let x = 0; x < outSize; x++){
          let i = y * outSize + x;
          let outIdx = i * 4;
          
          let lum = gray[i];
          let isInk = false;
          
          if (y > 0 && y < outSize - 1 && x > 0 && x < outSize - 1) {
              let tl = gray[i - outSize - 1], tc = gray[i - outSize], tr = gray[i - outSize + 1];
              let ml = gray[i - 1],                                   mr = gray[i + 1];
              let bl = gray[i + outSize - 1], bc = gray[i + outSize], br = gray[i + outSize + 1];
              
              let dx = (tr + 2*mr + br) - (tl + 2*ml + bl);
              let dy = (bl + 2*bc + br) - (tl + 2*tc + tr);
              let edge = Math.sqrt(dx*dx + dy*dy);

              if (edge > detailSensibility && lum < 240) {
                  isInk = true;
              }
          }

          if (!isInk) {
              let groove = Math.sin((x - y) * 0.4) * 15 + Math.sin(y * 0.1) * 5;
              let noise = (Math.random() * 30) - 15;
              if (lum + groove + noise < shadowLimit) {
                  isInk = true;
              }
          }

          if (options.isFrame) {
              if (x < 15 || x > outSize - 15 || y < 15 || y > outSize - 15) {
                  isInk = true;
                  if(Math.random() > 0.8) isInk = false;
              }
          }

          if (isInk) {
              fData[outIdx] = 25; fData[outIdx+1] = 25; fData[outIdx+2] = 25; 
          } else {
              fData[outIdx] = 232; fData[outIdx+1] = 220; fData[outIdx+2] = 196; 
          }
          fData[outIdx+3] = 255;
      }
  }

  finalCtx.putImageData(finalImgData, 0, 0);
  return finalCanvas.toDataURL('image/jpeg', 0.8);
};
