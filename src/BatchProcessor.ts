/* Copyright © 2024 Seneca Project Contributors, MIT License. */

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



function evaluateMessage(seneca: any, ctx: any, out: any, msg: any, body: any = null) {
  const Jsonic = seneca.util.Jsonic
    
  msg = Object.assign(
    typeof msg == 'string' ? Jsonic(msg) : { ...msg }, body)
    
  // console.log(i++, msg)

  let new_msg: any = {}
  for(let key in msg) {
    let type = msg[key].split('~').pop()
    let value = (Inks as any).evaluate(msg[key], { out, ctx }, { sep: '~' })
  
    if(null != value && Types[type]) {
      if(value.constructor !== expr({ src: type, val: value })) {
        throw new TypeError("Invalid Type")
      }
    }
    
    new_msg[key] = null == value ? msg[key] : value
  
  }
    
  return new_msg
}
  
async function workflowRun(seneca: any, msg: any, config: any, results: any) {
  if(config.mode == Modes.ASYNC) {
    try {
      let result = await seneca.post(msg)
      results.push(result)
    } catch(error) {
      // handle error
      throw error
    }
  } else if(config.mode == Modes.SYNC) {
    seneca.act(msg, function(this: any, err: any, result: any) {
      if(null == err) {
        results.push(result)
      } else {
        // handle error
        throw err
      }
    })
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
  
  parsed_workflow['send'] = []
  
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
  
  let wheres: any = new Patrun({ gex: true })
  
  for(const message_whence in options.where) {
    let match: Match = (options.where[message_whence].match) as Match
    let pattern = Jsonic(message_whence)
    for(const message_pattern in match) {
      // console.log(message_pattern, pattern)
      console.log('match: ', match)
      let workflow: WorkFlow = match[message_pattern]
      let pat_out = ALL == message_pattern ? '' : Jsonic(message_pattern)
      let matcherInst = wheres.find(pattern) || new Matcher(new Patrun({ gex: true }))
      console.log('workflow: ', workflow)
      let parsed = parseWorkflow(workflow, options)
      console.log('parsed workflow: ')
      console.dir(parsed, { depth: null })
      matcherInst.add_pattern(pat_out, parsed)
      wheres.add(pattern, matcherInst)
    
    }
  }

  async function process(seneca: any, ctx: any, out: any = {}) {
  
    const BatchMonitorEntry = ctx.BatchMonitorEntry$ || function(...args: any) {}
    const whence = seneca.private$?.act?.msg
    
    // console.log(whence, wheres.list())
    let where = wheres.find(whence)
    let workflow: any = null
    let results = ctx.result$ = ctx.result$ || []
    
    out = { ...out }
    
    if(null == where) {
      throw new Error("whence not found!")
    }
    // console.log(where.find(out), out)
    
    if(workflow = where.find(out)) {
      // let i = 0;
      console.log(workflow)
      const send = workflow.send
      for(let config of send) {
        let { msg, body } = config
        let msg_evld = evaluateMessage(seneca, ctx, out, msg, body)
        
        // console.log(config, msg_evld)
        
        workflowRun(seneca, msg_evld, config, results)
        
      }
      
      // entry report
      if(null != workflow.entry) {
        let entry = workflow.entry
        
        entry = 'string' == typeof entry ? { state: entry } : entry
        
        if('fail' == entry.state) {
          BatchMonitorEntry(entry.state, entry.info || { why:'batch-process-no-match' })
        } else {
          BatchMonitorEntry(entry.state, entry.info || {})
        }
        
      }
     
      // console.log(workflow, out)
    } /*else if(workflow = where.find('')) {
      // workflow = where.all
      if(null != workflow.entry) {
        let entry = workflow.entry
        Gubu(String)(entry)
        BatchMonitorEntry(entry, { why:'batch-process-no-match' })
      }
    }
    */
    
    out.run = out.run || ('R' + generate_id())
    out.batch = out.batch || ('B' + humanify())
    
    
    return out
  }

  return {
    exports: {
      process
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
