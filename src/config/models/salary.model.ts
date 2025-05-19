import mongoose from "mongoose";

const salarySchema = new mongoose.Schema({
  base_salary: { type: Number, required: true },
  bonus: { type: Number, required: false },
  chooseSpecialty: {
    type: String,
    enum: ["yes", "no"],
    required: true,
  },
  city: { type: String, required: true },
  email: {
    type: String,
    required: true,
    match: /.+\@.+\..+/, // basic email pattern
  },
  hoursWorked: { type: Number, required: true },
  practiceSetting: { type: String, required: true },
  ptoWeeks: { type: Number, required: false },
  rating: { type: Number, min: 1, max: 5, required: true },
  satisfactionLevel: { type: String, required: true },
  specialty: { type: String, required: true },
  sub_specialty: { type: String },
  state: { type: String, required: true },
  yearsOfExperience: { type: Number, required: true },
}, {
  timestamps: true,
});

export const Salary = mongoose.model("Salary", salarySchema);
