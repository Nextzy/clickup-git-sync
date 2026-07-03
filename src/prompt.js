'use strict';

const readline = require('readline');

// True when we can interactively prompt the user (attached TTY).
function isInteractive() {
  return process.stdin.isTTY && process.stdout.isTTY;
}

function ask(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(query, (ans) => {
    rl.close();
    resolve(ans);
  }));
}

module.exports = { ask, isInteractive };
