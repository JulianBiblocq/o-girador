export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const base64ToBlob = (base64Data: string): Blob => {
  const parts = base64Data.split(';base64,');
  let contentType = '';
  let rawBase64 = base64Data;
  if (parts.length === 2) {
    contentType = parts[0].replace('data:', '');
    rawBase64 = parts[1];
  }
  const sliceSize = 512;
  const byteCharacters = atob(rawBase64);
  const byteArrays: Uint8Array[] = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays as BlobPart[], { type: contentType || 'audio/webm' });
};
