-- =========================================================
-- CAMPUSHUB PRODUCTION DATABASE SCHEMA (Supabase / PostgreSQL)
-- Version 2.1.0
-- Production Ready & Safe for fresh execution
-- =========================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    college TEXT NOT NULL DEFAULT 'CGC Landran',
    department TEXT NOT NULL DEFAULT 'Computer Science Engineering',
    year TEXT NOT NULL DEFAULT '3rd Year',
    email TEXT UNIQUE NOT NULL,
    is_verified BOOLEAN DEFAULT TRUE,
    bio TEXT,
    skills JSONB DEFAULT '[]'::jsonb,
    interests JSONB DEFAULT '[]'::jsonb,
    avatar TEXT,
    xp INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));

-- 2. EMAIL OTPS TABLE (Cryptographic Authentication)
CREATE TABLE IF NOT EXISTS email_otps (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    expires_at BIGINT NOT NULL,
    attempts INTEGER DEFAULT 0,
    created_at BIGINT NOT NULL,
    last_sent_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_email_otps_email ON email_otps(LOWER(email));

-- 3. ROADMAPS TABLE
CREATE TABLE IF NOT EXISTS roadmaps (
    track_key TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. ROADMAP MILESTONES
CREATE TABLE IF NOT EXISTS milestones (
    id SERIAL PRIMARY KEY,
    roadmap_track TEXT NOT NULL REFERENCES roadmaps(track_key) ON DELETE CASCADE,
    phase TEXT NOT NULL,
    title TEXT NOT NULL,
    project TEXT NOT NULL,
    milestone_order INTEGER DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_milestones_track ON milestones(roadmap_track);

-- 5. MILESTONE TASKS
CREATE TABLE IF NOT EXISTS milestone_tasks (
    id SERIAL PRIMARY KEY,
    milestone_id INTEGER NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
    task_text TEXT NOT NULL,
    is_completed BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_milestone_tasks_milestone ON milestone_tasks(milestone_id);

-- 6. TEAMS TABLE (Squads / Project Collaborations)
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'HACKATHON',
    event_name TEXT NOT NULL,
    description TEXT NOT NULL,
    team_status TEXT NOT NULL DEFAULT '1 / 4 members',
    github TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_teams_created ON teams(created_at DESC);

-- 7. TEAM NEEDED ROLES
CREATE TABLE IF NOT EXISTS team_needed_roles (
    id SERIAL PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    role_name TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_team_roles_team ON team_needed_roles(team_id);

-- 8. TEAM MEMBERS
CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);

-- 9. TEAM SQUAD APPLICATIONS
CREATE TABLE IF NOT EXISTS team_applications (
    id SERIAL PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    applicant_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    role_applied TEXT NOT NULL,
    reason TEXT NOT NULL,
    github_portfolio TEXT,
    applicant_name TEXT NOT NULL,
    applicant_email TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_team_apps_team ON team_applications(team_id);
CREATE INDEX IF NOT EXISTS idx_team_apps_applicant ON team_applications(applicant_id);

-- 10. SMART MATCH STUDENTS
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    college TEXT NOT NULL,
    department TEXT NOT NULL,
    skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    interests JSONB NOT NULL DEFAULT '[]'::jsonb,
    match_score INTEGER NOT NULL DEFAULT 85,
    reason TEXT NOT NULL,
    avatar TEXT
);

-- 11. COMMUNITIES
CREATE TABLE IF NOT EXISTS communities (
    id TEXT PRIMARY KEY,
    creator_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    icon TEXT NOT NULL,
    members_count TEXT NOT NULL DEFAULT '1',
    online_count TEXT NOT NULL DEFAULT '1',
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_communities_category ON communities(category);

-- 12. COMMUNITY MEMBERSHIP
CREATE TABLE IF NOT EXISTS community_members (
    id SERIAL PRIMARY KEY,
    community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_community_member UNIQUE (community_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_comm_members_user ON community_members(user_id);

-- 13. DISCUSSIONS / FEED POSTS
CREATE TABLE IF NOT EXISTS discussions (
    id TEXT PRIMARY KEY,
    author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    author TEXT NOT NULL,
    is_anon BOOLEAN DEFAULT FALSE,
    dept TEXT NOT NULL DEFAULT 'Verified Student',
    time_ago TEXT NOT NULL DEFAULT 'Just now',
    category TEXT NOT NULL DEFAULT 'General',
    content TEXT NOT NULL,
    tags JSONB DEFAULT '[]'::jsonb,
    likes INTEGER DEFAULT 0,
    is_liked BOOLEAN DEFAULT FALSE,
    comments_count INTEGER DEFAULT 0,
    avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_discussions_created ON discussions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussions_category ON discussions(category);
CREATE INDEX IF NOT EXISTS idx_discussions_author ON discussions(author_id);

-- 14. DISCUSSION COMMENTS / REPLIES
CREATE TABLE IF NOT EXISTS discussion_comments (
    id SERIAL PRIMARY KEY,
    post_id TEXT NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    author_avatar TEXT,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON discussion_comments(post_id);

-- 15. EVENTS & HACKATHONS
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    creator_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'HACKATHON',
    event_date TEXT NOT NULL,
    event_time TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT NOT NULL,
    prize TEXT NOT NULL DEFAULT 'Trophy + Swag',
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at DESC);

-- 16. EVENT REGISTRATIONS (Duplicate Prevention & User Tracking)
CREATE TABLE IF NOT EXISTS event_registrations (
    id SERIAL PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    registered_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_event_user_reg UNIQUE (event_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_event_reg_event ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reg_user ON event_registrations(user_id);

-- 17. MARKETPLACE PRODUCTS
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    seller_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Other',
    condition TEXT NOT NULL DEFAULT 'Used',
    price TEXT NOT NULL,
    seller TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_created ON products(created_at DESC);

-- 18. NOTIFICATIONS (User-Specific Alerts)
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    icon TEXT NOT NULL DEFAULT '⚡',
    text_content TEXT NOT NULL,
    time_ago TEXT NOT NULL DEFAULT 'Just now',
    is_unread BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_unread);

-- 19. CHATS (User-to-User Conversations)
CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    user1_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    user2_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    peer_name TEXT NOT NULL,
    peer_status TEXT NOT NULL DEFAULT 'Verified Campus Builder',
    avatar TEXT,
    last_message TEXT,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_chats_user1 ON chats(user1_id);
CREATE INDEX IF NOT EXISTS idx_chats_user2 ON chats(user2_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated ON chats(updated_at DESC);

-- 20. CHAT MESSAGES
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    sender TEXT NOT NULL, -- 'me' or 'peer' (or user ID)
    message_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at ASC);
