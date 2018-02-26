# JS18_ProjectA_Group1

## This file contains the following items:
### project description
### technical consdieration:
* dependencies
* archtietcutre
* other
* env variables
### how to get the code
checkout this repository
### code structure
```
.
├── controllers/               # Express route handlers
├── models/                    # Express database models
├── public/                            
│   ├── css/                   # Sass/LESS/PostCSS/CSS stylesheets (both source and generated)
│   ├── fonts/                 # Web fonts
│   ├── js/                    # Client-side JavaScript and third-party vendor files
├── views/                     # Templates
├── test/                      # Unit tests                    
├── .env                       # API keys, passwords, and other sensitive information
├── server.js                  # Express application
└── package.json               # NPM Dependencies and scripts
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
