//@target InDesign

var logs = [];
var console = {};
console.log = function(v){
    $.writeln(v);
    logs.push(v);
};

var doc = app.documents.add();
for(var i=0;i<doc.colors.length; i++){
    var item = doc.colors.item(i);
    console.log(item.name);
}

logs.join('\n');
