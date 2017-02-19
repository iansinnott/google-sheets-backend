const readline = require('readline');
const { Observable } = require('rxjs');

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

module.exports = prompt;
