 import mongoose from "mongoose";
 const emailSchema = new mongoose.Schema({
 email: {
    type: String,
    required: true,
    match: /.+\@.+\..+/, // basic email pattern
  }
},{
    timestamps:true
})
export const Email = mongoose.model("Email", emailSchema);