//@target InDesign

var logs = [];
var console = {};
console.log = function(v){
    $.writeln(v);
    logs.push(v);
};

var outputImageLinkNames = function(doc){
    var links = [];
    if (doc.pages.length>0) {
        var page = doc.pages[0];
        var allPageItemsOfPage = page.allPageItems;
        var len1 = allPageItemsOfPage.length;
        for(var j=0; j<len1; j++){
            var pageItem = allPageItemsOfPage[j];
            if (pageItem.constructor.name.match(/Image/)) {
                var link = pageItem.itemLink;
                console.log(link.name);
            }
        }
    }
}

var doc = app.activeDocument;
outputImageLinkNames(doc);
logs.join('\n');
