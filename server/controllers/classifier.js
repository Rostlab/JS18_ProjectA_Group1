let natural = require('natural');
let config = require('../knexfile');
let knex = require('knex')(config);

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

    extractOperation() {
        let possibleOperations = Classifier.staticWords.plotOperations.concat(Classifier.staticWords.transformOperations).map(op => Classifier.createValueRangeDataType(op, Classifier.col_types.string));
        this.classifyToken(Classifier.staticWords.operation, possibleOperations, false);
    }

    extractColumn() {
        let self = this;
        knex(this.state.dataset).columnInfo().then(function (columnInfo) {
            let columnNames = Object.getOwnPropertyNames(columnInfo).map(col => Classifier.createValueRangeDataType(col, Classifier.col_types.string));
            self.classifyToken(Classifier.staticWords.column, columnNames, true);
        });
    }

    extractColumnValue() {
        let self = this;
        knex(this.state.dataset).columnInfo()
            .then(columnInfo => {
                let columnNames = Object.getOwnPropertyNames(columnInfo);
                //includes is overwritten in the col_type object
                let usedColumns = columnNames.filter(cInfo => Classifier.col_types.includes(columnInfo[cInfo].type));
                return self.getValuesOfColumns(usedColumns, columnInfo);
            })
            .then((colValues) => {
                self.classifyToken(Classifier.staticWords.columnValue, colValues, true);
            });
    }

    /**
     * extracts the column Names from the states dataset
     * @param columnNames
     * @returns {*|PromiseLike<T>|Promise<T>}
     */
    getValuesOfColumnsByName(columnNames) {
        return knex(this.state.dataset).columnInfo()
            .then(columnInfo => {
                self.getValuesOfColumns(columnNames, columnInfo);
            });
    }

    /**
     * extracts the values from the given columnNames from the given columnInfo
     * @param columnNames
     * @param columnInfo
     * @returns {Promise<*>}
     */
    getValuesOfColumns(columnNames, columnInfo) {
        let filteredColumnInfo = {};
        columnNames.forEach(colName => {
            let colObject = columnInfo[colName];
            filteredColumnInfo[colName] = Object.assign(colObject, {name: colName});
        });
        return this.readColumnValues(filteredColumnInfo);
    }

    async readColumnValues(columnInfos) {
        let allColValues = [];
        for (let col of Object.getOwnPropertyNames(columnInfos)) {
            await this.readColumn(columnInfos[col]).then(values => {
                allColValues = allColValues.concat(values);
            });
        }
        return allColValues;
    }

    readColumn(colInfo) {
        return knex.distinct(colInfo.name)
            .select()
            .from(this.state.dataset)
            .then(dbResult => {
                return dbResult.map(r => Classifier.createValueRangeDataType(r[colInfo.name], colInfo.type, colInfo.name));
            });
    }


    static createValueRangeDataType(value, datatype, column) {
        return {
            value: value,
            datatype: datatype,
            column: column
        }
    }


    extractChartType() {
        let possibleTypes = Classifier.staticWords.chartTypes.map(chartType => Classifier.createValueRangeDataType(chartType, Classifier.col_types.string));
        this.classifyToken(Classifier.staticWords.chartType, possibleTypes, true);
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
     * @param type classification category (chartType, column, operation ...)
     * @param valueRange possible values of the category
     * @param lookahead false if no lookahead should be performed
     */
    classifyToken(type, valueRange, lookahead) {
        let tokenHolder = this.state.tokenHolders[this.state.currentToken];
        let performedLookahead = false;
        let tokenMatched = this.getMostLikelyMatch(tokenHolder.token, valueRange);
        if (tokenMatched && tokenMatched.distance < tokenHolder.distance) {
            // this layer matches for this token
            this.state.tokenHolders[this.state.currentToken] = {
                token: tokenMatched.token,
                type: type,
                matchedValue: tokenMatched.type,
                distance: tokenMatched.distance
            };
        } else if (lookahead && this.state.currentToken <= this.state.tokenHolders.length - 2) {
            let nextTokenHolder = this.state.tokenHolders[this.state.currentToken + 1];
            tokenMatched = this.getMostLikelyMatch(tokenHolder.token + " " + nextTokenHolder.token, valueRange);
            if (tokenMatched && tokenMatched.distance < tokenHolder.distance) {
                performedLookahead = true;
                //replace the currentToken
                this.state.tokenHolders[this.state.currentToken] = {
                    token: tokenMatched.token,
                    type: type,
                    matchedValue: tokenMatched.type,
                    distance: tokenMatched.distance
                };
            }
        }
        this.nextAction(performedLookahead);
    }

    /**
     * gets the most likely match for a token out of an array of values
     * @param token token to match
     * @param possibleTypes possible values which it could match
     * @returns {*}
     */
    getMostLikelyMatch(token, possibleTypes) {
        let ratedTypeAffiliation = [];
        possibleTypes.forEach((type) => {
            let value = (type.datatype === Classifier.col_types.date) ? type.value.toString() : type.value;
            let distance = Classifier.getLevenshteinDistance(token, value);
            ratedTypeAffiliation.push({
                "type": type,
                "distance": distance,
                "token": token
            });
        });

        let minDistance = Math.min.apply(Math, ratedTypeAffiliation.map(ratedType => ratedType.distance));

        //console.log("Token: " + token + " Distance: " + mostLikelyMatch.distance + " matched to " + mostLikelyMatch.type)
        return ratedTypeAffiliation.find((ratedType) => ratedType.distance === minDistance);
    }


    static getLevenshteinDistance(token, label) {
        let weight = 5 / (Math.max(1, token.length) / 2);
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