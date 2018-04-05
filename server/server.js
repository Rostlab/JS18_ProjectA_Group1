var express = require('express');
var path = require('path');
var logger = require('morgan');
var compression = require('compression');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');
var bookshelf = require('./config/bookshelf');
var swaggerUi = require('swagger-ui-express');

bookshelf.migrate();

// Controllers
var publicController = require('./controllers/public');
var nlpController = require('./controllers/nlp');

var app = express();

app.set('port', process.env.PORT || 3000);
app.use(compression());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(expressValidator());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../client/public')));

//Swagger initialization
var swaggerDocument = require('./docs/api-docs.json');
app.use('/API/documentation', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

//Endpoints
app.get('/API/datasets', publicController.getDatasets);
app.post('/API/columns', publicController.getColumns);
app.post('/API/examples', publicController.getExamples);
app.post('/API/nlp', nlpController.handleInput);
app.post('/API/classifyTokens', nlpController.classifyTokens);
app.post('/API/generateNewHistory', nlpController.generateNewHistory);

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '../client/public', 'index.html'));
});

// Production error handler
if (app.get('env') === 'production') {
    app.use(function (err, req, res, next) {
        console.error(err.stack);
        res.sendStatus(err.status || 500);
    });
}

app.listen(app.get('port'), function () {
    console.log('Express server listening http://localhost:' + app.get('port'));
});

module.exports = app;
