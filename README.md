# Find the Leek

A web application where users guess the missing words in newspaper headlines. The game updates daily with new headlines and keeps track of player scores.

## Development Setup

### Frontend

1. Install dependencies from the root directory:

   ```bash
   npm install
   ```

2. Start the development server from the root directory:

   ```bash
   npm start
   ```

### Backend

1. Ensure PHP is installed on your system
2. Start the PHP development server from the root directory:

   ```bash
   php -S localhost:8000 public/api/server.php
   ```

## Deployment

1. Build the React app from the root directory:

   ```bash
   npm run build
   ```

2. The `build` directory will contain static files that can be served by an Apache web server

3. Copy the build files to your server using scp:

   ```bash
   scp -r build/* user@your-server:/doc/root/path
   ```

   Replace `user@your-server` with your actual server credentials and `/doc/root/path/` with your web server's document root path.

## Features

- Daily updated headlines with missing words
- Multiple choice guessing interface
- Score tracking using localStorage
- Simple REST API for headline data

## Technologies Used

- Frontend: React
- Backend: PHP/Mysql
