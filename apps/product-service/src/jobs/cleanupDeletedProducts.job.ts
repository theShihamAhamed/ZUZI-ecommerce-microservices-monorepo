import cron from "node-cron";

import imagekit from "@libs/imageKit";
import prisma from "@libs/prisma";

const PRODUCT_RESTORE_WINDOW_HOURS = 24;

const getDeleteBeforeDate = () => {
  return new Date(Date.now() - PRODUCT_RESTORE_WINDOW_HOURS * 60 * 60 * 1000);
};

const deleteImageKitFilesForProduct = async (
  productId: string,
  images: { fileId: string }[],
) => {
  if (images.length === 0) {
    return true;
  }

  const deleteResults = await Promise.allSettled(
    images.map((image) => imagekit.files.delete(image.fileId)),
  );

  const failedDeletes = deleteResults.filter(
    (result) => result.status === "rejected",
  );

  if (failedDeletes.length > 0) {
    console.error(
      `[Product Cleanup] Failed to delete ${failedDeletes.length} ImageKit image(s) for product ${productId}. Product will be retried in next cleanup.`,
    );

    failedDeletes.forEach((result, index) => {
      console.error(
        `[Product Cleanup] ImageKit delete error ${index + 1}:`,
        result,
      );
    });

    return false;
  }

  return true;
};

export const cleanupDeletedProducts = async () => {
  try {
    const deleteBefore = getDeleteBeforeDate();

    const expiredDeletedProducts = await prisma.products.findMany({
      where: {
        isDeleted: true,
        deletedAt: {
          lte: deleteBefore,
        },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        images: true,
      },
    });

    if (expiredDeletedProducts.length === 0) {
      console.log("[Product Cleanup] No expired deleted products found.");
      return;
    }

    const productIdsReadyForDbDelete: string[] = [];

    for (const product of expiredDeletedProducts) {
      const imageKitFilesDeleted = await deleteImageKitFilesForProduct(
        product.id,
        product.images,
      );

      if (imageKitFilesDeleted) {
        productIdsReadyForDbDelete.push(product.id);
      }
    }

    if (productIdsReadyForDbDelete.length === 0) {
      console.log(
        "[Product Cleanup] No products were deleted from DB because ImageKit cleanup failed.",
      );
      return;
    }

    await prisma.$transaction([
      prisma.products.deleteMany({
        where: {
          id: {
            in: productIdsReadyForDbDelete,
          },
        },
      }),
    ]);

    console.log(
      `[Product Cleanup] Permanently deleted ${productIdsReadyForDbDelete.length} expired product(s) from DB and ImageKit.`,
    );

    const skippedCount =
      expiredDeletedProducts.length - productIdsReadyForDbDelete.length;

    if (skippedCount > 0) {
      console.log(
        `[Product Cleanup] Skipped ${skippedCount} product(s). They will be retried in the next cleanup run.`,
      );
    }
  } catch (error) {
    console.error(
      "[Product Cleanup] Failed to cleanup deleted products:",
      error,
    );
  }
};

export const startDeletedProductCleanupJob = () => {
  cron.schedule("0 * * * *", async () => {
    console.log("[Product Cleanup] Running deleted product cleanup job...");
    await cleanupDeletedProducts();
  });

  console.log("[Product Cleanup] Cron job scheduled. Runs every 1 hour.");
};
