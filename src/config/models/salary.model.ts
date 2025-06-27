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
  practiceSetting : { type: String },
   ptoWeeks  : { type: Number, },
  rating: { type: Number, min: 1, max: 5 },
  satisfactionLevel  : { type: String },
  specialty  : { type: String },
  sub_specialty: { type: String },
  state: { type: String },
  would_choose_specialty_again  : { type: String },
  yearsOfExperience  : { type: Number },
  insights_improvement :{type:String},
  insights_work_life_balance  :{type:String},
  production_percentage  :{type:String},
   compensation_type  :{type:String}
}, {
  timestamps: true,
});

export const Salary = mongoose.model("Salary", salarySchema);
