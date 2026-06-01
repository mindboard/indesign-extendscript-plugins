//@target InDesign

var logs = [];
var console = {};
console.log = function(v){
    $.writeln(v);
    logs.push(v);
};

var createDocument = function(pageParams){
    var docParams = {
        documentPreferences : {
            pageWidth   : pageParams.pageWidth+'mm',
            pageHeight  : pageParams.pageHeight+'mm',
            facingPages : false
        },
        cjkGridPreferences : {
            showAllLayoutGrids : false
        }
    };

    var doc = app.documents.add(docParams);

    var page = doc.pages[0];
    page.marginPreferences.properties = {
        top    : pageParams.marginTop+'mm',
        left   : pageParams.marginLeft+'mm',
        bottom : pageParams.marginBottom+'mm',
        right  : pageParams.marginRight+'mm'
    };

    return doc;
};

var createTextFrame = function(parent, params){
    return parent.textFrames.add({
        geometricBounds:[
            params.top+'mm',
            params.left+'mm',
            params.bottom+'mm',
            params.right+'mm']
    });
};

var pageParams = {
    pageWidth   : 297,
    pageHeight  : 210,
    marginTop   : 10,
    marginLeft  : 10,
    marginBottom: 10,
    marginRight : 10
};

var doc = createDocument(pageParams);
var page = doc.pages.item(0);

var textFrameParams = {
    top    : pageParams.marginTop,
    left   : pageParams.marginLeft,
    bottom : (pageParams.marginTop+40),
    right  : (pageParams.marginLeft+40)
};

var textFrame = createTextFrame(page, textFrameParams);
textFrame.contents = 'Hello!';
textFrame.textFramePreferences.verticalJustification = VerticalJustification.CENTER_ALIGN;
var textStyleRanges = textFrame.textStyleRanges;
var pstyle = textStyleRanges[0].appliedParagraphStyle;
pstyle.justification = Justification.CENTER_ALIGN;

console.log('OK');
logs.join('\n');
