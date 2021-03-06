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
    Data.prototype.getAmount = function() {
        window.console && console.log('Abstract method "Data.getAmount" called.');
        return 0;
    };
    Data.prototype.getLabel = function() {
        window.console && console.log('Abstract method "Data.getLabel" called.');
        return 'error';
    };
    Data.prototype.getLength = function(){
        return this.points.length;
    };
    Data.prototype.findBars = function() {
        var length = this.getLength();
        this.median = this.getValue(Math.floor(length/2));
        this.bottom = this.getValue(Math.floor(length * 5 / 100));
        this.upper = this.getValue(Math.floor(length * 95 / 100));
        this.bin = (this.upper - this.bottom) / 8;
    };
    Data.prototype.sortPoints = function(a,b) {
        window.console && console.log('Abstact method "Data.sortPoints" called.');
        return 0;
    };

    function ViewEditData(points) {
        Data.call(this, points);
    };
    ViewEditData.prototype = Object.create(Data.prototype);
    ViewEditData.constructor = ViewEditData;
    ViewEditData.prototype.getValue = function(point) {
        return this.points[point][1];
    };
    ViewEditData.prototype.getAmount = function(point) {
        return this.points[point][1];
    };
    ViewEditData.prototype.getLabel = function(point) {
        return this.points[point][0];
    };
    ViewEditData.prototype.sortPoints = function(a,b) {
        return a[1] - b[1];
    };

    function IntervalData(points) {
        Data.call(this, points);
    };
    IntervalData.prototype = Object.create(Data.prototype);
    IntervalData.constructor = IntervalData;
    IntervalData.prototype.getValue = function(point) {
        return this.points[point][0];
    };
    IntervalData.prototype.getAmount = function(point) {
        return this.points[point][1];
    };
    IntervalData.prototype.getLabel = function(point) {
        return this.points[point][0];
    };
    IntervalData.prototype.sortPoints = function(a,b) {
        return a[0] - b[0];
    };

        var createIntervalData = function(joined) {
            var data = new IntervalData(joined);

            var bars = [createBar(0)];

            var bin = data.bin;

            var limit = bin + data.getValue(0);
            var binNr = 0;
            var i;
            var maxCount = -1;
            for(i = 0; i < data.getLength(); i++) {
                if(data.getValue(i) > limit) {
                    if(bars[binNr].count > maxCount) maxCount = bars[binNr].count;
                    bars[binNr].end = i-1;
                    binNr++;
                    // limit = joined[0][1] + (binNr + 1) * bin;
                    limit += bin;
                    bars[binNr] = createBar(i);
                }
                if(data.getAmount(i)) {
                    bars[binNr].count++;
                    bars[binNr].views += data.getAmount(i);
                    bars[binNr].contained.push(i);
                } else {
                    window.console && console.log("No views in " + i);
                }
            }
            bars[bars.length-1].end = joined.length - 1;

            data.maxCount = maxCount;
            data.bars = bars;

            return data;
        };
    var showHistogram = function($menu, data, title) {
        var heightContainer = 100;
        var widthContainer = 500;

        var i;

        var max = data.maxHeight;
        var joined = data.joined;
        var bars = data.bars;
        var bin = data.bin;

        foswiki.joined = data.joined;
        foswiki.bars=data.bars;

        var output = '';
//        output = '<table><tbody><tr>';
//        for(i = 0; i < bars.length; i++) {
//            var height = (bars[i].count * heightContainer / max);
//            output += '<td><div style="position: static; height: '+heightContainer+'px;"><div style="height: ' + (heightContainer - height) + 'px;"></div><div style="height: ' + height + 'px;" class="histo nr'+i+'"></div></div></td>';
//        }
//        output += '</tr><tr>';
//        for(i = 0; i < bars.length; i++) {
//            output += '<td>' + bars[i].count + '<br />' + bars[i].views + '</td>';
//        }
//        output += '</tr></tbody></table>';
        output += '<div style="height: '+heightContainer+'px; width: '+widthContainer+'px;" class="hcontainer"></div><div class="details" style="widht: '+widthContainer+'px; height: '+heightContainer+'px; overflow-y: auto;"></div>';
        var beams = '';
        var maxHeight = -1;
        for(i = 0; i < bars.length; i++) {
            var left, right;
            try { // XXX
                var w = 13;
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
                    right = data.getValue(bars[i].end);
                }
            } catch (e) {
                window.console && console.log("i: " + i + " start: " + bars[i].start + " end: " + bars[i].end);
                continue;
            }
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
        foswiki.data = data;
        var $d = showSubdialog($menu, output, {title: title || '', open: function(){
            if(inited) return;
            inited = true;
            renderHistogram($d, data);
        }});
    };

    var showSubdialog = function($menu, output, options) {
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
                    html += '<tr><td>'+data.getAmount(c) + '</td><td>' + data.getLabel(c) + '</td></tr>';
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
            var newbars = [];
            var newMaxHeight = -1;
            var newbar;
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
            var newdata = {bars: newbars, joined: data.joined, maxHeight: data.maxHeight, getValue: data.getValue, getLabel: data.getLabel, getAmount: data.getAmount, points: data.points}; // XXX create new Data object
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
    var successViewEdit = function(result){
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
            showSubdialog($menu, output, {title: title});
        };
        var showIntervalHistogram = function() {
            var points = [];
            var interval;
            for(interval in result.viewIntervals) {
                interval = parseFloat(interval);
                if(interval < 0 || result.viewIntervals[interval] <= 0) continue;
                points.push([interval, result.viewIntervals[interval]]);
            }
            points.sort(IntervalData.prototype.sortPoints);
            showHistogram($menu, createIntervalData(points), result.title);
        };
        var showViewEditHistogram = function() {
            var joined = [];
            var web, topic;
            for(web in result.viewRef) {
                for(topic in result.viewRef[web]) {
                    joined.push([web + topic, result.viewRef[web][topic]]);
                }
            }
            joined.sort(ViewEditData.prototype.sortPoints);

            showHistogram($menu, createViewEditData(joined), result.title);
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
                    window.console && console.log("No views in " + i);
                }
            }
            bars[bars.length-1].end = joined.length - 1;

            data.maxCount = maxCount;

            return data;
        };
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

    var successApproval = function(result){
        var showDraftIntervals = function() {
            var points = [];
            var interval;
            for(interval in result.DraftIntervals) {
                interval = parseFloat(interval);
                if(interval < 0 || result.DraftIntervals[interval] <= 0) continue;
                points.push([interval, Object.keys(result.DraftIntervals[interval]).length]);
            }
            points.sort(IntervalData.prototype.sortPoints);
            showHistogram($menu, createIntervalData(points), result.title);
        };
        var showApproveIntervals = function() {
            var points = [];
            var interval;
            for(interval in result.ApproveIntervals) {
                interval = parseFloat(interval);
                if(interval < 0 || result.ApproveIntervals[interval] <= 0) continue;
                points.push([interval, Object.keys(result.ApproveIntervals[interval]).length]);
            }
            points.sort(function(a,b) { return b[0] - a[0]; });
            showHistogram($menu, createIntervalData(points), result.title);
        };
        var showStateIntervals = function() {
            var points = [];
            var interval;
            var state = $menu.find('select[name="state"]').val();
            for(interval in result.StateIntervals[state]) {
                interval = parseFloat(interval);
                if(interval < 0) continue;
                points.push([interval, Object.keys(result.StateIntervals[state][interval]).length]);
            }
            foswiki.points = points;
            points.sort(function(a,b) { return a[0] - b[0]; });
            showHistogram($menu, createIntervalData(points), result.title);
        };
        var showApprovalDates = function() {
            var dates = [];
            for(var date in result.ApprovalDates) {
                dates.push([date, result.ApprovalDates[date]]);
            }
            dates.sort(IntervalData.prototype.sortPoints);
            foswiki.dates = dates;
            var start = dates[0][0];
            var end = dates[dates.length - 1][0];
            var secondsPerDay = 60 * 60 * 24;
            var secondsPerWeek = 60 * 60 * 24 * 7;
            var firstWeek = Math.floor(start / secondsPerWeek) * secondsPerWeek;
            var lastWeek = Math.ceil(1.0 * end / secondsPerWeek) * secondsPerWeek;
            var pos = 0;
            var output = '<table><tbody>';
            for(var week = firstWeek; week < lastWeek; week += secondsPerWeek) {
                var date = new Date(week * 1000);
                output += '<tr><td>Week '+date.toLocaleString()+'</td>';
                for(var day = week; day < week + secondsPerWeek; day += secondsPerDay) {
                    var height = 0;
                    while(dates[pos] && dates[pos][0] < day) {
                        height += dates[pos][1].length;
                        pos++;
                    }
                    var heightStretched = height * 2;
                    output += '<td><div class="calContainer"><div class="cal" style="height: '+height+'px;" title="'+height+'"></div></div></td>';
                }
                output += '</tr>';
            }
            output += '</tbody></table>';
            showSubdialog($menu, output, {});
        }

        var $menu = $(createDialog({title: result.title || ''}));
        var $topButton = $('<div class="statisticsButton">Show draft interval</div>'); // XXX MAKETEXT
        $topButton.click(showDraftIntervals);
        $menu.append($topButton);
        $menu.append('<p></p>');
        var $histoButton = $('<div class="statisticsButton">Show approve interval</div>'); // XXX MAKETEXT
        $histoButton.click(showApproveIntervals);
        $menu.append($histoButton);
        $menu.append('<p></p>');
        var $dateButton = $('<div class="statisticsButton">Show approval dates</div>'); // XXX MAKETEXT
        $dateButton.click(showApprovalDates);
        $menu.append($dateButton);
        $menu.append('<p></p>');
        var states = Object.keys(result.StateIntervals);
        var select = '<select name="state">';
        for(var stateNr = 0; stateNr < states.length; stateNr++) {
            select += '<option>'+states[stateNr]+'</option>';
        }
        select += '</select>';
        $menu.append(select);
        var $stateButton = $('<div class="statisticsButton">Show state intervals</div>'); // XXX MAKETEXT
        $stateButton.click(showStateIntervals);
        $menu.append($stateButton);
        $('body').append($menu);
    };

    var success = function(responseText, statusText, xhr, $form){
        $form.closest('.Statistics2Plugin').unblock();
        var result = $.parseJSON(responseText.result);
        if(!result) {
            $.pnotify('no result');
            return;
        }
        foswiki.result = result; // XXX remove me
        if($form.hasClass('ViewEdit')) {
            successViewEdit(result);
        } else if($form.hasClass('Approval')) {
            successApproval(result);
        }
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
