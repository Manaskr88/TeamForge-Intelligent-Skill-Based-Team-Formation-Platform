/**
 * TeamForge Database Seed Script
 * Run: npm run seed
 *
 * Seeds: 6 Users, 5 Projects, 3 Teams,
 *        Chat messages, Notifications, Invitations
 */

require('dotenv').config();
const mongoose  = require('mongoose');
const bcrypt    = require('bcryptjs');

// Models
const User         = require('./models/User.model');
const Project      = require('./models/Project.model');
const Team         = require('./models/Team.model');
const Message      = require('./models/Message.model');
const Notification = require('./models/Notification.model');
const Invitation   = require('./models/Invitation.model');
const SavedIdea    = require('./models/SavedIdea.model');

// Seed data
const SEED_USERS    = require('./seed/users');
const SEED_PROJECTS = require('./seed/projects');
const SEED_TEAMS    = require('./seed/teams');

// ── Helpers ───────────────────────────────────────────────────────────────────
const log   = (msg)  => console.log(`  ✅ ${msg}`);
const warn  = (msg)  => console.log(`  ⚠️  ${msg}`);
const title = (msg)  => console.log(`\n🔷 ${msg}`);
const done  = (msg)  => console.log(`\n✨ ${msg}`);

// ── Connect ───────────────────────────────────────────────────────────────────
async function connect() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log(`\n🗄️  Connected: ${mongoose.connection.host} / ${mongoose.connection.name}`);
}

// ── Clear seed collections ────────────────────────────────────────────────────
async function clearSeedData(seedEmails) {
  title('Clearing previous seed data...');

  const users = await User.find({ email: { $in: seedEmails } }).select('_id').lean();
  const ids   = users.map(u => u._id);

  if (ids.length) {
    // Remove all data tied to seed users
    await Promise.all([
      Message.deleteMany({ sender: { $in: ids } }),
      Notification.deleteMany({ $or: [{ recipient: { $in: ids } }, { sender: { $in: ids } }] }),
      Invitation.deleteMany({ $or: [{ from: { $in: ids } }, { to: { $in: ids } }] }),
      SavedIdea.deleteMany({ user: { $in: ids } }),
      Team.deleteMany({ leader: { $in: ids } }),
      Project.deleteMany({ owner: { $in: ids } }),
      User.deleteMany({ email: { $in: seedEmails } }),
    ]);
    log(`Removed ${ids.length} seed users and all related data`);
  } else {
    warn('No previous seed data found — fresh seed');
  }
}

// ── Seed users ────────────────────────────────────────────────────────────────
async function seedUsers() {
  title('Seeding users...');
  const created = [];

  for (const u of SEED_USERS) {
    // Hash password manually THEN use insertOne to bypass the pre-save hook
    // (avoids double-hashing which breaks login)
    const salt   = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(u.password, salt);

    // Use insertOne to skip mongoose middleware (pre-save hook)
    const result = await User.collection.insertOne({
      ...u,
      password:    hashed,
      teams:       [],
      projects:    [],
      completedProjects: 0,
      rating:      0,
      isOnline:    false,
      lastSeen:    new Date(),
      github:      '',
      linkedin:    '',
      website:     '',
      location:    '',
      createdAt:   new Date(),
      updatedAt:   new Date(),
    });

    const user = await User.findById(result.insertedId);
    created.push(user);
    log(`Created user: ${user.name} (${user.email})`);
  }

  return created;
}

// ── Seed projects ─────────────────────────────────────────────────────────────
async function seedProjects(usersByEmail) {
  title('Seeding projects...');
  const created = [];

  for (const p of SEED_PROJECTS) {
    const owner   = usersByEmail[p.ownerEmail];
    if (!owner) { warn(`Owner not found: ${p.ownerEmail}`); continue; }

    const { ownerEmail, ...rest } = p;
    const project = await Project.create({ ...rest, owner: owner._id });

    // Link project to owner
    await User.findByIdAndUpdate(owner._id, { $push: { projects: project._id } });

    created.push(project);
    log(`Created project: ${project.title}`);
  }

  return created;
}

// ── Seed teams ────────────────────────────────────────────────────────────────
async function seedTeams(usersByEmail, projectsByTitle) {
  title('Seeding teams...');
  const created = [];

  for (const t of SEED_TEAMS) {
    const leader  = usersByEmail[t.leaderEmail];
    if (!leader) { warn(`Leader not found: ${t.leaderEmail}`); continue; }

    const project = projectsByTitle[t.projectTitle];
    const members = t.memberEmails
      .map(e => usersByEmail[e])
      .filter(Boolean)
      .map(u => ({ user: u._id, role: u._id.toString() === leader._id.toString() ? 'leader' : 'member' }));

    const { leaderEmail, memberEmails, projectTitle, ...rest } = t;

    const team = await Team.create({
      ...rest,
      leader:  leader._id,
      members,
      project: project?._id,
    });

    // Link team to each member user
    for (const e of t.memberEmails) {
      const u = usersByEmail[e];
      if (u) await User.findByIdAndUpdate(u._id, { $addToSet: { teams: team._id } });
    }

    created.push(team);
    log(`Created team: ${team.name} (${members.length} members)`);
  }

  return created;
}

// ── Seed chat messages ────────────────────────────────────────────────────────
async function seedMessages(teamsByName, usersByEmail) {
  title('Seeding chat messages...');

  const codeWarriors = teamsByName['Code Warriors'];
  const hackMasters  = teamsByName['HackMasters'];
  const secureX      = teamsByName['SecureX'];

  const shivam  = usersByEmail['shivam.gupta@gmail.com'];
  const adnan   = usersByEmail['adnan.khan@gmail.com'];
  const priya   = usersByEmail['priya.mehta@gmail.com'];
  const rahul   = usersByEmail['rahul.verma@gmail.com'];

  // Helper to create a message
  const msg = (teamId, sender, content, type = 'text', offsetMins = 0) => ({
    teamId,
    sender:      sender._id,
    senderName:  sender.name,
    senderAvatar: sender.avatar || '',
    content,
    messageType: type,
    createdAt:   new Date(Date.now() - offsetMins * 60 * 1000),
  });

  const messages = [];

  if (codeWarriors) {
    messages.push(
      msg(codeWarriors._id, shivam, '👋 Welcome to Code Warriors! Excited to build something amazing.', 'text', 120),
      msg(codeWarriors._id, adnan,  'Hey team! UI wireframes are ready. Sharing soon.', 'text', 100),
      msg(codeWarriors._id, shivam, 'Great! I\'ve set up the Node.js backend with JWT auth. MongoDB connected.', 'text', 80),
      msg(codeWarriors._id, adnan,  'Frontend React app is scaffolded. Using Tailwind CSS for styling.', 'text', 60),
      msg(codeWarriors._id, shivam, 'We still need someone for the ML/AI integration. Missing Python + TensorFlow skills.', 'text', 40),
      msg(codeWarriors._id, adnan,  'Agreed. The AI analysis feature is the core differentiator.', 'text', 20),
      msg(codeWarriors._id, shivam, '🤖 AI Recommendation: Divyanshu Sharma — 94% compatible. Has Python, ML, TensorFlow!', 'system', 5),
    );
    log(`Added ${messages.length} messages to Code Warriors`);
  }

  const hackStart = messages.length;
  if (hackMasters) {
    messages.push(
      msg(hackMasters._id, shivam, 'HackMasters is live! Let\'s build the best team-finder platform.', 'text', 90),
      msg(hackMasters._id, priya,  'Product roadmap is ready. Key features: skill matching, real-time chat, AI recommendations.', 'text', 70),
      msg(hackMasters._id, shivam, 'Backend APIs are 80% done. Working on the recommendation algorithm now.', 'text', 50),
      msg(hackMasters._id, priya,  'We really need a UI/UX expert. The current design needs professional polish.', 'text', 30),
      msg(hackMasters._id, shivam, 'Checking AI recommendations for UI designers...', 'text', 15),
      msg(hackMasters._id, priya,  '🤖 AI Recommendation: Adnan Khan — 91% compatible. UI/UX + Figma + React!', 'system', 3),
    );
    log(`Added ${messages.length - hackStart} messages to HackMasters`);
  }

  const secStart = messages.length;
  if (secureX) {
    messages.push(
      msg(secureX._id, rahul, 'SecureX team is assembled. Let\'s protect the cloud! 🔒', 'text', 150),
      msg(secureX._id, rahul, 'Working on the threat detection algorithms. Need a backend engineer for the API layer.', 'text', 100),
      msg(secureX._id, rahul, 'The ML model for anomaly detection is trained. Accuracy: 94.2%.', 'text', 60),
      msg(secureX._id, rahul, 'Need someone with Java/Spring Boot for the enterprise API. System design skills a plus.', 'text', 30),
      msg(secureX._id, rahul, '🤖 AI Recommendation: Aryan Singh — 88% compatible. Java, Spring Boot, System Design!', 'system', 5),
    );
    log(`Added ${messages.length - secStart} messages to SecureX`);
  }

  if (messages.length) await Message.insertMany(messages);
  log(`Total: ${messages.length} chat messages seeded`);
}

// ── Seed invitations ──────────────────────────────────────────────────────────
async function seedInvitations(teamsByName, usersByEmail) {
  title('Seeding invitations...');

  const invitations = [];

  // Code Warriors → Divyanshu
  const cw = teamsByName['Code Warriors'];
  if (cw) {
    invitations.push({
      from:      usersByEmail['shivam.gupta@gmail.com']._id,
      to:        usersByEmail['divyanshu.sharma@gmail.com']._id,
      team:      cw._id,
      type:      'team-invite',
      message:   'Hey Divyanshu! Your ML skills are exactly what Code Warriors needs. Join us to build an AI Resume Analyzer!',
      status:    'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    log('Invitation: Code Warriors → Divyanshu Sharma');
  }

  // HackMasters → Adnan
  const hm = teamsByName['HackMasters'];
  if (hm) {
    invitations.push({
      from:      usersByEmail['shivam.gupta@gmail.com']._id,
      to:        usersByEmail['adnan.khan@gmail.com']._id,
      team:      hm._id,
      type:      'team-invite',
      message:   'Hi Adnan! We need your UI/UX expertise for HackMasters. Your Figma + React skills are perfect!',
      status:    'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    log('Invitation: HackMasters → Adnan Khan');
  }

  // SecureX → Aryan
  const sx = teamsByName['SecureX'];
  if (sx) {
    invitations.push({
      from:      usersByEmail['rahul.verma@gmail.com']._id,
      to:        usersByEmail['aryan.singh@gmail.com']._id,
      team:      sx._id,
      type:      'team-invite',
      message:   'Hey Aryan! SecureX needs a strong backend architect. Your Java + Spring Boot + System Design skills are ideal!',
      status:    'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    log('Invitation: SecureX → Aryan Singh');
  }

  if (invitations.length) await Invitation.insertMany(invitations);
  log(`Total: ${invitations.length} invitations seeded`);

  return invitations;
}

// ── Seed notifications ────────────────────────────────────────────────────────
async function seedNotifications(teamsByName, usersByEmail) {
  title('Seeding notifications...');

  const shivam   = usersByEmail['shivam.gupta@gmail.com'];
  const divya    = usersByEmail['divyanshu.sharma@gmail.com'];
  const adnan    = usersByEmail['adnan.khan@gmail.com'];
  const aryan    = usersByEmail['aryan.singh@gmail.com'];
  const rahul    = usersByEmail['rahul.verma@gmail.com'];
  const priya    = usersByEmail['priya.mehta@gmail.com'];

  const notifications = [
    // Welcome notifications
    { recipient: shivam._id,  type: 'system',        title: 'Welcome to TeamForge!',      message: 'Your profile is ready. Explore teams, projects, and find your perfect teammates.',  isRead: true  },
    { recipient: divya._id,   type: 'system',        title: 'Welcome to TeamForge!',      message: 'Start by adding your skills and browsing AI-powered teammate recommendations.',       isRead: true  },
    { recipient: adnan._id,   type: 'system',        title: 'Welcome to TeamForge!',      message: 'Your designer profile is set up. Teams are looking for UI/UX talent like yours!',   isRead: true  },
    { recipient: aryan._id,   type: 'system',        title: 'Welcome to TeamForge!',      message: 'Backend engineers are in high demand. Check out SecureX and other teams!',           isRead: false },
    { recipient: rahul._id,   type: 'system',        title: 'Welcome to TeamForge!',      message: 'Welcome! Your cybersecurity expertise is rare. Build a team and start a project.',   isRead: true  },
    { recipient: priya._id,   type: 'system',        title: 'Welcome to TeamForge!',      message: 'Product managers drive impact. Join HackMasters or post your own startup project!', isRead: true  },

    // Team invitations received
    { recipient: divya._id,   sender: shivam._id, type: 'team-invite',      title: 'Team Invitation: Code Warriors', message: 'Shivam Gupta invited you to join Code Warriors. Your ML skills are exactly what they need!', link: '/dashboard/invitations', isRead: false },
    { recipient: adnan._id,   sender: shivam._id, type: 'team-invite',      title: 'Team Invitation: HackMasters',  message: 'Shivam Gupta invited you to join HackMasters. Your UI/UX skills would be a great fit!',      link: '/dashboard/invitations', isRead: false },
    { recipient: aryan._id,   sender: rahul._id,  type: 'team-invite',      title: 'Team Invitation: SecureX',      message: 'Rahul Verma invited you to join SecureX. Your Java and System Design skills are needed!',      link: '/dashboard/invitations', isRead: false },

    // AI recommendations
    { recipient: shivam._id,  type: 'system',        title: '🤖 AI Teammate Found!',     message: 'Divyanshu Sharma is 94% compatible with you. Strong Python & ML skills to complete your AI project.',   link: '/dashboard/ai-recommendations', isRead: false },
    { recipient: rahul._id,   type: 'system',        title: '🤖 AI Teammate Found!',     message: 'Aryan Singh is 88% compatible with SecureX. Java + Spring Boot + System Design — perfect backend fit.', link: '/dashboard/ai-recommendations', isRead: false },
    { recipient: priya._id,   type: 'system',        title: '🤖 AI Teammate Found!',     message: 'Adnan Khan is 91% compatible with HackMasters. UI/UX + Figma expertise will elevate your product.',    link: '/dashboard/ai-recommendations', isRead: false },

    // Project activities
    { recipient: divya._id,   sender: shivam._id, type: 'project-created',   title: 'New Project: AI Resume Analyzer',   message: 'Shivam Gupta posted a new AI project. Your ML skills are a strong match!',          link: '/dashboard/projects', isRead: false },
    { recipient: adnan._id,   sender: priya._id,  type: 'project-created',   title: 'New Project: Startup Idea Validator', message: 'Priya Mehta posted a startup project. Requires React + Product Management.',       link: '/dashboard/projects', isRead: false },
    { recipient: aryan._id,   sender: rahul._id,  type: 'project-created',   title: 'New Project: Cyber Threat Detection', message: 'Rahul Verma posted a cybersecurity project. Backend engineers needed urgently.',   link: '/dashboard/projects', isRead: false },

    // Team joined
    { recipient: shivam._id,  sender: adnan._id,  type: 'team-joined',       title: 'Adnan Khan joined Code Warriors!',   message: 'Adnan Khan accepted your invitation and joined Code Warriors as Frontend Developer.', link: '/dashboard/teams', isRead: true  },
    { recipient: shivam._id,  sender: priya._id,  type: 'team-joined',       title: 'Priya Mehta joined HackMasters!',    message: 'Priya Mehta joined HackMasters as Product Manager. Great addition!',                 link: '/dashboard/teams', isRead: true  },
    { recipient: rahul._id,   type: 'announcement', title: '📢 SecureX Recruiting',      message: 'Your team SecureX is now recruiting. Share your team link to find the best candidates!',                           link: '/dashboard/teams', isRead: true  },
  ];

  await Notification.insertMany(notifications);
  log(`Total: ${notifications.length} notifications seeded`);
}

// ── Main seed function ────────────────────────────────────────────────────────
async function seed() {
  console.log('\n🚀 TeamForge Seed Script Starting...');
  console.log('━'.repeat(50));

  await connect();

  const seedEmails = SEED_USERS.map(u => u.email);

  // 1. Clean previous seed data
  await clearSeedData(seedEmails);

  // 2. Create users
  const users         = await seedUsers();
  const usersByEmail  = {};
  users.forEach(u => { usersByEmail[u.email] = u; });

  // 3. Create projects
  const projects        = await seedProjects(usersByEmail);
  const projectsByTitle = {};
  projects.forEach(p => { projectsByTitle[p.title] = p; });

  // 4. Create teams
  const teams        = await seedTeams(usersByEmail, projectsByTitle);
  const teamsByName  = {};
  teams.forEach(t => { teamsByName[t.name] = t; });

  // 5. Seed chat messages
  await seedMessages(teamsByName, usersByEmail);

  // 6. Seed invitations
  await seedInvitations(teamsByName, usersByEmail);

  // 7. Seed notifications
  await seedNotifications(teamsByName, usersByEmail);

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n' + '━'.repeat(50));
  done('Seed Complete! Database is fully populated.\n');
  console.log('  📋 Summary:');
  console.log(`     Users:         ${users.length}`);
  console.log(`     Projects:      ${projects.length}`);
  console.log(`     Teams:         ${teams.length}`);
  console.log(`     Chat messages: seeded`);
  console.log(`     Invitations:   3 pending`);
  console.log(`     Notifications: 18`);
  console.log('\n  🔑 Login with any seeded user:');
  console.log('     Password: Password@123');
  console.log('\n  👤 Demo accounts:');
  users.forEach(u => console.log(`     ${u.email}`));
  console.log('');
}

seed()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('\n❌ Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
