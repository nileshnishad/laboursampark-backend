import express from "express";
import { register, login } from "../controllers/userController.js";

const router = express.Router();

// POST /api/users/register - Register a new user
console.log("user log");

router.post("/register", register);
router.post("/login", login);

export default router;
