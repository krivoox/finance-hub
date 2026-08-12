#!/usr/bin/env node
/**
 * Linear GraphQL helper for Cloud Agents.
 *
 * The marketplace Linear MCP stays in `needsAuth` (OAuth does not persist).
 * Use the environment secret `LINEAR_API_KEY` instead. Never log the key.
 *
 * Usage:
 *   node scripts/linear-graphql.mjs '{ viewer { id name } }'
 *   node scripts/linear-graphql.mjs --file path/to/query.graphql
 */
import { readFileSync } from 'node:fs';
import { argv, env, exit, stdout, stderr } from 'node:process';

const LINEAR_GRAPHQL_URL = 'https://api.linear.app/graphql';

function usage() {
  stderr.write(
    'Usage: node scripts/linear-graphql.mjs <graphql-query>\n' +
      '       node scripts/linear-graphql.mjs --file <path>\n',
  );
}

function readQuery() {
  const args = argv.slice(2);
  if (args[0] === '--file') {
    if (!args[1]) {
      usage();
      exit(1);
    }
    return readFileSync(args[1], 'utf8');
  }
  if (args.length === 0 || args[0] === '-h' || args[0] === '--help') {
    usage();
    exit(args.length === 0 ? 1 : 0);
  }
  return args.join(' ');
}

const apiKey = env.LINEAR_API_KEY;
if (!apiKey) {
  stderr.write('LINEAR_API_KEY is missing. Add it as a Cloud Agent environment secret.\n');
  exit(1);
}

const query = readQuery().trim();
if (!query) {
  stderr.write('GraphQL query is empty.\n');
  exit(1);
}

const response = await fetch(LINEAR_GRAPHQL_URL, {
  method: 'POST',
  headers: {
    Authorization: apiKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query }),
});

const text = await response.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  stderr.write(`Linear GraphQL returned non-JSON (HTTP ${response.status}).\n`);
  exit(1);
}

if (!response.ok || body.errors) {
  stderr.write(`Linear GraphQL failed (HTTP ${response.status}).\n`);
  stdout.write(`${JSON.stringify({ errors: body.errors ?? null, httpStatus: response.status })}\n`);
  exit(1);
}

stdout.write(`${JSON.stringify(body.data, null, 2)}\n`);
