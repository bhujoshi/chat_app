// BASE SETUP
// ==============================================
var moment = require('moment');
var express = require('express');
var app     = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port    =   process.env.PORT || 3000;
var mysql = require('mysql');
var bodyParser = require('body-parser');
var path = require('path');
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json()); // support json encoded bodies
// ROUTES
// get an instance of router
var router = express.Router();

//database connection
var connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : 'saurabh90',
  database : 'chat_app'
});

connection.connect();


router.get('/', function(req, res) {
    res.sendFile(__dirname + '/home.html');
});

router.post('/users', function(req, res) {
  var sql = "SELECT * FROM users WHERE userName = ?"
  connection.query(sql,[req.body.userName], function (err, rows, fields) {
    if (err){
      console.log(err);
      res.send({"status":500,"message":"Enternal error ........"});
    }
    if(!rows.length){
      sql = "INSERT INTO users (name,userName) VALUES (?,?)";
      connection.query(sql,[req.body.name,req.body.userName], function (err, result) {
        if (err) throw err;
        res.send({"status":203,"id":result.insertId});
      })
    }else{
      res.send({"status":203,"id":rows[0].id});
    }
  })
});

router.post('/messages', function(req, res) {
  sql = "INSERT INTO messages (message,send_by,message_delivery_time) VALUES (?,?,?)";
  connection.query(sql,[req.body.message,req.body.id,req.body.dateTime], function (err, result) {
    if (err){
      console.log(err);
      res.send({"status":500,"message":"Some internal error occurred!"});
    }
    res.send({"status":200,"message":"Message added!"});
  });
});
function emit_data(){
  var now = moment();
  var formatted = now.format('YYYY-MM-DD HH:mm:ss');
  var sql = "select messages.id as m_id,users.name,messages.message from messages left join users on users.id = messages.send_by where message_delivery_time <= ? and status = ?";
  console.log(sql);
  console.log(formatted);
  connection.query(sql,[formatted,0], function (err, rows) {
    if (err) console.log(err);
    if(rows.length){
      for(let i = 0 ;i < rows.length; i++){
        var sql1 = "UPDATE messages SET status = ? where id = ?";
        connection.query(sql1,[1,rows[i].m_id], function (err, result) {
          if (err){
            console.log(err);
          }else{
            console.log(rows);
            console.log(i);
            io.emit('chat message',rows[i].name+": "+rows[i].message);
          }
        });
      }
    }
  });
}

router.get('/chatroom', function(req, res) {
    if(req.query.id != undefined ){
      var sql = "SELECT * FROM users WHERE id = ?"
      connection.query(sql,[req.query.id], function (err, rows, fields) {
        if (err) console.log(err);
        if(rows.length){
          res.sendFile(__dirname + '/chatroom.html');
          io.on('connection', function(socket){
            socket.on('chat message', function(msg){
              io.emit('chat message', msg);
            });
          });
          emit_data();
          setInterval(function () {
            emit_data();
          }, 10000);
        }else{
          res.redirect(req.protocol + '://' + req.get('host') );
        }
      })
    }else{
      res.redirect(req.protocol + '://' + req.get('host') );
    }
});



// apply the routes to our application
app.use('/', router);

http.listen(port, function(){
  console.log('listening on *:' + port);
});

console.log('Magic happens on port ' + port);
