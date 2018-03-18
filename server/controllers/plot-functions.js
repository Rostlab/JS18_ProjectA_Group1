let bookshelf = require('../config/bookshelf');

var plot_functions = {};

plot_functions.functions = {
    plotHistogramOfColumn: function (dataset, parameters, callback) {
        let column = parameters[0];

        // SELECT <column> FROM <dataset>
        bookshelf.Model.extend({tableName: dataset}).fetchAll({columns: [column]}).then(data => {
            //var synonym = _.find(columnSynonyms, {'columnName': column}).synomyms[0];
            callback(
                [{
                    // map [{<columnName>: <columnValue>}, ...] to [<columnValue>, ...]
                    x: data.map((value) => value.attributes[column]),
                    type: 'histogram'
                }],
                {
                    title: 'Histogram of ' + column,
                    xaxis: {
                        title: column,
                    },
                    yaxis: {
                        title: "Count",
                    }
                }
            )
        })


    },
    plotHistogramOfTwoColumns: function (dataset, parameters, callback) {
        let column1 = parameters[0];
        let column2 = parameters[1];

        // SELECT <column1>, <column2> FROM <dataset>
        bookshelf.Model.extend({tableName: dataset}).fetchAll({columns: [column1, column2]}).then(data => callback(
            [{
                // map [{<columnName>: <columnValue>}, ...] to [<columnValue>, ...]
                x: data.map((value) => value.attributes[column1]),
                type: 'histogram'
            },
                {
                    // map [{<columnName>: <columnValue>}, ...] to [<columnValue>, ...]
                    x: data.map((value) => value.attributes[column2]),
                    type: 'histogram'
                }],
            {
                title: 'Histogram of ' + column1 + ' and ' + column2,
                xaxis: {
                    title: column1 + ' ' + column2,
                },
                yaxis: {
                    title: "Count",
                }
            }
        ))
    },
    plotLineChartOfColumn: function (dataset, parameters, callback) {
        let column = parameters[0];

        // SELECT <column> FROM <dataset>
        bookshelf.Model.extend({tableName: dataset}).fetchAll({columns: [column]}).then(data => callback(
            [{
                // map [{<columnName>: <columnValue>}, ...] to [<columnValue>, ...]
                x: data.map((value) => value.attributes[column]),
                type: 'scatter'
            }],
            {
                title: 'Line chart of ' + column,
                xaxis: {
                    title: column,
                },
                yaxis: {
                    title: "Count",
                }
            }
        ))
    },
    plotScatterOfTwoColumns: function (dataset, parameters, callback) {
        let column1 = parameters[0];
        let column2 = parameters[1];

        // SELECT <column1>, <column2>  FROM <dataset>
        bookshelf.Model.extend({tableName: dataset}).fetchAll({columns: [column1, column2]}).then(data => {
            callback(
                [{
                    // map [{<columnName>: <columnValue>}, ...] to [<columnValue>, ...]
                    x: data.map((value) => value.attributes[column1]),
                    y: data.map((value) => value.attributes[column2]),
                    mode: 'markers',
                    type: 'scatter'
                }],
                {
                    title: 'Scatter plot of ' + column1 + ' and ' + column2,
                    xaxis: {
                        title: column1,
                    },
                    yaxis: {
                        title: column2,
                    }
                }
            )
        });
    },
    plotPieChartOfColumn: function (dataset, parameters, callback) {
        let column = parameters[0];
        // SELECT <column> FROM <dataset>
        bookshelf.Model.extend({tableName: dataset}).fetchAll({columns: [column]}).then(data => {
            let entries = data.map((value) => value.attributes[column]);
            let values = [];
            let labels = [];
            _.forEach(entries, function (entry) {
                if (!_.includes(labels, entry)) {
                    labels.push(entry);
                    values.push(1);
                } else {
                    let index = labels.indexOf(entry);
                    values[index]++;
                }
            });
            callback(
                [{
                    // map [{<columnName>: <columnValue>}, ...] to [<columnValue>, ...
                    values: values,
                    labels: labels,
                    type: 'pie'
                }],
                {
                    title: 'Pie Chart of ' + column,
                }
            )
        })


    },
};

module.exports = plot_functions;