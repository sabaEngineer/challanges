# AI Instructions – Next.js Project

This is a Next.js (App Router) full-stack application.

## Tech Stack
- Next.js (App Router)
- TypeScript
- Server Components by default
- Server Actions for mutations
- PostgreSQL
- Prisma ORM
- Deployed on Vercel

## Architecture Rules
- Use App Router, NOT Pages Router
- Prefer Server Components
- Use `use client` ONLY when needed
- Use Server Actions instead of API routes when possible
- API routes are allowed for external consumers (mobile apps)
- No React Router

## Backend Rules
- All database access must be server-only
- Never access database in client components
- Environment variables must stay on server
- Use connection-safe patterns for serverless (singleton Prisma client)

## Frontend Rules
- Minimal client components
- No business logic in UI
- Use Tailwind for styling
- Keep components small and reusable

## Data & Features
- Users can register and log in
- Users can create and join challenges
- Challenges have:
  - daily progress
  - streaks
  - leaderboards
- Progress updates are once per day per user

## Code Quality
- Type everything
- No `any`
- Use clear naming
- Follow folder conventions

## What NOT to do
- Do not duplicate logic
- Do not introduce new libraries without reason
- Do not bypass server actions

## Instructions to Cursor
- Ask before large refactors
- Prefer simple solutions
- Follow this document strictly
