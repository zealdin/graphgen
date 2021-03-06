$(document).ready(function() {

    var graphJson;

    var sheet = (function() {
        // Create the <style> tag
        var style = document.createElement("style");

        // Add a media (and/or media query) here if you'd like!
        // style.setAttribute("media", "screen")
        // style.setAttribute("media", "only screen and (max-width : 1024px)")

        // WebKit hack :(
        style.appendChild(document.createTextNode(""));

        // Add the <style> element to the page
        document.head.appendChild(style);

        return style.sheet;
    })();
    function addCSSRule(sheet, selector, rules, index) {
        if("insertRule" in sheet) {
            sheet.insertRule(selector + "{" + rules + "}", index);
        }
        else if("addRule" in sheet) {
            sheet.addRule(selector, rules, index);
        }
    }




    $('.exportButtons').hide();
    // Instantiate code editor

    var editor = CodeMirror.fromTextArea(document.getElementById("patternBox"), {
        lineNumbers: true,
        mode: "application/x-cypher-query",
        matchBrackets: true,
        autofocus: true,
        theme: 'neo'
    });

    precalculate();

    function precalculate(){
        var transformUrl = $('#patternBox').attr('data-validator');
        var data = editor.getValue();
        $.ajax({
            url: transformUrl,
            type: "POST",
            data: {'pattern': data}
        })
            .done(function(result){
                var graph = $.parseJSON(result);
                if ($.isNumeric(graph.nodes)){
                    $('#gen_button').prop("disabled",true);
                    $('#gen_blocked').show();
                    $('#precalculate-info').html(graph.nodes + ' nodes ');
                }
                else if (graph.nodes.length > 999){
                    $('#gen_button').prop("disabled",true);
                    $('#gen_blocked').show();
                    $('#precalculate-info').html(graph.nodes.length + ' nodes | ~ ' + graph.edges.length + ' edges');
                } else {
                    $('#gen_blocked').hide();
                    $('#gen_button').prop("disabled",false);
                    $('#precalculate-info').html(graph.nodes.length + ' nodes | ~ ' + graph.edges.length + ' edges');
                }

                return true;

            })
            .fail(function(error){
                return false;
            });
    }

    editor.on("change", function(cm, change) {
        precalculate();
    });


    $('#patternForm').submit(function (e) {
        e.preventDefault();
        var apiEndpoint = $(this).attr('action');
        var pattern = $('#patternBox').val();
        var posting = $.post(apiEndpoint, {'pattern': pattern});
        var clusterColors = ["#DD79FF", "#FFFC00", "#00FF30", "#5168FF", "#00C0FF",
            "#FF004B", "#00CDCD", "#f83f00", "#f800df", "#ff8d8f",
            "#ffcd00", "#184fff", "#ff7e00"];
        var rulesRuled = [];
        var nodeTypes = [];
        posting.done(function (data) {
            $('#cypherError').hide();
            var data = $.parseJSON(data);
            g = {
                nodes: [],
                edges: []
            };
            $.each(data.nodes, function (index, node) {
                g.nodes.push({
                    id: node._id,
                    label: node.identifier,
                    caption: node.identifier,
                    node_type: node.label,
                    cluster: node.cluster,
                    properties: node.properties,
                    labels: node.labels
                });
                if (!(node.identifier in rulesRuled)){
                    rulesRuled[node.identifier] = node.cluster;
                    nodeTypes.push(node.identifier);
                }
            });

            $.each(data.edges, function (index, edge) {
                g.edges.push({
                    source: edge._source,
                    target: edge._target,
                    caption: edge.type
                });
            });

            var config = {
                dataSource: g,
                nodeTypes: {"label": nodeTypes},
                forceLocked: true,
                collisionDetection: true,
                zoomControls: true,
                initialScale: 0.5,
                cluster: false,
                clusterKey: 'cluster',
                rootNodeRadius: 30,
                toggleRootNodes: false,
                nodeMouseOver: function(node){
                    console.log(node);
                    setNodeInfo(node);
                }
            };
            $('#gjson_result').html(JSON.stringify(data));
            $('#alchemy').show();
            $('#alchemy').css('min-height', '600px');
            $('#intro').hide();
            alchemy.begin(config);
            $.each(nodeTypes, function(index, type){
                clust = rulesRuled[type];
                $('.' + type + ' circle').attr('fill', clusterColors[clust]);
                $('.' + type + ' circle').css('fill', clusterColors[clust]);
            });
            $('.directLink').attr('href', window.location.origin + '?graph=' + data.shareUrl);
            $('.directShortLink').html('Link: ' + data.shareUrl);
            var shareText = 'Hey look, I just generated a graph on Graphgen. See it here : http://graphgen.neoxygen.io/?graph=' + data.shareUrl + ' #neo4j #neoxygen';
            $('.twitterShareLink').attr('href', 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(shareText));
            $('.facebookShareLink').attr('href', 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareText));
            $('.exportButtons').show();



        });
        posting.fail(function(data){
            var error = data.responseJSON.error;
            console.log(error);
            $('#cypherError').html('<p>' + error.message + '</p>');
            $('#cypherError').show();
        });

    });

    $('#exportToGraphJson').submit(function(e){
        var pattern = $('#gjson_result').html();
        $('#gjson_pattern').val(pattern);
    });

    $('#exportToCypher').submit(function(e){
        var pattern = $('#gjson_result').html();
        $('#cypher_pattern').val(pattern);
        console.log(pattern);
    });

    function setNodeInfo(node)
    {
        var box = $('#nodeInfo');
        box.show();
        box.html('');
        var labels = node.properties.labels.join();
        box.append('<p>Identifier : ' + node.properties.label + '</p>');
        box.append('<p>Labels : ' + labels + '</p>');
        box.append('<h5>Properties</h5>');
        box.append('<ul>');
        $.each(node.properties.properties, function(index, value){
            box.append('<li>' + index + ' : ' + value + '</li>');
        });
        box.append('</ul>');
    }

    $('#console-create-button').click(function(){
        createConsole();
    });

    $('#consolePopClose').click(function(){
        setTimeout(function(){
            $('#modal-console-loading').show();
            $('#modal-console-success').hide();
            $('#console-target-link').attr('href', '#');
        }, 500);
    });

    $('#graphGistPopClose').click(function(){
        setTimeout(function(){
            $('#graphgist-header').html('');
            $('#graphgist-creator').html('');
            $('#graphgist-remain').html('');
        }, 500);
    });

    function createConsole(){
        var consoleUrl = $('#console-create-button').attr('data-validator');
        var data = $('#gjson_result').html();
        $.ajax({
            url: consoleUrl,
            type: "POST",
            data: {'pattern': data}
        })
            .done(function(result){
                setTimeout(function(){
                    $('#console-target-link').attr('href', result.console_url);
                    $('#modal-console-loading').hide();
                    $('#modal-console-success').show();
                }, 3000);
                return true;

            })
            .fail(function(error){
                console.log(error);
                setTimeout(function(){
                    $('#modal-console-loading').hide();
                    $('#console-error-message').html(error.message);
                    $('#modal-console-success').show();
                }, 3000);
                return false;
            });
    }

    function nl2br (str, is_xhtml) {
        var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';
        return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1'+ breakTag +'$2');
    }

    function SelectText(element) {
        var text = document.getElementById(element);
        if ($.browser.msie) {
            var range = document.body.createTextRange();
            range.moveToElementText(text);
            range.select();
        } else if ($.browser.mozilla || $.browser.opera) {
            var selection = window.getSelection();
            var range = document.createRange();
            range.selectNodeContents(text);
            selection.removeAllRanges();
            selection.addRange(range);
        } else if ($.browser.safari) {
            var selection = window.getSelection();
            selection.setBaseAndExtent(text, 0, text, 1);
        }
    }

    $('#graphgist-create-button').click(function(e){
        e.preventDefault();
        var target = $(this).attr('data-validator');
        var graph = $('#gjson_result').html();
        $.ajax({
            url: target,
            type: "POST",
            data: {'graph': graph}
        })
            .done(function(gist){
                var result = $.parseJSON(gist);
                console.log(result);
                $('#graphgist-header').html(nl2br(result.header));
                $('#graphgist-creator').html(nl2br(result.creator));
                $('#graphgist-remain').html(nl2br(result.remain));
            })
            .fail(function(error){
                console.log('error');
            });
    });
});