let bookshelf = require('../config/bookshelf');
let commands = require('../data/commands.json');

function getDatasets() {
    return bookshelf.Model.extend({tableName: 'generic_dataset'}).fetchAll()
}

let functions = {
    plotHistogramOfColumn: function (dataset, parameters, callback) {
        let column = parameters[0];

        // SELECT <column> FROM <dataset>
        bookshelf.Model.extend({tableName: dataset}).fetchAll({columns: [column]}).then(data => callback(
            [{
                // map [{<columnName>: <columnValue}, ...] to [<columnValue>, ...]
                x: data.map((value) => value.attributes[column]),
                type: 'histogram'
            }]
        ))
    }
};

function findCommand(dataset, input) {
    // TODO replace with NLP logic
    return {
        function: 'plotHistogramOfColumn',
        parameters: [
            'age'
        ]
    }
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

        // Use NLP to find the right command
        let command = findCommand(dataset, req.body.input);
        // Query the needed data and transform them into the dataformat for plotly.js
        functions[command.function](dataset, command.parameters, data =>
            // Send the data back to the client
            res.send({data: data})
        );
    })
};