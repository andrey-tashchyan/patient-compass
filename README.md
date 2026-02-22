# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Patient Evolution Pipeline

This repo now includes a server-side TypeScript pipeline exposed as Supabase Edge Function `generate-patient-evolution`.

### Setup

- Dataset path (read-only input): `public/data/final_10_patients/...`
- Generated JSON persistence target: Supabase Storage
- Storage object path format: `final_10_patients/generated/<patient_id>_patient_evolution.json`

### Required env vars

For the Edge Function:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LOVABLE_API_KEY` (optional but required for AI narrative mode)

Optional overrides:

- `PATIENT_EVOLUTION_STORAGE_BUCKET` (default: `patient-evolution`)
- `PATIENT_EVOLUTION_AI_MODEL` (default: `google/gemini-3-flash-preview`)
- `PATIENT_EVOLUTION_AI_GATEWAY_URL` (default: `https://ai.gateway.lovable.dev/v1/chat/completions`)

### Run

```sh
# frontend
npm run dev

# tests
npm run test

# edge function (local, if Supabase CLI is configured)
supabase functions serve generate-patient-evolution
```

UI route:

- `/patient-evolution`

### Example request/response

Request body:

```json
{
  "identifier": "20c3ca32-ec09-4e7c-abab-9f7711cbe235"
}
```

Response shape:

```json
{
  "patient_id": "20c3ca32-ec09-4e7c-abab-9f7711cbe235",
  "storage_bucket": "patient-evolution",
  "storage_path": "final_10_patients/generated/20c3ca32-ec09-4e7c-abab-9f7711cbe235_patient_evolution.json",
  "payload": {
    "patient": {},
    "timeline": [],
    "episodes": [],
    "alerts": [],
    "identity": {},
    "narrative": {},
    "metadata": {}
  }
}
```
