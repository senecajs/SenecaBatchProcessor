/* Copyright © 2024 Seneca Project Contributors, MIT License. */


type BatchProcessorOptionsFull = {
  debug: boolean
}

export type BatchProcessorOptions = Partial<BatchProcessorOptionsFull>


// FEATURE: subsets of keys by dot separators.

function BatchProcessor(this: any, options: BatchProcessorOptionsFull) {
  const seneca: any = this

  function process(seneca: any, ctx: any, out: any) {
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
}


Object.assign(BatchProcessor, { defaults })

export default BatchProcessor

if ('undefined' !== typeof module) {
  module.exports = BatchProcessor
}
