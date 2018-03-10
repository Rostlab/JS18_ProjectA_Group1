let bookshelf = require('../config/bookshelf');
let commands = require('../data/commands.json');

function getDatasets() {
    return bookshelf.Model.extend({tableName: 'generic_dataset'}).fetchAll()
}

/**
 * GET /API/datasets
 */
exports.getDatasets = function (req, res) {
    getDatasets().then(datasets => {
        res.send({datasets: datasets});
    });
};

/**
 * POST /API/columns
 */
exports.getColumns = function (req, res) {
    getDatasets().then(datasets => {
        req.assert('dataset', 'A dataset must be selected').notEmpty();
        req.assert('dataset', 'The dataset does not exist').custom(req_dataset => datasets.some(tmp_dataset => tmp_dataset.attributes.table_name === req_dataset));

        let errors = req.validationErrors();

        if (errors) {
            return res.status(400).send(errors);
        }

        let dataset = req.body.dataset;
        bookshelf.knex(dataset).columnInfo().then(info =>
            res.send({dataset: dataset, columns: info})
        );
    });
};


/**
 * POST /API/examples
 */
exports.getExamples = function (req, res) {
    getDatasets().then((datasets) => {
        req.assert('dataset', 'A dataset must be selected').notEmpty();
        req.assert('dataset', 'The dataset does not exist').custom(req_dataset => datasets.some(tmp_dataset => tmp_dataset.attributes.table_name === req_dataset));

        let errors = req.validationErrors();

        if (errors) {
            return res.status(400).send(errors);
        }

        let dataset = req.body.dataset;
        let examples = [];

        // find matching commands
        commands.forEach(command => {
            command.tests.forEach(test => {
                if (test.dataset === dataset) {
                    // send example to client
                    examples.push({
                        input: test.input,
                        dataset: test.dataset
                    })
                }
            })
        });

        res.send({dataset: dataset, examples: examples});
    });
};
