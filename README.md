# JS18_ProjectA_Group1

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
│   ├── index.html              # Client-side html              
│   ├── js/
│   │   └── app.js              # Client-side JavaScrip entry
│   ├── scss/
│   │   └── main.scss           # Client-side SCSS entry               
│   ├── test/                  
│   │   ├── karma.conf.js       # Client-side test configuration
│   │   └── unit/               # Client-side Unit tests  
│   └── public/                 # Compiled client sources
├── server/
│   ├── server.js               # Express application
│   ├── .env                    # API keys, passwords, and other sensitive information
│   ├── config/
│   │   └── bookshelf.js        # Bookshelf configuration
│   ├── controllers/            # Express controllers
│   ├── data/
│   │   └── core_dataset.csv    # Dataset to plot
│   │   └── commands.json       # NLP command specification
│   ├── migrations/
│   │   └── enployees.js        # migration that creates the database table
│   ├── migrations  
│   │   └── employees.js        # first migration file 
│   └── test/
│       └── unit/               # Client-side Unit tests     
├── .travis.yaml                # Continous integration script
├── gulpfile.js                 # Task desinitions
├── knexfile.js                 # knex configuration
└── package.json                # NPM Dependencies and scripts
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
-TODO
### how to run/usage
1) run the following command
```
# Start the app
$ npm run start
  -> Express server listening on port 3000
```
2) visit http://localhost:3000/ in the browser

### how to migrate
1) run the following command
```
# Start the app
$ npm run migrate
  -> Batch 1 run: 1 migrations    or
  -> Already up to date
```

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
### Where to find a demo version
