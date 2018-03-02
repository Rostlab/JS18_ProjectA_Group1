var express = require('express');
var path = require('path');
var logger = require('morgan');
var compression = require('compression');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');
var dotenv = require('dotenv');
var papaparse = require('papaparse');
var fs = require('fs');

// Load environment variables from .env file
dotenv.load();

// Controllers
var contactController = require('./controllers/contact');
var bookshelf = require('./config/bookshelf');


var app = express();

app.set('port', process.env.PORT || 3000);
app.use(compression());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(expressValidator());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../client/public')));

app.post('/contact', contactController.contactPost);

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname, '../client/public', 'index.html'));
});

app.get('*', function(req, res) {
  res.redirect('/#' + req.originalUrl);
});

// Production error handler
if (app.get('env') === 'production') {
  app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.sendStatus(err.status || 500);
  });
}

app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});

module.exports = app;

//var file = fs.readFile('./data/core_dataset.csv');
fs.readFile('./server/data/core_dataset.csv', "utf8",  function read(err, data) {
    if (err) throw err;

    papaparse.parse(data, {
        header: true,
        beforeFirstChunk: function(chunk) {
            var rows = chunk.split( /\r\n|\r|\n/ );
            var headings = rows[0].toLowerCase();
            headings = headings.split(' ').join('_');
            rows[0] = headings;
            for(var i = 1; i < rows.length; i++){
                columnValues = rows[i].split(",");
                for(var j = 0; j < columnValues.length; j++){
                    var dateParts = columnValues[j].split("/");
                    if(dateParts.length>2){
                        var swap = dateParts[1];
                        dateParts[1] = dateParts [0];
                        dateParts[0] = swap;
                        var dateObject = dateParts.join("/");
                        columnValues[j] = dateObject;
                    }
                }
                columnValues.join(",");
                rows[i] = columnValues;
            }
            return rows.join("\r\n");
        },
        complete: function(results) {
            parsedData = results.data;

            //labels = parsedData[0];


            var User = bookshelf.Model.extend({
                tableName: 'Employee',
                idAttribute: 'employee_number'
            });


            var bob = new User(parsedData[0]);
            bob.save(null, {method: 'insert'});

            //var employees = Accounts.forge(data[1])

        }
    });
        // Or put the next step in a function and invoke it
});




