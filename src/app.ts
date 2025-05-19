import express from 'express';
import cors from 'cors'
import specialityRoutes from './routes/speciality.route';
import salaryRoutes from './routes/salary.route';
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/speciality', specialityRoutes);
app.use('/api/salary', salaryRoutes);

export default app;
