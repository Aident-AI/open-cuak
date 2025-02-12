import '~src/common/puppeteer/override/transport/ChromeExtensionTransport';

if (typeof process.stdout === 'undefined') {
  process.stdout = { columns: 80 };
}
