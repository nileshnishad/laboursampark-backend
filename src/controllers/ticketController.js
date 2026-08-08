import Ticket from "../models/Ticket.js";
import User from "../models/User.js";
import { logActivity } from "../utils/activityLogger.js";

const normalizeAttachments = (attachments = []) => {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments.map((item) => {
    if (typeof item === "string") {
      const fileName = item.split("/").pop() || "attachment";
      return {
        filename: fileName,
        originalName: fileName,
        mimeType: "",
        size: 0,
        data: item,
        storageType: "s3",
      };
    }

    if (item && typeof item === "object") {
      return item;
    }

    return item;
  });
};

const normalizeTicketStatus = (statusValue) => {
  if (!statusValue) return null;

  const normalized = String(statusValue).trim().toLowerCase().replace(/\s+/g, "_");
  if (normalized === "inprogress") return "in_progress";
  if (["open", "in_progress", "closed"].includes(normalized)) return normalized;
  return null;
};

const getAdminNoteValue = (body) => {
  if (body.adminNote !== undefined) return body.adminNote;
  if (body.comment !== undefined) return body.comment;
  if (body.note !== undefined) return body.note;
  if (body.admin_comment !== undefined) return body.admin_comment;
  return undefined;
};

const buildTicketPayload = (ticket) => ({
  _id: ticket._id,
  userId: ticket.userId,
  userName: ticket.userName,
  userEmail: ticket.userEmail,
  userMobile: ticket.userMobile,
  category: ticket.category,
  subject: ticket.subject,
  message: ticket.message,
  attachments: ticket.attachments || [],
  status: ticket.status,
  currentStatus: ticket.status,
  adminNote: ticket.adminNote || "",
  latestAdminNote: ticket.adminNote || "",
  createdAt: ticket.createdAt,
  updatedAt: ticket.updatedAt,
  resolvedAt: ticket.resolvedAt,
});

export const createTicket = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const { subject, message, category = "general", attachments = [], adminNote = "" } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ success: false, message: "subject and message are required" });
    }

    const user = await User.findById(userId).select("fullName email mobile").lean();

    const ticket = await Ticket.create({
      userId,
      userName: user?.fullName || "",
      userEmail: user?.email || "",
      userMobile: user?.mobile || "",
      category,
      subject,
      message,
      attachments: normalizeAttachments(attachments),
      adminNote,
    });

    await logActivity({
      userId,
      activityType: "ticket_created",
      title: "Support ticket created",
      description: `Support ticket created: ${subject}`,
      relatedId: ticket._id,
    });

    return res.status(201).json({
      success: true,
      message: "Ticket created successfully",
      data: buildTicketPayload(ticket),
    });
  } catch (error) {
    console.error("Create ticket error:", error);
    return res.status(500).json({ success: false, message: "Failed to create ticket", error: error.message });
  }
};

export const getMyTickets = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    const tickets = await Ticket.find({ userId }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: tickets.map(buildTicketPayload) });
  } catch (error) {
    console.error("Get my tickets error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch tickets", error: error.message });
  }
};

export const getAllTicketsAdmin = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) {
      const normalizedStatus = String(status).toLowerCase();
      if (['open', 'in_progress', 'closed'].includes(normalizedStatus)) {
        filter.status = normalizedStatus;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [tickets, total] = await Promise.all([
      Ticket.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Ticket.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: tickets.map(buildTicketPayload),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
      },
    });
  } catch (error) {
    console.error("Get all tickets error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch tickets", error: error.message });
  }
};

export const updateTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { status } = req.body;
    const adminNote = getAdminNoteValue(req.body);
    const normalizedStatus = normalizeTicketStatus(status);

    const ticket = await Ticket.findById(ticketId);
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    if (normalizedStatus) ticket.status = normalizedStatus;
    if (adminNote !== undefined) ticket.adminNote = adminNote;
    if (ticket.status === "closed") ticket.resolvedAt = ticket.resolvedAt || new Date();
    if (ticket.status === "open") ticket.resolvedAt = null;

    await ticket.save();

    return res.json({ success: true, message: "Ticket updated successfully", data: buildTicketPayload(ticket) });
  } catch (error) {
    console.error("Update ticket status error:", error);
    return res.status(500).json({ success: false, message: "Failed to update ticket", error: error.message });
  }
};

export const getTicketById = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await Ticket.findById(ticketId).lean();
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }

    return res.json({ success: true, data: buildTicketPayload(ticket) });
  } catch (error) {
    console.error("Get ticket by id error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch ticket", error: error.message });
  }
};
