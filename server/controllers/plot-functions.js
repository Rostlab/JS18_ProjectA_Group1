let _ = require('lodash');
let config = require('../knexfile');
let knex = require('knex')(config);
let tranformationLib = require('js18_projectb_group3');
const Classifier = require('./classifier.js');

knex.on('query', function (queryData) {
    console.log({
        bindings: queryData.bindings,
        sql: queryData.sql,
    });
});

/**
 * get the data for some columns filtered and grouped by the rules defined in the column objects
 * returns a promise (which holds the data)
 */
async function getData(dataset, parameters) {
    let columnInfo = await knex(dataset).columnInfo();
    console.log(columnInfo);
    let query = knex(dataset).select(parameters.columns.map(token => token.label));
    parameters.filters.forEach(filter => {
        if (filter.filterValue !== undefined && filter.filterValue.column !== undefined) {
            let operation = filter.labelType === Classifier.staticWords.filterSelector ? Classifier.staticWords.filterSelectors[filter.label] : '=';
            if (columnInfo[filter.filterValue.column].type === "character varying") {
                query.whereRaw('LOWER(' + filter.filterValue.column + ') ' + operation + " '" + filter.filterValue.token.toLocaleLowerCase() + "'")
            } else {
                query.where(filter.filterValue.column, operation, filter.filterValue.token)
            }
        }
    });
    return await query
}

async function createData(yAxisValues, xAxisValues, dataset) {
    let data = [];
    for (let minValue of yAxisValues) {
        await new Promise(resolve => {
            createTrace(minValue, xAxisValues, dataset, data).then(result => {
                resolve();
            })
        });
    }
    return data;
}

async function createTrace(minValue, xAxisValues, dataset, data) {
    if (xAxisValues[0].datatype === "integer" || xAxisValues[0].datatype === "double precision") {
        xAxisValues.sort((a, b) => a.label - b.label);
    } else if (xAxisValues[0].datatype === "date") {
        xAxisValues.sort((a, b) => new Date(b.label) - new Date(a.label));
    }
    let trace = {
        x: [],
        y: [],
        mode: 'lines',
        name: minValue.label
    };
    for (let maxValue of xAxisValues) {
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
        let column = parameters.columns[0].label;

        // SELECT <column> FROM <dataset>
        getData(dataset, parameters).then(queriedData => {
            //var synonym = _.find(columnSynonyms, {'columnName': column}).synomyms[0];
            callback(
                [{
                    // map [{<columnName>: <columnValue>}, ...] to [<columnValue>, ...]
                    x: queriedData.map((object) => object[column]),
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
        let column1 = parameters.columns[0].label;
        let column2 = parameters.columns[1].label;

        // SELECT <column1>, <column2> FROM <dataset>
        getData(dataset, parameters).then(queriedData => {
            callback(
                [
                    {
                        // map [{<columnName>: <columnValue>}, ...] to [<columnValue>, ...]
                        x: queriedData.map((object) => object[column1]),
                        type: 'histogram'
                    },
                    {
                        // map [{<columnName>: <columnValue>}, ...] to [<columnValue>, ...]
                        x: queriedData.map((object) => object[column2]),
                        type: 'histogram'
                    }
                ],
                {
                    title: 'Histogram of ' + column1 + ' and ' + column2,
                    xaxis: {
                        title: column1 + ' ' + column2,
                    },
                    yaxis: {
                        title: "Count",
                    }
                }
            );
        }).catch(err =>
            error(err)
        );
    },

    // TODO add filters for line chart as well
    plotLineChartOfTwoColumns(dataset, parameters, input, data, callback, error) {
        let column1 = parameters.columns[0].label;
        let column2 = parameters.columns[1].label;

        Classifier.getValuesOfColumnsByName([column1, column2], dataset).then(columnValues => {
            let column1Values = columnValues.filter(value => value.column === column1);
            let column2Values = columnValues.filter(value => value.column === column2);
            let yAxisValues = (column1Values.length >= column2Values.length ? column2Values : column1Values);
            let xAxisValues = (column1Values.length < column2Values.length ? column2Values : column1Values);
            //decided that it does not make sense to have more than 10 lines
            if (yAxisValues.length > 10) {
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
        let column1 = parameters.columns[0].label;
        let column2 = parameters.columns[1].label;

        // SELECT <column1>, <column2>  FROM <dataset>
        getData(dataset, parameters).then(queriedData => {
            callback(
                [{
                    // map [{<columnName>: <columnValue>}, ...] to [<columnValue>, ...]
                    x: queriedData.map((object) => object[column1]),
                    y: queriedData.map((object) => object[column2]),
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
        let column = parameters.columns[0].label;
        // SELECT <column> FROM <dataset>
        getData(dataset, parameters).then(queriedData => {
            let entries = queriedData.map((object) => object[column]);
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
            if (errorData != null) {
                error(errorData)
            } else {
                callback(result.data, result.layout)
            }
        });
    }
};

module.exports = plot_functions;