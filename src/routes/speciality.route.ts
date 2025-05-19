import { Router } from 'express';
import { Speciality } from '../config/models/speciality.model';

const router = Router();

router.get('/', async (req, res) => {
    const searchQuery = req?.query?.key || '';
  
    try {
      const users = await Speciality.find({
        speciality: { $regex: searchQuery }, // partial, case-insensitive match
      }).limit(10); // Optional: limit results
  // console.log(users);
  
      res.json(users); // Return array of names only
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Something went wrong' });
    }
  });
  

export default router;
