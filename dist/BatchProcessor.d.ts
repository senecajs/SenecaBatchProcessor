type BatchProcessorOptionsFull = {
    debug: boolean;
};
export type BatchProcessorOptions = Partial<BatchProcessorOptionsFull>;
declare function BatchProcessor(this: any, options: BatchProcessorOptionsFull): {
    exports: {
        process: (seneca: any, ctx: any, out: any) => any;
    };
};
export default BatchProcessor;
