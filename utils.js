const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Observable } = require('rxjs');

const getHomeDir = () =>
 process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;

const readFile = Observable.bindNodeCallback(fs.readFile);
const writeFile = Observable.bindNodeCallback(fs.writeFile);

const prompt = (question) => Observable.create(obs => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(question, (answer) => {
    obs.next(answer);
    obs.complete();
  });

  return () => rl.close();
});

module.exports = {
  getHomeDir,
  readFile,
  writeFile,
  prompt,
};
