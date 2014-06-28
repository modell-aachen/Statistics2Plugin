jQuery(function($) {
    "use strict";

    // XXX MAKETEXT pnotify

    function Data(points) {
        this.points = points;
        this.findBars();
    };
    Data.prototype.getValue = function() {
        window.console && console.log('Abstract method "Data.getValue" called.');
        return 0;
    };
    Data.prototype.getLabel = function() {
        window.console && console.log('Abstract method "Data.getLabel" called.');
        return 'error';
    };
    Data.prototype.getLength = function() {
        window.console && console.log('Abstract method "Data.getLength" called.');
        return 0;
    };
    Data.prototype.findBars = function() {
        var length = this.getLength();
        this.median = this.getValue(Math.floor(length/2));
        this.bottom = this.getValue(Math.floor(length * 5 / 100));
        this.upper = this.getValue(Math.floor(length * 95 / 100));
        this.bin = (this.upper - this.bottom) / 8;
    };

    function ViewEditData(points) {
        Data.call(this, points);
    };
    ViewEditData.prototype = Object.create(Data.prototype);
    ViewEditData.constructor = ViewEditData;
    ViewEditData.prototype.getValue = function(point) {
        return this.points[point][1];
    };
    ViewEditData.prototype.getLabel = function(point) {
        return this.points[point][0];
    };
    ViewEditData.prototype.getLength = function(){
        return this.points.length;
    };

    function IntervalData(points) {
        Data.call(this, points);
    };
    IntervalData.prototype = Object.create(Data.prototype);
    IntervalData.constructor = IntervalData;
    IntervalData.prototype.getValue = function(point) {
        return this.points[point][0];
    };
    IntervalData.prototype.getLabel = function(point) {
        return this.points[point][0];
    };
    IntervalData.prototype.getLength = function(){
        return this.points.length;
    };

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

        var i;
        for(i = 0; i < bars.length; i++) {
            var left = (bars[i].left - bars[0].left) * stretch;
            var height = bars[i].height;
            height *= heightContainer / maxHeight;
            var width = bars[i].width * stretch - 1;
            //var height = (bars[i].count * heightContainer / max);
            var beam = '<div style="height: '+Math.floor(height)+'px; bottom: 0px; width: '+Math.floor(width)+'px; left: '+Math.floor(left)+'px;" title="'+bars[i].count+' * ('+bars[i].right+' - '+bars[i].left+') = '+bars[i].views+'" class="bar bar'+i+'"></div>';
            // beams += beam;
            var $beam = $(beam);
            $beam.click(function(){
                var $this = $(this);
                var nr = getNr($this);
                if(nr === undefined) return;
                var html = '<table><tbody>';
                $.each(bars[nr].contained, function(idx, c) {
                    foswiki.data = data;
                    html += '<tr><td>'+data.getValue(c) + '</td><td>' + data.getLabel(c) + '</td></tr>';
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
            if(!dist) return true;
            var xLeft, xRight;
            if(x < x2) {
                xLeft = x;
                xRight = x2;
            } else {
                xLeft = x2;
                xRight = x;
            }
            var end = -1;
            var start = 999999; // XXX
            console.log("Coords: "+xLeft+" - " + xRight);
            var newbars = [];
            var newMaxHeight = -1;
            var newbar;
            console.log($container);
            console.log('Nr bars: ' + $container.find('.bar').length);
            var nr;
            for(nr = 0; nr < bars.length; nr++) {
                var $this = $container.find('.bar' + nr);
                if($this.length == 0) {
                    window.console && console.log('Could not find nr: '+nr);
                    return;
                }
                var oldbar = bars[nr];
                var xThisLeft = $this.offset().left;
                var xThisRight = xThisLeft + $this.width();
                if((xLeft < xThisLeft && xThisLeft < xRight) || (xRight > xThisRight && xThisRight > xLeft)) {
                    console.log("bingo: " + nr);
                    if(!newbar) {
                        newbar = createBar(oldbar.start);
                        newbar.left = oldbar.left;
                        newbars.push(newbar);
                    }
                    newbar.end = oldbar.end;
                    newbar.right = oldbar.right;
                    newbar.width = newbar.right - newbar.left;
                    newbar.count += oldbar.count;
                    newbar.views += oldbar.views;
                    if(newbar.width) {
                        newbar.height = newbar.views / newbar.width;
                    } else {
                        newbar.height = 0;
                    }
                } else {
                    newbars.push(oldbar);
                    newbar = undefined;
                }
            };
            var newdata = {bars: newbars, joined: data.joined, maxHeight: data.maxHeight, getValue: data.getValue, getLabel: data.getLabel};
            foswiki.data = newdata; // XXX
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
        var showIntervalHistogram = function() {
            var joined = [];
            var interval;
            for(interval in result.viewIntervals) {
                if(interval < 0 || result.viewIntervals[interval] <= 0) continue;
                joined.push([interval, result.viewIntervals[interval]]);
            }
            joined.sort(function(a,b) {
                return a[0] - b[0];
            });
            showHistogram(createIntervalData(joined));
        };
        var createIntervalData = function(joined) {
            var data = new IntervalData(joined);

            var bars = [createBar(0)];

            var bin = data.bin;

            var limit = bin + joined[0][0];
            var binNr = 0;
            var i;
            var maxCount = -1;
            for(i = 0; i < joined.length; i++) {
                if(joined[i][0] > limit) {
                    if(bars[binNr].count > maxCount) maxCount = bars[binNr].count;
                    bars[binNr].end = i-1;
                    binNr++;
                    // limit = joined[0][1] + (binNr + 1) * bin;
                    limit += bin;
                    bars[binNr] = createBar(i);
                }
                if(joined[i][0]) {
                    bars[binNr].count++;
                    bars[binNr].views += joined[i][1];
                    bars[binNr].contained.push(i);
                } else {
                    console.log("No views in " + i);
                }
            }
            bars[bars.length-1].end = joined.length - 1;

            data.maxCount = maxCount;
            data.bars = bars;
            data.bin = bin;

            return data;
        };
        var showViewEditHistogram = function() {
            var joined = [];
            var web, topic;
            for(web in result.viewRef) {
                for(topic in result.viewRef[web]) {
                    joined.push([web + topic, result.viewRef[web][topic]]);
                }
            }
            joined.sort(function(a,b) {
                return a[1] - b[1];
            });

            showHistogram(createViewEditData(joined));
        };
        var createViewEditData = function(joined) {
            var data = new ViewEditData(joined);

            var bin = data.bin;

            var bars = data.bars = [createBar(0)];
            var limit = bin + joined[0][1];
            var binNr = 0;
            var i;
            var maxCount = -1;
            for(i = 0; i < joined.length; i++) {
                if(joined[i][1] > limit) {
                    if(bars[binNr].count > maxCount) maxCount = bars[binNr].count;
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

            data.maxCount = maxCount;
//            data.bars = bars;
//            data.joined = joined;
//            data.bin = bin;
//            data.getValue = function(point) {
//                return joined[point][1];
//            };
//            data.getLabel = function(point) {
//                return joined[point][0];
//            };

            return data;
        };
        var showHistogram = function(data) {
            var heightContainer = 100;
            var widthContainer = 500;

            var i;

            var max = data.maxHeight;
            var joined = data.joined;
            var bars = data.bars;
            var bin = data.bin;

            foswiki.joined = data.joined;
            foswiki.bars=data.bars;

            var output = '<table><tbody><tr>';
            for(i = 0; i < bars.length; i++) {
                var height = (bars[i].count * heightContainer / max);
                output += '<td><div style="position: static; height: '+heightContainer+'px;"><div style="height: ' + (heightContainer - height) + 'px;"></div><div style="height: ' + height + 'px;" class="histo nr'+i+'"></div></div></td>';
            }
            output += '</tr><tr>';
            for(i = 0; i < bars.length; i++) {
                output += '<td>' + bars[i].count + '<br />' + bars[i].views + '</td>';
            }
            output += '</tr></tbody></table>';
            output += '<div style="height: '+heightContainer+'px; width: '+widthContainer+'px;" class="hcontainer"></div><div class="details" style="widht: '+widthContainer+'px; height: '+heightContainer+'px; overflow-y: auto;"></div>';
            var beams = '';
            var maxHeight = -1; // XXX should be attribute of some bars object
            for(i = 0; i < bars.length; i++) {
                var left, right;
                try { // XXX
                if(i > 0) {
                    if(data.getValue(bars[i].start) - data.getValue(bars[i-1].end) > 2 * bin) {
                        left = data.getValue(bars[i].start) - bin / 2;
                    } else {
                        left = (data.getValue(bars[i].start) + data.getValue(bars[i-1].end)) / 2;
                    }
                } else {
                    left = 0;
                }
                if(i < bars.length -1) {
                    if(data.getValue(bars[i+1].start) - data.getValue(bars[i].end) > 2 * bin) {
                        right = data.getValue(bars[i].end) + bin / 2;
                    } else {
                        right = (data.getValue(bars[i+1].start) + data.getValue(bars[i].end)) / 2;
                    }
                } else {
                    right = (data.getValue(bars[i].end));
                }
                } catch (e) {
                    console.log("i: " + i + " start: " + bars[i].start + " end: " + bars[i].end);
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
            data.maxHeight = maxHeight;
            data.bars = bars;
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
        var $topButton = $('<div class="statisticsButton">Show top edits/views</div>'); // XXX MAKETEXT
        $topButton.click(showTopResults);
        $menu.append($topButton);
        $menu.append('<p></p>');
        var $histoButton = $('<div class="statisticsButton">edits/views</div>'); // XXX MAKETEXT
        $histoButton.click(showViewEditHistogram);
        $menu.append($histoButton);
        $menu.append('<p></p>');
        var $intervalButton = $('<div class="statisticsButton">edit/view intervals</div>'); // XXX MAKETEXT
        $intervalButton.click(showIntervalHistogram);
        $menu.append($intervalButton);
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
