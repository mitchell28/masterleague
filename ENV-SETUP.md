# Environment Configuration Setup

This project uses multiple environment files to configure different environments (development, production, etc.). This allows for environment-specific configurations, like using different URLs for APIs, databases, and authentication services.

## Environment Files

The project uses the following environment files:

- `.env` - Base environment variables, shared across all environments
- `.env.development` - Development-specific variables (local development)
- `.env.production` - Production-specific variables
- `.env.local` - Local overrides (not checked into version control)
- `.env.example` - Template showing the required variables (safe to commit to version control)

## Environment Variables

Key environment variables include:

- `DATABASE_URL` - Connection string for the database
- `FOOTBALL_DATA_API_KEY` - API key for football data services
- `BETTER_AUTH_SECRET` - Secret key for Better Auth
- `BETTER_AUTH_URL` - Base URL for Better Auth redirects and callbacks

## Development vs Production

For development, the authentication URL is set to the local development server:

```
BETTER_AUTH_URL=http://localhost:5173
```

For production, it should be set to your production domain:

```
BETTER_AUTH_URL=https://your-production-domain.com
```

## How to Use

1. Copy `.env.example` to create your own `.env` file with your actual credentials
2. For local development overrides, create a `.env.local` file
3. The correct environment file will be loaded based on the build mode:
   - Running `npm run dev` uses development mode
   - Running `npm run build:dev` builds for development environment
   - Running `npm run build` builds for production environment
   - Running `npm run preview:dev` previews the development build
   - Running `npm run preview` previews the production build

## Adding New Environment Variables

When adding new environment variables:

1. Add them to `.env.example` with placeholder values
2. Add them to the appropriate environment files (`.env.development`, `.env.production`)
3. If they need to be accessed in the browser, update `vite.config.ts` to expose them safely

## Security Considerations

- Never commit real credentials or secrets to version control
- Keep `.env`, `.env.local`, `.env.development`, and `.env.production` in your `.gitignore`
- Only `.env.example` should be committed to the repository
