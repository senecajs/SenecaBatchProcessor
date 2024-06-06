

const Seneca = require('seneca')


run()

async function run() {
  const s0 =
        Seneca()
        .test()
        .message('a:1', async function a1(msg, meta) {
          console.log('meta',meta)
          console.log('pact',this.private$)

          return {x:msg.x}
        })

  console.log(await s0.post('a:1,x:1'))
  
}


