Pdb.js
====

Overview
 JavaScript browser relational database.
 - SQL like syntax.
 - IndexedDB Backend.
 - Web Worker execute.

 Browser (Edge 41+, Firefox 59+, Chrome 65+) support.

## Description
 Support Database Operation.
 - create table
 - drop table
 - import
 - insert
 - update
 - delete
 - select-query
     - join(inner/left)
     - group-by
     - order-by

## Example
```javascript
var holes = [
    { "hole": 1, "par": 5 },
    { "hole": 2, "par": 6 },
    { "hole": 3, "par": 4 },
    { "hole": 4, "par": 3 },
];
var users = [
    { "name": "Noreen Ayers", "level": 3 },
    { "name": "Abbott Duncan", "level": 8 },
    { "name": "Harriett Manning", "level": 5 },
];
var scores = [
    { "name": "Noreen Ayers", "hole": 1, "strokes": 7 },
    { "name": "Noreen Ayers", "hole": 2, "strokes": 9 },
    { "name": "Noreen Ayers", "hole": 3, "strokes": 5 },
    { "name": "Abbott Duncan", "hole": 1, "strokes": 6 },
    { "name": "Abbott Duncan", "hole": 7, "strokes": 6 },
    { "name": "Abbott Duncan", "hole": 2, "strokes": 8 }
];

async function main() {
    try {
        var db = new Pdb.Database();

        var dbname = "data-base";

        // database open
        await db.openDatabase(dbname);//use IndexedDB name

        await db.createTable("holes", ["hole"]);
        await db.createTable("users", ["name"]);
        await db.createTable("scores", ["name", "hole"]);

        await db.importData("holes", holes);
        await db.importData("users", users);
        await db.importData("scores", scores);
        await db.insert("scores", { "name": "Harriett Manning", "hole": 1, "strokes": 9 });
        await db.update("scores", { "name": "Abbott Duncan", "hole": 2, "strokes": 8 });
        await db.delete("scores", { "name": "Abbott Duncan", "hole": 7 });

        var data = await db.getTableData("scores");
        data.forEach(function (row, index) {
            console.log(row);
        });

        var query1 = new Pdb.QueryBuilder(dbname)
            .from("scores", "A")
            .innerJoin("users", "B", function(record, params){
                if(Pdb.Query.compare(record.A.name, "=", record.B.name)) {
                    return true;
                }
            })
            .innerJoin("holes", "C", function(record, params){
                if(Pdb.Query.compare(record.A.hole, "=", record.C.hole)) {
                    return true;
                }
            })
            .where(function(record, params){
                if(Pdb.Query.compare(record.C.hole, "<=", params.hole)) {
                    return true;
                }
            })
            .select(function(record){
                return {
                    D: {
                        name: record.A.name,
                        hole: record.A.hole,
                        score: record.A.strokes - record.C.par
                    }
                }
            });

        console.log("---");
        var list = await Pdb.Async.post("./Pdb.1.0.0.js", query1.build({hole: 2}));
        list.forEach(function(row, index){
            console.log("data=" + JSON.stringify(row));
        });

        query1
            .groupBy({"name": "D.name"})
            .select(function(record){
                return {
                    name: record.keys.name,
                    hole: Pdb.Query.count(record.group, "D.hole"),
                    score: Pdb.Query.sum(record.group, "D.score")
                }
            })
            .orderBy([
                {"score": "ASC"}
            ]);
        
        console.log("---");
        var list = await Pdb.Async.post("./Pdb.1.0.0.js", query1.build({hole: 2}));
        list.forEach(function(row, index){
            console.log("data=" + JSON.stringify(row));
        });

        await db.deleteDataBase(dbname);
        db.close();
    } catch (e) {
        console.error(e);
    }
}
main();
```

## License
MIT License.
