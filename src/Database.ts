import * as Sqlite from "sqlite3";

/**
 * 
 */
export class Database
{
    public db: Sqlite.Database;

    /**
     * 
     */
    constructor()
    {
        // Empty.
    }

    /**
     * 
     * @param filename 
     * @param mode 
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
     * 
     */
    public close()
    {
        this.db.close();
    }

    /**
     * 
     * @param sql 
     * @param params 
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
     * 
     * @param sql 
     * @param params 
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
     * 
     * @param sql 
     * @param params 
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