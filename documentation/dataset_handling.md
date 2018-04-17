# How to add another dataset
Hint: a dataset is assumed to be depictable as one table
1) create a method for creating the structure of the table for the dataset. bookshelf.js in combination with [knex.js](http://knexjs.org/) is used as orm. Find more detailed information about creating datatables with knex in the official documentation

```javascript
function createDatset(knex) {
    return knex.schema.createTable(dataset_name, table => {
        table.string('identifier').primary();
        table.integer('someIntegerAttribute');
        table.double('someDoubleAttribute');
        table.date('someDateAttribute');
        table.boolean('someBooleanAttribute');
    });
}
```

2) enqueue the method of the promise chain in exports.up method in migration.js
```javascript
return Promise.resolve()
       .then(...)
       ...
       .then(() => createDataset(knex))
```

3) provide a mechanism to access the data you want to insert into the dataset. In this project the data was provided in .csv files which were stored either local or remote.

Local: The local dataset was checked in with version control (accessed via [filesystem](https://nodejs.org/api/fs.html)).

Remote: The remote dataset is downloaded ([https](https://nodejs.org/api/https.html)) from a blob-server and decompressed if necessary. 
To parse the .csv files, a third party library ([papaparse](https://www.papaparse.com/docs)) was used.

```javascript
    //example of parsing a file
    let parseData = fs.readFileSync(fileLocation, "utf8");
    let parseResult = papaparse.parse(parseData, parseConfiguration);
```

4) insert data into datatable

```javascript
function insertData(knex, tableName, data) {
    return knex(tableName).insert(data);
}
```

5) insert the dataset metadata in the generic dataset table

6) create a drop table method

```javascript
function deleteDataset(knex) {
    return knex.schema.dropTable(dataset_name)
}
```

7) enqueue the drop table method in the promise chain of the exports.down method in migrations.js

8) delete the entry for the dataset in the generic dataset table

9) links:
- https: https://nodejs.org/api/https.html
- papaparse: https://www.papaparse.com/docs
- filesystem: https://nodejs.org/api/fs.html
- knex: http://knexjs.org/


# Database migration
## Migration
1) run the following command
```
# Start the app
$ npm run migrate
  -> Batch 1 run: 1 migrations    or
  -> Already up to date
```
Hint: The server will try to execute the migration on every server start

## Rollback
1) run the following command
```
# Start the app
$ npm run rollback
  -> Batch 1 rolled back: 1 migrations     or
  -> Already at the base migration
```

