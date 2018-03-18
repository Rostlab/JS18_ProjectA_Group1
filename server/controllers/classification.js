let natural = require('natural');
let config = require('../knexfile');
let knex = require('knex')(config);

let classification = {};

classification.maxDistance = 5;

classification.staticWords = {
    column: "Column",
    operation: "Operation",
    chartType: "ChartType"
};

classification.extractOperation = function (state, callback) {
    let possibleOperations = ["plot", "make", "draw", "select"];
    classifyToken(state, classification.staticWords.operation, possibleOperations, false, callback);
};

classification.extractColumn = function extractColumn(state, callback) {
    knex(state.dataset).columnInfo().then(function (columnInfo) {

        let columnNames = Object.getOwnPropertyNames(columnInfo);
        classifyToken(state, classification.staticWords.column, columnNames, true, callback);
    });
}

classification.extractChartType = function extractChartType(state, callback) {
    let possibleTypes = ["histogram", "pie chart", "line chart", "bar chart", "scatter plot"];
    classifyToken(state, classification.staticWords.chartType, possibleTypes, true, callback);
}

/**
 * classifies a token with levenshtein distance
 * @param state current state
 * @param type classification category (chartType, column, operation ...)
 * @param valueRange possible values of the category
 * @param lookahead false if no lookahead should be performed
 */
classifyToken = function classifyToken(state, type, valueRange, lookahead, callback) {
    let tokenHolder = state.tokenHolders[state.currentToken];
    let performedLookahead = false;
    let tokenMatched = getMostLikelyMatch(tokenHolder.token, valueRange);
    if (tokenMatched && tokenMatched.distance < tokenHolder.distance) {
        // this layer matches for this token
        state.tokenHolders[state.currentToken] = {
            token: tokenMatched.token,
            type: type,
            matchedValue: tokenMatched.type,
            distance: tokenMatched.distance
        };
    } else if (lookahead && state.currentToken <= state.tokenHolders.length - 2) {
        let nextTokenHolder = state.tokenHolders[state.currentToken + 1];
        tokenMatched = getMostLikelyMatch(tokenHolder.token + " " + nextTokenHolder.token, valueRange);
        if (tokenMatched && tokenMatched.distance < tokenHolder.distance) {
            performedLookahead = true;
            //replace the currentToken
            state.tokenHolders[state.currentToken] = {
                token: tokenMatched.token,
                type: type,
                matchedValue: tokenMatched.type,
                distance: tokenMatched.distance
            };
        }
    }
    callback(state, performedLookahead);
}

/**
 * gets the most likely match for a token out of an array of values
 * @param token token to match
 * @param possibleTypes possible values which it could match
 * @returns {*}
 */
function getMostLikelyMatch(token, possibleTypes) {
    let ratedTypeAffiliation = [];
    possibleTypes.forEach((type) => {
        let distance = getLevenshteinDistance(token, type)
        ratedTypeAffiliation.push({
            "type": type,
            "distance": distance,
            "token": token
        });
    })

    let minDistance = Math.min.apply(Math, ratedTypeAffiliation.map(ratedType => {
        return ratedType.distance;
    }));

    let mostLikelyMatch = ratedTypeAffiliation.find((ratedType) => ratedType.distance == minDistance);
    //console.log("Token: " + token + " Distance: " + mostLikelyMatch.distance + " matched to " + mostLikelyMatch.type)
    return mostLikelyMatch;
}


function getLevenshteinDistance(token, label) {
    let weight = 5 / (token.length / 2);
    let distance = natural.LevenshteinDistance(token, label, {
        insertion_cost: 2 * weight,
        deletion_cost: 2 * weight,
        substitution_cost: weight
    });
    return distance;
}

module.exports = classification;