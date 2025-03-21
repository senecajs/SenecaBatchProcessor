/* Copyright © 2025 Seneca Project Contributors, MIT License. */

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

    expect(seneca.export('BatchProcessor')).toBeDefined()

    await seneca.close()
  })

  test('basic', async () => {
    const seneca = makeSeneca()
    await seneca.ready()
    await seneca.close()
  })

  describe('BatchProcessor Instance Tests', () => {
    let opts = {
      b01: {
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
      },
      b02: {
        send: {  
          mode: 'async', // wait for transition, global setting
        },
        where: {
          'aim:zoo1,color:blue': {
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
      }
    }
    
    test('instance defined', async () => {
      const seneca = makeSeneca(opts)

      await seneca.ready()
      
      const b01 = seneca.export('BatchProcessor/b01')
      const b02 = seneca.export('BatchProcessor/b02')
      
      const b03 = seneca.export('BatchProcessor/b03')
      const b04 = seneca.export('BatchProcessor/b04')
      
      expect(b01).toBeDefined()
      expect(b02).toBeDefined()
      
      expect(b03).toBeUndefined()
      expect(b04).toBeUndefined()
    })

    test("Whence found per instance", async () => {
    
      const seneca = makeSeneca(opts)

      await seneca.ready()

      const b01 = seneca.export('BatchProcessor/b01')
      const b02 = seneca.export('BatchProcessor/b02')


      let out, ctx

      seneca.message('aim:foo,color:red', async function(msg) {
        out = { ok: true, planet: 'mars' }
        ctx = { place: { order: 1 } }
        
        out = await b01.process(this, ctx, out)
        
        return out
      })

      out = await seneca.post('aim:foo,color:red')
      
      await wait(111)
      
      // console.log('out: ', out, ctx.result$)
      
      
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
      
      seneca.message('aim:zoo1,color:blue', async function(msg) {
        out = { ok: true, planet: 'mars' }
        ctx = { place: { order: 1 } }
        
        out = await b02.process(this, ctx, out)
        
        return out
      })

      out = await seneca.post('aim:zoo1,color:blue')
      
      await wait(111)
      
      // console.log('out: ', out, ctx.result$)
      
      
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
    
    test("Whence NOT found per instance", async () => {
    
      const seneca = makeSeneca(opts)

      await seneca.ready()

      const b01 = seneca.export('BatchProcessor/b01')
      const b02 = seneca.export('BatchProcessor/b02')


      let out, ctx, err = undefined

      seneca.message('aim:foo,color:red', async function(msg) {
        out = { ok: true, planet: 'mars' }
        ctx = { place: { order: 1 } }
        
        try {
          out = await b02.process(this, ctx, out)
        } catch(error) {
          err = error
        }
        
        return out
      })

      out = await seneca.post('aim:foo,color:red')
      
      await wait(111)
      
      // console.log(err)
      
      // console.log('out: ', out, ctx.result$)
      // console.log('ctx::: ', ctx.result$.length)
      
      expect(err).toBeDefined()
      expect(ctx.result$.length).toEqual(0)

      expect(out.run).toBeUndefined()
      expect(out.batch).toBeUndefined()
      
      err = undefined
      
      seneca.message('aim:zoo1,color:blue', async function(msg) {
        out = { ok: true, planet: 'mars' }
        ctx = { place: { order: 1 } }
        
        try {
          out = await b01.process(this, ctx, out)
        } catch(error) {
          err = error
        }
        
        return out
      })

      out = await seneca.post('aim:zoo1,color:blue')
      
      await wait(111)
      
      // console.log('out: ', out, ctx.result$)
      
      expect(err).toBeDefined()
      expect(ctx.result$.length).toEqual(0)

      expect(out.run).toBeUndefined()
      expect(out.batch).toBeUndefined()

    })

  })

  test('quick setup', async () => {
    const seneca = makeSeneca({
      b01: {
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
      }
    })
    await seneca.ready()


    const b01 = seneca.export('BatchProcessor/b01')

    let out, ctx

    seneca.message('aim:foo,color:red', async function(msg) {
      out = { ok: true, planet: 'mars' }
      ctx = { place: { order: 1 } }

      let workflow = b01.preprocess(this, ctx, out)

      return { workflow, }
      // console.log(out, state, ctx)
    })

    let { workflow } = await seneca.post('aim:foo,color:red')


    out = await b01.process_workflow(workflow, ctx, out)

    await wait(111)

    // console.dir(workflow, { depth: null })
    expect(JSON.stringify(workflow)).toEqual(
      JSON.stringify({
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
      }))
      expect(workflow.run).toBeInstanceOf(Function)
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


  describe('Process Workflow', () => {
    let opts = {
      b01: {
        send: {
          mode: 'async', // wait for transition, global setting
        },
        where: {
          'aim:foo, color:red': {
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
    }

    test('state: "done"', async () => {
      const seneca = makeSeneca(opts)
      await seneca.ready()

      const b01 = seneca.export('BatchProcessor/b01')

      let batch = seneca.BatchMonitor('b0', 'r0')

      let out, ctx

      seneca.message('aim:foo,color:red', async function(msg) {
        let bme = await batch.entry('episode', 'ingest', 'e0', { podcast_id: 'p0' })

        // NOTE: Should match "ok: true" but is essentially ignored according to the configuration.
        out = { ok: true, planet: 'mars', ddddd: 1, dd: 2 }
        ctx = { place: { order: 1 }, BatchMonitorEntry$: bme }

        let workflow = b01.preprocess(this, ctx, out)

        return { workflow, }
        // console.log(out, ctx, state)
      })

      let { workflow } = await seneca.post('aim:foo,color:red')
      // console.dir(workflow, {depth: null})

      expect(JSON.stringify(workflow)).toEqual(JSON.stringify({
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
      }))
      expect(workflow.run).toBeInstanceOf(Function)
      // NOTE: Workflow can be processed via run but "process" below is recommeded since json can't serialize functions
      // out = await workflow.run()

      out = await b01.process_workflow(workflow, ctx, out)
      // console.log('out: ', out)

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

      const b01 = seneca.export('BatchProcessor/b01')

      let batch = seneca.BatchMonitor('b0', 'r0')

      let out, ctx

      seneca.message('aim:foo,color:red', async function(msg) {
        let bme = await batch.entry('episode', 'ingest', 'e0', { podcast_id: 'p0' })

        out = { ok: false, why: 'failed' }
        ctx = { msg$: 'failed', BatchMonitorEntry$: bme }

        let workflow = b01.preprocess(this, ctx, out)

        return { workflow, }
        // console.log(out, ctx, state)
      })

      let { workflow } = await seneca.post('aim:foo,color:red')
      // console.dir(workflow, {depth: null})

      expect(JSON.stringify(workflow)).toEqual(JSON.stringify({
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
      }))
      expect(workflow.run).toBeInstanceOf(Function)

      out = await b01.process_workflow(workflow, ctx, out)

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

      const b01 = seneca.export('BatchProcessor/b01')

      let batch = seneca.BatchMonitor('b0', 'r0')

      let out, ctx

      seneca.message('aim:foo,color:red', async function(msg) {
        let bme = await batch.entry('episode', 'ingest', 'e0', { podcast_id: 'p0' })

        out = { nomatch: null }
        ctx = { msg$: 'failed', BatchMonitorEntry$: bme }

        let workflow = b01.preprocess(this, ctx, out)
        out = await workflow.run()

        return { workflow, }
        // console.log(out, ctx, state)
      })

      let { workflow } = await seneca.post('aim:foo,color:red')
      // console.dir(workflow, {depth: null})

      expect(JSON.stringify(workflow)).toEqual(JSON.stringify({
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
      }))
      expect(workflow.run).toBeInstanceOf(Function)

      /// OR, INSTEAD OF run: out = await process_workflow(workflow, ctx, out)

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

  describe('Process in one go', () => {
    let opts = {
      b01: {
        send: {
          mode: 'async', // wait for transition, global setting
        },
        where: {
          'aim:foo, color:red': {
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
    }

    test('state: "done"', async () => {
      const seneca = makeSeneca(opts)
      await seneca.ready()

      const b01 = seneca.export('BatchProcessor/b01')

      let batch = seneca.BatchMonitor('b0', 'r0')

      let out, ctx

      seneca.message('aim:foo,color:red', async function(msg) {
        let bme = await batch.entry('episode', 'ingest', 'e0', { podcast_id: 'p0' })

        // NOTE: Should match "ok: true" but is essentially ignored according to the configuration.
        out = { ok: true, planet: 'mars', ddddd: 1, dd: 2 }
        ctx = { place: { order: 1 }, BatchMonitorEntry$: bme }

        out = await b01.process(this, ctx, out)

        return out
        // console.log(out, ctx, state)
      })

      out = await seneca.post('aim:foo,color:red')

      // console.log('out: ', out)

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

    test('meta.custom', async () => {

      let opts = {
        b01: {
          send: {
            mode: 'async', // wait for transition, global setting
          },
          where: {
            'aim:foo, color:red': {
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
                        aim: 'zoo',
                        color: 'blue',
                        planet: 'out~planet', // dot path ref
                        order: 'ctx~place.order~Number' // Gubu validation expression
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      }


      const seneca = makeSeneca(opts)
      await seneca.ready()

      const b01 = seneca.export('BatchProcessor/b01')

      let batch = seneca.BatchMonitor('b0', 'r0')

      let out, ctx

      seneca.message('aim:zoo', async function(msg, meta) {   
        console.log('aim: zoo - zoo_meta: ', meta.custom)

        return {
          ok: true,
          planet: msg.planet,
          order: msg.order,
          whence: {
            aim: 'zoo',
            color: msg.color
          },
          zoo_meta: meta.custom
        }
      })

      seneca.message('aim:foo,color:red', async function(msg) {
        let bme = await batch.entry('episode', 'ingest', 'e0', { podcast_id: 'p0' })

        // NOTE: Should match "ok: true" but is essentially ignored according to the configuration.
        out = { ok: true, planet: 'mars', ddddd: 1, dd: 2 }
        ctx = { place: { order: 1 }, BatchMonitorEntry$: bme }

        out = await b01.process(this, ctx, out, { custom: { info: 10 } } )

        // let out1 = preprocess(this, ctx, out);
        // console.dir(out1, {depth: null})

        return out
        // console.log(out, ctx, state)
      })

      out = await seneca.post('aim:foo,color:red')

      // console.log('out: ', out)

      await wait(111)

      let report = await batch.report('episode', { podcast_id: 'p0' })

      console.log(report.format())

      // await wait(111)

      expect(report.td.line.e0).toBeTruthy()
      expect(report.td.line.e0.step.ingest.state).toEqual('done')
      expect(ctx.result$).toEqual([
        {
          ok: true,
          planet: "mars",
          order: 1,
          whence: {
            aim: 'zoo',
            color: 'blue'
          },
          zoo_meta: {
            info: 10
          },
        }
      ])

      expect(out.run).toBeDefined()
      expect(out.batch).toBeDefined()

    })

    test('state: "fail"', async () => {
      const seneca = makeSeneca(opts)
      await seneca.ready()

      const b01 = seneca.export('BatchProcessor/b01')

      let batch = seneca.BatchMonitor('b0', 'r0')

      let out, ctx

      seneca.message('aim:foo,color:red', async function(msg) {
        let bme = await batch.entry('episode', 'ingest', 'e0', { podcast_id: 'p0' })

        out = { ok: false, why: 'failed' }
        ctx = { msg$: 'failed', BatchMonitorEntry$: bme }

        out = await b01.process(this, ctx, out)

        return out
        // console.log(out, ctx, state)
      })

      out = await seneca.post('aim:foo,color:red')


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

      const b01 = seneca.export('BatchProcessor/b01')

      let batch = seneca.BatchMonitor('b0', 'r0')

      let out, ctx

      seneca.message('aim:foo,color:red', async function(msg) {
        let bme = await batch.entry('episode', 'ingest', 'e0', { podcast_id: 'p0' })

        out = { nomatch: null }
        ctx = { msg$: 'failed', BatchMonitorEntry$: bme }

        out = await b01.process(this, ctx, out)

        return out
        // console.log(out, ctx, state)
      })

      out = await seneca.post('aim:foo,color:red')

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

  describe('Msg Eval security Checks', () => {

    test('Eval Injection Check', async () => {

      let opts = {
        b01: {
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
      }

      const seneca = makeSeneca(opts)
      await seneca.ready()

      const b01 = seneca.export('BatchProcessor/b01')

      let out, ctx

      seneca.message('aim:foo,color:red', async function(msg) {
        // NOTE: This eval injection should throw an exception and terminate the test
        out = { ok: true, planet: 'eval("__nonexistent_function(1)")', ddddd: 1, dd: 2 }
        ctx = { place: { order: 1 } }

        let workflow = b01.preprocess(this, ctx, out)

        return { workflow, }
        // console.log(out, ctx, state)
      })

      let { workflow } = await seneca.post('aim:foo,color:red')

      // console.dir(workflow, {depth: null})

      // Make sure eval is treated as a "literal" string
      expect(JSON.stringify(workflow)).toEqual(JSON.stringify({
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
            msg: { aim: 'bar', color: 'blue', planet: 'eval("__nonexistent_function(1)")', order: 1 },
            type: 'post'
          },
          {
            msg: { aim: 'bar', color: 'green', planet: 'eval("__nonexistent_function(1)")', order: 1 },
            type: 'act'
          }
        ]
      }))


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

  seneca.message('aim:bar', async function(msg, meta) {   
    // console.log('meta: ', meta.custom)
    return { ok: true, whence: { aim: 'bar', color: msg.color } }

  })

  seneca.message('aim:monitor', async function(msg) {
    return { ok: false, whence: { aim: 'monitor' } }
  })




  return seneca
}
