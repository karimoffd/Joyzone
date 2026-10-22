// Profile photos are stored as data URLs on the user record, so they are
// shrunk in the browser first: a square crop, at most 384px, JPEG.
export const AVATAR_MAX_FILE_BYTES = 10 * 1024 * 1024;

export function fileToAvatarDataUrl(file, size = 384) {
  return new Promise((resolve, reject) => {
    if (!file || !String(file.type).startsWith("image/")) {
      reject(new Error("Выберите файл изображения (JPG, PNG, WebP)."));
      return;
    }
    if (file.size > AVATAR_MAX_FILE_BYTES) {
      reject(new Error("Файл больше 10 МБ."));
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const side = Math.min(image.naturalWidth, image.naturalHeight);
      const target = Math.min(size, side);
      const canvas = document.createElement("canvas");
      canvas.width = target;
      canvas.height = target;
      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, target, target);
      context.drawImage(
        image,
        (image.naturalWidth - side) / 2,
        (image.naturalHeight - side) / 2,
        side,
        side,
        0,
        0,
        target,
        target,
      );
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.86));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Не удалось прочитать изображение."));
    };
    image.src = url;
  });
}
