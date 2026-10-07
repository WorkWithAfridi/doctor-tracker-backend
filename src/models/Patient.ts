import { Schema, model } from "mongoose";
export const conditions = [
  "Stable",
  "Recovering",
  "Under Observation",
  "Critical",
] as const;
const schema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 0, max: 120 },
    gender: {
      type: String,
      enum: ["", "Female", "Male", "Other"],
      default: "",
    },
    email: { type: String, lowercase: true, trim: true, default: "" },
    phone: { type: String, required: true, trim: true },
    condition: { type: String, enum: conditions, required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: "Doctor", required: true },
  },
  { timestamps: true },
);
schema.index({ createdAt: -1, _id: -1 });
schema.index({ doctorId: 1, createdAt: -1, _id: -1 });
schema.index({ condition: 1, createdAt: -1, _id: -1 });
schema.index({ firstName: 1, lastName: 1, _id: 1 });
export const Patient = model("Patient", schema);
