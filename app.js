#! /usr/local/bin/node
/*
Created by: Jean-Louis Leysens
Email: jeanlouis@journeyapps.com
Created on: Tue Jan 17 15:46:03 SAST 2017
*/


const fetch = require('node-fetch');
const fs = require('fs');
const csvWriter = require('csv-write-stream');
const async = require('async');
const Promise = require('bluebird');
const Getopt = require('node-getopt');
const config = require('./config.json');

const getopt = new Getopt([
  ['o', 'output=ARG', 'The path to which to output files. Defaults to \'./\'.'],
  ['s', 'startdate=ARG', 'The end date (YYYY-MM) of the ATM jobs'],
  ['e', 'enddate=ARG', 'The start date (YYYY-MM) of the ATM jobs'],
  ['j', 'jobtype=ARG', 'Either ATM or ABM'],
  ['h', 'help', 'Display this help message']
]);

const opt = getopt.parse(process.argv.slice(2));

const jobs = [
  'ABM',
  'ATM'
];

function fetchData(start_date, job_type) {
  var options = { headers: basicHash(config.app_backend.username, config.app_backend.password), method: 'get' };
  var split_start = start_date.split('-');
  var end_of_month = new Date(
    parseInt(split_start[0], 10),
    parseInt(split_start[1], 10) + 1,
    parseInt(split_start[2], 10)
  );
  var url = config.app_backend.base_url +
    '/job/count.json?query[created_at.gte]=' + start_date +
    '&query[created_at.lt]=' + end_of_month.yyyymmdd() +
    '&query[asset_type]=' + job_type;
  return fetch(url, options)
    .then((response) => {
      if (response) return response.json(); // Parse the Json
      throw new Error('No response object.');
    })
    .then((json) => {
      json.date = start_date;
      return json;
    });
}

function writeToCSV(data) {
  console.log('Writing to file...');

  const writer = csvWriter({ headers: ['date', 'count'] });

  const path = opt.options.output || './output_' + opt.options.jobtype + '_' + new Date().valueOf() + '.csv';

  writer.pipe(
    fs.createWriteStream(path, { flags: 'a+' }));

  data.forEach((datum) => {
    writer.write([datum.date, datum.count]);
  });

  // Close the write stream and sign off
  writer.end();
  console.log('Data points written to file.');
  console.log('Script completed.');
}

function makeRequests(job_type, date_arr) {
  var promise_arr = [];

  console.log('Fetching Data...');

  // Async async-ness!
  async.each(date_arr, (date) => {
    promise_arr.push(fetchData(date, job_type));
  });

  // Wait for all fetches to finish
  Promise.all(promise_arr)
    .then((responses) => {
      console.log('Fetched all data.');
      writeToCSV(responses);
    });
}

function basicHash(uname, pword) {
  return {
    Authorization: 'Basic ' + new Buffer(uname + ':' + pword).toString('base64')
  };
}

Date.prototype.yyyymmdd = function() {
  var mm = this.getMonth() + 1; // getMonth() is zero-based
  var dd = this.getDate();

  return [this.getFullYear(),
   (mm > 9 ? '' : '0') + mm,
   (dd > 9 ? '' : '0') + dd
  ].join('-');
};

function getArrayOfDates(start_date, end_date, date_array) {
  if (typeof date_array === 'undefined') date_array = [];

  if (start_date < end_date) {
    date_array.push(start_date.yyyymmdd());
    return getArrayOfDates(
      new Date(start_date.getFullYear(), start_date.getMonth() + 1, start_date.getDate(), 2),
      end_date,
      date_array
    );
  }
  return date_array;
}

function init() {
  if (opt.options.help) return getopt.showHelp();
  if (
      opt.options.startdate &&
      opt.options.enddate &&
      opt.options.jobtype
  ) {
    if (new Date(opt.options.startdate) < new Date(opt.options.enddate)) {
      const dates = getArrayOfDates(
          new Date(opt.options.startdate),
          new Date(opt.options.enddate)
      );
      console.log('Starting fetch requests...');
      return makeRequests(jobs.indexOf(opt.options.jobtype), dates);
    }
    return console.log('Start date must be before end date.');
  }
  return console.log('Please provide all of the required arguments.');
}


init();
