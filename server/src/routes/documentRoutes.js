import express from "express";
import {
  uploadDocument,
  getDocuments,
  deleteDocument,
} from "../controllers/documentController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

// Apply auth protection to all routes in this file
router.use(protect);

// Notice how 'upload.single('file')' sits between the route and the controller.
// 'file' is the key name our frontend FormData will use to send the PDF.
router.post("/", upload.single("file"), uploadDocument);
router.get("/", getDocuments);
router.delete("/:id", deleteDocument);

export default router;
