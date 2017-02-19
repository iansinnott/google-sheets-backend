# Google Sheets Back End

This was just a proof of concept to see what it would be like interacting with the Google Sheets API for use storing data. Check TODO.md for the direction I was headed in with this.

The primary benefit of using sheets seems to be that it's quite easy for anyone on your team to edit or view the data. Especially if they are non technical. This is very significant, but may not be exactly what I need. Especially given that lately I've been interested in the benefits a real database can have.

It's also unclear to me how to best ensure table consistency, or to link tables. From what I can tell using google sheets API is great if a sheet was initially the right tool for the job. For instance, if someone on the teem needed to do work within spreadsheets, then it would make sense to automate on top of that. However, for greenfield projects I'm still not sold on the idea since it seems like a lot of manual overhead.

## Usage

Run `node index.js`. This will insert a new cell in [this spreadsheet][] (not publicly accessible).

[this spreadsheet]: https://docs.google.com/spreadsheets/d/1ssy9tNnMNFgqsSQM5Ven-bgGpifTAgLxLCzHSgq-xNw/edit#gid=0

## Resources

* [Google API Client][]
  * [Sheets v4 source](https://github.com/google/google-api-nodejs-client/blob/master/apis/sheets/v4.js)
* [Google Auth Library][]
* [Sheets API Docs](https://developers.google.com/sheets/api/guides/values)

[Google API Client]: https://github.com/google/google-api-nodejs-client
[Google Auth Library]: https://github.com/google/google-auth-library-nodejs#readme
