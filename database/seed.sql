-- =========================================================
-- CAMPUSHUB INITIAL SEED DATA (Supabase / PostgreSQL)
-- Version 2.1.0
-- =========================================================

-- 1. SEED USER
INSERT INTO users (id, name, college, department, year, email, is_verified, bio, skills, interests, avatar, xp)
VALUES (
    'user-01',
    'Arjun Sharma',
    'CGC Landran',
    'Computer Science Engineering',
    '3rd Year',
    'arjun.sharma@cgc.edu.in',
    TRUE,
    'Passionate full-stack developer & ML enthusiast. Building scalable web apps and AI-driven tools. Always open for hackathon collaborations and startup capstone projects.',
    '["Python", "React.js", "Machine Learning", "UI/UX Design", "FastAPI", "Tailwind CSS"]'::jsonb,
    '["AI / ML", "Programming", "Hackathons", "Startup", "Design"]'::jsonb,
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    2450
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    college = EXCLUDED.college,
    department = EXCLUDED.department,
    year = EXCLUDED.year,
    email = EXCLUDED.email,
    bio = EXCLUDED.bio,
    skills = EXCLUDED.skills,
    interests = EXCLUDED.interests,
    avatar = EXCLUDED.avatar,
    xp = EXCLUDED.xp;

-- 2. SEED ROADMAPS
INSERT INTO roadmaps (track_key, title, description) VALUES
('ai', 'AI & Deep Learning Engineer', 'From Python foundations to PyTorch transformer fine-tuning, RAG pipelines, and edge model quantization.'),
('fullstack', 'Full-Stack SaaS Developer (Next.js & Cloud)', 'Build high-performance web applications using modern TypeScript, Tailwind CSS, PostgreSQL, and serverless backends.'),
('design', 'UI/UX & Product Designer', 'Master Figma wireframing, high-fidelity micro-interactions, responsive design systems, and user testing.'),
('devops', 'Cloud & DevOps Engineer', 'Containerization, Kubernetes clusters, CI/CD GitHub Actions, and production observability.')
ON CONFLICT (track_key) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description;

-- 3. SEED MILESTONES & TASKS
INSERT INTO milestones (id, roadmap_track, phase, title, project, milestone_order) VALUES
(1, 'ai', 'PHASE 01 • FOUNDATIONS', 'Python, Vector Math & NumPy Calculus', '📈 Project: Build a linear regression engine from scratch without scikit-learn.', 1),
(2, 'ai', 'PHASE 02 • DEEP LEARNING', 'PyTorch, CNNs & Vision Transformers', '👁️ Project: Pneumonia & lung anomaly detector trained on ChestX-Ray14 dataset.', 2),
(3, 'ai', 'PHASE 03 • LLMS & RAG', 'LangChain, Vector Databases & Quantization', '🚀 Project: Offline campus exam tutor with document source grounding.', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO milestone_tasks (milestone_id, task_text, is_completed) VALUES
(1, 'Matrix operations with NumPy', TRUE),
(1, 'Data cleaning with Pandas', TRUE),
(1, 'Vectorized math implementations', TRUE),
(2, 'Custom dataset loaders', TRUE),
(2, 'Convolutional feature extractors', TRUE),
(2, 'Transfer learning with ResNet/ViT', TRUE),
(3, 'ChromaDB / Pinecone vector indexes', TRUE),
(3, 'Semantic search & rerankers', TRUE),
(3, 'Local Llama-3 GGML hosting', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO milestones (id, roadmap_track, phase, title, project, milestone_order) VALUES
(4, 'fullstack', 'PHASE 01 • MODERN FRONTEND', 'Next.js App Router & TypeScript', '💻 Project: Interactive student dashboard with real-time WebSocket metrics.', 1),
(5, 'fullstack', 'PHASE 02 • BACKEND & DB', 'PostgreSQL, Prisma & Authentication', '🛡️ Project: Student marketplace with verified payment escrows.', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO milestone_tasks (milestone_id, task_text, is_completed) VALUES
(4, 'Server Components & Client boundaries', TRUE),
(4, 'Tailwind CSS design systems', TRUE),
(4, 'Zustand state store', TRUE),
(5, 'Schema migrations & indexes', TRUE),
(5, 'JWT & OAuth sessions', TRUE),
(5, 'REST & GraphQL API design', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO milestones (id, roadmap_track, phase, title, project, milestone_order) VALUES
(6, 'design', 'PHASE 01 • DESIGN SYSTEMS', 'Figma Auto-Layout & Design Tokens', '🎨 Project: Complete design system kit for a campus ride-sharing app.', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO milestone_tasks (milestone_id, task_text, is_completed) VALUES
(6, 'Component variant architecture', TRUE),
(6, 'Color theory & accessibility contrast', TRUE),
(6, 'Mobile-first grid frames', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO milestones (id, roadmap_track, phase, title, project, milestone_order) VALUES
(7, 'devops', 'PHASE 01 • CONTAINERS & CI/CD', 'Docker, GitHub Actions & Slurm', '☁️ Project: Multi-node GPU cluster scheduler for student compilation jobs.', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO milestone_tasks (milestone_id, task_text, is_completed) VALUES
(7, 'Multi-stage Docker builds', TRUE),
(7, 'Automated test runners on push', TRUE),
(7, 'Automated server deployment', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 4. SEED TEAMS
INSERT INTO teams (id, owner_id, title, event_type, event_name, description, team_status, github) VALUES
('team-01', 'user-01', 'AI Study Assistant', 'HACKATHON', 'Smart India Hackathon 2026', 'Building an AI tool to help students summarize complex lecture notes, auto-generate flashcards, and solve conceptual math/coding doubts with step-by-step guidance.', '3 / 6 members', 'https://github.com/campus-collab/ai-study-assistant'),
('team-02', 'user-01', 'Campus Green-Ride Pool', 'STARTUP', 'Campus Incubator', 'Peer campus carpooling and bicycle sharing coordination platform connecting verified students living off-campus within a 5-mile perimeter. Zero commissions.', '2 / 4 members', 'https://github.com/campus-collab/green-ride'),
('team-03', 'user-01', 'Autonomous Campus Rover', 'RESEARCH', 'Robotics Lab', 'Sidewalk navigation robotics stack utilizing ROS2 Humble and TensorRT vision models for autonomous inter-department document and hardware deliveries.', '4 / 5 members', 'https://github.com/campus-collab/rover-kernel'),
('team-04', 'user-01', 'MedTech Diagnostics Portal', 'HACKATHON', 'IEEE Ideathon 2026', 'Privacy-first medical image screening portal enabling rural health clinic technicians to run offline automated pneumonia and diabetic retinopathy inference.', '2 / 4 members', 'https://github.com/campus-collab/medtech-ai')
ON CONFLICT (id) DO UPDATE SET
    owner_id = EXCLUDED.owner_id,
    title = EXCLUDED.title,
    event_type = EXCLUDED.event_type,
    event_name = EXCLUDED.event_name,
    description = EXCLUDED.description,
    team_status = EXCLUDED.team_status,
    github = EXCLUDED.github;

-- 5. SEED TEAM ROLES
INSERT INTO team_needed_roles (team_id, role_name) VALUES
('team-01', 'Frontend Developer'), ('team-01', 'ML Engineer'), ('team-01', 'UI/UX Designer'),
('team-02', 'Backend Developer'), ('team-02', 'UI/UX Designer'), ('team-02', 'Marketing'),
('team-03', 'ML Engineer'), ('team-03', 'Testing'),
('team-04', 'Frontend Developer'), ('team-04', 'UI/UX Designer'), ('team-04', 'Data Scientist');

-- 6. SEED TEAM MEMBERS
INSERT INTO team_members (team_id, name, role, avatar) VALUES
('team-01', 'Kavya Singh', 'Team Lead', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80'),
('team-01', 'Aman Verma', 'Backend', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80'),
('team-01', 'Arjun Sharma', 'Python/AI', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'),
('team-02', 'Rohan Gupta', 'Founder', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80'),
('team-02', 'Sneha Roy', 'Operations', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=80'),
('team-03', 'Vikram Joshi', 'Hardware Lead', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80'),
('team-03', 'Priya Patel', 'Vision Lead', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80'),
('team-04', 'Tanvi Kapoor', 'Data Lead', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80');

-- 7. SEED STUDENTS FOR SMART MATCHING
INSERT INTO students (id, name, college, department, skills, interests, match_score, reason, avatar) VALUES
('student-01', 'Rahul Sharma', 'CGC Landran', 'CSE • 3rd Year', '["Python", "Machine Learning", "FastAPI", "PyTorch", "Docker"]'::jsonb, '["AI / ML", "Hackathons", "Programming"]'::jsonb, 94, 'Strong match because you both are passionate about AI, Python backends, and hackathon project builds.', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'),
('student-02', 'Priya Patel', 'CGC Landran', 'IT • 3rd Year', '["UI/UX Design", "Figma", "React.js", "Tailwind CSS"]'::jsonb, '["Design", "Startup", "Hackathons"]'::jsonb, 89, 'High synergy match: Your full-stack/AI capabilities perfectly complement her UI/UX design skillset.', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80'),
('student-03', 'Ananya Verma', 'Chandigarh University', 'AI & Data Science • 2nd Year', '["Python", "TensorFlow", "Data Science", "SQL"]'::jsonb, '["AI / ML", "Placement", "Startup"]'::jsonb, 86, 'Shared interest in NLP pipelines and machine learning research projects.', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    college = EXCLUDED.college,
    department = EXCLUDED.department,
    skills = EXCLUDED.skills,
    interests = EXCLUDED.interests,
    match_score = EXCLUDED.match_score,
    reason = EXCLUDED.reason,
    avatar = EXCLUDED.avatar;

-- 8. SEED COMMUNITIES
INSERT INTO communities (id, creator_id, name, category, icon, members_count, online_count, description) VALUES
('comm-cgc', 'user-01', 'CGC Landran Official', 'General', '🏛️', '8,490 Members', '412 Online', 'The official campus community for students of CGC Landran. News, campus notices, fest updates, and discussions.'),
('comm-ai', 'user-01', 'AI & Data Science Club', 'AI Club', '🤖', '1,240 Members', '98 Online', 'Workshops on PyTorch, computer vision, paper discussions, Kaggle competitions, and collaborative ML projects.'),
('comm-cse', 'user-01', 'CSE Department Hub', 'CSE', '💻', '3,850 Members', '185 Online', 'Course syllabus discussions, DSA problem-solving groups, lab assignment tips, and professor announcements.'),
('comm-placement', 'user-01', 'Campus Placements 2026', 'Placements', '💼', '4,820 Members', '340 Online', 'Interview experiences, company drive notifications, resume reviews, referral requests, and placement tips.'),
('comm-hostel', 'user-01', 'Hostelites & PG Network', 'Hostel', '🛏️', '2,910 Members', '120 Online', 'Hostel food feedback, late-night study groups, PG room vacancies, roommate matching, and mess menu alerts.'),
('comm-lost', 'user-01', 'Lost & Found — Landran', 'Lost & Found', '🔍', '5,100 Members', '64 Online', 'Report lost ID cards, calculators, cycle keys, earplugs, or claim items found across campus grounds.')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    icon = EXCLUDED.icon,
    members_count = EXCLUDED.members_count,
    online_count = EXCLUDED.online_count,
    description = EXCLUDED.description;

-- 9. SEED DISCUSSIONS
INSERT INTO discussions (id, author_id, author, is_anon, dept, time_ago, category, content, tags, likes, is_liked, comments_count, avatar) VALUES
('post-01', 'user-01', 'Kavya Singh', FALSE, 'CSE • 3rd Year', '2h ago', 'Placement', 'How to prepare for placements from 2nd year? For those who cleared Tier-1 company rounds (Microsoft/Amazon), what roadmap would you recommend for DSA and core CS fundamentals?', '["Placement", "DSA", "Roadmap"]'::jsonb, 42, FALSE, 18, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80'),
('post-02', 'user-01', 'Anonymous Student', TRUE, 'Verified Student', '4h ago', 'Academic', 'Anyone has previous 5 years solved question papers for CS401 (Compiler Design)? Our mid-terms are starting next Monday.', '["Academic", "Exams", "CS401"]'::jsonb, 19, FALSE, 7, 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO UPDATE SET
    author_id = EXCLUDED.author_id,
    author = EXCLUDED.author,
    is_anon = EXCLUDED.is_anon,
    dept = EXCLUDED.dept,
    time_ago = EXCLUDED.time_ago,
    category = EXCLUDED.category,
    content = EXCLUDED.content,
    tags = EXCLUDED.tags,
    avatar = EXCLUDED.avatar;

-- 10. SEED DISCUSSION COMMENTS
INSERT INTO discussion_comments (id, post_id, user_id, author_name, author_avatar, comment_text) VALUES
(1, 'post-01', 'user-01', 'Arjun Sharma', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80', 'Focus on NeetCode 150 first and consistently participate in LeetCode weekly contests.'),
(2, 'post-01', 'student-01', 'Rahul Sharma', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80', 'Also make sure you build at least two production-grade fullstack or ML projects.')
ON CONFLICT (id) DO NOTHING;

-- 11. SEED EVENTS
INSERT INTO events (id, creator_id, title, event_type, event_date, event_time, location, description, prize, image_url) VALUES
('event-01', 'user-01', 'IEEE Ideathon 2026', 'Hackathons', '6–7 Aug 2026', '09:00 AM – 06:00 PM IST', 'Auditorium Hall, CGC Landran', 'AI-driven ideas and development hackathon. 24-hour sprint to build scalable solutions for Healthcare, FinTech, and CleanTech.', '₹1,50,000 Cash Pool', 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&auto=format&fit=crop&q=80'),
('event-02', 'user-01', 'Deep Learning & PyTorch Workshop', 'Workshops', '14 Aug 2026', '02:00 PM – 05:00 PM IST', 'Lab 402, Block 3', 'Hands-on session on fine-tuning vision and language transformers. Certificate and GPU compute credits provided.', 'Free GPU Credits', 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&auto=format&fit=crop&q=80'),
('event-03', 'user-01', 'Smart India Hackathon Internal Selection', 'Competitions', '22 Aug 2026', 'Full Day Hybrid', 'Central Seminar Hall', 'Official college evaluation round to shortlist top 15 teams representing the campus at SIH 2026 Grand Finale.', 'Direct Nomination', 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=600&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO UPDATE SET
    creator_id = EXCLUDED.creator_id,
    title = EXCLUDED.title,
    event_type = EXCLUDED.event_type,
    event_date = EXCLUDED.event_date,
    event_time = EXCLUDED.event_time,
    location = EXCLUDED.location,
    description = EXCLUDED.description,
    prize = EXCLUDED.prize,
    image_url = EXCLUDED.image_url;

-- 12. SEED MARKETPLACE PRODUCTS
INSERT INTO products (id, seller_id, title, category, condition, price, seller, description, image_url) VALUES
('prod-01', 'user-01', 'HP Pavilion 15 Laptop (Core i5 11th Gen, 16GB RAM)', 'Laptop', 'Used - Good', '₹25,000', 'Vikram Joshi', '15.6" Full HD display, 512GB NVMe SSD, 16GB DDR4 RAM. Battery holds 4+ hours. Perfect for coding and web dev.', 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&auto=format&fit=crop&q=80'),
('prod-02', 'user-01', 'Hero Sprint 21-Speed Gear Mountain Bicycle', 'Cycle', 'Used - Good', '₹4,500', 'Rohan Gupta', 'Dual disc brakes, front suspension, 21-speed Shimano gears. Maintained regularly.', 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&auto=format&fit=crop&q=80'),
('prod-03', 'user-01', 'Complete DSA & Algorithms Book Bundle (CLRS + Striver)', 'Books', 'Like New', '₹650', 'Sneha Roy', 'Introduction to Algorithms 3rd Edition + printed spiral bound handbook of top 200 DSA patterns.', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80')
ON CONFLICT (id) DO UPDATE SET
    seller_id = EXCLUDED.seller_id,
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    condition = EXCLUDED.condition,
    price = EXCLUDED.price,
    seller = EXCLUDED.seller,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url;

-- 13. SEED NOTIFICATIONS (Scoped to user-01)
INSERT INTO notifications (id, user_id, icon, text_content, time_ago, is_unread) VALUES
(1, 'user-01', '⚡', '<b>Rahul Sharma</b> applied to join your <b>AI Study Assistant</b> squad.', '10m ago', TRUE),
(2, 'user-01', '🏆', '<b>IEEE Ideathon 2026</b> registration closes in 4 days.', '2h ago', TRUE),
(3, 'user-01', '🔥', 'You unlocked <b>+150 XP</b> for publishing project notes!', '1d ago', FALSE)
ON CONFLICT (id) DO NOTHING;

-- 14. SEED CHATS
INSERT INTO chats (id, user1_id, user2_id, peer_name, peer_status, avatar, last_message) VALUES
('chat-1', 'user-01', 'student-01', 'Rahul Sharma', 'Online • CSE 3rd Year', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80', 'Hey Arjun! Saw your AI project. Can I join as ML lead?')
ON CONFLICT (id) DO UPDATE SET
    user1_id = EXCLUDED.user1_id,
    user2_id = EXCLUDED.user2_id,
    peer_name = EXCLUDED.peer_name,
    peer_status = EXCLUDED.peer_status,
    avatar = EXCLUDED.avatar,
    last_message = EXCLUDED.last_message;

INSERT INTO chat_messages (id, chat_id, sender_id, sender, message_text) VALUES
(1, 'chat-1', 'student-01', 'peer', 'Hey Arjun! Are you participating in the Smart India Hackathon?'),
(2, 'chat-1', 'user-01', 'me', 'Hey Rahul! Yes, we are forming a 6-person team for the AI Study Assistant problem statement.'),
(3, 'chat-1', 'student-01', 'peer', 'Saw your project card. I have PyTorch & FastAPI experience. Can I join as ML lead?')
ON CONFLICT (id) DO NOTHING;

-- 15. Sequence alignment for serial IDs
SELECT setval(pg_get_serial_sequence('milestones', 'id'), coalesce(max(id), 1)) FROM milestones;
SELECT setval(pg_get_serial_sequence('milestone_tasks', 'id'), coalesce(max(id), 1)) FROM milestone_tasks;
SELECT setval(pg_get_serial_sequence('team_needed_roles', 'id'), coalesce(max(id), 1)) FROM team_needed_roles;
SELECT setval(pg_get_serial_sequence('team_members', 'id'), coalesce(max(id), 1)) FROM team_members;
SELECT setval(pg_get_serial_sequence('team_applications', 'id'), coalesce(max(id), 1)) FROM team_applications;
SELECT setval(pg_get_serial_sequence('discussion_comments', 'id'), coalesce(max(id), 1)) FROM discussion_comments;
SELECT setval(pg_get_serial_sequence('notifications', 'id'), coalesce(max(id), 1)) FROM notifications;
SELECT setval(pg_get_serial_sequence('chat_messages', 'id'), coalesce(max(id), 1)) FROM chat_messages;
