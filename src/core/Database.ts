import * as Sqlite from "sqlite3";

/**
 * A database wrapper that takes the sqlite methods and wraps them in promises.
 */
export class Database
{
    public db: Sqlite.Database;

    /**
     * Default constructor.
     * @constructor
     */
    constructor()
    {
        // Empty.
    }

    /**
     * Connect to database file.
     * @param {string} filename Filename of the database to connect to.
     * @returns {Promise<boolean>} A promise with connection state represented by a boolean.
     */
    public connect(filename: string): Promise<boolean>
    {
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
     * @returns {Promise<boolean>} A promise with query run result represented by a boolean.
     */
    public run(sql: string, params: any): Promise<boolean>
    {
        return new Promise((resolve, reject) =>
        {
            if (!this.db)
            {
                reject(new Error("Database context is not initialized."));
            }

            this.db.run(sql, params, err =>
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
     * Get first row from result of a query.
     * @param {string} sql The sql query.
     * @param {any} params The params of the query.
     * @returns {Promise<any>} A promise with the first row of the query results.
     */
    public get(sql: string, params: any): Promise<any>
    {
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