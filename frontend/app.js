/**
 * CAMPUSHUB — NOT YOUR COLLEGE (NYC) JAVASCRIPT CONTROLLER
 * High-octane, zero-dependency ES6 application logic.
 */

/**
 * CAMPUSHUB API CONFIGURATION
 * Configures the backend REST API endpoint for Localhost, GitHub Pages, and Render.
 * Set window.CAMPUSHUB_API_URL or update PROD_URL with your Render backend URL.
 */
const API_CONFIG = {
  // ⚡ Default deployed Koyeb backend URL:
  PROD_URL: 'https://campushub-backend.koyeb.app/api',

  get BASE_URL() {
    if (typeof window !== 'undefined' && window.CAMPUSHUB_API_URL) {
      return window.CAMPUSHUB_API_URL.replace(/\/+$/, '');
    }
    if (typeof localStorage !== 'undefined' && localStorage.getItem('campushub_api_url')) {
      return localStorage.getItem('campushub_api_url').replace(/\/+$/, '');
    }
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return window.location.port === '3000' ? 'http://localhost:5000/api' : '/api';
    }
    if (typeof window !== 'undefined' && window.location.hostname.endsWith('github.io')) {
      return this.PROD_URL.replace(/\/+$/, '');
    }
    return '/api';
  },

  get SOCKET_URL() {
    const base = this.BASE_URL.replace(/\/api\/?$/, '');
    return base || (typeof window !== 'undefined' ? window.location.origin : '');
  }
};

/**
 * Switch or test against any custom Koyeb backend directly from console
 */
window.setBackendUrl = function(url) {
  if (!url) {
    localStorage.removeItem('campushub_api_url');
    console.log('⚡ [CAMPUSHUB] Reset backend API to auto-detected default.');
  } else {
    const clean = url.replace(/\/+$/, '');
    const apiUrl = clean.endsWith('/api') ? clean : `${clean}/api`;
    localStorage.setItem('campushub_api_url', apiUrl);
    console.log('⚡ [CAMPUSHUB] Set backend API to:', apiUrl);
  }
  location.reload();
};

/**
 * Universal API Request Helper with JWT Token & HttpOnly credentials
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  const token = localStorage.getItem('campushub_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    });
    const data = await res.json().catch(() => ({ success: false, message: 'Invalid response from server' }));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.warn(`API Request [${endpoint}] warning:`, err.message);
    return { ok: false, status: 0, data: { success: false, message: 'Server unreachable. Operating in offline/cache mode.' } };
  }
}

// Global Socket.IO client instance
let socket = null;

function initSocket() {
  if (typeof io === 'undefined') return;
  if (socket && socket.connected) return;

  const token = localStorage.getItem('campushub_token');
  try {
    socket = io(API_CONFIG.SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      timeout: 10000
    });

    socket.on('connect', () => {
      console.log('⚡ [Socket.IO] Connected to CampusHub Real-Time Server:', socket.id);
    });

    socket.on('receive_message', (data) => {
      if (!data || !data.message) return;
      const { chatId, message } = data;
      let chat = store.chats.find(c => c.id === chatId);
      if (!chat) {
        chat = {
          id: chatId,
          peerName: message.sender || 'Student Builder',
          peerStatus: 'Online • Verified Builder',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
          lastMessage: message.text,
          messages: []
        };
        store.chats.unshift(chat);
      }

      const isMyMsg = message.senderId === store.currentUser?.id;
      // Prevent duplicate messages if optimistic update already pushed
      const exists = chat.messages.some(m => m.id === message.id || (m.text === message.text && Math.abs(new Date(m.createdAt || 0) - new Date(message.createdAt || 0)) < 3000));
      if (!exists) {
        chat.messages.push({
          id: message.id,
          sender: isMyMsg ? 'me' : 'peer',
          text: message.text,
          createdAt: message.createdAt
        });
        chat.lastMessage = message.text;
      }

      const chatDrawer = document.getElementById('chat-drawer');
      const isDrawerOpen = chatDrawer && chatDrawer.classList.contains('active');
      if (isDrawerOpen) {
        renderChatDrawer();
      } else if (!isMyMsg) {
        showToast(`💬 ${chat.peerName}: "${message.text.substring(0, 35)}..."`);
      }
    });

    socket.on('presence_update', ({ userId, status }) => {
      // Real-time online status indicator update
      const activeChat = store.chats[store.activeChatIndex];
      if (activeChat && (activeChat.user2Id === userId || activeChat.peerName.toLowerCase().includes(userId.toLowerCase()))) {
        activeChat.peerStatus = status === 'online' ? '🟢 Active Now' : 'Offline';
        const statusEl = document.getElementById('chat-peer-status');
        if (statusEl) statusEl.textContent = activeChat.peerStatus;
      }
    });
  } catch (err) {
    console.warn('Socket initialization skipped:', err.message);
  }
}

const defaultUser = {
  name: 'Arjun Sharma',
  college: 'CGC Landran',
  department: 'Computer Science Engineering',
  year: '3rd Year',
  email: 'arjun.sharma@cgc.edu.in',
  isVerified: true,
  bio: 'Passionate full-stack developer & ML enthusiast. Building scalable web apps and AI-driven tools. Always open for hackathon collaborations and startup capstone projects.',
  skills: ['Python', 'React.js', 'Machine Learning', 'FastAPI', 'UI/UX Design', 'Tailwind CSS'],
  interests: ['AI / ML', 'Programming', 'Hackathons', 'Startup', 'Design'],
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
  xp: 2450
};

function loadStoredUser() {
  try {
    const saved = localStorage.getItem('campushub_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.name) return parsed;
    }
  } catch (e) {
    console.error('Error loading stored user:', e);
  }
  return defaultUser;
}

const store = {
  currentUser: loadStoredUser(),
  verifyingEmail: '',
  authMode: 'signup', // 'signup' | 'login'
  tempRegistration: {
    email: '',
    name: '',
    college: 'CGC Landran',
    department: 'Computer Science Engineering',
    year: '3rd Year',
    interests: ['AI / ML', 'Fullstack', 'Hackathons']
  },
  isLoggedIn: Boolean(localStorage.getItem('campushub_token') || localStorage.getItem('campushub_user')),

  activeView: 'home',
  activeRoadmap: 'ai',
  onboardingStep: 1,

  // PROJECT-FIRST DEVELOPER ROADMAPS (NYC SPECIAL)
  roadmaps: {
    ai: {
      title: 'AI & Deep Learning Engineer',
      desc: 'From Python foundations to PyTorch transformer fine-tuning, RAG pipelines, and edge model quantization.',
      milestones: [
        {
          phase: 'PHASE 01 • FOUNDATIONS',
          title: 'Python, Vector Math & NumPy Calculus',
          tasks: ['Matrix operations with NumPy', 'Data cleaning with Pandas', 'Vectorized math implementations'],
          project: '📈 Project: Build a linear regression engine from scratch without scikit-learn.'
        },
        {
          phase: 'PHASE 02 • DEEP LEARNING',
          title: 'PyTorch, CNNs & Vision Transformers',
          tasks: ['Custom dataset loaders', 'Convolutional feature extractors', 'Transfer learning with ResNet/ViT'],
          project: '👁️ Project: Pneumonia & lung anomaly detector trained on ChestX-Ray14 dataset.'
        },
        {
          phase: 'PHASE 03 • LLMS & RAG',
          title: 'LangChain, Vector Databases & Quantization',
          tasks: ['ChromaDB / Pinecone vector indexes', 'Semantic search & rerankers', 'Local Llama-3 GGML hosting'],
          project: '🚀 Project: Offline campus exam tutor with document source grounding.'
        }
      ]
    },
    fullstack: {
      title: 'Full-Stack SaaS Developer (Next.js & Cloud)',
      desc: 'Build high-performance web applications using modern TypeScript, Tailwind CSS, PostgreSQL, and serverless backends.',
      milestones: [
        {
          phase: 'PHASE 01 • MODERN FRONTEND',
          title: 'Next.js App Router & TypeScript',
          tasks: ['Server Components & Client boundaries', 'Tailwind CSS design systems', 'Zustand state store'],
          project: '💻 Project: Interactive student dashboard with real-time WebSocket metrics.'
        },
        {
          phase: 'PHASE 02 • BACKEND & DB',
          title: 'PostgreSQL, Prisma & Authentication',
          tasks: ['Schema migrations & indexes', 'JWT & OAuth sessions', 'REST & GraphQL API design'],
          project: '🛡️ Project: Student marketplace with verified payment escrows.'
        }
      ]
    },
    design: {
      title: 'UI/UX & Product Designer',
      desc: 'Master Figma wireframing, high-fidelity micro-interactions, responsive design systems, and user testing.',
      milestones: [
        {
          phase: 'PHASE 01 • DESIGN SYSTEMS',
          title: 'Figma Auto-Layout & Design Tokens',
          tasks: ['Component variant architecture', 'Color theory & accessibility contrast', 'Mobile-first grid frames'],
          project: '🎨 Project: Complete design system kit for a campus ride-sharing app.'
        }
      ]
    },
    devops: {
      title: 'Cloud & DevOps Engineer',
      desc: 'Containerization, Kubernetes clusters, CI/CD GitHub Actions, and production observability.',
      milestones: [
        {
          phase: 'PHASE 01 • CONTAINERS & CI/CD',
          title: 'Docker, GitHub Actions & Slurm',
          tasks: ['Multi-stage Docker builds', 'Automated test runners on push', 'Automated server deployment'],
          project: '☁️ Project: Multi-node GPU cluster scheduler for student compilation jobs.'
        }
      ]
    }
  },

  // TEAMS (HERO FEATURE)
  teams: [
    {
      id: 'team-01',
      title: 'AI Study Assistant',
      eventType: 'HACKATHON',
      eventName: 'Smart India Hackathon 2026',
      description: 'Building an AI tool to help students summarize complex lecture notes, auto-generate flashcards, and solve conceptual math/coding doubts with step-by-step guidance.',
      teamStatus: '3 / 6 members',
      neededRoles: ['Frontend Developer', 'ML Engineer', 'UI/UX Designer'],
      members: [
        { name: 'Kavya Singh', role: 'Team Lead', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80' },
        { name: 'Aman Verma', role: 'Backend', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80' },
        { name: 'Arjun Sharma', role: 'Python/AI', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80' }
      ],
      github: 'https://github.com/campus-collab/ai-study-assistant'
    },
    {
      id: 'team-02',
      title: 'Campus Green-Ride Pool',
      eventType: 'STARTUP',
      eventName: 'Campus Incubator',
      description: 'Peer campus carpooling and bicycle sharing coordination platform connecting verified students living off-campus within a 5-mile perimeter. Zero commissions.',
      teamStatus: '2 / 4 members',
      neededRoles: ['Backend Developer', 'UI/UX Designer', 'Marketing'],
      members: [
        { name: 'Rohan Gupta', role: 'Founder', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80' },
        { name: 'Sneha Roy', role: 'Operations', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=80' }
      ],
      github: 'https://github.com/campus-collab/green-ride'
    },
    {
      id: 'team-03',
      title: 'Autonomous Campus Rover',
      eventType: 'RESEARCH',
      eventName: 'Robotics Lab',
      description: 'Sidewalk navigation robotics stack utilizing ROS2 Humble and TensorRT vision models for autonomous inter-department document and hardware deliveries.',
      teamStatus: '4 / 5 members',
      neededRoles: ['ML Engineer', 'Testing'],
      members: [
        { name: 'Vikram Joshi', role: 'Hardware Lead', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80' },
        { name: 'Priya Patel', role: 'Vision Lead', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80' }
      ],
      github: 'https://github.com/campus-collab/rover-kernel'
    },
    {
      id: 'team-04',
      title: 'MedTech Diagnostics Portal',
      eventType: 'HACKATHON',
      eventName: 'IEEE Ideathon 2026',
      description: 'Privacy-first medical image screening portal enabling rural health clinic technicians to run offline automated pneumonia and diabetic retinopathy inference.',
      teamStatus: '2 / 4 members',
      neededRoles: ['Frontend Developer', 'UI/UX Designer', 'Data Scientist'],
      members: [
        { name: 'Tanvi Kapoor', role: 'Data Lead', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80' }
      ],
      github: 'https://github.com/campus-collab/medtech-ai'
    }
  ],

  // SMART MATCHING CANDIDATES
  students: [
    {
      name: 'Rahul Sharma',
      college: 'CGC Landran',
      department: 'CSE • 3rd Year',
      skills: ['Python', 'Machine Learning', 'FastAPI', 'PyTorch', 'Docker'],
      interests: ['AI / ML', 'Hackathons', 'Programming'],
      matchScore: 94,
      reason: 'Strong match because you both are passionate about AI, Python backends, and hackathon project builds.',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
    },
    {
      name: 'Priya Patel',
      college: 'CGC Landran',
      department: 'IT • 3rd Year',
      skills: ['UI/UX Design', 'Figma', 'React.js', 'Tailwind CSS'],
      interests: ['Design', 'Startup', 'Hackathons'],
      matchScore: 89,
      reason: 'High synergy match: Your full-stack/AI capabilities perfectly complement her UI/UX design skillset.',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80'
    },
    {
      name: 'Ananya Verma',
      college: 'Chandigarh University',
      department: 'AI & Data Science • 2nd Year',
      skills: ['Python', 'TensorFlow', 'Data Science', 'SQL'],
      interests: ['AI / ML', 'Placement', 'Startup'],
      matchScore: 86,
      reason: 'Shared interest in NLP pipelines and machine learning research projects.',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80'
    }
  ],

  // COMMUNITIES
  communities: [
    {
      id: 'comm-cgc',
      name: 'CGC Landran Official',
      category: 'General',
      icon: '🏛️',
      members: '8,490 Members',
      online: '412 Online',
      desc: 'The official campus community for students of CGC Landran. News, campus notices, fest updates, and discussions.'
    },
    {
      id: 'comm-ai',
      name: 'AI & Data Science Club',
      category: 'AI Club',
      icon: '🤖',
      members: '1,240 Members',
      online: '98 Online',
      desc: 'Workshops on PyTorch, computer vision, paper discussions, Kaggle competitions, and collaborative ML projects.'
    },
    {
      id: 'comm-cse',
      name: 'CSE Department Hub',
      category: 'CSE',
      icon: '💻',
      members: '3,850 Members',
      online: '185 Online',
      desc: 'Course syllabus discussions, DSA problem-solving groups, lab assignment tips, and professor announcements.'
    },
    {
      id: 'comm-placement',
      name: 'Campus Placements 2026',
      category: 'Placements',
      icon: '💼',
      members: '4,820 Members',
      online: '340 Online',
      desc: 'Interview experiences, company drive notifications, resume reviews, referral requests, and placement tips.'
    },
    {
      id: 'comm-hostel',
      name: 'Hostelites & PG Network',
      category: 'Hostel',
      icon: '🛏️',
      members: '2,910 Members',
      online: '120 Online',
      desc: 'Hostel food feedback, late-night study groups, PG room vacancies, roommate matching, and mess menu alerts.'
    },
    {
      id: 'comm-lost',
      name: 'Lost & Found — Landran',
      category: 'Lost & Found',
      icon: '🔍',
      members: '5,100 Members',
      online: '64 Online',
      desc: 'Report lost ID cards, calculators, cycle keys, earplugs, or claim items found across campus grounds.'
    }
  ],

  // DISCUSSIONS
  discussions: [
    {
      id: 'post-01',
      author: 'Kavya Singh',
      isAnon: false,
      dept: 'CSE • 3rd Year',
      time: '2h ago',
      category: 'Placement',
      content: 'How to prepare for placements from 2nd year? For those who cleared Tier-1 company rounds (Microsoft/Amazon), what roadmap would you recommend for DSA and core CS fundamentals?',
      tags: ['Placement', 'DSA', 'Roadmap'],
      likes: 42,
      isLiked: false,
      commentsCount: 18,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80'
    },
    {
      id: 'post-02',
      author: 'Anonymous Student',
      isAnon: true,
      dept: 'Verified Student',
      time: '4h ago',
      category: 'Academic',
      content: 'Anyone has previous 5 years solved question papers for CS401 (Compiler Design)? Our mid-terms are starting next Monday.',
      tags: ['Academic', 'Exams', 'CS401'],
      likes: 19,
      isLiked: false,
      commentsCount: 7,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
    }
  ],

  // EVENTS
  events: [
    {
      id: 'event-01',
      title: 'IEEE Ideathon 2026',
      type: 'Hackathons',
      date: '6–7 Aug 2026',
      time: '09:00 AM – 06:00 PM IST',
      location: 'Auditorium Hall, CGC Landran',
      desc: 'AI-driven ideas and development hackathon. 24-hour sprint to build scalable solutions for Healthcare, FinTech, and CleanTech.',
      prize: '₹1,50,000 Cash Pool',
      isRegistered: false,
      img: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 'event-02',
      title: 'Deep Learning & PyTorch Workshop',
      type: 'Workshops',
      date: '14 Aug 2026',
      time: '02:00 PM – 05:00 PM IST',
      location: 'Lab 402, Block 3',
      desc: 'Hands-on session on fine-tuning vision and language transformers. Certificate and GPU compute credits provided.',
      prize: 'Free GPU Credits',
      isRegistered: false,
      img: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 'event-03',
      title: 'Smart India Hackathon Internal Selection',
      type: 'Competitions',
      date: '22 Aug 2026',
      time: 'Full Day Hybrid',
      location: 'Central Seminar Hall',
      desc: 'Official college evaluation round to shortlist top 15 teams representing the campus at SIH 2026 Grand Finale.',
      prize: 'Direct Nomination',
      isRegistered: false,
      img: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=600&auto=format&fit=crop&q=80'
    }
  ],

  // MARKETPLACE
  products: [
    {
      id: 'prod-01',
      title: 'HP Pavilion 15 Laptop (Core i5 11th Gen, 16GB RAM)',
      category: 'Laptop',
      condition: 'Used - Good',
      price: '₹25,000',
      seller: 'Vikram Joshi',
      desc: '15.6" Full HD display, 512GB NVMe SSD, 16GB DDR4 RAM. Battery holds 4+ hours. Perfect for coding and web dev.',
      img: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 'prod-02',
      title: 'Hero Sprint 21-Speed Gear Mountain Bicycle',
      category: 'Cycle',
      condition: 'Used - Good',
      price: '₹4,500',
      seller: 'Rohan Gupta',
      desc: 'Dual disc brakes, front suspension, 21-speed Shimano gears. Maintained regularly.',
      img: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=600&auto=format&fit=crop&q=80'
    },
    {
      id: 'prod-03',
      title: 'Complete DSA & Algorithms Book Bundle (CLRS + Striver)',
      category: 'Books',
      condition: 'Like New',
      price: '₹650',
      seller: 'Sneha Roy',
      desc: 'Introduction to Algorithms 3rd Edition + printed spiral bound handbook of top 200 DSA patterns.',
      img: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80'
    }
  ],

  // NOTIFICATIONS
  notifications: [
    { id: 1, icon: '⚡', text: '<b>Rahul Sharma</b> wants to join your <b>AI Study Assistant</b> team.', time: '10m ago', unread: true },
    { id: 2, icon: '🏆', text: '<b>IEEE Ideathon 2026</b> registration closes in 4 days.', time: '2h ago', unread: true },
    { id: 3, icon: '🔥', text: 'You unlocked <b>+150 XP</b> for publishing project notes!', time: '1d ago', unread: false }
  ],

  // CHAT
  chats: [
    {
      id: 'chat-1',
      peerName: 'Rahul Sharma',
      peerStatus: 'Online • CSE 3rd Year',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      lastMessage: 'Hey Arjun! Saw your AI project. Can I join as ML lead?',
      messages: [
        { sender: 'peer', text: 'Hey Arjun! Are you participating in the Smart India Hackathon?' },
        { sender: 'me', text: 'Hey Rahul! Yes, we are forming a 6-person team for the AI Study Assistant problem statement.' },
        { sender: 'peer', text: 'Saw your project card. I have PyTorch & FastAPI experience. Can I join as ML lead?' }
      ]
    }
  ],
  activeChatIndex: 0,
  currentModalEntity: null
};

// ==================================================
// INITIALIZATION
// ==================================================
async function loadRemoteSubsystems() {
  try {
    // 1. Load Live Teams from Backend
    apiRequest('/teams').then(({ ok, data }) => {
      if (ok && data.success && Array.isArray(data.data) && data.data.length > 0) {
        store.teams = data.data;
        renderTeamsFeed();
      }
    });

    // 2. Load Live Discussions & Feed
    apiRequest('/discussions').then(({ ok, data }) => {
      if (ok && data.success && Array.isArray(data.data) && data.data.length > 0) {
        store.discussions = data.data;
        renderDiscussions();
      }
    });

    // 3. Load Campus Events & Hackathons
    apiRequest('/events').then(({ ok, data }) => {
      if (ok && data.success && Array.isArray(data.data) && data.data.length > 0) {
        store.events = data.data;
        renderEvents();
      }
    });

    // 4. Load Marketplace Products
    apiRequest('/products').then(({ ok, data }) => {
      if (ok && data.success && Array.isArray(data.data) && data.data.length > 0) {
        store.products = data.data;
        renderMarketplace();
      }
    });

    // 5. Load Communities
    apiRequest('/communities').then(({ ok, data }) => {
      if (ok && data.success && Array.isArray(data.data) && data.data.length > 0) {
        store.communities = data.data;
        renderCommunities();
      }
    });

    // 6. Load Notifications
    apiRequest('/notifications').then(({ ok, data }) => {
      if (ok && data.success && Array.isArray(data.data)) {
        store.notifications = data.data;
        renderNotifications();
      }
    });

    // 7. Load Direct Chats
    apiRequest('/chats').then(({ ok, data }) => {
      if (ok && data.success && Array.isArray(data.data) && data.data.length > 0) {
        store.chats = data.data;
        renderChatDrawer();
      }
    });
  } catch (err) {
    console.warn('Backend subsystems offline. Operating in optimistic offline mode.');
  }
}

async function checkAuthSession() {
  const token = localStorage.getItem('campushub_token');
  if (!token) return;

  const { ok, data } = await apiRequest('/auth/me');
  if (ok && data.success && data.user) {
    store.currentUser = data.user;
    store.isLoggedIn = true;
    localStorage.setItem('campushub_user', JSON.stringify(data.user));
    updateUserUI();
    document.getElementById('onboarding-modal')?.classList.remove('active');
    initSocket();
    loadRemoteSubsystems();
  } else {
    // Session expired or invalid
    localStorage.removeItem('campushub_token');
    store.isLoggedIn = false;
    document.getElementById('onboarding-modal')?.classList.add('active');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  renderAllSubsystems();
  renderRoadmapTimeline('ai');
  startOtpTimer();
  updateUserUI();
  initSocket();
  loadRemoteSubsystems();

  // If already logged in, dismiss onboarding modal automatically
  if (store.isLoggedIn && localStorage.getItem('campushub_token')) {
    document.getElementById('onboarding-modal')?.classList.remove('active');
  } else {
    document.getElementById('onboarding-modal')?.classList.add('active');
  }

  checkAuthSession();
});

// Switch Views
window.switchView = function(viewName) {
  store.activeView = viewName;
  document.querySelectorAll('.nyc-nav-link').forEach(link => {
    if (link.dataset.view === viewName) link.classList.add('active');
    else link.classList.remove('active');
  });

  document.querySelectorAll('.nyc-view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(`view-${viewName}`);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

// Synchronize all user UI elements across the application
window.updateUserUI = function() {
  const user = store.currentUser;
  if (!user) return;

  // Nav Avatar & Name
  const navAvatar = document.getElementById('nav-user-avatar');
  if (navAvatar && user.avatar) navAvatar.src = user.avatar;
  
  const navName = document.getElementById('nav-user-name');
  if (navName && user.name) {
    const firstName = user.name.split(' ')[0].toUpperCase();
    navName.textContent = firstName;
  }
  
  const xpDisplay = document.getElementById('user-xp-display');
  if (xpDisplay) xpDisplay.textContent = `${(user.xp || 2450).toLocaleString()} XP`;

  // Profile View Elements
  const profName = document.getElementById('prof-name');
  if (profName) profName.textContent = user.name || 'Student Builder';
  
  const profAvatar = document.querySelector('.profile-avatar-img');
  if (profAvatar && user.avatar) profAvatar.src = user.avatar;
  
  const profCollegeLine = document.getElementById('prof-college-line');
  if (profCollegeLine) {
    profCollegeLine.textContent = `${user.college || 'CGC Landran'} • ${user.department || 'Computer Science'} • ${user.year || '3rd Year'}`;
  }
  
  const profBio = document.getElementById('prof-bio');
  if (profBio) profBio.textContent = user.bio || 'Passionate student builder. Shipping code & building real products.';
  
  const profXp = document.getElementById('prof-xp-val');
  if (profXp) profXp.textContent = `${(user.xp || 2450).toLocaleString()}`;

  // Skills chips in Profile
  const skillsContainer = document.getElementById('prof-skills-container');
  if (skillsContainer) {
    const skillsList = Array.isArray(user.skills) && user.skills.length > 0
      ? user.skills
      : ['JavaScript', 'Python', 'React.js', 'Machine Learning'];
    skillsContainer.innerHTML = skillsList.map(s => `<span class="skill-chip active">${s}</span>`).join('');
  }

  // Interests in Profile
  const lookingContainer = document.getElementById('prof-looking-container');
  if (lookingContainer) {
    const interestsList = Array.isArray(user.interests) && user.interests.length > 0
      ? user.interests
      : ['AI / ML', 'Fullstack', 'Hackathons'];
    lookingContainer.innerHTML = interestsList.map(item => `
      <div class="bullet-item">🚀 <b>${item}</b> track & collaborations</div>
    `).join('');
  }

  // Feed composer label
  const pillRealName = document.getElementById('pill-real-name');
  if (pillRealName && user.name) {
    pillRealName.innerHTML = `<span>👤</span> Real Name (${user.name.split(' ')[0]})`;
  }
};

// Onboarding State Machine
window.goToOnboardingStep = function(stepNum) {
  store.onboardingStep = stepNum;
  document.querySelectorAll('.onboarding-step').forEach(step => step.classList.remove('active'));
  const targetStep = document.getElementById(`onboarding-step-${stepNum}`);
  if (targetStep) targetStep.classList.add('active');

  const progressFill = document.getElementById('onboarding-progress-fill');
  if (progressFill) {
    progressFill.style.width = `${(stepNum / 8) * 100}%`;
  }
};

// Step 3: Login Handler (Email OTP)
window.handleLoginSubmit = async function(e) {
  if (e) e.preventDefault();
  const emailInput = document.getElementById('login-email');
  const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
  const submitBtn = document.getElementById('login-submit-btn') || e?.target?.querySelector('button[type="submit"]');

  if (!email) {
    showToast('⚠️ Please enter your college email address.');
    return;
  }

  // Set loading state
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending Login Code...';
  }

  try {
    const { ok, data } = await apiRequest('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email })
    });

    if (!ok || !data.success) {
      showToast(data.message || '⚠️ Please enter a valid college email address.');
      return;
    }

    store.verifyingEmail = email;
    store.authMode = 'login';
    store.tempRegistration.email = email;

    const otpDisplay = document.getElementById('otp-email-display');
    if (otpDisplay) otpDisplay.textContent = email;

    // Clear OTP inputs and focus first box
    const boxes = document.querySelectorAll('.otp-box');
    boxes.forEach(b => b.value = '');
    startOtpTimer();

    goToOnboardingStep(5);
    setTimeout(() => {
      if (boxes[0]) boxes[0].focus();
    }, 150);

    showToast(data.message || 'Verification code sent to your email.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Login Code →';
    }
  }
};

// Resend OTP Handler
window.resendOtp = async function() {
  const email = store.verifyingEmail || store.tempRegistration.email;
  if (!email) {
    showToast('⚠️ Please enter your email address first.');
    goToOnboardingStep(4);
    return;
  }

  const resendBtn = document.getElementById('resend-otp-btn');
  if (resendBtn) {
    resendBtn.disabled = true;
    resendBtn.textContent = 'Resending...';
  }

  try {
    const { ok, data } = await apiRequest('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email })
    });

    if (!ok || !data.success) {
      showToast(data.message || 'Please wait before requesting another code.');
      return;
    }

    const boxes = document.querySelectorAll('.otp-box');
    boxes.forEach(b => b.value = '');
    if (boxes[0]) boxes[0].focus();
    startOtpTimer();
    showToast(data.message || 'Verification code sent to your email.');
  } finally {
    if (resendBtn) {
      resendBtn.disabled = false;
      resendBtn.textContent = 'Resend Code 🔄';
    }
  }
};

// Step 4: Verify Email Handler (Sign Up)
window.handleVerifyEmailSubmit = async function(e) {
  if (e) e.preventDefault();
  const emailInput = document.getElementById('verify-email-input');
  const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
  const submitBtn = document.getElementById('verify-email-submit-btn') || e?.target?.querySelector('button[type="submit"]');

  if (!email) {
    showToast('⚠️ Please enter a valid college email address.');
    return;
  }

  // Set loading state
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending OTP...';
  }

  try {
    const { ok, data } = await apiRequest('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email })
    });

    if (!ok || !data.success) {
      showToast(data.message || '⚠️ Please enter a valid college email address.');
      return;
    }

    store.verifyingEmail = email;
    store.authMode = 'signup';
    store.tempRegistration.email = email;

    // Auto-fill suggested name into Step 7
    const derivedName = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    if (derivedName) {
      store.tempRegistration.name = derivedName;
      const nameInput = document.getElementById('ob-student-name');
      if (nameInput) nameInput.value = derivedName;
    }

    const otpDisplay = document.getElementById('otp-email-display');
    if (otpDisplay) otpDisplay.textContent = email;

    // Clear inputs and focus first box
    const boxes = document.querySelectorAll('.otp-box');
    boxes.forEach(b => b.value = '');
    startOtpTimer();

    goToOnboardingStep(5);
    setTimeout(() => {
      if (boxes[0]) boxes[0].focus();
    }, 150);

    showToast(data.message || 'Verification code sent to your email.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Verification OTP →';
    }
  }
};

// Step 5: OTP Verification Handler (Real Backend API Verification)
window.handleOtpSubmit = async function(e) {
  if (e) e.preventDefault();
  const boxes = Array.from(document.querySelectorAll('.otp-box'));
  const enteredCode = boxes.map(b => b.value.trim()).join('');
  const submitBtn = document.getElementById('otp-verify-submit-btn') || e?.target?.querySelector('button[type="submit"]');

  if (!enteredCode || enteredCode.length !== 6 || !/^\d{6}$/.test(enteredCode)) {
    showToast('⚠️ Please enter all 6 digits of the verification code.');
    const firstEmpty = boxes.find(b => !b.value.trim()) || boxes[0];
    if (firstEmpty) firstEmpty.focus();
    return;
  }

  const email = store.verifyingEmail || store.tempRegistration.email;
  if (!email) {
    showToast('⚠️ Session expired. Please enter your college email again.');
    goToOnboardingStep(4);
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Verifying...';
  }

  try {
    const { ok, data } = await apiRequest('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp: enteredCode })
    });

    if (!ok || !data.success) {
      showToast(data.message || 'Incorrect verification code. Please try again.');
      boxes.forEach(b => {
        b.style.borderColor = 'var(--nyc-red, #ff4757)';
        b.style.backgroundColor = '#ffe5e5';
        setTimeout(() => {
          b.style.borderColor = '';
          b.style.backgroundColor = '';
        }, 1500);
      });
      return;
    }

    // Save token and authenticated user
    if (data.token) {
      localStorage.setItem('campushub_token', data.token);
    }
    if (data.user) {
      store.currentUser = data.user;
      localStorage.setItem('campushub_user', JSON.stringify(data.user));
    }
    store.isLoggedIn = true;
    updateUserUI();
    initSocket();
    loadRemoteSubsystems();

    showToast('✓ Email verified successfully.');

    if (store.authMode === 'login') {
      document.getElementById('onboarding-modal')?.classList.remove('active');
      showToast(`⚡ Welcome back, ${store.currentUser.name || 'Builder'}!`);
      switchView('profile');
    } else {
      goToOnboardingStep(6);
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Verify & Continue →';
    }
  }
};

// Step 6: Filter College list
window.filterCollegeList = function(query) {
  const items = document.querySelectorAll('#popular-colleges-list .college-item');
  const q = (query || '').toLowerCase().trim();
  items.forEach(item => {
    const text = item.textContent.toLowerCase();
    if (!q || text.includes(q)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
  if (q) {
    store.tempRegistration.college = query.trim();
  }
};

// Step 7: Department & Name Handler
window.handleDeptAndNameSubmit = function(e) {
  if (e) e.preventDefault();
  const nameInput = document.getElementById('ob-student-name');
  const deptSelect = document.getElementById('ob-dept-select');
  const yearSelect = document.getElementById('ob-year-select');

  if (nameInput && nameInput.value.trim()) {
    store.tempRegistration.name = nameInput.value.trim();
  }
  if (deptSelect) {
    store.tempRegistration.department = deptSelect.value;
  }
  if (yearSelect) {
    store.tempRegistration.year = yearSelect.value;
  }

  goToOnboardingStep(8);
};

// Step 8: Finish Registration & Launch Dashboard
window.finishOnboarding = async function() {
  const activeChips = Array.from(document.querySelectorAll('#interests-chips-container .interest-chip.active'))
    .map(c => c.dataset.interest || c.textContent.trim());

  const temp = store.tempRegistration;
  const finalName = temp.name || store.currentUser.name || 'Student Builder';
  const finalEmail = temp.email || store.currentUser.email || '';
  const finalCollege = temp.college || store.currentUser.college || 'CGC Landran';
  const finalDept = temp.department || 'Computer Science & Engineering';
  const finalYear = temp.year || '3rd Year';
  const interestsList = activeChips.length > 0 ? activeChips : ['AI / ML', 'Fullstack', 'Hackathons'];
  const skillsList = activeChips.length > 0 ? activeChips : ['Python', 'JavaScript', 'React.js'];

  const profilePayload = {
    name: finalName,
    email: finalEmail,
    college: finalCollege,
    department: finalDept,
    year: finalYear,
    interests: interestsList,
    skills: skillsList
  };

  // Persist to backend database
  const { ok, data } = await apiRequest('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(profilePayload)
  });

  if (ok && data.user) {
    store.currentUser = data.user;
  } else {
    store.currentUser = {
      ...store.currentUser,
      ...profilePayload,
      isVerified: true
    };
  }

  store.isLoggedIn = true;
  localStorage.setItem('campushub_user', JSON.stringify(store.currentUser));

  updateUserUI();
  document.getElementById('onboarding-modal')?.classList.remove('active');
  showToast(`🎉 Welcome to CampusHub, ${finalName}! Your student profile is verified.`);
  switchView('profile');
};

// Logout / Switch Account
window.logoutUser = async function() {
  await apiRequest('/auth/logout', { method: 'POST' });
  localStorage.removeItem('campushub_token');
  localStorage.removeItem('campushub_user');
  store.isLoggedIn = false;
  store.currentUser = { ...defaultUser, isVerified: false };
  updateUserUI();
  goToOnboardingStep(2);
  document.getElementById('onboarding-modal')?.classList.add('active');
  showToast('👋 Logged out. Log in or create a new student account.');
};

window.openOnboardingModal = function() {
  goToOnboardingStep(1);
  document.getElementById('onboarding-modal')?.classList.add('active');
};

document.getElementById('skip-onboarding-btn')?.addEventListener('click', () => {
  document.getElementById('onboarding-modal')?.classList.remove('active');
  showToast('⚡ Switched to live CampusHub builder view!');
});

let otpInterval = null;
function startOtpTimer() {
  if (otpInterval) clearInterval(otpInterval);
  let seconds = 48;
  const timerEl = document.getElementById('otp-timer');
  const resendBtn = document.getElementById('resend-otp-btn');
  const timerLabel = document.getElementById('timer-label');

  if (resendBtn) resendBtn.style.display = 'none';
  if (timerLabel) timerLabel.textContent = 'Resend in ';
  if (timerEl) timerEl.textContent = '00:48';

  otpInterval = setInterval(() => {
    if (seconds > 0) {
      seconds--;
      const s = String(seconds).padStart(2, '0');
      if (timerEl) timerEl.textContent = `00:${s}`;
    } else {
      clearInterval(otpInterval);
      if (timerLabel) timerLabel.textContent = 'Didn\'t get code? ';
      if (timerEl) timerEl.textContent = '';
      if (resendBtn) resendBtn.style.display = 'inline-block';
    }
  }, 1000);
}

// ==================================================
// ROADMAPS (NYC SPECIAL)
// ==================================================
window.switchRoadmapTrack = function(trackKey) {
  store.activeRoadmap = trackKey;
  document.querySelectorAll('.track-tab').forEach(t => {
    if (t.dataset.track === trackKey) t.classList.add('active');
    else t.classList.remove('active');
  });
  renderRoadmapTimeline(trackKey);
};

function renderRoadmapTimeline(trackKey) {
  const container = document.getElementById('roadmap-timeline-container');
  if (!container) return;

  const data = store.roadmaps[trackKey] || store.roadmaps.ai;
  container.innerHTML = `
    <div class="mb-4">
      <h2 class="page-title text-2xl">${data.title}</h2>
      <p class="text-secondary text-sm">${data.desc}</p>
    </div>
    ${data.milestones.map((m, idx) => `
      <div class="roadmap-milestone-card">
        <div class="ms-header">
          <span class="ms-phase-tag">${m.phase}</span>
          <span class="text-xs font-bold text-muted">MILESTONE ${idx + 1}</span>
        </div>
        <h3 class="ms-title">${m.title}</h3>
        <div class="ms-checklist">
          ${m.tasks.map(task => `
            <label class="ms-check-item">
              <input type="checkbox" checked> <span>${task}</span>
            </label>
          `).join('')}
        </div>
        <div class="ms-project-box">
          <span class="text-sm font-bold">${m.project}</span>
          <button class="btn btn-nyc-primary btn-sm" onclick="showToast('Starter repository code copied to clipboard!')">Get Repo →</button>
        </div>
      </div>
    `).join('')}
  `;
}

// ==================================================
// RENDER SUBSYSTEMS
// ==================================================
function renderAllSubsystems() {
  renderTeamsFeed();
  renderSmartMatches();
  renderCommunities();
  renderDiscussions();
  renderEvents();
  renderMarketplace();
  renderNotifications();
  renderChatDrawer();
}

function renderTeamsFeed(filterRole = 'all', searchQuery = '') {
  const container = document.getElementById('teams-cards-grid');
  const homeContainer = document.getElementById('home-teams-container');

  const filtered = store.teams.filter(team => {
    const matchesRole = filterRole === 'all' || team.neededRoles.some(r => r.toLowerCase().includes(filterRole.toLowerCase()));
    const matchesSearch = !searchQuery || 
      team.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      team.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  if (container) {
    container.innerHTML = '';
    filtered.forEach(team => {
      container.appendChild(createTeamCard(team));
    });
  }

  if (homeContainer) {
    homeContainer.innerHTML = '';
    store.teams.slice(0, 2).forEach(team => {
      homeContainer.appendChild(createTeamCard(team));
    });
  }
}

function createTeamCard(team) {
  const card = document.createElement('div');
  card.className = 'team-card';
  card.innerHTML = `
    <div class="team-card-header">
      <div>
        <span class="team-event-badge">🏆 ${team.eventName}</span>
        <h3 class="team-title">${team.title}</h3>
      </div>
      <span class="team-status-pill">${team.teamStatus}</span>
    </div>
    <p class="team-desc">${team.description}</p>
    <div class="team-roles-needed">
      <span class="roles-label">ROLES NEEDED:</span>
      <div class="roles-tags-row">
        ${team.neededRoles.map(r => `<span class="role-needed-tag">+ ${r}</span>`).join('')}
      </div>
    </div>
    <div class="team-card-footer">
      <div class="team-members-avatars">
        ${team.members.map(m => `<img src="${m.avatar}" class="t-avatar" title="${m.name}">`).join('')}
        <span class="t-member-count">${team.members.length} BUILDERS</span>
      </div>
      <button class="btn btn-nyc-primary btn-sm" onclick="openTeamDetailsModal('${team.id}')">
        VIEW SQUAD →
      </button>
    </div>
  `;
  return card;
}

function renderSmartMatches(query = '') {
  const homeContainer = document.getElementById('home-matches-container');
  const resultsGrid = document.getElementById('smart-match-results-grid');

  if (homeContainer) {
    homeContainer.innerHTML = '';
    store.students.slice(0, 2).forEach(s => {
      homeContainer.appendChild(createStudentCard(s));
    });
  }

  if (resultsGrid) {
    resultsGrid.innerHTML = '';
    store.students.forEach(s => {
      resultsGrid.appendChild(createStudentCard(s));
    });
  }
}

function createStudentCard(student) {
  const div = document.createElement('div');
  div.className = 'smart-match-card';
  div.innerHTML = `
    <div class="sm-card-top">
      <div class="sm-user-profile">
        <img src="${student.avatar}" class="sm-avatar" alt="${student.name}">
        <div>
          <div class="sm-name">${student.name}</div>
          <div class="sm-dept">${student.college} • ${student.department}</div>
        </div>
      </div>
      <span class="match-score-badge">🔥 ${student.matchScore}% MATCH</span>
    </div>
    <div class="sm-match-reason">
      💡 <b>Synergy:</b> ${student.reason}
    </div>
    <div class="sm-skills-row">
      ${student.skills.map(sk => `<span class="skill-chip">${sk}</span>`).join('')}
    </div>
    <div class="flex justify-between items-center mt-2">
      <button class="btn btn-nyc-outline btn-sm" onclick="openPeerChat('${student.name}')">Message</button>
      <button class="btn btn-nyc-primary btn-sm" onclick="showToast('Build invite sent to ${student.name}!')">Connect +</button>
    </div>
  `;
  return div;
}

window.executeTeamSearch = function() {
  const input = document.getElementById('teams-search-input');
  const query = input ? input.value.trim() : '';
  const resultsSection = document.getElementById('smart-match-results-section');
  const queryDisplay = document.getElementById('sm-query-display');

  if (query) {
    if (resultsSection) resultsSection.style.display = 'block';
    if (queryDisplay) queryDisplay.textContent = `"${query}"`;
    renderTeamsFeed('all', query);
    renderSmartMatches(query);
  } else {
    clearSmartMatchResults();
  }
};

window.clearSmartMatchResults = function() {
  const resultsSection = document.getElementById('smart-match-results-section');
  const input = document.getElementById('teams-search-input');
  if (resultsSection) resultsSection.style.display = 'none';
  if (input) input.value = '';
  renderTeamsFeed('all', '');
};

// --------------------------------------------------
// COMMUNITIES & DISCUSSIONS
// --------------------------------------------------
function renderCommunities(filterCat = 'all') {
  const container = document.getElementById('communities-grid');
  if (!container) return;
  container.innerHTML = '';

  const filtered = store.communities.filter(c => filterCat === 'all' || c.category === filterCat);
  filtered.forEach(comm => {
    const card = document.createElement('div');
    card.className = 'community-card';
    card.onclick = () => openCommunityDetail(comm.id);
    card.innerHTML = `
      <div class="comm-icon-large">${comm.icon}</div>
      <h3 class="comm-name">${comm.name}</h3>
      <p class="comm-desc">${comm.desc}</p>
      <div class="comm-footer">
        <span>👥 ${comm.members}</span>
        <span>🟢 ${comm.online}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function openCommunityDetail(commId) {
  const comm = store.communities.find(c => c.id === commId) || store.communities[0];
  const container = document.getElementById('community-detail-container');
  const grid = document.getElementById('communities-grid');

  if (grid) grid.style.display = 'none';
  if (container) {
    container.style.display = 'block';
    container.innerHTML = `
      <button class="btn btn-nyc-outline btn-sm mb-4" onclick="closeCommunityDetail()">← Back to All Hubs</button>
      <div class="p-card nyc-box-shadow">
        <div class="flex items-center gap-4">
          <span style="font-size: 3rem;">${comm.icon}</span>
          <div>
            <h2 class="page-title text-2xl">${comm.name}</h2>
            <p class="text-secondary text-sm">${comm.desc}</p>
            <div class="flex gap-4 mt-2 text-sm font-bold">
              <span>👥 ${comm.members}</span>
              <span>🟢 ${comm.online}</span>
            </div>
          </div>
          <button class="btn btn-nyc-primary ml-auto" onclick="showToast('Joined community!')">✓ Joined</button>
        </div>
      </div>
      <div class="discussions-feed-list mt-6">
        ${store.discussions.map(p => createPostHTML(p)).join('')}
      </div>
    `;
  }
}

window.closeCommunityDetail = function() {
  document.getElementById('community-detail-container').style.display = 'none';
  document.getElementById('communities-grid').style.display = 'grid';
};

function renderDiscussions() {
  const fullFeed = document.getElementById('discussions-feed-list');
  if (!fullFeed) return;
  fullFeed.innerHTML = '';
  store.discussions.forEach(post => {
    const div = document.createElement('div');
    div.innerHTML = createPostHTML(post);
    fullFeed.appendChild(div.firstElementChild);
  });
}

function createPostHTML(post) {
  return `
    <div class="post-card">
      <div class="post-author-row">
        <div class="author-info">
          <img src="${post.avatar}" class="author-avatar" alt="${post.author}">
          <div>
            <span class="author-name">${post.isAnon ? '🎭 Anonymous Builder' : post.author}</span>
            <div class="author-meta">${post.dept} • ${post.time}</div>
          </div>
        </div>
        <span class="post-cat-badge">${post.category}</span>
      </div>
      <p class="post-content-text">${post.content}</p>
      <div class="post-actions-bar">
        <button class="post-act-btn ${post.isLiked ? 'liked' : ''}" onclick="toggleLikePost('${post.id}')">
          <span>${post.isLiked ? '❤️' : '🤍'}</span> <span>${post.likes} LIKES</span>
        </button>
        <button class="post-act-btn">
          <span>💬</span> <span>${post.commentsCount} ANSWERS</span>
        </button>
      </div>
    </div>
  `;
}

window.toggleLikePost = function(postId) {
  const post = store.discussions.find(p => p.id === postId);
  if (post) {
    post.isLiked = !post.isLiked;
    post.likes += post.isLiked ? 1 : -1;
    renderDiscussions();
  }
};

// --------------------------------------------------
// EVENTS & MARKETPLACE
// --------------------------------------------------
function renderEvents() {
  const container = document.getElementById('events-grid');
  if (!container) return;
  container.innerHTML = '';

  store.events.forEach(ev => {
    const card = document.createElement('div');
    card.className = 'event-card';
    card.innerHTML = `
      <img src="${ev.img}" class="event-hero-img" alt="${ev.title}">
      <div class="event-card-body">
        <div class="event-date-badge">📅 ${ev.date}</div>
        <h3 class="event-title">${ev.title}</h3>
        <p class="event-desc">${ev.desc}</p>
        <div class="event-meta-row">
          <div>📍 <b>Venue:</b> ${ev.location}</div>
          <div>🏆 <b>Prize:</b> ${ev.prize}</div>
        </div>
      </div>
      <div class="event-card-footer">
        <button class="btn btn-nyc-primary btn-sm w-full" onclick="openEventDetailsModal('${ev.id}')">
          ${ev.isRegistered ? '✓ REGISTERED' : 'REGISTER →'}
        </button>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderMarketplace() {
  const container = document.getElementById('marketplace-grid');
  if (!container) return;
  container.innerHTML = '';

  store.products.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="product-img-wrap">
        <img src="${p.img}" class="product-img" alt="${p.title}">
        <span class="product-condition-tag">${p.condition}</span>
      </div>
      <div class="product-body">
        <div class="product-price">${p.price}</div>
        <h4 class="product-title">${p.title}</h4>
        <div class="product-seller-row">👤 ${p.seller}</div>
        <div class="product-actions-row">
          <button class="btn btn-nyc-outline btn-sm flex-1" onclick="openProductDetailsModal('${p.id}')">Inspect</button>
          <button class="btn btn-nyc-primary btn-sm flex-1" onclick="openPeerChat('${p.seller}')">Chat</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// --------------------------------------------------
// CHAT & NOTIFICATIONS
// --------------------------------------------------
function renderNotifications() {
  const container = document.getElementById('notif-list-container');
  const countBadge = document.getElementById('notif-unread-count');
  if (!container) return;

  const unread = store.notifications.filter(n => n.unread).length;
  if (countBadge) countBadge.textContent = unread;

  container.innerHTML = '';
  store.notifications.forEach(n => {
    const div = document.createElement('div');
    div.className = `notif-item ${n.unread ? 'unread' : ''}`;
    div.innerHTML = `
      <span>${n.icon}</span>
      <div>
        <div>${n.text}</div>
        <div class="notif-time">${n.time}</div>
      </div>
    `;
    div.onclick = () => {
      n.unread = false;
      renderNotifications();
    };
    container.appendChild(div);
  });
}

window.markAllNotificationsRead = async function() {
  store.notifications.forEach(n => n.unread = false);
  renderNotifications();
  showToast('All notifications marked read.');
  await apiRequest('/notifications/mark-read', { method: 'POST' });
};

function renderChatDrawer() {
  const sidebar = document.getElementById('conversations-sidebar');
  const msgsArea = document.getElementById('chat-messages-area');
  const activePeer = store.chats[store.activeChatIndex];

  if (sidebar) {
    sidebar.innerHTML = '';
    store.chats.forEach((chat, idx) => {
      const item = document.createElement('div');
      item.className = `convo-item ${idx === store.activeChatIndex ? 'active' : ''}`;
      item.onclick = () => {
        store.activeChatIndex = idx;
        renderChatDrawer();
        if (socket && socket.connected && chat.id) {
          socket.emit('join_chat', { chatId: chat.id });
        }
      };
      item.innerHTML = `
        <img src="${chat.avatar}" class="convo-avatar">
        <div>
          <div class="convo-name">${chat.peerName}</div>
          <div class="convo-snippet">${chat.lastMessage || 'Connected on CampusHub'}</div>
        </div>
      `;
      sidebar.appendChild(item);
    });
  }

  if (activePeer && msgsArea) {
    msgsArea.innerHTML = '';
    activePeer.messages.forEach(msg => {
      const bubble = document.createElement('div');
      bubble.className = `msg-bubble ${msg.sender}`;
      bubble.textContent = msg.text;
      msgsArea.appendChild(bubble);
    });
    msgsArea.scrollTop = msgsArea.scrollHeight;
  }
}

window.openPeerChat = async function(peerName) {
  let chatIdx = store.chats.findIndex(c => c.peerName.toLowerCase().includes(peerName.toLowerCase()));
  if (chatIdx === -1) {
    const newChat = {
      id: `chat-${Date.now()}`,
      peerName: peerName,
      peerStatus: 'Verified Campus Builder',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      lastMessage: 'Connected on CampusHub',
      messages: [{ sender: 'peer', text: `Hey! Ready to build together.` }]
    };
    store.chats.push(newChat);
    chatIdx = store.chats.length - 1;

    // Open/create in backend
    apiRequest('/chats/open', {
      method: 'POST',
      body: JSON.stringify({ peerName })
    }).then(({ ok, data }) => {
      if (ok && data.data) {
        newChat.id = data.data.id;
        if (socket && socket.connected) {
          socket.emit('join_chat', { chatId: data.data.id });
        }
      }
    });
  }

  store.activeChatIndex = chatIdx;
  renderChatDrawer();
  document.getElementById('chat-drawer')?.classList.add('active');

  const currentChat = store.chats[chatIdx];
  if (socket && socket.connected && currentChat && currentChat.id) {
    socket.emit('join_chat', { chatId: currentChat.id });
  }
};

window.handleSendChatMessage = async function(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('chat-text-input');
  const text = input ? input.value.trim() : '';
  if (!text) return;

  const currentChat = store.chats[store.activeChatIndex];
  if (!currentChat) return;

  input.value = '';

  // 1. Optimistic local UI update
  currentChat.messages.push({ sender: 'me', text, createdAt: new Date().toISOString() });
  currentChat.lastMessage = text;
  renderChatDrawer();

  // 2. Real-time emit via Socket.IO
  if (socket && socket.connected) {
    socket.emit('send_message', {
      chatId: currentChat.id,
      text: text,
      recipientId: currentChat.user2Id || null
    });
  } else {
    // 3. Fallback to REST API
    await apiRequest(`/chats/${currentChat.id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text, sender: 'me' })
    });
  }
};

window.closeChatDrawer = function() {
  document.getElementById('chat-drawer')?.classList.remove('active');
};

// ==================================================
// MODAL HANDLERS & BACKEND ACTIONS
// ==================================================
window.openModal = function(id) { document.getElementById(id)?.classList.add('active'); };
window.closeModal = function(id) { document.getElementById(id)?.classList.remove('active'); };

window.openCreateSquadModal = function() { openModal('create-squad-modal'); };

window.handleCreateSquadSubmit = async function(e) {
  if (e) e.preventDefault();
  const title = document.getElementById('cs-title')?.value;
  const eventName = document.getElementById('cs-event-name')?.value;
  const eventType = document.getElementById('cs-event-type')?.value || 'HACKATHON';
  const rolesRaw = document.getElementById('cs-roles')?.value || 'Developer';
  const github = document.getElementById('cs-github')?.value || '';
  const description = document.getElementById('cs-desc')?.value;

  const neededRoles = rolesRaw.split(',').map(r => r.trim()).filter(Boolean);

  const newSquad = {
    id: `team-${Date.now()}`,
    title,
    eventType,
    eventName,
    description,
    teamStatus: '1 / 4 members',
    github: github || 'https://github.com/campus-collab',
    neededRoles,
    members: [
      { name: store.currentUser.name, role: 'Squad Lead', avatar: store.currentUser.avatar }
    ]
  };

  store.teams.unshift(newSquad);
  closeModal('create-squad-modal');
  renderTeamsFeed();
  switchView('teams');
  showToast('⚡ Squad created and listed for recruitment!');

  // Persist to backend
  apiRequest('/teams', {
    method: 'POST',
    body: JSON.stringify({
      title,
      eventName,
      eventType,
      description,
      neededRoles,
      github
    })
  }).then(({ ok, data }) => {
    if (ok && data.data) {
      newSquad.id = data.data.id;
    }
  });
};

window.openTeamDetailsModal = function(teamId) {
  const team = store.teams.find(t => t.id === teamId) || store.teams[0];
  store.currentModalEntity = team;
  document.getElementById('td-title').textContent = team.title;
  document.getElementById('td-body').innerHTML = `
    <p class="font-bold text-main">${team.description}</p>
    <div class="p-card bg-app mt-3">
      <div><b>Status:</b> ${team.teamStatus}</div>
      <div class="mt-1"><b>Repository:</b> <a href="${team.github}" target="_blank" class="link-text font-bold">${team.github} ↗</a></div>
    </div>
    <div class="mt-3">
      <div class="font-bold text-sm mb-1">Roles Needed:</div>
      <div class="flex flex-wrap gap-2">${(team.neededRoles || []).map(r => `<span class="role-needed-tag">+ ${r}</span>`).join('')}</div>
    </div>
  `;
  openModal('team-details-modal');
};

window.openApplyToTeamModal = function() {
  closeModal('team-details-modal');
  openModal('apply-team-modal');
};

window.handleTeamApplicationSubmit = async function(e) {
  if (e) e.preventDefault();
  const team = store.currentModalEntity;
  const roleEl = document.getElementById('apply-role-select');
  const reasonEl = document.getElementById('apply-reason');
  const githubEl = document.getElementById('apply-portfolio');

  const roleApplied = roleEl ? roleEl.value : 'Developer';
  const reason = reasonEl ? reasonEl.value : 'Excited to build with the squad.';
  const githubPortfolio = githubEl ? githubEl.value : '';

  closeModal('apply-team-modal');
  showToast('⚡ Squad application sent to project lead!');

  if (team && team.id) {
    await apiRequest(`/teams/${team.id}/apply`, {
      method: 'POST',
      body: JSON.stringify({
        roleApplied,
        reason,
        githubPortfolio,
        applicantName: store.currentUser.name,
        applicantEmail: store.currentUser.email
      })
    });
  }
};

window.openEventDetailsModal = function(id) {
  const ev = store.events.find(e => e.id === id) || store.events[0];
  store.currentModalEntity = ev;
  document.getElementById('ed-title').textContent = ev.title;
  document.getElementById('ed-body').innerHTML = `
    <img src="${ev.img}" class="w-full h-40 object-cover rounded-lg mb-2">
    <p>${ev.desc}</p>
    <div class="p-card bg-app mt-2 text-sm">
      <div>📅 ${ev.date} (${ev.time})</div>
      <div>📍 ${ev.location}</div>
      <div>🏆 ${ev.prize}</div>
    </div>
  `;
  openModal('event-details-modal');
};

window.handleEventRegistration = async function() {
  const ev = store.currentModalEntity;
  closeModal('event-details-modal');
  if (ev) {
    ev.isRegistered = true;
    renderEvents();
    if (ev.id) {
      await apiRequest(`/events/${ev.id}/register`, { method: 'POST' });
    }
  }
  openModal('event-success-modal');
};

window.openProductDetailsModal = function(id) {
  const p = store.products.find(item => item.id === id) || store.products[0];
  store.currentModalEntity = p;
  document.getElementById('pd-title').textContent = p.title;
  document.getElementById('pd-body').innerHTML = `
    <img src="${p.img}" class="w-full h-44 object-cover rounded-lg">
    <div class="text-2xl font-bold text-blue-600 mt-2">${p.price}</div>
    <p class="text-sm mt-1">${p.desc}</p>
  `;
  openModal('product-details-modal');
};

window.startSellerChatFromModal = function() {
  closeModal('product-details-modal');
  const p = store.currentModalEntity || store.products[0];
  openPeerChat(p.seller);
};

window.openSellItemModal = function() { openModal('sell-item-modal'); };
window.handleSellItemSubmit = async function(e) {
  if (e) e.preventDefault();
  const title = document.getElementById('sell-title')?.value;
  const category = document.getElementById('sell-category')?.value;
  const rawPrice = document.getElementById('sell-price')?.value;
  const desc = document.getElementById('sell-desc')?.value;
  const img = document.getElementById('sell-img')?.value || 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&auto=format&fit=crop&q=80';
  const price = `₹${rawPrice}`;

  const newProduct = {
    id: `prod-${Date.now()}`,
    title,
    category,
    condition: 'Used',
    price,
    seller: store.currentUser.name,
    desc,
    img
  };

  store.products.unshift(newProduct);
  closeModal('sell-item-modal');
  renderMarketplace();
  switchView('marketplace');
  showToast('⚡ Item posted to campus bazaar!');

  apiRequest('/products', {
    method: 'POST',
    body: JSON.stringify({
      title,
      category,
      condition: 'Used',
      price,
      desc,
      img
    })
  }).then(({ ok, data }) => {
    if (ok && data.data && data.data.id) {
      newProduct.id = data.data.id;
    }
  });
};

window.openCreatePostModal = function() { openModal('create-post-modal'); };
let currentPostIsAnon = false;
window.togglePostIdentity = function(type) {
  currentPostIsAnon = (type === 'anon');
  document.getElementById('pill-real-name')?.classList.toggle('active', !currentPostIsAnon);
  document.getElementById('pill-anon-name')?.classList.toggle('active', currentPostIsAnon);
};

window.handleCreatePostSubmit = async function(e) {
  if (e) e.preventDefault();
  const category = document.getElementById('new-post-cat')?.value || 'General';
  const content = document.getElementById('new-post-content')?.value;
  if (!content) return;

  const author = currentPostIsAnon ? 'Anonymous Builder' : store.currentUser.name;
  const newPost = {
    id: `post-${Date.now()}`,
    author,
    isAnon: currentPostIsAnon,
    dept: store.currentUser.department || 'Verified Student',
    time: 'Just now',
    category,
    content,
    tags: ['Building', 'Campus'],
    likes: 0,
    isLiked: false,
    commentsCount: 0,
    avatar: store.currentUser.avatar
  };

  store.discussions.unshift(newPost);
  closeModal('create-post-modal');
  renderDiscussions();
  switchView('discussions');
  showToast('⚡ Post published to campus feed!');

  apiRequest('/discussions', {
    method: 'POST',
    body: JSON.stringify({
      content,
      category,
      isAnon: currentPostIsAnon,
      tags: ['Building', 'Campus'],
      author,
      dept: store.currentUser.department || 'Verified Student',
      avatar: store.currentUser.avatar
    })
  }).then(({ ok, data }) => {
    if (ok && data.data && data.data.id) {
      newPost.id = data.data.id;
    }
  });
};

window.openCreateMenuModal = function() { openModal('create-menu-modal'); };
window.openEditProfileModal = function() {
  const user = store.currentUser;
  const nameEl = document.getElementById('edit-prof-name');
  const collegeEl = document.getElementById('edit-prof-college');
  const deptEl = document.getElementById('edit-prof-dept');
  const yearEl = document.getElementById('edit-prof-year');
  const skillsEl = document.getElementById('edit-prof-skills');
  const bioEl = document.getElementById('edit-prof-bio');

  if (nameEl) nameEl.value = user.name || '';
  if (collegeEl) collegeEl.value = user.college || '';
  if (deptEl) deptEl.value = user.department || 'Computer Science Engineering';
  if (yearEl) yearEl.value = user.year || '3rd Year';
  if (skillsEl) skillsEl.value = Array.isArray(user.skills) ? user.skills.join(', ') : 'Python, React.js';
  if (bioEl) bioEl.value = user.bio || '';

  openModal('edit-profile-modal');
};

window.handleProfileUpdateSubmit = async function(e) {
  if (e) e.preventDefault();
  const nameVal = document.getElementById('edit-prof-name')?.value.trim();
  const collegeVal = document.getElementById('edit-prof-college')?.value.trim();
  const deptVal = document.getElementById('edit-prof-dept')?.value.trim();
  const yearVal = document.getElementById('edit-prof-year')?.value.trim();
  const skillsVal = document.getElementById('edit-prof-skills')?.value.trim();
  const bioVal = document.getElementById('edit-prof-bio')?.value.trim();

  const updates = {};
  if (nameVal) updates.name = nameVal;
  if (collegeVal) updates.college = collegeVal;
  if (deptVal) updates.department = deptVal;
  if (yearVal) updates.year = yearVal;
  if (bioVal) updates.bio = bioVal;
  if (skillsVal) {
    updates.skills = skillsVal.split(',').map(s => s.trim()).filter(Boolean);
  }

  const { ok, data } = await apiRequest('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(updates)
  });

  if (ok && data.user) {
    store.currentUser = data.user;
  } else {
    store.currentUser = { ...store.currentUser, ...updates };
  }

  localStorage.setItem('campushub_user', JSON.stringify(store.currentUser));
  updateUserUI();
  closeModal('edit-profile-modal');
  showToast('✓ Profile updated successfully!');
};

function setupOtpInputs() {
  const boxes = Array.from(document.querySelectorAll('.otp-box'));
  boxes.forEach((box, idx) => {
    box.addEventListener('input', (e) => {
      const val = e.target.value;
      // Handle pasting whole 6 digits into one box
      if (val.length > 1) {
        const digits = val.replace(/\D/g, '').split('');
        digits.forEach((d, i) => {
          if (boxes[i]) boxes[i].value = d;
        });
        if (boxes[Math.min(digits.length, 5)]) {
          boxes[Math.min(digits.length, 5)].focus();
        }
        return;
      }
      if (val && idx < boxes.length - 1) {
        boxes[idx + 1].focus();
      }
    });

    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && idx > 0) {
        boxes[idx - 1].focus();
      }
    });

    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
      const digits = pasteData.slice(0, 6).split('');
      digits.forEach((d, i) => {
        if (boxes[i]) boxes[i].value = d;
      });
      if (boxes[Math.min(digits.length, 5)]) {
        boxes[Math.min(digits.length, 5)].focus();
      }
    });
  });
}

function setupEventListeners() {
  setupOtpInputs();

  document.querySelectorAll('.nyc-nav-link').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const view = item.dataset.view;
      if (view) switchView(view);
    });
  });

  document.getElementById('open-chat-btn')?.addEventListener('click', () => {
    document.getElementById('chat-drawer')?.classList.toggle('active');
  });

  const notifBtn = document.getElementById('notif-btn');
  const notifPopover = document.getElementById('notifications-popover');
  notifBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    notifPopover?.classList.toggle('active');
  });

  document.querySelectorAll('.role-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.role-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTeamsFeed(btn.dataset.role || 'all');
    });
  });

  document.querySelectorAll('#interests-chips-container .interest-chip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('active'));
  });

  document.querySelectorAll('#popular-colleges-list .college-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('#popular-colleges-list .college-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
      store.currentUser.college = item.dataset.college || 'CGC Landran';
    });
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.app-modal.active').forEach(m => m.classList.remove('active'));
      document.getElementById('chat-drawer')?.classList.remove('active');
      document.getElementById('notifications-popover')?.classList.remove('active');
    }
  });
}

window.showToast = function(msg) {
  const toast = document.getElementById('app-toast');
  const msgEl = document.getElementById('toast-msg');
  if (!toast || !msgEl) return;
  msgEl.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
};
