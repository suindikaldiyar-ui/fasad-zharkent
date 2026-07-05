// Сжатие изображения через canvas перед отправкой (избегаем ошибки 413)
export interface CompressedImage {
  dataUrl: string; // полный data:image/jpeg;base64,...
  base64: string; // только base64 (для API)
  mimeType: string;
}

export function compressImage(
  file: File,
  maxWidth = 1280,
  quality = 0.82
): Promise<CompressedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Не удалось прочитать файл."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Не удалось загрузить изображение."));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas недоступен."));
        ctx.drawImage(img, 0, 0, w, h);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const base64 = dataUrl.split(",")[1] ?? "";
        resolve({ dataUrl, base64, mimeType: "image/jpeg" });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
