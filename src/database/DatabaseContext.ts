export interface DatabaseContext
{
    connect(): Promise<boolean>;
    close(): void;
    all(sql: string, params: any): Promise<any[]>;
    run(sql: string, params: any): Promise<number>;
    get(sql: string, params: any): Promise<any>;
}