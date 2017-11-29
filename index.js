'use strict';
var envvar = require('envvar');
var express = require('express');
var bodyParser = require('body-parser');
var moment = require('moment');
var plaid = require('plaid');
var mysql = require('mysql');


// Begin Plaid code for configuration, initialization, and authentication
var APP_PORT = envvar.number('APP_PORT', Number(process.env.PORT || 4001));
var PLAID_CLIENT_ID = envvar.string('PLAID_CLIENT_ID','57c4acc20259902a3980f7d2');
var PLAID_SECRET = envvar.string('PLAID_SECRET','10fb233c2a93dfcd42aa1a9d8a01d1');
var PLAID_PUBLIC_KEY = envvar.string('PLAID_PUBLIC_KEY','ebc098404b162edaadb2b8c6c45c8f');
var PLAID_ENV = envvar.string('PLAID_ENV', 'development');


// We store the access_token in memory - in production, store it in a secure
// persistent data store
var ACCESS_TOKEN = null;
var PUBLIC_TOKEN = null;
var ITEM_ID = null;

var client = new plaid.Client(
    PLAID_CLIENT_ID,
    PLAID_SECRET,
    PLAID_PUBLIC_KEY,
    plaid.environments[PLAID_ENV]
  );
// Express setup
var app = express();
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json());
app.set('public token', null);
// End Express setup

var connection = mysql.createConnection({
    host: "konvivtest1.c0ebjxhggelq.us-east-2.rds.amazonaws.com",
    user: "harsha",
    password: "varshaA1!",
    database:"testSchema"
  });

var apiRoutes = express.Router();
var user_id;

// Here is where we define actual RESTful calls, using Express:
app.get('/', function(request, response, next) {
  console.log("app loading...");
  response.render('plaid.ejs', {
      PLAID_PUBLIC_KEY: PLAID_PUBLIC_KEY,
      PLAID_ENV: PLAID_ENV,
  });
  console.log("app loaded");
});


app.get('/:user_id', function(request, response, next) {
  user_id = request.params.user_id;
  console.log("plaid user id: ", user_id);
  console.log("request.params: ", request.params);
    response.render('plaid.ejs', {
        PLAID_PUBLIC_KEY: PLAID_PUBLIC_KEY,
        PLAID_ENV: PLAID_ENV,
    });
});

app.post('/get_access_token', function(request, response, next) {
    PUBLIC_TOKEN = request.body.public_token;
    client.exchangePublicToken(PUBLIC_TOKEN, function(error, tokenResponse) {
      if (error != null) {
        var msg = 'Could not exchange public_token!';
        console.log(msg + '\n' + error);
        return response.json({
          error: msg
        });
      }
      ACCESS_TOKEN = tokenResponse.access_token;
      ITEM_ID = tokenResponse.item_id;
      console.log('Access Token: ' + ACCESS_TOKEN);
      console.log('Item ID: ' + ITEM_ID);
      
      response.json({
        'error': false
      });
    });
    
  });


  app.post('/accounts', function(request, response, next) {
    // Retrieve high-level account information and account and routing numbers
    // for each account associated with the Item.
    client.getAuth(ACCESS_TOKEN, function(error, authResponse) {
      if (error != null) {
        var msg = 'Unable to pull accounts from the Plaid API.';
        console.log(msg + '\n' + error);
        return response.json({
          error: msg
        });
      }
      
      var accounts;
      console.log(authResponse.accounts);
      response.json({
        error: false,
        accounts: authResponse.accounts,
        numbers: authResponse.numbers,
      });
      
      
      
      
      //database connection start
    //   console.log("test data"+authResponse.accounts[0].name);   
      
    //   var jsondata = authResponse.accounts;
    //   var values = [];
      
    //   for(var i=0; i< jsondata.length; i++)
    //     values.push([, jsondata[i].account_id, jsondata[i].balances, jsondata[i].mask, jsondata[i].official_name, jsondata[i].subtype, jsondata[i].type ] );
      
    //   connection.connect(function(err) {
    //     console.log("Connected!");
    //     connection.query('INSERT INTO accountsTableTest (id, account_id, balances, mask, official_name, subtype, type) VALUES ?', [values], function(err,result) {
    //             console.log("successful for insert");
    //       });
      
    //   connection.query("SELECT * FROM accountsTableTest", function (err, result, fields) {
    //     if (err) throw err;
    //      console.log("query successful");
    //      console.log(result);
    //  });
    //  });
      //database connnection end
    });
  });

  app.post('/goback', function(request, response) {
    console.log("going to google.com");
    return response.redirect('http://localhost:8100');
  });

// var user_id=1;
app.post('/item', function(request, response, next) {
  // Pull the Item - this includes information about available products,
  // billed products, webhook information, and more.
  client.getItem(ACCESS_TOKEN, function(error, itemResponse) {
    if (error != null) {
      console.log(JSON.stringify(error));
      return response.json({
        error: error
      });
    }

    // Also pull information about the institution
    client.getInstitutionById(itemResponse.item.institution_id, function(err, instRes) {
      if (err != null) {
        var msg = 'Unable to pull institution information from the Plaid API.';
        console.log(msg + '\n' + error);
        return response.json({
          error: msg
        });
      } else {
        response.json({
          item: itemResponse.item,
          institution: instRes.institution,
        });
      }
    });
  });
});


  app.post('/transactions', function(request, response, next) {
    // Pull transactions for the Item for the last 30 days
    var startDate = moment().subtract(30, 'days').format('YYYY-MM-DD');
    var endDate = moment().format('YYYY-MM-DD');

      user_id = request.params.user_id;
      console.log("plaid transactions user id: ", user_id);

      client.getTransactions(ACCESS_TOKEN, startDate, endDate, {
      count: 250,
      offset: 0,
    }, function(error, transactionsResponse) {
      if (error != null) {
        console.log(JSON.stringify(error));
        return response.json({
          error: error
        });
      }
      console.log('pulled ' + transactionsResponse.transactions.length + ' transactions');
      response.json(transactionsResponse);
      console.log(transactionsResponse);
      
            //database connection start            
            var jsondata = transactionsResponse.transactions;
            var values = [];
            
            for(var i=0; i< jsondata.length; i++)
              {
              if(jsondata[i].category != null)
              values.push([jsondata[i].account_id, jsondata[i].amount, jsondata[i].date, jsondata[i].name, jsondata[i].category[0],jsondata[i].category_id, user_id] );
              else
                {
                  values.push([jsondata[i].account_id, jsondata[i].amount, jsondata[i].date, jsondata[i].name, "other", jsondata[i].category_id,user_id]);
                }
              }
            console.log("values");

            connection.connect(function(err) {
                if (err) throw err;
              console.log("Connected!");
              connection.query('INSERT INTO transactionsTable (account_id, amount, date, name, category,category_id, user_id ) VALUES ?', [values], function(err,result) {
                if (err) throw err;
                console.log("successful for insert for transaction");
                });
            
            connection.query("SELECT * FROM transactionTableTest", function (err, result) {
              if (err) throw err;
               console.log("query successful");
               console.log(result);
           });
           });
            //database connnection end

    });
  });
  
  var server = app.listen(APP_PORT, function() {
    console.log('plaid-walkthrough server listening on port ' + APP_PORT);
  });
  
