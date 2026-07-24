module.exports = {
  apps: [
    {
      name: 'bellum-backend',
      script: './backend/.venv/bin/python',
      args: 'manage.py runserver 0.0.0.0:8000',
      cwd: './backend',
      interpreter: 'none',
      env: {
        PYTHONUNBUFFERED: '1'
      }
    },
    {
      name: 'bellum-frontend',
      script: 'npm',
      args: 'run dev -- --host 0.0.0.0 --port 5173',
      cwd: './frontend',
      env: {
        NODE_ENV: 'development'
      }
    }
  ]
};
