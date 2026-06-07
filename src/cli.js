#!/usr/bin/env node
import { init } from './commands/init.js';

async function main() {
  const [, , command, ...args] = process.argv;
  switch (command) {
    case 'init':
      await init(args);
      break;
    default:
      console.log('Usage: npx agent-squad init');
      process.exit(1);
  }
}

main();
