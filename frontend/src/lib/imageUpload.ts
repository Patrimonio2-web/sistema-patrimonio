"use client";

import { csrfHeaders } from "@/services/csrfService";

const IMAGE_UPLOAD_MAX_DIMENSION = 1280;
const IMAGE_UPLOAD_QUALITY = 0.78;

export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      IMAGE_UPLOAD_MAX_DIMENSION / bitmap.width,
      IMAGE_UPLOAD_MAX_DIMENSION / bitmap.height
    );

    if (scale >= 1 && file.size <= 700 * 1024) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", IMAGE_UPLOAD_QUALITY);
    });

    if (!blob) return file;

    const name = file.name.replace(/\.[^.]+$/, "") || "foto";
    return new File([blob], `${name}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

export async function uploadMobiliarioImage(file: File): Promise<string> {
  const base = process.env.NEXT_PUBLIC_API_BASE!;
  const uploadUrl = base.endsWith("/api")
    ? `${base}/uploads`
    : `${base}/api/uploads`;

  const uploadFile = await compressImageForUpload(file);
  const formData = new FormData();
  formData.append("foto", uploadFile);

  const res = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
    credentials: "include",
    headers: await csrfHeaders(),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Error al subir imagen");
  return data.url;
}
