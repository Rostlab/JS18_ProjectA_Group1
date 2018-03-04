let functions = {
    plotHistogramOfColumn: function (parameters) {
        // TODO query real data
        return [{
            x: [1, 2, 3, 4, 5],
            type: 'histogram'
        }]
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
    // TODO validate dataset agains available datasets
    req.assert('dataset', 'A dataset must be selected').notEmpty();
    req.assert('input', 'A plot command must be provides').notEmpty();

    let errors = req.validationErrors();

    if (errors) {
        return res.status(400).send(errors);
    }

    // Use NLP to find the right command
    let command = findCommand(req.body.dataset, req.body.input);
    // Query the needed data and transform them into the dataformat for plotly.js
    let data = functions[command.function](command.parameters);
    // Send the data back to the client
    res.send({data: data});
};