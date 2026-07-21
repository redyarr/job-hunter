/**
 * Single source of truth for the user's professional profile.
 * Used by the AI provider to judge relevance/match, and to generate
 * application emails. Edit this file directly to keep it current —
 * do not duplicate this data anywhere else in the codebase.
 */

export interface Profile {
  name: string;
  location: string;
  summary: string;
  skills: {
    softwareDevelopment: string[];
    dataAndAnalytics: string[];
  };
  education: string[];
  teachingExperience: string[];
  workExperience: string[];
  preferredCategories: string[];
  cvPath: string;
}

export const profile: Profile = {
  name: "Redyar Hawzhin",

  location: "Sulaymaniyah, Kurdistan Region, Iraq",

  summary:
    "Backend web developer and data/analytics professional, also active as an " +
    "IT lecturer and technical instructor. Comfortable across Node.js backend " +
    "development, SQL/BI reporting, and teaching technical concepts.",

  skills: {
    softwareDevelopment: [
      "Node.js",
      "Express.js",
      "JavaScript",
      "TypeScript",
      "REST APIs",
      "MySQL",
      "Sequelize",
      "SQL",
      "EJS",
      "React",
      "Web development",
      "API development",
    ],
    dataAndAnalytics: [
      "SQL",
      "Data Analysis",
      "Data Analytics",
      "Business Intelligence concepts",
      "Data visualization",
      "Reporting",
      "Working with databases",
      "Python for data analysis",
      "Tableau",
      "Excel / data-related work",
    ],
  },

  education: ["IT / software development background (see CV for detail)"],

  teachingExperience: [
    "Teaching IT",
    "Teaching programming",
    "Teaching web development",
    "Teaching English",
    "Explaining technical concepts to students",
  ],

  workExperience: [
    // Kept intentionally general here — the AI should not invent detail
    // beyond what's in the CV itself. Update with real employers/dates
    // as needed for higher-fidelity matching.
  ],

  preferredCategories: [
    "Backend Developer",
    "Data Analyst",
    "Business Intelligence Analyst",
    "IT / Programming Instructor",
  ],

  cvPath: process.env.CV_PATH ?? "./data/cv/my-cv.pdf",
};
