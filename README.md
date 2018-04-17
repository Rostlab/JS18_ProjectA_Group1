# JS18_ProjectA_Group1 [![Build Status](https://travis-ci.org/Rostlab/JS18_ProjectA_Group1.svg?branch=develop)](https://travis-ci.org/Rostlab/JS18_ProjectA_Group1)

## This file contains the following items:
### project description
### technical consideration:
* dependencies
* architecture
* other
* env variables
### how to get the code
checkout this repository
### code structure
```
.
├── client/
│   ├── index.html                  # Client-side html              
│   ├── js/
│   │   └── app.js                  # Client-side JavaScrip entry
│   ├── scss/
│   │   └── main.scss               # Client-side SCSS entry               
│   ├── test/                  
│   │   ├── karma.conf.js           # Client-side test configuration
│   │   └── unit/                   # Client-side Unit tests  
│   └── public/                     # Compiled client sources
├── server/
│   ├── server.js                   # Express application
│   ├── knexfile.js                 # Knex configuration file
│   ├── .env                        # API keys, passwords, and other sensitive information
│   ├── config/
│   │   └── bookshelf.js            # Bookshelf configuration
│   ├── controllers/                # Express controllers
│   │   ├── classifier.js           # Logic for labeling tokens
│   │   ├── nlp.js                  # Logic for evaluating labeled tokens
│   │   ├── plot-functions.js       # Supported plot functions (get data for input and return plotly object)
│   │   └── public.js               # Provides data for client
│   ├── data/
│   │   ├── core_dataset.csv        # Dataset to plot
│   │   ├── column_synonyms.json    # Synonyms for column names of datasets
│   │   └── commands.json           # Hardcoded commands command specification
│   ├── docs/
│   │   └── api-docs.js             # Swagger-specification file for enpoints
│   ├── librarys/
│   │   └── levensthein_distance.js # Calculates string distance from tokens to labels 
│   ├── migrations/
│   │   └── enployees.js            # Migration that creates the database table
│   └── test/
│       └── unit/                   # Server-side unit tests     
├── .travis.yaml                    # Continous integration script
├── gulpfile.js                     # Task definitions
├── knexfile.js                     # Knex configuration
└── package.json                    # NPM Dependencies and scripts
```
### how to build
 1) install node/npm
 2) setup the database (install and configure postgres, example is for mac using homebrew)
```
# Update Homebrew's package database
$ brew update

# Install PostgreSQL
$ brew install postgres

# Start PostgreSQL Server
$ postgres -D /usr/local/var/postgres
```
  (Hint: if you are using the provided dataset make sure the date-format of postgres is mdy)

 3) create a .env file in the repository root with the following content (change it according to your postgres configuration)
```
DB_HOST="localhost"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_NAME="postgres"
SESSION_SECRET="testsecret"
```
 4) run the following commands to build the backend and the frontend
```
$ cd <repository>
# Install NPM dependencies
$ npm install

# Build the frontend
$ npm run build
```
### how to deploy 
 Currently travis will push the application automatically to azure git repo, which will trigger a deployment. The branches which should be deployed are specified in the .travis.yml . 
 
### how to change build server config
 Change .travis.yml file according to your needs. See https://docs.travis-ci.com/user/customizing-the-build for more information
  
### how to run/usage
1) run the following command
```
# Start the app
$ npm run start
  -> Express server listening on port 3000
```
2) visit http://localhost:3000/ in the browser

### how to add another dataset
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


### how to migrate
1) run the following command
```
# Start the app
$ npm run migrate
  -> Batch 1 run: 1 migrations    or
  -> Already up to date
```
Hint: The server will try to execute the migration on every server start

### how to rollback
1) run the following command
```
# Start the app
$ npm run rollback
  -> Batch 1 rolled back: 1 migrations     or
  -> Already at the base migration
```

### useful commands
```
# build the system
$ npm run build

# built for production
$ npm run build:production

# start server
$ npm run start

# run local tests
$ npm run test

# automatically build the css while development
$ npm run watch
```

### Testing
1) run the following command
```
# Start the app
$ npm test
```

#### Structure of the test cases:
- Five tests for testing API endpoints. 
- Test simple plot functions
  - Histogram test
  - Pie chart test
  - Scatter plot tests
  - Line chart test
- Test filter operations
  - Pie chart with sex filter
  - Histogram with age filter
  - Pie chart with age filter
- Tests from commands.json

### API documentation - Swagger
Swagger-UI is used to document the implemented APIs. 

##### What is Swagger?
Swagger is a collection of open-source tools build around OpenAPI. 
OpenAPI itself is a specification which determines how to document REST APIs.
If you come up with a description according to the specification can be used to 
document an API.
One of these benefits is that it can be used to generate working clients
in many programming languages.

The API-description file can be found in {project-root}/server/docs/api-docs.json

Swagger-UI enhances this functionality by
providing a website which can be used as a client for calling
 the API. For generating the website the API description file is used.

Current status:
- Enpoints: 
    - /API/datasets         -documented
    - /API/columns          -documented
    - /API/examples         -documented
    - /API/nlp              -documented
    - /API/classifyTokens   -not documented


- Links:
    - [swagger-ui-express](https://www.npmjs.com/package/swagger-ui-express)
    - [API documentation](https://js2018-group1.azurewebsites.net/API/documentation)
    - [OpenAPI](https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md)
    
### Links
- [Public demo](https://js2018-group1.azurewebsites.net)
- [API documentation](https://js2018-group1.azurewebsites.net/API/documentation)
