/**
 * Class for application wide data storage.
 */
export class DataStore
{
    private _store: Map<string, any>;

    /**
     * Default constructor.
     * @constructor
     */
    constructor()
    {
        this._store = new Map<string ,any>();
    }

    /**
     * Get a value in the data store for the specified key.
     * @param {string} key The key of the element in the store.
     * @returns {any} The value of the key-value pair in the store.
     */
    public get(key: string)
    {
        return this._store.get(key);
    }

    /**
     * Set a value in the data store.
     * @param key The key of the element in the store.
     * @param value The value to be stored.
     */
    public set(key: string, value: any)
    {
        this._store.set(key, value);
    }
}