let bookshelf = require('../config/bookshelf');
let commands = require('../data/commands.json');
let _ = require('lodash');
let natural = require('natural');
let columnSynonyms = require('../data/column_synonyms');
const plot_functions = require('./plot-functions.js');
const Classifier = require('./classifier.js');

function getDatasets() {
    return bookshelf.Model.extend({tableName: 'generic_dataset'}).fetchAll()
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

        let input = req.body.input;
        let dataset = req.body.dataset;
        let history = req.body.history;

        let lowerCaseInput = req.body.input.toLowerCase();

        let tokenizer = new natural.WordTokenizer();
        let tokenizedInput = tokenizer.tokenize(lowerCaseInput);

        let tokenHolders = tokenizedInput.map(token => ({
            token: token,
            type: null,
            matchedValue: null,
            distance: Classifier.maxDistance + 1
        }));

        let initState = {
            input: input,
            tokenHolders: tokenHolders,
            layer: 0,
            currentToken: 0,
            dataset: dataset
        };

        let c = new Classifier(initState, state => findDataTransformationFunction(state, matchedCommand => {
            if (!matchedCommand.command.parameters.isTransformation) {
                history = []
            }
            history.push({
                function: matchedCommand.command.function,
                functionParameters: matchedCommand.parameters,
                input: input
            });

            executeFunctions(history, dataset, err => res.status(500).send({
                error: err,
                history: history.splice(-1, 1)
            })).then(
                data => res.send({plotly: data, history: history})
            )
        }, errorMessage => res.status(417).send({error: errorMessage})));
        c.findCommand();
    })
};

async function executeFunctions(history, dataset, errorCallback) {
    let currentData = {};
    for (let currentFunction of history) {
        await new Promise(resolve => {
            plot_functions[currentFunction.function](dataset, currentFunction.functionParameters, currentFunction.input, currentData, (data, layout) => {
                currentData = {data: data, layout: layout};
                resolve()
            }, errorCallback)
        })
    }
    return currentData
}

/**
 * Query the needed data and transform them i nto the dataformat for plotly.js
 * @param state containing the classified input
 * @param callback: a function that takes the found command and the connected parameters as a object
 * @param errorCallback: a function that is only called then a error occurred. It takes the error message as a parameter.
 */
function findDataTransformationFunction(state, callback, errorCallback) {
    let operation = null;
    let chartType = null;
    let columnsArray = [];

    state.tokenHolders.forEach(tokenHolder => {
        if (tokenHolder.type === Classifier.staticWords.operation) {
            operation = tokenHolder.matchedValue
        } else if (tokenHolder.type === Classifier.staticWords.chartType) {
            chartType = tokenHolder.matchedValue
        } else if (tokenHolder.type === Classifier.staticWords.column) {
            columnsArray.push(tokenHolder.matchedValue);
        }
    });

    let bestMatchedCommand = null;
    commands.forEach(command => {
        if (!command.parameters.isTransformation) {
            let possiblyMatches = true;

            // if there is a operation it must match
            if (operation != null) {
                possiblyMatches = Classifier.staticWords.plotOperations.includes(operation)
            }

            // check the chart type
            if (possiblyMatches) {
                if (chartType != null) {
                    possiblyMatches = command.parameters.chartType === chartType
                } else {
                    possiblyMatches = false;
                }
            }

            // check number of columns
            if (possiblyMatches) {
                possiblyMatches = columnsArray.length >= command.parameters.numberColumns;
            }

            // check if it is a better match than the current one
            if (possiblyMatches && bestMatchedCommand != null && !bestMatchedCommand.parameters.isTransformation) {
                possiblyMatches = command.parameters.numberColumn < bestMatchedCommand.parameters.numberColumns
            }

            // save command
            if (possiblyMatches) {
                bestMatchedCommand = command
            }
        } else {
            if (bestMatchedCommand == null) {
                bestMatchedCommand = command
            }
        }
    });

    // error handling
    if (bestMatchedCommand == null) {
        let errorMessage = "";
        if (chartType != null) {
            errorMessage = 'A column must be provided.'
        } else {
            errorMessage = 'No supported Chart-Type found.'
        }
        errorCallback(errorMessage)
    } else {
        callback({command: bestMatchedCommand, parameters: columnsArray})
    }
}