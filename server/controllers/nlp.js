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
exports.classifyTokens = function (req, res) {
    let input = req.body.input;
    let dataset = req.body.dataset;

    let data = nlp(input);
    data.values().toNumber();
    let tokenHolders = data.terms().data().map(item => Classifier.createUnlabeledTokenInfo(item.normal, item.bestTag));

    let initState = {
        input: input,
        tokenHolders: tokenHolders,
        layer: 0,
        currentToken: 0,
        dataset: dataset
    };

    new Classifier(initState, state => {
        combineComplexTokens(state);
        res.send(state.tokenHolders.map(simplifyTokenHolder))
    });
};

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

        let data = nlp(input);
        data.values().toNumber();
        let tokenHolders = data.terms().data().map(item => Classifier.createUnlabeledTokenInfo(item.normal, item.bestTag));

        let initState = {
            input: input,
            tokenHolders: tokenHolders,
            layer: 0,
            currentToken: 0,
            dataset: dataset
        };

        new Classifier(initState, state => findDataTransformationFunction(state, matchedCommand => {
            if (history === undefined || !matchedCommand.command.parameters.isTransformation) {
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
 * takes a tokenHolder and extracts (recursively) all information that is needed after classification
 */
function simplifyTokenHolder(tokenHolder) {
    let data = {
        "token": tokenHolder.token,
        "label": tokenHolder.label,
        "labelType": tokenHolder.labelType
    };
    if (tokenHolder.hasOwnProperty("filter")) {
        data.filter = tokenHolder.filter//simplifyTokenHolder(tokenHolder.filter)
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
 * @param state containing the classified input
 * @param callback: a function that takes the found command and the connected parameters as a object
 * @param errorCallback: a function that is only called then a error occurred. It takes the error message as a parameter.
 */
function findDataTransformationFunction(state, callback, errorCallback) {
    let operation = null;
    let chartType = null;
    let columnsArray = [];

    combineComplexTokens(state);

    state.tokenHolders.forEach(tokenHolder => {
        if (tokenHolder.labelType === Classifier.staticWords.operation) {
            operation = tokenHolder.label
        } else if (tokenHolder.labelType === Classifier.staticWords.chartType) {
            chartType = tokenHolder.label
        } else if (tokenHolder.labelType === Classifier.staticWords.column) {
            columnsArray.push(simplifyTokenHolder(tokenHolder));
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


/**
 * takes the list of (simplified) tokenHolders from the state, combines them by predefined rules to filters and groupings and puts the new structure back into the state
 * @param state
 */
function combineComplexTokens(state) {
    // from unclassified tokens
    state.tokenHolders = state.tokenHolders.filter(tokenHolder => tokenHolder.label != null || tokenHolder.labelType === Classifier.staticWords.value);
    state.tokenHolders.filter(tokenHolder => tokenHolder.labelType === Classifier.staticWords.column).forEach(column => column.filter = {
        type: "AND",
        filters: []
    });

    // include ColumnValues/Values into FilterSelectors
    for (let i = 0; i < state.tokenHolders.length - 1; i++) {
        if ((state.tokenHolders[i].labelType === Classifier.staticWords.filterSelector
            && (state.tokenHolders[i + 1].labelType === Classifier.staticWords.value || state.tokenHolders[i + 1].labelType === Classifier.staticWords.columnValue))
            || (state.tokenHolders[i].labelType === Classifier.staticWords.genericSelector && state.tokenHolders[i + 1].labelType === Classifier.staticWords.columnValue)) {
            state.tokenHolders[i].filterValue = state.tokenHolders[i + 1];
            state.tokenHolders.splice(i + 1, 1)
        }
    }

    // include FilterSelectors into Columns based on column in columnValue
    for (let i = 0; i < state.tokenHolders.length - 1; i++) {
        if (state.tokenHolders[i].labelType === Classifier.staticWords.column) {
            for (let j = i + 1; j < state.tokenHolders.length; j++) {
                if (state.tokenHolders[j].labelType === Classifier.staticWords.filterSelector
                    && state.tokenHolders[j].filterValue.labelType === Classifier.staticWords.columnValue
                    && state.tokenHolders[j].filterValue.column === state.tokenHolders[i].label) {
                    state.tokenHolders[i].filter.filters.push(state.tokenHolders[j]);
                    state.tokenHolders.splice(j, 1);
                    break;
                }
            }
        }
    }

    // include FilterSelectors into Columns based on location
    for (let i = 0; i < state.tokenHolders.length - 1; i++) {
        while (i < state.tokenHolders.length - 1
        && state.tokenHolders[i].labelType === Classifier.staticWords.column
        && state.tokenHolders[i + 1].labelType === Classifier.staticWords.filterSelector
        && state.tokenHolders[i + 1].filterValue !== undefined) {
            state.tokenHolders[i].filter.filters.push(state.tokenHolders[i + 1]);
            state.tokenHolders.splice(i + 1, 1)
        }
    }

    // combine same columns
    for (let i = 0; i < state.tokenHolders.length - 1; i++) {
        if (state.tokenHolders[i].labelType === Classifier.staticWords.column) {
            for (let j = i + 1; j < state.tokenHolders.length; j++) {
                if (state.tokenHolders[j].labelType === Classifier.staticWords.column && state.tokenHolders[j].label === state.tokenHolders[i].label) {
                    state.tokenHolders[i].filter.filters = state.tokenHolders[i].filter.filters.concat(state.tokenHolders[j].filter.filters);
                    state.tokenHolders.splice(j, 1);
                    break;
                }
            }
        }
    }

    /*
    // include Columns into GroupSelectors
    for (let i = 0; i < state.tokenHolders.length - 1; i++) {
        if (state.tokenHolders[i].labelType === Classifier.staticWords.groupSelector && state.tokenHolders[i + 1].labelType === Classifier.staticWords.column) {
            state.tokenHolders[i].groupColumn = state.tokenHolders[i + 1];
            state.tokenHolders.splice(i + 1, 1)
        }
    }
    */
}