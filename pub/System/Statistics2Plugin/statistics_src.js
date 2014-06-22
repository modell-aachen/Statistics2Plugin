jQuery(function($) {
    // XXX MAKETEXT pnotify
    var createDialog = function(options) {
        return '<div class="jqUIDialog {width:' + ((options.width!==undefined)?options.width:'600') +
            ', modal:' + ((options.modal!==undefined)?options.modal:'true') +
            ',draggable:' + ((options.draggable!==undefined)?options.draggable:'true') +
            ',autoOpen:' + ((options.autoOpen!==undefined)?options.autoOpen:'true') +
            ',resizable:' + ((options.resizable!==undefined)?options.resizable:'true') +
            ',closeOnEscape:' + ((options.closeOnEscape!==undefined)?options.closeOnEscape:'true') +
            ((options.title!==undefined)?(',title:\''+options.title.replace("'","\\'")+'\''):'') +
            '} '+((options.dialogClass!==undefined)?options.dialogClass:'modacAjaxDialog')+'"></div>';
    };
    var toCsv = function(result, listName, refName) {
        var csv = '';
        var obj;
        var list = result[listName];
        if(!list) {
            $.pnotify('List ' + listName + ' does not exist.');
            return csv;
        }
        var ref = result[refName];
        if(!ref) {
            $.pnotify('Reference ' + refName + ' does not exist.');
            return csv;
        }
        var followObj = function(idx, subitem) {
            if(!obj) return;
            obj = obj[subitem];
        };
        $(list).each(function(idx, item){
            if(!item) {
                $.pnotify('List with empty item: ' + listName);
                window.console && console.log(list);
                return;
            }
            var n;
            obj = ref;
            $(item.split(/\//)).each(followObj); // rather cheaply not splitting on . to avoid Main.UserName
            if(!obj) {
                $.pnotify(refName+'['+item+'] not found!');
                obj = 0;
            }
            n = obj;
            csv += n + ',' + item + '<br />';
        });
        return csv;
    };
    var success = function(responseText, statusText, xhr, $form){
        var showSubdialog = function(output, options) {
            $menu.dialog('close');
            var $dialog = $(createDialog(options));
            $dialog.on('dialogclose', function(){
                $menu.dialog('open');
                $dialog.remove();
            });

            $dialog.append('<div>'+output+'</div>');
            $dialog.append('<a class="jqUIDialogButton jqUIDialogClose {icon:\'ui-icon-circle-check\'}">OK</a>'); // XXX MAKETEXT
            $('body').append($dialog);
        };
        var showTopResults = function() {
            var output = '<h2>Top ' + result.topEditRange + ' edited topics</h2>'; // XXX MAKETEXT
            output += toCsv(result, 'edit_top', 'saveRef');
            output += '<h2>Top ' + result.topViewRange + ' viewed topics</h2>';
            output += toCsv(result, 'view_top', 'viewRef');
            output += '<h2>Top ' + result.topEditorsRange + ' editors</h2>';
            output += toCsv(result, 'editors_top', 'editors');
            output += '<h2>Top ' + result.topViewersRange + ' viewers</h2>';
            output += toCsv(result, 'viewers_top', 'viewers');
            var title = (result.title || '') + ' top usage';
            showSubdialog(output, {title: title});
        };
        var showHistogram = function() {
            var joined = [];
            for(web in result.viewRef) {
                for(topic in result.viewRef[web]) {
                    joined.push([web + topic, result.viewRef[web][topic]]);
                }
            }
            joined.sort(function(a,b) {
                return a[1] - b[1];
            });
            var count = joined.length;
            var median = joined[count/2][1];
            var bottom = joined[Math.floor(count * 10 / 100)][1];
            var upper = joined[Math.floor(count * 90 / 100)][1];
            var bin = (upper - bottom) / 8;
            var bars = [{count:0, start:0}];
            var limit = bin;
            var binNr = 0;
            var i;
            var max = -1;
            for(i = 0; i < joined.length; i++) {
                if(joined[i][1] > limit) {
                    if(bars[binNr].count > max) max = bars[binNr].count;
                    binNr++;
                    limit = (binNr + 1) * bin;
                    bars[binNr] = {count: 0, start: i};
                }
                bars[binNr].count++;
            }

            var output = '<table><tbody><tr>';
            for(i = 0; i < bars.length; i++) {
                var height = (bars[i].count * 100 / max);
                output += '<td><div style="position: static; height: 100px;"><div style="height: ' + (100 - height) + 'px;"></div><div style="position: relative; border: 1px solid black; background-color: blue; bottom: 0px; width: 10px; height: ' + height + 'px;" class="histo nr'+i+'"></div></div></td>';
            }
            output += '</tr><tr>';
            for(i = 0; i < bars.length; i++) {
                output += '<td>' + bars[i].count + '</td>';
            }
            output += '</tr></tbody></table>';
            showSubdialog(output, {title: result.title || ''});
        };
        $form.closest('.Statistics2Plugin').unblock();
        var result = $.parseJSON(responseText.result);
        if(!result) {
            $.pnotify('no result');
            return;
        }
        foswiki.result = result; // XXX remove me
        var $menu = $(createDialog({title: result.title || ''}));
        var $topButton = $('<div style="border: 1px solid black;">Show top edits/views</div>'); // XXX MAKETEXT
        $topButton.click(showTopResults);
        $menu.append($topButton);
        $menu.append('<p></p>');
        var $histoButton = $('<div style="border: 1px solid black;">edits/views</div>'); // XXX MAKETEXT
        $histoButton.click(showHistogram);
        $menu.append($histoButton);
        $('body').append($menu);
    };
    var beforeSubmit = function(arr, $form, options) {
        $form.closest('.Statistics2Plugin').block();
    };
    $('div.Statistics2Plugin form').each(function(){
        var $form = $(this);
        var error = function(jqXHR, textStatus, error) {
            $form.closest('.Statistics2Plugin').unblock();
            if($.pnotify) $.pnotify({
                text: textStatus,
                type: 'error'
            });
        };
        $form.ajaxForm({
            dataType:"json",
            cache: false,
            beforeSubmit: beforeSubmit,
            success: success,
            error: error
        });
    });
});
