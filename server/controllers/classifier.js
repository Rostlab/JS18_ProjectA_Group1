let levenshtein = require('../librarys/levenshtein_distance');
let config = require('../knexfile');
let knex = require('knex')(config);
let columnSynonyms = require('../data/column_synonyms');

class Classifier {
}

/**
 * Get specified columns of the specified dataset
 * @param columnNames
 * @param dataset
 * @returns {*|PromiseLike<T>|Promise<T>}
 */
Classifier.getValuesOfColumnsByName = async function (columnNames, dataset) {
    let columnInfo = await knex(dataset).columnInfo();
    return await getValuesOfColumns(columnNames, columnInfo, dataset);
};

/**
 * takes tokens and classifies them
 * @param tokens: the tokens to classify
 * @param dataset: the dataset to operate on
 * @returns {Promise<{tokenHolders: *, dataset: *}>}
 */
Classifier.classifyTokens = async function (tokens, dataset) {
    let state = {
        tokenHolders: tokens.map(item => createUnlabeledTokenInfo(item.normal, item.bestTag)),
        currentToken: 0,
        dataset: dataset
    };

    for (let i = 0; i < state.tokenHolders.length; i++) {
        state.currentToken = i;
        for (let searchFunction of Classifier.searchFunctions) {
            await searchFunction(state)
        }
        // remove next tokens according to lookahead
        if (state.tokenHolders[i].label != null) {
            state.tokenHolders.splice(i + 1, state.tokenHolders[i].token.split(' ').length - 1);
        }
    }
    return state.tokenHolders;
};

function createLabelInfo(label, labelType, datatype, column) {
    return {
        label: label,
        labelType: labelType,
        synonyms: [],
        datatype: datatype,
        column: column
    };
}

function createLabeledTokenInfo(token, distance, labelInfo) {
    let lTokenInfo = {
        token: token,
        distance: distance
    };
    return Object.assign(lTokenInfo, labelInfo);
}

function createUnlabeledTokenInfo(token, tokenType) {
    let emptyLabelInfo = createLabelInfo(null, tokenType, null, null);
    return createLabeledTokenInfo(token, Classifier.maxDistance + 1, emptyLabelInfo);
}

// ------------- extract functions -------------

function extractOperation(state) {
    let possibleOperations = Classifier.staticWords.plotOperations.concat(Classifier.staticWords.transformOperations);
    let operationsWithSynonyms = possibleOperations.map(op => createLabelInfo(op, Classifier.staticWords.operation, Classifier.col_types.string));
    classifyToken(state, operationsWithSynonyms);
}

function extractGenericSelectors(state) {
    classifyToken(state, Classifier.staticWords.genericSelectors.map(selector => createLabelInfo(selector, Classifier.staticWords.genericSelector, Classifier.col_types.string)));
}

function extractGroupSelectors(state) {
    classifyToken(state, Classifier.staticWords.groupSelectors.map(selector => createLabelInfo(selector, Classifier.staticWords.groupSelector, Classifier.col_types.string)));
}

function extractFilterSelectors(state) {
    classifyToken(state, Object.keys(Classifier.staticWords.filterSelectors).map(selector => createLabelInfo(selector, Classifier.staticWords.filterSelector, Classifier.col_types.string)));
}

async function extractColumn(state) {
    // skip if there is already a good match
    let token = state.tokenHolders[state.currentToken];
    if (token.label === null || token.distance !== 0) {
        let columnInfo = await knex(state.dataset).columnInfo();
        let columnNames = Object.getOwnPropertyNames(columnInfo);
        let columnsWithSynonyms = columnNames.map(colName => createLabelInfo(colName, Classifier.staticWords.column, Classifier.col_types.string));
        columnSynonyms.forEach(syn => {
            let column = columnsWithSynonyms.find(cS => cS.label === syn.column_name);
            if (column) column.synonyms = syn.synonyms;
        });
        classifyToken(state, columnsWithSynonyms);
    }
}

async function extractColumnValue(state) {
    // skip if there is already a good match
    let token = state.tokenHolders[state.currentToken];
    if (token.label === null || token.distance !== 0) {
        let columnInfo = await knex(state.dataset).columnInfo();
        let columnNames = Object.getOwnPropertyNames(columnInfo);
        //includes is overwritten in the col_type object
        let usedColumns = columnNames.filter(cInfo => Classifier.col_types.includes(columnInfo[cInfo].type));
        let colValues = await getValuesOfColumns(usedColumns, columnInfo, state.dataset);
        classifyToken(state, colValues);
    }
}

async function extractChartType(state) {
    let possibleTypes = Classifier.staticWords.chartTypes;
    let chartTypesWithSynonyms = possibleTypes.map(chartType => createLabelInfo(chartType, Classifier.staticWords.chartType, Classifier.col_types.string));
    classifyToken(state, chartTypesWithSynonyms);
}

// ------------- db interaction functions -------------

/**
 * extracts the values from the given columnNames from the given columnInfo
 * @param columnNames
 * @param columnInfo
 * @param dataset
 * @returns {Promise<*>}
 */
function getValuesOfColumns(columnNames, columnInfo, dataset) {
    let filteredColumnInfo = {};
    columnNames.forEach(colName => {
        let colObject = columnInfo[colName];
        filteredColumnInfo[colName] = Object.assign(colObject, {name: colName});
    });
    return readColumnValues(filteredColumnInfo, dataset);
}

async function readColumnValues(columnInfos, dataset) {
    let allColValues = [];
    for (let col of Object.getOwnPropertyNames(columnInfos)) {
        await readColumn(columnInfos[col], dataset).then(values => {
            allColValues = allColValues.concat(values);
        });
    }
    return allColValues;
}

async function readColumn(colInfo, dataset) {
    let dbResult = await knex.distinct(colInfo.name).select().from(dataset);
    return dbResult.map(r => createLabelInfo(r[colInfo.name], Classifier.staticWords.columnValue, colInfo.type, colInfo.name))
}

// ------------- classifying functions -------------

/**
 * classifies a token with levenshtein distance
 * @param state: the state to operate on
 * @param labelInfos: possible values of the category
 */
function classifyToken(state, labelInfos) {
    let tokenHolder = state.tokenHolders[state.currentToken];
    let labeledTokenInfo = getMostLikelyMatch(state, labelInfos);
    if (labeledTokenInfo && labeledTokenInfo.distance <= tokenHolder.distance && (tokenHolder.label == null || labeledTokenInfo.label.length >= tokenHolder.label.length)) {
        // this layer matches for this token
        tokenHolder = labeledTokenInfo;
    }
    state.tokenHolders[state.currentToken] = tokenHolder
}

/**
 * gets the most likely match for a token out of an array of values
 * if there are more tokens with the same minimal distance the longest token is selected
 * @param state: the state to operate on
 * @param labelInfos possible values which it could match
 * @returns {*}
 */
function getMostLikelyMatch(state, labelInfos) {
    let labeledTokenInfos = [];
    labelInfos.forEach(lInfo => {
        if (lInfo.synonyms && lInfo.synonyms.length !== 0) {
            //get best fitting synonym
            let labelVariation = [];
            labelVariation [0] = [lInfo.label, lInfo.token];
            labelVariation = labelVariation.concat(lInfo.synonyms);
            let bestSynonym = getMostLikelyMatch(state, labelVariation.map(lV => createLabelInfo(lV, lInfo.labelType, lInfo.datatype, lInfo.column)));
            labeledTokenInfos.push(createLabeledTokenInfo(bestSynonym.token, bestSynonym.distance, lInfo));
        } else {
            let value = (lInfo.datatype === Classifier.col_types.date) ? lInfo.label.toString() : lInfo.label;
            if (value instanceof Array && value.length > 0) {
                value = value[0]
            }
            let wordCount = value.split(' ').length;
            if (state.currentToken <= state.tokenHolders.length - wordCount) {
                let token = "";
                for (let i = 0; i < wordCount; i++) {
                    token += state.tokenHolders[state.currentToken + i].token + " ";
                }
                token = token.trim();

                let distance = getLevenshteinDistance(token, value);
                labeledTokenInfos.push(createLabeledTokenInfo(token, distance, lInfo));
            }
        }
    });

    let minDistance = Math.min.apply(Math, labeledTokenInfos.map(labeledToken => labeledToken.distance));
    let tokensWithMinDistance = labeledTokenInfos.filter(labeledToken => labeledToken.distance === minDistance);
    return tokensWithMinDistance.sort((a, b) => b.token.length - a.token.length)[0] // longest token with min distance
}


function getLevenshteinDistance(token, label) {
    let weight = 11.25 / Math.max(1, token.length);
    return levenshtein.LevenshteinDistance(token, label, {
        insertion_cost: 2 * weight,
        deletion_cost: 2 * weight,
        substitution_cost: weight
    });
}

Classifier.searchFunctions = [
    extractOperation,
    extractChartType,
    extractColumn,
    extractColumnValue,
    extractGroupSelectors,
    extractFilterSelectors,
    extractGenericSelectors,
];

Classifier.staticWords = {
    // Token Types
    column: "Column",
    operation: "Operation",
    chartType: "ChartType",
    columnValue: "ColumnValue",
    concatenation: "Concatenation",
    genericSelector: "GenericSelector",
    groupSelector: "GroupSelector",
    filterSelector: "FilterSelector",
    value: "Value",

    // Token Type Selectors
    plotOperations: ["plot", "make", "draw", "select"],
    transformOperations: [],
    chartTypes: ["histogram", "pie chart", "line chart", "bar chart", "scatter plot"],
    concatenations: ["and", "or"],
    genericSelectors: ["for", "for all", "of", "of all"],
    groupSelectors: ["for every", "for each", "each"],
    filterSelectors: {
        "is": "=",
        "is not": "!=",
        "equal to": "=",
        "is equal to": "=",
        "is not equal to": "!=",
        "bigger than": ">",
        "is bigger than": ">",
        "greater than": ">",
        "is greater than": ">",
        "smaller than": "<",
        "is smaller than": "<",
        "less than": "<",
        "is less than": "<"
    }
};

Classifier.col_types = {
    string: "character varying",
    date: "date",
    includes: function (value) {
        return value === this.string || value === this.date;
    }
};

Classifier.maxDistance = 5;

module.exports = Classifier;
