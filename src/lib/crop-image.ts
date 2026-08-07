export type CropArea = { x: number; y: number; width: number; height: number };

const OUTPUT_SIZE = 1024;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image."));
    img.src = src;
  });
}

/**
 * Crops `file` to the pixel area chosen in the cropper and downscales it to a
 * square JPEG so every avatar/photo renders identically across the app.
 */
export async function cropToSquareFile(
  file: File,
  area: CropArea,
  rotation = 0,
  size = OUTPUT_SIZE,
): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);

    // Draw the (optionally rotated) source onto a scratch canvas first so the
    // crop area coordinates from the cropper line up with the pixels.
    const rad = ((rotation % 360) * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    const boxW = Math.round(img.width * cos + img.height * sin);
    const boxH = Math.round(img.width * sin + img.height * cos);
    const scratch = document.createElement("canvas");
    scratch.width = boxW;
    scratch.height = boxH;
    const sctx = scratch.getContext("2d");
    if (!sctx) throw new Error("Cropping isn’t supported in this browser.");
    sctx.translate(boxW / 2, boxH / 2);
    sctx.rotate(rad);
    sctx.drawImage(img, -img.width / 2, -img.height / 2);

    const edge = Math.max(1, Math.round(Math.min(area.width, area.height)));
    const target = Math.min(size, edge);
    const canvas = document.createElement("canvas");
    canvas.width = target;
    canvas.height = target;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Cropping isn’t supported in this browser.");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(scratch, area.x, area.y, edge, edge, 0, 0, target, target);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9),
    );
    if (!blob) throw new Error("Could not process that image.");
    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}
