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

// histogram type of metrics to collect our APIs’ response time per routes
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['route'],
  // buckets for response time from 0.1ms to 500ms
  buckets: [0.10, 5, 15, 50, 100, 200, 300, 400, 500]
})

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
  // After each response
  httpRequestDurationMicroseconds
  .labels(request.route.path)
  .observe(responseTimeInMs)
});

// expose our metrics at the default URL for Prometheus
app.get('/metrics', (request, response) => {
  response.set('Content-Type', client.register.contentType);
  response.send(client.register.metrics());
});

app.get('/metrics2', (request, response) => {
  response.set('Content-Type', client.register.contentType);
  response.send(`nodejs_heap_space_size_total_bytes{space="new"} 1048576 1684782791
nodejs_heap_space_size_total_bytes{space="old"} 9818112 1684782791
nodejs_heap_space_size_total_bytes{space="code"} 3784704 1684782791
nodejs_heap_space_size_total_bytes{space="map"} 1069056 1684782791
nodejs_heap_space_size_total_bytes{space="large_object"} 0 1684782791
http_request_duration_ms_bucket{le="10",code="200",route="/",method="GET"} 58
http_request_duration_ms_bucket{le="100",code="200",route="/",method="GET"} 1476
http_request_duration_ms_bucket{le="250",code="200",route="/",method="GET"} 3001
http_request_duration_ms_bucket{le="500",code="200",route="/",method="GET"} 3001
http_request_duration_ms_bucket{le="+Inf",code="200",route="/",method="GET"} 3001`);
});

// Metrics endpoint
app.get('/metrics3', (request, response) => {
  response.set('Content-Type', client.register.contentType)
  response.end(client.register.metrics())
})

app.listen(port, () => console.log(`Hello world app listening on port ${port}!`));