const { spawn } = require('child_process');
const localtunnel = require('localtunnel');

console.log('Starting WebApp Vite Server...');
const webappOpts = process.platform === 'win32' ? { shell: true } : {};
const webapp = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173'], { cwd: './webapp', ...webappOpts });

webapp.stdout.on('data', data => {
  // optionally log
});

setTimeout(() => {
    startTunnelAndBot();
}, 4000);

async function startTunnelAndBot() {
    try {
        console.log('Starting Localtunnel on port 5173...');
        const tunnel = await localtunnel({ port: 5173 });
        console.log(`\n========================================`);
        console.log(`🌍 WebApp is publicly available at: ${tunnel.url}`);
        console.log(`========================================\n`);

        process.env.WEBAPP_URL = tunnel.url;

        console.log('Starting Telegram Bot...');
        const botOpts = process.platform === 'win32' ? { shell: true } : {};
        const botProcess = spawn('node', ['index.js'], { cwd: './bot', env: process.env, ...botOpts });

        botProcess.stdout.on('data', data => console.log(`BOT: ${data}`));
        botProcess.stderr.on('data', data => console.error(`BOT ERR: ${data}`));

    } catch(e) {
        console.error('Error starting tunnel/bot:', e);
    }
}
