let bookshelf = require('../config/bookshelf');
let _ = require('lodash');
let config = require('../knexfile');
let knex = require('knex')(config);
let tranformationLib = require('js18_projectb_group3');
const Classifier = require('./classifier.js');


async function createData(yAxisValues, xAxisValues, dataset) {
    let data = [];
    for(let minValue of yAxisValues){
        await new Promise(resolve => {
            createTrace(minValue, xAxisValues, dataset, data).then(result => {
                resolve();
            })
        });
    }
    return data;
}

async function createTrace(minValue, xAxisValues, dataset, data) {
    if(xAxisValues[0].datatype === "integer" || xAxisValues[0].datatype === "double precision"){
        xAxisValues.sort((a,b) => a.label - b.label);
    } else if(xAxisValues[0].datatype === "date"){
        xAxisValues.sort((a,b) => new Date(b.label) - new Date(a.label));
    }
    let trace = {
        x: [],
        y: [],
        mode: 'lines',
        name: minValue.label
    };
    for(let maxValue of xAxisValues) {
        await new Promise(resolve => {
            trace.x.push(maxValue.label);
            knex(dataset).where(minValue.column, '=', minValue.label).where(maxValue.column, '=', maxValue.label).then(value => {
                trace.y.push(value.length);
                resolve();
            });
        })
    }
    return data.push(trace);

}

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

        Classifier.getValuesOfColumnsByName([column1, column2], dataset).then(columnValues => {
            let column1Values = columnValues.filter(value => value.column === column1);
            let column2Values = columnValues.filter(value => value.column === column2);
            let yAxisValues = (column1Values.length >= column2Values.length ? column2Values : column1Values);
            let xAxisValues = (column1Values.length < column2Values.length ? column2Values : column1Values);
            //decided that it does not make sense to have more than 10 lines
            if(yAxisValues.length > 10){
                let err = new Error("Columns are to high dimensional");
                error(err);
            } else {
                createData(yAxisValues, xAxisValues, dataset).then(data => {
                    callback(data, {
                        title: 'Line Chart of ' + xAxisValues[0].column + ' and ' + yAxisValues[0].column,
                        xaxis: {
                            title: xAxisValues[0].column,
                        },
                        yaxis: {
                            title: yAxisValues[0].column,
                        },
                        showlegend: true
                    });
                });
            }
        }).catch(err =>
            error(err)
        );
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