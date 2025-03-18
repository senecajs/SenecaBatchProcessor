type WorkFlow = {
    entry?: any;
    send?: Array<any> | Object;
};
type Match = Record<string, WorkFlow>;
type BatchProcessorInstanceOptions = {
    debug: boolean;
    send: {
        mode: string;
    };
    where: Record<string, Match>;
    generate_id?: Function;
};
type BatchProcessorOptionsFull = Record<string, BatchProcessorInstanceOptions>;
export type BatchProcessorOptions = Partial<BatchProcessorOptionsFull>;
declare class BatchProcessClass {
    name: string;
    id: string;
    process_workflow: Function;
    preprocess: Function;
    process: Function;
    constructor(name: string, id: string, process_workflow: Function, preprocess: Function, process: Function);
}
declare function BatchProcessor(this: any, options: BatchProcessorOptionsFull): {
    exports: Record<string, BatchProcessClass>;
};
export default BatchProcessor;
