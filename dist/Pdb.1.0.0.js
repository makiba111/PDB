/**
 * Pdb.js - JavaScript browser relational database.
 * @version 1.0.0
 *
 * MIT License
 */
class Pdb {
    static get SYS_TABLE() { return "__PDB_SYS_TABLES__"; }
    ;
    static get TABLE_KEY() { return "__id__"; }
    ;
    static get TABLE_PRIMARYS() { return "primaryKeys"; }
    ;
    static get KEY_SEP() { return "х"; }
    ; //U+0425
    /**
     * "Array.map" JavaScript Native function like method.
     * @param {Array} array target object.
     * @param {function(object, number): object} callback
     * @param {*} thisObj callback this object.
     * @returns map result.
     */
    static Array$map(array, callback, thisObj) {
        var result = [], value = null;
        for (var i = 0, len = array.length; i < len; i++) {
            value = callback(array[i], i, array);
            if (value != null) {
                result.push(value);
            }
        }
        return result;
    }
    /**
     * "Array.forEach" JavaScript Native function like method.
     * @param {Array} arr for-each target object.
     * @param {function(object, number): object} callback
     */
    static Array$each(arr, callback) {
        for (var i = 0, len = arr.length; i < len; i++) {
            if (callback.call(arr[i], arr[i], i) === false)
                break;
        }
    }
    /**
     * "jQuery.each" function like method.
     * @param {object} each target object.
     * @param {function(key, value): boolean} callback loop object key-value.
     */
    static Object$each(obj, callback) {
        for (var i in obj) {
            if (callback.call(obj[i], i, obj[i]) === false)
                break;
        }
    }
}
(function (Pdb) {
    class ManageTable {
        constructor() {
            this.tableMap = {};
        }
        import(list) {
            if (list == null) {
                this.tableMap = {};
                return;
            }
            var map = this.tableMap;
            Pdb.Array$each(list, function (r) {
                map[r[Pdb.TABLE_KEY]] = r[Pdb.TABLE_PRIMARYS];
            });
        }
        getTableNames() {
            return Object.keys(this.tableMap);
        }
        getTableKeys(tableName) {
            return this.tableMap[tableName];
        }
        deleteTableKeys(tableName) {
            delete this.tableMap[tableName];
        }
    }
    Pdb.ManageTable = ManageTable;
    class Database {
        constructor() {
            this._db = null;
            this._dbName = null;
            this.managedTable = new ManageTable();
        }
        isPrimaryKeyEmpty(tableName, targetObj) {
            var pk = this.managedTable.getTableKeys(tableName);
            var keys = Object.keys(targetObj);
            var pValue = null;
            for (var i = 0; i < pk.length; i++) {
                pValue = targetObj[pk[i]];
                if (!pValue || pValue === "") {
                    return null;
                }
            }
            return pk;
        }
        _createKey(tableName, data) {
            var pkArray = this.managedTable.getTableKeys(tableName);
            var s = "";
            for (var i = 0; i < pkArray.length; i++) {
                if (i !== 0)
                    s += Pdb.KEY_SEP;
                s += data[pkArray[i]];
            }
            return s;
        }
        _createRecord(tableName, data) {
            data[Pdb.TABLE_KEY] = this._createKey(tableName, data);
            return data;
        }
        deleteDataBase(dbName) {
            var _self = this;
            var req = indexedDB.deleteDatabase(dbName);
            return new Promise(function (resolve, reject) {
                req.onsuccess = function (e) {
                    _self._dbName = null;
                    _self.managedTable.import(null);
                    resolve(e);
                };
                req.onerror = function (e) {
                    reject(e);
                };
            });
        }
        openDatabase(dbName) {
            var _self = this;
            _self._dbName = dbName;
            var dfd = new Promise(function (resolve, reject) {
                var openReq = indexedDB.open(_self._dbName);
                openReq.onupgradeneeded = function (event) {
                    // DB not found(init db).
                    _self._db = event.target.result;
                    _self._db.createObjectStore(Pdb.SYS_TABLE, {
                        keyPath: Pdb.TABLE_KEY
                    });
                };
                openReq.onsuccess = function (event) {
                    _self._db = event.target.result;
                    _self.getTableData(Pdb.SYS_TABLE)
                        .then(function (ge) {
                        _self.managedTable.import(ge);
                        resolve(event);
                    }).catch(function (ee) {
                        reject(ee);
                    });
                };
                openReq.onerror = function (event) {
                    reject(event);
                };
            });
            return dfd;
        }
        getTableList() {
            return this.managedTable.getTableNames();
        }
        isExistTable(tableName) {
            var list = this.getTableList();
            for (let i = 0, len = list.length; i < len; i++) {
                if (list[i] === tableName)
                    return true;
            }
            return false;
        }
        createTable(tableName, primaryKeys) {
            var _self = this;
            var dfd = new Promise(function (resolve, reject) {
                for (var i = 0; i < _self._db.objectStoreNames.length; i++) {
                    if (_self._db.objectStoreNames[i] === tableName) {
                        return reject(new Error("table (" + tableName + ") is already exists."));
                    }
                }
                var version = _self._db.version + 1;
                _self._db.close();
                _self._db = null;
                var openReq = indexedDB.open(_self._dbName, version);
                openReq.onupgradeneeded = function (event) {
                    _self._db = event.target.result;
                    _self._db.createObjectStore(tableName, {
                        keyPath: Pdb.TABLE_KEY
                    });
                };
                openReq.onsuccess = function (event) {
                    _self._db = event.target.result;
                    // managed table update.
                    var tx = _self._db.transaction(_self._db.objectStoreNames, "readwrite");
                    tx.oncomplete = function (event) {
                        resolve(event);
                    };
                    tx.onerror = function (event) {
                        reject(event);
                    };
                    var objectStore = tx.objectStore(Pdb.SYS_TABLE);
                    var o = {};
                    o[Pdb.TABLE_KEY] = tableName;
                    o[Pdb.TABLE_PRIMARYS] = primaryKeys;
                    objectStore.put(o).onsuccess = function (e) {
                        _self.getTableData(Pdb.SYS_TABLE)
                            .then(function (ge) {
                            _self.managedTable.import(ge);
                            //resolve(e);
                        }).catch(function (ee) {
                            reject(ee);
                        });
                    };
                };
                openReq.onerror = function (event) {
                    reject(event);
                };
            });
            return dfd;
        }
        dropTables(tableNames) {
            var _self = this;
            var dfd = new Promise(function (resolve, reject) {
                var version = _self._db.version + 1;
                _self._db.close();
                _self._db = null;
                var openReq = indexedDB.open(_self._dbName, version);
                openReq.onupgradeneeded = function (event) {
                    _self._db = event.target.result;
                    for (var i = 0; i < tableNames.length; i++) {
                        var include = false;
                        for (var k = 0; k < _self._db.objectStoreNames.length; k++) {
                            if (_self._db.objectStoreNames[k] == tableNames[i]) {
                                include = true;
                                break;
                            }
                        }
                        if (!include) {
                            return reject(new Error("table (" + tableNames[i] + ") is not found."));
                        }
                    }
                    for (var i = 0; i < tableNames.length; i++) {
                        _self._db.deleteObjectStore(tableNames[i]);
                    }
                };
                openReq.onsuccess = function (event) {
                    _self._db = event.target.result;
                    var tx = _self._db.transaction(_self._db.objectStoreNames, "readwrite");
                    tx.oncomplete = function (event) {
                        resolve(event);
                    };
                    tx.onerror = function (event) {
                        reject(event);
                    };
                    var objectStore = tx.objectStore(Pdb.SYS_TABLE);
                    for (var i = 0; i < tableNames.length; i++) {
                        objectStore.delete(tableNames[i]).onsuccess = function () {
                            _self.managedTable.deleteTableKeys(tableNames[i]);
                        };
                    }
                };
                openReq.onerror = function (event) {
                    reject(event);
                };
            });
            return dfd;
        }
        importData(tableName, datas) {
            var _self = this;
            var dfd = new Promise(function (resolve, reject) {
                var tx = _self._db.transaction(_self._db.objectStoreNames, "readwrite");
                tx.oncomplete = function (event) {
                    resolve(event);
                };
                tx.onerror = function (event) {
                    reject(event);
                };
                var objectStore = tx.objectStore(tableName);
                datas.forEach(function (row, index) {
                    // no check data
                    objectStore.add(_self._createRecord(tableName, row));
                });
            });
            return dfd;
        }
        insert(tableName, data) {
            var _self = this;
            var dfd = new Promise(function (resolve, reject) {
                var tx = _self._db.transaction([Pdb.SYS_TABLE, tableName], "readwrite");
                tx.oncomplete = function (event) {
                    resolve(event);
                };
                tx.onerror = function (event) {
                    reject(event);
                };
                var result = _self.isPrimaryKeyEmpty(tableName, data);
                if (!result) {
                    throw new Error("primary key is empty(undefined, null, empty-string). " + JSON.stringify(data));
                }
                tx.objectStore(tableName).add(_self._createRecord(tableName, data));
            });
            return dfd;
        }
        update(tableName, data) {
            var _self = this;
            var dfd = new Promise(function (resolve, reject) {
                var tx = _self._db.transaction([Pdb.SYS_TABLE, tableName], "readwrite");
                tx.oncomplete = function (event) {
                    resolve(event);
                };
                tx.onerror = function (event) {
                    reject(event);
                };
                var result = _self.isPrimaryKeyEmpty(tableName, data);
                if (!result) {
                    throw new Error("primary key is empty(undefined, null, empty-string). " + JSON.stringify(data));
                }
                tx.objectStore(tableName)
                    .get(_self._createKey(tableName, data)).onsuccess = function (ue) {
                    var obj = ue.target.result;
                    // replace value.
                    for (var k in data) {
                        if (data.hasOwnProperty(k)) {
                            obj[k] = data[k];
                        }
                    }
                    tx.objectStore(tableName).put(obj);
                };
            });
            return dfd;
        }
        delete(tableName, keyData) {
            var _self = this;
            var dfd = new Promise(function (resolve, reject) {
                var tx = _self._db.transaction([Pdb.SYS_TABLE, tableName], "readwrite");
                tx.oncomplete = function (event) {
                    resolve(event);
                };
                tx.onerror = function (event) {
                    reject(event);
                };
                var result = _self.isPrimaryKeyEmpty(tableName, keyData);
                if (!result) {
                    throw new Error("primary key is empty(undefined, null, empty-string). " + JSON.stringify(keyData));
                }
                tx.objectStore(tableName).delete(_self._createKey(tableName, keyData));
            });
            return dfd;
        }
        getTableData(tableName) {
            var _self = this;
            var dfd = new Promise(function (resolve, reject) {
                var datas = [];
                var tx = _self._db.transaction([tableName], "readwrite");
                tx.oncomplete = function (event) {
                    resolve(datas);
                };
                tx.onerror = function (event) {
                    reject(event);
                };
                var table = tx.objectStore(tableName);
                table.openCursor().onsuccess = function (event) {
                    var cursor = event.target.result;
                    if (cursor) {
                        datas.push(cursor.value);
                        cursor.continue();
                    }
                };
            });
            return dfd;
        }
        close() {
            this._db.close();
        }
    }
    Pdb.Database = Database;
    /**
     * Query Library.
     */
    class Query {
        constructor(tables) {
            this.db = null;
            this._tableObj = tables;
            this._unionTable = [];
        }
        static qdbJoin(db, table, aliasName, whereFunc, params, query) {
            if (!db) {
                return Pdb.Array$map(table, function (r) {
                    var obj = {};
                    obj[aliasName] = r;
                    return obj;
                });
            }
            return Pdb.Array$map(db, function (row) {
                row[aliasName] = Pdb.Array$map(table, function (one) {
                    var condRow = {};
                    condRow[aliasName] = one;
                    Pdb.Object$each(row, function (key, value) {
                        condRow[key] = value;
                    });
                    if (whereFunc(condRow, params, query))
                        return one;
                });
                return row;
            });
        }
        /**
         * @param {string} joinType "inner-join" or "left-join"
         */
        static tableJoin(db, joinType, table, aliasName, whereFunc, params, tbls, isInnerQuery) {
            var query = null;
            if (isInnerQuery) {
                query = new Pdb.Query(JSON.parse(JSON.stringify(tbls)));
            }
            var r = Pdb.Query.qdbJoin(db, table, aliasName, whereFunc, params, query);
            var arr = [];
            Pdb.Array$each(r, function (row, index) {
                if (row[aliasName] && row[aliasName].length !== 0) {
                    var arrays = row[aliasName];
                    for (var i = 0, len = arrays.length; i < len; i++) {
                        var obj = {};
                        Pdb.Object$each(row, function (key, value) {
                            if (aliasName !== key) {
                                obj[key] = value;
                            }
                        });
                        obj[aliasName] = arrays[i];
                        arr.push(obj);
                    }
                }
                else if (joinType === "left-join") {
                    row[aliasName] = {};
                    arr.push(row);
                }
            });
            return arr;
        }
        /**
         * SQL compare operate method.
         * @param opr a, b compare operator(=, !=, <>, < , > , <=, >=).
         */
        static compare(a, opr, b) {
            if (!a || !b)
                return false;
            var r;
            switch (opr) {
                case '=':
                    r = (a === b);
                    break;
                case '!=':
                case '<>':
                    r = (a !== b);
                    break;
                case '<':
                    r = (a < b);
                    break;
                case '<=':
                    r = (a <= b);
                    break;
                case '>':
                    r = (a > b);
                    break;
                case '>=':
                    r = (a >= b);
                    break;
                default: false;
            }
            return r;
        }
        /**
         * get JSON "."-path value.
         * @example
         *    source = {"abc": {"efg": "hij" }};
         *    _getValue("abc", source); => {"efg": "hij"}
         *    _getValue("abc.efg", source); => hij
         */
        static _getValue(columnName, source) {
            if (!source)
                return undefined;
            var c = columnName.split('.');
            var v = source;
            for (var i = 0, len = c.length; i < len; i++) {
                if (!v[c[i]])
                    return undefined;
                else
                    v = v[c[i]];
            }
            return v;
        }
        static count(array) {
            return array.length;
        }
        static max(array, key) {
            var get = Pdb.Query._getValue;
            var c = 0;
            if (array.length == 1)
                return get(key, array[0]);
            return array.reduce(function (x, y, currentIndex) {
                var a = (c === 0) ? get(key, x) : x;
                c++;
                var b = get(key, y);
                if (!a && b)
                    return b;
                if (a && !b)
                    return a;
                return (a > b) ? a : b;
            });
        }
        static min(array, key) {
            var get = Pdb.Query._getValue;
            var c = 0;
            if (array.length == 1)
                return get(key, array[0]);
            return array.reduce(function (x, y, currentIndex) {
                var a = (c === 0) ? get(key, x) : x;
                c++;
                var b = get(key, y);
                if (!a && b)
                    return b;
                if (a && !b)
                    return a;
                return (a < b) ? a : b;
            });
        }
        static sum(array, key) {
            var get = Pdb.Query._getValue;
            var c = 0;
            var nvl = function (a) { return a || 0; };
            if (array.length === 1)
                return get(key, array[0]);
            var r = array.reduce(function (x, y, currentIndex) {
                var a = (c === 0) ? get(key, x) : x;
                c++;
                var b = get(key, y);
                if (a && !b)
                    return a;
                if (!a && b)
                    return b;
                return (!a && !b) ? undefined : nvl(a) + nvl(b);
            }, 0);
            return r;
        }
        static average(array, key) {
            return Pdb.Query.sum(array, key) / array.length;
        }
        /**
         * SQL "with" phrase.
         */
        with(tableName, withFn, params) {
            var tbl = withFn(params, new Pdb.Query(JSON.parse(JSON.stringify(this._tableObj))));
            this._tableObj[tableName] = tbl;
            return this;
        }
        /**
         * SQL "union" phrase.
         */
        union(isUnionAll) {
            this._unionTable.push({ "table": this.db, "isUnionAll": isUnionAll === true });
            this.db = null;
            return this;
        }
        /**
         * It is used at the end when "union()" is used.
         */
        unionEnd() {
            this.union(true);
            var arr = [];
            var beforeUnion = true;
            Pdb.Array$each(this._unionTable, function (row) {
                //arr = arr.concat(row.table);
                Array.prototype.push.apply(arr, row.table);
                if (beforeUnion === false) {
                    arr = new Pdb.Query({ "A": arr }).from("A", "A").distinct()._select_("A");
                }
                beforeUnion = row.isUnionAll;
            });
            this._unionTable = null;
            this.db = arr;
            return this;
        }
        /**
         * SQL "from" phrase.
         */
        from(tableName, aliasName) {
            var table = this._tableObj[tableName];
            this.db = Pdb.Query.qdbJoin(this.db, table, aliasName, function (row) {
                return row;
            });
            return this;
        }
        /**
         * SQL "from" phrase.
         */
        exists(whereFunc, params) {
            var tbl = this._tableObj;
            var ret = false;
            Pdb.Array$each(this.db, function (row) {
                if (whereFunc(row, params, new Pdb.Query(JSON.parse(JSON.stringify(tbl))))) {
                    ret = true;
                    return false;
                }
            });
            return ret;
        }
        /**
         * SQL "left outer join" phrase.
         */
        leftJoin(tableName, aliasName, whereFunc, params, isInnerQuery) {
            var table = this._tableObj[tableName];
            this.db = Pdb.Query.tableJoin(this.db, "left-join", table, aliasName, whereFunc, params, this._tableObj, isInnerQuery);
            return this;
        }
        /**
         * SQL "inner join" phrase.
         */
        innerJoin(tableName, aliasName, whereFunc, params, isInnerQuery) {
            var table = this._tableObj[tableName];
            this.db = Pdb.Query.tableJoin(this.db, "inner-join", table, aliasName, whereFunc, params, this._tableObj, isInnerQuery);
            return this;
        }
        /**
         * SQL "where" phrase.
         */
        where(whereFunc, params, isInnerQuery) {
            var tbl = this._tableObj;
            this.db = Pdb.Array$map(this.db, function (row) {
                let query = null;
                if (isInnerQuery) {
                    query = new Pdb.Query(JSON.parse(JSON.stringify(tbl)));
                }
                if (whereFunc(row, params, query))
                    return row;
            });
            return this;
        }
        /**
         * SQL "where" phrase.
         */
        orderBy(orderArray, params) {
            this.db = this.db.sort(function (f1, f2) {
                for (var i = 0, len = orderArray.length; i < len; i++) {
                    var keyValue = orderArray[i];
                    var key = Object.keys(keyValue)[0];
                    var value = keyValue[key];
                    if (value.toUpperCase() === 'DESC') {
                        if (f1[key] > f2[key]) {
                            return -1;
                        }
                        else if (f1[key] < f2[key]) {
                            return 1;
                        }
                    }
                    else {
                        if (f1[key] < f2[key]) {
                            return -1;
                        }
                        else if (f1[key] > f2[key]) {
                            return 1;
                        }
                    }
                }
                return 0;
            });
            return this;
        }
        /**
         * SQL "group by" phrase.
         */
        groupBy(groupColumns) {
            // groupColumns = {"name" : "A.abc", "companyName": "A.xyz"}
            var get = Pdb.Query._getValue;
            // grouping = { objKey : {keys, group} }
            var grouping = this.db.reduce(function (accumulator, current, currentIndex) {
                var obj = {};
                Pdb.Object$each(groupColumns, function (key, value) {
                    obj[key] = get(value, current);
                });
                if (currentIndex == 0) {
                    accumulator = {};
                }
                var accKey = JSON.stringify(obj);
                if (accKey in accumulator) {
                    // find
                    var v = accumulator[accKey];
                    var ar = v["group"] || [];
                    ar.push(current);
                    v["group"] = ar;
                    accumulator[accKey] = v;
                }
                else {
                    // not found
                    var v = {};
                    v["keys"] = obj;
                    v["group"] = [current];
                    accumulator[accKey] = v;
                }
                return accumulator;
            }, {});
            var result = [];
            Pdb.Object$each(grouping, function (key, value) {
                result.push({ keys: value.keys, group: value.group });
            });
            this.db = result;
            return this;
        }
        /**
         * SQL "distinct" phrase.
         */
        distinct() {
            // (value = null/undefined)
            var obj = {};
            Pdb.Array$each(this.db, function (row, index) {
                obj[JSON.stringify(row)] = row;
            });
            var array = [];
            Pdb.Object$each(obj, function (key, value) {
                array.push(value);
            });
            this.db = array;
            return this;
        }
        /**
         * SQL "select" phrase.
         */
        select(columnFunc, params) {
            var tbl = this._tableObj;
            var array = [];
            Pdb.Array$each(this.db, function (row, index) {
                var newRow = columnFunc(row, params, new Pdb.Query(JSON.parse(JSON.stringify(tbl))));
                array.push(newRow);
            });
            this.db = array;
            return this;
        }
        _select_(aliasName) {
            return Pdb.Array$map(this.db, function (r, index) {
                return r[aliasName];
            });
        }
        result() {
            return this.db;
        }
    }
    Pdb.Query = Query;
    class QueryBuilder {
        constructor(_dbName) {
            this.databaseName = _dbName;
            this.queryQueue = [];
            this.tableList = [];
            this.withTable = [];
        }
        /**
         * @returns PDB instance.
         */
        useTables( /* tableNames */) {
            for (var i = 0; i < arguments.length; i++) {
                if (this.tableList.indexOf(arguments[i]) >= 0) {
                    this.tableList.push(arguments[i]);
                }
            }
            return this;
        }
        with(tableName, withFn) {
            this.queryQueue.push({ type: "with", ex: { tableName: tableName, fn: withFn.toString() } });
            this.withTable.push(tableName);
            return this;
        }
        union(isUnionAll) {
            this.queryQueue.push({ type: "union", ex: { isUnionAll: isUnionAll } });
            return this;
        }
        unionEnd() {
            this.queryQueue.push({ type: "unionEnd", ex: {} });
            return this;
        }
        from(tableName, aliasName) {
            this.queryQueue.push({
                type: "from",
                ex: { tableName: tableName, aliasName: aliasName }
            });
            this.tableList.push(tableName);
            return this;
        }
        leftJoin(tableName, aliasName, whereFunc, isInnerQuery) {
            this.queryQueue.push({
                type: "leftJoin",
                ex: { tableName: tableName, aliasName: aliasName, fn: whereFunc.toString(), isInnerQuery: isInnerQuery }
            });
            this.tableList.push(tableName);
            return this;
        }
        innerJoin(tableName, aliasName, whereFunc, isInnerQuery) {
            this.queryQueue.push({
                type: "innerJoin",
                ex: { tableName: tableName, aliasName: aliasName, fn: whereFunc.toString(), isInnerQuery: isInnerQuery }
            });
            this.tableList.push(tableName);
            return this;
        }
        where(whereFunc, isInnerQuery) {
            this.queryQueue.push({
                type: "where",
                ex: { fn: whereFunc.toString(), isInnerQuery: isInnerQuery }
            });
            return this;
        }
        orderBy(orderArray) {
            this.queryQueue.push({ type: "orderBy", ex: { orderArray: orderArray } });
            return this;
        }
        groupBy(groupColumns) {
            this.queryQueue.push({ type: "groupBy", ex: { groupColumns: groupColumns } });
            return this;
        }
        distinct() {
            this.queryQueue.push({ type: "distinct", ex: {} });
            return this;
        }
        select(columnFunc) {
            this.queryQueue.push({ type: "select", ex: { fn: columnFunc.toString() } });
            return this;
        }
        build(params) {
            return {
                databaseName: this.databaseName,
                tableList: this.tableList,
                withTable: this.withTable,
                query: this.queryQueue,
                params: params
            };
        }
    }
    Pdb.QueryBuilder = QueryBuilder;
    class Async {
        static post(libUrl, parameter) {
            return new Promise(function (resolve, reject) {
                var worker = new Worker(libUrl);
                worker.addEventListener('message', function (message) {
                    resolve(message.data);
                    worker.terminate();
                });
                worker.addEventListener('onerror', function (message) {
                    reject(message);
                    worker.terminate();
                });
                worker.postMessage(parameter);
            });
        }
    }
    Pdb.Async = Async;
    class WebWorker {
        static async execute(parameters) {
            var databaseName = parameters['databaseName'];
            var tableList = parameters['tableList'];
            var withTable = parameters['withTable'];
            var params = parameters['params'];
            var queryQueue = parameters['query'];
            var tables = {};
            var pdb = new Pdb.Database();
            await pdb.openDatabase(databaseName);
            for (var i = 0; i < tableList.length; i++) {
                if (!withTable.includes(tableList[i])) {
                    var data = await pdb.getTableData(tableList[i]);
                    tables[tableList[i]] = data;
                }
            }
            pdb.close();
            var q = new Pdb.Query(tables);
            for (var i = 0, len = queryQueue.length; i < len; i++) {
                var queue = queryQueue[i];
                var fn = null;
                try {
                    //fn = queue.ex.fn ? eval("(" + queue.ex.fn + ")") : null;
                    fn = queue.ex.fn ? Function(queue.ex.fn.substring(queue.ex.fn.indexOf("(") + 1, queue.ex.fn.indexOf(")")), queue.ex.fn.substring(queue.ex.fn.indexOf("{") + 1, queue.ex.fn.lastIndexOf("}") - 1)) : null;
                }
                catch (e) {
                    throw new Error("function syntax error.\n" + e);
                }
                switch (queue.type) {
                    case "with":
                        q.with(queue.ex.tableName, fn, params);
                        break;
                    case "union":
                        q.union(queue.ex.isUnionAll);
                        break;
                    case "unionEnd":
                        q.unionEnd();
                        break;
                    case "from":
                        q.from(queue.ex.tableName, queue.ex.aliasName);
                        break;
                    case "leftJoin":
                        q.leftJoin(queue.ex.tableName, queue.ex.aliasName, fn, params, queue.ex.isInnerQuery);
                        break;
                    case "innerJoin":
                        q.innerJoin(queue.ex.tableName, queue.ex.aliasName, fn, params, queue.ex.isInnerQuery);
                        break;
                    case "where":
                        q.where(fn, params, queue.ex.isInnerQuery);
                        break;
                    case "orderBy":
                        q.orderBy(queue.ex.orderArray, params);
                        break;
                    case "groupBy":
                        q.groupBy(queue.ex.groupColumns);
                        break;
                    case "select":
                        q.select(fn, params);
                        break;
                    default:
                        break;
                }
            }
            return q.result();
        }
    }
    Pdb.WebWorker = WebWorker;
})(Pdb || (Pdb = {}));
// exec web worker only.
var isWorker = !!self.importScripts;
if (isWorker) {
    self.addEventListener('message', async function (message) {
        self.postMessage(await Pdb.WebWorker.execute(message.data));
    });
}
