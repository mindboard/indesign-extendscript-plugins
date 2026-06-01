//@target InDesign

var logs = [];
var console = {};
console.log = function(v){
    $.writeln(v);
    logs.push(v);
};

var params = {};
params.documentPreferences = {
    pageWidth   : '210mm',
    pageHeight  : '297mm',
    facingPages : false
};

var doc = app.documents.add(params);

var page = doc.pages.item(0);
page.marginPreferences.properties = {
    top    : '10mm',
    left   : '10mm',
    bottom : '10mm',
    right  : '10mm'
};

console.log('OK');
logs.join('\n');
