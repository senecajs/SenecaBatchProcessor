# @seneca/config

> _Seneca Config_ is a plugin for [Seneca](http://senecajs.org)

Live configuration plugin for the Seneca framework.

Unlike static configuration, this plugin lets you store keyed
configuration in your deployed persistent storage so that you can
change it on the live system. This is useful for things like currency
exchange rates, feature flags, A/B testing etc.


[![npm version](https://img.shields.io/npm/v/@seneca/config.svg)](https://npmjs.com/package/@seneca/config)
[![build](https://github.com/senecajs/SenecaConfig/actions/workflows/build.yml/badge.svg)](https://github.com/senecajs/SenecaConfig/actions/workflows/build.yml)
[![Coverage Status](https://coveralls.io/repos/github/senecajs/SenecaConfig/badge.svg?branch=main)](https://coveralls.io/github/senecajs/SenecaConfig?branch=main)
[![Known Vulnerabilities](https://snyk.io/test/github/senecajs/SenecaConfig/badge.svg)](https://snyk.io/test/github/senecajs/SenecaConfig)
[![DeepScan grade](https://deepscan.io/api/teams/5016/projects/26547/branches/846930/badge/grade.svg)](https://deepscan.io/dashboard#view=project&tid=5016&pid=26547&bid=846930)
[![Maintainability](https://api.codeclimate.com/v1/badges/3e5e5c11a17dbfbdd894/maintainability)](https://codeclimate.com/github/senecajs/SenecaConfig/maintainability)

| ![Voxgig](https://www.voxgig.com/res/img/vgt01r.png) | This open source module is sponsored and supported by [Voxgig](https://www.voxgig.com). |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |

## Install

```sh
$ npm install @seneca/Config
```

## Quick Example

```js
seneca.use('Config', {})

const initRes = await seneca.post('sys:config,init:val,key:a,val:1')
// === { ok: true, key: 'a', val: 1, entry: { key: 'a', val: 1 } }

const getRes = await seneca.post('sys:config,get:val,key:a')
// === { ok: true, key: 'a', val: 1, entry: { key: 'a', val: 1 } }

const setRes = await seneca.post('sys:config,set:val,key:a,val:2')
// === { ok: true, key: 'a', val: 1, entry: { key: 'a', val: 2 } }

```

## More Examples

Review the [unit tests](test/Config.test.ts) for more examples.



<!--START:options-->


## Options

* `debug` : boolean
* `numparts` : number
* `canon` : object
* `init$` : boolean


<!--END:options-->

<!--START:action-list-->


## Action Patterns

* [sys:config,get:val](#-sysconfiggetval-)
* [sys:config,init:val](#-sysconfiginitval-)
* [sys:config,list:val](#-sysconfiglistval-)
* [sys:config,map:val](#-sysconfigmapval-)
* [sys:config,set:val](#-sysconfigsetval-)


<!--END:action-list-->

<!--START:action-desc-->


## Action Descriptions

### &laquo; `sys:config,get:val` &raquo;

Get a config value by key.


#### Parameters


* __key__ : _string_


----------
### &laquo; `sys:config,init:val` &raquo;

Initialise a config value by key (must not exist).


#### Parameters


* __key__ : _string_
* __existing__ : _boolean_ (optional, default: `false`)


----------
### &laquo; `sys:config,list:val` &raquo;

List config values by query.


#### Parameters


* __q__ : _object_ (optional, default: `{}`)


----------
### &laquo; `sys:config,map:val` &raquo;

Get a map of config values by key prefix (dot separated).


#### Parameters


* __prefix__ : _string_


----------
### &laquo; `sys:config,set:val` &raquo;

Set a config value by key (must exist).


#### Parameters


* __key__ : _string_


----------


<!--END:action-desc-->

## Motivation

## Support

## API

## Contributing

## Background
