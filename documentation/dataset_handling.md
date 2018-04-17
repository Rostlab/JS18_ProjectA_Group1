# 2.5 Dataset handling
### 2.5.1 How to add another dataset
Adding another dataset covers adding functionality for the new migration-step and rollback-step.
The migration comprises manipulating the data schema and data and the rollback how to undo the manipulation.
In general all the database interaction in this project work with an orm ([bookshelf.js](http://bookshelfjs.org/) in combination with [knex.js](http://knexjs.org/)),
so the migration depends heavily on those libraries.

- Assumption: a dataset is assumed to be depictable as one table

##### 2.5.1.1 Creating migration functionality

1) Create a method for creating the structure of the table for
 the dataset. 

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

2) Enqueue the method of the promise chain in exports.up method in migration.js
```javascript
return Promise.resolve()
       .then(...)
       ...
       .then(() => createDataset(knex))
```

3) Provide a mechanism to access the data you want to insert into the dataset. In this project the data was provided in .csv files which were stored either local or remote.

Local: The local dataset was checked in with version control (accessed via [filesystem](https://nodejs.org/api/fs.html)).

Remote: The remote dataset is downloaded ([https](https://nodejs.org/api/https.html)) from a blob-server and decompressed if necessary. 
To parse the .csv files, a third party library ([papaparse](https://www.papaparse.com/docs)) was used.

```javascript
    //example of parsing a file
    let parseData = fs.readFileSync(fileLocation, "utf8");
    let parseResult = papaparse.parse(parseData, parseConfiguration);
```

4) Insert data into datatable

```javascript
function insertData(knex, tableName, data) {
    return knex(tableName).insert(data);
}
```

5) Insert the dataset metadata in the generic dataset table

##### 2.5.1.2 Create rollback functionality

1) Create a drop table method

```javascript
function deleteDataset(knex) {
    return knex.schema.dropTable(dataset_name)
}
```

2) Enqueue the drop table method in the promise chain of the exports.down method in migrations.js

3) Delete the entry for the dataset in the generic dataset table


### 2.5.2 Manual database migration
##### 2.5.2.1 Migration
1) Run the following command
```
# Start the app
$ npm run migrate
  -> Batch 1 run: 1 migrations    or
  -> Already up to date
```
Hint: The server will try to execute the migration on every server start

##### 2.5.2.2 Rollback
1) Run the following command
```
# Start the app
$ npm run rollback
  -> Batch 1 rolled back: 1 migrations     or
  -> Already at the base migration
```

