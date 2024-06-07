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
    
    let out = { ok: true, planet: 'mars' }
    let ctx = { place: { order: 1 } }
    
    
    out = await process(seneca, ctx, out)
    
    console.log(out)
  
  })
  
  test('more complex', async () => {
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
    
    await seneca.ready()
    
    seneca.message('aim: bar', async function(msg) {
      console.log('MSG: ', msg)
      return { ok: true, now: Date.now() }
    })
    
    const process = seneca.export('BatchProcessor/process')
    const batch = seneca.BatchMonitor('b0', 'r0')
    
    const bme = await batch.entry('episode', 'ingest', 'e0', { podcast_id: 'p0' })
    
    let out = { ok: true, planet: 'mars' }
    let ctx = { place: { order: 1 }, BatchMonitorEntry$: bme }
    
    // await bme('start')
    
    out = await process(seneca, ctx, out)
    
    await wait(111)
    
    const report = await batch.report('episode', { podcast_id: 'p0' })
    
    console.log(report.format())
    
    await wait(111)
    
    console.log(out, ctx)
      
    
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
