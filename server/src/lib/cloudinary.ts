import { v2 as cloudinary } from "cloudinary";
import { randomUUID } from "node:crypto";
import { ValidationError } from "../types/app-error.js";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

export type CloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
  bytes: number;
  originalFilename: string;
  resourceType: "raw" | "image";
};

type CloudinaryUploadResponse = {
  secure_url: string;
  public_id: string;
  bytes: number;
  resource_type?: string;
  error?: { message: string };
};

function configureCloudinary() {
  if (!cloudName || !apiKey || !apiSecret) {
    throw new ValidationError(
      "Cloudinary credentials are missing. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export function getSignedCloudinaryDownloadUrl(
  publicId: string,
  resourceType: "raw" | "image" = "raw",
) {
  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  configureCloudinary();

  return cloudinary.url(publicId, {
    resource_type: resourceType,
    type: "upload",
    sign_url: true,
    secure: true,
  });
}

export async function uploadPdfToCloudinary(
  buffer: Buffer,
  filename: string,
): Promise<CloudinaryUploadResult> {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new ValidationError("The uploaded PDF is empty or invalid.");
  }

  if (!filename || !filename.toLowerCase().endsWith(".pdf")) {
    throw new ValidationError("Please upload a valid PDF file.");
  }

  if (cloudName && apiKey && apiSecret) {
    configureCloudinary();

    // Raw assets should retain their file extension in the public ID.
    const safeName = filename
      .replace(/\.pdf$/i, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 100) || "document";

    const publicId = `${randomUUID()}-${safeName}.pdf`;

    return new Promise((resolve, reject) => {
      let isSettled = false;

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "raw",
          folder: "smartbook/pdfs",
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (isSettled) return;
          isSettled = true;

          if (error || !result) {
            console.error("Cloudinary upload failed:", error?.message);
            reject(
              new ValidationError(
                error?.message || "Failed to upload PDF to Cloudinary.",
              ),
            );
            return;
          }

          resolve({
            secureUrl: result.secure_url,
            publicId: result.public_id,
            bytes: result.bytes,
            originalFilename: filename,
            resourceType: "raw",
          });
        },
      );

      uploadStream.on("error", (error) => {
        if (isSettled) return;
        isSettled = true;
        console.error("Cloudinary upload stream failed:", error.message);
        reject(
          new ValidationError(
            error.message || "Failed to upload PDF stream to Cloudinary.",
          ),
        );
      });

      uploadStream.end(buffer);
    });
  }

  // Fallback: unsigned uploads require a configured unsigned preset.
  if (cloudName && uploadPreset) {
    const form = new FormData();

    form.append(
      "file",
      new Blob([new Uint8Array(buffer)], {
        type: "application/pdf",
      }),
      filename,
    );

    form.append("upload_preset", uploadPreset);
    form.append("folder", "smartbook/pdfs");

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`,
      {
        method: "POST",
        body: form,
      },
    );

    const result = (await response.json()) as CloudinaryUploadResponse;

    if (!response.ok) {
      const message =
        result.error?.message ??
        `Cloudinary upload failed (${response.status})`;

      console.error("Cloudinary unsigned upload failed:", message);

      throw new ValidationError(message);
    }

    return {
      secureUrl: result.secure_url,
      publicId: result.public_id,
      bytes: result.bytes,
      originalFilename: filename,
      resourceType: "raw",
    };
  }

  throw new ValidationError(
    "Cloudinary is not configured. Check your server environment variables.",
  );
}
