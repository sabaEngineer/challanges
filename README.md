# Challanges 🔥

A full-stack Next.js application for creating and joining challenges, tracking daily progress, building streaks, and competing on leaderboards.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Styling**: Tailwind CSS
- **Authentication**: Session-based (cookies)

## Features

- 🔐 User authentication (register/login)
- 🎯 Create and join challenges
- 📊 Daily progress tracking
- 🔥 Streak system
- 🏆 Leaderboards
- 📅 Progress calendar visualization

## Getting Started

### Prerequisites

- Node.js 20.11+
- PostgreSQL database

### Setup

1. **Clone and install dependencies**

```bash
npm install
```

2. **Set up environment variables**

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```
DATABASE_URL="postgresql://username:password@localhost:5432/challanges?schema=public"
```

3. **Set up the database**

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma db push
```

4. **Run the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # App Router pages
│   ├── challenges/         # Challenge pages
│   │   ├── [id]/          # Challenge detail
│   │   └── new/           # Create challenge
│   ├── dashboard/         # User dashboard
│   ├── login/             # Login page
│   └── register/          # Register page
├── actions/               # Server Actions
│   ├── auth.ts            # Authentication actions
│   ├── challenges.ts      # Challenge actions
│   └── progress.ts        # Progress actions
├── components/            # React components
│   ├── ui/               # Base UI components
│   └── ...               # Feature components
└── lib/                   # Utilities
    ├── auth.ts           # Auth helpers
    ├── db.ts             # Prisma client singleton
    └── types.ts          # TypeScript types
```

## Architecture

- **Server Components** by default
- **Server Actions** for mutations
- **Client Components** only when needed (forms, interactions)
- All database access is server-only
- Session-based authentication with HTTP-only cookies

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Database Commands

```bash
npx prisma generate    # Generate Prisma client
npx prisma db push     # Push schema to database
npx prisma studio      # Open Prisma Studio GUI
npx prisma migrate dev # Create migration (for production)
```

## License

MIT
