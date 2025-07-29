import nodemailer from "nodemailer"
import { generateSurveyDataEmail } from "../utils/salry"; // adjust path as needed

export const sendSurveyEmail = async (data: any) => {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    // console.log(transporter, "Transporter created");
    
    const mailOptions = {
      from: `"Submitted Salary" <${process.env.EMAIL_USER}>`,
      to: process.env.RECIEVER_EMAIL, // recipient email
      subject: 'New Dentist Survey Submission',
      html: generateSurveyDataEmail(data),
    };
// console.log(mailOptions, "Mail Options Created" );

    const info = await transporter.sendMail(mailOptions);
    // console.log('Email sent: ', info.messageId);
    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error };
  }
};




















