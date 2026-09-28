# ShiftCare (Expo + Supabase)

A real, multi-user shift-scheduling and shift-swap app for your team. Rebuilt from the
original native Android project — no hardcoded/dummy data anywhere. Every screen reads
and writes real rows in a Supabase (Postgres) database, and real users sign up with
their own accounts.

## What's real now vs. the old app
- **Auth**: real Supabase email/password accounts (not the old hardcoded doctor@hospital.com).
- **Shifts**: you create/delete your own shifts; stored in the `shifts` table.
- **Swaps**: offer any of your shifts; teammates see it in "Open shift offers" and can
  accept it, which atomically reassigns the shift to them (`accept_swap` SQL function)
  and notifies the original requester — this works across two different phones/accounts.
- **Analytics**: hours/shift counts/approval rate are computed live from your actual
  shift and swap rows, not fixed numbers.
- **Notifications**: real rows per user, with unread state.

## 1. Create a free Supabase project
1. Go to https://supabase.com → New project (free tier is enough).
2. Once created, open **SQL Editor** → New query → paste the entire contents of
   `supabase/schema.sql` from this project → Run. This creates all tables, security
   policies (RLS), and the `accept_swap` function.
3. Go to **Project Settings → API** and copy your **Project URL** and **anon public key**.
4. (Optional but recommended for testing) In **Authentication → Providers → Email**,
   turn off "Confirm email" so new signups can log in immediately without clicking an
   email link.

## 2. Configure the app
```bash
cp .env.example .env
```
Edit `.env` and paste your values:
```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

## 3. Run it in VS Code
```bash
npm install
npx expo start
```
- Press `i` for iOS simulator, `a` for Android emulator, or `w` for web — or scan the
  QR code with the **Expo Go** app on your phone (fastest way to test on a real device).
- Everyone on your team installs Expo Go, scans the same QR (while you're on the same
  network, or use `npx expo start --tunnel` for testing over the internet), signs up
  with their own email, and you'll all see each other's shifts and swap offers live.

## 4. Publish / build a real installable app
When you're ready to ship beyond Expo Go:
```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android   # or ios
```
This produces a real `.apk`/`.aab` (or `.ipa`) you can distribute or submit to the
Play Store / App Store. `eas update` lets you push JS changes instantly without a
new store submission.

## Project structure
```
app/
  _layout.js          # auth guard, redirects signed-out users to /login
  login.js             # real Supabase sign-in
  signup.js             # real Supabase sign-up (creates auth user + profile row)
  (tabs)/
    _layout.js         # bottom tab bar
    index.js           # Home — today/next shift, pending swaps, unread alerts
    shifts.js          # your schedule — add/delete real shifts
    swap.js            # offer a shift, browse & accept teammates' open offers
    analytics.js       # stats computed from your real data
    notifications.js   # real per-user notifications, mark as read
    profile.js         # edit your profile, log out
lib/supabase.js         # Supabase client (session persisted via AsyncStorage)
supabase/schema.sql      # run this once in Supabase SQL Editor
```

## Suggested next improvements
- Push notifications via `expo-notifications` (currently in-app only).
- A manager/admin view to see whole-team coverage and approve swaps.
- Shift conflict detection (warn if you already have a shift that day).
- Calendar UI (month grid) instead of a flat list, using a library like
  `react-native-calendars`.
- Rate-limit / validate time strings with a proper time picker instead of free text.
