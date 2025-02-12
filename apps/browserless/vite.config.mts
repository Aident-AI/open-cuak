import chokidar from 'chokidar';
import { builtinModules } from 'module';
import path from 'path';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }) => {
  return {
    plugins: [tsconfigPaths()],
    build: {
      target: 'node18',
      outDir: 'dist',
      lib: {
        entry: path.resolve(__dirname, 'server/websocket-server.ts'),
        formats: ['cjs'],
      },
      rollupOptions: {
        external: [
          ...builtinModules,
          'ws',
        ],
        output: {
          entryFileNames: '[name].js',
        },
      },
      minify: false,
      sourcemap: true,
      watch: mode === 'development' ? {} : undefined,
    },
    resolve: {
      alias: {
        '~shared': path.resolve(__dirname, '../../packages/shared/src'),
        '~browserless': path.resolve(__dirname, './'),
      },
    },
  };
});
