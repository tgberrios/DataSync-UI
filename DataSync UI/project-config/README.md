# DataSync UI

Frontend application for DataSync - A comprehensive data synchronization and governance platform.

## Project Structure

```
DataSync UI/
├── backend/              # Backend server (Node.js/Express)
├── src/                  # Frontend source code (React/TypeScript)
├── public/               # Static assets
├── config/               # Configuration files
│   ├── config.json       # Application configuration
│   ├── config.example.json
│   ├── jest.config.js    # Jest test configuration
│   └── eslint.config.js  # ESLint configuration
├── scripts/              # Utility scripts
│   └── install.sh        # Dependency installation script
├── migrations/           # Database migration scripts
├── uploads/              # Uploaded files
├── backups/              # Backup files
├── vite.config.ts        # Vite build configuration
├── tsconfig.json         # TypeScript configuration
├── package.json          # Node.js dependencies
└── README.md            # This file
```

## Installation

Run the installation script:

```bash
npm run install-deps
```

Or manually:

```bash
npm install
cd backend && npm install
```

## Development

Start the development server:

```bash
npm run dev
```

This will start:
- Backend server on http://localhost:8765
- Frontend dev server on http://localhost:9876

## Configuration

Copy `config/config.example.json` to `config/config.json` and update with your database credentials:

```json
{
  "database": {
    "postgres": {
      "host": "localhost",
      "port": "5432",
      "database": "DataLake",
      "user": "your_username",
      "password": "your_password"
    }
  }
}
```

## Scripts

- `npm run dev` - Start development servers
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run install-deps` - Install all dependencies
