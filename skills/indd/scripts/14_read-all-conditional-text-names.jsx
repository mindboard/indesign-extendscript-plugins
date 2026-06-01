//@target InDesign

var logs = [];
var console = {};
console.log = function(v){
    $.writeln(v);
    logs.push(v);
};

var doc = app.activeDocument;
if (doc!=null) {
    var conditions = doc.conditions;
    for(var i=0; i<conditions.length; i++){
        console.log(conditions[i].name);
    }
}

logs.join('\n');
