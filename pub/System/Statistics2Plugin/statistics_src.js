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
    var getNr = function($bar) {
        var nr = /(?:^| )bar(\d+)(?:$| )/.exec($bar.attr('class'));
        if(!nr) return undefined;
        return nr[1];
    };
    var createBar = function(start) { return {count:0, start:start, views:0, contained: []}; };
    var renderHistogram = function($d, data) {
        var bars = data.bars;
        var maxHeight = data.maxHeight;
        var joined = data.joined;
        var $container = $d.find('.hcontainer');
        $container.children().remove();
        var widthContainer = $container.width();
        var heightContainer = $container.height();
        console.log(bars);
        if(!bars.length) {
            window.console && console.log('No bars to render');
            return;
        }
        var stretch = widthContainer / (bars[bars.length - 1].right - bars[0].left);
        for(i = 0; i < bars.length; i++) {
            var left = (bars[i].left - bars[0].left) * stretch;
            var height = bars[i].height;
            height *= heightContainer / maxHeight;
            var width = bars[i].width * stretch - 1;
            //var height = (bars[i].count * heightContainer / max);
            var beam = '<div style="position: absolute; border: 1px solid black; background-color: yellow; height: '+Math.floor(height)+'px; bottom: 0px; width: '+Math.floor(width)+'px; left: '+Math.floor(left)+'px;" title="'+bars[i].count+' * ('+bars[i].right+' - '+bars[i].left+') = '+bars[i].views+'" class="bar bar'+i+'"></div>';
            // beams += beam;
            var $beam = $(beam);
            $beam.click(function(){
                var $this = $(this);
                var nr = getNr($this);
                if(nr === undefined) return;
                var html = '<table><tbody>';
                $.each(bars[nr].contained, function(idx, c) {
                    html += '<tr><td>'+joined[c][1] + '</td><td>' + joined[c][0] + '</td></tr>';
                });
                html += '</tbody></table>';
                $d.find('.details').html(html);
            });
            $container.append($beam);
        }
        var x;
        var mouseDown;
        $container.on('mousedown', function(e) {
            x = e.pageX;
            mouseDown = true;
        });
        $container.on('mouseup', function(e) {
            if(!mouseDown) return;
            var x2 = e.pageX;
            mouseDown = false;
            var dist = e.pageX - x;
            var xLeft, xRight;
            if(x < x2) {
                xLeft = x;
                xRight = x2;
            } else {
                xLeft = x2;
                xRight = x;
            }
            var end = -1;
            var start = joined.length;
            console.log("Coords: "+xLeft+" - " + xRight);
            newbars = [];
            newMaxHeight = -1;
            var newbar;
            console.log($container);
            console.log('Nr bars: ' + $container.find('.bar').length);
            $container.find('.bar').each(function(idx){
                var $this = $(this);
                var nr = getNr($this);
                if(nr === undefined) {
                    window.console && console.log('Could not find nr: '+$this.attr('class'));
                    return;
                }
                var oldbar = bars[nr];
                var xThisLeft = $this.offset().left;
                var xThisRight = xThisLeft + $this.width();
                if((xLeft < xThisLeft && xThisLeft < xRight) || (xRight > xThisRight && xThisRight > xLeft)) {
                    console.log("bingo");
                    if(!newbar) {
                        newbar = createBar(oldbar.start);
                    }
                    newbar.end = oldbar.end;
//                    if(start > oldbar.start) start = oldbar.start;
//                    if(end < oldbar.end) end = oldbar.end;
                    newbars.push(newbar);
                } else {
                    newbars.push(oldbar);
                    newbar = undefined;
                }
            });
            console.log(newbars);
            var newdata = {bars: newbars, joined: data.joined, maxHeight: data.maxHeight};
            renderHistogram($d, newdata);
        });
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
            $(item.split(/\/|\./)).each(followObj); // XXX Main.UserName
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
            if(options.open) $dialog.on('dialogopen', options.open);
            $dialog.on('dialogclose', function(){
                $menu.dialog('open');
                $dialog.remove();
            });

            $dialog.append('<div>'+output+'</div>');
            $dialog.append('<a class="jqUIDialogButton jqUIDialogClose {icon:\'ui-icon-circle-check\'}">OK</a>'); // XXX MAKETEXT
            $('body').append($dialog);
            return $dialog;
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
            var median = joined[Math.floor(count/2)][1];
            var bottom = joined[Math.floor(count * 5 / 100)][1];
            var upper = joined[Math.floor(count * 95 / 100)][1];
            var bin = (upper - bottom) / 8;
            var bars = [createBar(0)];
            foswiki.bars = bars;
            var limit = bin + joined[0][1];
            var binNr = 0;
            var i;
            var max = -1;
            var heightContainer = 100;
            var widthContainer = 500;
            for(i = 0; i < joined.length; i++) {
                if(joined[i][1] > limit) {
                    if(bars[binNr].count > max) max = bars[binNr].count;
                    bars[binNr].end = i-1;
                    binNr++;
                    // limit = joined[0][1] + (binNr + 1) * bin;
                    limit += bin;
                    if(0)if(limit <= joined[i][1]) {
                        limit = joined[i][1] + bars;
                    }
                    bars[binNr] = createBar(i);
                }
                if(joined[i][1]) {
                    bars[binNr].count++;
                    bars[binNr].views += joined[i][1];
                    bars[binNr].contained.push(i);
                } else {
                    console.log("No views in " + i);
                }
            }
            bars[bars.length-1].end = joined.length - 1;
            foswiki.bars=bars;

            var output = '<table><tbody><tr>';
            for(i = 0; i < bars.length; i++) {
                var height = (bars[i].count * heightContainer / max);
                output += '<td><div style="position: static; height: '+heightContainer+'px;"><div style="height: ' + (heightContainer - height) + 'px;"></div><div style="position: relative; border: 1px solid black; background-color: blue; bottom: 0px; width: 10px; height: ' + height + 'px;" class="histo nr'+i+'"></div></div></td>';
            }
            output += '</tr><tr>';
            for(i = 0; i < bars.length; i++) {
                output += '<td>' + bars[i].count + '<br />' + bars[i].views + '</td>';
            }
            output += '</tr></tbody></table>';
            output += '<div style="height: '+heightContainer+'px; width: '+widthContainer+'px; position: relative; background-color: #FEF;" class="hcontainer"></div><div class="details" style="widht: '+widthContainer+'px; height: '+heightContainer+'px; overflow-y: auto;"></div>';
            var beams = '';
            var maxHeight = -1; // XXX should be attribute of some bars object
            for(i = 0; i < bars.length; i++) {
                var left, right;
                try { // XXX
                if(i > 0) {
                    if(joined[bars[i].start][1] - joined[bars[i-1].end][1] > 2 * bin) {
                        left = joined[bars[i].start][1] - bin / 2;
                    } else {
                        left = (joined[bars[i].start][1] + joined[bars[i-1].end][1]) / 2;
                    }
                } else {
                    left = 0;
                }
                if(i < bars.length -1) {
                    if(joined[bars[i+1].start][1] - joined[bars[i].end][1] > 2 * bin) {
                        right = joined[bars[i].end][1] + bin / 2;
                    } else {
                        right = (joined[bars[i+1].start][1] + joined[bars[i].end][1]) / 2;
                    }
                } else {
                    right = (joined[bars[i].end][1]);
                }
                } catch (e) {
                    console.log("i: " + i + "start: " + bars[i].start + " end: " + bars[i].end);
                    continue;
                }
                //var right = joined[bars[i].end][1] * stretch;
                //var left = joined[bars[i].start][1] * stretch;
                var width, height;
                width = right - left;
                if(width) {
                    height = bars[i].views / width;
                } else {
                    height = 0;
                }
                if(height > maxHeight) maxHeight = height;
                bars[i].height = height;
                bars[i].left = left;
                bars[i].right = right;
                bars[i].width = width;
            }
            var data = {bars: bars, maxHeight: maxHeight, joined: joined};
            // XXX doing this in a shard will solve a lot of troubles
            var inited = false;
            var $d = showSubdialog(output, {title: result.title || '', open: function(){
                if(inited) return;
                inited = true;
                renderHistogram($d, data);
            }});
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
