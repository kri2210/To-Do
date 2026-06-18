import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    employeeName: {
      type: String,
      required: [true, "Employee name is required."],
      trim: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    documentType: {
      type: String,
      required: [true, "Document type is required."],
      trim: true,
    },
    documentName: {
      type: String,
      required: [true, "Document name is required."],
      trim: true,
    },
    driveLink: {
      type: String,
      required: [true, "Google Drive link is required."],
      trim: true,
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
