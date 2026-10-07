import { Doctor } from "../models/Doctor.js";
import { Patient, conditions } from "../models/Patient.js";
export async function dashboard(days: number) {
  const now = new Date();
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - days + 1);
  start.setUTCHours(0, 0, 0, 0);
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
  const [
    doctors,
    patients,
    patientsAddedThisMonth,
    growth,
    distribution,
    workloads,
    recent,
  ] = await Promise.all([
    Doctor.countDocuments(),
    Patient.countDocuments(),
    Patient.countDocuments({ createdAt: { $gte: monthStart, $lte: now } }),
    Patient.aggregate([
      { $match: { createdAt: { $gte: start, $lte: now } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: "UTC",
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Patient.aggregate([{ $group: { _id: "$condition", count: { $sum: 1 } } }]),
    Patient.aggregate([
      { $group: { _id: "$doctorId", patientCount: { $sum: 1 } } },
      {
        $lookup: {
          from: Doctor.collection.name,
          localField: "_id",
          foreignField: "_id",
          as: "doctor",
        },
      },
      { $unwind: "$doctor" },
      { $sort: { patientCount: -1, "doctor.name": 1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          doctorId: { $toString: "$_id" },
          doctorName: "$doctor.name",
          patientCount: 1,
        },
      },
    ]),
    Patient.find()
      .sort({ createdAt: -1, _id: -1 })
      .limit(5)
      .select("firstName lastName condition doctorId createdAt")
      .populate("doctorId", "name specialization")
      .lean(),
  ]);
  const byDate = new Map(
    growth.map((item) => [item._id as string, item.count as number]),
  );
  const patientGrowth = Array.from({ length: days }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(day.getUTCDate() + index);
    const date = day.toISOString().slice(0, 10);
    return { date, count: byDate.get(date) ?? 0 };
  });
  return {
    totals: {
      doctors,
      patients,
      patientsAddedThisMonth,
      averagePatientsPerDoctor: doctors
        ? Number((patients / doctors).toFixed(1))
        : 0,
    },
    patientsPerDoctor: workloads,
    patientGrowth,
    conditionDistribution: conditions.map((condition) => ({
      condition,
      count: distribution.find((item) => item._id === condition)?.count ?? 0,
    })),
    recentPatients: recent.map((item) => ({
      id: String(item._id),
      firstName: item.firstName,
      lastName: item.lastName,
      condition: item.condition,
      doctor: item.doctorId,
      createdAt: item.createdAt,
    })),
    period: {
      days,
      timezone: "UTC",
      from: start.toISOString(),
      to: now.toISOString(),
    },
  };
}
