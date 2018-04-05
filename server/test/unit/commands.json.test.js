let request = require('supertest');
let chai = require('chai');
let nlp = require('../../controllers/nlp.js');
let commands = require('../../data/commands.json');

let columnOutput;
let filtersOutput;

function errorCallback() {
    // TO add in command.json
    chai.assert(data.length === 1);
}

function successCallback(data) {
    chai.assert(data.length === 1);
    chai.assert(data[0].functionParameters.columns.length === columnOutput);
    chai.assert(data[0].functionParameters.filters.length === filtersOutput);
}

describe('Command Json', function () {
    commands.forEach(command => {
        if (command.tests[0] !== undefined) {
            let input = command.tests[0].input;
            let dataset = command.tests[0].dataset;
            if (command.tests[0].parameters == undefined) { // Transformation scenario
                columnOutput = 1;
                filtersOutput = 1;
            } else {
                columnOutput = command.tests[0].parameters.columns.length;
                filtersOutput = command.tests[0].parameters.filters.length;
            }
            it('nlp ' + input, function (done) {
                nlp.generateNewHistory(input, dataset, undefined, successCallback, errorCallback);
                done();
            })
        }
    });
});
