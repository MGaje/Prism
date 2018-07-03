import * as Pg from "pg";

import { DatabaseContext } from "./DatabaseContext";

export class PostgreSqlDbContext implements DatabaseContext
{
    private db: Pg.Client;

    /**
     * Default constructor.
     * @constructor
     */
    constructor()
    {
        this.db = new Pg.Client({
            host: "",
            port: 5334,
            user: "",
            password: ""
        });
    }

    /**
     * Connect to database file.
     * @returns {Promise<boolean>} A promise with connection state represented by a boolean.
     */
    public connect(): Promise<boolean>
    {
        return new Promise((resolve, reject) =>
        {
            this.db.connect(err => {
                if (err)
                {
                    reject(err);
                }
                else
                {
                    resolve(true);
                }
            });
        });
    }

    /**
     * Close the database connection.
     */
    public close()
    {
        this.db.end();
    }

    /**
     * Perform query and return all query result rows.
     * @param {string} sql The sql query.
     * @param {any} params The params for the query.
     * @returns {Promise<any[]>} A promise with the resulting rows of the query.
     */
    public all(sql: string, params: any): Promise<any[]>
    {
        return new Promise((resolve, reject) =>
        {
            this.db.query(sql, params)
                .then(result => resolve(result.rows))
                .catch(e => reject(e));
        });
    }

    /**
     * Run a query.
     * @param {string} sql The sql query.
     * @param {any} params The params for the query.
     * @returns {Promise<any>} A promise with query's result last id that was updated. 
     */
    public run(sql: string, params: any): Promise<number>
    {
        return new Promise((resolve, reject) =>
        {
            this.db.query(sql.concat(" RETURNING Id"), params)
                .then(result => resolve(result.rows[0].Id))
                .catch(e => reject(e));
        });
    }

    /**
     * Get first row from result of a query.
     * @param {string} sql The sql query.
     * @param {any} params The params of the query.
     * @returns {Promise<any>} A promise with the first row of the query results.
     */
    public get(sql: string, params: any): Promise<any>
    {
        return new Promise((resolve, reject) =>
        {
            this.db.query(sql, params)
                .then(result => resolve(result.rows[0]))
                .catch(e => reject(e));
        });
    }
}