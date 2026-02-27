import express from "express";
import {
  uploadDocument,
  getUserDocuments,
  getDocumentById,
  updateDocumentStatus,
  deleteDocument,
  getDocumentsByType,
  getPendingDocuments,
  getVerifiedDocuments,
} from "../controllers/documentController.js";

const router = express.Router();

// Document upload and retrieval
router.post("/:userId/upload", uploadDocument);
router.get("/:userId", getUserDocuments);
router.get("/:userId/type", getDocumentsByType);
router.get("/:userId/verified", getVerifiedDocuments);

// Single document operations
router.get("/document/:documentId", getDocumentById);
router.patch("/document/:documentId/status", updateDocumentStatus);
router.delete("/document/:documentId", deleteDocument);

// Admin operations
router.get("/admin/pending", getPendingDocuments);

export default router;
