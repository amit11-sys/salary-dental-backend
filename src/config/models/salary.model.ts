import mongoose from "mongoose";

const salarySchema = new mongoose.Schema({
  base_salary: { type: Number },
  bonus: { type: Number, },
  chooseSpecialty: {
    type: String,
    enum: ["yes", "no"],
  },
  city: { type: String },
  // email: {
  //   type: String,
  //   required: true,
  //   match: /.+\@.+\..+/, // basic email pattern
  // },
  hoursWorked: { type: Number },
  practiceSetting: { type: String },
  ptoWeeks: { type: Number, },
  rating: { type: Number, min: 1, max: 5 },
  satisfactionLevel: { type: String },
  specialty: { type: String },
  sub_specialty: { type: String },
  state: { type: String },
  yearsOfExperience: { type: Number },
  insight1:{type:String},
  insight2:{type:String},
  prod_per:{type:String}
}, {
  timestamps: true,
});

export const Salary = mongoose.model("Salary", salarySchema);
