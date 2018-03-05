let bookshelf = require('../config/bookshelf');

/**
 * GET /API/datasets
 */
exports.getDatasets = function (req, res) {
    bookshelf.Model.extend({tableName: 'generic_dataset'}).fetchAll().then((datasets) => {
        res.send({datasets: datasets});
    });
};

/**
 * POST /API/columns
 */

exports.getColumns = function (req, res) {
    // TODO validate dataset against available datasets
    req.assert('dataset', 'A dataset must be selected').notEmpty();

    let errors = req.validationErrors();

    if (errors) {
        return res.status(400).send(errors);
    }

    let dataset = req.body.dataset;
    let columns = [];
    //TODO load columns for dataset

    res.send({dataset: dataset, columns: columns});
};


/**
 * POST /API/examples
 */

exports.getExamples = function (req, res) {
    // TODO validate dataset against available datasets
    req.assert('dataset', 'A dataset must be selected').notEmpty();

    let errors = req.validationErrors();

    if (errors) {
        return res.status(400).send(errors);
    }

    let dataset = req.body.dataset;
    let examples = [];
    //TODO load examples for dataset

    res.send({dataset: dataset, examples: examples});
};