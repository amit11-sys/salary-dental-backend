import express, { Request, Response } from "express";
import { Salary } from "../config/models/salary.model";
import { Email } from "../config/models/email.model";
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
function formatSpecialty(specialty: any) {
  if (typeof specialty !== "string") return specialty;

  return specialty
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join("-");
}
// POST: Submit salary
router.post("/submit-salary", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const newSalary = new Salary(req.body);
    const savedSalary = await newSalary.save();
    if (email) {
      await Email.updateOne(
        { email },
        { $setOnInsert: { email } },
        { upsert: true }
      );
    }
    res.status(201).json(savedSalary);
  } catch (err) {
    console.error("Error saving salary record:", err);
    res.status(400).json({ error: "Failed to create salary record" });
  }
});

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
      // console.log(minSalary, typeof minSalary, maxSalary, typeof maxSalary);

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

router.get("/specialty-stats", async (req: Request, res: Response) => {
  try {
    const { specialty, practiceSetting } = req.query;

    const match: Record<string, any> = {
      satisfactionLevel: { $in: ["1", "2", "3", "4", "5"] },
    };

    if (specialty) match.specialty = specialty;
    if (practiceSetting) match.practiceSetting = practiceSetting;

    const result = await Salary.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$specialty",
          avgBaseSalary: { $avg: "$base_salary" },
          allSalaries: { $push: "$base_salary" },
          avgHoursWorked: { $avg: "$hoursWorked" },
          avgSatisfaction: {
            $avg: { $toDouble: "$satisfactionLevel" },
          },
          submissionCount: { $sum: 1 },
        },
      },
      {
        $project: {
          specialty: "$_id",
          averageBaseSalary: { $round: ["$avgBaseSalary", 0] },
          medianBaseSalary: {
            $let: {
              vars: {
                sortedSalaries: {
                  $sortArray: {
                    input: "$allSalaries",
                    sortBy: { $asc: 1 },
                  },
                },
                count: { $size: "$allSalaries" },
              },
              in: {
                $cond: [
                  { $eq: [{ $mod: ["$$count", 2] }, 0] },
                  {
                    $avg: [
                      {
                        $arrayElemAt: [
                          "$$sortedSalaries",
                          { $subtract: [{ $divide: ["$$count", 2] }, 1] },
                        ],
                      },
                      {
                        $arrayElemAt: [
                          "$$sortedSalaries",
                          { $divide: ["$$count", 2] },
                        ],
                      },
                    ],
                  },
                  {
                    $arrayElemAt: [
                      "$$sortedSalaries",
                      { $floor: { $divide: ["$$count", 2] } },
                    ],
                  },
                ],
              },
            },
          },
          averageHoursWorked: { $round: ["$avgHoursWorked", 1] },
          averageSatisfactionLevel: { $round: ["$avgSatisfaction", 1] },
          salarySubmissionCount: "$submissionCount",
          _id: 0,
        },
      },

      { $sort: { salarySubmissionCount: -1 } },
    ]);

    res.status(200).json(result);
  } catch (error) {
    console.error("Error generating specialty stats:", error);
    res.status(500).json({ error: "Failed to get specialty stats" });
  }
});

router.get("/stats-by-speciality", async (req: Request, res: Response) => {
  try {
    const { specialty } = req.query;
    const match: any = {};
      match.specialty = formatSpecialty(specialty);
    // console.log(match);

    // if (practiceSetting) match.practiceSetting = practiceSetting;

    const stats = await Salary.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$speciality",
          avgSalary: { $avg: "$base_salary" },
          medianList: { $push: "$base_salary" },
          totalSubmissions: { $sum: 1 },
          avgHoursWorked: { $avg: "$hoursWorked" },
          satisfactionYesCount: {
            $sum: { $cond: [{ $eq: ["$chooseSpecialty", "yes"] }, 1, 0] },
          },
          avgSatisfactionLevel: {
            $avg: {
              $cond: [
                {
                  $regexMatch: {
                    input: "$satisfactionLevel",
                    regex: /^[1-5]$/,
                  },
                },
                { $toDouble: "$satisfactionLevel" },
                null,
              ],
            },
          },
        },
      },
      {
        $project: {
          specialty: "$_id",
          avgSalary: { $round: ["$avgSalary", 0] },
          medianSalary: {
            $let: {
              vars: {
                sorted: {
                  $sortArray: {
                    input: "$medianList",
                    sortBy: { $asc: 1 }, // or use: { $descending: -1 }
                  },
                },
                count: { $size: "$medianList" },
              },
              in: {
                $cond: [
                  { $eq: [{ $mod: ["$$count", 2] }, 0] },
                  {
                    $avg: [
                      {
                        $arrayElemAt: [
                          "$$sorted",
                          { $subtract: [{ $divide: ["$$count", 2] }, 1] },
                        ],
                      },
                      {
                        $arrayElemAt: ["$$sorted", { $divide: ["$$count", 2] }],
                      },
                    ],
                  },
                  {
                    $arrayElemAt: [
                      "$$sorted",
                      { $floor: { $divide: ["$$count", 2] } },
                    ],
                  },
                ],
              },
            },
          },
          avgWorkWeek: { $round: ["$avgHoursWorked", 1] },
          satisfactionPercentage: {
            $cond: [
              { $eq: ["$totalSubmissions", 0] },
              0,
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: ["$satisfactionYesCount", "$totalSubmissions"],
                      },
                      100,
                    ],
                  },
                  0,
                ],
              },
            ],
          },
          avgSatisfactionRating: { $round: ["$avgSatisfactionLevel", 1] },
          totalSubmissions: 1,
          medianMonthlySalary: {
            $round: [{ $divide: ["$medianSalary", 12] }, 0],
          },
          medianHourlyWage: {
            $round: [
              {
                $divide: [
                  "$medianSalary",
                  { $multiply: ["$avgHoursWorked", 52] },
                ],
              },
              2,
            ],
          },
          _id: 0,
        },
      },
    ]);
    // console.log(stats, 'adssdaads');

    res.status(200).json(stats);
  } catch (err) {
    console.error("Error in /specialty-stats:", err);
    res.status(500).json({ error: "Failed to generate specialty statistics" });
  }
});

router.get("/speciality-insights", async (req: Request, res: Response) => {
  try {
    const { specialty } = req.query;
     const match: any = {};

      match.specialty = formatSpecialty(specialty);

    const results = await Salary.aggregate([
      { $match: match },
      {
        $facet: {
          overallStats: [
            {
              $group: {
                _id: null,
                totalSubmissions: { $sum: 1 },
                avgYearSalary: {
                  $avg: {
                    $add: ["$base_salary", { $ifNull: ["$bonus", 0] }],
                  },
                },
              },
            },
            {
              $project: {
                _id: 0,
                totalSubmissions: 1,
                avgYearSalary: { $round: ["$avgYearSalary", 0] },
              },
            },
          ],
          reportsByState: [
            {
              $group: {
                _id: "$state",
                totalSubmissions: { $sum: 1 },
                avgYearSalary: {
                  $avg: {
                    $add: ["$base_salary", { $ifNull: ["$bonus", 0] }],
                  },
                },
              },
            },
            {
              $project: {
                state: "$_id",
                totalSubmissions: 1,
                avgYearSalary: { $round: ["$avgYearSalary", 0] },
                _id: 0,
              },
            },
            { $sort: { totalSubmissions: -1 } },
          ],
          reportsByPractice: [
            {
              $group: {
                _id: "$practiceSetting",
                totalSubmissions: { $sum: 1 },
                avgYearSalary: {
                  $avg: {
                    $add: ["$base_salary", { $ifNull: ["$bonus", 0] }],
                  },
                },
              },
            },
            {
              $project: {
                practiceSetting: "$_id",
                totalSubmissions: 1,
                avgYearSalary: { $round: ["$avgYearSalary", 0] },
                _id: 0,
              },
            },
            { $sort: { totalSubmissions: -1 } },
          ],
        },
      },
    ]);

    const overallStats = results[0]?.overallStats?.[0] || {
      totalSubmissions: 0,
      avgYearSalary: 0,
    };

    res.status(200).json({
      ...overallStats,
      reportsByState: results[0].reportsByState,
      reportsByPractice: results[0].reportsByPractice,
    });
  } catch (err) {
    console.error("Error in /speciality-insights:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


export default router;
