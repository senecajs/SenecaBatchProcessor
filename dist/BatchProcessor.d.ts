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
        process_workflow: (workflowExec: any, ctx: any, out?: any) => Promise<any>;
        preprocess: (seneca: any, ctx: any, out?: any, meta?: any, run?: boolean) => any;
        process: (seneca: any, ctx: any, out?: any, meta?: any) => Promise<any>;
    };
};
export default BatchProcessor;
