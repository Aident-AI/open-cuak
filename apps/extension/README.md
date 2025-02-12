## Aident Companion Chrome Extension

Quick Start

```bash
# make sure you are at ./extension folder
brew install gsed
npm install
```

A few supported commands:

```bash
# start popup window in NextJS dev mode
npm run dev
# start `node-watch` for extension development
npm run dev:extension
# manual build extension
npm run build:dev
# manual build extension (production build)
npm run build:prod
# package extension for production release
npm run package
```

To install the dev build in Chrome, go to `chrome://extensions` and enable "Developer mode" in the top right. Then click "Load unpacked" and select the `out` folder.

When you have the extension dev server on, all changes to the `app` folder will be automatically reflected in the extension. You can also manually build the extension with `npm run build:dev` or `npm run build:prod`.

### Some Tips

1. ServiceWorker scripts are not hot-reloaded, so you'll need to reload the extension in `chrome://extensions` to see changes.
2. Remember to enable permissions in the `manifest.json` file for any new APIs you use.
