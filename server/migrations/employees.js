exports.up = function(knex, Promise) {
    return knex.schema.createTable('Employee', function(table) {
        table.string('employee_name');
        table.integer('employee_number').primary();
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
};

exports.down = function(knex, Promise) {
    return knex.schema.dropTable('Employee')
};
