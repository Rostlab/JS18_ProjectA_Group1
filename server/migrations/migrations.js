let tableName_human_resource__core_dataset = 'human_resources__core_dataset';
let identifier_human_resources__core_dataset = 'employee_number';
let tableName_generic_dataset = 'generic_dataset';
let identifier_generic_dataset = 'table_name';
let fs = require('fs');



exports.up = function (knex, Promise) {

    console.log("Migrate");

    return Promise.resolve()
        .then(() => createGenericDataset(knex))
        .then(() => createHumanResourcesDataCore(knex))
        .then(() => parseDataFromCsv(knex, './data/core_dataset.csv'))
        .then(parseResult => insertData(knex, tableName_human_resource__core_dataset, parseResult.data))
        .then(() => insertData(knex, tableName_generic_dataset, [
            {
                table_name: tableName_human_resource__core_dataset,
                display_name: 'Employees',
                description: 'The core human resource dataset',
                file: './data/core_dataset.csv'
            }]));
};

exports.down = function (knex, Promise) {

    console.log("Rollback");

    return Promise.resolve()
        .then(() => deleteTable(knex, tableName_human_resource__core_dataset))
        .then(() => deleteGenericDataset(knex));
};

function createGenericDataset(knex) {
    console.log("Create " + tableName_generic_dataset);
    return knex.schema.createTable(tableName_generic_dataset, table => {
        table.string(identifier_generic_dataset).primary();
        table.string('display_name');
        table.string('description');
        table.string('file');
    });
}

function deleteGenericDataset(knex) {
    console.log("Delete " + tableName_generic_dataset);
    return knex.schema.dropTable(tableName_generic_dataset);
}

function createHumanResourcesDataCore(knex) {
    console.log("Create " + tableName_human_resource__core_dataset);
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
        table.boolean('hispanic_latino');
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

function deleteTable(knex,tableName) {
    console.log("Delete " + tableName);
    return knex.schema.dropTable(tableName);
}


function parseDataFromCsv(knex, fileLocation) {
    console.log("Parse data from " + fileLocation);

    let papaparse = require('papaparse');

    let data = fs.readFileSync(fileLocation, "utf8");
    let parseResult = papaparse.parse(data, {
        header: true,
        beforeFirstChunk: function (chunk) {
            //delete the last line ",,,,,,,,"
            chunk = chunk.replace(/\r?\n?[^\r\n]*$/, "").replace(/\r?\n?[^\r\n]*$/, "");
            //tranform everything to small letters and add _ instead of spaces
            let rows = chunk.split(/\r\n|\r|\n/);
            let headings = rows[0].toLowerCase();
            headings = headings.split(' ').join('_');
            headings = headings.replace('/', '_');
            rows[0] = headings;
            return rows.join("\r\n");
        }
    });
    console.log("Read data from file " + fileLocation);
    return parseResult;
}

function insertData(knex, tableName, data) {
    console.log("Insert Data into " + tableName);
    return knex(tableName).insert(data);
}
