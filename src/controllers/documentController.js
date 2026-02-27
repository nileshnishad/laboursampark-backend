import Document from "../models/Document.js";
import User from "../models/User.js";

// Upload/Create a new document
export const uploadDocument = async (req, res) => {
  try {
    const { userId } = req.params;
    const { documentType, documentName, documentUrl, publicId, expiryDate, issueDate, issuingAuthority } = req.body;

    // Validation
    if (!documentType || !documentName || !documentUrl) {
      return res.status(400).json({
        success: false,
        message: "Please provide documentType, documentName, and documentUrl",
      });
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Create new document
    const document = new Document({
      userId,
      documentType: documentType.toLowerCase(),
      documentName,
      documentUrl,
      publicId,
      expiryDate,
      issueDate,
      issuingAuthority,
    });

    await document.save();

    // Add document reference to user
    await User.findByIdAndUpdate(
      userId,
      { $push: { documents: document._id } },
      { new: true }
    );

    res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      data: document,
    });
  } catch (error) {
    console.error("Upload document error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while uploading the document",
      error: error.message,
    });
  }
};

// Get all documents for a user
export const getUserDocuments = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const documents = await Document.find({ userId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Documents retrieved successfully",
      count: documents.length,
      data: documents,
    });
  } catch (error) {
    console.error("Get documents error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while retrieving documents",
      error: error.message,
    });
  }
};

// Get document by ID
export const getDocumentById = async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await Document.findById(documentId).populate("userId", "fullName email mobile");

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Document retrieved successfully",
      data: document,
    });
  } catch (error) {
    console.error("Get document error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while retrieving the document",
      error: error.message,
    });
  }
};

// Update document status (for admin/verification)
export const updateDocumentStatus = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { status, verificationNotes, verifiedBy } = req.body;

    if (!status || !["pending", "approved", "rejected", "expired"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be: pending, approved, rejected, or expired",
      });
    }

    const document = await Document.findByIdAndUpdate(
      documentId,
      {
        status,
        verified: status === "approved",
        verificationNotes,
        verifiedBy,
        verifiedAt: status === "approved" ? new Date() : null,
      },
      { new: true }
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Document status updated successfully",
      data: document,
    });
  } catch (error) {
    console.error("Update document status error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating document status",
      error: error.message,
    });
  }
};

// Delete document
export const deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { userId } = req.body;

    const document = await Document.findByIdAndDelete(documentId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Remove document reference from user
    if (userId) {
      await User.findByIdAndUpdate(
        userId,
        { $pull: { documents: documentId } },
        { new: true }
      );
    }

    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
      data: document,
    });
  } catch (error) {
    console.error("Delete document error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while deleting the document",
      error: error.message,
    });
  }
};

// Get documents by type
export const getDocumentsByType = async (req, res) => {
  try {
    const { userId } = req.params;
    const { documentType } = req.query;

    if (!documentType) {
      return res.status(400).json({
        success: false,
        message: "Please provide documentType as query parameter",
      });
    }

    const documents = await Document.find({
      userId,
      documentType: documentType.toLowerCase(),
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: `${documentType} documents retrieved successfully`,
      count: documents.length,
      data: documents,
    });
  } catch (error) {
    console.error("Get documents by type error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while retrieving documents",
      error: error.message,
    });
  }
};

// Get pending documents (for admin verification)
export const getPendingDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ status: "pending" })
      .populate("userId", "fullName email mobile")
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      message: "Pending documents retrieved successfully",
      count: documents.length,
      data: documents,
    });
  } catch (error) {
    console.error("Get pending documents error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while retrieving pending documents",
      error: error.message,
    });
  }
};

// Get verified documents for a user
export const getVerifiedDocuments = async (req, res) => {
  try {
    const { userId } = req.params;

    const documents = await Document.find({
      userId,
      verified: true,
      status: "approved",
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Verified documents retrieved successfully",
      count: documents.length,
      data: documents,
    });
  } catch (error) {
    console.error("Get verified documents error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while retrieving verified documents",
      error: error.message,
    });
  }
};
