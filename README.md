# @seneca/batch-processor

> _Seneca BatchProcessor_ is a plugin for [Seneca](http://senecajs.org)

INTRO

[![npm version](https://img.shields.io/npm/v/@seneca/batch-processor.svg)](https://npmjs.com/package/@seneca/batch-processor)
[![build](https://github.com/senecajs/SenecaBatchProcessor/actions/workflows/build.yml/badge.svg)](https://github.com/senecajs/SenecaBatchProcessor/actions/workflows/build.yml)
[![Coverage Status](https://coveralls.io/repos/github/senecajs/SenecaBatchProcessor/badge.svg?branch=main)](https://coveralls.io/github/senecajs/SenecaBatchProcessor?branch=main)
[![Known Vulnerabilities](https://snyk.io/test/github/senecajs/SenecaBatchProcessor/badge.svg)](https://snyk.io/test/github/senecajs/SenecaBatchProcessor)
[![DeepScan grade](https://deepscan.io/api/teams/5016/projects/26547/branches/846930/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=5016&pid=26547&bid=846930)
[![Maintainability](https://api.codeclimate.com/v1/badges/3e5e5c11a17dbfbdd894/maintainability)](https://codeclimate.com/github/senecajs/SenecaBatchProcessor/maintainability)

| ![Voxgig](https://www.voxgig.com/res/img/vgt01r.png) | This open source module is sponsored and supported by [Voxgig](https://www.voxgig.com). |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |

## Install

```sh
$ npm install @seneca/batch-processor
```


## Quick Example

```js

// Seneca setup script:

seneca.use('BatchProcessor', {
  send: {  
    mode: 'async', // wait for transition, global setting
  },
  where: {
    'aim:foo,color:red': {
      match: { // on out
        'ok:true': {
          send: [  // zero or more next messages
            {
              msg: {
                aim: 'bar',
                color: 'blue',
                planet: 'out~planet' // dot path ref (see npm package `inks` .evaluate)
                order: 'ctx~place.order~Number' // Gubu validation expression
              }   
            },
            {
              mode: 'sync', // use .act, don't await
              msg: 'aim:bar,color:green,planet:out~planet',
              body: { // msg has precedence
                order: 'ctx~place.order~Number'
              }
            }
          ]
        }
      }
    }
  }
})


// Within aim:foo,color:red action script:

const process = seneca.export('BatchProcessor/process')

let out = {ok:true,planet:'mars'}
let ctx = {place:{order:1}} // for data not returned by message action
out = await process(seneca, ctx, out)
// send = [{aim:bar,color:blue,planet:mars,order:1}, {aim:bar,color:green,planet:mars,order:1}]
// out = {ok:true,planet:'mars',batch:BATCHID,run:RUNID}

```

The message send operations are executed by the plugin with code equivalent to:

```js
await seneca.post({aim:'bar',color:'blue',planet:'mars',order:1})
seneca.act({aim:bar,color:green,planet:mars,order:1})
```


## More Examples


```js

// Seneca setup script:

seneca
.use('BatchMonitor', {...})
.use('BatchProcessor', {
  send: {  
    mode: 'async', // wait for transition, global setting
  },
  where: {
    'aim:foo,color:red': {
      match: {
        '*': { // catch all if no other patterns match
          // Create BatchMonitor entry if ctx.BatchMonitorEntry$ defined 
          entry: 'fail' // entry state, entry.info={why:'batch-process-no-match'}
        },
        'ok:false': {
          entry: { state: 'fail', info: { why: 'out~why' } },
          send: { // if single msg, no array needed
            // ctx has original message in msg$
            // out~ means entire contents of out object
            msg: 'aim:monitor,fail:msg,msg:ctx~msg$,out:out~'
          } 
        },
        'ok:true': { // matches are in same Patrun set, so usual Seneca pattern rules apply
          entry: 'done', // only created after all msgs sent
          send: [  // zero or more next messages
            {
              msg: {
                aim: 'bar',
                color: 'blue',
                planet: 'out~planet' // dot path ref
                order: 'ctx~place.order~Number' // Gubu validation expression
              }   
            },
            {
              mode: 'sync', // use .act, don't await
              msg: 'aim:bar,color:green,planet:out~planet',
              body: { // msg has precedence
                order: 'ctx~place.order~Number'
              }
            }
          ]
        }
      }
    }
  }
})


// Within aim:foo,color:red action script:

const process = seneca.export('BatchProcessor/process')
const bme = seneca.BatchMonitor(...).entry(...)

let out = {ok:true,planet:'mars'}
let ctx = {place:{order:1},BatchMonitorEntry$:bme}
out = await process(seneca, ctx, out)
// send = [{aim:bar,color:blue,planet:mars,order:1}, {aim:bar,color:green,planet:mars,order:1}]
// out = {ok:true,planet:'mars',batch:BATCHID,run:RUNID}

// The ctx object is used for returning additional information, such as send msg results.
// ctx = {place:{order:1}, result$:[{msg:,out:,bgn:,end:,dur:},...]}

```




Review the [unit tests](test/BatchProcessor.test.ts) for more examples.



<!--START:options-->


## Options

* `debug` : boolean
* `send` : object
* `where` : object
* `init$` : boolean


<!--END:options-->

<!--START:action-list-->



<!--END:action-desc-->

## Motivation

## Support

## API

## Contributing

## Background
