import { DataStore } from "../../DataStore";

export interface Handler
{
    ds: DataStore;

    handle<T>(arg: T);
}