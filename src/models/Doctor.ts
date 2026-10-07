import { Schema, model } from "mongoose";
const schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    specialization: { type: String, required: true, trim: true },
    hospital: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);
schema.index({ createdAt: -1, _id: -1 });
schema.index({ specialization: 1, createdAt: -1, _id: -1 });
schema.index({ hospital: 1, createdAt: -1, _id: -1 });
schema.index({ name: 1, _id: 1 });
export const Doctor = model("Doctor", schema);
