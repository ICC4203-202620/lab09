// Reduce una imagen antes de subirla.
//
// La cámara de un teléfono entrega fotos de 12 megapíxeles y varios MB; para
// una miniatura en un mapa sobran. Dibujarla en un <canvas> más pequeño y
// volver a codificarla como JPEG la deja en unos 150 KB, lo que importa en
// una red móvil y en el disco del servidor.
//
// `imageOrientation: 'from-image'` aplica la rotación que la cámara anotó en
// los metadatos EXIF; sin ella, las fotos tomadas en vertical aparecen
// acostadas en algunos navegadores. Los que no conocen la opción lanzan un
// TypeError, y en ese caso se decodifica sin ella.
export async function resizeImage(blob, { maxSide = 1280, quality = 0.85 } = {}) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch {
    bitmap = await createImageBitmap(blob);
  }

  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return canvasToJpeg(canvas, quality);
}

// toBlob usa un callback; lo envolvemos en una promesa para poder usar await.
export function canvasToJpeg(canvas, quality = 0.85) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('No se pudo codificar la imagen.'))),
      'image/jpeg',
      quality,
    );
  });
}
