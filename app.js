var express = require('express');
var app = express();

app.set('view engine', 'jade');
app.use(express.static('public'));

app.get('/', function (req, res) {
  res.render('index', { name: 'THINK OF NAME' });
});

app.listen(3000, function () {
  console.log('Nethack tournament server!');
});