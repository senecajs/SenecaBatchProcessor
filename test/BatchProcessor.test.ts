/* Copyright © 2024 Seneca Project Contributors, MIT License. */

import Seneca from 'seneca'
// import SenecaMsgTest from 'seneca-msg-test'
// import { Maintain } from '@seneca/maintain'

import BatchProcessorDoc from '../src/BatchProcessorDoc'
import BatchProcessor from '../src/BatchProcessor'

import BatchMonitor from '@seneca/batch-monitor'

describe('BatchProcessor', () => {
  test('load-plugin', async () => {
    expect(BatchProcessorDoc).toBeDefined()
    const seneca = Seneca({ legacy: false })
      .test()
      .use('promisify')
      .use('entity')
      .use(BatchProcessor)
    await seneca.ready()
    expect(seneca.export('BatchProcessor/process')).toBeDefined()
    expect(seneca.export('BatchProcessor/preprocess')).toBeDefined()
    await seneca.close()
  })

  test('basic', async () => {
    const seneca = makeSeneca()
    await seneca.ready()
    await seneca.close()
  })
  
  test('quick setup', async () => {
    const seneca = makeSeneca({
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
                    planet: 'out~planet', // dot path ref (see npm package `inks` .evaluate)
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
    await seneca.ready()
    
    const process = seneca.export('BatchProcessor/process')
    const preprocess = seneca.export('BatchProcessor/preprocess')
    
    let out, ctx
    
    seneca.message('aim:foo,color:red', async function(msg) {
      out = { ok: true, planet: 'mars' }
      ctx = { place: { order: 1 } }
      
      let execOrder = preprocess(this, ctx, out)
      
      return { execOrder, }
      // console.log(out, state, ctx)
    })
    
    let { execOrder } = await seneca.post('aim:foo,color:red')
    out = await process(execOrder, ctx, out)
    
    await wait(111)
    
    // console.dir(execOrder, { depth: null })
    expect(execOrder).toEqual({
      whence: {
        aim: 'foo',
        color: 'red',
      },
      entry: {
        state: 'done',
        info: {}
      },
      send: [
        {
          msg: { aim: 'bar', color: 'blue', planet: 'mars', order: 1 },
          type: 'post'
        },
        {
          msg: { aim: 'bar', color: 'green', planet: 'mars', order: 1 },
          type: 'act'
        }
      ]
    })
    
    expect(ctx.result$).toEqual([
      {
        ok: true,
        whence: {
          aim: 'bar',
          color: 'blue'
        }
      },
      {
        ok: true,
        whence: { 
          aim: 'bar',
          color: 'green'
        } 
      }
    ])
    
    expect(out.run).toBeDefined()
    expect(out.batch).toBeDefined()
  
  })
  

  describe('entry state test', () => {
    let opts = {
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
              entry: {
                state: 'fail',
                info: {
                  why: 'out~why'
                }
              },
              send: { // if single msg, no array needed
                // ctx has original message in msg$
                // out~ means entire contents of out object
                msg: 'aim:monitor,fail:msg,msg:ctx~msg$,out:out~'
              }
            },
            'ok:true': { // matches are in same Patrun set, so usual Seneca pattern rules apply
              entry: 'done', // only created after all msgs sent
              send: [ // zero or more next messages
                {
                  msg: {
                    aim: 'bar',
                    color: 'blue',
                    planet: 'out~planet', // dot path ref
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
    }
    
    test('blank test', async () => {})
    
    test('state: "done"', async () => {
      const seneca = makeSeneca(opts)
      await seneca.ready()
    
      const process = seneca.export('BatchProcessor/process')
      const preprocess = seneca.export('BatchProcessor/preprocess')
      let batch = seneca.BatchMonitor('b0', 'r0')
      
      let out, ctx
    
      seneca.message('aim:foo,color:red', async function(msg) {
        let bme = await batch.entry('episode', 'ingest', 'e0', { podcast_id: 'p0' })
    
        out = { ok: true, planet: 'mars' }
        ctx = { place: { order: 1 }, BatchMonitorEntry$: bme }
        
        let execOrder = preprocess(this, ctx, out)
        
        return { execOrder, }
        // console.log(out, ctx, state)
      })
      
      let { execOrder } = await seneca.post('aim:foo,color:red')
      // console.dir(execOrder, {depth: null})
      
      expect(execOrder).toEqual({
        whence: {
          aim: 'foo',
          color: 'red',
        },
        entry: {
          state: 'done',
          info: {}
        },
        send: [
          {
            msg: { aim: 'bar', color: 'blue', planet: 'mars', order: 1 },
            type: 'post'
          },
          {
            msg: { aim: 'bar', color: 'green', planet: 'mars', order: 1 },
            type: 'act'
          }
        ]
      })
      
      out = await process(execOrder, ctx, out)
      
      await wait(111)
      
      let report = await batch.report('episode', { podcast_id: 'p0' })
    
      console.log(report.format())
      
      // await wait(111)
      
      expect(report.td.line.e0).toBeTruthy()
      expect(report.td.line.e0.step.ingest.state).toEqual('done')
      expect(ctx.result$).toEqual([
        {
          ok: true,
          whence: {
            aim: 'bar',
            color: 'blue'
          }
        },
        {
          ok: true,
          whence: { 
            aim: 'bar',
            color: 'green'
          } 
        }
      ])
      expect(out.run).toBeDefined()
      expect(out.batch).toBeDefined()
    
    })
    
    
    test('state: "fail"', async () => {
      const seneca = makeSeneca(opts)
      await seneca.ready()
    
      const process = seneca.export('BatchProcessor/process')
      const preprocess = seneca.export('BatchProcessor/preprocess')
      let batch = seneca.BatchMonitor('b0', 'r0')
      
      let out, ctx
    
      seneca.message('aim:foo,color:red', async function(msg) {
        let bme = await batch.entry('episode', 'ingest', 'e0', { podcast_id: 'p0' })
    
        out = { ok: false, why: 'failed' }
        ctx = { msg$: 'failed', BatchMonitorEntry$: bme }
        
        let execOrder = preprocess(this, ctx, out)
        
        return { execOrder, }
        // console.log(out, ctx, state)
      })
      
      let { execOrder } = await seneca.post('aim:foo,color:red')
      // console.dir(execOrder, {depth: null})
      
      expect(execOrder).toEqual({
        whence: {
          aim: 'foo',
          color: 'red',
        },
        entry: {
          state: 'fail',
          info: {
            why: 'failed'
          }
        },
        send: [
          {
            msg: {
              aim: 'monitor',
              fail: 'msg',
              msg: 'failed',
              out: { ok: false, why: 'failed' } 
            },
            type: 'post'
          }
        ]
      })
      
      out = await process(execOrder, ctx, out)
      
      await wait(111)
      
      let report = await batch.report('episode', { podcast_id: 'p0' })
    
      console.log(report.format())
      
      // await wait(111)
      
      expect(report.td.line.e0).toBeTruthy()
      expect(report.td.line.e0.step.ingest.state).toEqual('fail')
      expect(ctx.result$).toEqual([
        {
          ok: false,
          whence: {
            aim: 'monitor'
          }
        }
      ])
      expect(out.run).toBeDefined()
      expect(out.batch).toBeDefined()
    
    })
    

    test('match "*"', async () => {
      const seneca = makeSeneca(opts)
      await seneca.ready()
    
      const process = seneca.export('BatchProcessor/process')
      const preprocess = seneca.export('BatchProcessor/preprocess')
      let batch = seneca.BatchMonitor('b0', 'r0')
      
      let out, ctx
    
      seneca.message('aim:foo,color:red', async function(msg) {
        let bme = await batch.entry('episode', 'ingest', 'e0', { podcast_id: 'p0' })
    
        out = { nomatch: null }
        ctx = { msg$: 'failed', BatchMonitorEntry$: bme }
        
        let execOrder = preprocess(this, ctx, out)
        
        return { execOrder, }
        // console.log(out, ctx, state)
      })
      
      let { execOrder } = await seneca.post('aim:foo,color:red')
      // console.dir(execOrder, {depth: null})
      
      expect(execOrder).toEqual({
        whence: {
          aim: 'foo',
          color: 'red',
        },
        entry: {
          state: 'fail',
          info: {
            why: 'batch-process-no-match'
          }
        },
        send: []
      })
      
      out = await process(execOrder, ctx, out)
      
      await wait(111)
      
      let report = await batch.report('episode', { podcast_id: 'p0' })
    
      console.log(report.format())
      
      // await wait(111)
      
      expect(report.td.line.e0).toBeTruthy()
      expect(report.td.line.e0.step.ingest.state).toEqual('fail')
      expect(ctx.result$.length).toEqual(0)
      
      expect(out.run).toBeDefined()
      expect(out.batch).toBeDefined()
       
    })
     
      
  })


})

async function wait(t: number = 11) {
  return new Promise((r) => setTimeout(r, t))
}


function makeSeneca(opts: any = {}) {
  const seneca = Seneca({ legacy: false })
    .test()
    .use('promisify')
    .use('entity')
    .use('entity-util', { when: { active: true } })
    .use(BatchProcessor, opts)
    .use(BatchMonitor, {
      kind: {
        episode: {
          field: 'episode_id',
          steps: [
            { name: 'ingest', },
            { name: 'extract', },
            { name: 'audio', },
            { name: 'transcribe', },
            { name: 'chunk', },
          ]
        }
      }
    })
   
  seneca.message('aim:bar', async function(msg) {   
    return { ok: true, whence: { aim: 'bar', color: msg.color } }
  })
    
  seneca.message('aim:monitor', async function(msg) {
    return { ok: false, whence: { aim: 'monitor' } }
  })
    
    
    
    
  return seneca
}
