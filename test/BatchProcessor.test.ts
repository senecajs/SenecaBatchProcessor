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
    
    let state = { c: 0, msgs: [] }
    let out, ctx, report
    
    seneca.message('aim:bar', async function(msg) {
      state.ok = true
      state.c++
      // console.log('MSG: ', msg)
      state.msgs.push(seneca.util.clean(msg))
      return { ok: true, now: Date.now() }
    })
    
    seneca.message('aim:foo,color:red', async function(msg) {
    
      out = { ok: true, planet: 'mars' }
      ctx = { place: { order: 1 } }
    
      out = await process(this, ctx, out)
    
      await wait(111)
    
      // console.log(out, state, ctx)
    
      expect(state).toEqual({
        ok: true,
        c: 2,
        msgs: [
          { aim: 'bar', color: 'blue', planet: 'mars', order: 1 },
          { aim: 'bar', color: 'green', planet: 'mars', order: 1 }
        ]
      })
      expect(ctx.result$.length).toEqual(2)
    
    })
    
    await seneca.post('aim:foo,color:red')
  
  })
  
  describe('entry state test', () => {
    const seneca = makeSeneca({
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
    })
    
    let state = { c: 0 }
    let out, ctx, report, bme
    
    let process, batch
    
    beforeAll(async () => {
    
      await seneca.ready()
      process = seneca.export('BatchProcessor/process')
      batch = seneca.BatchMonitor('b0', 'r0')
    
      seneca.message('aim:bar', async function(msg) {
        state.ok = true
        state.c++
        // console.log('aim:bar', msg)
      
        return { ok: true, now: Date.now() }
      })
    
      seneca.message('aim:monitor', async function(msg) {
        state.ok = false
        state.msg = msg.msg
        state.c++
        // console.log('aim:monitorr: ', msg)
        return { ok: false, now: Date.now() }
      })
      
      seneca.message('test:ss', async function(msg) {
      
        const process = seneca.export('BatchProcessor/process')
        let out = { ok: true, planet: 'mars' }
        let ctx = { place: { order: 1 } }
        
        process(this, ctx, out)
        return {}
      })
    
    })

    
    test('state: "done"', async () => {
    
      seneca.message('aim:foo,color:red', async function(msg) {
        bme = await batch.entry('episode', 'ingest', 'e0', { podcast_id: 'p0' })
    
        out = { ok: true, planet: 'mars' }
        ctx = { place: { order: 1 }, BatchMonitorEntry$: bme }
    
        out = await process(this, ctx, out)
    
        await wait(111)
    
        report = await batch.report('episode', { podcast_id: 'p0' })
    
        console.log(report.format())
    
        // console.log(out, ctx, state)
    
        expect(report.td.line.e0).toBeTruthy()
        expect(report.td.line.e0.step.ingest.state).toEqual('done')
        expect(state).toEqual({ok: true, c: 2})
        expect(ctx.result$.length).toEqual(2)
      })
      await seneca.post('aim:foo,color:red')
      
      
    
    })
    
    test('state: "fail"', async () => {
      seneca.message('aim:foo,color:red', async function(msg) {
        bme = await batch.entry('episode', 'ingest', 'e1', { podcast_id: 'p0' })
        state = { c: 0 }
        out = { ok: false }
        ctx = { msg$: "failed", BatchMonitorEntry$: bme }
    
        out = await process(this, ctx, out)
        await wait(111)
    
        report = await batch.report('episode', { podcast_id: 'p0' })
    
        console.log(report.format())
        // console.log(report.td.line.e1)
        expect(report.td.line.e1).toBeTruthy()
        expect(report.td.line.e1.step.ingest.state).toEqual('fail')
        expect(state).toEqual({ok: false, msg: 'failed', c: 1 })
        expect(ctx.result$.length).toEqual(1)
     })
     await seneca.post('aim:foo,color:red')
    
    })
    
    test('match "*"', async () => {
      seneca.message('aim:foo,color:red', async function(msg) {
        bme = await batch.entry('episode', 'ingest', 'e2', { podcast_id: 'p0' })
        state = {}
        out = { nomatch: null }
        ctx = { msg$: "failed", BatchMonitorEntry$: bme }
    
        out = await process(this, ctx, out)
        await wait(111)
        report = await batch.report('episode', { podcast_id: 'p0' })
    
        console.log(report.format())
        // console.log(report.td.line.e2)
    
        expect(report.td.line.e2).toBeTruthy()
        expect(report.td.line.e2.step.ingest.state).toEqual('fail')
        expect(report.td.line.e2.step.ingest.why).toEqual('batch-process-no-match')
        expect(state).toEqual({})
        expect(ctx.result$.length).toEqual(0)
      // console.log(out, ctx, state)
      })
      await seneca.post('aim:foo,color:red')
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
    
    
  return seneca
}
