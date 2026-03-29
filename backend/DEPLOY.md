# Backend Deploy Notes

This backend is ready to run on any platform that can:

- expose a public HTTPS URL
- inject environment variables
- run a Node.js service or build from Docker
- connect to the external Postgres database in `DATABASE_URL`

## Recommended free host

For this project, Northflank is the closest "as is" fit because the backend can be deployed as a public service from the Dockerfile in this folder and keep using an external Postgres database.

## Required environment variables

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `APP_URL`
- `FRONTEND_ORIGIN`
- `FRONTEND_URL`
- `NODE_ENV=production`

## Email

If you want email verification and password reset emails to work in production, also set:

- `EMAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

If SMTP variables are omitted, the app logs email payloads to the console instead of sending them.

## Docker deploy

Use `backend/Dockerfile` as the build source. The container:

1. installs dependencies
2. generates the Prisma client
3. builds the TypeScript app
4. runs `prisma migrate deploy` on startup
5. starts `dist/server.js`

## Platform settings

- Root directory: `backend`
- Public port: use the platform `PORT` variable
- Health check path: `/health`

## Frontend

After the backend is live, update the GitHub secret used by the frontend deploy:

- `VITE_API_BASE_URL=https://your-backend-domain/api`

The frontend workflow already writes that value into `frontend/.env.production` during the GitHub Pages build.
