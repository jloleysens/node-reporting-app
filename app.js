#! /usr/local/bin/node
/*
Created by: Jean-Louis Leysens
Email: jeanlouis@journeyapps.com
Created on: Tue Jan 17 15:46:03 SAST 2017
*/

var fetch = require('node-fetch');
var async = require('asyncawait/async');
var await = require('asyncawait/await');
var Promise = require('bluebird');
Getopt = require('node-getopt');
var config = require('./config.json');

var basic_auth_header = function(u, p) {
    return {
        Authorization: "Basic " + basicHash(u, p)
    };
};


getopt = new Getopt([
    ['o', 'output=ARG', 'The path to which to output files. Defaults to \'./\'.'],
    ['atms', 'atmstart=ARG', 'The start date of the ATM jobs'],
    ['atme', 'atmend=ARG', 'The end date of the ATM jobs'],
    ['abms', 'abmstart=ARG', 'The start date of the ABM jobs'],
    ['abme', 'abmend=ARG', 'The end date of the ABM jobs'],
    ['h', 'help', 'Display this help message']
]);

opt = getopt.parse(process.argv.slice(2));


var monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
];

var job_name = [
    "ABM",
    "ATM"
];

function init(){
    if(opt.options.help) return getopt.showHelp();

    console.log('Starting fetch requests...');
    batchifyDataRequests();
}

function batchifyDataRequests(){
    if(typeof skip === 'undefined') skip_abm = 0;
    if(typeof skip === 'undefined') skip_atm = 0;
    var atm_done = false;
    for(var i = 0; i < config.max_batch; i++){
    }
    fetchData(count, backend, skip)
        .then(function (data){ console.log("Data fetched."); })
        .catch(function(err){ console.log(err.message); });
}

function writeToCSV(file_name) {
}

var fetchData = async (function (count, backend, skip){
    var url = backend.base_url + "/job.json?limit=" + config.max_request +"&skip=" + skip;
    var options = { headers: basic_auth_header(backend.username, backend.password), method: 'get' };

    var data = fetch(url, options)
        .then(function (response){
            if(response) return response.json(); // Parse the Json
            else throw new Error("No response object.");
        })
        .then(function (json){
            return json;
        });
    return [await(data), count, backend, skip];
});

// var fetchCount = async (function (backend){
//     var url = backend.base_url + "/job/count.json";
//     var options = { headers: basic_auth_header(backend.username, backend.password), method: 'get' };
//
//     var count = fetch(url, options)
//         .then( function (response){
//             if(response) return response.json();
//             else throw new Error("No response object.");
//         })
//         .then( function(json){
//             return json.count;
//         });
//     return [await (count), backend];
// });

function basicHash(uname, pword){
    return new Buffer(uname + ":" + pword).toString('base64');
}

init();
