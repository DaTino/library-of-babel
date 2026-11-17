/** Browser-side file handling for the admin page — no image library needed. */

export const FULL_PX = 1600; // viewer size
export const THUMB_PX = 512; // wall-texture size (texture budget, §12)
export const MAX_AUDIO_MB = 40;

/** Draw `file` scaled to fit `maxSide`, as a data URL. PNGs stay PNG (they may
 *  carry transparency); everything else becomes JPEG. */
export async function resizeImage(file: File, maxSide: number): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const g = canvas.getContext("2d")!;
    g.imageSmoothingQuality = "high";
    g.drawImage(img, 0, 0, w, h);
    return file.type === "image/png"
      ? canvas.toDataURL("image/png")
      : canvas.toDataURL("image/jpeg", 0.88);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const AUDIO_BY_EXT: Record<string, string> = {
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  aac: "audio/aac",
  webm: "audio/webm",
};

/** Read an audio file as a data URL, fixing up a missing MIME type. */
export async function readAudio(file: File): Promise<string> {
  if (file.size > MAX_AUDIO_MB * 1024 * 1024) {
    throw new Error(`Please use an audio file under ${MAX_AUDIO_MB} MB.`);
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const type = file.type || AUDIO_BY_EXT[ext];
  if (!type?.startsWith("audio/")) throw new Error("That doesn't look like an audio file.");
  const data = await new Promise<string>((ok, fail) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result));
    r.onerror = () => fail(new Error("Couldn't read that file."));
    r.readAsDataURL(file);
  });
  return data.replace(/^data:[^;]*;/, `data:${type};`);
}

/** A starting title from a file name: "the_great-wave.jpg" → "The great wave". */
export function titleFromFile(name: string): string {
  const base = name
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();
  return base ? base[0].toUpperCase() + base.slice(1) : "";
}
