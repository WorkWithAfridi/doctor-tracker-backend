import bcrypt from "bcryptjs";
import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { Doctor } from "../models/Doctor.js";
import { Patient, conditions } from "../models/Patient.js";
import { createIndexes } from "./indexes.js";

try {
  if (env.NODE_ENV === "production" && env.SEED_ADMIN_PASSWORD === "Admin123!")
    throw new Error("Set a non-default production seed password");
  await connectDatabase();
  await createIndexes();
  if (!(await User.exists({ email: env.SEED_ADMIN_EMAIL.toLowerCase() })))
    await User.create({
      name: "Alex Kim",
      email: env.SEED_ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(env.SEED_ADMIN_PASSWORD, 12),
      role: "admin",
    });
  const dateAgo = (days: number) => new Date(Date.now() - days * 86400000);
  if (!(await Doctor.exists({}))) {
    const names = [
      "Ayesha Rahman",
      "James Wilson",
      "Sarah Ahmed",
      "Daniel Chen",
      "Nadia Islam",
      "Michael Reed",
      "Farhan Karim",
      "Emma Thompson",
      "Omar Hassan",
      "Sofia Patel",
      "Arif Chowdhury",
      "Grace Lee",
      "Maya Roy",
      "Oliver Davis",
      "Rina Akter",
      "Ethan Brooks",
      "Samira Khan",
      "Noah Williams",
      "Leila Ali",
      "Adam Lewis",
      "Priya Das",
      "Lucas Martin",
      "Tania Sultana",
      "Henry Clark",
    ];
    const specialties = [
      "Cardiology",
      "Neurology",
      "Dermatology",
      "Pediatrics",
      "Orthopedics",
      "General Medicine",
    ];
    const hospitals = [
      "Evercare Hospital",
      "Square Hospital",
      "United Hospital",
      "Labaid Hospital",
    ];
    await Doctor.insertMany(
      names.map((name, index) => ({
        name: `Dr. ${name}`,
        specialization: specialties[index % 6],
        hospital: hospitals[index % 4],
        email: `${name.toLowerCase().replaceAll(" ", ".")}@example.com`,
        phone: `+880 1712 ${340000 + index}`,
        createdAt: dateAgo(4 + index * 3),
        updatedAt: dateAgo(4 + index * 3),
      })),
    );
  }
  if (!(await Patient.exists({}))) {
    const doctors = await Doctor.find()
      .sort({ createdAt: -1, _id: -1 })
      .select("_id")
      .lean();
    const firstNames = [
      "Amelia",
      "Rafi",
      "Sophia",
      "Hasan",
      "Olivia",
      "Imran",
      "Isabella",
      "Nusrat",
      "Liam",
      "Fatima",
      "Ava",
      "Arman",
      "Charlotte",
      "Sadia",
      "Mason",
      "Zara",
      "Elijah",
      "Anika",
      "Harper",
      "Amin",
    ];
    const lastNames = [
      "Rahman",
      "Ahmed",
      "Wilson",
      "Khan",
      "Patel",
      "Islam",
      "Lee",
      "Hassan",
      "Roy",
      "Chen",
    ];
    await Patient.insertMany(
      Array.from({ length: 186 }, (_, index) => ({
        firstName: firstNames[index % 20],
        lastName: lastNames[(index * 3 + Math.floor(index / 20)) % 10],
        age: 18 + ((index * 7) % 64),
        gender: index % 2 ? "Male" : "Female",
        email: `patient${index + 1}@example.com`,
        phone: `+880 1812 ${450000 + index}`,
        condition:
          conditions[
            index % 10 < 5 ? 0 : index % 10 < 8 ? 1 : index % 10 === 8 ? 2 : 3
          ],
        doctorId:
          doctors[(index * 7 + Math.floor(index / 24)) % doctors.length]._id,
        createdAt: dateAgo((index * 13) % 90),
        updatedAt: dateAgo((index * 13) % 90),
      })),
    );
  }
  console.info(
    `Seed complete: ${await Doctor.countDocuments()} doctors, ${await Patient.countDocuments()} patients. Existing records and admin passwords were preserved.`,
  );
} catch {
  console.error(
    "Seed failed. Check MongoDB connectivity, permissions, and data. No reset was performed.",
  );
  process.exitCode = 1;
} finally {
  await disconnectDatabase();
}
