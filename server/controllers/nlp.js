let bookshelf = require('../config/bookshelf');
let commands = require('../data/commands.json');
let natural = require('natural');
var config = require('../knexfile');
var knex = require('knex')(config);
var _ = require('lodash');

function getDatasets() {
    return bookshelf.Model.extend({tableName: 'generic_dataset'}).fetchAll()
}

let functions = {
    plotHistogramOfColumn: function (dataset, parameters, callback) {
        let column = parameters[0];

        // SELECT <column> FROM <dataset>
        bookshelf.Model.extend({tableName: dataset}).fetchAll({columns: [column]}).then(data => callback(
            [{
                // map [{<columnName>: <columnValue>}, ...] to [<columnValue>, ...]
                x: data.map((value) => value.attributes[column]),
                type: 'histogram'
            }]
        ))
    },
    plotPieChartOfColumn: function (dataset, parameters, callback) {
        let column = parameters[0];

        // SELECT <column> FROM <dataset>
        bookshelf.Model.extend({tableName: dataset}).fetchAll({columns: [column]}).then(data => callback(
            [{
                // map [{<columnName>: <columnValue>}, ...] to [<columnValue>, ...]
                x: data.map((value) => value.attributes[column]),
                type: 'pie'
            }]
        ))
    },
};


function extractOperation(state) {
    let possibleOperations = ["plot", "make", "draw", "select"];
    var currentToken = state.tokens[state.currentToken];

    var result = _.includes(possibleOperations, currentToken);

    if (result) {
        // this layer matches for this token
        state.tokens[state.currentToken] = {type: "Operation", value: currentToken}
        // this layer matches for this token
        state.currentToken++;
        state.layer = 0;
        findCommand(state);
    } else {
        // this layer does not match
        nextActionAfterNotMatched(state);
    }
}

function extractColumn(state) {
    knex('human_resources__core_dataset').columnInfo().then(function (columnInfo) {
        var currentToken = state.tokens[state.currentToken]
        var result = _.find(columnInfo, function (o, i) {
            return i === currentToken;
        });

        if (result) {
            // this layer matches for this token
            state.tokens[state.currentToken] = {type: "Column", value: currentToken}
            state.currentToken++;
            state.layer = 0;
            findCommand(state);
        } else {
            // this layer does not match
            nextActionAfterNotMatched(state);
        }
    });
}

function extractChartType(state) {
    var currentToken = state.tokens[state.currentToken]
    let possibleTypes = ["histogram", "pie chart", "line chart", "bar chart", "scatter plot"];

    var result = _.includes(possibleTypes, currentToken);

    if (result) {
        // this layer matches for this token
        state.tokens[state.currentToken] = {type: "ChartType", value: currentToken}
        state.currentToken++;
        state.layer = 0;
        findCommand(state);
    } else {
        //search if the first word of a Type matches
        result = _.find(possibleTypes, function (o) {
            var firstWord = o.replace(/ .*/, '');
            return firstWord === currentToken;
        });
        if (result) {
            //look if the second matches
            var words = result.split(' ');
            if (words[1] === state.tokens[state.currentToken + 1]) {
                //replace the currentToken
                state.tokens[state.currentToken] = {type: "ChartType", value: result}
                state.tokens.splice(state.currentToken + 1, 1);
                state.currentToken++;
                state.layer = 0;
                findCommand(state);
            } else {
                //this layer does not match
                nextActionAfterNotMatched(state);
            }
        } else {
            // this layer does not match
            nextActionAfterNotMatched(state);
        }
    }
}

function extractConnector(state) {

}

let searchFunction = [
    extractColumn,
    extractChartType,
    extractOperation
];


function findCommand(state) {
    if (state.currentToken < state.tokens.length && state.layer < searchFunction.length) {
        searchFunction[state.layer](state);
    } else {
        state.callback(state)
    }
}

function nextActionAfterNotMatched(state) {
    if (state.layer < searchFunction.length - 1) {
        state.layer++;
    } else {
        state.layer = 0
        state.currentToken++
    }
    findCommand(state);
}


/**
 * POST /API/nlp
 */
exports.handleInput = function (req, res) {
    getDatasets().then(datasets => {
        req.assert('input', 'A plot command must be provided').notEmpty();
        req.assert('dataset', 'A dataset must be selected').notEmpty();
        req.assert('dataset', 'The dataset does not exist').custom(req_dataset => datasets.some(tmp_dataset => tmp_dataset.attributes.table_name === req_dataset));

        let errors = req.validationErrors();

        if (errors) {
            return res.status(400).send(errors);
        }

        let dataset = req.body.dataset;

        let lowerCaseInput = req.body.input.toLowerCase();

        var tokenizer = new natural.WordTokenizer();
        let tokenizedInput = tokenizer.tokenize(lowerCaseInput);


        let initState = {
            tokens: tokenizedInput,
            layer: 0,
            currentToken: 0,
            callback: state => {

                let bestMatch = {
                    function: 'plotHistogramOfColumn',
                    parameters: []
                };

                _.forEach(state.tokens, function (token) {
                    if (token.type === "Column") {
                        bestMatch.parameters.push(token.value);
                    }
                });
                functions[bestMatch.function](dataset, bestMatch.parameters, data =>
                    // Send the data back to the client
                    res.send({data: data})
                )
            }
        };

        findCommand(initState);

        // Use NLP to find the right command
        /*findCommand(dataset, req.body.input, command =>
            functions[command.function](dataset, command.parameters, data =>
                // Send the data back to the client
                res.send({data: data})
            )
        );*/
        // Query the needed data and transform them into the dataformat for plotly.js

    })
};