import mongoose from "mongoose";

const salarySchema = new mongoose.Schema({
  annual_base_salary: { type: Number },
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
  average_hours_per_week: { type: Number },
  practice_setting : { type: String },
  paid_time_off_weeks  : { type: Number, },
  rating: { type: Number, min: 1, max: 5 },
  job_satisfaction_level  : { type: String },
  specialty  : { type: String },
  sub_specialty: { type: String },
  state: { type: String },
  would_choose_specialty_again  : { type: String },
  years_of_experience  : { type: Number },
  insights_improvement :{type:String},
  insights_work_life_balance  :{type:String},
  production_percentage  :{type:String}
}, {
  timestamps: true,
});

export const Salary = mongoose.model("Salary", salarySchema);
