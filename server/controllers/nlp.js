let bookshelf = require('../config/bookshelf');
let commands = require('../data/commands.json');
let natural = require('natural');
var config = require('../knexfile');
var knex = require('knex')(config);
var _ = require('lodash');

function getDatasets() {
    return bookshelf.Model.extend({tableName: 'generic_dataset'}).fetchAll()
}

let functions = {
    plotHistogramOfColumn: function (dataset, parameters, callback) {
        let column = parameters[0];

        // SELECT <column> FROM <dataset>
        bookshelf.Model.extend({tableName: dataset}).fetchAll({columns: [column]}).then(data => callback(
            [{
                // map [{<columnName>: <columnValue>}, ...] to [<columnValue>, ...]
                x: data.map((value) => value.attributes[column]),
                type: 'histogram'
            }]
        ))
    }
};




var tokenTypes = [{type: "operation", values: ["",""], function: extractOperation},{type: "Column", function: extractColumn}
, {type: "Connector", values: ["of", "with"], function: extractConnector}
, {type: "ChartType", values: ["Histogram", "Pie Chart"], function: extractChartType}];


function extractOperation(state){
        if(state.tokens[state.currentToken].matches()) {
            // this layer matches for this token
            state.currentToken++;
            state.layer = 0;
            findCommand(state);
        } else {
            // this layer does not match
            state.layer++;
            findCommand(state);
        }
}

function extractColumn(state){
    knex('human_resources__core_dataset').columnInfo().then(function(columnInfo) {
        var currentToken = state.tokens[state.currentToken]
        var result = _.find(columnInfo, function(o, i){
            return i === currentToken;
        });

        if(result) {
            // this layer matches for this token
            state.tokens[state.currentToken] = {type: "Column", value: currentToken}
            state.currentToken++;
            state.layer = 0;
            findCommand(state);
        } else {
            // this layer does not match
            if(state.layer < searchFunction.length-1){
                state.layer++;
            } else {
                state.layer = 0
                state.currentToken++
            }
            findCommand(state);
        }
    });
}

function extractChartType(state){
    var currentToken = state.tokens[state.currentToken]
    let possibleTypes = ["Histogram"];

    var result = _.find(possibleTypes, function(o){
        return o === currentToken;
    });

    if(result) {
        // this layer matches for this token
        state.tokens[state.currentToken] = {type: "ChartType", value: currentToken}
        state.currentToken++;
        state.layer = 0;
        findCommand(state);
    } else {
        // this layer does not match
        if(state.layer < searchFunction.length-1){
            state.layer++;
        } else {
            state.layer = 0
            state.currentToken++
        }
        findCommand(state);
    }


}

function extractConnector(state){

}

let searchFunction = [
    extractColumn,
    extractChartType
];


function findCommand(state) {
    if(state.currentToken < state.tokens.length && state.layer < searchFunction.length) {
        searchFunction[state.layer](state);
    } else {
        state.callback(state)
    }
}

function findCommands(dataset, input, callback) {
    // TODO replace with NLP logic




/*

    _.forEach(tokenTypes, function(type){

    });


    knex('human_resources__core_dataset').columnInfo().then(function(columnInfo) {

        _.forEach(tokenizedInput, function(token){
            var result = _.find(columnInfo, function(o, i){
                return i === token;
            });
            if(result !== undefined){
                info["ColumnSelector"] = { operator: 'ColumnSelector', value: token};
            }
        });

        var result = _.find(info, function(o){
            if(o.operator === 'ColumnSelector'){
                return o;
            }
        });

        callback({
            function: 'plotHistogramOfColumn',
            parameters: [
                result.token
            ]
        });

    });*/
    /*Expression:Operation - Select, Plot, Make

    Expression:Dataset - employee

    Expression:ChartType - histogram, pie chart, bar chart, line chart, scatter plot
    Indicator: as a*/
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

        var tokenizer = new natural.WordTokenizer();
        let tokenizedInput = tokenizer.tokenize(req.body.input);

        let initState = {
            tokens: tokenizedInput,
            layer: 0,
            currentToken: 0,
            callback: state => {
                debugger;
                let bestMatch = {
                    function: 'plotHistogramOfColumn',
                    parameters: [
                    ]
                };

                _.forEach(state.tokens, function(token){
                    if(token.type === "Column"){
                        bestMatch.parameters.push(token.value);
                    }
                });
                functions[bestMatch.function](dataset, bestMatch.parameters, data =>
                    // Send the data back to the client
                    res.send({data: data})
                )
            }
        };

        findCommand(initState);

        // Use NLP to find the right command
        /*findCommand(dataset, req.body.input, command =>
            functions[command.function](dataset, command.parameters, data =>
                // Send the data back to the client
                res.send({data: data})
            )
        );*/
        // Query the needed data and transform them into the dataformat for plotly.js

    })
};