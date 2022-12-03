import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: "string", required: true },
    title: { type: "string", required: true },
    height: { type: "string", required: true },
    width: { type: "string", required: true },
    medium: { type: "string", required: true },
    artist: { type: "string", required: true },
    year: { type: "string", required: true },
    description: { type: "string", required: true },
    price: { type: "string", required: true },
    image: { data: Buffer, contentType: String },
    pending: { type: "boolean", required: true },
    approved: { type: "boolean", required: true },
  },
  { timestamps: true }
);

const userModel = mongoose.model("user", userSchema);
export default userModel;
