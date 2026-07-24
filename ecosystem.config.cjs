module.exports = {
  apps: [
    {
      name: 'bellum-backend',
      script: './backend/.venv/bin/gunicorn',
      args: '--bind 0.0.0.0:8000 --workers 1 --timeout 120 stratego_project.wsgi:application',
      cwd: './backend',
      interpreter: 'none',
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        DJANGO_SECRET_KEY: 'change-me-in-production',
        DJANGO_DEBUG: 'False',
        DJANGO_ALLOWED_HOSTS: 'bellum.rhesoftware.com,localhost,127.0.0.1',
        PYTHONUNBUFFERED: '1'
      }
    },
    {
      name: 'bellum-frontend',
      script: 'node_modules/.bin/vite',
      args: '--host 0.0.0.0 --port 5173',
      cwd: './frontend',
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        VITE_API_URL: ''
      }
    }
  ]
};
