# Comms Tracker and Portfolio

Static portfolio pages with a server-side API deployed as Vercel Functions. MongoDB Atlas stores app content, commission requests, payment records and proofs, feedback, and commissioner accounts. Passwords are stored as salted scrypt hashes; sign-in uses an HTTP-only signed session cookie.

## MongoDB Atlas setup

1. In Atlas, rotate the database password shown in the setup screenshot. Treat that password as exposed and do not reuse it.
2. Create a dedicated **Database User** for this app. Give it the built-in `readWrite` role on the `comms` database only. Do not use the automatically-created Atlas Admin user for the application.
3. Copy the connection string from **Connect > Drivers**. Replace its username/password placeholders with the new app database user's credentials. URL-encode reserved characters in the password. Use database name `comms` in the URI.
4. Keep Atlas Network Access restricted. The existing local IP allowlist entry only permits your current network; it does not automatically permit Vercel Functions.

## Vercel deployment setup

In the Vercel project **comms-tracker-and-portfolio**, open **Settings > Environment Variables** and add these values for Production (and Preview/Development if needed):

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | The new app user's Atlas URI. Keep private. |
| `MONGODB_DB_NAME` | `comms` |
| `SESSION_SECRET` | A unique random secret of at least 32 characters. |
| `ADMIN_USERNAME` | The Main Admin username you choose. |
| `ADMIN_ACCOUNT_NAME` | `Main Admin` (or the desired display name). |
| `ADMIN_PASSWORD` | A unique password of at least 12 characters. |

Never put real credentials in source files, chat, screenshots, or GitHub. Set the environment variables in Vercel's dashboard, then redeploy. On the first Main Admin login, the API creates the admin account. Set these variables before the first login so the intended username and password are seeded. New commissioner registrations remain pending until the Main Admin approves them.

### Atlas network access from Vercel

Vercel Hobby Functions do not provide one fixed outbound IP address to allowlist. The secure options are to run the API on a host with a fixed outbound IP, or use Vercel's paid static egress IP feature and allowlist that IP in Atlas. Static egress availability and price depend on the Vercel plan. Keep Atlas access restricted to that fixed IP. Do not allow `0.0.0.0/0` for this production database.

Until a supported Vercel egress IP (or another fixed-IP API host) is configured in Atlas Network Access, the deployed API cannot connect to Atlas. The code is ready, but a database URI alone will not make the production connection work.

## Local development

Use Node.js 20 or newer. Install dependencies with `npm install`, copy `.env.example` to `.env`, and fill in local values. Keep `.env` out of Git. Serve the project through Vercel's local development command so `/api/*` functions are available; opening the HTML files directly will not provide the API.

## Data collections

- `users`: Main Admin and commissioner identities, password hashes, approval state, and avatar.
- `appData`: named app data sets (`thalie_submissions`, `thalie_payments`, `thalie_payment_proofs`, portfolio content, site settings, and related arrays).

The API filters public data separately from staff data. Only the Main Admin can manage commissioner approval and client account records. Commissioner access requires an approved account. Commission tracking accepts the private generated commission ID and returns a limited status view.
