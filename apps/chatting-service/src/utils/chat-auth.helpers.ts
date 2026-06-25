import { parse } from "cookie";
import jwt from "jsonwebtoken";
import prisma from "@libs/prisma";
import { ChatParticipantRole } from "./chat.helpers";

export interface SocketParticipant {
  id: string;
  role: ChatParticipantRole;
}

export const getSocketParticipantFromCookie = async (
  rawCookieHeader?: string,
): Promise<SocketParticipant | null> => {
  try {
    const cookies = parse(rawCookieHeader || "");
    const token = cookies.access_token;

    if (!token || !process.env.ACCESS_TOKEN_SECRET) {
      return null;
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET) as {
      userId?: string;
      role?: ChatParticipantRole;
    };

    if (
      !decoded.userId ||
      (decoded.role !== "user" && decoded.role !== "seller")
    ) {
      return null;
    }

    const participant =
      decoded.role === "seller"
        ? await prisma.seller.findUnique({ where: { id: decoded.userId } })
        : await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!participant) {
      return null;
    }

    return {
      id: decoded.userId,
      role: decoded.role,
    };
  } catch {
    return null;
  }
};
