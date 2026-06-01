//@target InDesign

var logs = [];
var console = {};
console.log = function(v){
    $.writeln(v);
    logs.push(v);
};

var createParagraphStyle = function(doc, params){
    var paragraphStyle = doc.paragraphStyles.itemByName( params.name );
    if (paragraphStyle!=null) {
        return paragraphStyle;
    }
    return doc.paragraphStyles.add(params);
};

var createTextFrame = function(page){
    var textFrame = page.textFrames.add();
    textFrame.geometricBounds = ['0mm','0mm','10mm','40mm'];
    textFrame.contents = 'Hello, World!';

    return textFrame;
};

var doc = app.documents.add({
    documentPreferences: {
        pageWidth   : '40mm',
        pageHeight  : '10mm',
        facingPages : false
    }
});
doc.cjkGridPreferences.showAllLayoutGrids = false;

var myParagraphStyle = createParagraphStyle(doc, { name : 'my-paragraph-style' });

var page = doc.pages[0];
var textFrame = createTextFrame( page );
textFrame.texts[0].applyParagraphStyle(myParagraphStyle, true);

console.log('OK');
logs.join('\n');
