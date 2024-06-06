type ConfigOptionsFull = {
    debug: boolean;
    numparts: number;
    canon: {
        zone: string | undefined;
        base: string | undefined;
        name: string | undefined;
    };
};
export type ConfigOptions = Partial<ConfigOptionsFull>;
declare function Config(this: any, options: ConfigOptionsFull): void;
export default Config;
