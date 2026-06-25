import express, { Router } from "express";
import { isAuthenticated } from "@middleware/auth.middleware";
import {
  createOrGetConversation,
  getConversation,
  getConversationMessages,
  getConversations,
  markConversationSeen,
} from "../controllers/chat.controller";
import { uploadChatImage } from "../controllers/upload.controller";
import { uploadChatImageMiddleware } from "../middleware/uploadChatImage.middleware";

const router: Router = express.Router();

router.post("/conversations", isAuthenticated, createOrGetConversation);
router.get("/conversations", isAuthenticated, getConversations);
router.get("/conversations/:conversationId", isAuthenticated, getConversation);
router.get(
  "/conversations/:conversationId/messages",
  isAuthenticated,
  getConversationMessages,
);
router.post(
  "/conversations/:conversationId/seen",
  isAuthenticated,
  markConversationSeen,
);
router.post(
  "/uploads/image",
  isAuthenticated,
  uploadChatImageMiddleware,
  uploadChatImage,
);

export default router;
