/**
 * CAMPUSHUB DATABASE ADAPTER (PostgreSQL & Supabase DAO Layer)
 * Version 2.1.0
 * Fully parameterized queries, user ownership verification, and relational integrity.
 */

const fs = require('fs');
const path = require('path');
let pg;
try {
  pg = require('pg');
} catch (e) {
  try {
    pg = require('../backend/node_modules/pg');
  } catch (err) {
    throw new Error("Could not find 'pg' package. Please run 'npm install pg' or 'npm --prefix backend install pg'.");
  }
}
const { Pool } = pg;

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');
const SEED_PATH = path.join(__dirname, 'seed.sql');

let pool = null;

/**
 * Initialize and get PostgreSQL Connection Pool
 */
function getPool() {
  if (!pool) {
    let connectionString = process.env.DATABASE_URL;

    // Fallback attempt to read config if available
    try {
      const config = require('../backend/src/config/config');
      if (!connectionString && config.DATABASE_URL) {
        connectionString = config.DATABASE_URL;
      }
    } catch (e) {
      // Ignore
    }

    if (!connectionString) {
      console.warn('⚠️ [DB Warning] DATABASE_URL is not set. Database operations will fail until configured.');
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const isSupabase = connectionString && (connectionString.includes('supabase.co') || connectionString.includes('pooler.supabase.com'));

    pool = new Pool({
      connectionString: connectionString || undefined,
      ssl: (isProduction || isSupabase || (connectionString && connectionString.includes('sslmode=require')))
        ? { rejectUnauthorized: false }
        : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });

    pool.on('error', (err) => {
      console.error('❌ [DB Error] Unexpected idle client error:', err.message);
    });
  }
  return pool;
}

const getDB = getPool;

/**
 * Safe JSON parser for arrays/objects
 */
function parseJsonField(val) {
  if (val === null || val === undefined) return [];
  if (Array.isArray(val) || typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return [];
  }
}

/**
 * Database schema initialization
 */
async function initSchema() {
  const client = getPool();
  if (!fs.existsSync(SCHEMA_PATH)) return;
  const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  await client.query(schemaSql);
}

/**
 * Database seed execution
 */
async function seedData() {
  const client = getPool();
  if (!fs.existsSync(SEED_PATH)) return;
  const seedSql = fs.readFileSync(SEED_PATH, 'utf-8');
  await client.query(seedSql);
}

// -------------------------------------------------------------
// USER OPERATIONS
// -------------------------------------------------------------
async function getUser(id = 'user-01') {
  const client = getPool();
  const res = await client.query('SELECT * FROM users WHERE id = $1', [id]);
  const row = res.rows[0];
  if (!row) return null;
  return {
    ...row,
    isVerified: Boolean(row.is_verified),
    skills: parseJsonField(row.skills),
    interests: parseJsonField(row.interests)
  };
}

async function getUserByEmail(email) {
  if (!email) return null;
  const client = getPool();
  const res = await client.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
  const row = res.rows[0];
  if (!row) return null;
  return {
    ...row,
    isVerified: Boolean(row.is_verified),
    skills: parseJsonField(row.skills),
    interests: parseJsonField(row.interests)
  };
}

async function updateUser(id = 'user-01', updates = {}) {
  const current = await getUser(id);
  if (!current) return null;

  const name = updates.name !== undefined ? updates.name : current.name;
  const college = updates.college !== undefined ? updates.college : current.college;
  const department = updates.department !== undefined ? updates.department : current.department;
  const year = updates.year !== undefined ? updates.year : current.year;
  const bio = updates.bio !== undefined ? updates.bio : current.bio;
  const skills = JSON.stringify(updates.skills !== undefined ? updates.skills : current.skills);
  const interests = JSON.stringify(updates.interests !== undefined ? updates.interests : current.interests);
  const avatar = updates.avatar || current.avatar;
  const xp = updates.xp !== undefined ? updates.xp : current.xp;
  const isVerified = updates.isVerified !== undefined ? Boolean(updates.isVerified) : current.isVerified;

  const client = getPool();
  await client.query(`
    UPDATE users 
    SET name = $1, college = $2, department = $3, year = $4, bio = $5, 
        skills = $6::jsonb, interests = $7::jsonb, avatar = $8, xp = $9, 
        is_verified = $10, updated_at = CURRENT_TIMESTAMP
    WHERE id = $11
  `, [name, college, department, year, bio, skills, interests, avatar, xp, isVerified, id]);

  return await getUser(id);
}

async function createOrUpdateUser(userData = {}) {
  const email = (userData.email || '').toLowerCase().trim();
  if (!email) throw new Error('Email is required');

  const existing = await getUserByEmail(email);
  if (existing) {
    return await updateUser(existing.id, userData);
  } else {
    const id = userData.id || `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const name = userData.name || email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const college = userData.college || 'CGC Landran';
    const department = userData.department || 'Computer Science Engineering';
    const year = userData.year || '3rd Year';
    const bio = userData.bio || 'Passionate student builder on CampusHub.';
    const skills = JSON.stringify(userData.skills || ['Python', 'React.js', 'FastAPI']);
    const interests = JSON.stringify(userData.interests || ['AI / ML', 'Fullstack', 'Hackathons']);
    const avatar = userData.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`;
    const isVerified = userData.isVerified !== undefined ? Boolean(userData.isVerified) : true;
    const xp = userData.xp || 2450;

    const client = getPool();
    await client.query(`
      INSERT INTO users (id, name, college, department, year, email, is_verified, bio, skills, interests, avatar, xp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, $12)
    `, [id, name, college, department, year, email, isVerified, bio, skills, interests, avatar, xp]);

    return await getUser(id);
  }
}

// -------------------------------------------------------------
// EMAIL OTP OPERATIONS
// -------------------------------------------------------------
async function saveEmailOtp(email, otpHash, expiresAt, lastSentAt = Date.now()) {
  const client = getPool();
  const normalizedEmail = email.toLowerCase().trim();
  
  await client.query('DELETE FROM email_otps WHERE LOWER(email) = LOWER($1)', [normalizedEmail]);

  const createdAt = Date.now();
  await client.query(`
    INSERT INTO email_otps (email, otp_hash, expires_at, attempts, created_at, last_sent_at)
    VALUES ($1, $2, $3, 0, $4, $5)
  `, [normalizedEmail, otpHash, expiresAt, createdAt, lastSentAt]);
}

async function getActiveOtp(email) {
  if (!email) return null;
  const client = getPool();
  const normalizedEmail = email.toLowerCase().trim();
  const res = await client.query('SELECT * FROM email_otps WHERE LOWER(email) = LOWER($1)', [normalizedEmail]);
  return res.rows[0] || null;
}

async function incrementOtpAttempts(email) {
  if (!email) return;
  const client = getPool();
  const normalizedEmail = email.toLowerCase().trim();
  await client.query('UPDATE email_otps SET attempts = attempts + 1 WHERE LOWER(email) = LOWER($1)', [normalizedEmail]);
}

async function deleteEmailOtp(email) {
  if (!email) return;
  const client = getPool();
  const normalizedEmail = email.toLowerCase().trim();
  await client.query('DELETE FROM email_otps WHERE LOWER(email) = LOWER($1)', [normalizedEmail]);
}

// -------------------------------------------------------------
// ROADMAP OPERATIONS
// -------------------------------------------------------------
async function getRoadmaps() {
  const client = getPool();
  const roadmapsRes = await client.query('SELECT * FROM roadmaps');
  const result = {};

  for (const r of roadmapsRes.rows) {
    const milestonesRes = await client.query(`
      SELECT * FROM milestones WHERE roadmap_track = $1 ORDER BY milestone_order ASC
    `, [r.track_key]);

    const fullMilestones = [];
    for (const m of milestonesRes.rows) {
      const tasksRes = await client.query('SELECT task_text FROM milestone_tasks WHERE milestone_id = $1', [m.id]);
      fullMilestones.push({
        phase: m.phase,
        title: m.title,
        project: m.project,
        tasks: tasksRes.rows.map(t => t.task_text)
      });
    }

    result[r.track_key] = {
      title: r.title,
      desc: r.description,
      milestones: fullMilestones
    };
  }

  return result;
}

// -------------------------------------------------------------
// TEAMS & SQUADS OPERATIONS
// -------------------------------------------------------------
async function getTeams(filterRole = 'all', searchQuery = '') {
  const client = getPool();
  const teamsRes = await client.query('SELECT * FROM teams ORDER BY created_at DESC');

  const fullTeams = [];
  for (const t of teamsRes.rows) {
    const rolesRes = await client.query('SELECT role_name FROM team_needed_roles WHERE team_id = $1', [t.id]);
    const membersRes = await client.query('SELECT id, name, role, avatar, user_id FROM team_members WHERE team_id = $1', [t.id]);

    fullTeams.push({
      id: t.id,
      ownerId: t.owner_id,
      title: t.title,
      eventType: t.event_type,
      eventName: t.event_name,
      description: t.description,
      teamStatus: t.team_status,
      github: t.github,
      neededRoles: rolesRes.rows.map(r => r.role_name),
      members: membersRes.rows
    });
  }

  return fullTeams.filter(team => {
    const matchesRole = filterRole === 'all' || 
      team.neededRoles.some(r => r.toLowerCase().includes(filterRole.toLowerCase()));
    const matchesSearch = !searchQuery || 
      team.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      team.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.eventName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });
}

async function getTeamById(id) {
  const client = getPool();
  const res = await client.query('SELECT * FROM teams WHERE id = $1', [id]);
  const t = res.rows[0];
  if (!t) return null;

  const rolesRes = await client.query('SELECT role_name FROM team_needed_roles WHERE team_id = $1', [t.id]);
  const membersRes = await client.query('SELECT id, name, role, avatar, user_id FROM team_members WHERE team_id = $1', [t.id]);

  return {
    id: t.id,
    ownerId: t.owner_id,
    title: t.title,
    eventType: t.event_type,
    eventName: t.event_name,
    description: t.description,
    teamStatus: t.team_status,
    github: t.github,
    neededRoles: rolesRes.rows.map(r => r.role_name),
    members: membersRes.rows
  };
}

async function createTeam(teamData, ownerId = 'user-01') {
  const client = getPool();
  const id = teamData.id || `team-${Date.now()}`;
  await client.query(`
    INSERT INTO teams (id, owner_id, title, event_type, event_name, description, team_status, github)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    id,
    ownerId,
    teamData.title,
    teamData.eventType || 'HACKATHON',
    teamData.eventName || 'Campus Hackathon 2026',
    teamData.description || '',
    teamData.teamStatus || '1 / 4 members',
    teamData.github || 'https://github.com/campus-collab'
  ]);

  if (Array.isArray(teamData.neededRoles)) {
    for (const role of teamData.neededRoles) {
      await client.query('INSERT INTO team_needed_roles (team_id, role_name) VALUES ($1, $2)', [id, role]);
    }
  }

  // Insert creator as first team lead member
  const creatorUser = await getUser(ownerId);
  const creatorName = creatorUser ? creatorUser.name : 'Squad Lead';
  const creatorAvatar = creatorUser ? creatorUser.avatar : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';

  await client.query(`
    INSERT INTO team_members (team_id, user_id, name, role, avatar)
    VALUES ($1, $2, $3, $4, $5)
  `, [id, ownerId, creatorName, 'Squad Lead', creatorAvatar]);

  return await getTeamById(id);
}

async function applyToTeam(teamId, applicationData, applicantId = null) {
  const client = getPool();
  const team = await getTeamById(teamId);
  if (!team) return { success: false, message: 'Team does not exist' };

  await client.query(`
    INSERT INTO team_applications (team_id, applicant_id, role_applied, reason, github_portfolio, applicant_name, applicant_email, status)
    VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
  `, [
    teamId,
    applicantId,
    applicationData.roleApplied,
    applicationData.reason,
    applicationData.githubPortfolio || '',
    applicationData.applicantName || 'Student Applicant',
    applicationData.applicantEmail || ''
  ]);

  // Create notification for team owner
  if (team.ownerId) {
    await client.query(`
      INSERT INTO notifications (user_id, icon, text_content, time_ago, is_unread)
      VALUES ($1, '⚡', $2, 'Just now', TRUE)
    `, [team.ownerId, `<b>${applicationData.applicantName || 'A student'}</b> applied for the <b>${applicationData.roleApplied}</b> role in <b>${team.title}</b>.`]);
  }

  return { success: true, message: 'Application submitted successfully to project lead.' };
}

async function getTeamApplications(teamId, requestingUserId) {
  const client = getPool();
  const team = await getTeamById(teamId);
  if (!team) return null;
  if (team.ownerId && team.ownerId !== requestingUserId) {
    throw new Error('UNAUTHORIZED_OWNER');
  }

  const res = await client.query(`
    SELECT * FROM team_applications WHERE team_id = $1 ORDER BY created_at DESC
  `, [teamId]);
  return res.rows;
}

async function updateApplicationStatus(teamId, applicationId, status, requestingUserId) {
  const client = getPool();
  const team = await getTeamById(teamId);
  if (!team) return { success: false, message: 'Team not found' };
  if (team.ownerId && team.ownerId !== requestingUserId) {
    throw new Error('UNAUTHORIZED_OWNER');
  }

  const res = await client.query('SELECT * FROM team_applications WHERE id = $1 AND team_id = $2', [applicationId, teamId]);
  const app = res.rows[0];
  if (!app) return { success: false, message: 'Application not found' };

  await client.query('UPDATE team_applications SET status = $1 WHERE id = $2', [status, applicationId]);

  if (status === 'accepted') {
    // Add applicant as team member
    await client.query(`
      INSERT INTO team_members (team_id, user_id, name, role, avatar)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      teamId,
      app.applicant_id,
      app.applicant_name,
      app.role_applied,
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
    ]);
  }

  // Notify applicant
  if (app.applicant_id) {
    const notifyText = status === 'accepted'
      ? `🎉 Congratulations! You were accepted into <b>${team.title}</b> for <b>${app.role_applied}</b>.`
      : `Update on your application for <b>${team.title}</b>: Application status is ${status}.`;
    await client.query(`
      INSERT INTO notifications (user_id, icon, text_content, time_ago, is_unread)
      VALUES ($1, '🏆', $2, 'Just now', TRUE)
    `, [app.applicant_id, notifyText]);
  }

  return { success: true, message: `Application marked as ${status}.` };
}

async function deleteTeam(teamId, requestingUserId) {
  const client = getPool();
  const team = await getTeamById(teamId);
  if (!team) return { success: false, message: 'Team not found' };
  if (team.ownerId && team.ownerId !== requestingUserId) {
    throw new Error('UNAUTHORIZED_OWNER');
  }
  await client.query('DELETE FROM teams WHERE id = $1', [teamId]);
  return { success: true, message: 'Squad deleted successfully.' };
}

// -------------------------------------------------------------
// STUDENTS (SMART MATCHING)
// -------------------------------------------------------------
async function getStudents(query = '') {
  const client = getPool();
  const res = await client.query('SELECT * FROM students');
  const students = res.rows.map(s => ({
    id: s.id,
    name: s.name,
    college: s.college,
    department: s.department,
    skills: parseJsonField(s.skills),
    interests: parseJsonField(s.interests),
    matchScore: s.match_score,
    reason: s.reason,
    avatar: s.avatar
  }));

  if (!query) return students;
  const q = query.toLowerCase();
  return students.filter(s => 
    s.name.toLowerCase().includes(q) || 
    s.skills.some(sk => sk.toLowerCase().includes(q)) || 
    s.department.toLowerCase().includes(q)
  );
}

// -------------------------------------------------------------
// COMMUNITIES
// -------------------------------------------------------------
async function getCommunities(category = 'all', currentUserId = null) {
  const client = getPool();
  let res;
  if (category !== 'all') {
    res = await client.query('SELECT * FROM communities WHERE category = $1 ORDER BY created_at DESC', [category]);
  } else {
    res = await client.query('SELECT * FROM communities ORDER BY created_at DESC');
  }

  let userJoinedCommIds = new Set();
  if (currentUserId) {
    const joinedRes = await client.query('SELECT community_id FROM community_members WHERE user_id = $1', [currentUserId]);
    userJoinedCommIds = new Set(joinedRes.rows.map(r => r.community_id));
  }

  return res.rows.map(c => ({
    id: c.id,
    creatorId: c.creator_id,
    name: c.name,
    category: c.category,
    icon: c.icon,
    members: c.members_count,
    online: c.online_count,
    desc: c.description,
    isJoined: userJoinedCommIds.has(c.id)
  }));
}

async function getCommunityById(id) {
  const client = getPool();
  const res = await client.query('SELECT * FROM communities WHERE id = $1', [id]);
  const c = res.rows[0];
  if (!c) return null;
  return {
    id: c.id,
    creatorId: c.creator_id,
    name: c.name,
    category: c.category,
    icon: c.icon,
    members: c.members_count,
    online: c.online_count,
    desc: c.description
  };
}

async function createCommunity(commData, creatorId = null) {
  const client = getPool();
  const id = commData.id || `comm-${Date.now()}`;
  await client.query(`
    INSERT INTO communities (id, creator_id, name, category, icon, members_count, online_count, description)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    id,
    creatorId,
    commData.name,
    commData.category || 'General',
    commData.icon || '🚀',
    commData.members || '1 Member',
    commData.online || '1 Online',
    commData.desc || ''
  ]);

  if (creatorId) {
    await client.query(`
      INSERT INTO community_members (community_id, user_id) VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `, [id, creatorId]);
  }

  return await getCommunityById(id);
}

async function joinCommunity(communityId, userId) {
  const client = getPool();
  const comm = await getCommunityById(communityId);
  if (!comm) return { success: false, message: 'Community not found' };

  await client.query(`
    INSERT INTO community_members (community_id, user_id)
    VALUES ($1, $2)
    ON CONFLICT (community_id, user_id) DO NOTHING
  `, [communityId, userId]);

  return { success: true, message: 'Joined community successfully.' };
}

async function leaveCommunity(communityId, userId) {
  const client = getPool();
  await client.query('DELETE FROM community_members WHERE community_id = $1 AND user_id = $2', [communityId, userId]);
  return { success: true, message: 'Left community successfully.' };
}

// -------------------------------------------------------------
// DISCUSSIONS & COMMENTS
// -------------------------------------------------------------
async function getDiscussions(category = 'all', currentUserId = null) {
  const client = getPool();
  let res;
  if (category !== 'all') {
    res = await client.query('SELECT * FROM discussions WHERE category = $1 ORDER BY created_at DESC', [category]);
  } else {
    res = await client.query('SELECT * FROM discussions ORDER BY created_at DESC');
  }

  return res.rows.map(p => ({
    id: p.id,
    authorId: p.author_id,
    author: p.author,
    isAnon: Boolean(p.is_anon),
    dept: p.dept,
    time: p.time_ago,
    category: p.category,
    content: p.content,
    tags: parseJsonField(p.tags),
    likes: p.likes,
    isLiked: Boolean(p.is_liked),
    commentsCount: p.comments_count,
    avatar: p.avatar,
    isOwner: currentUserId ? p.author_id === currentUserId : false
  }));
}

async function createDiscussion(data, authorId = null) {
  const client = getPool();
  const id = `post-${Date.now()}`;
  const isAnon = Boolean(data.isAnon);
  const author = isAnon ? 'Anonymous Builder' : (data.author || 'Arjun Sharma');
  const dept = data.dept || 'Verified Student';
  const timeAgo = 'Just now';
  const category = data.category || 'General';
  const content = data.content;
  const tags = JSON.stringify(data.tags || ['Building', 'Campus']);
  const avatar = data.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';

  await client.query(`
    INSERT INTO discussions (id, author_id, author, is_anon, dept, time_ago, category, content, tags, likes, is_liked, comments_count, avatar)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, 0, FALSE, 0, $10)
  `, [id, authorId, author, isAnon, dept, timeAgo, category, content, tags, avatar]);

  const res = await client.query('SELECT * FROM discussions WHERE id = $1', [id]);
  const p = res.rows[0];
  if (!p) return null;
  return {
    id: p.id,
    authorId: p.author_id,
    author: p.author,
    isAnon: Boolean(p.is_anon),
    dept: p.dept,
    time: p.time_ago,
    category: p.category,
    content: p.content,
    tags: parseJsonField(p.tags),
    likes: p.likes,
    isLiked: Boolean(p.is_liked),
    commentsCount: p.comments_count,
    avatar: p.avatar,
    isOwner: true
  };
}

async function deleteDiscussion(id, requestingUserId) {
  const client = getPool();
  const res = await client.query('SELECT * FROM discussions WHERE id = $1', [id]);
  const post = res.rows[0];
  if (!post) return { success: false, message: 'Post not found' };
  if (post.author_id && post.author_id !== requestingUserId) {
    throw new Error('UNAUTHORIZED_OWNER');
  }
  await client.query('DELETE FROM discussions WHERE id = $1', [id]);
  return { success: true, message: 'Discussion post deleted successfully.' };
}

async function toggleLikeDiscussion(id) {
  const client = getPool();
  const res = await client.query('SELECT * FROM discussions WHERE id = $1', [id]);
  const post = res.rows[0];
  if (!post) return null;

  const newIsLiked = !post.is_liked;
  const newLikes = newIsLiked ? post.likes + 1 : Math.max(0, post.likes - 1);

  await client.query('UPDATE discussions SET is_liked = $1, likes = $2 WHERE id = $3', [newIsLiked, newLikes, id]);
  return { id, isLiked: newIsLiked, likes: newLikes };
}

async function getDiscussionComments(postId) {
  const client = getPool();
  const res = await client.query(`
    SELECT * FROM discussion_comments WHERE post_id = $1 ORDER BY created_at ASC
  `, [postId]);
  return res.rows.map(c => ({
    id: c.id,
    postId: c.post_id,
    userId: c.user_id,
    author: c.author_name,
    avatar: c.author_avatar,
    text: c.comment_text,
    createdAt: c.created_at
  }));
}

async function addDiscussionComment(postId, userId, text, authorName, authorAvatar) {
  const client = getPool();
  const postRes = await client.query('SELECT * FROM discussions WHERE id = $1', [postId]);
  const post = postRes.rows[0];
  if (!post) return null;

  const res = await client.query(`
    INSERT INTO discussion_comments (post_id, user_id, author_name, author_avatar, comment_text)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [postId, userId, authorName || 'Verified Student', authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80', text]);

  await client.query('UPDATE discussions SET comments_count = comments_count + 1 WHERE id = $1', [postId]);

  // Notify post author
  if (post.author_id && post.author_id !== userId) {
    await client.query(`
      INSERT INTO notifications (user_id, icon, text_content, time_ago, is_unread)
      VALUES ($1, '💬', $2, 'Just now', TRUE)
    `, [post.author_id, `<b>${authorName || 'Someone'}</b> commented on your post: "${text.substring(0, 45)}..."`]);
  }

  const c = res.rows[0];
  return {
    id: c.id,
    postId: c.post_id,
    userId: c.user_id,
    author: c.author_name,
    avatar: c.author_avatar,
    text: c.comment_text,
    createdAt: c.created_at
  };
}

// -------------------------------------------------------------
// EVENTS & HACKATHONS
// -------------------------------------------------------------
async function getEvents(type = 'all', currentUserId = null) {
  const client = getPool();
  let res;
  if (type !== 'all') {
    res = await client.query('SELECT * FROM events WHERE event_type = $1 ORDER BY created_at DESC', [type]);
  } else {
    res = await client.query('SELECT * FROM events ORDER BY created_at DESC');
  }

  let userRegisteredEventIds = new Set();
  if (currentUserId) {
    const regRes = await client.query('SELECT event_id FROM event_registrations WHERE user_id = $1', [currentUserId]);
    userRegisteredEventIds = new Set(regRes.rows.map(r => r.event_id));
  }

  return res.rows.map(e => ({
    id: e.id,
    creatorId: e.creator_id,
    title: e.title,
    type: e.event_type,
    date: e.event_date,
    time: e.event_time,
    location: e.location,
    desc: e.description,
    prize: e.prize,
    isRegistered: userRegisteredEventIds.has(e.id),
    img: e.image_url
  }));
}

async function getEventById(id, currentUserId = null) {
  const client = getPool();
  const res = await client.query('SELECT * FROM events WHERE id = $1', [id]);
  const e = res.rows[0];
  if (!e) return null;

  let isRegistered = false;
  if (currentUserId) {
    const regCheck = await client.query('SELECT 1 FROM event_registrations WHERE event_id = $1 AND user_id = $2', [id, currentUserId]);
    isRegistered = regCheck.rows.length > 0;
  }

  return {
    id: e.id,
    creatorId: e.creator_id,
    title: e.title,
    type: e.event_type,
    date: e.event_date,
    time: e.event_time,
    location: e.location,
    desc: e.description,
    prize: e.prize,
    isRegistered: isRegistered,
    img: e.image_url
  };
}

async function createEvent(eventData, creatorId = null) {
  const client = getPool();
  const id = eventData.id || `event-${Date.now()}`;
  await client.query(`
    INSERT INTO events (id, creator_id, title, event_type, event_date, event_time, location, description, prize, image_url)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `, [
    id,
    creatorId,
    eventData.title,
    eventData.type || 'Hackathons',
    eventData.date || 'TBA',
    eventData.time || 'TBA',
    eventData.location || 'Campus Auditorium',
    eventData.desc || '',
    eventData.prize || 'Trophy + Certificates',
    eventData.img || 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&auto=format&fit=crop&q=80'
  ]);

  return await getEventById(id, creatorId);
}

async function registerEvent(eventId, userId = 'user-01') {
  const client = getPool();
  const event = await getEventById(eventId);
  if (!event) return null;

  // Duplicate registration prevention
  const existing = await client.query('SELECT id FROM event_registrations WHERE event_id = $1 AND user_id = $2', [eventId, userId]);
  if (existing.rows.length > 0) {
    return {
      id: event.id,
      title: event.title,
      isRegistered: true,
      alreadyRegistered: true,
      message: 'You are already registered for this event.'
    };
  }

  await client.query('INSERT INTO event_registrations (event_id, user_id) VALUES ($1, $2)', [eventId, userId]);

  // Scoped notification to the registering student
  await client.query(`
    INSERT INTO notifications (user_id, icon, text_content, time_ago, is_unread)
    VALUES ($1, '🎟️', $2, 'Just now', TRUE)
  `, [userId, `Your registration for <b>${event.title}</b> is confirmed!`]);

  return {
    id: event.id,
    title: event.title,
    isRegistered: true,
    alreadyRegistered: false,
    message: 'Registered successfully!'
  };
}

// -------------------------------------------------------------
// MARKETPLACE PRODUCTS
// -------------------------------------------------------------
async function getProducts(category = 'all', searchQuery = '') {
  const client = getPool();
  let res;
  if (category !== 'all') {
    res = await client.query('SELECT * FROM products WHERE category = $1 ORDER BY created_at DESC', [category]);
  } else {
    res = await client.query('SELECT * FROM products ORDER BY created_at DESC');
  }

  const products = res.rows.map(p => ({
    id: p.id,
    sellerId: p.seller_id,
    title: p.title,
    category: p.category,
    condition: p.condition,
    price: p.price,
    seller: p.seller,
    desc: p.description,
    img: p.image_url
  }));

  if (!searchQuery) return products;
  const q = searchQuery.toLowerCase();
  return products.filter(p => p.title.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q));
}

async function getProductById(id) {
  const client = getPool();
  const res = await client.query('SELECT * FROM products WHERE id = $1', [id]);
  const p = res.rows[0];
  if (!p) return null;
  return {
    id: p.id,
    sellerId: p.seller_id,
    title: p.title,
    category: p.category,
    condition: p.condition,
    price: p.price,
    seller: p.seller,
    desc: p.description,
    img: p.image_url
  };
}

async function createProduct(productData, sellerId = null) {
  const client = getPool();
  const id = `prod-${Date.now()}`;
  const price = productData.price.startsWith('₹') ? productData.price : `₹${productData.price}`;
  const img = productData.img || 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&auto=format&fit=crop&q=80';

  await client.query(`
    INSERT INTO products (id, seller_id, title, category, condition, price, seller, description, image_url)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `, [
    id,
    sellerId,
    productData.title,
    productData.category || 'Other',
    productData.condition || 'Used',
    price,
    productData.seller || 'Arjun Sharma',
    productData.desc || '',
    img
  ]);

  return await getProductById(id);
}

async function updateProduct(id, updates, requestingUserId) {
  const client = getPool();
  const p = await getProductById(id);
  if (!p) return null;
  if (p.sellerId && p.sellerId !== requestingUserId) {
    throw new Error('UNAUTHORIZED_OWNER');
  }

  const title = updates.title || p.title;
  const category = updates.category || p.category;
  const condition = updates.condition || p.condition;
  const price = updates.price ? (updates.price.startsWith('₹') ? updates.price : `₹${updates.price}`) : p.price;
  const desc = updates.desc !== undefined ? updates.desc : p.desc;
  const img = updates.img || p.img;

  await client.query(`
    UPDATE products 
    SET title = $1, category = $2, condition = $3, price = $4, description = $5, image_url = $6, updated_at = CURRENT_TIMESTAMP
    WHERE id = $7
  `, [title, category, condition, price, desc, img, id]);

  return await getProductById(id);
}

async function deleteProduct(id, requestingUserId) {
  const client = getPool();
  const p = await getProductById(id);
  if (!p) return { success: false, message: 'Product not found' };
  if (p.sellerId && p.sellerId !== requestingUserId) {
    throw new Error('UNAUTHORIZED_OWNER');
  }
  await client.query('DELETE FROM products WHERE id = $1', [id]);
  return { success: true, message: 'Product listing removed.' };
}

// -------------------------------------------------------------
// NOTIFICATIONS (USER SPECIFIC)
// -------------------------------------------------------------
async function getNotifications(userId = 'user-01') {
  const client = getPool();
  const res = await client.query(`
    SELECT * FROM notifications 
    WHERE user_id = $1 OR user_id IS NULL 
    ORDER BY created_at DESC 
    LIMIT 30
  `, [userId]);
  return res.rows.map(n => ({
    id: n.id,
    icon: n.icon,
    text: n.text_content,
    time: n.time_ago,
    unread: Boolean(n.is_unread)
  }));
}

async function markAllNotificationsRead(userId = 'user-01') {
  const client = getPool();
  await client.query(`
    UPDATE notifications SET is_unread = FALSE 
    WHERE user_id = $1 OR user_id IS NULL
  `, [userId]);
  return { success: true, message: 'All notifications marked as read.' };
}

// -------------------------------------------------------------
// CHATS & DIRECT MESSAGES (USER-TO-USER)
// -------------------------------------------------------------
async function getChats(userId = 'user-01') {
  const client = getPool();
  const chatsRes = await client.query(`
    SELECT * FROM chats 
    WHERE user1_id = $1 OR user2_id = $1 OR user1_id IS NULL
    ORDER BY updated_at DESC
  `, [userId]);

  const chats = [];
  for (const c of chatsRes.rows) {
    const msgRes = await client.query(`
      SELECT id, sender_id, sender, message_text as text, created_at FROM chat_messages 
      WHERE chat_id = $1 ORDER BY created_at ASC
    `, [c.id]);

    chats.push({
      id: c.id,
      user1Id: c.user1_id,
      user2Id: c.user2_id,
      peerName: c.peer_name,
      peerStatus: c.peer_status,
      avatar: c.avatar,
      lastMessage: c.last_message,
      messages: msgRes.rows.map(m => ({
        id: m.id,
        sender: m.sender_id === userId ? 'me' : m.sender,
        text: m.text,
        createdAt: m.created_at
      }))
    });
  }

  return chats;
}

async function getOrCreateChat(user1Id, user2Id, peerName, avatar, peerStatus) {
  const client = getPool();
  let res = await client.query(`
    SELECT * FROM chats 
    WHERE (LOWER(peer_name) = LOWER($1))
       OR (user1_id = $2 AND user2_id = $3)
       OR (user1_id = $3 AND user2_id = $2)
    LIMIT 1
  `, [peerName, user1Id, user2Id]);

  let chat = res.rows[0];

  if (!chat) {
    const id = `chat-${Date.now()}`;
    const av = avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80';
    const st = peerStatus || 'Verified Campus Builder';
    const initMsg = 'Connected on CampusHub';

    await client.query(`
      INSERT INTO chats (id, user1_id, user2_id, peer_name, peer_status, avatar, last_message)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [id, user1Id, user2Id, peerName, st, av, initMsg]);

    await client.query(`
      INSERT INTO chat_messages (chat_id, sender_id, sender, message_text)
      VALUES ($1, $2, 'peer', $3)
    `, [id, user2Id, `Hey! Ready to build together.`]);

    res = await client.query('SELECT * FROM chats WHERE id = $1', [id]);
    chat = res.rows[0];
  }

  const msgRes = await client.query(`
    SELECT id, sender_id, sender, message_text as text, created_at 
    FROM chat_messages WHERE chat_id = $1 ORDER BY created_at ASC
  `, [chat.id]);

  return {
    id: chat.id,
    user1Id: chat.user1_id,
    user2Id: chat.user2_id,
    peerName: chat.peer_name,
    peerStatus: chat.peer_status,
    avatar: chat.avatar,
    lastMessage: chat.last_message,
    messages: msgRes.rows.map(m => ({
      id: m.id,
      sender: m.sender_id === user1Id ? 'me' : m.sender,
      text: m.text,
      createdAt: m.created_at
    }))
  };
}

async function sendMessage(chatId, senderId, senderName, messageText) {
  const client = getPool();
  const insertRes = await client.query(`
    INSERT INTO chat_messages (chat_id, sender_id, sender, message_text)
    VALUES ($1, $2, $3, $4)
    RETURNING id, created_at
  `, [chatId, senderId, senderName || 'me', messageText]);

  await client.query(`
    UPDATE chats 
    SET last_message = $1, updated_at = CURRENT_TIMESTAMP 
    WHERE id = $2
  `, [messageText, chatId]);

  return {
    id: insertRes.rows[0].id,
    chatId,
    sender: senderName || 'me',
    senderId,
    text: messageText,
    createdAt: insertRes.rows[0].created_at
  };
}

// -------------------------------------------------------------
// RESET / RE-SEED UTILITY
// -------------------------------------------------------------
async function resetAndSeed() {
  await initSchema();
  await seedData();
  return { success: true, message: 'Database reset and re-seeded successfully.' };
}

module.exports = {
  getDB,
  getPool,
  initSchema,
  seedData,
  getUser,
  getUserByEmail,
  updateUser,
  createOrUpdateUser,
  saveEmailOtp,
  getActiveOtp,
  incrementOtpAttempts,
  deleteEmailOtp,
  getRoadmaps,
  getTeams,
  getTeamById,
  createTeam,
  applyToTeam,
  getTeamApplications,
  updateApplicationStatus,
  deleteTeam,
  getStudents,
  getCommunities,
  getCommunityById,
  createCommunity,
  joinCommunity,
  leaveCommunity,
  getDiscussions,
  createDiscussion,
  deleteDiscussion,
  toggleLikeDiscussion,
  getDiscussionComments,
  addDiscussionComment,
  getEvents,
  getEventById,
  createEvent,
  registerEvent,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getNotifications,
  markAllNotificationsRead,
  getChats,
  getOrCreateChat,
  sendMessage,
  resetAndSeed
};
