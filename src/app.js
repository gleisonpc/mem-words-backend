'use strict';

const express = require('express');
const cors = require('cors');

const { buildCorsOptions } = require('./config/cors');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(cors(buildCorsOptions()));
app.use(express.json());

app.use(routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
