//@target InDesign

var logs = [];
var console = {};
console.log = function(v){
    $.writeln(v);
    logs.push(v);
};

while( true ){
    if (app.documents.length<1) {
        break;
    }

    var doc  = app.activeDocument;
    console.log('close ' + doc.fullName);
    doc.close(SaveOptions.no);
}

logs.join('\n');
