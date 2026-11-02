#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { toCsv } from '../catalogue.mjs';

const data = JSON.parse(readFileSync(new URL('../data/cosplayers.json', import.meta.url), 'utf8'));
const output = new URL('../data/cosplayers.csv', import.meta.url);
writeFileSync(output, toCsv(data.cosplayers), 'utf8');
console.log(`Exported ${data.cosplayers.length} booth entries to ${output.pathname}`);
