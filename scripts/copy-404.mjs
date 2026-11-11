import { copyFile } from 'node:fs/promises';

/**
 * GitHub Pages serves 404.html for unknown deep links. Copying the SPA shell
 * there lets BrowserRouter resolve /<repo>/billing when the page is refreshed.
 */
try {
  await copyFile('dist/index.html', 'dist/404.html');
  console.log('GitHub Pages fallback written to dist/404.html');
} catch (error) {
  console.error('Could not write dist/404.html:', error);
  process.exitCode = 1;
}
