import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { User } from "../models/User.js";
import { Session } from "../models/Session.js";
import { Doctor } from "../models/Doctor.js";
import { Patient } from "../models/Patient.js";
export async function createIndexes() {
  await Promise.all([
    User.createIndexes(),
    Session.createIndexes(),
    Doctor.createIndexes(),
    Patient.createIndexes(),
  ]);
}
if (
  /\/indexes\.(?:ts|js)$/.test(process.argv[1]?.replaceAll("\\", "/") ?? "")
) {
  try {
    await connectDatabase();
    await createIndexes();
    console.info("Database indexes created without dropping existing indexes.");
  } catch {
    console.error(
      "Could not create indexes. Check database access and existing data.",
    );
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}
