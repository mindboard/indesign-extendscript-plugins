//@target InDesign
// Detect overset (hidden) text in the first table of the active document and fix it by
// widening overset columns, borrowing width from the widest column that can shrink
// without itself overflowing. Keeps total table width constant so the table still fits.
//
// Key API: cell.overflows (Boolean) detects overset in a table cell. An overset cell's
// .contents returns "" even though text is present, so always test .overflows.
// Call doc.recompose() after each width change or .overflows reports the stale layout.

var logs = [];
var console = {};
console.log = function(v){ $.writeln(v); logs.push(v); };

if (app.documents.length === 0){ 'no active document'; }
else {
    var doc = app.activeDocument;

    // find the first table in any story
    var table = null;
    for (var s=0; s<doc.stories.length && !table; s++){
        if (doc.stories.item(s).tables.length > 0) table = doc.stories.item(s).tables.item(0);
    }
    if (!table){ console.log('no table found'); }
    else {
        var colHasOverset = function(t,c){
            var cs = t.columns.item(c).cells;
            for (var i=0;i<cs.length;i++){ if (cs.item(i).overflows) return true; }
            return false;
        };
        var tableHasOverset = function(t){
            for (var c=0;c<t.columnCount;c++){ if (colHasOverset(t,c)) return true; }
            return false;
        };
        var widths = function(t){
            var a=[]; for (var c=0;c<t.columns.length;c++) a.push(t.columns.item(c).width.toFixed(1));
            return a.join(', ');
        };

        console.log('BEFORE: ' + widths(table) + '  overset=' + tableHasOverset(table));

        var step = 2, floor = 16, guard = 0;
        while (tableHasOverset(table) && guard < 200){
            guard++;
            var widenC = -1;
            for (var c=0;c<table.columnCount;c++){ if (colHasOverset(table,c)){ widenC=c; break; } }
            if (widenC < 0) break;

            var donor = -1, donorW = -1;
            for (var c=0;c<table.columnCount;c++){
                if (c===widenC || colHasOverset(table,c)) continue;
                var col = table.columns.item(c), orig = col.width;
                if (orig - step < floor) continue;
                col.width = orig - step; doc.recompose();   // tentative shrink
                var bad = colHasOverset(table,c);
                col.width = orig;        doc.recompose();    // revert
                if (!bad && orig > donorW){ donorW = orig; donor = c; }
            }
            if (donor < 0){ console.log('no safe donor at iter ' + guard); break; }

            table.columns.item(widenC).width += step;
            table.columns.item(donor).width  -= step;
            doc.recompose();
        }

        console.log('AFTER : ' + widths(table) + '  overset=' + tableHasOverset(table) + '  iters=' + guard);
    }
}
logs.join('\n');
