import mongoose from "mongoose";

const specialitySchema = new mongoose.Schema({
  speciality: {type:String, required:true},
  sub_speciality: {type:String},
  
},{
  timestamps:true
});

export const Speciality = mongoose.model("Speciality", specialitySchema);
