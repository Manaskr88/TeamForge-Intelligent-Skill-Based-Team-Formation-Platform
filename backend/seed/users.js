/**
 * Seed users — 6 realistic developer profiles
 * Password for all users: read from SEED_PASSWORD env var, default SEED_PASSWORD
 * Change SEED_PASSWORD in .env before seeding in production.
 */
const SEED_PASSWORD = process.env.SEED_PASSWORD || SEED_PASSWORD;

const SEED_USERS = [
  {
    name:            'Shivam Gupta',
    email:           'shivam.gupta@gmail.com',
    password:        SEED_PASSWORD,
    role:            'developer',
    bio:             'Full Stack MERN Developer passionate about hackathons and scalable web applications.',
    skills:          ['React', 'Node.js', 'MongoDB', 'Express.js'],
    experienceLevel: 'advanced',
    availability:    'full-time',
    avatar:          'https://ui-avatars.com/api/?name=Shivam+Gupta&background=1e293b&color=fff&size=200&bold=true',
    isVerified:      true,
  },
  {
    name:            'Divyanshu Sharma',
    email:           'divyanshu.sharma@gmail.com',
    password:        SEED_PASSWORD,
    role:            'developer',
    bio:             'Machine Learning enthusiast focused on AI products.',
    skills:          ['Python', 'Machine Learning', 'TensorFlow', 'Data Science'],
    experienceLevel: 'intermediate',
    availability:    'part-time',
    avatar:          'https://ui-avatars.com/api/?name=Divyanshu+Sharma&background=1d4ed8&color=fff&size=200&bold=true',
    isVerified:      true,
  },
  {
    name:            'Adnan Khan',
    email:           'adnan.khan@gmail.com',
    password:        SEED_PASSWORD,
    role:            'designer',
    bio:             'Creative UI designer and frontend developer.',
    skills:          ['UI/UX', 'Figma', 'React', 'Tailwind CSS'],
    experienceLevel: 'intermediate',
    availability:    'weekends-only',
    avatar:          'https://ui-avatars.com/api/?name=Adnan+Khan&background=0f766e&color=fff&size=200&bold=true',
    isVerified:      true,
  },
  {
    name:            'Aryan Singh',
    email:           'aryan.singh@gmail.com',
    password:        SEED_PASSWORD,
    role:            'developer',
    bio:             'Backend engineer focused on scalable systems.',
    skills:          ['Java', 'Spring Boot', 'MySQL', 'System Design'],
    experienceLevel: 'advanced',
    availability:    'full-time',
    avatar:          'https://ui-avatars.com/api/?name=Aryan+Singh&background=b45309&color=fff&size=200&bold=true',
    isVerified:      true,
  },
  {
    name:            'Rahul Verma',
    email:           'rahul.verma@gmail.com',
    password:        SEED_PASSWORD,
    role:            'developer',
    bio:             'Security researcher and cloud enthusiast.',
    skills:          ['Cyber Security', 'Networking', 'Linux', 'Cloud Security'],
    experienceLevel: 'intermediate',
    availability:    'part-time',
    avatar:          'https://ui-avatars.com/api/?name=Rahul+Verma&background=0369a1&color=fff&size=200&bold=true',
    isVerified:      true,
  },
  {
    name:            'Priya Mehta',
    email:           'priya.mehta@gmail.com',
    password:        SEED_PASSWORD,
    role:            'other',
    bio:             'Product strategist interested in startup ecosystems.',
    skills:          ['Product Management', 'Business Analysis', 'UI Research', 'Agile'],
    experienceLevel: 'intermediate',
    availability:    'full-time',
    avatar:          'https://ui-avatars.com/api/?name=Priya+Mehta&background=4338ca&color=fff&size=200&bold=true',
    isVerified:      true,
  },
];

module.exports = SEED_USERS;
