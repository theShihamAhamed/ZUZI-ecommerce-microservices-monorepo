import fs from "fs";
import { NextFunction, Request, Response } from "express";
import imagekit from "@libs/imageKit";

export const uploadChatImage = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const file = (req as any).file as
    | {
        path: string;
        originalname: string;
        size: number;
      }
    | undefined;

  try {
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const imageStream = fs.createReadStream(file.path);
    const result = await imagekit.files.upload({
      file: imageStream,
      fileName: `${Date.now()}-${file.originalname}`,
      folder: "chat-images",
    });

    return res.status(200).json({
      success: true,
      attachment: {
        url: result.url,
        fileId: result.fileId,
        type: "image",
        name: file.originalname,
        size: file.size,
      },
    });
  } catch (error) {
    return next(error);
  } finally {
    if (file?.path && fs.existsSync(file.path)) {
      await fs.promises.unlink(file.path);
    }
  }
};
