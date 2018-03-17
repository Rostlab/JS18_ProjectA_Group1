let bookshelf = require('../config/bookshelf');
let commands = require('../data/commands.json');
let natural = require('natural');
let config = require('../knexfile');
let knex = require('knex')(config);
let _ = require('lodash');
let columnSynonyms = require('../data/column_synonyms');

let staticWords = {
    column: "Column",
    operation: "Operation",
    chartType: "ChartType"
};

let maxDistance = 5;

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
            let entries = data.map((value) => value.attributes[column]);
            let values = [];
            let labels = [];
            _.forEach(entries, function (entry) {
                if (!_.includes(labels, entry)) {
                    labels.push(entry);
                    values.push(1);
                } else {
                    let index = labels.indexOf(entry);
                    values[index]++;
                }
            });
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

function nextAction(state, lookahead) {
    if (state.tokenHolders[state.currentToken].distance <= maxDistance) {
        //matched
        if (lookahead) {
            state.tokenHolders.splice(state.currentToken + 1, 1);
        }
        state.currentToken++;
        state.layer = 0;
    } else if (state.layer >= searchFunction.length - 1) {
        //no more clasification function to call
        state.currentToken++;
        state.layer = 0;
    } else {
        //call next classification function
        state.layer++;
    }
    findCommand(state);
}

function findCommand(state) {
    if (state.currentToken < state.tokenHolders.length && state.layer < searchFunction.length) {
        searchFunction[state.layer](state);
    } else {
        state.callback(state);
    }
}

function extractOperation(state) {
    let possibleOperations = ["plot", "make", "draw", "select"];
    classifyToken(state, staticWords.operation, possibleOperations, false);
}

function extractColumn(state) {
    knex('human_resources__core_dataset').columnInfo().then(function (columnInfo) {

        let columnNames = Object.getOwnPropertyNames(columnInfo);
        let possibleColumns = columnNames.concat(columnSynonyms.map(syn => {
            return syn.column_name;
        }));
        classifyToken(state, staticWords.column, possibleColumns, true);
    });
}

function extractChartType(state) {
    let possibleTypes = ["histogram", "pie chart", "line chart", "bar chart", "scatter plot"];
    classifyToken(state, staticWords.chartType, possibleTypes, true);
}

//state: current state
//type: classification category (chartType, column, operation ...)
//valueRange: possible values of the category
//lookahead: false if no lookahead should be performed
function classifyToken(state, type, valueRange, lookahead) {
    let tokenHolder = state.tokenHolders[state.currentToken];
    let performedLookahead = false;
    let tokenMatched = getMostLikelyMatch(tokenHolder.token, valueRange);
    if (tokenMatched && tokenMatched.distance < tokenHolder.distance) {
        // this layer matches for this token
        state.tokenHolders[state.currentToken] = {
            token: tokenMatched.token,
            type: type,
            matchedValue: tokenMatched.type,
            distance: tokenMatched.distance
        };
    } else if (lookahead && state.currentToken <= state.tokenHolders.length - 2) {
        performedLookahead = true;
        let nextTokenHolder = state.tokenHolders[state.currentToken + 1];
        tokenMatched = getMostLikelyMatch(tokenHolder.token + " " + nextTokenHolder.token, valueRange);
        if (tokenMatched && tokenMatched.distance < tokenHolder.distance) {
            //replace the currentToken
            state.tokenHolders[state.currentToken] = {
                token: tokenMatched.token,
                type: type,
                matchedValue: tokenMatched.type,
                distance: tokenMatched.distance
            };
        }
    }
    nextAction(state, performedLookahead);
}

function getMostLikelyMatch(token, possibleTypes) {
    let ratedTypeAffiliation = [];
    possibleTypes.forEach((type) => {
        let distance = getLevenshteinDistance(token, type)
        ratedTypeAffiliation.push({
            "type": type,
            "distance": distance,
            "token": token
        });
    })

    let minDistance = Math.min.apply(Math, ratedTypeAffiliation.map(ratedType => {
        return ratedType.distance;
    }));

    let mostLikelyMatch = ratedTypeAffiliation.find((ratedType) => ratedType.distance == minDistance);
    //console.log("Token: " + token + " Distance: " + mostLikelyMatch.distance + " matched to " + mostLikelyMatch.type)
    return mostLikelyMatch;
}


function getLevenshteinDistance(token, label) {
    let weight = 5 / (token.length / 2);
    let distance = natural.LevenshteinDistance(token, label, {
        insertion_cost: 2 * weight,
        deletion_cost: 2 * weight,
        substitution_cost: weight
    });
    return distance;
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

        let tokenizer = new natural.WordTokenizer();
        let tokenizedInput = tokenizer.tokenize(lowerCaseInput);

        let tokenHolders = tokenizedInput.map(token => {
            return {
                token: token,
                type: null,
                matchedValue: null,
                distance: maxDistance + 1
            };
        })

        let initState = {
            tokenHolders: tokenHolders,
            layer: 0,
            currentToken: 0,
            callback: state => {
                findDataTransformationFunction(state, res)
            },
            dataset: dataset
        };

        findCommand(initState);

        // Query the needed data and transform them into the dataformat for plotly.js

    })
};

function findDataTransformationFunction(state, res) {
    let numberMatches;
    let numberColumns;
    let columnsArray;
    let dataset = state.dataset;
    let bestMatched = {
        numberMatches: 0,
        function: "",
        functionParameter: []
    };
    _.forEach(commands, function (command) {
        numberMatches = 0;
        numberColumns = 0;
        columnsArray = [];
        _.forEach(state.tokenHolders, function (tokenHolder) {
            if (tokenHolder.type === staticWords.column) {
                numberColumns++;
                columnsArray.push(tokenHolder.matchedValue);
            } else if (tokenHolder.type === staticWords.chartType) {
                if (tokenHolder.matchedValue === command.parameters.chartType) {
                    numberMatches++;
                }
            }
        });
        if (numberColumns === command.parameters.numberColumns) {
            numberMatches++;
        }
        if (numberMatches > bestMatched.numberMatches) {
            bestMatched.numberMatches = numberMatches;
            bestMatched.function = command.function;
            _.forEach(command.functionParameters, function (param, index) {
                if (param === staticWords.column) {
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