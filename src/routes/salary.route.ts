import express, { Request, Response } from "express";
import { Salary } from "../config/models/salary.model";
import { Email } from "../config/models/email.model";
import { PipelineStage } from "mongoose";
import { sendSurveyEmail } from "../services/mailer";
const router = express.Router();

// Define the expected query parameters with optional fields
interface SalarySearchQuery {
  specialty?: string;
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

  const stopWords = new Set(["and", "or", "of", "in", "on", "the", "a", "an"]);

  return specialty
    .split("-")
    .map((word, index) => {
      const lower = word.toLowerCase();
      // Always capitalize the first word, even if it's a stop word
      if (index === 0 || !stopWords.has(lower)) {
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      }
      return lower;
    })
    .join(" ");
}

// POST: Submit salary
router.post("/submit-salary", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const newSalary = new Salary(req.body);
      const result = await sendSurveyEmail(newSalary);
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
        specialty,
        subspeciality,
        state,
        practice,
        page = "1",
        limit = "10",
      } = req.query;
      
      const query: Record<string, any> = {};
      if (specialty) query.specialty = specialty;
      // if (subspeciality) query.sub_specialty = subspeciality;
      if (state) query.state = state;
      if (practice) query.practiceSetting = practice;

      const pageNumber = parseInt(page, 10);
      const limitNumber = parseInt(limit, 10);
      const skip = (pageNumber - 1) * limitNumber;

      const [
        salaries,
        total,
        groupedSummary,
        overallSummary,
        avgHourlySummary,
        totalParsedSummary,
      ] = await Promise.all([
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
        Salary.aggregate([
          { $match: query },
          {
            $group: {
              _id: null,
              avgHourlyRate: {
                $avg: {
                  $cond: [
                    {
                      $and: [
                        { $gt: ["$base_salary", 0] },
                        { $gt: ["$hoursWorked", 0] },
                      ],
                    },
                    { $divide: ["$base_salary", "$hoursWorked"] },
                    null,
                  ],
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              avgHourlyRate: { $round: ["$avgHourlyRate", 2] },
            },
          },
        ]),
        Salary.aggregate([
          {
            $match: {
              ...query,
              base_salary: { $gt: 0 },
              hoursWorked: { $gt: 0 },
            },
          },
          {
            $count: "totalParsed",
          },
        ]),

        // SALARY PERCENTILES
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
      type CustomGroupStage = {
        $group: {
          _id: any;
          percentiles: {
            $percentile: {
              input: string;
              method: "approximate" | "continuous";
              p: number[];
            };
          };
        };
      };
      const percentilePipeline: PipelineStage[] = [
        { $match: query },
        {
          // 👇 assert type using our override
          $group: {
            _id: null,
            percentiles: {
              $percentile: {
                input: "$base_salary",
                method: "approximate",
                p: [0.1, 0.25, 0.5, 0.75, 0.9],
              },
            },
          },
        } as unknown as CustomGroupStage, // 👈 assert type
        {
          $project: {
            _id: 0,
            p10: { $round: [{ $arrayElemAt: ["$percentiles", 0] }, 0] },
            p25: { $round: [{ $arrayElemAt: ["$percentiles", 1] }, 0] },
            p50: { $round: [{ $arrayElemAt: ["$percentiles", 2] }, 0] },
            p75: { $round: [{ $arrayElemAt: ["$percentiles", 3] }, 0] },
            p90: { $round: [{ $arrayElemAt: ["$percentiles", 4] }, 0] },
          },
        },
      ];

      const percentile = await Salary.aggregate(percentilePipeline);

      res.status(200).json({
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
        data: salaries,
        summary: groupedSummary,
        overallSummary: overallSummary[0] || null,
        topSatisfactionSpecialties: topSpecialties,
        percentile: percentile[0],
        avgHourlyRate: avgHourlySummary[0]?.avgHourlyRate || null,
        totalParsed: totalParsedSummary[0]?.totalParsed || 0,
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
    console.log(match);

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

// router.get("/compensation-analysis", async (req: Request, res: Response) => {
router.get("/compensation-analysis", async (req: Request, res: Response) => {
  // console.log(req.query, 'request query');
  
  try {
    const { specialty, state, practice, compensation } = req.query;

    // if (!specialty || !compensation) {
    //   return res.status(400).json({ error: "Specialty and compensation are required." });
    // }

    const query: Record<string, any> = { specialty };
    if (state) query.state = state;
    if (practice) query.practiceSetting = practice;

    const parsedComp = parseFloat(compensation as string);

    const [percentilesResult, avgResult, parsedCountResult] = await Promise.all([
      Salary.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            percentiles: {
              //@ts-ignore
              $percentile: {
                input: "$base_salary",
                method: "approximate",
                p: [0.1, 0.25, 0.5, 0.75, 0.9],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            p10: { $round: [{ $arrayElemAt: ["$percentiles", 0] }, 0] },
            p25: { $round: [{ $arrayElemAt: ["$percentiles", 1] }, 0] },
            p50: { $round: [{ $arrayElemAt: ["$percentiles", 2] }, 0] },
            p75: { $round: [{ $arrayElemAt: ["$percentiles", 3] }, 0] },
            p90: { $round: [{ $arrayElemAt: ["$percentiles", 4] }, 0] },
          },
        },
      ]),
      Salary.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            avgSalary: { $avg: "$base_salary" },
          },
        },
        {
          $project: {
            _id: 0,
            avgSalary: { $round: ["$avgSalary", 0] },
          },
        },
      ]),
      Salary.aggregate([
        {
          $match: {
            ...query,
            base_salary: { $gt: 0 },
          },
        },
        { $count: "parsedCount" },
      ]),
    ]);

    const percentiles = percentilesResult[0] || {};
    const avgSalary = avgResult[0]?.avgSalary || 0;
    const totalParsed = parsedCountResult[0]?.parsedCount || 0;

    const { p10 = 0, p25 = 0, p50 = 0, p75 = 0, p90 = 0 } = percentiles;

    let percentileLabel = "Top";
    if (parsedComp <= p10) percentileLabel = "Bottom";
    else if (parsedComp <= p25) percentileLabel = "10th–25th";
    else if (parsedComp <= p50) percentileLabel = "25th–50th";
    else if (parsedComp <= p75) percentileLabel = "50th–75th";
    else if (parsedComp <= p90) percentileLabel = "75th–90th";

    let grade = "C";
    const ratio = avgSalary ? parsedComp / avgSalary : 0;

    if (ratio >= 1.2) grade = "A+";
    else if (ratio >= 1.0) grade = "A";
    else if (ratio >= 0.9) grade = "B";
    else if (ratio >= 0.75) grade = "C";
    else grade = "D";

    res.status(200).json({
      yourCompensation: parsedComp,
      marketAverage: avgSalary,
      percentileLabel,
      grade,
      totalParsed,
      percentiles,
    });
  } catch (err) {
    console.error("Error in compensation analysis:", err);
    res.status(500).json({ error: "Failed to analyze compensation" });
  }
});

router.get("/salary-count", async (req: Request, res: Response) => {

  try {
    const count = await Salary.countDocuments();
    res.status(200).json({ count });
  } catch (err) {
    console.error("Error fetching salary count:", err);
    res.status(500).json({ error: "Failed to retrieve salary count" });
  }




})


export default router;
