#! /usr/local/bin/node
/*
Created by: Jean-Louis Leysens
Email: jeanlouis@journeyapps.com
Created on: Tue Jan 17 15:46:03 SAST 2017
*/


Date.prototype.yyyymmdd = function() {
  var mm = this.getMonth() + 1; // getMonth() is zero-based
  var dd = this.getDate();

  return [this.getFullYear(),
          (mm>9 ? '' : '0') + mm,
          (dd>9 ? '' : '0') + dd
         ].join('-');
};

var fetch = require('node-fetch');
var fs = require('fs');
var csvWriter = require('csv-write-stream');
var async = require('async');
var Promise = require('bluebird');
Getopt = require('node-getopt');
var config = require('./config.json');

getopt = new Getopt([
    ['o', 'output=ARG', 'The path to which to output files. Defaults to \'./\'.'],
    ['s', 'startdate=ARG', 'The end date (YYYY-MM) of the ATM jobs'],
    ['e', 'enddate=ARG', 'The start date (YYYY-MM) of the ATM jobs'],
    ['j', 'jobtype=ARG', 'Either ATM or ABM'],
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

var jobs = [
    "ABM",
    "ATM"
];

function init(){
    if(opt.options.help) return getopt.showHelp();
    if(
        opt.options.startdate   &&
        opt.options.enddate     &&
        opt.options.jobtype
    ){
        if(new Date(opt.options.startdate) < new Date(opt.options.enddate)){
            var results = {};
            var dates = getArrayOfDates(
                new Date(opt.options.startdate),
                new Date(opt.options.enddate)
            );
            console.log('Starting fetch requests...');
            return makeRequests( jobs.indexOf(opt.options.jobtype), dates );

        } else console.log("Start date must be before end date.");

    } else{
        console.log("Please provide all of the required arguments.");
    }
}

function getArrayOfDates(start_date, end_date, date_array){
    if(typeof date_array === 'undefined') date_array = [];
    if(start_date < end_date){
        date_array.push(start_date.yyyymmdd());
        return getArrayOfDates(
            new Date( start_date.getFullYear(), start_date.getMonth() + 1, start_date.getDate(), 2 ),
            end_date,
            date_array
        );
    } else return date_array;
}

function makeRequests(job_type, date_arr){
    var promise_arr = [];
    console.log("Fetching Data...");
    async.each(date_arr,
        function(date, callback){
            promise_arr.push(
                fetchData(date, job_type)
            );
        });
    Promise.all(promise_arr).then(function(responses) { 
        console.log("Fetched all data.");
        writeToCSV(responses);
    });
}

function writeToCSV(data) {
    console.log("Writing to file...");
    var writer = csvWriter({
        headers: ["date", "count"]
    });
    var path = opt.options.output || "./output_" + opt.options.jobtype + "_" + new Date().valueOf() + ".csv";
    writer.pipe(
        fs.createWriteStream(
            path,
            { flags: 'a+' }
        )
    );
    data.forEach(function (datum){
        writer.write([
            datum.date,
            datum.count
        ]);
    });
    writer.end();
    console.log("Data points written to file.");
    console.log("Script completed.");
}

function fetchData(start_date, job_type) {
    var end_of_month = new Date(start_date);
    end_of_month = new Date(
        end_of_month.getFullYear(),
        end_of_month.getMonth() + 1,
        end_of_month.getDate()
    );
    var url = config.app_backend.base_url +
        "/job/count.json?query[created_at.gte]=" + start_date +
        "&query[created_at.lt]=" + end_of_month.yyyymmdd() +
        "&query[asset_type]=" + job_type;
    var options = { headers: basicHash(config.app_backend.username, config.app_backend.password), method: 'get' };
    return fetch(url, options)
        .then(function (response){
            if(response) return response.json(); // Parse the Json
            else throw new Error("No response object.");
        })
        .then(function (json){
            json.date = start_date;
            return json;
        });
}

function basicHash(uname, pword){
    return {
        Authorization: 'Basic ' + new Buffer(uname + ":" + pword).toString('base64')
    };
}

init();
