

## Add Authentication and Database-Backed Patient Data

This plan adds a login/signup page, stores patient data in the database, and loads patients from the backend instead of mock data.

### What you'll get

1. A simple login/signup page at `/auth` with email and password
2. A `patients` database table storing the full Patient data structure as JSONB
3. Protected routes -- unauthenticated users are redirected to `/auth`
4. Patient list and detail pages load data from the database
5. Mock patients are seeded into the database on first login (so you have data to work with immediately)

### How it works

- The `patients` table has columns: `id`, `user_id` (owner), `patient_data` (JSONB holding the full Patient object), and `created_at`
- Each user sees only their own patients (enforced by Row Level Security)
- On first login, if a user has zero patients, the app seeds the 3 mock patients into their account
- The existing dashboard and detail pages are rewired to fetch from the database using React Query

### Technical details

**Database migration (1 table + RLS):**
```sql
CREATE TABLE public.patients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  patient_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own patients"
  ON public.patients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own patients"
  ON public.patients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own patients"
  ON public.patients FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own patients"
  ON public.patients FOR DELETE
  USING (auth.uid() = user_id);
```

**Files to create:**
- `src/pages/Auth.tsx` -- Login/signup page with email + password, toggling between sign-in and sign-up modes. Clean, minimal design matching the existing clinical aesthetic.
- `src/hooks/useAuth.ts` -- Auth context/hook providing `user`, `loading`, `signOut` via `onAuthStateChange` listener.
- `src/hooks/usePatients.ts` -- React Query hooks (`usePatients`, `usePatient`) that fetch from the `patients` table and map `patient_data` back to the `Patient` type. Includes auto-seed logic.

**Files to modify:**
- `src/App.tsx` -- Add `/auth` route. Wrap routes in an auth guard that redirects unauthenticated users to `/auth`.
- `src/pages/Index.tsx` -- Replace `mockPatients` import with `usePatients()` hook. Show loading/empty states.
- `src/pages/PatientDashboard.tsx` -- Replace `getPatientById` with `usePatient(id)` hook. Show loading state.
- `src/components/PatientSearch.tsx` -- Accept patients as a prop or use the `usePatients` hook instead of importing mock data.
- `src/components/AppHeader.tsx` -- Add a sign-out button using the auth hook.

**Files kept as-is:**
- All layer components (DemographicsLayer, AllergiesLayer, etc.) -- they already accept typed props
- `src/types/patient.ts` -- unchanged
- `src/data/mockPatientData.ts` -- kept for seeding purposes only
- All UI primitives, CSS

**Design decisions:**
- JSONB storage for patient data keeps the schema simple and flexible -- the full Patient object is stored as one document per patient
- The `user_id` column + RLS ensures complete data isolation between users
- Auto-seeding mock data on first login gives an immediate working experience
- Email confirmation is required (not auto-confirmed) per security best practices

