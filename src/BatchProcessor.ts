/* Copyright © 2025 Seneca Project Contributors, MIT License. */

import Inks from 'inks'
import { Gubu } from 'gubu'

const {
  expr
} = Gubu

const ALL = '*'
const Types: Record<string, number> = {
  'Number': 1,
  'Boolean': 1,
  'String': 1,
  // 'Array': 1,
  // 'Object': 1
}

const Modes: Record<string, number> = {
  SYNC: 0,
  ASYNC: 1
}

type WorkFlow = {
  entry?: any
  send?: Array<any> | Object
}

type Match = Record<string, WorkFlow>

type BatchProcessorOptionsFull = {
  debug: boolean
  send: {
    mode: string
  }
  where: Record<string, Match>
  generate_id?: Function
}

export type BatchProcessorOptions = Partial<BatchProcessorOptionsFull>


// FEATURE: subsets of keys by dot separators.
class Matcher {
  patrun: any
  
  constructor(patrun: any) {
    this.patrun = patrun
  }
  
  find(pattern: any) {
    return this.patrun.find(pattern)
  }
  
  add_pattern(pattern: any, item: any) {
    return this.patrun.add(pattern, item)
  }
  
}
  

function humanify(when?: number, flags: {
  parts?: boolean
  terse?: boolean
} = {}) {
  const d = when ? new Date(when) : new Date()
  const iso = d.toISOString()

  if (flags.parts) {
    let parts = iso.split(/[-:T.Z]/).map(s => +s)
    let i = 0
    let out: any = {
      year: parts[i++],
      month: parts[i++],
      day: parts[i++],
      hour: parts[i++],
      minute: parts[i++],
      second: parts[i++],
      milli: parts[i++],
    }
    if (flags.terse) {
      out = {
        ty: out.year,
        tm: out.month,
        td: out.day,
        th: out.hour,
        tn: out.minute,
        ts: out.second,
        ti: out.milli,
      }
    }
    return out
  }

  return +(iso.replace(/[^\d]/g, '').replace(/\d$/, ''))
}

function determineMode(config: any, options: BatchProcessorOptionsFull) {
  if(config.mode == null && 'async' == options.send.mode || 'async' == config.mode) {
    config.mode = Modes.ASYNC
  } else if(config.mode == null && 'sync' == options.send.mode || 'sync' == config.mode) {
    config.mode = Modes.SYNC
  }
}

function parseWorkflow(workflow: WorkFlow, options: BatchProcessorOptionsFull) {
  let parsed_workflow: any = {}
  
  parsed_workflow.send = []
  
  for(let key in workflow) {
    // let workflow_config: any = parsed_workflow[key] = {}
    
    if('send' == key) {
      let send = parsed_workflow[key] = parsed_workflow[key] || []
      let config = workflow[key]
      if(!Array.isArray(config) 
        && 'object' == typeof config) {
        let pconfig = { ...config }
        determineMode(pconfig, options)
        
        send.push(pconfig)
      } else if(Array.isArray(config)) {
        for(let obj of config) {
          let child_config = { ...obj }
          determineMode(child_config, options)
          // console.log(child_config)
          
          send.push(child_config)
        }
        
      }
    } else if('entry' == key) {
      // process entry
      parsed_workflow[key] = !('object' == typeof workflow[key]) 
        ? workflow[key] : { ...workflow[key] }
    }
    
    
  }
  
  return parsed_workflow
}

function BatchProcessor(this: any, options: BatchProcessorOptionsFull) {
  const seneca: any = this
  
  
  const Patrun = seneca.util.Patrun
  const Jsonic = seneca.util.Jsonic
  const Deep = seneca.util.deepextend
  const generate_id = options.generate_id || seneca.util.Nid
  const BatchId = generate_id()
  
  function evaluateMessage(ctx: any, out: any, msg: any, body: any = null) {
    
    msg = Object.assign(
      typeof msg == 'string' ? Jsonic(msg) : { ...msg }, body)
    
    // console.log(i++, msg)

    let new_msg: any = {}
    for(let key in msg) {
      let type = msg[key].split('~').pop()
      let value = (Inks as any).evaluate(msg[key], { out, ctx }, { sep: '~' })
  
      if(null != value && Types[type]) {
        // console.log(value.constructor, [ expr({ src: type, val: value }).t ] )
        if(typeof value !== (expr({ src: type, val: value }) as any).t) {
          throw new TypeError("Invalid Type")
        }
      }
    
      new_msg[key] = null == value ? msg[key] : value
  
    }
    
    return new_msg
  }
  
  async function workflowRun(seneca: any, config: any, results: any) {
    if('post' == config.type) {
      try {
        let result = await seneca.post(config.msg)
        results.push(result)
      } catch(error) {
        // handle error
        throw error
      }
    } else if('act' == config.type) {
      seneca.act(config.msg, function(this: any, err: any, result: any) {
        if(null == err) {
          results.push(result)
        } else {
          // handle error
          throw err
        }
      })
    }
      
  }
  
  
  let wheres: any = new Patrun({ gex: true })
  // Prepare/Preprocess config
  for(const message_whence in options.where) {
    let match: Match = (options.where[message_whence].match) as Match
    let pattern = Jsonic(message_whence)
    for(const message_pattern in match) {
      // console.log(message_pattern, pattern)
      // console.log('match: ', match)
      let workflow: WorkFlow = match[message_pattern]
      let pat_out = ALL == message_pattern ? '' : Jsonic(message_pattern)
      let matcherInst = wheres.find(pattern) || new Matcher(new Patrun({ gex: true }))
      // console.log('workflow: ', workflow)
      let parsed = parseWorkflow(workflow, options)
      // console.log('parsed workflow: ')
      // console.dir(parsed, { depth: null })
      matcherInst.add_pattern(pat_out, parsed)
      wheres.add(pattern, matcherInst)
    
    }
  }
  
  function preprocess(seneca: any, ctx: any, out: any = {}) {
    const BatchMonitorEntry = ctx.BatchMonitorEntry$ || function(...args: any) {}
    
    const whence = seneca.private$?.act?.msg
    let results = ctx.result$ = ctx.result$ || []
    
    // console.log(whence, wheres.list())
    let where = wheres.find(whence)
    let workflow: any = null
    let output_workflow: any = {
      whence,
      entry: { state: 'done', info: {} },
      send: []
    }
    
    out = { ...out }
    
    if(null == where) {
      throw new Error("whence not found!")
    }
    // console.log(where.find(out), out)
    
    if(workflow = where.find(out)) {
      // entry report
      if(null != workflow.entry) {
        let entry = workflow.entry
        
        entry = 'string' == typeof entry ? { state: entry } : entry
        
        let info = null != entry.info ? 
          evaluateMessage(ctx, out, entry.info) : null
        
        output_workflow.entry = {
          state: entry.state,
          info: 
            info || ('fail' === entry.state ? { why: 'batch-process-no-match' } : {})
        }
        
        
      }
      
      const send = workflow.send
      
      for(let config of send) {
        let { msg, body } = config
        let msg_evld = evaluateMessage(ctx, out, msg, body)
        
        // console.log('preprocess: ', config, msg_evld)
        // seneca.private$.actrouter.find(msg_evld)
        
        output_workflow.send.push({
          msg: msg_evld,
          type: Modes.ASYNC == config.mode ? 'post' : 'act',
          run: Modes.ASYNC == config.mode ?
            (async function() {
              try {
                let result = await seneca.post(config.msg)
                results.push(result)
              } catch(error) {
                // handle error
                throw error
              }
            }) :
            (function () {
              seneca.act(config.msg, function(this: any, err: any, result: any) {
                if(null == err) {
                  results.push(result)
                } else {
                  // handle error
                  throw err
                }
              })
            })
          
        })
        
        // workflowRun(seneca, msg_evld, config)
      }
     
      // console.log(workflow, out)
    }
    
    output_workflow.run = async function() {
      let entry = output_workflow.entry
    
      for(let { run } of output_workflow.send) {
        await run()
      }
      
      BatchMonitorEntry(entry.state, entry.info)
      
      out.run = out.run || ('R' + generate_id())
      out.batch = out.batch || ('B' + humanify())
      
      return out
    }
    
    // console.log('preprocess: ')
    // console.dir(output_workflow, { depth: null })
    
    return output_workflow
  }

  async function process(workflowExec: any, ctx: any, out: any = {}) {
  
    const BatchMonitorEntry = ctx.BatchMonitorEntry$ || function(...args: any) {}
    const { whence, entry, send } = workflowExec
    
    // console.log(whence, wheres.list())
    let where = wheres.find(whence)
    let results = ctx.result$ = ctx.result$ || []
    
    out = { ...out }
    
    if(null == where) {
      throw new Error("whence not found!")
    }
    // console.log(where.find(out), out)
    
    for(let config of send) {
      await workflowRun(seneca, config, results)
    }
    
    BatchMonitorEntry(entry.state, entry.info)
    
    out.run = out.run || ('R' + generate_id())
    out.batch = out.batch || ('B' + humanify())
     
    return out
  }

  return {
    exports: {
      process,
      preprocess
    }
  }
}


// Default options.
const defaults: BatchProcessorOptionsFull = {
  debug: false,
  send: {
    mode: 'async'
  },
  where: {},
}


Object.assign(BatchProcessor, { defaults })

export default BatchProcessor

if ('undefined' !== typeof module) {
  module.exports = BatchProcessor
}
