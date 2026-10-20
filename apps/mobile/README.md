# Bincoin Mobile

React Native (Expo) companion app for **Bincoin — Smart Waste Management** — same backend, same design language as the web app ([projectBinCoin/SourceCode](https://github.com/projectBinCoin/SourceCode)).

Citizens book pickups and redeem rewards, collectors follow live GPS to claim and verify jobs, and admins run the platform — all connected to the shared Supabase backend.

## Screens

| Portal | Screens |
|---|---|
| Auth | Sign in / Sign up (citizen or collector applicant), forgot password, reset password |
| Citizen (tabs: Home · Book · Bin · Wallet) | Dashboard (points + tier + active request), 4-step booking wizard, bin registration with map pinning + live approval status, request status tracker, wallet (transactions, search/filter, voucher redemption with QR) |
| Collector (tabs: Map · History) | Live map (location permission → continuous tracking, 5 km radius circle, nearby jobs + critical bins, claim), job bottom-sheet with turn-by-turn navigation, active job verification (match / mismatch / invalid + camera evidence), history with stats |
| Admin (tabs: Map · Staff · Audit · Bins · Settings) | Operations map with bin telemetry bottom-sheet, collector approvals/suspension, audit log with flags + filters, bin registry + pending approvals + register form with map picker, point-engine configuration + voucher catalog CRUD |

## Stack

- **Expo SDK 57** + **Expo Router** (file-based routes in `src/app/`, typed routes)
- **NativeWind v4** (Tailwind classes) with the Bincoin navy/sapphire palette, light + dark mode
- **Supabase JS** (anon key, AsyncStorage session persistence) — the same Postgres backend as the web app
- **Zustand** stores + **TanStack Query** — mirrors the web app's data layer (`lib/supabase-data.ts` row mappers, fallback-only local cache — mutations write directly to Supabase by row id)
- **react-native-maps** (bundled in Expo Go — Apple Maps on iOS, Google Maps on Android), **expo-location** for live tracking, **expo-image-picker** for evidence photos, **react-native-qrcode-svg** for voucher QR codes

## Getting started

```bash
npm install
cp .env.example .env    # fill in the Supabase URL + anon key (same values as the web app)
npx expo start          # scan the QR with Expo Go (iOS/Android)
```

Environment variables (`.env`, gitignored — never committed):

| Variable | Purpose |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (safe by design; RLS applies) |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Optional — Google Maps on iOS standalone builds |

## Project structure

```
src/
├── app/                  # Expo Router routes (mirrors the web app's URLs)
│   ├── _layout.tsx       # Providers: QueryClient, Supabase auth boot, Stack
│   ├── index.tsx         # Redirects by role
│   ├── login.tsx · forgot-password.tsx · reset-password.tsx
│   ├── (citizen)/        # _layout tabs + dashboard, book-pickup, register-bin,
│   │                     # wallet, request-status/[id]
│   ├── (collector)/      # _layout tabs + dashboard (live map), history,
│   │                     # active-job/[id], pending-approval
│   └── (admin)/          # _layout tabs + dashboard, collectors, audit-log,
│                         # bins, settings
├── components/           # ui.tsx kit (Button/Card/Badge/Input/PasswordInput…),
│                         # portal-guard, citizen cards
├── lib/                  # supabase client, supabase-data (mappers/fetchers),
│                         # stores (auth/data), hooks (queries/mutations),
│                         # constants, points, currency, access
└── types/                # Shared types (same as the web app)
```

## Role-based access

Same model as the web app: roles live in `app_users.role`; collectors sign up into a pending state until an admin approves them; `PortalGuard` blocks each tab group by role and routes pending collectors to the approval screen.

## Scripts

| Command | Purpose |
|---|---|
| `npm start` | Expo dev server |
| `npm run android` / `npm run ios` | Launch on a platform |
| `npm run lint` | Expo lint |
| `npx tsc --noEmit` | Type-check |

## Security notes

- `.env` is gitignored; only the placeholder `.env.example` is committed.
- The anon key is public by design — Row Level Security applies. Demo-phase RLS is permissive; tighten before production.
- The service_role secret is never used or stored by the mobile app.
