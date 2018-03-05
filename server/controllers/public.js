/**
 * GET /API/datasets
 */
exports.getDatasets = function (req, res) {
    // TODO load real datasets
    let datasets = [
        {
            table_name: "human_resources__core_dataset",
            display_name: "Employees",
            description: "The core human resource dataset",
            file: "./data/core_dataset.csv"
        }
    ];
    res.send({datasets: datasets});
};

/**
 * POST /API/columns
 */

exports.getColumns = function (req, res) {
    // TODO validate dataset agains available datasets
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
    // TODO validate dataset agains available datasets
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