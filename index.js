//Shopify Node.js
//https://ee0e4a04.ngrok.io/shopify?shop=vw-project.myshopify.com


const dotenv = require('dotenv').config();					//modules called
const express = require('express');
const app = express();
const crypto = require('crypto');
const cookie = require('cookie');
const nonce = require('nonce')();
const querystring = require('querystring');
const request = require('request-promise');
const bodyParser = require('body-parser');
var tableify = require('tableify');

var fs = require('fs');
const bluebird = require('bluebird');
const _ = require('lodash');


const apiKey = process.env.SHOPIFY_API_KEY;					//.env file me jo key store kiye the
const apiSecret = process.env.SHOPIFY_API_SECRET;
const scopes = 'read_products';
const forwardingAddress = "https://ee0e4a04.ngrok.io"; 
process.stdin.setEncoding('utf8');

app.listen(3000, () => {
  console.log('App listening on port 3000!');
});

//install route
app.get('/shopify', (req, res) => {
  const shop = req.query.shop;
  console.log(shop);
  if (shop) {
    const state = nonce();
    const redirectUri = forwardingAddress + '/shopify/callback';
    const installUrl = 'https://' + shop +
      '/admin/oauth/authorize?client_id=' + apiKey +
      '&scope=' + scopes +
      '&state=' + state +
      '&redirect_uri=' + redirectUri;

    res.cookie('state', state);
    res.redirect(installUrl);
  } else {
    return res.status(400).send('Missing shop parameter. Please add ?shop=vw-project.myshopify.com to your request');
  }
});


//callback route
app.get('/shopify/callback', (req, res) => {
  const { shop, hmac, code, state } = req.query;
  const stateCookie = cookie.parse(req.headers.cookie).state;

  if (state !== stateCookie) {
    return res.status(403).send('Request origin cannot be verified');
  }

  if (shop && hmac && code) {
    // Validate request is from Shopify
    const map = Object.assign({}, req.query);
    delete map['signature'];
    delete map['hmac'];
    const message = querystring.stringify(map);
    const providedHmac = Buffer.from(hmac, 'utf-8');
    const generatedHash = Buffer.from(
      crypto
        .createHmac('sha256', apiSecret)
        .update(message)
        .digest('hex'),
        'utf-8'
      );
    let hashEquals = false;

    try {
      hashEquals = crypto.timingSafeEqual(generatedHash, providedHmac)
    } catch (e) {
      hashEquals = false;
    };

    if (!hashEquals) {
      return res.status(400).send('HMAC validation failed');
    }

    //  permanent access token
    const accessTokenRequestUrl = 'https://' + shop + '/admin/oauth/access_token';
    const accessTokenPayload = {
      client_id: apiKey,
      client_secret: apiSecret,
      code,
    };

    request.post(accessTokenRequestUrl, { json: accessTokenPayload })
    .then((accessTokenResponse) => {
      const accessToken = accessTokenResponse.access_token;
      //Use access token to make API call to 'shop/product' endpoint
      const shopRequestUrl = 'https://' + shop + '/admin/products.json';


      

      const shopRequestHeaders = {
        'X-Shopify-Access-Token': accessToken,
      };



      request.get(shopRequestUrl, { headers: shopRequestHeaders })
      .then((shopResponse) => {
        
        var obj = JSON.parse(shopResponse);
        let data = JSON.stringify(obj);  
		fs.writeFileSync('obj-2.json', data);
        var css = fs.readFileSync('D:/shopify-express-application/style.css'); 
        var html = tableify(obj);
        res.write('<style>' + css + '</style>');
        res.write(html);
        
      	

      })
      
    })
    .catch((error) => {
      res.status(error.statusCode).send(error.error.error_description);
    });

  } 
});

