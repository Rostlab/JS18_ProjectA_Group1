var config = require('../knexfile');
var knex = require('knex')(config);
var bookshelf = require('bookshelf')(knex);

bookshelf.plugin('virtuals');
bookshelf.plugin('visibility');

bookshelf.migrate = function () {
    knex.migrate.latest();
}

module.exports = bookshelf;

