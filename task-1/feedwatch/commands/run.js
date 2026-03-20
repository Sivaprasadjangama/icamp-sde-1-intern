import chalk from 'chalk';
import Table from 'cli-table3';
import { resolveConfig } from '../lib/config.js';
import { fetchAll } from '../lib/fetcher.js';
import { listFeeds, readStore, writeStoreAtomic } from '../lib/store.js';
import { parseXML } from '../lib/parser.js';

function formatFeedTitle(feedName) {
  return feedName;
}

function renderFeedTable(feedName, items, { config }) {
  const limited =
    typeof config.maxItems === 'number' ? items.slice(0, config.maxItems) : items;

  if (limited.length === 0) {
    console.log(chalk.gray(`${formatFeedTitle(feedName)}: (no NEW items)`));
    return;
  }

  const table = new Table({
    head: ['title', 'status', 'pubDate', 'link'],
    style: { head: ['white'] },
    wordWrap: true,
    colWidths: [30, 8, 20, 45],
  });

  for (const it of limited) {
    const title = it.status === 'NEW' ? chalk.green(it.title || it.guid || it.link) : it.title || it.guid || it.link;
    const status = it.status === 'NEW' ? chalk.green(it.status) : chalk.gray(it.status);
    table.push([title, status, it.pubDate || '-', it.link || '-']);
  }

  console.log(`${formatFeedTitle(feedName)}:`);
  console.log(table.toString());
}

export function register(program) {
  program
    .command('run')
    .option('--all', 'Show all items, not just NEW')
    .option('--json', 'Output results as raw JSON')
    .description('Fetch registered feeds')
    .action(async (cmdOpts) => {
      const opts = program.opts();
      const { config } = resolveConfig(opts);
      const showAll = !!cmdOpts?.all;
      const asJson = !!cmdOpts?.json;

      const feeds = listFeeds();
      if (feeds.length === 0) {
        const emptyMsg = 'No feeds registered. Use `feedwatch add <name> <url>`.';
        if (asJson) {
          console.log(JSON.stringify([]));
        } else {
          console.log(chalk.gray(emptyMsg));
        }
        process.exitCode = 0;
        return;
      }

      const feedByName = new Map(feeds.map((f) => [f.name, f]));
      const results = await fetchAll(feeds, config);
      const anyFailed = results.some((r) => r.status === 'failed');

      const store = readStore();
      const nowIso = new Date().toISOString();

      const jsonResults = [];

      for (const r of results) {
        if (r.status === 'failed') {
          if (!asJson) {
            console.log(chalk.red(`${r.name}: FAILED${r.error ? ` - ${r.error}` : ''}`));
          }
          jsonResults.push({ name: r.name, status: 'failed', error: r.error || '' });
          continue;
        }

        const feedInfo = feedByName.get(r.name);
        const items = parseXML(r.xml || '');
        const seenGuids = new Set(store.seen[r.name] || []);

        const normalizedItems = items.map((it) => {
          const isNew = it.guid && !seenGuids.has(it.guid);
          return { ...it, status: isNew ? 'NEW' : 'SEEN' };
        });

        const newItems = normalizedItems.filter((it) => it.status === 'NEW');
        const currentGuids = normalizedItems.map((it) => it.guid).filter(Boolean);

        if (!store.feeds[r.name]) {
          store.feeds[r.name] = { url: feedInfo?.url || '', lastFetchedAt: null, newItemCount: 0 };
        }

        // Persist seen-state for successful feeds.
        store.feeds[r.name].lastFetchedAt = nowIso;
        store.feeds[r.name].newItemCount = newItems.length;
        store.seen[r.name] = currentGuids;

        const toDisplay = showAll ? normalizedItems : newItems;

        jsonResults.push({
          name: r.name,
          status: 'ok',
          items: toDisplay.map((it) => ({
            title: it.title,
            status: it.status,
            pubDate: it.pubDate,
            link: it.link,
            guid: it.guid,
          })),
        });

        if (!asJson) {
          renderFeedTable(r.name, toDisplay, { config });
        }
      }

      await writeStoreAtomic(store);

      if (asJson) {
        console.log(JSON.stringify(jsonResults));
      }

      process.exitCode = anyFailed ? 1 : 0;
    });
}

