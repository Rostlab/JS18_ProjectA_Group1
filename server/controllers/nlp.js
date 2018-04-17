let bookshelf = require('../config/bookshelf');
let commands = require('../data/commands.json');
let nlp = require('compromise');
const plot_functions = require('./plot-functions.js');
const Classifier = require('./classifier.js');

function getDatasets() {
    return bookshelf.Model.extend({tableName: 'generic_dataset'}).fetchAll()
}

/**
 * POST /API/classifyTokens
 * for debug purposes
 * renders only the classify results, request parameters are similar to /API/nlp
 */
exports.classifyTokens = async function (req, res) {
    let input = req.body.input;
    let dataset = req.body.dataset;

    let data = nlp(input);
    data.values().toNumber();

    let tokenHolders = await Classifier.classifyTokens(data.terms().data(), dataset);
    tokenHolders = combineComplexTokens(tokenHolders);
    res.send(tokenHolders.map(simplifyTokenHolder))
};

/**
 * POST /API/nlp
 * main function
 * takes the input string, the dataset and the history from the request and renders the requested plot and the new history to the response
 */
exports.handleInput = async function (req, res) {
    let datasets = await getDatasets();
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

    try {
        let newHistory = await module.exports.generateNewHistory(input, dataset, history);
        let data = await executeFunctions(newHistory, dataset);
        res.send({plotly: data, history: newHistory})
    } catch (error) {
        console.log(error);
        res.status(417).send({error: error.toString(), history: history})
    }
};

/**
 * Creates a new history for a given history and a new input
 * @param input: a string which contains a command to create a new pot or to change a existing one
 * @param dataset: the dataset on which the input is operating on
 * @param history: a history of previous commands
 * @returns {Promise<history>}
 */
exports.generateNewHistory = async function (input, dataset, history) {
    let data = nlp(input);
    data.values().toNumber();
    let tokenHolders = await Classifier.classifyTokens(data.terms().data(), dataset);

    return new Promise(resolve => {
        findDataTransformationFunction(tokenHolders, matchedCommand => {
            if (history === undefined || !matchedCommand.command.parameters.isTransformation) {
                history = []
            }
            history.push({
                function: matchedCommand.command.function,
                functionParameters: matchedCommand.parameters,
                input: input
            });
            resolve(history);
        })
    })
};

/**
 * executes all commands from a history on a dataset and returns the resulting data
 * @param history: the history which contains the commands
 * @param dataset: the dataset on which the commands are operating on
 * @returns {Promise<{data: *, layout: *}>}: A Promise that returns (when resolved) a object that holds the plotly data and layout objects
 */
async function executeFunctions(history, dataset) {
    let currentData = {};
    for (let currentFunction of history) {
        await new Promise((resolve, reject) => {
            plot_functions[currentFunction.function](dataset, currentFunction.functionParameters, currentFunction.input, currentData, (data, layout) => {
                currentData = {data: data, layout: layout};
                resolve()
            }, reject)
        })
    }
    return currentData
}

/**
 * takes a tokenHolder and extracts (recursively) all information that is needed after classification
 * @param tokenHolder
 * @returns {{token: *, label: *, labelType: *}}
 */
function simplifyTokenHolder(tokenHolder) {
    let data = {
        "token": tokenHolder.token,
        "label": tokenHolder.label,
        "labelType": tokenHolder.labelType
    };
    if (tokenHolder.hasOwnProperty("column") && tokenHolder.column !== undefined) {
        data.column = tokenHolder.column
    }
    if (tokenHolder.hasOwnProperty("filterValue")) {
        data.filterValue = simplifyTokenHolder(tokenHolder.filterValue)
    }
    if (tokenHolder.hasOwnProperty("groupColumn")) {
        data.groupColumn = simplifyTokenHolder(tokenHolder.groupColumn)
    }
    return data
}

/**
 * Query the needed data and transform them i nto the dataformat for plotly.js
 * @param tokenHolders: containing the classified input tokens
 * @param callback: a function that takes the found command and the connected parameters as a object
 * @param errorCallback: a function that is only called then a error occurred. It takes the error message as a parameter.
 */
function findDataTransformationFunction(tokenHolders, callback, errorCallback) {
    let operation = null;
    let chartType = null;
    let columnsArray = [];
    let filterArray = [];

    let complexTokenHolders = combineComplexTokens(tokenHolders);

    complexTokenHolders.forEach(tokenHolder => {
        if (tokenHolder.labelType === Classifier.staticWords.operation) {
            operation = tokenHolder.label
        } else if (tokenHolder.labelType === Classifier.staticWords.chartType) {
            chartType = tokenHolder.label
        } else if (tokenHolder.labelType === Classifier.staticWords.column) {
            columnsArray.push(simplifyTokenHolder(tokenHolder));
        } else if ((tokenHolder.labelType === Classifier.staticWords.filterSelector || tokenHolder.labelType === Classifier.staticWords.genericSelector) && tokenHolder.filterValue !== undefined) {
            filterArray.push(simplifyTokenHolder(tokenHolder))
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
                // TODO check if this is correct (is more specific not the other way around?)
                possiblyMatches = command.parameters.numberColumns > bestMatchedCommand.parameters.numberColumns
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
    // TODO find a better metric
    if (bestMatchedCommand == null) {
        let errorMessage = "";
        if (chartType != null) {
            errorMessage = 'A column must be provided.'
        } else {
            errorMessage = 'No supported Chart-Type found.'
        }
        errorCallback(errorMessage)
    } else {
        callback({command: bestMatchedCommand, parameters: {columns: columnsArray, filters: filterArray}})
    }
}


/**
 * takes the list of (simplified) tokenHolders, combines them by predefined rules to filters and groupings and returns the new complex tokens
 * @param tokenHolders
 */
function combineComplexTokens(tokenHolders) {
    // hide unclassified tokens
    let complexTokenHolders = tokenHolders.filter(tokenHolder => tokenHolder.label != null || tokenHolder.labelType === Classifier.staticWords.value);

    // include ColumnValues/Values into FilterSelectors
    for (let i = 0; i < complexTokenHolders.length - 1; i++) {
        // if (current token is a FilterSelector and next token is a Value|ColumnValue) or (current token is a GenericSelector and next token is a ColumnValue)
        if ((complexTokenHolders[i].labelType === Classifier.staticWords.filterSelector
            && (complexTokenHolders[i + 1].labelType === Classifier.staticWords.value || complexTokenHolders[i + 1].labelType === Classifier.staticWords.columnValue))
            || (complexTokenHolders[i].labelType === Classifier.staticWords.genericSelector && complexTokenHolders[i + 1].labelType === Classifier.staticWords.columnValue)) {

            complexTokenHolders[i].filterValue = complexTokenHolders[i + 1];
            complexTokenHolders.splice(i + 1, 1);

            // if we don't yet know the column the filter is operating on and the token before is a column it is most likely the column we search for
            if (complexTokenHolders[i].filterValue.column === null && i > 0 && complexTokenHolders[i - 1].labelType === Classifier.staticWords.column) {
                complexTokenHolders[i].filterValue.column = complexTokenHolders[i - 1].label
            }

            // if we still don't know the column the filter is operating on and the token before is a filter as well that knows on which column it is operating on it is most likely the column we search for
            // TODO verify that (assigning the same column as the previous filter)
            if (complexTokenHolders[i].filterValue.column === null && i > 0 && (complexTokenHolders[i - 1].labelType === Classifier.staticWords.filterSelector || complexTokenHolders[i - 1].labelType === Classifier.staticWords.genericSelector)) {
                complexTokenHolders[i].filterValue.column = complexTokenHolders[i - 1].filterValue.column
            }
        }
    }

    // combine same columns (remove all duplicated column tokens)
    for (let i = 0; i < complexTokenHolders.length - 1; i++) {
        if (complexTokenHolders[i].labelType === Classifier.staticWords.column) {
            for (let j = i + 1; j < complexTokenHolders.length; j++) {
                if (complexTokenHolders[j].labelType === Classifier.staticWords.column && complexTokenHolders[j].label === complexTokenHolders[i].label) {
                    //complexTokenHolders[i].filter.filters = complexTokenHolders[i].filter.filters.concat(complexTokenHolders[j].filter.filters);
                    complexTokenHolders.splice(j, 1);
                    break;
                }
            }
        }
    }

    /*
    // include Columns into GroupSelectors
    for (let i = 0; i < complexTokenHolders.length - 1; i++) {
        if (complexTokenHolders[i].labelType === Classifier.staticWords.groupSelector && complexTokenHolders[i + 1].labelType === Classifier.staticWords.column) {
            complexTokenHolders[i].groupColumn = complexTokenHolders[i + 1];
            complexTokenHolders.splice(i + 1, 1)
        }
    }
    */

    return complexTokenHolders
}