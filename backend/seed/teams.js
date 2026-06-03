/**
 * Seed teams — 3 active teams with members and project links
 * Emails resolved to IDs by seed.js
 */
const SEED_TEAMS = [
  {
    name:           'Code Warriors',
    description:    'Building an AI-powered resume analyzer to help job seekers optimize their CVs for ATS systems. We combine MERN stack with Gemini AI integration.',
    projectType:    'ai-ml',
    requiredSkills: ['Python', 'Machine Learning', 'TensorFlow'],
    maxMembers:     5,
    status:         'recruiting',
    tags:           ['AI', 'Resume', 'MERN', 'Hackathon'],
    leaderEmail:    'shivam.gupta@gmail.com',
    memberEmails:   ['shivam.gupta@gmail.com', 'adnan.khan@gmail.com'],
    projectTitle:   'AI Resume Analyzer',
  },
  {
    name:           'HackMasters',
    description:    'Creating the ultimate hackathon team finder platform. We need UI/UX experts and frontend developers to make the experience seamless and beautiful.',
    projectType:    'web-development',
    requiredSkills: ['UI/UX', 'Figma', 'Tailwind CSS'],
    maxMembers:     4,
    status:         'recruiting',
    tags:           ['Hackathon', 'Web', 'Frontend', 'Product'],
    leaderEmail:    'shivam.gupta@gmail.com',
    memberEmails:   ['shivam.gupta@gmail.com', 'priya.mehta@gmail.com'],
    projectTitle:   'Hackathon Team Finder',
  },
  {
    name:           'SecureX',
    description:    'Developing a next-generation cyber threat detection platform for cloud environments. Looking for backend engineers and cloud architects.',
    projectType:    'cybersecurity',
    requiredSkills: ['Cloud Security', 'Java', 'Spring Boot', 'System Design'],
    maxMembers:     3,
    status:         'recruiting',
    tags:           ['Security', 'Cloud', 'Enterprise', 'Python'],
    leaderEmail:    'rahul.verma@gmail.com',
    memberEmails:   ['rahul.verma@gmail.com'],
    projectTitle:   'Cyber Threat Detection Platform',
  },
];

module.exports = SEED_TEAMS;
