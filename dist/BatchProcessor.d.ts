type WorkFlow = {
    entry?: any;
    send?: Array<any> | Object;
};
type Match = Record<string, WorkFlow>;
type BatchProcessorOptionsFull = {
    debug: boolean;
    send: {
        mode: string;
    };
    where: Record<string, Match>;
    generate_id?: Function;
};
export type BatchProcessorOptions = Partial<BatchProcessorOptionsFull>;
declare function BatchProcessor(this: any, options: BatchProcessorOptionsFull): {
    exports: {
        process: (workflowExec: any, ctx: any, out?: any) => Promise<any>;
        preprocess: (seneca: any, ctx: any, out?: any) => any;
    };
};
export default BatchProcessor;
