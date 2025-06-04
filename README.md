# PES Teacher Portal

PES Teacher Portal is a dashboard built with **Next.js 15** and **TypeScript** for managing practical sessions and analytics for students. The application relies heavily on [Supabase](https://supabase.com) for authentication, database access and several custom edge functions.

## Project Structure

```
├── app/                # Next.js app directory (routes and pages)
│   ├── analytics/      # Class and student analytics
│   ├── classcreate/    # Bulk session creation
│   ├── dashboard/      # Landing page after login
│   ├── questions/      # Manage questions and procedures
│   ├── sessions/       # Session list and log viewer
│   ├── submit/         # Manual log submission
│   └── verify/         # Verify a session code
├── lib/                # Reusable utilities (Supabase client)
├── public/             # Static assets used across pages
├── tailwind.config.js  # Tailwind CSS configuration
└── next.config.ts      # Next.js configuration
```

All pages under `app/` follow the **Next.js App Router** pattern. Any folder with `page.tsx` exports a React component that is rendered as a route. The global layout and styles live in `app/layout.tsx` and `app/globals.css` respectively.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment variables**

   Create a `.env.local` file and define the required Supabase values:

  ```env
  NEXT_PUBLIC_SUPABASE_URL=your-project-url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
  HF_API_TOKEN=your-huggingface-token
  ```

   These variables are used in `lib/supabase.ts` to create the Supabase client and are also referenced when calling Supabase edge functions from the client.

3. **Supabase project**

   Set up a Supabase project and apply the schema found in `Supabase Functions/SQL Schema.txt`.  The file defines all tables used by the dashboard.  You can reference `Supabase Functions/Schema Diagram.png` for a visual overview.

   Deploy the following edge functions (source files are located in `Supabase Functions/Edge-function Code`):

   - `add-question`
   - `class-analytics`
   - `create-session`
   - `email-analytics`
   - `email-session`
   - `questions`
   - `sessions-per-day`
   - `student-analytics`
   - `student-session`
   - `submit-log`
   - `verify-session`

   Each function requires several secrets which can be set from the Supabase dashboard or via the CLI:

   ```bash
   supabase secrets set \
     SUPABASE_URL=your-project-url \
     SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
     JWT_SECRET=your-jwt-secret \
     GMAIL_USER=your-gmail-address \
     GMAIL_PASS=your-gmail-password
   ```

   The `GMAIL_*` values are only needed for the email related functions but can be stored globally.  Finally, configure a scheduled task in Supabase to periodically delete expired sessions without logs as suggested at the bottom of the schema file.

4. **Development server**

   ```bash
   npm run dev
   ```

   The site will be available at [http://localhost:3000](http://localhost:3000).

5. **Production build**

   ```bash
   npm run build
   npm start
   ```

## Key Pages

- **Login (`app/page.tsx`)** – Faculty sign in form. Uses `react-hook-form` and Supabase auth.
- **Sign up (`app/signup/page.tsx`)** – Register new faculty members.
- **Dashboard (`app/dashboard/page.tsx`)** – Create sessions for students, view recent sessions and logs, send session codes via email and display a sessions-per-day chart.
- **Class analytics (`app/analytics/page.tsx`)** – Filter by semester/section, generate charts with `recharts` and email a PDF report.
- **Session management (`app/sessions/page.tsx`)** – List all sessions and fetch logs through Supabase.
- **Bulk creation (`app/classcreate/page.tsx`)** – Create multiple sessions and immediately email each code.
- **Questions (`app/questions/page.tsx`)** – Manage procedure questions and add new ones.

All of these pages communicate with Supabase tables or edge functions by fetching `${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/<function>` and passing the user’s JWT token obtained from `supabase.auth.getSession()`.

## Styling

The project uses [Tailwind CSS](https://tailwindcss.com). Global styles and color variables are defined in `app/globals.css`. The Tailwind configuration is located in `tailwind.config.js` and is loaded via PostCSS.

## Further Learning

- Review Supabase documentation on **row level security (RLS)** and **edge functions**. Many actions (e.g. `create-session`, `email-session`, `class-analytics`) rely on custom functions deployed on Supabase.
- Explore the **Next.js App Router** features such as server components and route segments. Each page in the `app/` directory is a good starting point.
- Understand how `html2pdf.js` is used in `app/analytics/page.tsx` to capture a DOM node and convert it to a PDF for emailing.

## Contributing

1. Fork the repository and create a feature branch.
2. Run `npm run lint` before submitting a pull request.
3. Describe your changes clearly in the PR description.

---

This project provides a foundation for managing practical sessions and analytics for PES teachers. Feel free to explore the code and adapt it to your needs.
