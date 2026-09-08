# CampusHub Database Tier 🗄️

This directory encapsulates the **PostgreSQL Data Layer** for the CampusHub platform, designed and validated for **Supabase**.

## Architecture
- **Engine**: PostgreSQL 15+ hosted on Supabase with connection pooling (`pg` driver).
- **Data Access Object (DAO)**: `db.js` provides typed query methods, transaction isolation, ownership validation, and model transformations for the backend REST API controllers.
- **Relational Schema**: `schema.sql` contains production DDL definitions with foreign keys, cascade rules, indexes, and junction tables (`event_registrations`, `discussion_comments`, `community_members`).
- **Initial Dataset**: `seed.sql` populates the database with realistic developer roadmaps, hackathon squads, smart-match profiles, and campus feed discussions.

## Files
| File | Purpose |
|------|---------|
| `schema.sql` | PostgreSQL table schemas & relational foreign key constraints |
| `seed.sql` | PostgreSQL sample data fixtures |
| `db.js` | Node.js Data Access Object (DAO) and query interface using `pg` |
| `seed.js` | Database initialization and re-seeding CLI script for PostgreSQL |

## CLI Commands
To apply the schema and seed data to your configured Supabase database:
```bash
node database/seed.js
```
*(Requires `DATABASE_URL` set in your `.env` or environment)*.
