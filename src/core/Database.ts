import * as Sqlite from "sqlite3";
import * as Pg from "pg";
import * as Path from "path";

import { Utility } from "./Utility";

/**
 * A database wrapper that takes the sqlite methods and wraps them in promises.
 */
export class Database
{
    private db: any;

    /**
     * Default constructor.
     * @constructor
     */
    constructor()
    {
        if (Utility.isProdEnv())
        {
            this.db = new Pg.Client({
                host: "",
                port: 5334,
                user: "",
                password: ""
            });
        }
    }

    /**
     * Connect to database file.
     * @returns {Promise<boolean>} A promise with connection state represented by a boolean.
     */
    public connect(): Promise<boolean>
    {
        //
        // Production logic.
        //
        if (Utility.isProdEnv())
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
        
        //
        // Development logic.
        //
        const filename: string = Path.join((<any>global).appRoot, "..", "db", "quotes.db");
        return new Promise((resolve, reject) => 
        {
            this.db = new Sqlite.Database(filename, Sqlite.OPEN_READWRITE, err =>
            {
                if (err)
                {
                    reject(err);
                }

                resolve(true);
            });
        });
    }

    /**
     * Close the database connection.
     */
    public close()
    {
        this.db.close();
    }

    /**
     * Perform query and return all query result rows.
     * @param {string} sql The sql query.
     * @param {any} params The params for the query.
     * @returns {Promise<any[]>} A promise with the resulting rows of the query.
     */
    public all(sql: string, params: any): Promise<any[]>
    {
        //
        // Production logic.
        //
        if (Utility.isProdEnv())
        {
            return new Promise((resolve, reject) =>
            {
                this.db.query(sql, params)
                    .then(result => resolve(result.rows))
                    .catch(e => reject(e));
            });
        }
        
        //
        // Development logic.
        //
        return new Promise((resolve, reject) =>
        {
            if (!this.db)
            {
                reject(new Error("Database context is not initialized."));
            }

            this.db.all(sql, params, (err, rows) =>
            {
                if (err)
                {
                    reject(err);
                }

                resolve(rows);                
            });
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
        //
        // Production logic.
        //
        if (Utility.isProdEnv())
        {
            sql += " RETURNING Id";
            return new Promise((resolve, reject) =>
            {
                this.db.query(sql, params)
                    .then(result => resolve(result.rows[0].Id))
                    .catch(e => reject(e));
            });
        }
        
        //
        // Development logic.
        //
        return new Promise((resolve, reject) =>
        {
            if (!this.db)
            {
                reject(new Error("Database context is not initialized."));
            }

            // Couldn't use arrow function here because this sqlite3 lib uses 'this' in the function body to
            // store data.
            this.db.run(sql, params, function(err)
            {
                if (err)
                {
                    reject(err);
                }

                const lastId: number = this.lastID;

                resolve(lastId);
            });
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
        //
        // Production logic.
        //
        if (Utility.isProdEnv())
        {
            return new Promise((resolve, reject) =>
            {
                this.db.query(sql, params)
                    .then(result => resolve(result.rows[0]))
                    .catch(e => reject(e));
            });
        }
        
        //
        // Development logic.
        //
        return new Promise((resolve, reject) =>
        {
            if (!this.db)
            {
                reject(new Error("Database context is not initialized."));
            }

            this.db.get(sql, params, (err, row) =>
            {
                if (err)
                {
                    reject(err);
                }

                resolve(row);
            });
        });
    }
}