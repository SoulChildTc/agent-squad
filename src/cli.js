#!/usr/bin/env node
import { init } from './commands/init.js';

const [, , command, ...args] = process.argv;

switch (command) {
  case 'init':
    await init(args);
    break;
  default:
    console.log('Usage: npx opc-agents init');
    process.exit(1);
}
