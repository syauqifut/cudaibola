module.exports = {
  apps: [
    {
      name: 'cudaibola',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3010',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3010,
      },
    },
    {
      name: 'cudaibola-sync',
      script: 'worker/index.ts',
      interpreter: 'node_modules/.bin/tsx',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
