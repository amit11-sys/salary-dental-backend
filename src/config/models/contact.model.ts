import mongoose from "mongoose";

const contactSchema = new mongoose.Schema({
  name: {type:String, required:true},
  email: {type:String, required:true},
  message: {type:String, required:true},
  subject: {type:String},
},{
  timestamps:true
});

export const Contact = mongoose.model("Contact", contactSchema);
