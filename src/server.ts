import app from './app';
import { connectDB } from './config/db';
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Use default port if not defined
const PORT = Number(process.env.PORT) || 5000;

// Connect to database
connectDB();

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('Server running');
});
