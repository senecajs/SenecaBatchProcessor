/* Copyright © 2024 Seneca Project Contributors, MIT License. */

import Seneca from 'seneca'
// import SenecaMsgTest from 'seneca-msg-test'
// import { Maintain } from '@seneca/maintain'

import ConfigDoc from '../src/ConfigDoc'
import Config from '../src/Config'


describe('Config', () => {
  test('load-plugin', async () => {
    expect(ConfigDoc).toBeDefined()
    const seneca = Seneca({ legacy: false })
      .test()
      .use('promisify')
      .use('entity')
      .use(Config)
    await seneca.ready()
  })


  test('basic', async () => {
    const seneca = makeSeneca()

    const res0 = await seneca.post('sys:config,init:val,key:a,val:1')
    // console.log('res0', res0)
    expect(res0).toMatchObject({ ok: true, key: 'a', val: 1, entry: { key: 'a', val: 1 } })

    // console.dir(await seneca.post('role:mem-store,cmd:dump'),{depth:null})

    const res1 = await seneca.post('sys:config,get:val,key:a')
    // console.log('res1', res1)
    expect(res1).toMatchObject({ ok: true, key: 'a', val: 1, entry: { key: 'a', val: 1 } })

    const res2 = await seneca.post('sys:config,set:val,key:a,val:2')
    // console.log('res2', res2)
    expect(res2).toMatchObject({ ok: true, key: 'a', val: 2, entry: { key: 'a', val: 2 } })

    const res3 = await seneca.post('sys:config,init:val,key:a')
    // console.log('res3', res3)
    expect(res3).toMatchObject({ ok: false, why: 'key-exists' })

    const res4 = await seneca.post('sys:config,set:val,key:b')
    // console.log('res4', res4)
    expect(res4).toMatchObject({ ok: false, why: 'key-not-found' })

    const res5 = await seneca.post('sys:config,get:val,key:c')
    // console.log('res5', res5)
    expect(res5).toMatchObject({ ok: false, key: 'c', val: undefined, entry: undefined })

    const res6 = await seneca.post('sys:config,list:val')
    // console.log('res6', res6)
    expect(res6).toMatchObject({
      ok: true,
      list: [{ key: 'a', val: 2, id: 'a' }]
    })

    const res7 = await seneca.post('sys:config,init:val,key:d,val:4')
    // console.log('res7', res7)
    expect(res7).toMatchObject({ ok: true, key: 'd', val: 4, entry: { key: 'd', val: 4 } })

    const res8 = await seneca.post('sys:config,list:val')
    // console.log('res8', res8)
    expect(res8).toMatchObject({
      ok: true,
      list: [{ key: 'a', val: 2, id: 'a' }, { key: 'd', val: 4, id: 'd' }]
    })

  })


  test('init', async () => {
    const seneca = makeSeneca()

    const res0 = await seneca.post('sys:config,init:val,key:a,val:1')
    expect(res0).toMatchObject({ ok: true, key: 'a', val: 1, entry: { key: 'a', val: 1 } })

    const res0a = await seneca.post('sys:config,get:val,key:a')
    expect(res0a).toMatchObject({ ok: true, key: 'a', val: 1, entry: { key: 'a', val: 1 } })


    const res1 = await seneca.post('sys:config,init:val,key:a,val:2')
    expect(res1).toMatchObject({ ok: false, why: 'key-exists' })

    const res1a = await seneca.post('sys:config,get:val,key:a')
    expect(res1a).toMatchObject({ ok: true, key: 'a', val: 1, entry: { key: 'a', val: 1 } })


    // Do not overwrite existing

    const res2 = await seneca.post('sys:config,init:val,key:a,val:3,existing:true')
    expect(res2).toMatchObject({
      ok: true, why: 'existing',
      key: 'a', val: 1, entry: { key: 'a', val: 1 }
    })

    const res2a = await seneca.post('sys:config,get:val,key:a')
    expect(res2a).toMatchObject({ ok: true, key: 'a', val: 1, entry: { key: 'a', val: 1 } })

  })


  test('moreparts', async () => {
    const seneca = makeSeneca({ numparts: 16 })

    const res0 = await seneca.post('sys:config,init:val,key:a.b,val:1')
    // console.log('res0', res0)
    expect(res0).toMatchObject({
      ok: true,
      key: 'a.b',
      val: 1,
      entry: {
        key: 'a.b',
        val: 1,
        p0: 'a',
        p1: 'a.b',
        p2: 'a.b.',
        id: 'a.b'
      }
    })

    const res1 = await seneca.post('sys:config,init:val,key:a.c,val:2')
    // console.log('res1', res1)
    expect(res1).toMatchObject({
      ok: true,
      key: 'a.c',
      val: 2,
      entry: {
        key: 'a.c',
        val: 2,
        p0: 'a',
        p1: 'a.c',
        p2: 'a.c.',
        id: 'a.c'
      }
    })

    const res2 = await seneca.post('sys:config,list:val')
    //console.log('res2', res2)
    expect(res2).toMatchObject({
      ok: true,
      list: [
        {
          key: 'a.b',
          val: 1,
          p0: 'a',
          p1: 'a.b',
          p2: 'a.b.',
          id: 'a.b'
        },
        {
          key: 'a.c',
          val: 2,
          p0: 'a',
          p1: 'a.c',
          p2: 'a.c.',
          id: 'a.c'
        }
      ]
    })

    const res3 = await seneca.post('sys:config,map:val,prefix:a')
    // console.log('res3', res3)
    expect(res3).toMatchObject({
      ok: true,
      list: [
        {
          key: 'a.b',
          val: 1,
          p0: 'a',
          p1: 'a.b',
          p2: 'a.b.',
          id: 'a.b'
        },
        {
          key: 'a.c',
          val: 2,
          p0: 'a',
          p1: 'a.c',
          p2: 'a.c.',
          id: 'a.c'
        }
      ],
      map: { 'a.b': 1, 'a.c': 2 }
    })

    const res4 = await seneca.post('sys:config,init:val,key:a.b.c.d,val:3')
    // console.log('res0', res0)
    expect(res4).toMatchObject({
      ok: true,
      key: 'a.b.c.d',
      val: 3,
      entry: {
        key: 'a.b.c.d',
        val: 3,
        p0: 'a',
        p1: 'a.b',
        p2: 'a.b.c',
        id: 'a.b.c.d'
      }
    })

    const res5 = await seneca.post('sys:config,map:val,prefix:a.b.c')
    // console.log('res5', res5)
    expect(res5).toMatchObject({
      ok: true,
      list: [{
        key: 'a.b.c.d',
        val: 3,
        p0: 'a',
        p1: 'a.b',
        p2: 'a.b.c',
        id: 'a.b.c.d'
      }],
      map: { 'a.b.c.d': 3 }
    })
  })


  test('parts', async () => {
    const seneca = makeSeneca()

    const res0 = await seneca.post('sys:config,init:val,key:a.b,val:1')
    // console.log('res0', res0)
    expect(res0).toMatchObject({
      ok: true,
      key: 'a.b',
      val: 1,
      entry: {
        key: 'a.b',
        val: 1,
        p0: 'a',
        p1: 'a.b',
        p2: 'a.b.',
        id: 'a.b'
      }
    })

    const res1 = await seneca.post('sys:config,init:val,key:a.c,val:2')
    // console.log('res1', res1)
    expect(res1).toMatchObject({
      ok: true,
      key: 'a.c',
      val: 2,
      entry: {
        key: 'a.c',
        val: 2,
        p0: 'a',
        p1: 'a.c',
        p2: 'a.c.',
        id: 'a.c'
      }
    })

    const res2 = await seneca.post('sys:config,list:val')
    //console.log('res2', res2)
    expect(res2).toMatchObject({
      ok: true,
      list: [
        {
          key: 'a.b',
          val: 1,
          p0: 'a',
          p1: 'a.b',
          p2: 'a.b.',
          id: 'a.b'
        },
        {
          key: 'a.c',
          val: 2,
          p0: 'a',
          p1: 'a.c',
          p2: 'a.c.',
          id: 'a.c'
        }
      ]
    })

    const res3 = await seneca.post('sys:config,map:val,prefix:a')
    // console.log('res3', res3)
    expect(res3).toMatchObject({
      ok: true,
      list: [
        {
          key: 'a.b',
          val: 1,
          p0: 'a',
          p1: 'a.b',
          p2: 'a.b.',
          id: 'a.b'
        },
        {
          key: 'a.c',
          val: 2,
          p0: 'a',
          p1: 'a.c',
          p2: 'a.c.',
          id: 'a.c'
        }
      ],
      map: { 'a.b': 1, 'a.c': 2 }
    })

    const res4 = await seneca.post('sys:config,init:val,key:a.b.c.d,val:3')
    // console.log('res0', res0)
    expect(res4).toMatchObject({
      ok: true,
      key: 'a.b.c.d',
      val: 3,
      entry: {
        key: 'a.b.c.d',
        val: 3,
        p0: 'a',
        p1: 'a.b',
        p2: 'a.b.c',
        id: 'a.b.c.d'
      }
    })

    const res5 = await seneca.post('sys:config,map:val,prefix:a.b.c')
    // console.log('res5', res5)
    expect(res5).toMatchObject({
      ok: true,
      list: [{
        key: 'a.b.c.d',
        val: 3,
        p0: 'a',
        p1: 'a.b',
        p2: 'a.b.c',
        id: 'a.b.c.d'
      }],
      map: { 'a.b.c.d': 3 }
    })
  })


  test('more-parts', async () => {
    const seneca = makeSeneca({ numparts: 16 })

    const res0 = await seneca.post('sys:config,init:val,key:a.b,val:1')
    // console.log('res0', res0)
    expect(res0).toMatchObject({
      ok: true,
      key: 'a.b',
      val: 1,
      entry: {
        key: 'a.b',
        val: 1,
        p0: 'a',
        p1: 'a.b',
        p2: 'a.b.',
        id: 'a.b'
      }
    })

    const res1 = await seneca.post('sys:config,init:val,key:a.c,val:2')
    // console.log('res1', res1)
    expect(res1).toMatchObject({
      ok: true,
      key: 'a.c',
      val: 2,
      entry: {
        key: 'a.c',
        val: 2,
        p0: 'a',
        p1: 'a.c',
        p2: 'a.c.',
        id: 'a.c'
      }
    })

    const res2 = await seneca.post('sys:config,list:val')
    //console.log('res2', res2)
    expect(res2).toMatchObject({
      ok: true,
      list: [
        {
          key: 'a.b',
          val: 1,
          p0: 'a',
          p1: 'a.b',
          p2: 'a.b.',
          id: 'a.b'
        },
        {
          key: 'a.c',
          val: 2,
          p0: 'a',
          p1: 'a.c',
          p2: 'a.c.',
          id: 'a.c'
        }
      ]
    })

    const res3 = await seneca.post('sys:config,map:val,prefix:a')
    // console.log('res3', res3)
    expect(res3).toMatchObject({
      ok: true,
      list: [
        {
          key: 'a.b',
          val: 1,
          p0: 'a',
          p1: 'a.b',
          p2: 'a.b.',
          id: 'a.b'
        },
        {
          key: 'a.c',
          val: 2,
          p0: 'a',
          p1: 'a.c',
          p2: 'a.c.',
          id: 'a.c'
        }
      ],
      map: { 'a.b': 1, 'a.c': 2 }
    })

    const res4 = await seneca.post('sys:config,init:val,key:a.b.c.d,val:3')
    // console.log('res0', res0)
    expect(res4).toMatchObject({
      ok: true,
      key: 'a.b.c.d',
      val: 3,
      entry: {
        key: 'a.b.c.d',
        val: 3,
        p0: 'a',
        p1: 'a.b',
        p2: 'a.b.c',
        id: 'a.b.c.d'
      }
    })

    const res5 = await seneca.post('sys:config,map:val,prefix:a.b.c')
    // console.log('res5', res5)
    expect(res5).toMatchObject({
      ok: true,
      list: [{
        key: 'a.b.c.d',
        val: 3,
        p0: 'a',
        p1: 'a.b',
        p2: 'a.b.c',
        id: 'a.b.c.d'
      }],
      map: { 'a.b.c.d': 3 }
    })
  })


  test('fewer-parts', async () => {
    const seneca = makeSeneca({ numparts: 2 })

    const res0 = await seneca.post('sys:config,init:val,key:a.b,val:1')
    // console.log('res0', res0)
    expect(res0).toMatchObject({
      ok: true,
      key: 'a.b',
      val: 1,
      entry: {
        key: 'a.b',
        val: 1,
        p0: 'a',
        id: 'a.b'
      }
    })

    const res1 = await seneca.post('sys:config,init:val,key:a.c,val:2')
    // console.log('res1', res1)
    expect(res1).toMatchObject({
      ok: true,
      key: 'a.c',
      val: 2,
      entry: {
        key: 'a.c',
        val: 2,
        p0: 'a',
        id: 'a.c'
      }
    })

    const res2 = await seneca.post('sys:config,list:val')
    //console.log('res2', res2)
    expect(res2).toMatchObject({
      ok: true,
      list: [
        {
          key: 'a.b',
          val: 1,
          p0: 'a',
          id: 'a.b'
        },
        {
          key: 'a.c',
          val: 2,
          p0: 'a',
          id: 'a.c'
        }
      ]
    })

    const res3 = await seneca.post('sys:config,map:val,prefix:a')
    // console.log('res3', res3)
    expect(res3).toMatchObject({
      ok: true,
      list: [
        {
          key: 'a.b',
          val: 1,
          p0: 'a',
          id: 'a.b'
        },
        {
          key: 'a.c',
          val: 2,
          p0: 'a',
          id: 'a.c'
        }
      ],
      map: { 'a.b': 1, 'a.c': 2 }
    })

    const res4 = await seneca.post('sys:config,init:val,key:a.b.c.d,val:3')
    // console.log('res0', res0)
    expect(res4).toMatchObject({
      ok: true,
      key: 'a.b.c.d',
      val: 3,
      entry: {
        key: 'a.b.c.d',
        val: 3,
        p0: 'a',
        id: 'a.b.c.d'
      }
    })

    const res5 = await seneca.post('sys:config,map:val,prefix:a.b.c')
    // console.log('res5', res5)
    expect(res5).toMatchObject({
      ok: true,
      list: [],
      map: {}
    })

    const res6 = await seneca.post('sys:config,map:val,prefix:a')
    // console.log('res6', res6)
    expect(res6).toMatchObject({
      ok: true,
      list: [
        {
          id: 'a.b',
          key: 'a.b',
          p0: 'a',
          val: 1,
        },
        {
          id: 'a.c',
          key: 'a.c',
          p0: 'a',
          val: 2,
        },
        {
          id: 'a.b.c.d',
          key: 'a.b.c.d',
          p0: 'a',
          val: 3,
        }
      ],
      map: { 'a.b': 1, 'a.c': 2, 'a.b.c.d': 3 }
    })


  })

})


function makeSeneca(opts: any = {}) {
  const seneca = Seneca({ legacy: false })
    .test()
    .use('promisify')
    .use('entity')
    .use('entity-util', { when: { active: true } })
    .use(Config, opts)
  return seneca
}
