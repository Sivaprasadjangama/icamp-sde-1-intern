export function createLogger(logLevel = 'info') {
  const level = String(logLevel).toLowerCase();
  const isDebug = level === 'debug';

  return {
    debug: (msg) => {
      if (!isDebug) return;
      // eslint-disable-next-line no-console
      console.debug(msg);
    },
    info: (msg) => {
      // eslint-disable-next-line no-console
      console.log(msg);
    },
    warn: (msg) => {
      // eslint-disable-next-line no-console
      console.warn(msg);
    },
    error: (msg) => {
      // eslint-disable-next-line no-console
      console.error(msg);
    },
  };
}

