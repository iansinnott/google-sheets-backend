const fs = require('fs');
const path = require('path');
const { Observable } = require('rxjs');
const chalk = require('chalk');
const google = require('googleapis');
const GoogleAuth = require('google-auth-library');
const drive = google.drive('v3');
const sheets = google.sheets('v4');
const OAuth2 = (new GoogleAuth()).OAuth2;

const {
  getHomeDir,
  writeFile,
  readFile,
  prompt,
} = require('./utils.js');

const STORED_TOKEN_PATH = path.resolve(
  getHomeDir(),
  '.credentials',
  'sheets.googleapis.com.rw.json'
);

// The permissions I'm asking for from google on the users behalf. This will
// dictate what the google auth window shows to the user
// Docs: https://developers.google.com/identity/protocols/googlescopes
const SCOPES = [
  // For spreadsheets read/write
  'https://www.googleapis.com/auth/spreadsheets',

  // Just for listing files and searching. Necessary to map a string filename
  // (i.e. a spreadsheet title) to a spreadsheet id for use with the
  // spreadsheets API
  'https://www.googleapis.com/auth/drive.metadata.readonly',
];

/**
 * Store the token from a google OAuth2 object. This is just so that we don't
 * have to reauth with every request.
 */
const storeToken = (token) => {
  // Try to make the directory so that we are sure it exists
  try {
    fs.mkdirSync(path.dirname(STORED_TOKEN_PATH), 0o700);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }

  Observable.of(token)
    .map(x => JSON.stringify(x))
    .do(() => console.log('made it here'))
    .mergeMap(str => writeFile(STORED_TOKEN_PATH, str))
    .do(() => console.log('made it more to here'))
    .subscribe(
      () => console.log(`Stored credentials to ${chalk.cyan(STORED_TOKEN_PATH)}`),
      (err) => console.log(`Could not write to ${chalk.red(STORED_TOKEN_PATH)}`, err)
    );
};

const getToken = (auth, authCode) => {
  return Observable.create(obs => {
    auth.getToken(authCode, (err, token) => {
      if (err) {
        obs.error(err);
        return;
      }

      obs.next(token);
      obs.complete();
    });
  });
};

const getNewToken = (auth) => {
  const authUrl = auth.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });

  console.log('Authorize this app by visiting this url: ', chalk.green(authUrl));
  console.log();

  return prompt('Enter the code from that page here: ')
    .mergeMap(authCode =>
      getToken(auth, authCode)
        .do(storeToken, (err) => console.log('Error while trying to retrieve access token', err)))
    .map(token => {
      auth.credentials = token;
      return auth;
    });
};

const authorizeGoogleClientSecret = (json) => {
  const clientSecret = json.installed.client_secret;
  const clientId = json.installed.client_id;
  const redirectUrl = json.installed.redirect_uris[0];
  const auth = new OAuth2(clientId, clientSecret, redirectUrl);

  return readFile(STORED_TOKEN_PATH)
    .map(x => JSON.parse(x))
    .map(token => {
      auth.credentials = token;
      return auth;
    })
    .catch(err => {
      console.log(`Unable to read stored token from ${chalk.cyan(STORED_TOKEN_PATH)}. Generating new token...`);
      return getNewToken(auth);
    });
};

const getAuthFromClientSecret = (filepath) =>
  readFile(filepath)
    .map(x => JSON.parse(x))
    .mergeMap(authorizeGoogleClientSecret);

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
  return getAuthFromClientSecret('client_secret.json')
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
  next: (x) => console.log('RESULT\n', x),
  error: (err) => console.log('ERROR', err),
  complete: () => console.log('COMPLETE'),
};

appendCell('hey you ' + Math.random())
  .subscribe(loggerObservable);

