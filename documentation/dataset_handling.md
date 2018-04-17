# 2.5 Dataset handling
### 2.5.1 How to add another dataset

The general process how to add data from a datastorage to a relational db looks like this:
- Accessing the datastorage
- Parsing the data from the datastorage
- Writing the data to the database

In case of this project the functionality to add data to the db comes with the orm ([bookshelf.js](http://bookshelfjs.org/) in combination with [knex.js](http://knexjs.org/)).
The data is inserted in so called migrations. A migration is an operation which comprises 
the creation and the manipulation of the data schema and data of the database. One of the big advantages is
that one can adapt the db-schema to changes of the project and recreate the current db status
by executing the migrations in succession. Since each dataset is represented as its own table
this is the way to go in this project.

Usually there is also a rollback operation which reflects the counterpart of a migration. It
reverts all the changes done by the migration.

For this project it works a little differently. There is only one migration and one rollback method, 
so there are no migrations files which are executed in succession, but one file which will create 
the current status of the db. How it works in detail is described in the following paragraphs.
##### 2.5.1.1 Creating migration functionality

1) Create a method for the manipulation of the db which shall be made e.g. for creating a 
 new dataset one would create a new table. 

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

3) Provide a mechanism to access the data you want to insert into the dataset. 
In this project the data was provided in .csv files which were stored either local (development branch) or remote (feature/20/second-dataset branch).

Local: The local dataset was checked in with version control (accessed via [filesystem](https://nodejs.org/api/fs.html)).

Remote: The remote dataset is downloaded ([https](https://nodejs.org/api/https.html)) and decompressed if necessary ([zlib](https://nodejs.org/api/zlib.html)). 
For parsing the .csv files, a third party library ([papaparse](https://www.papaparse.com/docs)) was used.

Here is an example of accessing and parsing a local .csv file:

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

```javascript
insertData(knex, tableName_generic_dataset, [
            {
                table_name: tableName,
                display_name: 'DisplayName',
                description: 'New dataset',
                file: './data/new_dataset.csv'
            }])
```

##### 2.5.1.2 Create rollback functionality

1) Enqueue a drop table call in the promise chain of the exports.down 
method in migrations.js
```javascript
return Promise.resolve()
               .then(() => deleteTable(knex, tableName))
               ...
```


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

