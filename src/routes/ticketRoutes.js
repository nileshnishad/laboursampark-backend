import express from "express";
import { authenticateToken, isAdmin } from "../middleware/authMiddleware.js";
import { createTicket, getMyTickets, getAllTicketsAdmin, updateTicketStatus, getTicketById } from "../controllers/ticketController.js";

const router = express.Router();

router.post("/", authenticateToken, createTicket);
router.get("/my", authenticateToken, getMyTickets);
router.get("/admin/all", authenticateToken, isAdmin, getAllTicketsAdmin);
router.get("/admin/:ticketId", authenticateToken, isAdmin, getTicketById);
router.put("/admin/:ticketId", authenticateToken, isAdmin, updateTicketStatus);
router.get("/:ticketId", authenticateToken, getTicketById);

export default router;
