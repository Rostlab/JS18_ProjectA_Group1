let natural = require('natural');
let config = require('../knexfile');
let knex = require('knex')(config);
let columnSynonyms = require('../data/column_synonyms');

class Classifier {

    constructor(state, callback) {
        this.state = state;
        this.callback = callback;
        this.searchFunction = [
            this.extractOperation,
            this.extractChartType,
            this.extractColumn,
            this.extractColumnValue,
            this.extractGroupSelectors,
            this.extractFilterSelectors,
            this.extractGenericSelectors,
        ];

        this.findCommand()
    }

    static createLabelInfo(label, labelType, datatype, column) {
        return {
            label: label,
            labelType: labelType,
            synonyms: [],
            datatype: datatype,
            column: column
        };
    }

    static createLabeledTokenInfo(token, distance, labelInfo) {
        let lTokenInfo = {
            token: token,
            distance: distance
        };
        return Object.assign(lTokenInfo, labelInfo);
    }

    static createUnlabeledTokenInfo(token, tokenType) {
        let emptyLabelInfo = Classifier.createLabelInfo(null, tokenType, null, null);
        return Classifier.createLabeledTokenInfo(token, Classifier.maxDistance + 1, emptyLabelInfo);
    }

    extractOperation() {
        let possibleOperations = Classifier.staticWords.plotOperations.concat(Classifier.staticWords.transformOperations);
        let operationsWithSynonyms = possibleOperations.map(op => Classifier.createLabelInfo(op, Classifier.staticWords.operation, Classifier.col_types.string));
        this.classifyToken(operationsWithSynonyms);
    }

    extractGenericSelectors() {
        this.classifyToken(Classifier.staticWords.genericSelectors.map(selector => Classifier.createLabelInfo(selector, Classifier.staticWords.genericSelector, Classifier.col_types.string)));
    }

    extractGroupSelectors() {
        this.classifyToken(Classifier.staticWords.groupSelectors.map(selector => Classifier.createLabelInfo(selector, Classifier.staticWords.groupSelector, Classifier.col_types.string)));
    }

    extractFilterSelectors() {
        this.classifyToken(Object.keys(Classifier.staticWords.filterSelectors).map(selector => Classifier.createLabelInfo(selector, Classifier.staticWords.filterSelector, Classifier.col_types.string)));
    }

    extractColumn() {
        let self = this;
        // skip if there is already a good match
        if (this.state.tokenHolders[this.state.currentToken].label !== null && this.state.tokenHolders[this.state.currentToken].distance === 0) {
            this.nextAction()
        } else {
            knex(this.state.dataset).columnInfo().then(function (columnInfo) {
                let columnNames = Object.getOwnPropertyNames(columnInfo);
                let columnsWithSynonyms = columnNames.map(colName => Classifier.createLabelInfo(colName, Classifier.staticWords.column, Classifier.col_types.string));
                columnSynonyms.forEach(syn => {
                    let column = columnsWithSynonyms.find(cS => cS.label === syn.column_name);
                    if (column)
                        column.synonyms = syn.synonyms;
                });
                self.classifyToken(columnsWithSynonyms);
            });
        }
    }

    extractColumnValue() {
        let self = this;
        // skip if there is already a good match
        if (this.state.tokenHolders[this.state.currentToken].label !== null && this.state.tokenHolders[this.state.currentToken].distance === 0) {
            this.nextAction()
        } else {
            knex(this.state.dataset).columnInfo()
                .then(columnInfo => {
                    let columnNames = Object.getOwnPropertyNames(columnInfo);
                    //includes is overwritten in the col_type object
                    let usedColumns = columnNames.filter(cInfo => Classifier.col_types.includes(columnInfo[cInfo].type));
                    return Classifier.getValuesOfColumns(usedColumns, columnInfo, self.state.dataset);
                })
                .then((colValues) => {
                    self.classifyToken(colValues);
                });
        }
    }

    /**
     * Get specified columns of the specified dataset
     * @param columnNames
     * @param dataset
     * @returns {*|PromiseLike<T>|Promise<T>}
     */
    static getValuesOfColumnsByName(columnNames, dataset) {
        return knex(dataset).columnInfo()
            .then(columnInfo => {
                return Classifier.getValuesOfColumns(columnNames, columnInfo, dataset);
            });
    }

    /**
     * extracts the values from the given columnNames from the given columnInfo
     * @param columnNames
     * @param columnInfo
     * @param dataset
     * @returns {Promise<*>}
     */
    static getValuesOfColumns(columnNames, columnInfo, dataset) {
        let filteredColumnInfo = {};
        columnNames.forEach(colName => {
            let colObject = columnInfo[colName];
            filteredColumnInfo[colName] = Object.assign(colObject, {name: colName});
        });
        return Classifier.readColumnValues(filteredColumnInfo, dataset);
    }

    static async readColumnValues(columnInfos, dataset) {
        let allColValues = [];
        for (let col of Object.getOwnPropertyNames(columnInfos)) {
            await Classifier.readColumn(columnInfos[col], dataset).then(values => {
                allColValues = allColValues.concat(values);
            });
        }
        return allColValues;
    }

    static readColumn(colInfo, dataset) {
        return knex.distinct(colInfo.name)
            .select()
            .from(dataset)
            .then(dbResult => {
                return dbResult.map(r => Classifier.createLabelInfo(r[colInfo.name], Classifier.staticWords.columnValue, colInfo.type, colInfo.name));
            });
    }


    extractChartType() {
        let possibleTypes = Classifier.staticWords.chartTypes;
        let chartTypesWithSynonyms = possibleTypes.map(chartType =>
            Classifier.createLabelInfo(chartType, Classifier.staticWords.chartType, Classifier.col_types.string));
        this.classifyToken(chartTypesWithSynonyms);
    }

    findCommand() {
        if (this.state.currentToken < this.state.tokenHolders.length && this.state.layer < this.searchFunction.length) {
            this.searchFunction[this.state.layer].bind(this)();
        } else {
            this.callback(this.state);
        }
    }

    /**
     * decides upon the next action,
     * try other layers to find a classification for a token
     * or move to the next token because there are no classification functions left
     */
    nextAction() {
        if (this.state.layer >= this.searchFunction.length - 1) {
            let token = this.state.tokenHolders[this.state.currentToken];

            //no more classification function to call
            this.state.currentToken++;
            this.state.layer = 0;

            // remove next tokens according to lookahead
            if (token.label != null) {
                this.state.tokenHolders.splice(this.state.currentToken, token.label.split(' ').length - 1);
            }
        }
        else {
            //call next classification function
            this.state.layer++;
        }
        this.findCommand(this.state);
    }

    /**
     * classifies a token with levenshtein distance
     * @param labelInfos possible values of the category
     */
    classifyToken(labelInfos) {
        let tokenHolder = this.state.tokenHolders[this.state.currentToken];
        let labeledTokenInfo = this.getMostLikelyMatch(labelInfos);
        if (labeledTokenInfo && labeledTokenInfo.distance <= tokenHolder.distance && (tokenHolder.label == null || labeledTokenInfo.label.length >= tokenHolder.label.length)) {
            // this layer matches for this token
            this.state.tokenHolders[this.state.currentToken] = labeledTokenInfo;

        }
        this.nextAction();
    }

    /**
     * gets the most likely match for a token out of an array of values
     * @param labelInfos possible values which it could match
     * @returns {*}
     */
    getMostLikelyMatch(labelInfos) {
        let labeledTokenInfos = [];
        labelInfos.forEach(lInfo => {
            if (lInfo.synonyms && lInfo.synonyms.length !== 0) {
                //get best fitting synonym
                let labelVariation = [];
                labelVariation [0] = [lInfo.label, lInfo.token];
                labelVariation = labelVariation.concat(lInfo.synonyms);
                let bestSynonym = this.getMostLikelyMatch(labelVariation.map(lV => Classifier.createLabelInfo(lV, lInfo.labelType, lInfo.datatype, lInfo.column)));
                labeledTokenInfos.push(Classifier.createLabeledTokenInfo(this.state.tokenHolders[this.state.currentToken].token, bestSynonym.distance, lInfo));
            } else {
                let value = (lInfo.datatype === Classifier.col_types.date) ? lInfo.label.toString() : lInfo.label;
                if (value instanceof Array && value.length > 0) {
                    value = value[0]
                }
                let wordCount = value.split(' ').length;
                if (this.state.tokenHolders.length >= this.state.currentToken + wordCount) {
                    let token = "";
                    for (let i = this.state.currentToken; i <= this.state.currentToken + wordCount - 1; i++) {
                        token += this.state.tokenHolders[i].token + " ";
                    }
                    token = token.trim();

                    let distance = Classifier.getLevenshteinDistance(token, value);
                    labeledTokenInfos.push(Classifier.createLabeledTokenInfo(token, distance, lInfo));
                }
            }
        });

        let minDistance = Math.min.apply(Math, labeledTokenInfos.map(labeledToken => labeledToken.distance));
        let tokensWithMinDistance = labeledTokenInfos.filter(labeledToken => labeledToken.distance === minDistance);

        //console.log("Token: " + token + " Distance: " + mostLikelyMatch.distance + " matched to " + mostLikelyMatch.type)
        return tokensWithMinDistance.sort((a, b) => b.token.length - a.token.length)[0]
    }


    static getLevenshteinDistance(token, label) {
        let weight = 11.25 / Math.max(1, token.length);
        return natural.LevenshteinDistance(token, label, {
            insertion_cost: 2 * weight,
            deletion_cost: 2 * weight,
            substitution_cost: weight
        });
    }
}

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
        "equal to": "=",
        "is equal to": "=",
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