/*jslint eqeq: true, plusplus: true, undef: true, sloppy: true, vars: true, forin: true, nomen: true */
(function ($) {

    $.mobiscroll.classes.Scroller = function (elem, settings) {

        var doc,
            endPos,
            lang,
            markup,
            preset,
            startPos,
            theme,
            valueText,
            wheelHeight,
            wheelIndex, // Index of scrolled wheel
            wheelMarkup,
            wnd,
            that = this,
            e = elem,
            elm = $(e),
            s = extend({}, defaults),
            wheels = [],
            wheelPosition = {},
            wheelScrolled = false,
            wheelScrolling = {},
            elmList = [],
            isInput = elm.is('input'),
            isScrollable = true,
            isVisible = false,
            lockScroll = false,
            preventShow = false,
            preventChange = false;

        // Private functions

        function event(name, args) {
            var ret;
            args.push(that);
            $.each([theme, preset, settings], function (i, v) {
                if (v && v[name]) { // Call preset event
                    ret = v[name].apply(e, args);
                }
            });
            return ret;
        }

        function genWheelItems(i) {
            var html = '<div class="dw-bf">',
                l = 1,
                w = wheels[i],
                labels = w.labels || [],
                values = w.values,
                keys = w.keys || values;

            $.each(values, function (j, v) {
                if (l % 20 == 0) {
                    html += '</div><div class="dw-bf">';
                }
                html += '<div role="option" class="dw-li dw-v" data-val="' + keys[j] + '"' + (labels[j] ? ' aria-label="' + labels[j] + '"' : '') + ' style="height:' + wheelHeight + 'px;top:' + (j * wheelHeight) + 'px;"><div class="dw-i">' + v + '</div></div>';
                l++;
            });

            return html + '</div>';
        }

        function getCurrPos(i) {
            var target = wheelMarkup[i],
                style = window.getComputedStyle ? getComputedStyle(target) : target.style,
                matrix;

            if (has3d) {
                $.each(['t', 'webkitT', 'MozT', 'OT', 'msT'], function (i, v) {
                    if (style[v + 'ransform'] !== undefined) {
                        matrix = style[v + 'ransform'];
                        return false;
                    }
                });
                matrix = matrix.split(')')[0].split(', ');
                return +(matrix[13] || matrix[5]);
            }

            return +style.top.replace('px', '');
        }

        function scroll(i, px, time, active) {
            /*var px = (m - val) * hi,
                style = t[0].style,
                i;

            if (px == pixels[index] && iv[index]) {
                return;
            }

            if (time && px != pixels[index]) {
                // Trigger animation start event
                event('onAnimStart', [dw, index, time]);
            }

            pixels[index] = px;

            style[pr + 'Transition'] = 'all ' + (time ? time.toFixed(3) : 0) + 's ease-out';

            if (has3d) {
                style[pr + 'Transform'] = 'translate3d(0,' + px + 'px,0)';
            } else {
                style.top = px + 'px';
            }

            if (iv[index]) {
                ready(t, index);
            }

            if (time && active) {
                t.closest('.dwwl').addClass('dwa');
                iv[index] = setTimeout(function () {
                    ready(t, index);
                }, time * 1000);
            }

            pos[index] = val;*/

            var style = wheelMarkup[i].style;

            style[jsPrefix + 'Transition'] = 'all ' + (time || 0) + 'ms ease-out';

            if (has3d) {
                style[jsPrefix + 'Transform'] = 'translate3d(0,' + px + 'px,0)';
            } else {
                style.top = px + 'px';
            }

            if (wheelScrolling[i]) {
                scrollReady(i);
            }

            if (time !== undefined) {
                wheelScrolling[i] = setTimeout(function () {
                    infinite();
                    scrollReady(i, px);
                }, time);
            }

            wheelPosition[i] = px;
        }

        function scrollReady(i) {
            clearTimeout(wheelScrolling[i]);
            delete wheelScrolling[i];
            //t.closest('.dwwl').removeClass('dwa');
        }

        // Event handlers

        function onStart(ev) {
            // Scroll start
            /*if (testTouch(e) && !move && !click && !btn && !isReadOnly(this)) {
                // Prevent touch highlight
                e.preventDefault();

                move = true;
                scrollable = s.mode != 'clickpick';
                target = $('.dw-ul', this);
                setGlobals(target);
                moved = iv[index] !== undefined; // Don't allow tap, if still moving
                p = moved ? getCurrentPosition(target) : pos[index];
                start = getCoord(e, 'Y');
                startTime = new Date();
                stop = start;
                scroll(target, index, p, 0.001);

                if (scrollable) {
                    target.closest('.dwwl').addClass('dwa');
                }

                $(document).on(MOVE_EVENT, onMove).on(END_EVENT, onEnd);
            }*/

            if (!scrolling) {
                // Prevent touch highlight
                ev.preventDefault();

                scrolling = true;

                startPos = getCoord(ev, 'Y');
                startTime = new Date();
                wheelIndex = +$(this).attr('data-index');
                wheelScrolled = wheelScrolling[wheelIndex] !== undefined; // Wheel is currently moving
                currPos = wheelScrolled ? getCurrPos(wheelIndex) : wheelPosition[wheelIndex];
                //lastPos = wheelPosition[wheelIndex];
                endPos = startPos;

                scroll(wheelIndex, currPos, 1);

                if (ev.type === 'mousedown') {
                    $(document).on('mousemove', onMove).on('mouseup', onEnd);
                }
            }
        }

        function onMove(ev) {
            /*if (scrollable) {
                // Prevent scroll
                e.preventDefault();
                e.stopPropagation();
                stop = getCoord(e, 'Y');
                scroll(target, index, constrain(p + (start - stop) / hi, min - 1, max + 1));
            }
            if (start !== stop) {
                moved = true;
            }*/

            if (scrolling) {

                if (isScrollable) {
                    // Prevent native scroll
                    ev.preventDefault();

                    endPos = getCoord(ev, 'Y');

                    scroll(wheelIndex, Math.min(-first * wheelHeight, Math.max(currPos + endPos - startPos, -last * wheelHeight)));
                }

                if (startPos !== endPos) {
                    wheelScrolled = true;
                }
            }
        }

        function onEnd(ev) {
            /*var time = new Date() - startTime,
                val = constrain(p + (start - stop) / hi, min - 1, max + 1),
                speed,
                dist,
                tindex,
                ttop = target.offset().top;

            if (time < 300) {
                speed = (stop - start) / time;
                dist = (speed * speed) / s.speedUnit;
                if (stop - start < 0) {
                    dist = -dist;
                }
            } else {
                dist = stop - start;
            }

            tindex = Math.round(p - dist / hi);

            if (!dist && !moved) { // this is a "tap"
                var idx = Math.floor((stop - ttop) / hi),
                    li = $($('.dw-li', target)[idx]),
                    hl = scrollable;
                if (event('onValueTap', [li]) !== false) {
                    tindex = idx;
                } else {
                    hl = true;
                }

                if (hl) {
                    li.addClass('dw-hl'); // Highlight
                    setTimeout(function () {
                        li.removeClass('dw-hl');
                    }, 200);
                }
            }

            if (scrollable) {
                calc(target, tindex, 0, true, Math.round(val));
            }

            move = false;
            target = null;

            $(document).off(MOVE_EVENT, onMove).off(END_EVENT, onEnd);*/

            var dist,
                diff,
                newPos,
                speed,
                time = new Date() - startTime;

            if (scrolling) {

                if (isScrollable) {

                    if (time < 300) { // Momentum scroll
                        speed = (endPos - startPos) / time;
                        dist = (speed * speed) / s.speedUnit;
                        if (endPos - startPos < 0) {
                            dist = -dist;
                        }
                    } else {
                        dist = endPos - startPos;
                    }

                    newPos = Math.min((-2 -first) * wheelHeight, Math.max(Math.round((currPos + dist) / wheelHeight) * wheelHeight, (2 - last) * wheelHeight));
                    time = time < 300 ? Math.round(Math.abs(wheelPosition[wheelIndex] - newPos) / wheelHeight * s.timeUnit * 1000) : 100;

                    scroll(wheelIndex, newPos, time);
                }

                if (ev.type === 'mouseup') {
                    $(document).off('mousemove', onMove).off('mouseup', onEnd);
                }

                scrolling = false;
            }
        }

        var lastPos = -2000,
            first = 0,
            last = 100;

        function infinite() {
            var f = first,
                l = last;

            diff = Math.round((lastPos - wheelPosition[wheelIndex]) / wheelHeight);
            last = last + diff;
            first = first + diff;

            lastPos = wheelPosition[wheelIndex];

            // Generate items
            setTimeout(function () {
                var html = '<div class="dw-bf">',
                    x = 1;

                if (diff > 0) {
                    for (var i = l + 1; i < l + diff + 1; i++) {
                        if (x % 20 == 0) {
                            html += '</div><div class="dw-bf">';
                        }
                        html += '<div role="option" class="dw-li dw-v" data-val="' + i + '" style="height:' + wheelHeight + 'px;top:' + (i * wheelHeight) + 'px;"><div class="dw-i">' + i + '</div></div>';
                        x++;
                    }
                    html += '</div>';
                    wheelMarkup.eq(wheelIndex).append(html);
                    $('.dw-li', wheelMarkup[wheelIndex]).slice(0, diff).remove();
                } else if (diff < 0) {
                    for (var i = f + diff; i < f; i++) {
                        if (x % 20 == 0) {
                            html += '</div><div class="dw-bf">';
                        }
                        html += '<div role="option" class="dw-li dw-v" data-val="' + i + '" style="height:' + wheelHeight + 'px;top:' + (i * wheelHeight) + 'px;"><div class="dw-i">' + i + '</div></div>';
                        x++;
                    }
                    html += '</div>';
                    wheelMarkup.eq(wheelIndex).prepend(html);
                    $('.dw-li', wheelMarkup[wheelIndex]).slice(diff).remove();
                }
            }, 10);
        }

        /**
        * Show mobiscroll on focus and click event of the parameter.
        * @param {jQuery} elm - Events will be attached to this element.
        * @param {Function} [beforeShow=undefined] - Optional function to execute before showing mobiscroll.
        */
        that.attachShow = function (elm, beforeShow) {
            elmList.push(elm);
            if (s.display !== 'inline') {
                elm.on((s.showOnFocus ? 'focus.mbsc' : '') + (s.showOnTap ? ' click.mbsc' : ''), function () {
                    if (!preventShow && !tap) {
                        if (beforeShow) {
                            beforeShow();
                        }
                        activeElm = elm;
                        that.show();
                    }
                    setTimeout(function () {
                        preventShow = false;
                    }, 300); // With jQuery < 1.9 focus is fired twice in IE
                });
            }
        };

        /**
        * Shows the scroller instance.
        * @param {Boolean} preventAnimation - Prevent animation if true
        */
        that.show = function (preventAnimation) {

            var lbl,
                html,
                nr = 0;

            if (s.disabled || isVisible) {
                return;
            }

            if (s.display == 'top') {
                animate = 'slidedown';
            }

            if (s.display == 'bottom') {
                animate = 'slideup';
            }

            // Parse value from input
            //read();

            event('onBeforeShow', []);

            //if (anim && !prevAnim) {
            //    mAnim = 'dw-' + anim + ' dw-in';
            //}

            // Create wheels containers
            html = '<div role="dialog" class="' + s.theme + ' dw-' + s.display + (prefix ? ' dw' + prefix.replace(/\-$/, '') : '') + (hasButtons ? '' : ' dw-nobtn') + '">' +
                (!isModal ?
                    '<div class="dw dwbg dwi">' :
                    '<div class="dw-persp"><div class="dwo"></div><div class="dw dwbg"><div class="dw-arrw"><div class="dw-arrw-i"><div class="dw-arr"></div></div></div>') +
                '<div class="dwwr"><div aria-live="assertive" class="dwv' + (s.headerText ? '' : ' dw-hidden') + '"></div><div class="dwcc">';

            $.each(s.wheels, function (i, wg) { // Wheel groups
                html += '<div class="dwc' + (s.mode != 'scroller' ? ' dwpm' : ' dwsc') + (s.showLabel ? '' : ' dwhl') + '"><div class="dwwc dwrc"><table cellpadding="0" cellspacing="0"><tr>';
                $.each(wg, function (j, w) { // Wheels
                    wheels[nr] = w;
                    lbl = w.label !== undefined ? w.label : j;
                    html += '<td><div class="dwwl dwrc dwwl' + nr + '" data-index="' + nr + '" style="line-height:' + wheelHeight + 'px;">' +
                        (s.mode != 'scroller' ?
                            '<a href="#" tabindex="-1" class="dwb-e dwwb dwwbp" style="height:' + wheelHeight + 'px;"><span>+</span></a>' +
                            '<a href="#" tabindex="-1" class="dwb-e dwwb dwwbm" style="height:' + wheelHeight + 'px;"><span>&ndash;</span></a>' : '') +
                        '<div class="dwl">' + lbl + '</div>' +
                        '<div tabindex="0" aria-live="off" aria-label="' + lbl + '" role="listbox" class="dwww">' +
                            '<div class="dww" style="height:' + (s.rows * wheelHeight) + 'px;' +
                                (s.fixedWidth ? ('width:' + (s.fixedWidth[nr] || s.fixedWidth) + 'px;') :
                                    (s.minWidth ? ('min-width:' + (s.minWidth[nr] || s.minWidth) + 'px;') : 'min-width:' + s.width + 'px;') +
                                    (s.maxWidth ? ('max-width:' + (s.maxWidth[nr] || s.maxWidth) + 'px;') : '')) + '">' +
                                '<div class="dw-ul" style="margin-top:' + ((s.rows - 1) * wheelHeight / 2 ) + 'px;">';

                    // Create wheel values
                    html += genWheelItems(nr);
                    html += '</div><div class="dwwol"></div></div><div class="dwwo"></div></div><div class="dwwol"></div></div></td>';
                    nr++;
                });


                html += '</tr></table></div></div>';
            });

            html += '</div>';

            if (isModal && hasButtons) {
                html += '<div class="dwbc">';
                $.each(buttons, function (i, btn) {
                    btn = (typeof btn === 'string') ? that.buttons[btn] : btn;
                    html += '<div' + (s.btnWidth ? ' style="width:' + (100 / buttons.length) + '%"' : '') + ' class="dwbw ' + btn.css + '"><a href="#" class="dwb dwb' + i + ' dwb-e" role="button">' + btn.text + '</a></div>';
                });
                html += '</div>';
            }
            html += (isModal ? '</div>' : '') + '</div></div></div>';

            markup = $(html);

            wheelMarkup = $('.dw-ul', markup);

            //persp = $('.dw-persp', markup);

            wheelMarkup.each(function (i, w) {
                scroll(i, -50 * wheelHeight);
            });

            //scrollToPos();

            event('onMarkupReady', [markup]);

            // Show
            if (isModal) {

                markup.appendTo(s.context);
                //if (animate && !preventAnimation) {
                    //markup.addClass('dw-trans');
                    // Remove animation class
                    //setTimeout(function () {
                    //    markup.removeClass('dw-trans').find('.dw').removeClass(mAnim);
                    //}, 350);
                //}
            } else if (elm.is('div')) {
                elm.html(markup);
            } else {
                markup.insertAfter(elm);
            }

            event('onMarkupInserted', [markup]);

            isVisible = true;

            if (isModal) {
                // Enter / ESC
                $(window).on('keydown.mbsc', function (e) {
                    if (e.keyCode == 13) {
                        that.select();
                    } else if (e.keyCode == 27) {
                        that.cancel();
                    }
                });

                // Prevent scroll if not specified otherwise
                if (s.scrollLock) {
                    markup.on('touchmove', function (e) {
                        if (lockScroll) {
                            e.preventDefault();
                        }
                    });
                }

                // Disable inputs to prevent bleed through (Android bug) and set autocomplete to off (for Firefox)
                $('input,select,button', doc).each(function () {
                    if (!this.disabled) {
                        if ($(this).attr('autocomplete')) {
                            $(this).data('autocomplete', $(this).attr('autocomplete'));
                        }
                        $(this).addClass('mbsc-temp-disabled').prop('disabled', true).attr('autocomplete', 'off');
                    }
                });

                // Set position
                that.position();
                attachPosition('orientationchange.mbsc resize.mbsc', false);
                attachPosition('scroll.mbsc', true);
            }

            // Events
            markup//.on('DOMMouseScroll mousewheel', '.dwwl', onScroll)
                //.on('keydown', '.dwwl', onKeyDown)
                //.on('keyup', '.dwwl', onKeyUp)
                .on('selectstart mousedown', prevdef) // Prevents blue highlight on Android and text selection in IE
                .on('click', '.dwb-e', prevdef)
                .on('touchend', function () { if (s.tap) { setTap(); } })
                .on('keydown', '.dwb-e', function (e) {
                    if (e.keyCode == 32) { // Space
                        e.preventDefault();
                        e.stopPropagation();
                        $(this).click();
                    }
                });

            setTimeout(function () {
                // Init buttons
                /*$.each(buttons, function (i, b) {
                    that.tap($('.dwb' + i, dw), function (e) {
                        b = (typeof b === 'string') ? that.buttons[b] : b;
                        b.handler.call(this, e, that);
                    });
                });

                if (s.closeOnOverlay) {
                    that.tap($('.dwo', dw), function () {
                        that.cancel();
                    });
                }

                markup.on(START_EVENT, '.dwwl', onStart).on(START_EVENT, '.dwb-e', onBtnStart);*/

                $('.dwwl', markup)
                    .on('touchstart mousedown', onStart)
                    .on('touchmove', onMove)
                    .on('touchend touchcancel', onEnd)

            }, 300);

            event('onShow', [markup, valueText]);
        };

        /**
        * Scroller initialization.
        */
        that.init = function (ss) {
            var p;

            // Get theme defaults
            theme = ms.themes[ss.theme || s.theme];

            // Get language defaults
            lang = ms.i18n[ss.lang || s.lang];

            extend(settings, ss); // Update original user settings

            event('onThemeLoad', [lang, settings]);

            extend(s, theme, lang, settings);

            // Add default buttons
            s.buttons = s.buttons || ['set', 'cancel'];

            // Hide header text in inline mode by default
            s.headerText = s.headerText === undefined ? (s.display !== 'inline' ? '{value}' : false) : s.headerText;

            that.settings = s;

            // Unbind all events (if re-init)
            elm.off('.mbsc');

            p = ms.presets[s.preset];

            if (p) {
                preset = p.call(e, that);
                extend(s, preset, settings); // Load preset settings
            }

            // Set private members
            //m = Math.floor(s.rows / 2);
            //hi = s.height;

            wheelHeight = s.height;
            animate = s.animate;
            isModal = s.display !== 'inline';
            isScrollable = s.mode !== 'clickpick';
            buttons = s.buttons;
            wnd = $(s.context == 'body' ? window : s.context);
            doc = $(s.context)[0];

            that.context = wnd;
            that.live = !isModal || ($.inArray('set', buttons) == -1);
            that.buttons.set = { text: s.setText, css: 'dwb-s', handler: that.select };
            that.buttons.cancel = { text: (that.live) ? s.closeText : s.cancelText, css: 'dwb-c', handler: that.cancel };
            that.buttons.clear = { text: s.clearText, css: 'dwb-cl', handler: function () {
                event('onClear', [dw]);
                elm.val('');
                if (!that.live) {
                    that.hide();
                }
            }};

            hasButtons = buttons.length > 0;

            if (isVisible) {
                that.hide(true, false, true);
            }

            if (isModal) {
                read();
                if (isInput) {
                    // Set element readonly, save original state
                    if (readOnly === undefined) {
                        readOnly = e.readOnly;
                    }
                    e.readOnly = true;
                }
                that.attachShow(elm);

                // Blur element on window blur (e.g. tabchange) to prevent re-show on window focus
                $(window).off('.mbsc').on('focus.mbsc', function () {
                    if (activeElm && document.activeElement == activeElm[0]) {
                        preventShow = true;
                    }
                });
            } else {
                that.show();
            }

            if (isInput) {
                elm.on('change.mbsc', function () {
                    if (!preventChange) {
                        that.setValue(elm.val(), false, 0.2);
                    }
                    preventChange = false;
                });
            }
        };

        /**
        * Destroys the mobiscroll instance.
        */
        that.destroy = function () {
            that.hide(true, false, true);
            // Remove all events from elements
            $.each(elmList, function (i, v) {
                v.off('.mbsc');
            });
            // Remove events from window
            $(window).off('.mbsc');
            // Reset original readonly state
            if (isInput) {
                e.readOnly = readOnly;
            }
            // Delete scroller instance
            delete instances[e.id];
            event('onDestroy', []);
        };

        /**
        * Returns the mobiscroll instance.
        */
        that.getInst = function () {
            return that;
        };

        that.buttons = {};

        that.init(settings);
    }

    function testTouch(e) {
        if (e.type === 'touchstart') {
            touch = true;
        } else if (touch) {
            touch = false;
            return false;
        }
        return true;
    }

    function setTap() {
        tap = true;
        setTimeout(function () {
            tap = false;
        }, 300);
    }

    function constrain(val, min, max) {
        return Math.max(min, Math.min(val, max));
    }

    var activeElm,
        scrolling,
        tap,
        touch,
        ms = $.mobiscroll,
        instances = ms.instances,
        util = ms.util,
        prefix = util.prefix,
        jsPrefix = util.jsPrefix,
        has3d = util.has3d,
        getCoord = util.getCoord,
        empty = function () {},
        prevdef = function (e) { e.preventDefault(); },
        extend = $.extend,
        START_EVENT = 'touchstart mousedown',
        MOVE_EVENT = 'touchmove mousemove',
        END_EVENT = 'touchend mouseup',
        defaults = {
            // Options
            width: 70,
            height: 40,
            rows: 3,
            delay: 300,
            disabled: false,
            readonly: false,
            closeOnOverlay: true,
            showOnFocus: true,
            showOnTap: true,
            showLabel: true,
            wheels: [],
            theme: '',
            selectedText: ' Selected',
            closeText: 'Close',
            display: 'modal',
            mode: 'scroller',
            preset: '',
            lang: 'en-US',
            setText: 'Set',
            cancelText: 'Cancel',
            clearText: 'Clear',
            context: 'body',
            scrollLock: true,
            tap: true,
            btnWidth: true,
            speedUnit: 0.0012,
            timeUnit: 0.1,
            formatResult: function (d) {
                return d.join(' ');
            },
            parseValue: function (value, inst) {
                var val = value.split(' '),
                    ret = [],
                    i = 0,
                    keys;

                $.each(inst.settings.wheels, function (j, wg) {
                    $.each(wg, function (k, w) {
                        keys = w.keys || w.values;
                        if ($.inArray(val[i], keys) !== -1) {
                            ret.push(val[i]);
                        } else {
                            ret.push(keys[0]);
                        }
                        i++;
                    });
                });
                return ret;
            }
        };

    $(document).on('mouseover mouseup mousedown click', function (e) { // Prevent standard behaviour on body click
        if (tap) {
            e.stopPropagation();
            e.preventDefault();
            return false;
        }
    });

})(jQuery);
