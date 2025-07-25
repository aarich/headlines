![Find the Leek Banner](https://github.com/aarich/headlines/blob/master/public/banner.png?raw=true)

# [Find the Leek](https://leeks.mrarich.com) 🧅

A web application where you can guess the missing word in a newspaper headline. The game updates daily with new headlines recommended by an LLM.

## Development

Start the development servers from the root directory:

```bash
npm start
```

```bash
php -S localhost:8000 public/api/server.php
```

## Features

- Daily updated headlines with missing words
- Multiple choice guessing interface
- Score tracking using localStorage
- LLM-initiated daily challenge, refined by an editor
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
