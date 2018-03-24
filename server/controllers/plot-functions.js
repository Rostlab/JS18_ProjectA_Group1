let bookshelf = require('../config/bookshelf');
let _ = require('lodash');
let tranformationLib = require('js18_projectb_group3');
const Classifier = require('./classifier.js');

let plot_functions = {

    plotHistogramOfColumn(dataset, parameters, input, data, callback, error) {
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
        }).catch(err =>
            error(err)
        );
    },

    plotHistogramOfTwoColumns(dataset, parameters, input, data, callback, error) {
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
        )).catch(err =>
            error(err)
        );
    },

    plotLineChartOfTwoColumns(dataset, parameters, input, data, callback, error) {
        let column1 = parameters[0];
        let column2 = parameters[1];
        
        let min = Math.min(valuesColumn1.length, valuesColumn2.length);
        if(min > 10){
            let err = new Error("Values too big for Line Chart");
            error(err);
        };


        /*// SELECT <column> FROM <dataset>
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
        )).catch(err =>
            error(err)
        );*/
    },

    plotScatterOfTwoColumns(dataset, parameters, input, data, callback, error) {
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
                    type: 'scatter',
                    name: "age"
                }],
                {
                    title: 'Scatter plot of ' + column1 + ' and ' + column2,
                    xaxis: {
                        title: column1,
                    },
                    yaxis: {
                        title: column2,
                    },
                    showlegend: true
                }
            )
        }).catch(err =>
            error(err)
        );
    },

    plotPieChartOfColumn(dataset, parameters, input, data, callback, error) {
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
                    values: values,
                    labels: labels,
                    type: 'pie'
                }],
                {
                    title: 'Pie Chart of ' + column,
                }
            )
        }).catch(err =>
            error(err)
        );
    },

    transformData(dataset, parameters, input, data, callback, error) {
        tranformationLib.editChart(input, data, (errorData, result) => {
            // TODO handle error
            console.log(error);
            if(errorData != null) {
                error(errorData)
            } else {
                callback(result.data, result.layout)
            }
        });
    }
};

module.exports = plot_functions;