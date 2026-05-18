import { v2 as cloudinary } from "cloudinary";
import { Response } from "express";
import { randomUUID } from "crypto";
import type { ObjectAclPolicy, ObjectPermission } from "./objectAcl";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const CLOUDINARY_FOLDER = "amaanah";

// In-memory staging for 2-step client-initiated uploads (CMS resources).
// Key: token (UUID), Value: staged file data.
export const stagingStore = new Map<
  string,
  { buffer: Buffer; mimetype: string; filename: string }
>();

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  /**
   * Upload a file buffer directly to Cloudinary.
   * Used for server-side multer uploads (school badges, bank slips, staff photos).
   * Returns a stored object path e.g. /objects/amaanah/uuid|image
   */
  async uploadFile(
    buffer: Buffer,
    filename: string,
    mimetype: string,
    options: { visibility: "public" | "private"; owner: string }
  ): Promise<string> {
    const resourceType = mimetype.startsWith("image/") ? "image" : "raw";

    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: CLOUDINARY_FOLDER,
          resource_type: resourceType,
          type: options.visibility === "public" ? "upload" : "authenticated",
          context: { owner: options.owner },
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(buffer);
    });

    return `/objects/${result.public_id}|${resourceType}`;
  }

  /**
   * Generate a staging upload URL for 2-step client-initiated uploads.
   * The client PUTs the file to the returned uploadURL, then calls
   * trySetObjectEntityAclPolicy to finalize and upload to Cloudinary.
   */
  async getObjectEntityUploadURL(
    originalFilename?: string
  ): Promise<{ uploadURL: string; objectPath: string }> {
    const token = randomUUID();
    const filename = originalFilename || token;
    stagingStore.set(token, {
      buffer: Buffer.alloc(0),
      mimetype: "application/octet-stream",
      filename,
    });
    // Auto-expire staging entry after 15 minutes
    setTimeout(() => stagingStore.delete(token), 15 * 60 * 1000);

    return {
      uploadURL: `/api/internal/stage/${token}`,
      objectPath: `/objects/staged/${token}`,
    };
  }

  /**
   * Finalize a staged upload: reads the staged buffer, uploads to Cloudinary,
   * and returns the final /objects/... path.
   * Also accepts an already-finalized /objects/... path (returns it unchanged).
   */
  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    if (rawPath.startsWith("/api/internal/stage/")) {
      const token = rawPath.slice("/api/internal/stage/".length);
      const staged = stagingStore.get(token);
      if (!staged || staged.buffer.length === 0) {
        throw new Error(
          `No staged upload data for token: ${token}. ` +
            `Ensure the file was PUT to the staging URL before finalizing.`
        );
      }
      stagingStore.delete(token);
      return this.uploadFile(staged.buffer, staged.filename, staged.mimetype, {
        visibility: aclPolicy.visibility,
        owner: aclPolicy.owner,
      });
    }

    if (rawPath.startsWith("/objects/")) return rawPath;

    throw new Error(`Unrecognized upload path: ${rawPath}`);
  }

  /**
   * Get a file reference by its stored object path.
   * Returns { publicId, resourceType } for use with downloadObject.
   */
  async getObjectEntityFile(
    objectPath: string
  ): Promise<{ publicId: string; resourceType: string }> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }
    return this.parseObjectPath(objectPath);
  }

  /**
   * Redirect the response to the Cloudinary CDN URL for the file.
   */
  async downloadObject(
    file: { publicId: string; resourceType: string },
    res: Response,
    cacheTtlSec: number = 3600,
    filename?: string
  ): Promise<void> {
    const url = cloudinary.url(file.publicId, {
      resource_type: file.resourceType as any,
      secure: true,
    });
    if (filename) {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
    }
    res.setHeader("Cache-Control", `public, max-age=${cacheTtlSec}`);
    res.redirect(url);
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: { publicId: string; resourceType: string };
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return true;
  }

  private parseObjectPath(objectPath: string): {
    publicId: string;
    resourceType: string;
  } {
    const inner = objectPath.replace(/^\/objects\//, "");
    if (inner.includes("|")) {
      const idx = inner.lastIndexOf("|");
      const publicId = inner.slice(0, idx);
      const resourceType = inner.slice(idx + 1);
      return {
        publicId,
        resourceType: ["image", "video", "raw"].includes(resourceType)
          ? resourceType
          : "raw",
      };
    }
    return { publicId: inner, resourceType: "raw" };
  }
}
