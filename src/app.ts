import express from 'express';
import cors from 'cors'
import specialityRoutes from './routes/speciality.route';
import salaryRoutes from './routes/salary.route';
import contactRoutes from './routes/contact.route';
import feedbackRoutes from './routes/feedback.route';
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/speciality', specialityRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/feedback', feedbackRoutes);

export default app;
