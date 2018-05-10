interface Window {
    importScripts;
    postMessage(any);
}
interface IDB_EventTarget extends EventTarget {
    result: IDBDatabase;
}

interface IDBVersionChangeEvent extends Event {
    target: IDB_EventTarget;
}
interface IDBOpenRequestEvent extends Event {
    target: IDB_EventTarget;
}


interface IDB_DBCursorEventTarget extends EventTarget {
    result: IDBCursorWithValue;
}
interface IDBOpenCursorEvent extends Event {
    target: IDB_DBCursorEventTarget;
}


interface IDBDatabase extends EventTarget {
    readonly name: string;
    readonly objectStoreNames: DOMStringList;
    onabort: ((this: IDBDatabase, ev: Event) => any) | null;
    onerror: ((this: IDBDatabase, ev: Event) => any) | null;
    onversionchange: ((this: IDBDatabase, ev: Event) => any) | null;
    readonly version: number;
    close(): void;
    createObjectStore(name: string, optionalParameters?: IDBObjectStoreParameters): IDBObjectStore;
    deleteObjectStore(name: string): void;
    transaction(storeNames: string | string[] | DOMStringList, mode?: IDBTransactionMode): IDBTransaction;
    addEventListener<K extends keyof IDBDatabaseEventMap>(type: K, listener: (this: IDBDatabase, ev: IDBDatabaseEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    removeEventListener<K extends keyof IDBDatabaseEventMap>(type: K, listener: (this: IDBDatabase, ev: IDBDatabaseEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}


interface PdbQueryQuere {
    type: string;
    ex: any;
}

interface PdbBuildParameter {
    databaseName;
    tableList;
    withTable;
    query;
    params;
}
