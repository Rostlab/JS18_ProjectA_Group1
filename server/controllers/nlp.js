let bookshelf = require('../config/bookshelf');
let commands = require('../data/commands.json');
let _ = require('lodash');
let natural = require('natural');
let columnSynonyms = require('../data/column_synonyms');
let plot_functions = require('./plot-functions.js');
let classification = require('./classification.js');

function getDatasets() {
    return bookshelf.Model.extend({tableName: 'generic_dataset'}).fetchAll()
}

let searchFunction = [
    classification.extractOperation,
    classification.extractChartType,
    classification.extractColumn
];

/**
 * decides upon the next action,
 * either accept the current classification of a token and move to the next token,
 * or try other layers to find a classification for a token
 * or move to the next token because there are no classification functions left
 * @param state current state of classification of the whole state
 * @param lookahead ture if a lookahead was used in the classification
 */
function nextAction(state, lookahead) {
    if (state.tokenHolders[state.currentToken].distance <= classification.maxDistance) {
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
        searchFunction[state.layer](state, nextAction);
    } else {
        state.callback(state);
    }
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
                distance: classification.maxDistance + 1
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
            if (tokenHolder.type === classification.staticWords.column) {
                numberColumns++;
                columnsArray.push(tokenHolder.matchedValue);
            } else if (tokenHolder.type === classification.staticWords.chartType) {
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
                if (param === classification.staticWords.column) {
                    bestMatched.functionParameter.push(columnsArray[index]);
                }
            });

        }
    });

    plot_functions.functions[bestMatched.function](dataset, bestMatched.functionParameter, (data, layout) =>
        // Send the data back to the client
        res.send({data: data, layout: layout})
    )
}