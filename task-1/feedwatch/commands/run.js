import chalk from 'chalk';
import { resolveConfig } from '../lib/config.js';
import { fetchAll } from '../lib/fetcher.js';
import { listFeeds } from '../lib/store.js';

export function register(program) {
  program
    .command('run')
    .description('Fetch registered feeds')
    .action(async () => {
      const opts = program.opts();
      const { config } = resolveConfig(opts);

      const feeds = listFeeds();
      if (feeds.length === 0) {
        console.log(chalk.gray('No feeds registered. Use `feedwatch add <name> <url>`.'));
        process.exitCode = 0;
        return;
      }

      const results = await fetchAll(feeds, config);
      const anyFailed = results.some((r) => r.status === 'failed');

      for (const r of results) {
        if (r.status === 'ok') {
          console.log(`${r.name}: OK`);
        } else {
          console.log(chalk.red(`${r.name}: FAILED${r.error ? ` - ${r.error}` : ''}`));
        }
      }

      process.exitCode = anyFailed ? 1 : 0;
    });
}

