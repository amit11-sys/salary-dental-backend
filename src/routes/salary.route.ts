import express, { Request, Response } from "express";
import { Salary } from "../config/models/salary.model";

const router = express.Router();

// Define the expected query parameters with optional fields
interface SalarySearchQuery {
  speciality?: string;
  subspeciality?: string;
  state?: string;
  practice?: string;
  page?: string; // from query, so it's a string
  limit?: string;
}

interface AllSalaryQuery {
  specialty?: string;
  subspeciality?: string;
  state?: string;
  practiceSetting?: string;
  page?: string; // from query, so it's a string
  limit?: string;
  experience?: string;
  minSalary?: string;
  maxSalary?: string;
  satisfaction?: string;
}

// POST: Submit salary
router.post("/submit-salary", async (req: Request, res: Response) => {
  try {
    const newSalary = new Salary(req.body);
    const savedSalary = await newSalary.save();
    res.status(201).json(savedSalary);
  } catch (err) {
    console.error("Error saving salary record:", err);
    res.status(400).json({ error: "Failed to create salary record" });
  }
});

// GET: Search salaries with optional filters and pagination
// router.get("/search-salaries", async (req: Request<{}, {}, {}, SalarySearchQuery>, res: Response) => {
//   try {
//     const {
//       speciality,
//       subspeciality,
//       state,
//       practice,
//       page = "1",
//       limit = "50",
//     } = req.query;

//     const query: Record<string, any> = {};

//     if (speciality) query.speciality = speciality;
//     if (subspeciality) query.subspeciality = subspeciality;
//     if (state) query.state = state;
//     if (practice) query.practice = practice;

//     const pageNumber = parseInt(page, 10);
//     const limitNumber = parseInt(limit, 10);
//     const skip = (pageNumber - 1) * limitNumber;

//     const [salaries, total] = await Promise.all([
//       Salary.find(query).skip(skip).limit(limitNumber),
//       Salary.countDocuments(query),
//     ]);

//     res.status(200).json({
//       total,
//       page: pageNumber,
//       limit: limitNumber,
//       totalPages: Math.ceil(total / limitNumber),
//       data: salaries,
//     });
//   } catch (err) {
//     console.error("Error fetching salary records:", err);
//     res.status(500).json({ error: "Failed to retrieve salary records" });
//   }
// });

// router.get("/summary", async (req:any, res:any) => {
//   try {
//     const { practiceSetting } = req.query;

//     const match: any = {};
//     if (practiceSetting) {
//       match.practiceSetting = practiceSetting;
//     }

//     const result = await Salary.aggregate([
//       { $match: match },
//       {
//         $group: {
//           _id: null,
//           totalCompensation: {
//             $sum: { $add: ["$base_salary", { $ifNull: ["$bonus", 0] }] }
//           },
//           submissionCount: { $sum: 1 }
//         }
//       }
//     ]);

//     if (result.length === 0) {
//       return res.json({ totalCompensation: 0, submissionCount: 0 });
//     }

//     const { totalCompensation, submissionCount } = result[0];
//     res.json({ totalCompensation, submissionCount });

//   } catch (err) {
//     console.error("Error in summary endpoint:", err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

router.get(
  "/search-salaries",
  async (req: Request<{}, {}, {}, SalarySearchQuery>, res: Response) => {
    try {
      const {
        speciality,
        subspeciality,
        state,
        practice,
        page = "1",
        limit = "10",
      } = req.query;

      const query: Record<string, any> = {};
      if (speciality) query.specialty = speciality;
      if (subspeciality) query.sub_specialty = subspeciality;
      if (state) query.state = state;
      if (practice) query.practiceSetting = practice;

      const pageNumber = parseInt(page, 10);
      const limitNumber = parseInt(limit, 10);
      const skip = (pageNumber - 1) * limitNumber;

      const [salaries, total, groupedSummary, overallSummary] =
        await Promise.all([
          Salary.find(query).skip(skip).limit(limitNumber),
          Salary.countDocuments(query),

          // GROUPED SUMMARY: by practiceSetting
          Salary.aggregate([
            { $match: query },
            {
              $group: {
                _id: "$practiceSetting",
                avgBaseSalary: { $avg: "$base_salary" },
                avgBonus: { $avg: "$bonus" },
                avgTotalCompensation: {
                  $avg: { $add: ["$base_salary", { $ifNull: ["$bonus", 0] }] },
                },
                avgWorkload: { $avg: "$hoursWorked" },
                total: { $sum: 1 },
                wouldChooseAgainCount: {
                  $sum: {
                    $cond: [{ $eq: ["$chooseSpecialty", "yes"] }, 1, 0],
                  },
                },
              },
            },
            {
              $project: {
                practiceSetting: "$_id",
                avgBaseSalary: { $round: ["$avgBaseSalary", 0] },
                avgBonus: { $round: ["$avgBonus", 0] },
                avgTotalCompensation: { $round: ["$avgTotalCompensation", 0] },
                avgWorkload: { $round: ["$avgWorkload", 0] },
                wouldChooseAgainPercent: {
                  $cond: [
                    { $eq: ["$total", 0] },
                    0,
                    {
                      $round: [
                        {
                          $multiply: [
                            { $divide: ["$wouldChooseAgainCount", "$total"] },
                            100,
                          ],
                        },
                        0,
                      ],
                    },
                  ],
                },
                submissionCount: "$total",
                _id: 0,
              },
            },
          ]),

          // OVERALL SUMMARY: no grouping
          Salary.aggregate([
            { $match: query },
            {
              $group: {
                _id: null,
                avgBaseSalary: { $avg: "$base_salary" },
                avgBonus: { $avg: "$bonus" },
                avgTotalCompensation: {
                  $avg: { $add: ["$base_salary", { $ifNull: ["$bonus", 0] }] },
                },
                avgWorkload: { $avg: "$hoursWorked" },
                total: { $sum: 1 },
                wouldChooseAgainCount: {
                  $sum: {
                    $cond: [{ $eq: ["$chooseSpecialty", "yes"] }, 1, 0],
                  },
                },
              },
            },
            {
              $project: {
                avgBaseSalary: { $round: ["$avgBaseSalary", 0] },
                avgBonus: { $round: ["$avgBonus", 0] },
                avgTotalCompensation: { $round: ["$avgTotalCompensation", 0] },
                avgWorkload: { $round: ["$avgWorkload", 0] },
                wouldChooseAgainPercent: {
                  $cond: [
                    { $eq: ["$total", 0] },
                    0,
                    {
                      $round: [
                        {
                          $multiply: [
                            { $divide: ["$wouldChooseAgainCount", "$total"] },
                            100,
                          ],
                        },
                        0,
                      ],
                    },
                  ],
                },
                submissionCount: "$total",
                _id: 0,
              },
            },
          ]),
        ]);
      const topSpecialties = await Salary.aggregate([
        {
          $match: {
            satisfactionLevel: { $in: ["1", "2", "3", "4", "5"] },
          },
        },
        {
          $group: {
            _id: "$specialty",
            averageSatisfactionLevel: {
              $avg: { $toDouble: "$satisfactionLevel" },
            },
            submissionCount: { $sum: 1 },
          },
        },
        { $sort: { averageSatisfactionLevel: -1 } },
        { $limit: 5 },
        {
          $project: {
            specialty: "$_id",
            averageSatisfactionLevel: 1,
            submissionCount: 1,
            _id: 0,
          },
        },
      ]);
      res.status(200).json({
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
        data: salaries,
        summary: groupedSummary,
        overallSummary: overallSummary[0] || null,
        topSatisfactionSpecialties: topSpecialties,
      });
    } catch (err) {
      console.error("Error fetching salary records:", err);
      res.status(500).json({ error: "Failed to retrieve salary records" });
    }
  }
);

router.get(
  "/all-salaries",
  async (req: Request<{}, {}, {}, AllSalaryQuery>, res: Response) => {
    try {
      const {
        specialty,
        experience,
        practiceSetting,
        page = "1",
        limit = "10",
        minSalary,
        maxSalary,
        satisfaction,
      } = req.query;
      console.log(minSalary, typeof minSalary, maxSalary, typeof maxSalary);
      
      const query: Record<string, any> = {};

      // Filters
      if (specialty) query.specialty = specialty;
      if (practiceSetting) query.practiceSetting = practiceSetting;

      // Experience range filter
      if (experience) {
        const match = experience.match(/^(\d+)(?:-(\d+))?/);
        if (match) {
          const min = parseInt(match[1], 10);
          const max = match[2] ? parseInt(match[2], 10) : null;

          query.yearsOfExperience = max
            ? { $gte: min, $lte: max }
            : { $gte: min }; // for "26+ years"
        }
      }

      // Min salary
      if (minSalary) {
        query.base_salary = query.base_salary || {};
        query.base_salary.$gte = parseInt(minSalary as string, 10);
      }

      // Max salary
      if (maxSalary) {
        query.base_salary = query.base_salary || {};
        query.base_salary.$lte = parseInt(maxSalary as string, 10);
      }

      // Satisfaction Score filter (1-5 scale)
      if (satisfaction) {
        query.satisfactionLevel = parseInt(satisfaction as string, 10);
      }

      // Pagination
      const pageNumber = parseInt(page as string, 10);
      const limitNumber = parseInt(limit as string, 10);
      const skip = (pageNumber - 1) * limitNumber;

      // Fetch data
      const [salaries, total] = await Promise.all([
        Salary.find(query).skip(skip).limit(limitNumber),
        Salary.countDocuments(query),
      ]);

      res.status(200).json({
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
        data: salaries,
      });
    } catch (err) {
      console.error("Error fetching salary records:", err);
      res.status(500).json({ error: "Failed to retrieve salary records" });
    }
  }
);

export default router;
