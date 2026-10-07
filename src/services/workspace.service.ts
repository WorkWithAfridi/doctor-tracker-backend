import { randomUUID } from "node:crypto";
import { Doctor } from "../models/Doctor.js";
import { Patient, conditions } from "../models/Patient.js";
export async function workspaceCounts() {
  const [doctors, patients] = await Promise.all([
    Doctor.countDocuments(),
    Patient.countDocuments(),
  ]);
  return { doctors, patients };
}
export async function resetWorkspace() {
  // Remove references first; never drop the database or user/session/index collections.
  await Patient.deleteMany({});
  await Doctor.deleteMany({});
  return workspaceCounts();
}
export async function populateWorkspace(
  patientCount: number,
  doctorCount: number,
) {
  const run = randomUUID();
  const dateAgo = (days: number) => new Date(Date.now() - days * 86400000);
  const existingDoctors = await Doctor.find().select("_id").lean();
  const doctorNames = [
    "Ayesha Rahman",
    "James Wilson",
    "Sarah Ahmed",
    "Daniel Chen",
    "Nadia Islam",
    "Michael Reed",
    "Farhan Karim",
    "Emma Thompson",
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
  const addedDoctors = await Doctor.insertMany(
    Array.from({ length: doctorCount }, (_, index) => ({
      name: `Dr. ${doctorNames[index % doctorNames.length]}${index >= doctorNames.length ? ` ${Math.floor(index / doctorNames.length) + 1}` : ""}`,
      specialization: specialties[index % specialties.length],
      hospital: hospitals[index % hospitals.length],
      email: `doctor-${run}-${index}@example.com`,
      phone: `+880 1712 ${340000 + index}`,
      createdAt: dateAgo((4 + index * 3) % 90),
      updatedAt: dateAgo((4 + index * 3) % 90),
    })),
  );
  const doctors = [...existingDoctors, ...addedDoctors];
  const names = [
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
  const surnames = [
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
    Array.from({ length: patientCount }, (_, index) => ({
      firstName: names[index % names.length],
      lastName:
        surnames[
          (index * 3 + Math.floor(index / names.length)) % surnames.length
        ],
      age: 1 + ((index * 7) % 90),
      gender: index % 2 ? "Male" : "Female",
      email: `patient-${run}-${index}@example.com`,
      phone: `+880 1812 ${450000 + index}`,
      condition:
        conditions[
          index % 10 < 5 ? 0 : index % 10 < 8 ? 1 : index % 10 === 8 ? 2 : 3
        ],
      doctorId: doctors[index % doctors.length]._id,
      createdAt: dateAgo((index * 13) % 90),
      updatedAt: dateAgo((index * 13) % 90),
    })),
  );
  return {
    ...(await workspaceCounts()),
    doctorsAdded: addedDoctors.length,
    patientsAdded: patientCount,
  };
}
