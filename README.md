![Find the Leek Banner](https://github.com/aarich/headlines/blob/master/public/banner.png?raw=true)

# [Find the Leek](https://leeks.mrarich.com) 🧅

A web application where you can guess the missing word in a newspaper headline. The game updates daily with new headlines thanks to Google Gemini API Free Tier.

## Development

Start the development servers from the root directory:

```bash
npm start
```

```bash
php -S localhost:8000 public/api/server.php
```

## Deployment

1. Build the React app:

   ```bash
   npm run build
   ```

2. Copy the build files:

   ```bash
   scp -r build/. user@your-server:/doc/root/path
   ```

## Features

- Daily updated headlines with missing words
- Multiple choice guessing interface
- Score tracking using localStorage
- LLM-generated daily challenge
- Simple PHP REST API

## Technologies

- Frontend:
  - React
  - tailwind
- Backend:
  - PHP
  - Mysql
- Dependencies:
  - Reddit API (to locate candidate headlines)
  - Gemini API (to choose a headline and create the game each day)

## TODO

- More resilient cron job
- More resilient LLM interactions
- More resilient localStorage integration
