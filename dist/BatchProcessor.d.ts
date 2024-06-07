type BatchProcessorOptionsFull = {
    debug: boolean;
    send: any;
    where: any;
};
export type BatchProcessorOptions = Partial<BatchProcessorOptionsFull>;
declare function BatchProcessor(this: any, options: BatchProcessorOptionsFull): {
    exports: {
        process: (this: any, seneca: any, ctx: any, out?: any) => Promise<any>;
    };
};
export default BatchProcessor;
