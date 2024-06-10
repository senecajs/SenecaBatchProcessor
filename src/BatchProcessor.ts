/* Copyright © 2024 Seneca Project Contributors, MIT License. */

import Inks from 'inks'
import { Gubu } from 'gubu'

const ALL = '*'
const Types: Record<string, number> = {
  'Number': 1,
  'Boolean': 1,
  'String': 1,
  'Array': 1,
  'Object': 1
}

type BatchProcessorOptionsFull = {
  debug: boolean
  send: any
  where: any
}

export type BatchProcessorOptions = Partial<BatchProcessorOptionsFull>


// FEATURE: subsets of keys by dot separators.
class Match {
  all: boolean
  patrun: any
  
  constructor(patrun: any, all: any = null) {
    this.patrun = patrun
    this.all = all
  }
  
  set_all(all: boolean) {
    this.all = all
  }
  
  find(pattern: any) {
    return this.patrun.find(pattern)
  }
  
}

class Utility {

  static evaluateMessage(seneca: any, ctx: any, out: any, msg: any, body: any = null) {
    const Jsonic = seneca.util.Jsonic
    
    msg = Object.assign(
      typeof msg == 'string' ? Jsonic(msg) : { ...msg }, body)
    
    // console.log(i++, msg)

    let new_msg: any = {}
    for(let key in msg) {
      let type = msg[key].split('~').pop()
      let value = (Inks as any).evaluate(msg[key], { out, ctx }, { sep: '~' })
  
      if(null != value && Types[type]) {
        let validate = Gubu(eval(type))
        validate(value)
      }
  
      if(null != value) {
        new_msg[key] = value
      } else {
        new_msg[key] = msg[key]
      }
  
    }
    
    return new_msg
  }
  
  static async workflowRun(seneca: any, msg: any, config: any, options: any, results: any) {
    if(config.mode == null && 'async' == options.send.mode) {
      try {
        let result = await seneca.post(msg)
        results.push(result)
      } catch(error) {
        // handle error
        throw error
      }
    } else if(config.mode == null && 'sync' == options.send.mode) {
      seneca.act(msg, function(this: any, err: any, result: any) {
        if(null == err) {
          results.push(result)
        } else {
          // handle error
          throw err
        }
      })
    } else if(config.mode == 'async') {
      try {
        let result = await seneca.post(msg)
        results.push(result)
      } catch(error) {
        // handle error
        throw error
      }
    } else if(config.mode == 'sync' ) {
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

function BatchProcessor(this: any, options: BatchProcessorOptionsFull) {
  const seneca: any = this
  
  
  const Patrun = seneca.util.Patrun
  const Jsonic = seneca.util.Jsonic
  const Deep = seneca.util.deepextend
  const generate_id = seneca.util.Nid
  const BatchId = generate_id()
  
  let wheres: any = new Patrun({ gex: true })
  
  for(const message_whence in options.where) {
    let match = options.where[message_whence]?.match
    let pattern = Jsonic(message_whence)
    for(const message_pattern in match) {
      let workflow = match[message_pattern]
      // console.log(message_pattern, pattern)
      if(ALL == message_pattern) {
        let matchInst = wheres.find(pattern) || new Match(new Patrun({ gex: true }))
        matchInst.set_all(workflow)
        wheres.add(pattern, matchInst)
      } else {
        let matchInst = wheres.find(pattern) || new Match(new Patrun({ gex: true }))
        matchInst.patrun.add(Jsonic(message_pattern), workflow)
        wheres.add(pattern, matchInst)
        
      }
    
    }
  }

  async function process(this: any, seneca: any, ctx: any, out: any = {}) {
  
    const BatchMonitorEntry = ctx.BatchMonitorEntry$ || function(this: any, ...args: any) {}
    const whence = seneca.private$?.act?.msg
    
    // console.log(whence, wheres.list())
    let where = wheres.find(whence)
    let workflow: any = null
    let results = ctx.result$ = ctx.result$ || []
    
    
    // console.log(seneca.private$?.act?.msg)
    
    out = { ...out }

    out.run = out.run || ('R' + generate_id())
    out.batch = out.batch || ('B' + humanify())
    
    if(null == where) {
      throw new Error("whence not found!")
    }
    
    
    if(workflow = where.find(out)) {
      // let i = 0;
      const send = Array.isArray(workflow.send) ? workflow.send : [ workflow.send ]
      for(let config of send) {
        let { msg, body } = config
        let msg_evld = Utility.evaluateMessage(seneca, ctx, out, msg, body)
        
        // console.log(config, msg_evld)
        
        Utility.workflowRun(seneca, msg_evld, config, options, results)
        
      }
      
      // entry report
      if(null != workflow.entry) {
        let entry = workflow.entry
        entry = 'string' == typeof entry ? { state: entry } : entry
        BatchMonitorEntry(entry.state, entry.info || {})
        
      }
     
      // console.log(workflow, out)
    } else if(null != where.all) {
      workflow = where.all
      if(null != workflow.entry) {
        let entry = workflow.entry
        Gubu(String)(entry)
        BatchMonitorEntry(entry, { why:'batch-process-no-match' })
      }
    }
    
    
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
