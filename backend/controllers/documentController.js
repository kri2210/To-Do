import { Document } from "../models/Document.js";
import { User } from "../models/User.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Strip leading '=' that n8n can accidentally add in JSON body expression mode
function sanitize(val) {
  if (typeof val === "string" && val.startsWith("=")) return val.slice(1);
  return val ?? null;
}

/**
 * Try to find an employee in MongoDB using the AI-extracted data.
 * Priority:  1. email (most reliable)
 *            2. full personName exact-ish match
 *            3. first name prefix match
 */
async function resolveEmployee(personName, email) {
  let employee = null;

  // 1. Match by email (most reliable)
  if (email) {
    employee = await User.findOne({
      email: { $regex: new RegExp(`^${email.trim()}$`, "i") },
    }).select("_id name email");
  }

  if (!employee && personName) {
    const nameParts = personName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const fullNoSpace = nameParts.join("").toLowerCase();

    // 2. Full name without spaces (e.g. "KRISHMEHULSHAH" matches "Krish Mehul Shah")
    employee = await User.findOne({
      $expr: {
        $regexMatch: {
          input: { $toLower: { $replaceAll: { input: "$name", find: " ", replacement: "" } } },
          regex: fullNoSpace,
          options: "i",
        },
      },
    }).select("_id name email");

    // 3. First-name prefix fallback
    if (!employee) {
      employee = await User.findOne({
        name: { $regex: new RegExp(`^${firstName}`, "i") },
      }).select("_id name email");
    }
  }

  return employee;
}

// ─── POST /api/documents ──────────────────────────────────────────────────────
// Called by n8n after AI has classified the uploaded document.
// Expected body (AI-based workflow):
// {
//   "documentType": "Resume",
//   "personName":   "KRISH MEHUL SHAH",
//   "email":        "krishmehul2005@gmail.com",   // optional but helps matching
//   "confidence":   100,
//   "driveLink":    "https://drive.google.com/...",
//   "documentName": "random_filename.pdf"          // optional
// }
export async function createDocument(body) {
  // Sanitise all incoming strings (strips accidental '=' prefix from n8n)
  const documentType = sanitize(body.documentType);
  const personName   = sanitize(body.personName)   || sanitize(body.employeeName);
  const email        = sanitize(body.email);
  const confidence   = body.confidence ?? null;
  const driveLink    = sanitize(body.driveLink);
  const documentName = sanitize(body.documentName) || "";
  const uploadedAt   = body.uploadedAt ? new Date(body.uploadedAt) : new Date();

  // Require the two most critical fields
  if (!driveLink) {
    return { status: 400, data: { message: "driveLink is required." } };
  }
  if (!documentType) {
    return { status: 400, data: { message: "documentType is required." } };
  }
  if (!personName) {
    return { status: 400, data: { message: "personName (or employeeName) is required." } };
  }

  // Prevent duplicate Drive links
  const duplicate = await Document.findOne({ driveLink });
  if (duplicate) {
    return {
      status: 409,
      data: { message: `A document with this Drive link already exists.` },
    };
  }

  // Resolve employee in MongoDB
  const employee   = await resolveEmployee(personName, email);
  const employeeId = employee?._id ?? null;

  // Store: use the AI-extracted personName as employeeName
  const doc = new Document({
    employeeName: personName,
    employeeId,
    documentType,
    documentName,
    driveLink,
    email,
    confidence,
    uploadedAt,
  });

  await doc.save();

  return {
    status: 201,
    data: {
      ...doc.toJSON(),
      matchedEmployee: employee ? { id: employee._id, name: employee.name } : null,
    },
  };
}

// ─── GET /api/documents?employeeId=<id> ───────────────────────────────────────
// Admin only — used by the frontend docs panel
export async function getDocumentsByEmployee(employeeId) {
  if (!employeeId) {
    return { status: 400, data: { message: "employeeId query param is required." } };
  }

  const employee = await User.findById(employeeId).select("name email");
  if (!employee) {
    return { status: 404, data: { message: "Employee not found." } };
  }

  const nameParts   = employee.name.trim().split(/\s+/);
  const firstName   = nameParts[0];
  const fullNoSpace = nameParts.join("").toLowerCase();

  const orConditions = [
    { employeeId: employee._id },
    { employeeName: { $regex: new RegExp(`^${firstName}`, "i") } },
    { employeeName: { $regex: new RegExp(fullNoSpace, "i") } },
    { documentName: { $regex: new RegExp(`^${firstName}`, "i") } },
  ];

  // If employee has an email, also match by stored email
  if (employee.email) {
    orConditions.push({ email: { $regex: new RegExp(`^${employee.email.trim()}$`, "i") } });
  }

  const docs = await Document.find({ $or: orConditions }).sort({ uploadedAt: -1 });

  return { status: 200, data: docs };
}

// ─── GET /api/documents (all) ─────────────────────────────────────────────────
export async function getAllDocuments() {
  const docs = await Document.find().sort({ uploadedAt: -1 });
  return { status: 200, data: docs };
}
