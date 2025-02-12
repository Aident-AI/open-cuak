import fs from 'fs';
import path from 'path';

const isDevelopment = process.env.NEXT_PUBLIC_BUILD_ENV !== 'production';
console.info('NEXT_PUBLIC_BUILD_ENV=', process.env.NEXT_PUBLIC_BUILD_ENV);

const config = {
  manifest_version: 3,
  name: !isDevelopment ? 'Aident Companion' : 'Aident Companion (Dev)',
  short_name: 'Aident Companion',
  version: !isDevelopment ? '0.0.0' : '0.0.1',
  description: 'Aident Companion, enable your ChatGPT to search and browse the web in your Chrome',
  icons: {
    '192': 'app/icons/aident-logo-rounded-192x192.png',
  },
  minimum_chrome_version: '116',
  permissions: [
    'activeTab',
    'contextMenus',
    'cookies',
    'debugger',
    'nativeMessaging',
    'scripting',
    'sidePanel',
    'storage',
    'tabs',
    'webRequest',
  ],
  host_permissions: ['<all_urls>'],
  background: {
    service_worker: 'scripts/service-worker/index.js',
    type: 'module',
  },
  sandbox: {
    pages: ['app/sandbox.html'],
  },
  side_panel: {
    default_path: 'app/side-panel.html',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['scripts/content-injection/index.js', 'app/js/iframeResizer.min.js'],
    },
  ],
  web_accessible_resources: [
    {
      resources: ['config.json', 'app/js/iframeResizer.min.js', 'app/sandbox.html', 'app/api.html'],
      matches: ['<all_urls>'],
    },
  ],
  action: {
    // default_popup: 'app/popup.html',
    default_title: 'Open Aident AI in side panel',
    // default_tooltip: 'Aident Companion',
  },
  commands: {
    _execute_action: {
      suggested_key: {
        mac: 'MacCtrl+Shift+A',
        default: 'Ctrl+Shift+A',
      },
      description: 'Open extension popup',
    },
    openSidePanel: {
      suggested_key: {
        mac: 'MacCtrl+Shift+S',
        default: 'Ctrl+Shift+S',
      },
      description: 'Open Aident side panel',
    },
  },
  content_security_policy: {
    extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
    sandbox:
      "sandbox allow-scripts allow-forms allow-popups allow-modals; script-src 'self' 'unsafe-inline' 'unsafe-eval'; child-src 'self';",
  },
  externally_connectable: {
    matches: ['https://*.aident.ai/*', 'http://localhost:3000/*'],
  },
};

const jsonData = JSON.stringify(config, null, 2);

const dir = './out';
const filePath = path.join(dir, 'manifest.json');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFile(filePath, jsonData, 'utf8', (err) => {
  if (err) console.error('An error occurred:', err);
  else console.info('Manifest.json has been saved.');
});
fs.copyFile('./config.json', path.join(dir, 'config.json'), (err) => {
  if (err) console.error('An error occurred:', err);
  else console.info('config.json has been saved.');
});
