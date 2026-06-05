/**
 * Quick verification script — run: node verify_seed.js
 * Tests login for all 6 seeded users and checks data counts
 */
require('dotenv').config();
const http     = require('http');
const mongoose = require('mongoose');

const ACCOUNTS = [
  'shivam.gupta@gmail.com',
  'divyanshu.sharma@gmail.com',
  'adnan.khan@gmail.com',
  'aryan.singh@gmail.com',
  'rahul.verma@gmail.com',
  'priya.mehta@gmail.com',
];
const PASSWORD = 'Password@123';

function post(path, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const req  = http.request(
      { host: 'localhost', port: 5000, path, method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } },
      (res) => {
        let b = '';
        res.on('data', c => b += c);
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(b) }));
      }
    );
    req.write(data);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve) => {
    const req = http.request(
      { host: 'localhost', port: 5000, path, method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` } },
      (res) => {
        let b = '';
        res.on('data', c => b += c);
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(b) }));
      }
    );
    req.end();
  });
}

async function verify() {
  console.log('\n🔍 Verifying seeded data...\n');
  let allOk = true;

  // 1. Test logins
  console.log('── Login tests ─────────────────────────');
  for (const email of ACCOUNTS) {
    const r = await post('/api/auth/login', { email, password: PASSWORD });
    const ok = r.status === 200;
    console.log(`  ${ok ? '✅' : '❌'} ${email} → ${ok ? r.body.user?.name : r.body.message}`);
    if (!ok) allOk = false;
  }

  // 2. Test data endpoints with Shivam's token
  const loginRes = await post('/api/auth/login', { email: 'shivam.gupta@gmail.com', password: PASSWORD });
  const token    = loginRes.body.token;

  console.log('\n── API data checks ─────────────────────');
  const checks = [
    ['/api/users/dashboard',     'Dashboard',      r => `teams:${r.stats?.teamsCount} projects:${r.stats?.projectsCount}`],
    ['/api/teams',               'Teams',          r => `${r.teams?.length} teams`],
    ['/api/projects',            'Projects',       r => `${r.projects?.length} projects`],
    ['/api/notifications',       'Notifications',  r => `${r.notifications?.length} notifs, ${r.unreadCount} unread`],
    ['/api/invitations',         'Invitations(me)',r => `${r.invitations?.length} pending`],
    ['/api/invitations/sent',    'Invitations(sent)',r=>`${r.invitations?.length} sent`],
  ];

  for (const [path, label, extract] of checks) {
    const r = await get(path, token);
    const ok = r.status === 200;
    console.log(`  ${ok ? '✅' : '❌'} ${label}: ${ok ? extract(r.body) : r.status + ' ' + r.body?.message}`);
    if (!ok) allOk = false;
  }

  // 3. Check teams with members
  const teamsRes = await get('/api/teams', token);
  if (teamsRes.status === 200) {
    console.log('\n── Team details ────────────────────────');
    teamsRes.body.teams?.forEach(t => {
      console.log(`  📋 ${t.name}: ${t.members?.length} members | needs: ${t.requiredSkills?.join(', ')}`);
    });
  }

  // 4. Test Divyanshu login (check invite)
  console.log('\n── Divyanshu\'s invitations ─────────────');
  const divLogin = await post('/api/auth/login', { email: 'divyanshu.sharma@gmail.com', password: PASSWORD });
  if (divLogin.status === 200) {
    const invRes = await get('/api/invitations', divLogin.body.token);
    console.log(`  ✅ Pending invitations for Divyanshu: ${invRes.body.invitations?.length}`);
    invRes.body.invitations?.forEach(i => {
      console.log(`     From: ${i.from?.name} | Team: ${i.team?.name}`);
    });
  }

  console.log('\n' + '─'.repeat(45));
  console.log(allOk ? '✨ All checks passed!' : '⚠️  Some checks failed — review above');
  console.log('');
}

verify().catch(console.error);
