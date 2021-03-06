const Router = require('koa-router');

const api = new Router();
const auth = require('./auth');
const notice = require('./notice');
const question = require('./question');
const answer = require('./answer');
const upload = require('./upload');

api.use('/auth', auth.routes());
api.use('/notice', notice.routes());
api.use('/question', question.routes());
api.use('/answer', answer.routes());
api.use('/upload', upload.routes());

module.exports = api;
