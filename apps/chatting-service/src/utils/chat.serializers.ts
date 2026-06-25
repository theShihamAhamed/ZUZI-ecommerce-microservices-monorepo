import prisma from "@libs/prisma";
import {
  AuthenticatedChatParticipant,
  getViewerUnreadCount,
} from "./chat.helpers";

const safeImage = (image: any) => {
  if (!image) return null;

  return {
    url: image.url,
    fileId: image.fileId,
  };
};

const firstImage = (images: any) =>
  Array.isArray(images) && images.length > 0 ? safeImage(images[0]) : null;

const serializeUser = (user: any) => {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: safeImage(user.avatar),
  };
};

const serializeSeller = (seller: any) => {
  if (!seller) return null;

  return {
    id: seller.id,
    name: seller.name,
    email: seller.email,
    status: seller.status,
  };
};

const serializeShop = (shop: any) => {
  if (!shop) return null;

  return {
    id: shop.id,
    name: shop.name,
    category: shop.category,
    ratings: shop.ratings,
    avatar: safeImage(shop.avatar),
    coverBanner: shop.coverBanner,
    address: shop.address,
  };
};

const serializeProduct = (product: any) => {
  if (!product) return null;

  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    image: firstImage(product.images),
    sale_price: product.sale_price,
    regular_price: product.regular_price,
  };
};

export const serializeMessage = (message: any) => ({
  id: message.id,
  clientMessageId: message.clientMessageId,
  conversationId: message.conversationId,
  senderId: message.senderId,
  senderType: message.senderType,
  content: message.content,
  attachments: message.attachments || [],
  status: message.status,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
});

export const serializeConversationPayloads = async (
  conversations: any[],
  participant: AuthenticatedChatParticipant,
) => {
  const userIds = [...new Set(conversations.map((item) => item.userId))];
  const sellerIds = [...new Set(conversations.map((item) => item.sellerId))];
  const shopIds = [
    ...new Set(conversations.map((item) => item.shopId).filter(Boolean)),
  ];
  const productIds = [
    ...new Set(conversations.map((item) => item.productId).filter(Boolean)),
  ];

  const [users, sellers, shops, products] = await Promise.all([
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        })
      : [],
    sellerIds.length
      ? prisma.seller.findMany({
          where: { id: { in: sellerIds } },
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
          },
        })
      : [],
    shopIds.length
      ? prisma.shop.findMany({
          where: { id: { in: shopIds } },
          select: {
            id: true,
            name: true,
            category: true,
            ratings: true,
            avatar: true,
            coverBanner: true,
            address: true,
          },
        })
      : [],
    productIds.length
      ? prisma.products.findMany({
          where: { id: { in: productIds } },
          select: {
            id: true,
            title: true,
            slug: true,
            images: true,
            sale_price: true,
            regular_price: true,
          },
        })
      : [],
  ]);
  const usersById = new Map(users.map((user) => [user.id, user]));
  const sellersById = new Map(sellers.map((seller) => [seller.id, seller]));
  const shopsById = new Map(shops.map((shop) => [shop.id, shop]));
  const productsById = new Map(products.map((product) => [product.id, product]));

  return conversations.map((conversation) => {
    const user = serializeUser(usersById.get(conversation.userId));
    const seller = serializeSeller(sellersById.get(conversation.sellerId));
    const shop = conversation.shopId
      ? serializeShop(shopsById.get(conversation.shopId))
      : null;
    const product = conversation.productId
      ? serializeProduct(productsById.get(conversation.productId))
      : null;

    return {
      id: conversation.id,
      conversationKey: conversation.conversationKey,
      userId: conversation.userId,
      sellerId: conversation.sellerId,
      shopId: conversation.shopId,
      productId: conversation.productId,
      lastMessageId: conversation.lastMessageId,
      lastMessageText: conversation.lastMessageText,
      lastMessageAt: conversation.lastMessageAt,
      lastMessageSenderType: conversation.lastMessageSenderType,
      unreadCount: getViewerUnreadCount(conversation, participant),
      userUnreadCount: conversation.userUnreadCount,
      sellerUnreadCount: conversation.sellerUnreadCount,
      online: false,
      participant: participant.role === "user" ? seller : user,
      user,
      seller,
      shop,
      product,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  });
};

export const serializeConversationPayload = async (
  conversation: any,
  participant: AuthenticatedChatParticipant,
) => {
  const [payload] = await serializeConversationPayloads(
    [conversation],
    participant,
  );

  return payload;
};
