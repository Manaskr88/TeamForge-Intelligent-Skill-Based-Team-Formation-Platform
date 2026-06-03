/**
 * Seed projects — 5 realistic project listings
 * owner will be resolved to userId by seed.js
 */
const SEED_PROJECTS = [
  {
    title:          'AI Resume Analyzer',
    description:    'An AI-powered ATS resume analyzer that scores resumes, suggests improvements, and integrates Gemini API for smart analysis. Perfect for job seekers who want to stand out.',
    category:       'ai-ml',
    requiredSkills: ['React', 'Node.js', 'MongoDB', 'Gemini API'],
    difficulty:     'intermediate',
    status:         'open',
    maxTeamSize:    4,
    tags:           ['AI', 'Resume', 'Hackathon', 'React'],
    isHackathon:    true,
    ownerEmail:     'shivam.gupta@gmail.com',
  },
  {
    title:          'Smart Healthcare Assistant',
    description:    'An AI-powered healthcare recommendation system that suggests treatments, tracks symptoms, and provides personalized health insights using machine learning models.',
    category:       'ai-ml',
    requiredSkills: ['Python', 'Machine Learning', 'Flask'],
    difficulty:     'advanced',
    status:         'open',
    maxTeamSize:    5,
    tags:           ['Healthcare', 'AI', 'ML', 'Python'],
    isHackathon:    false,
    ownerEmail:     'divyanshu.sharma@gmail.com',
  },
  {
    title:          'Hackathon Team Finder',
    description:    'A platform for discovering and forming hackathon teams based on skills, experience, and project interests. Features real-time matching and AI-powered recommendations.',
    category:       'web-development',
    requiredSkills: ['React', 'Express.js', 'MongoDB'],
    difficulty:     'intermediate',
    status:         'open',
    maxTeamSize:    4,
    tags:           ['Hackathon', 'Web App', 'MERN', 'Team Building'],
    isHackathon:    false,
    ownerEmail:     'shivam.gupta@gmail.com',
  },
  {
    title:          'Cyber Threat Detection Platform',
    description:    'An enterprise-grade real-time threat monitoring and detection system for cloud infrastructure. Uses ML models to identify anomalies and alert security teams.',
    category:       'cybersecurity',
    requiredSkills: ['Cyber Security', 'Python', 'Cloud Security'],
    difficulty:     'advanced',
    status:         'open',
    maxTeamSize:    3,
    tags:           ['Cybersecurity', 'Cloud', 'ML', 'Enterprise'],
    isHackathon:    false,
    ownerEmail:     'rahul.verma@gmail.com',
  },
  {
    title:          'Startup Idea Validator',
    description:    'Validate startup ideas using AI analysis, market research, competitor data, and user feedback collection. Helps entrepreneurs make data-driven decisions before building.',
    category:       'ai-ml',
    requiredSkills: ['Product Management', 'Analytics', 'React'],
    difficulty:     'intermediate',
    status:         'open',
    maxTeamSize:    4,
    tags:           ['Startup', 'Product', 'AI', 'Analytics'],
    isHackathon:    true,
    ownerEmail:     'priya.mehta@gmail.com',
  },
];

module.exports = SEED_PROJECTS;
