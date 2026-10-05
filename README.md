# ASCEND

> **AI-Powered Life RPG** — Transform your real-life goals into an adaptive RPG progression system.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Linting | ESLint (Next.js config) |
| Database | Supabase *(future)* |
| AI | TBD *(future)* |

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── onboarding/         # Lara's onboarding flow
│   ├── dashboard/          # Player home screen
│   ├── world/              # World / progression map
│   ├── quests/             # Quest list & detail
│   ├── profile/            # Player profile
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Landing page
├── components/
│   ├── ui/                 # Reusable primitives (Button, Card, Modal…)
│   ├── lara/               # Lara guide components
│   ├── quests/             # Quest card, detail, tree
│   ├── world/              # World / progression map components
│   └── player/             # Avatar, XP bar, coins, profile
├── lib/
│   ├── types/              # TypeScript interfaces (Player, Quest, Goal…)
│   ├── constants/          # App-wide constants (avatars, levels, routes)
│   └── utils/              # Pure helper functions (XP calc, formatting)
├── store/                  # Client-side state (future)
└── styles/
    └── globals.css         # Design tokens + global styles
```

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Development Commands

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run type-check` | TypeScript type check (no emit) |

---

## Development Phases

- [x] **Phase 0** — Repository init
- [x] **Phase 1** — Frontend foundation (current)
- [ ] **Phase 2** — Onboarding + Lara tutorial
- [ ] **Phase 3** — Goal + Quest creation
- [ ] **Phase 4** — World / progression map
- [ ] **Phase 5** — AI quest generation
- [ ] **Phase 6** — Supabase auth + persistence
- [ ] **Phase 7** — Rewards, Titles, Achievements
