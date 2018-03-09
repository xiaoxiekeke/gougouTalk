'use strict'

var queryString = require('query-string')
var _ = require('lodash')
var Mock=require('mockjs')
var config=require('./config')
var request = {}


request.get=function(url,params){
  if(params){
    url += '?' +queryString.stringify(params)
  }
  return fetch(url)
    .then((response)=>response.json())
    .then((response)=>Mock.mock(response))
}

request.post=function(url,body){
  var options = _.extend(config.header,{
    body:JSON.stringify(body)
  })
  console.log(options)
  console.log(url)
  return fetch(url,options)
    .then((response)=>response.json())
    .catch(function(err){
      throw err;
    })
}

module.exports=request
