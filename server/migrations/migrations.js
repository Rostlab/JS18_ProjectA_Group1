var tableName_human_resource__core_dataset = 'human_resources__core_dataset';
var identifier_human_resources__core_dataset = 'employee_number';
var tableName_generic_dataset = 'generic_dataset';
var identifier_generic_dataset = 'table_name';
var bookshelf = require('../config/bookshelf');

exports.up = function (knex, Promise) {

    console.log("Migrate")

    return Promise.resolve()
        .then(() => createGenericDataset(knex))
        .then(() => createHumanResourcesDataCore(knex))
        .then(() => insertDataHumanResourcesDataCore(knex))
        .then(() => registerHumanResourcesDataCore(knex))
}

exports.down = function (knex, Promise) {

    console.log("Rollback")

    return Promise.resolve()
        .then(() => deleteHumanResourcesDataCore(knex))
        .then(() => deleteGenericDataset(knex));
};

function createGenericDataset(knex) {
    console.log("Create " + tableName_generic_dataset)
    return knex.schema.createTable(tableName_generic_dataset, table => {
        table.string(identifier_generic_dataset).primary();
        table.string('display_name');
        table.string('description');
        table.string('file');
    });
}

function deleteGenericDataset(knex) {
    console.log("Delete " + tableName_generic_dataset)
    return knex.schema.dropTable(tableName_generic_dataset);
}

function createHumanResourcesDataCore(knex) {
    console.log("Create " + tableName_generic_dataset)
    return knex.schema.createTable(tableName_human_resource__core_dataset, table => {
        table.string('employee_name');
        table.integer(identifier_human_resources__core_dataset).primary();
        table.string('state');
        table.integer('zip');
        table.date('dob');
        table.integer('age');
        table.string('sex');
        table.string('maritaldesc');
        table.string('citizendesc');
        table.boolean('hispanic/latino');
        table.string('racedesc');
        table.date('date_of_hire');
        table.string('reason_for_term');
        table.string('employment_status');
        table.string('department');
        table.string('position');
        table.double('pay_rate');
        table.string('employee_source');
        table.string('performance_score');
        table.string('date_of_termination');
        table.string('manager_name')
    });
}

function deleteHumanResourcesDataCore(knex) {
    console.log("Delete " + tableName_human_resource__core_dataset)
    return knex.schema.dropTable(tableName_human_resource__core_dataset)
}

function registerHumanResourcesDataCore(knex) {
    console.log("Register " + tableName_human_resource__core_dataset)
    var Dataset = bookshelf.Model.extend({
        tableName: tableName_generic_dataset,
        idAttribute: identifier_generic_dataset
    });

    var entryToSave = new Dataset({
        table_name: tableName_human_resource__core_dataset,
        display_name: 'Employees',
        description: 'The core human resource dataset',
        file: './data/core_dataset.csv'
    });
    entryToSave.save(null, {method: 'insert'});
}


function insertDataHumanResourcesDataCore(knex) {
    console.log("Insert data into " + tableName_human_resource__core_dataset)

    var papaparse = require('papaparse');
    var fs = require('fs');
    var _ = require('lodash');

    var Employee = bookshelf.Model.extend({
        tableName: tableName_human_resource__core_dataset,
        idAttribute: identifier_human_resources__core_dataset
    });

    fs.readFile('./data/core_dataset.csv', "utf8", function read(err, data) {
        if (err) throw err;
        papaparse.parse(data, {
            header: true,
            beforeFirstChunk: function (chunk) {
                //delete the last line ",,,,,,,,"
                chunk = chunk.replace(/\r?\n?[^\r\n]*$/, "").replace(/\r?\n?[^\r\n]*$/, "");
                //tranform everything to small letters and add _ instead of spaces
                var rows = chunk.split(/\r\n|\r|\n/);
                var headings = rows[0].toLowerCase();
                headings = headings.split(' ').join('_');
                rows[0] = headings;
                //change all the dates to the right format
                // for(var i = 1; i < rows.length; i++){
                //     columnValues = rows[i].split(",");
                //     for(var j = 0; j < columnValues.length; j++){
                //         var dateParts = columnValues[j].split("/");
                //         if(dateParts.length>2){
                //             var swap = dateParts[1];
                //             dateParts[1] = dateParts [0];
                //             dateParts[0] = swap;
                //             var dateObject = dateParts.join("/");
                //             columnValues[j] = dateObject;
                //         }
                //     }
                //     columnValues.join(",");
                //     rows[i] = columnValues;
                // }
                return rows.join("\r\n");

            },
            complete: function (results) {
                parsedData = results.data;
                var entryToSave;
                _.forEach(parsedData, function (itemToSave) {
                    entryToSave = new Employee(itemToSave);
                    entryToSave.save(null, {method: 'insert'});
                });
            }
        });
        // Or put the next step in a function and invoke it
    });
    console.log("Insert data into " + tableName_human_resource__core_dataset + " finished")
}