export const generateSurveyDataEmail = (data: {
  specialty: string;
  yearsOfExperience: number;
  state: string;
  city: string;
  practiceSetting: string;
  compensation_type: string;
  base_salary: number;
  hoursWorked: number;
  ptoWeeks: number;
  satisfactionLevel?: string;
   would_choose_specialty_again?: string;
  insights_improvement?: string;
  insights_work_life_balance?: string;
  production_percentage?: string;
}) => {
  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #F4F4F4; padding: 20px;">
        <div style="max-width: 800px; margin: auto; background-color: #FFFFFF; padding: 30px; border-radius: 8px;">
          <h2 style="margin-bottom: 20px;">New Dentist Survey Submission</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tbody>
              <tr><td><strong>Specialty</strong></td><td>${
                data.specialty
              }</td></tr>
              <tr><td><strong>Years of Experience</strong></td><td>${
                data.yearsOfExperience
              }</td></tr>
              <tr><td><strong>State</strong></td><td>${data.state}</td></tr>
              <tr><td><strong>City</strong></td><td>${data.city}</td></tr>
              <tr><td><strong>Practice Setting</strong></td><td>${
                data.practiceSetting
              }</td></tr>
              <tr><td><strong>Compensation Type</strong></td><td>${
                data.compensation_type
              }</td></tr>
              <tr><td><strong>Annual Base Salary</strong></td><td>$${data.base_salary.toLocaleString()}</td></tr>
              <tr><td><strong>Average Hours/Week</strong></td><td>${
                data.hoursWorked
              }</td></tr>
              <tr><td><strong>PTO Weeks</strong></td><td>${
                data.ptoWeeks
              }</td></tr>
              <tr><td><strong>Satisfaction Level</strong></td><td>${
                data.satisfactionLevel || "-"
              }</td></tr>
              <tr><td><strong>Choose Specialty Again</strong></td><td>${
                data.would_choose_specialty_again|| "-"
              }</td></tr>
              <tr><td><strong>Improvement Insight</strong></td><td>${
                data.insights_improvement || "-"
              }</td></tr>
              <tr><td><strong>Work-Life Balance</strong></td><td>${
                data.insights_work_life_balance || "-"
              }</td></tr>
              <tr><td><strong>Production %</strong></td><td>${
                data.production_percentage || "-"
              }</td></tr>
            </tbody>
          </table>
        </div>
      </body>
    </html>
  `;
};
