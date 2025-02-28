# Svelte 5 Premier League Predictions App

## Database Setup Instructions

This application uses Neon Serverless PostgreSQL as its database backend.

### 1. Set up Neon PostgreSQL

1. Sign up for a free account at [Neon](https://neon.tech)
2. Create a new project
3. Create a new database or use the default one
4. Get your connection string from the Neon dashboard

### 2. Configure the Application

1. Create a `.env` file in the root directory of the project with your Neon connection string:

   ```
   DATABASE_URL=postgres://username:password@your-neon-project-id.neon.tech/neondb?sslmode=require
   ```

   Example:

   ```
   DATABASE_URL=postgres://neondb_owner:abcdefg123456@ep-cool-forest-123456.eu-west-2.aws.neon.tech/neondb?sslmode=require
   ```

2. Install dependencies:

   ```
   pnpm install
   ```

3. Run the migration to create the database tables:

   ```
   pnpm run db:push
   ```

4. Initialize the admin user:

   ```
   pnpm run db:init
   ```

5. Start the application:
   ```
   pnpm run dev
   ```

## Database Operations

- `pnpm run db:push` - Push schema changes to the database
- `pnpm run db:generate` - Generate migration files
- `pnpm run db:migrate` - Apply migrations
- `pnpm run db:studio` - Open Drizzle Studio to browse the database
- `pnpm run db:init` - Initialize the database (creates admin user)

## Testing Database Connection

To test if your database connection is working properly, visit:

```
http://localhost:5173/api/db-test
```

This endpoint will let you know if your database connection is successful.

## Troubleshooting Neon Database

If you encounter errors:

1. **Connection Issues**:

   - Ensure you're using the correct connection string from the Neon dashboard
   - Make sure to include `?sslmode=require` at the end of your connection string
   - For pooled vs non-pooled connections, use the appropriate URL (generally pooled is recommended)

2. **Authentication Issues**:

   - Double-check your username and password in the connection string
   - Ensure you have the correct permissions for your Neon database

3. **Serverless Deployment**:
   - When deploying to serverless platforms like Vercel, use the connection string without the pooler for database migrations
   - For the application itself, use the pooled connection string

## Admin Setup

The first time you initialize the database, an admin user will be created automatically with:

- Username: `admin`
- Password: `admin123`

**Important:** Change the admin password after the first login in a production environment.
