import { Document } from "../models/Document.js";
import { User } from "../models/User.js";

// Accepted file-naming convention: employeeName_documentType.extension
const FILENAME_REGEX = /^([a-zA-Z]+)_([a-zA-Z]+)\.[a-zA-Z0-9]+$/;

// Friendly labels for common document type identifiers
const TYPE_MAP = {
  resume:      "Resume",
  pan:         "PAN Card",
  aadhar:      "Aadhar Card",
  offer:       "Offer Letter",
  certificate: "Certificate",
  contract:    "Contract",
  nda:         "NDA",
  payslip:     "Payslip",
  id:          "ID Card",
};

function normaliseType(raw) {
  const key = raw.toLowerCase();
  return TYPE_MAP[key] ?? (raw.charAt(0).toUpperCase() + raw.slice(1));
}

// POST /api/documents — called by n8n after a new file is uploaded to Google Drive
export async function createDocument(body) {
  const { employeeName, documentType, documentName, driveLink, uploadedAt } = body;

  // 1. Require all core fields
  if (!documentName || !driveLink) {
    return {
      status: 400,
      data: { message: "documentName and driveLink are required." },
    };
  }

  // 2. Validate filename format if n8n hasn't pre-parsed the fields
  let resolvedEmployeeName = employeeName;
  let resolvedDocumentType  = documentType;

  if (!resolvedEmployeeName || !resolvedDocumentType) {
    const match = documentName.match(FILENAME_REGEX);
    if (!match) {
      return {
        status: 400,
        data: {
          message: `Invalid filename format: "${documentName}". Expected: employeeName_documentType.ext`,
        },
      };
    }
    const rawName = match[1];
    const rawType = match[2];
    resolvedEmployeeName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
    resolvedDocumentType  = normaliseType(rawType);
  }

  // 3. Try to resolve the employee in MongoDB (case-insensitive name match)
  const employee = await User.findOne({
    name: { $regex: new RegExp(`^${resolvedEmployeeName}`, "i") },
  }).select("_id name");

  const employeeId = employee?._id ?? null;

  // 4. Prevent exact duplicates (same file uploaded twice)
  const duplicate = await Document.findOne({ documentName });
  if (duplicate) {
    return {
      status: 409,
      data: { message: `Document "${documentName}" already exists.` },
    };
  }

  // 5. Save metadata
  const doc = new Document({
    employeeName: resolvedEmployeeName,
    employeeId,
    documentType: resolvedDocumentType,
    documentName,
    driveLink,
    uploadedAt: uploadedAt ? new Date(uploadedAt) : new Date(),
  });

  await doc.save();

  return { status: 201, data: doc };
}

// GET /api/documents?employeeId=<id>  — admin only, used by the frontend
export async function getDocumentsByEmployee(employeeId) {
  if (!employeeId) {
    return { status: 400, data: { message: "employeeId query param is required." } };
  }

  // Also try name-based lookup as a fallback (for docs stored before employeeId was resolved)
  const employee = await User.findById(employeeId).select("name");
  if (!employee) {
    return { status: 404, data: { message: "Employee not found." } };
  }

  const docs = await Document.find({
    $or: [
      { employeeId },
      { employeeName: { $regex: new RegExp(`^${employee.name.split(" ")[0]}`, "i") } },
    ],
  }).sort({ uploadedAt: -1 });

  return { status: 200, data: docs };
}

// GET /api/documents — return all documents (admin only)
export async function getAllDocuments() {
  const docs = await Document.find().sort({ uploadedAt: -1 });
  return { status: 200, data: docs };
}
