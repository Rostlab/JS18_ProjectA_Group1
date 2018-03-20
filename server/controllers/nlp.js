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
            input: req.body.input,
            tokenHolders: tokenHolders,
            layer: 0,
            currentToken: 0,
            dataset: dataset
        };

        let c = new Classifier(initState, state => findDataTransformationFunction(state, matchedFunction => {
            if(!matchedFunction.isTransformation) {
                history = []
            }
            history.push({
                function: matchedFunction.function,
                functionParameters: matchedFunction.functionParameters,
                input: matchedFunction.input
            });

            executeFunctions(history, dataset).then(data => {
                res.send({plotly: data, history: history});
            })
        }));
        c.findCommand();
    })
};

async function executeFunctions(history, dataset) {
    let currentData = {};
    for (let currentFunction of history) {
        await new Promise(resolve => {
            plot_functions[currentFunction.function](dataset, currentFunction.functionParameters, currentFunction.input, currentData, (data, layout) => {
                currentData = {data: data, layout: layout};
                resolve()
            })
        });
    }
    return currentData
}

/**
 * Query the needed data and transform them i nto the dataformat for plotly.js
 * @param state containing the classified input
 * @param res response object
 */
function findDataTransformationFunction(state, callback) {
    let numberMatches;
    let numberColumns;
    let columnsArray;
    let dataset = state.dataset;
    let bestMatched = {
        input: state.input,
        numberMatches: 0,
        function: "",
        functionParameters: [],
        // TODO
        isTransformation: false
    };
    _.forEach(commands, function (command) {
        numberMatches = 0;
        numberColumns = 0;
        columnsArray = [];
        _.forEach(state.tokenHolders, function (tokenHolder) {
            if (tokenHolder.type === Classifier.staticWords.column) {
                numberColumns++;
                columnsArray.push(tokenHolder.matchedValue);
            } else if (tokenHolder.type === Classifier.staticWords.chartType) {
                if (tokenHolder.matchedValue === command.parameters.chartType) {
                    numberMatches++;
                }
            }
        });
        // TODO find a better metric for not matching
        if (numberColumns === command.parameters.numberColumns && numberMatches > bestMatched.numberMatches) {
            bestMatched.numberMatches = numberMatches;
            bestMatched.function = command.function;
            bestMatched.functionParameters = [];
            _.forEach(command.functionParameters, (param, index) => {
                if (param === Classifier.staticWords.column) {
                    bestMatched.functionParameters.push(columnsArray[index]);
                }
            });
        }
    });

    if(bestMatched.function === "") {
        bestMatched.function = "transformData";
        bestMatched.isTransformation = true;
    }
    callback(bestMatched)
}