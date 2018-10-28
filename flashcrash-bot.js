/*setup: set api keys, decide on manual override for exchanges and symbols,
if testnet(see testnet-notes.txt) and change url in ./node_modules/ccxt/js/xxxxxx.js*/

"use strict";
//globals
var ccxt = require ('ccxt');
var exchanges = [];
var exchangeObj = {}; //need to be object, this is for non manual load
//console.log (ccxt.exchanges) // print all available exchanges


//load exchange objects
function loadExchanges(){ //manual override here to determine exchanges
    //define specific exchanges - manual load
    //let krakenExchange = new ccxt.kraken();
    //let bitfinexExchange = new ccxt.bitfinex();
    //exchanges.push(krakenExchange);
    //exchanges.push(bitfinexExchange);

    //below exchanges using testnet accounts
    //if testnet change url endpoint in js file. eg. bitmex.js, deribit.js, etc
    let bitmexExchange = new ccxt.bitmex({
        apiKey: 'API_KEY',
        secret: 'API_SECRET',
    });
    /*let geminiExchange = new ccxt.gemini({
        apiKey: 'API_KEY',
        secret: 'API_SECRET',
    });*/
    let deribitExchange = new ccxt.deribit({
        apiKey: 'API_KEY',
        secret: 'API_SECRET',
    });
    exchanges.push(bitmexExchange);
    //exchanges.push(geminiExchange);
    exchanges.push(deribitExchange);
    

    //or get all exchanges and push - DONT USE BELOW FOR NOW, THERE IS EXCHANGE WITH A MISSING PACKAGE
    //load all exchange names into array
    // for(var count=0; count<ccxt.exchanges.length; count++){
    //     exchanges.push(ccxt.exchanges[count]);
    // }
    /*must be object so it is associate array in the form obj.exchange, not array in form of arr[x],
    if you knew index position for an exchange, you would just make the exchange obj directly*/
    // for(var count = 0; count < exchanges.length; count++) {
    //     //below syntax will work
    //     //https://stackoverflow.com/questions/9854995/javascript-dynamically-invoke-object-method-from-string
    //     exchangeObj[exchanges[count]] = new ccxt[exchanges[count]](); 
    // }
}

//load market data for exchange objects
async function loadMarketsForExchanges(){
    //for manual override
    for(var index = 0; index < exchanges.length; index++){
        await exchanges[index].loadMarkets();    
    }

    //or for all exchanges autoload
    //value is the exchange object
    // Object.entries(exchangeObj).forEach(function([key, value]){
    //     //console.log(key, value.id)
    //     value.loadMarkets();
    // });
}

//return array of trading pairs for an exchange
function getAllSymbolsForExchange(exchange){
    var symbolArray = [];
    for (var symbol in exchange.markets) {
        //console.log(symbol)
        symbolArray.push(symbol);
    }
    return symbolArray;
}

//calc prices from 10% to 50% away from current price, push into array and return array
function calculateLimitOrderPrices(currentPrice){
    var orderArray= [];
    //may need to round below numbers to 1 decimal place, eg. 0.1, 0.5 based on exchange specifics
    var tenPercentOfCurrPrice = currentPrice*0.1;
    orderArray.push(tenPercentOfCurrPrice);
    var twentyPercentOfCurrPrice = currentPrice*0.2;
    orderArray.push(twentyPercentOfCurrPrice);
    var thirtyPercentOfCurrPrice = currentPrice*0.3;
    orderArray.push(thirtyPercentOfCurrPrice);
    var fourtyPercentOfCurrPrice = currentPrice*0.4;
    orderArray.push(fourtyPercentOfCurrPrice);
    var fiftyPercentOfCurrPrice = currentPrice*0.5;
    orderArray.push(fiftyPercentOfCurrPrice);
    /*console.log(tenPercentOfCurrPrice);
    console.log(twentyPercentOfCurrPrice);
    console.log(thirtyPercentOfCurrPrice);
    console.log(fourtyPercentOfCurrPrice);
    console.log(fiftyPercentOfCurrPrice);*/
    return orderArray;
}

//gets current price for specified exchange, and calls calc function
const getCurrentPriceforSymbol = async (exchange, symbol) => {
    //var mktPrice = await(exchange.fetchTicker('BTC/USD'));
    var mktPrice = await(exchange.fetchTicker(symbol));
    var currentPrice = mktPrice['last'];
    //console.log(currentPrice)
    var priceOrders = calculateLimitOrderPrices(currentPrice);
    //console.log(priceOrders[0]);
    return priceOrders;
}

//cancels all open orders for symbol on exchange
async function cancelOrdersForSymbol(exchange, symbol){
    try{
        var orders = await exchange.fetchOpenOrders(symbol);
        for(var index = 0; index < orders.length; index++){
            console.log(exchange.id, await exchange.cancelOrder(orders[index].id) +
            orders[index].id + " cancelled"); //production
            //console.log(orders[index].id);
        }
        return true;
    }catch(err){
        console.log("cancel here! "+err);
        return false;
    }
}

//places orders on specified exchange with array of prices
async function createOrdersOnExchange(exchange, symbol, priceArray){
    try{
        //buy 0.01 BTC for each specified price in array
        /*note that for leveraged products the quantity and price can be different.
        eg. bitmex 0.01 != 0.01BTC use 100 for example
        eg. bitmex min increment is 0.5 need to round off*/
        for(var index = 0; index < priceArray.length; index++){
            console.log(exchange.id, await exchange.createLimitBuyOrder(symbol, 100, 
            priceArray[index])); //production
            //console.log(exchange.id, symbol, priceArray[index]); //for testing
        }
        return true;
    }catch(err){
        console.log("placement here! "+err);
        return false;
    }
    
    //sell 1 BTC immediate at market price
    //console.log(exchange.id, await exchange.createMarketSellOrder(symbol, 1))

    // pass/redefine custom exchange-specific order params: type, amount, price or whatever
    // use a custom order type
    //exchange.createLimitSellOrder(symbol, 1, 10, { 'type': 'trailing-stop' })
}

//main loop logic
async function mainLogic(){
    for(var count = 0; count < exchanges.length; count++){ //each exchange
        var allSymbolsForExchange = getAllSymbolsForExchange(exchanges[count]);
        //manual override here if trading 1 symbol only eg btc
        /*if(exchanges[count].id == "bitmex"){
            var allSymbolsForExchange = "BTC/USD";
        }else if(exchanges[count].id == "deribit"){
            var allSymbolsForExchange = "BTC-PERPETUAL";
        } //etc etc*/
        //console.log(allSymbolsForExchange);
        for(var index = 0; index < allSymbolsForExchange.length; index++){ //each symbol
            /*error handling async, do not do function.then(result){...}.catch(error)
            it runs after loop completed losing loop index scope, await is sync*/
            var cancelOrdersForSymbolResult;
            try{
                cancelOrdersForSymbolResult = await cancelOrdersForSymbol(exchanges[count],
                allSymbolsForExchange[index]);
            }catch(error){
                console.log("result1 here! "+error);
            }

            var getCurrentPriceforSymbolResult;
            var createOrdersOnExchangeResult;
            if(cancelOrdersForSymbolResult == true){ //only continue if no open orders exist
                try{
                    getCurrentPriceforSymbolResult = await getCurrentPriceforSymbol(exchanges[count], 
                    allSymbolsForExchange[index])
                    //console.log(getCurrentPriceforSymbolResult);
                }catch(error){
                    console.log("result2 here! "+error);
                }
            
                try{
                    createOrdersOnExchangeResult = await createOrdersOnExchange(exchanges[count], 
                    allSymbolsForExchange[index], getCurrentPriceforSymbolResult);
                    if(createOrdersOnExchangeResult == true){
                        console.log("orders placed");
                    }else{
                        console.log("orders failed to place");
                    }
                }catch(error){
                    console.log("result3 here! "+error);
                }
            }else{
                console.log("order cancellation failed. open orders still exist")
            }
        }
    }
}

//loop to keep script running
function loopControl(){
    var counter = 0; //this controls how many iterations before process terminates
    var timeout = setInterval(function() {
        //console.log("here");
        //start logic loop
        mainLogic().then(function(result){
            console.log("loop complete " + counter);
        }).catch(function(error){
            console.log("loop failure! " + error);
        });

        counter++;
        if (counter > 20) { //function ends when iteration exceeds this many times(days, see number below)
            clearInterval(timeout);
        }
    //}, 10000); //this is 10 seconds, will run the above script every 10 seconds
    }, 86400000); //1 day
};

//entry point if not running at UTC 0000(midnight), just every day from whenever script starts
loadExchanges();
loadMarketsForExchanges().then(function(){
    //now start daily loop after loading objs needed
    loopControl();
}).catch(function(error){
    console.log("markets load failure! " + error);
});

/*
//entry point loop if running at UTC 0000(midnight)
setInterval(function(){
    var now = Date.now();
    var oneDayInMilliseconds = 86400000;

    //if remainder is 0, must be 1 full day
    if(now % oneDayInMilliseconds == 0){
        //start
        loadExchanges();
        loadMarketsForExchanges().then(function(){
            //now start logic loop after loading objs needed
            mainLogic();
        }).catch(function(error){
            console.log("markets load failure! " + error);
        });
    }else{
        console.log("not time");
    }
}, 1000); //1 sec
*/