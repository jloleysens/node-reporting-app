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

var basic_auth_header = function(u, p) {
    return {
        Authorization: "Basic " + basicHash(u, p)
    };
};


getopt = new Getopt([
    ['o', 'output=ARG', 'The path to which to output files. Defaults to \'./\'.'],
    ['h', 'help', 'Display this help message']
]);

opt = getopt.parse(process.argv.slice(2));

function init(){
    // Config Stuff
    if(opt.options.help) return getopt.showHelp();
    var backends = require('./config.json').app_backends;

    for(var i = 0; i < backends.length; i++){
        if(typeof backends[i].base_url === 'undefined') continue;
        console.log('Fetching job data for: %s', backends[i].name);
        fetchCount(backends[i])
            .then(function(resp){
                console.log(resp[0] + ' jobs found...');
                batchifyDataRequests(resp[0], resp[1]);
            })
            .catch(function(err){ throw new Error(err.message); });
    }
}

function batchifyDataRequests(count, backend, skip){
    if(typeof skip === 'undefined') skip = 0;
    fetchData(count, backend, skip)
        .then(function (data){ console.log("Data fetched."); })
        .catch(function(err){ console.log(err.message); });
}

var fetchData = async (function (count, backend, skip){
    var url = backend.base_url + "/job.json?limit=500&skip=" + skip;
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

var fetchCount = async (function (backend){
    var url = backend.base_url + "/job/count.json";
    var options = { headers: basic_auth_header(backend.username, backend.password), method: 'get' };

    var count = fetch(url, options)
        .then( function (response){
            if(response) return response.json();
            else throw new Error("No response object.");
        })
        .then( function(json){
            return json.count;
        });
    return [await (count), backend];
});

function basicHash(uname, pword){
    return new Buffer(uname + ":" + pword).toString('base64');
}

init();
