import { Router } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { staffSchema, userQuerySchema } from "../schemas/users.schema.js";
import { pagination } from "../utils/query.js";

export const usersRouter = Router();
const publicUser = (user: {
  _id: unknown;
  name: string;
  email: string;
  role: string;
}) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  role: user.role,
});
usersRouter.get("/", async (request, response) => {
  const { page, limit } = userQuerySchema.parse(request.query);
  const [users, total] = await Promise.all([
    User.find({})
      .select("name email role")
      .sort({ _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(),
  ]);
  response.json({
    data: users.map(publicUser),
    pagination: pagination(page, limit, total),
  });
});
usersRouter.post("/", async (request, response) => {
  const { name, email, password } = staffSchema.parse(request.body);
  const user = await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: "staff",
  });
  response.status(201).json({ data: publicUser(user) });
});
