import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema({
  name: {type:String, required:true},
  email: {type:String, required:true},
  category: {type:String, required:true},
  feedback: {type:String},
},{
  timestamps:true
});

export const Feedback = mongoose.model("Feedback", feedbackSchema);
