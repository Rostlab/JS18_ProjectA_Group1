let expect = require('chai').expect;
let nlp = require('../../controllers/nlp.js');
let commands = require('../../data/commands.json');

describe('Tests from commands.json', function () {
    commands.forEach(command => {
        command.tests.forEach((test, index) => {
            let input = test.input;
            let dataset = test.dataset;
            let inputHistory = command.tests.slice(0, index);
            let historyToCompare = command.tests.slice(0, index + 1);

            it('nlp ' + input, async () => {
                let generatedHistory = await new Promise((resolve, reject) => {
                    nlp.generateNewHistory(input, dataset, inputHistory, resolve, reject);
                });

                expect(generatedHistory.length).to.be.equal(historyToCompare.length);
                generatedHistory.forEach((historyItem, currentHistoryIndex) => {
                    let historyItemToCompare = historyToCompare[currentHistoryIndex];
                    expect(historyItem.function).to.be.equal(historyItemToCompare.function);
                    expect(historyItem.functionParameters).to.deep.equal(historyItemToCompare.functionParameters);
                });
            })
        });
    });
});
