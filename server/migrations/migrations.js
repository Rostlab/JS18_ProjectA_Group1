let tableName_human_resource__core_dataset = 'human_resources__core_dataset';
let identifier_human_resources__core_dataset = 'employee_number';
let tableName_generic_dataset = 'generic_dataset';
let tableName_world_develop_indicators__indicator_dataset = 'world_develop_indicators__indicator_dataset'
let identifier_generic_dataset = 'table_name';
let https = require('https');
let fs = require('fs');
let papaparse = require('papaparse');
const zlib = require('zlib');
const stream = require('stream');

let parseConfig = {
    header: true,
    beforeFirstChunk: function (chunk) {
        //delete the last line ",,,,,,,,"
        chunk = chunk.replace(/\r?\n?[^\r\n]*$/, "").replace(/\r?\n?[^\r\n]*$/, "");
        //tranform everything to small letters and add _ instead of spaces
        let rows = chunk.split(/\r\n|\r|\n/);
        let headings = rows[0].toLowerCase();
        headings = headings.split(' ').join('_');
        rows[0] = headings;
        return rows.join("\r\n");
    }
}

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
            }]))
        .then(() => createIndicatorDataset(knex))
        .then(() => download('https://js2018.blob.core.windows.net/kaggle/Indicators.csv.gz', knex))
        .then(() => insertData(knex, tableName_generic_dataset, [
            {
                table_name: tableName_world_develop_indicators__indicator_dataset,
                display_name: 'Indicators',
                description: 'The world develop indicators',
                file: 'https://js2018.blob.core.windows.net/kaggle/Indicators.csv.gz'
            }]));
};

exports.down = function (knex, Promise) {

    console.log("Rollback");

    return Promise.resolve()
        .then(() => deleteTable(knex, tableName_human_resource__core_dataset))
        .then(() => deleteTable(knex, tableName_world_develop_indicators__indicator_dataset))
        .then(() => deleteTable(knex, tableName_generic_dataset));
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

function deleteTable(knex, tableName) {
    console.log("Delete " + tableName);
    return knex.schema.dropTable(tableName)
}


function parseDataFromCsv(knex, fileLocation) {
    console.log("Parse data from " + fileLocation);

    let data = fs.readFileSync(fileLocation, "utf8");
    let parseResult = papaparse.parse(data, parseConfig);
    console.log("Read data from file " + fileLocation);
    return parseResult;
}

function insertData(knex, tableName, data) {
    return knex(tableName)
        .insert(data).catch(error => console.log(error));
}

async function download(url, knex) {
    var streamSplitPart1;

    await new Promise((resolve, reject) => {
        var writeStream = new stream.Writable();
        var headings;
        var first = true;
        writeStream._write = function (chunk, encoding, done) {

            let stringChunk = chunk.toString();
            let rows = stringChunk.split(/\r\n|\r|\n/);
            if (streamSplitPart1) {
                let streamSplitPart2 = rows[0];
                let test = streamSplitPart1 + streamSplitPart2;
                rows.splice(0, 1, test);
                stringChunk = rows.join("\r\n");
            }

            if (!rows[rows.length - 1].endsWith("\r\n")) {
                streamSplitPart1 = rows[rows.length - 1];
                rows.splice(rows.length - 1, 1);
                stringChunk = rows.join("\r\n");
            } else {
                streamSplitPart1 = null;
            }

            let streamParseConfig = {
                header: true,
                beforeFirstChunk: function (chunk) {
                    //delete the last line ",,,,,,,,"
                    chunk = chunk.replace(/\r?\n?[^\r\n]*$/, "").replace(/\r?\n?[^\r\n]*$/, "");
                    //tranform everything to small letters and add _ instead of spaces
                    let rows = chunk.split(/\r\n|\r|\n/);
                    if (first) {
                        headings = rows[0].toLowerCase();
                        headings = headings.split(' ').join('_');
                        rows[0] = headings;
                        first = false;
                    } else {
                        rows.splice(0, 0, headings);
                    }
                    return rows.join("\r\n");
                }
            }

            var result = papaparse.parse(stringChunk, streamParseConfig);
            insertData(knex, tableName_world_develop_indicators__indicator_dataset, result.data).then(() => done());
        };
        writeStream.on('finish', () => {
            console.log('All writes are now complete.');
            resolve();
        });

        writeStream.on('error', () => {
            console.log('Error occurred.');
            reject();
        });

        https.get(url, function (response) {
                response.pipe(zlib.createUnzip()).pipe(writeStream);
            }
        ).on('error', function (err) { // Handle errors
            console.log(err);// Delete the file async. (But we don't check the result)
            reject();
        });
    });
}

function createIndicatorDataset(knex) {
    console.log("Create " + tableName_world_develop_indicators__indicator_dataset);
    return knex.schema.createTable(tableName_world_develop_indicators__indicator_dataset, table => {
        table.increments('id').primary();
        table.string('countryname');
        table.string('countrycode');
        table.string('indicatorname');
        table.string('indicatorcode');
        table.integer('year');
        table.double('value');
    });
}