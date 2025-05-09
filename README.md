# Find the Leek

A web application where users guess the missing words in newspaper headlines. The game updates daily with new headlines and keeps track of player scores.

## Project Structure

```
.
├── frontend/          # React frontend
│   ├── src/          # Source files
│   └── build/        # Built static files (after npm run build)
└── api/              # PHP backend
    ├── get_headline.php
```

## Development Setup

### Frontend

1. Navigate to the frontend directory:

    ```bash
    cd frontend
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

3. Start development server:
    ```bash
    npm start
    ```

### Backend

1. Ensure PHP is installed on your system
2. Place the `api` directory in your web server's document root
3. Configure your web server to handle PHP files

## Deployment

### Frontend

1. Build the React app:

    ```bash
    cd frontend
    npm run build
    ```

2. The `build` directory will contain static files that can be served by any web server

### Backend

1. Deploy the `api` directory to your PHP-enabled web server
2. Update the API endpoints in `frontend/src/App.js` if your backend URL is different

## Features

-   Daily updated headlines with missing words
-   Multiple choice guessing interface
-   Score tracking using localStorage
-   Simple REST API for headline data

## Technologies Used

-   Frontend: React
-   Backend: PHP
-   Storage: localStorage for scores, MySQL for headlines (to be implemented)
