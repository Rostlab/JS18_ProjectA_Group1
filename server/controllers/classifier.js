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
            this.extractColumn
        ]
    }

    createLabelSynonymStructure(possibleTypes) {
        return possibleTypes.map(type => {
                return {
                    label: type,
                    synonyms: []
                }
            }
        );
    }

    extractOperation() {
        let possibleOperations = Classifier.staticWords.plotOperations.concat(Classifier.staticWords.transformOperations);
        let operationsWithSynonyms = this.createLabelSynonymStructure(possibleOperations);
        this.classifyToken(Classifier.staticWords.operation, operationsWithSynonyms, false);
    }

    extractColumn() {
        let self = this;
        knex(this.state.dataset).columnInfo().then(function (columnInfo) {
            let columnNames = Object.getOwnPropertyNames(columnInfo);
            let columnsWithSynonyms = self.createLabelSynonymStructure(columnNames);
            columnSynonyms.forEach(syn => {
                let column = columnsWithSynonyms.find(cS => cS.label == syn.column_name);
                column.synonyms = syn.synonyms;
            });
            self.classifyToken(Classifier.staticWords.column, columnsWithSynonyms, true);
        });
    }

    extractChartType() {
        let possibleTypes = Classifier.staticWords.chartTypes;
        let chartTypesWithSynonyms = this.createLabelSynonymStructure(possibleTypes);
        this.classifyToken(Classifier.staticWords.chartType, chartTypesWithSynonyms, true);
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
        possibleTypes.forEach(type => {
            let distance;
            if (type.synonyms && type.synonyms.length != 0) {
                //get best fitting synonym
                let labelVariation = [];
                labelVariation [0] = type.label;
                labelVariation = labelVariation.concat(type.synonyms);
                let bestSynonym = Classifier.getMostLikelyMatch(token, this.createLabelSynonymStructure(labelVariation));
                distance = bestSynonym.distance;
            } else {
                distance = Classifier.getLevenshteinDistance(token, type.label);
            }
            ratedTypeAffiliation.push({
                "type": type.label,
                "distance": distance,
                "token": token
            });
        });

        let minDistance = Math.min.apply(Math, ratedTypeAffiliation.map(ratedType => ratedType.distance));

        //console.log("Token: " + token + " Distance: " + mostLikelyMatch.distance + " matched to " + mostLikelyMatch.type)
        return ratedTypeAffiliation.find((ratedType) => ratedType.distance === minDistance);
    }


    static getLevenshteinDistance(token, label) {
        let weight = 5 / (token.length / 2);
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
    chartTypes: ["histogram", "pie chart", "line chart", "bar chart", "scatter plot"]
};

Classifier.maxDistance = 5;

module.exports = Classifier;