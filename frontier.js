'use strict';
const express = require('express');
const bodyParser = require('body-parser');

// Use the prom-client module to expose our metrics to Prometheus
const client = require('prom-client');

// enable prom-client to expose default application metrics
const collectDefaultMetrics = client.collectDefaultMetrics;

// define a custom prefix string for application metrics
collectDefaultMetrics({ prefix: 'my_application:' });

// a custom histogram metric which represents the latency
// of each call to our API /api/greeting.
const histogram = new client.Histogram({
  name: 'my_application:hello_duration',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'status_code'],
  buckets: [0.1, 5, 15, 50, 100, 500]
});

// create the express application
const app = express();
const port = process.argv[2] || 8080;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

// our API
app.use('/api/greeting', (request, response) => {
  // start the timer for our custom metric - this returns a function
  // called later to stop the timer
  const end = histogram.startTimer();
  const name = request.query.name ? request.query.name : 'World';
  response.send({content: `Hello, ${name}!`});
  // stop the timer
  end({ method: request.method, 'status_code': 200 });
});

// expose our metrics at the default URL for Prometheus
app.get('/metrics', (request, response) => {
  response.set('Content-Type', client.register.contentType);
  response.send(client.register.metrics());
});

app.get('/metrics2', (request, response) => {
  response.set('Content-Type', client.register.contentType);
  response.send({content: `nodejs_heap_space_size_total_bytes{space="new"} 1048576 1497945862862
  nodejs_heap_space_size_total_bytes{space="old"} 9818112 1497945862862
  nodejs_heap_space_size_total_bytes{space="code"} 3784704 1497945862862
  nodejs_heap_space_size_total_bytes{space="map"} 1069056 1497945862862
  nodejs_heap_space_size_total_bytes{space="large_object"} 0 1497945862862`});
});

app.listen(port, () => console.log(`Hello world app listening on port ${port}!`));