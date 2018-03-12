let bookshelf = require('../config/bookshelf');
let commands = require('../data/commands.json');
let natural = require('natural');
var config = require('../knexfile');
var knex = require('knex')(config);
var _ = require('lodash');
var columnSynonyms = require('../data/column_synonyms');

let static = {
    column: "Column",
    operation: "Operation",
    chartType: "ChartType"

}

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
    plotHistogramOfTwoColumns: function (dataset, parameters, callback) {
        let column1 = parameters[0];
        let column2 = parameters[1];

        // SELECT <column1>, <column2> FROM <dataset>
        bookshelf.Model.extend({tableName: dataset}).fetchAll({columns: [column1, column2]}).then(data => callback(
            [{
                // map [{<columnName>: <columnValue>}, ...] to [<columnValue>, ...]
                x: data.map((value) => value.attributes[column1]),
                type: 'histogram'
            },
            {
                // map [{<columnName>: <columnValue>}, ...] to [<columnValue>, ...]
                x: data.map((value) => value.attributes[column2]),
                type: 'histogram'
            }]
        ))
    },

    plotLineChartOfColumn: function (dataset, parameters, callback) {
        let column = parameters[0];

        // SELECT <column> FROM <dataset>
        bookshelf.Model.extend({tableName: dataset}).fetchAll({columns: [column]}).then(data => callback(
            [{
                // map [{<columnName>: <columnValue>}, ...] to [<columnValue>, ...]
                x: data.map((value) => value.attributes[column]),
                type: 'scatter'
            }]
        ))
    },
    plotScatterOfTwoColumns: function (dataset, parameters, callback) {
        let column1 = parameters[0];
        let column2 = parameters[1];

        // SELECT <column1>, <column2>  FROM <dataset>
        bookshelf.Model.extend({tableName: dataset}).fetchAll({columns: [column1, column2]}).then(data => {
            callback(
                [{
                    // map [{<columnName>: <columnValue>}, ...] to [<columnValue>, ...]
                    x: data.map((value) => value.attributes[column1]),
                    y: data.map((value) => value.attributes[column2]),
                    mode: 'markers',
                    type: 'scatter'
                }]
            )
        });
    },
    plotPieChartOfColumn: function (dataset, parameters, callback) {
        let column = parameters[0];
        // SELECT <column> FROM <dataset>
        bookshelf.Model.extend({tableName: dataset}).fetchAll({columns: [column]}).then(data => {
            var entries = data.map((value) => value.attributes[column]);
            var values = [];
            var labels = [];
            _.forEach(entries, function (entry) {
                if(!_.includes(labels, entry)){
                    labels.push(entry);
                    values.push(1);
                } else {
                    var index = labels.indexOf(entry);
                    values[index]++;
                }
            })
            callback(
                [{
                    // map [{<columnName>: <columnValue>}, ...] to [<columnValue>, ...
                    values: values,
                    labels: labels,
                    type: 'pie'
                }]
            )
        })


    },
};

let searchFunction = [
    extractOperation,
    extractChartType,
    extractColumn
];

function findCommand(state) {
    if (state.currentToken < state.tokens.length && state.layer < searchFunction.length) {
        searchFunction[state.layer](state);
    } else {
        state.callback(state);
    }
}

function nextAction(matched, state) {
    if(matched) {
        state.currentToken++;
        state.layer = 0;
    } else {
        if (state.layer < searchFunction.length - 1) {
            state.layer++;
        } else {
            state.layer = 0;
            state.currentToken++;
        }
    }
    findCommand(state);
}



function extractOperation(state) {
    let possibleOperations = ["plot", "make", "draw", "select"];
    let currentToken = state.tokens[state.currentToken];
    let tokenMatched  = _.includes(possibleOperations, currentToken);

    if (tokenMatched ) {
        // this layer matches for this token
        state.tokens[state.currentToken] = {type: static.operation, value: currentToken};
    }
    nextAction(tokenMatched, state);
}

function extractColumn(state) {
    knex('human_resources__core_dataset').columnInfo().then(function (columnInfo) {
        let currentToken = state.tokens[state.currentToken];
        let matched = false;
        let tokenMatched  = _.find(columnInfo, function (o, i) {
            return i === currentToken;
        });
        if (tokenMatched ) {
            // this layer matches for this token
            state.tokens[state.currentToken] = {type: static.column, value: currentToken};
            matched = true;
        } else {
            //look for synonyms
            _.forEach(columnSynonyms, function (column) {
                if(_.includes(column.synomyms, currentToken)){
                    tokenMatched  = column.columnName;
                    return false;
                }
            });
            if(tokenMatched ){
                state.tokens[state.currentToken] = {type: static.column, value: tokenMatched }
                matched = true;
            }else{
                _.forEach(columnSynonyms, function (column) {
                    var firstTokenMatched  = _.filter(column.synomyms, function (o) {
                        var firstWord = o.replace(/ .*/, '');
                        return firstWord === currentToken;
                    });
                    if(firstTokenMatched .length > 0){
                        //look if the second matches
                        _.forEach(firstTokenMatched , function (item) {
                            var words = item.split(' ');
                            if (words[1] === state.tokens[state.currentToken + 1]) {
                                //replace the currentToken
                                state.tokens[state.currentToken] = {type: static.column, value: column.columnName}
                                state.tokens.splice(state.currentToken + 1, 1);
                                matched = true;
                            }
                        });
                    }
                });
            }
        }
        nextAction(matched, state);
    });
}

function extractChartType(state) {
    var currentToken = state.tokens[state.currentToken]
    let possibleTypes = ["histogram", "pie chart", "line chart", "bar chart", "scatter plot"];
    let matched = false;
    var tokenMatched  = _.includes(possibleTypes, currentToken);

    if (tokenMatched ) {
        // this layer matches for this token on single word
        state.tokens[state.currentToken] = {type: static.chartType, value: currentToken}
        matched = true;
    } else {
        //search if the first word of a Type matches
        tokenMatched  = _.find(possibleTypes, function (o) {
            var firstWord = o.replace(/ .*/, '');
            return firstWord === currentToken;
        });
        if (tokenMatched ) {
            //look if the second matches
            var words = tokenMatched .split(' ');
            if (words[1] === state.tokens[state.currentToken + 1]) {
                //replace the currentToken
                state.tokens[state.currentToken] = {type: static.chartType, value: tokenMatched }
                state.tokens.splice(state.currentToken + 1, 1);
                matched = true;
            }
        }
    }
    nextAction(matched, state);
}

function extractConnector(state) {

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
                callbackFunction(state, res)},
            dataset: dataset
        };

        findCommand(initState);

        // Query the needed data and transform them into the dataformat for plotly.js

    })
};

function callbackFunction(state, res){
    var numberMatches;
    var numberColumns;
    var columnsArray;
    var dataset = state.dataset;
    var bestMatched = {
        numberMatches: 0,
        function: "",
        functionParameter: []
    };
    _.forEach(commands, function (command) {
        numberMatches = 0;
        numberColumns = 0;
        columnsArray = [];
        _.forEach(state.tokens, function (token) {
            if (token.type === static.column) {
                numberColumns++;
                columnsArray.push(token.value);
            } else if(token.type === static.chartType){
                if(token.value === command.parameters.chartType){
                    numberMatches++;
                }
            }
        });
        if(numberColumns === command.parameters.numberColumns){
            numberMatches++;
        }
        if(numberMatches > bestMatched.numberMatches){
            bestMatched.numberMatches = numberMatches;
            bestMatched.function = command.function;
            _.forEach(command.functionParameters, function(param, index){
                if(param === static.column){
                    bestMatched.functionParameter.push(columnsArray[index]);
                }
            });

        }
    });


    functions[bestMatched.function](dataset, bestMatched.functionParameter, data =>
        // Send the data back to the client
        res.send({data: data})
    )
}