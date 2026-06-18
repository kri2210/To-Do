import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    // Resolved from AI-extracted personName
    employeeName: {
      type: String,
      required: [true, "Employee name is required."],
      trim: true,
    },
    // Linked after matching employee in DB
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // AI-classified document type, e.g. "Resume", "PAN Card"
    documentType: {
      type: String,
      required: [true, "Document type is required."],
      trim: true,
    },
    // Actual filename on Drive (can be random now)
    documentName: {
      type: String,
      trim: true,
      default: "",
    },
    driveLink: {
      type: String,
      required: [true, "Google Drive link is required."],
      trim: true,
    },
    // Email extracted by AI — used for reliable employee matching
    email: {
      type: String,
      trim: true,
      default: null,
    },
    // AI classification confidence 0–100
    confidence: {
      type: Number,
      default: null,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: "documents",   // explicit — prevents Mongoose pluralisation ambiguity
    versionKey: false,
  }
);

documentSchema.set("toJSON", {
  virtuals: true,
  transform(_doc, ret) {
    if (ret._id) {
      ret.id = ret._id.toString();
      delete ret._id;
    }
  },
});

export const Document = mongoose.model("Document", documentSchema);
