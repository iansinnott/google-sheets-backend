const fs = require('fs');
const path = require('path');
const readline = require('readline');
const google = require('googleapis');
const googleAuth = require('google-auth-library');
const drive = google.drive('v3');
const sheets = google.sheets('v4');
const { Observable } = require('rxjs');

const TOKEN_FILENAME = 'sheets.googleapis.com.rw.json';

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
];

const getHomeDir = () =>
 process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;

const STORED_TOKEN_PATH = path.resolve(getHomeDir(), '.credentials', TOKEN_FILENAME);

const readFile = Observable.bindNodeCallback(fs.readFile);
const writeFile = Observable.bindNodeCallback(fs.writeFile);

/**
 * Store the token from a google OAuth2 object. This is just so that we don't
 * have to reauth with every request.
 */
const storeToken = (auth) => {
  const token = auth.credentials;
  writeFile(STORED_TOKEN_PATH, JSON.stringify(token)).subscribe(
    () => console.log(`Stored credentials to ${STORED_TOKEN_PATH}`),
    (err) => console.log(`Could not write to ${STORED_TOKEN_PATH}`, err)
  );
};

const getNewToken = (auth) => {
  const authUrl = auth.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });

  console.log('Authorize this app by visiting this url: ', authUrl);

  return Observable.create(obs => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // TODO: This is all very non-idiomatic. I just wanted to move quickly
    rl.question('Enter the code from that page here: ', (code) => {
      rl.close();
      auth.getToken(code, function(err, token) {
        if (err) {
          console.log('Error while trying to retrieve access token', err);
          obs.error(err);
          return;
        }

        auth.credentials = token;
        obs.next(auth);
        obs.complete();
      });
    });

    return () => rl.close();
  })
  .do(storeToken); // Store that token (we don't care about the outcome of this)

};

const authorizeGoogleClientSecret = (json) => {
  const clientSecret = json.installed.client_secret;
  const clientId = json.installed.client_id;
  const redirectUrl = json.installed.redirect_uris[0];
  const auth = new googleAuth();
  const oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  return readFile(STORED_TOKEN_PATH)
    .map(x => JSON.parse(x))
    .map(token => {
      oauth2Client.credentials = token;
      return oauth2Client;
    })
    .catch(err => {
      console.log(`Error reading ${STORED_TOKEN_PATH}. Generating new token...`);
      return getNewToken(oauth2Client);
    });
};

const listAll = () => {
  return Observable.create((obs) => {
    drive.files.list({}, (err, res) => {
      if (err) {
        obs.error(err);
        return;
      }

      obs.next(res);
      obs.complete();
    });
  });
};

/**
 * Create a ValueRange object to be sent to google sheets. Documented here:
 * https://developers.google.com/sheets/api/guides/values
 *
 * @param value: string | boolean | number
 */
const valueRangeFromValue = (value) => ({
  values: [  // Rows
    [value], // Cells
  ],
});

// User entered means the string inserted will be handled as if the user typed
// it in the UI. Meaning any formatting or formula parsing will be applied
const appendCell = (value) => {
  return readFile('client_secret.json')
    .map(x => JSON.parse(x))
    .mergeMap(authorizeGoogleClientSecret)
    .mergeMap(auth => {
      return Observable.create(obs => {
        sheets.spreadsheets.values.append({
          auth,
          spreadsheetId: '1ssy9tNnMNFgqsSQM5Ven-bgGpifTAgLxLCzHSgq-xNw',
          range: 'Sheet1!A1',
          valueInputOption: 'RAW', // RAW | USER_ENTERED. See NOTE
          resource: valueRangeFromValue(value),
        }, (err, response) => {
          if (err) {
            obs.error(err);
            return;
          }

          obs.next(response);
          obs.complete();
        });
      });
    });
};

module.exports = {
  listAll,
  appendCell,
};

// Just for testing
const loggerObservable = {
  next: (x) => console.log('NEXT', x),
  error: (err) => console.log('ERROR', err),
  complete: () => console.log('COMPLETE'),
};

appendCell('hey you' + Math.random())
  .subscribe(loggerObservable);

