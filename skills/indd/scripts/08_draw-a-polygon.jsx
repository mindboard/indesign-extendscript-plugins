//@target InDesign

var logs = [];
var console = {};
console.log = function(v){
    $.writeln(v);
    logs.push(v);
};

var params = {};
params.documentPreferences = {
    pageWidth   : '100mm',
    pageHeight  : '100mm',
    facingPages : false};

var doc = app.documents.add(params);

var page = doc.pages.item(0);
page.marginPreferences.properties = {
    top    : '0mm',
    left   : '0mm',
    bottom : '0mm',
    right  : '0mm'};

var polygon = page.polygons.add({});
polygon.strokeWeight = '0.25mm';

polygon.paths[0].properties = {
    entirePath: [['90mm','10mm'],['10mm','90mm']],
    pathType:   PathType.OPEN_PATH
};

console.log('OK');
logs.join('\n');
