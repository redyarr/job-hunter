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
    "Software developer (Backend & Fullstack), Data & Analytics professional, and " +
    "IT/Programming lecturer & technical instructor. Experienced in programming, " +
    "web development, database management, SQL/BI reporting, and technical instruction.",

  skills: {
    softwareDevelopment: [
      "Software Development",
      "Programming",
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
      "Web Development",
      "API Development",
      "Python",
    ],
    dataAndAnalytics: [
      "Data Analysis",
      "Data Analytics",
      "Business Intelligence (BI)",
      "SQL",
      "Data Visualization",
      "Reporting & Dashboards",
      "Database Management",
      "Python for Data Analysis",
      "Tableau",
      "Excel / Advanced Data Work",
    ],
  },

  education: ["IT / Software Development background"],

  teachingExperience: [
    "Teaching IT & Technical Subjects",
    "Teaching Programming & Web Development",
    "Teaching English",
    "Explaining technical concepts",
  ],

  workExperience: [],

  preferredCategories: [
    "Programming & Software Development (Backend, Web, Fullstack)",
    "Data & Analytics (Data Analyst, BI Analyst, Data Specialist)",
    "IT & Technical Roles (IT Assistant, IT Support, Tech Specialist - excluding Network/CCTV)",
    "IT / Programming Instructor & Lecturer",
  ],

  cvPath: process.env.CV_PATH ?? "./data/cv/my-cv.pdf",
};
