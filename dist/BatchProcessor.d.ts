type BatchProcessorOptionsFull = {
    debug: boolean;
    send: any;
    where: any;
    generate_id?: any;
};
export type BatchProcessorOptions = Partial<BatchProcessorOptionsFull>;
declare function BatchProcessor(this: any, options: BatchProcessorOptionsFull): {
    exports: {
        process: (seneca: any, ctx: any, out?: any) => Promise<any>;
    };
};
export default BatchProcessor;
