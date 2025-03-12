import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Export environment variables needed by football modules
export const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY;
