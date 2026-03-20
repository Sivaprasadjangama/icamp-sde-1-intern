import chalk from 'chalk';
import { resolveConfig } from '../lib/config.js';
import { fetchAll } from '../lib/fetcher.js';
import { listFeeds } from '../lib/store.js';
import { parseXML } from '../lib/parser.js';

function formatItem(it) {
  const title = it.title || it.guid || it.link || '(untitled)';
  const date = it.pubDate || '-';
  const link = it.link || '-';
  return `- ${title} (${date}) - ${link}`;
}

export function register(program) {
  program
    .command('read <name>')
    .description('Fetch and display latest items for a single feed (no seen-state changes)')
    .action(async (name) => {
      const opts = program.opts();
      const { config } = resolveConfig(opts);

      const feeds = listFeeds();
      const feed = feeds.find((f) => f.name === name);
      if (!feed) {
        console.error(chalk.red(`Unknown feed: ${name}`));
        process.exitCode = 1;
        return;
      }

      const results = await fetchAll([{ name, url: feed.url }], config);
      const r = results[0];
      if (!r || r.status === 'failed') {
        const message = r?.error ? ` - ${r.error}` : '';
        console.error(chalk.red(`${name}: FAILED${message}`));
        process.exitCode = 1;
        return;
      }

      const items = parseXML(r.xml || '');
      const limited = typeof config.maxItems === 'number' ? items.slice(0, config.maxItems) : items;

      console.log(chalk.bold(`Latest items for ${name}`));
      for (const it of limited) console.log(formatItem(it));
      process.exitCode = 0;
    });
}

