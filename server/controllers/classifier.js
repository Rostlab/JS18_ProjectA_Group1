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
            this.extractColumnValue
        ]
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

    static createUnlabeledTokenInfo(token) {
        let emptyLabelInfo = Classifier.createLabelInfo(null, null, null, null);
        return Classifier.createLabeledTokenInfo(token, Classifier.maxDistance + 1, emptyLabelInfo);
    }


    extractOperation() {
        let possibleOperations = Classifier.staticWords.plotOperations.concat(Classifier.staticWords.transformOperations);
        let operationsWithSynonyms = possibleOperations.map(op => Classifier.createLabelInfo(op, Classifier.staticWords.operation, Classifier.col_types.string));
        this.classifyToken(operationsWithSynonyms, false);
    }

    extractColumn() {
        let self = this;
        knex(this.state.dataset).columnInfo().then(function (columnInfo) {
            let columnNames = Object.getOwnPropertyNames(columnInfo);
            let columnsWithSynonyms = columnNames.map(colName => Classifier.createLabelInfo(colName, Classifier.staticWords.column, Classifier.col_types.string));
            columnSynonyms.forEach(syn => {
                let column = columnsWithSynonyms.find(cS => cS.label === syn.column_name);
                if (column)
                    column.synonyms = syn.synonyms;
            });
            self.classifyToken(columnsWithSynonyms, true);
        });
    }

    extractColumnValue() {
        let self = this;
        knex(this.state.dataset).columnInfo()
            .then(columnInfo => {
                let columnNames = Object.getOwnPropertyNames(columnInfo);
                //includes is overwritten in the col_type object
                let usedColumns = columnNames.filter(cInfo => Classifier.col_types.includes(columnInfo[cInfo].type));
                return Classifier.getValuesOfColumns(usedColumns, columnInfo, self.state.dataset);
            })
            .then((colValues) => {
                self.classifyToken(colValues, true);
            });
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
        this.classifyToken(chartTypesWithSynonyms, true);
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
     * either accept the current classification of a token and move to the next token,
     * or try other layers to find a classification for a token
     * or move to the next token because there are no classification functions left
     * @param lookahead ture if a lookahead was used in the classification
     */
    nextAction(lookahead) {
        if (this.state.tokenHolders[this.state.currentToken].distance <= Classifier.maxDistance) {
            //matched
            if (lookahead) {
                this.state.tokenHolders.splice(this.state.currentToken + 1, 1);
            }
            this.state.currentToken++;
            this.state.layer = 0;
        } else if (this.state.layer >= this.searchFunction.length - 1) {
            //no more clasification function to call
            this.state.currentToken++;
            this.state.layer = 0;
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
     * @param lookahead false if no lookahead should be performed
     */
    classifyToken(labelInfos, lookahead) {
        let tokenHolder = this.state.tokenHolders[this.state.currentToken];
        let performedLookahead = false;
        let labeledTokenInfo = Classifier.getMostLikelyMatch(tokenHolder.token, labelInfos);
        if (labeledTokenInfo && labeledTokenInfo.distance < tokenHolder.distance) {
            // this layer matches for this token
            this.state.tokenHolders[this.state.currentToken] = labeledTokenInfo;
        } else if (lookahead && this.state.currentToken <= this.state.tokenHolders.length - 2) {
            let nextTokenHolder = this.state.tokenHolders[this.state.currentToken + 1];
            labeledTokenInfo = Classifier.getMostLikelyMatch(tokenHolder.token + " " + nextTokenHolder.token, labelInfos);
            if (labeledTokenInfo && labeledTokenInfo.distance < tokenHolder.distance) {
                performedLookahead = true;
                //replace the currentToken
                this.state.tokenHolders[this.state.currentToken] = labeledTokenInfo;
            }
        }
        this.nextAction(performedLookahead);
    }

    /**
     * gets the most likely match for a token out of an array of values
     * @param token token to match
     * @param labelInfos possible values which it could match
     * @returns {*}
     */
    static getMostLikelyMatch(token, labelInfos) {
        let labeledTokenInfos = [];
        labelInfos.forEach(lInfo => {
            let distance;
            if (lInfo.synonyms && lInfo.synonyms.length !== 0) {
                //get best fitting synonym
                let labelVariation = [];
                labelVariation [0] = lInfo.label;
                labelVariation = labelVariation.concat(lInfo.synonyms);
                let bestSynonym = Classifier.getMostLikelyMatch(token, labelVariation.map(lV => Classifier.createLabelInfo(lV, lInfo.labelType, lInfo.datatype, lInfo.column)));
                distance = bestSynonym.distance;
            } else {
                let value = (lInfo.datatype === Classifier.col_types.date) ? lInfo.label.toString() : lInfo.label;
                distance = Classifier.getLevenshteinDistance(token, value);
            }
            labeledTokenInfos.push(Classifier.createLabeledTokenInfo(token, distance, lInfo));
        });

        let minDistance = Math.min.apply(Math, labeledTokenInfos.map(labeledToken => labeledToken.distance));

        //console.log("Token: " + token + " Distance: " + mostLikelyMatch.distance + " matched to " + mostLikelyMatch.type)
        return labeledTokenInfos.find(labeledToken => labeledToken.distance === minDistance);
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
    column: "Column",
    operation: "Operation",
    chartType: "ChartType",
    plotOperations: ["plot", "make", "draw", "select"],
    transformOperations: [],
    chartTypes: ["histogram", "pie chart", "line chart", "bar chart", "scatter plot"],
    columnValue: "ColumnValue"
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