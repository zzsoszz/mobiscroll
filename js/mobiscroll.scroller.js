/*jslint eqeq: true, plusplus: true, undef: true, sloppy: true, vars: true, forin: true, nomen: true */
(function ($) {

    $.mobiscroll.classes.Scroller = function (elem, settings) {

        var $doc,
            $markup,
            $wnd,
            animate,
            currIndex,
            currPos,
            currWheel,
            endPos,
            lang,
            overlay,
            persp,
            preset,
            readOnly,
            rowsNr,
            startPos,
            tempValues,
            theme,
            values,
            valueText,
            wheelHeight,
            wheelScrolled,
            wndWidth,
            wndHeight,

            that = this,
            e = elem,
            $elm = $(e),
            s = extend({}, defaults),
            wheels = [],
            wheelValues = [],
            elmList = [],
            isInput = $elm.is('input'),
            batchSize = 30,

            isModal,
            isScrollable,
            isVisible,
            scrollLock,
            preventPos,
            preventChange;

        // Private functions

        function event(name, args) {
            var ret;
            args.push(that);
            $.each([theme, preset, settings], function (i, v) {
                if (v && v[name]) {
                    ret = v[name].apply(e, args);
                }
            });
            return ret;
        }

        function genWheelItems(wheel, first, last) {
            var i,
                key,
                value,
                l = 0,
                html = '',//'<div class="mbsc-sc-batch">',
                labels = wheel.labels || [],
                values = wheel.values,
                keys = wheel.keys || values,
                isArray = $.isArray(values),
                length = values.length;

            for (i = first; i <= last; i++) {
                // TODO: call values function only ones and should return the whole batch
                value = (isArray ? $(values).get(i % length) : values(i));
                key = (isArray ? $(keys).get(i % length) : keys(i));

                wheelValues[wheel.index][l] = value;

                // Don't generate values greater than min and max indexes
                if ((wheel.min !== undefined && i < wheel.min) || (wheel.max !== undefined && i > wheel.max)) {
                    value = '';
                }

                if (l % 20 == 0) {
                    //html += '</div><div class="mbsc-sc-batch">';
                }

                html += '<div data-i="' + i + '" data-val="' + key + '" role="option" class="mbsc-sc-itm"' + (labels[i] ? ' aria-label="' + labels[i] + '"' : '') + ' style="height:' + wheelHeight + 'px;"><div class="mbsc-sc-itm-i">' + value + '</div></div>';
                l++;
            }

            return html;// + '</div>';
        }

        function getWheelKey(wheel) {
            var index = wheel.selectedIndex,
                values = wheel.values,
                keys = wheel.keys || values;

            return $.isArray(keys) ? $(keys).get(index % keys.length) : keys(index);
        }

        function getCurrPos(wheel) {
            var target = wheel.$markup[0],
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

        function scroll(wheel, px, time, active) {
            var style = wheel.$markup[0].style;

            style[jsPrefix + 'Transition'] = prefix + 'transform ' + (time || 0) + 'ms ease-out';

            if (has3d) {
                style[jsPrefix + 'Transform'] = 'translate3d(0,' + px + 'px,0)';
            } else {
                style.top = px + 'px';
            }

            if (wheel.scrolling) {
                scrollReady(wheel);
            }

            if (time !== undefined) {
                wheel.scrolling = setTimeout(function () {
                    scrollReady(wheel);
                }, time);
            }

            wheel.position = px;
        }

        /*
         * Clear timers and flags if wheel finished scrolling animation or new scroll is started.
         */
        function scrollReady(wheel) {
            clearTimeout(wheel.scrolling);
            delete wheel.scrolling;
            //t.closest('.dwwl').removeClass('dwa');
        }

        /*
         * Scroll all wheels to the selected values.
         */
        function scrollToValues(time) {
            var oldIndex,
                selectedIndex,
                keys;

            var invalid = event('validate', [tempValues, wheelValues]);

            $.each(wheels, function (i, wheel) {
                // Check if wheel is already at the selected value
                if (wheel.selectedValue !== tempValues[i]) {
                    keys = wheel.keys || wheel.values;

                    // Search for the index of the selected value
                    selectedIndex = $.isArray(keys) ? $.inArray(tempValues[i], keys) : wheel.indexes(tempValues[i]);
                    //oldIndex = $.isArray(keys) ? $.inArray(wheel.selectedValue, keys) : wheel.indexes(wheel.selectedValue);

                    wheel.selectedIndex += selectedIndex - oldIndex;
                    wheel.selectedValue = tempValues[i];

                    // Scroll wheel in position
                    scroll(wheel, -wheel.selectedIndex * wheelHeight, time);
                }

                // Generate new values for infinite / circular wheel
                var first = wheel.first,
                    last = wheel.last,
                    diff = wheel.infinite ? Math.round((wheel.lastPosition - wheel.position) / wheelHeight) : 0;

                    wheel.first += diff;
                    wheel.last += diff;

                    wheel.lastPosition = wheel.position;

                    // Generate items
                    setTimeout(function () {
                        if (diff > 0) {
                            wheel.$markup.append(genWheelItems(wheel, last + 1, last + diff));
                            $('.mbsc-sc-itm', wheel.$markup).slice(0, diff).remove();
                        } else if (diff < 0) {
                            wheel.$markup.prepend(genWheelItems(wheel, first + diff, first - 1));
                            $('.mbsc-sc-itm', wheel.$markup).slice(diff).remove();
                        }

                        if (diff) {
                            wheel.margin += diff * wheelHeight;
                            wheel.$markup.css('margin-top', wheel.margin + 'px').find('.mbsc-sc-batch:empty').remove();
                        }

                        // Add invalid class to  invalid items
                        $('.mbsc-sc-itm', wheel.$markup).removeClass('mbsc-sc-itm-inv');
                        $.each(invalid[i], function (j, val) {
                            $('.mbsc-sc-itm[data-val="' + val + '"]', wheel.$markup).addClass('mbsc-sc-itm-inv');
                        });

                    }, 10);

                //if (i == 1)
                //console.log(wheel.first, wheel.last, selectedIndex);
            });
        }

        function readValue() {
            tempValues = values ? values.slice(0) : s.parseValue($elm.val() || '', that);
            setValue();
        }

        function setValue(fill, time, noscroll, temp) {
            if (isVisible && !noscroll) {
                //scrollToPos(time, undefined, manual);
            }

            valueText = s.formatResult(tempValues);

            if (!temp) {
                values = tempValues.slice(0);
                that.val = valueText;
            }

            if (fill && isInput) {
                preventChange = true;
                $elm.val(valueText).change();
            }
        }

        function attachPosition(ev, checkLock) {
            var debounce;
            $wnd.on(ev, function (e) {
                clearTimeout(debounce);
                debounce = setTimeout(function () {
                    if ((scrollLock && checkLock) || !checkLock) {
                        that.position(!checkLock);
                    }
                }, 200);
            });
        }

        function round(val) {
            return Math.round(val / wheelHeight) * wheelHeight;
        }

        // Event handlers

        function onStart(ev) {
            // TODO: test touch
            if (!action) {
                // Prevent touch highlight
                ev.preventDefault();

                action = true;

                startPos = getCoord(ev, 'Y');
                startTime = new Date();

                currIndex = +$(this).attr('data-index');
                currWheel = wheels[currIndex];

                // Check if wheel is currently moving
                wheelScrolled = currWheel.scrolling !== undefined;

                // If moving, get actual position, otherwise the last save position
                currPos = wheelScrolled ? getCurrPos(currWheel) : currWheel.position;
                endPos = startPos;

                currWheel.lastPosition = currWheel.position;

                scroll(currWheel, currPos, 1); // 1ms is needed for Android 4.0

                // Attach mouse event to document if mouse was used
                if (ev.type === 'mousedown') {
                    $(document).on('mousemove', onMove).on('mouseup', onEnd);
                }
            }
        }

        function onMove(ev) {
            var limit,
                min,
                max;

            if (action) {
                // Prevent native scroll
                ev.preventDefault();

                if (isScrollable) {
                    // If infinite, don't allow to see the end of the wheel, otherwise allow one position to scroll over
                    limit = currWheel.infinite ? Math.round(rowsNr / 2) : -1;
                    min = -limit - currWheel.first;
                    max = limit - currWheel.last;

                    if (currWheel.min !== undefined) {
                        min = Math.min(1 - currWheel.min, min);
                    }

                    if (currWheel.min !== undefined) {
                        max = Math.max(-1 - currWheel.max, max);
                    }

                    // Constrain movement between min and max limits
                    endPos = Math.min(min * wheelHeight + startPos - currPos, Math.max(getCoord(ev, 'Y'), max * wheelHeight + startPos - currPos));

                    scroll(currWheel, currPos + endPos - startPos);
                }

                if (startPos !== endPos) {
                    wheelScrolled = true;
                }
            }
        }

        function onEnd(ev) {
            var dist,
                diff,
                newPos,
                speed,
                min,
                max,
                momentum,
                dist = endPos - startPos,
                time = new Date() - startTime;

            if (action) {

                if (isScrollable) {

                    // Check if it's momentum scroll
                    if (time < 300 && Math.abs(dist) > 10) {
                        momentum = true;
                        speed = (endPos - startPos) / time;
                        dist = (speed * speed) / s.speedUnit;
                        if (endPos - startPos < 0) {
                            dist = -dist;
                        }
                    }

                    // Calculate new position within valid range
                    if (currWheel.infinite) {
                        min = round(currPos + (batchSize - rowsNr) * wheelHeight);
                        max = round(currPos - (batchSize - rowsNr) * wheelHeight);

                        if (currWheel.min !== undefined) {
                            min = Math.min(-currWheel.min * wheelHeight, min);
                        }

                        if (currWheel.max !== undefined) {
                            max = Math.max(-currWheel.max * wheelHeight, max);
                        }

                        newPos = Math.min(min, Math.max(round(currPos + dist), max));
                    } else {
                        newPos = Math.min(currWheel.first * wheelHeight, Math.max(round(currPos + dist), -currWheel.last * wheelHeight));
                    }

                    // Calculate moving time
                    time = momentum ? Math.round(Math.abs(currWheel.position - newPos) / wheelHeight * s.timeUnit * 1000) : 100;

                    scroll(currWheel, newPos, time);

                    // Set selected value
                    currWheel.selectedIndex = -currWheel.position / wheelHeight;
                    currWheel.selectedValue = tempValues[currIndex] = getWheelKey(currWheel);
                    
                    // Validate and scroll to valid values (if validation changed something)
                    scrollToValues(time);
                }

                if (ev.type === 'mouseup') {
                    $(document).off('mousemove', onMove).off('mouseup', onEnd);
                }

                action = false;
            }
        }

        /**
        * Attach tap event to the given element.
        */
        that.tap = function (el, handler) {
            var startX,
                startY;

            if (s.tap) {
                el.on('touchstart.mbsc mousedown.mbsc', function (e) {
                    e.preventDefault();
                    startX = getCoord(e, 'X');
                    startY = getCoord(e, 'Y');
                }).on('touchend.mbsc', function (e) {
                    // If movement is less than 20px, fire the click event handler
                    if (Math.abs(getCoord(e, 'X') - startX) < 20 && Math.abs(getCoord(e, 'Y') - startY) < 20) {
                        handler.call(this, e);
                    }
                    setTap();
                });
            }

            el.on('click.mbsc', function (e) {
                if (!tap) {
                    // If handler was not called on touchend, call it on click;
                    handler.call(this, e);
                }
                e.preventDefault();
            });

        };

        /**
        * Positions the scroller on the screen.
        */
        that.position = function (check) {

            if (!isModal || preventPos || (wndWidth === persp.width() && wndHeight === ($wnd[0].innerHeight || $wnd.innerHeight()) && check) || (event('onPosition', [$markup]) === false)) {
                return;
            }

            var w,
                l,
                t,
                aw, // anchor width
                ah, // anchor height
                ap, // anchor position
                at, // anchor top
                al, // anchor left
                arr, // arrow
                arrw, // arrow width
                arrl, // arrow left
                dh,
                scroll,
                totalw = 0,
                minw = 0,
                sl = $wnd.scrollLeft(),
                st = $wnd.scrollTop(),
                wr = $('.dwwr', $markup),
                d = $('.dw', $markup),
                css = {},
                anchor = s.anchor === undefined ? $elm : s.anchor;

            wndWidth = persp.width(); // To get the width without scrollbar
            wndHeight = $wnd[0].innerHeight || $wnd.innerHeight();

            if (/modal|bubble/.test(s.display)) {
                $('.dwc', $markup).each(function () {
                    w = $(this).outerWidth(true);
                    totalw += w;
                    minw = (w > minw) ? w : minw;
                });
                w = totalw > wndWidth ? minw : totalw;
                wr.width(w).css('white-space', totalw > wndWidth ? '' : 'nowrap');
            }

            mw = d.outerWidth();
            mh = d.outerHeight(true);
            scrollLock = mh <= wndHeight && mw <= wndWidth;

            that.scrollLock = scrollLock;

            if (s.display == 'modal') {
                l = (wndWidth - mw) / 2;
                t = st + (wndHeight - mh) / 2;
            } else if (s.display == 'bubble') {
                scroll = true;
                arr = $('.dw-arrw-i', $markup);
                ap = anchor.offset();
                at = Math.abs($(s.context).offset().top - ap.top);
                al = Math.abs($(s.context).offset().left - ap.left);

                // horizontal positioning
                aw = anchor.outerWidth();
                ah = anchor.outerHeight();
                l = constrain(al - (d.outerWidth(true) - aw) / 2 - sl, 3, wndWidth - mw - 3);

                // vertical positioning
                t = at - mh; // above the input
                if ((t < st) || (at > st + wndHeight)) { // if doesn't fit above or the input is out of the screen
                    d.removeClass('dw-bubble-top').addClass('dw-bubble-bottom');
                    t = at + ah; // below the input
                } else {
                    d.removeClass('dw-bubble-bottom').addClass('dw-bubble-top');
                }

                // Calculate Arrow position
                arrw = arr.outerWidth();
                arrl = constrain(al + aw / 2 - (l + (mw - arrw) / 2) - sl, 0, arrw);

                // Limit Arrow position
                $('.dw-arr', $markup).css({ left: arrl });
            } else {
                css.width = '100%';
                if (s.display == 'top') {
                    t = st;
                } else if (s.display == 'bottom') {
                    t = st + wndHeight - mh;
                }
            }

            css.top = t < 0 ? 0 : t;
            css.left = l;
            d.css(css);

            // If top + modal height > $doc height, increase $doc height
            persp.height(0);
            dh = Math.max(t + mh, s.context == 'body' ? $(document).height() : $doc.scrollHeight);
            persp.css({ height: dh, left: sl });

            // Scroll needed
            if (scroll && ((t + mh > st + wndHeight) || (at > st + wndHeight))) {
                preventPos = true;
                setTimeout(function () { preventPos = false; }, 300);
                $wnd.scrollTop(Math.min(t + mh - wndHeight, dh - wndHeight));
            }
        };

        /**
        * Show mobiscroll on focus and click event of the parameter.
        * @param {jQuery} $elm - Events will be attached to this element.
        * @param {Function} [beforeShow=undefined] - Optional function to execute before showing mobiscroll.
        */
        that.attachShow = function ($elm, beforeShow) {
            elmList.push($elm);
            if (s.display !== 'inline') {
                $elm.on((s.showOnFocus ? 'focus.mbsc' : '') + (s.showOnTap ? ' click.mbsc' : ''), function (ev) {
                    if ((ev.type !== 'focus' || (ev.type === 'focus' && !preventShow)) && !tap) {
                        if (beforeShow) {
                            beforeShow();
                        }
                        activeElm = $elm;
                        that.show();
                    }
                    setTimeout(function () {
                        preventShow = false;
                    }, 300); // With jQuery < 1.9 focus is fired twice in IE
                });
            }
        };

        /**
        * Set button handler.
        */
        that.select = function () {
            if (that.hide(false, 'set') !== false) {
                setValue(true, 0, true);
                event('onSelect', [that.val]);
            }
        };

        /**
        * Cancel and hide the scroller instance.
        */
        that.cancel = function () {
            if (that.hide(false, 'cancel') !== false) {
                event('onCancel', [that.val]);
            }
        };

        /**
        * Shows the scroller instance.
        * @param {Boolean} preventAnim - Prevent animation if true
        */
        that.show = function (preventAnim) {

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
            readValue();

            event('onBeforeShow', []);

            //if (anim && !prevAnim) {
            //    mAnim = 'dw-' + anim + ' dw-in';
            //}

            // Create wheels containers
            html = '<div role="dialog" class="mbsc-sc-' + s.theme + ' dw-' + s.display + (prefix ? ' dw' + prefix.replace(/\-$/, '') : '') + (hasButtons ? '' : ' dw-nobtn') + '">' +
                (!isModal ?
                    '<div class="dw dwbg dwi">' :
                    '<div class="dw-persp"><div class="dwo"></div><div class="dw dwbg"><div class="dw-arrw"><div class="dw-arrw-i"><div class="dw-arr"></div></div></div>') +
                '<div class="dwwr"><div aria-live="assertive" class="dwv' + (s.headerText ? '' : ' dw-hidden') + '"></div><div class="dwcc">';

            $.each(s.wheels, function (i, wg) { // Wheel groups
                html += '<div class="dwc' + (s.mode != 'scroller' ? ' dwpm' : ' dwsc') + (s.showLabel ? '' : ' dwhl') + '"><div class="dwwc dwrc"><table cellpadding="0" cellspacing="0"><tr>';
                $.each(wg, function (j, w) { // Wheels
                    wheels[nr] = w;
                    wheelValues[nr] = [];

                    // Set wheel properties
                    if (w.infinite) {
                        w.first = -batchSize;
                        w.last = batchSize;
                    } else {
                        w.first = 0;
                        w.last = w.values.length - 1;
                    }

                    w.index = nr;
                    w.position = 0;
                    w.lastPosition = 0;
                    w.selectedIndex = 0;
                    w.selectedValue = tempValues[nr];
                    w.margin = ((rowsNr - 1) / 2 + w.first) * wheelHeight;

                    lbl = w.label !== undefined ? w.label : j;
                    html += '<td><div class="dwwl dwrc dwwl' + nr + '" data-index="' + nr + '" style="line-height:' + wheelHeight + 'px;">' +
                        (s.mode != 'scroller' ?
                            '<a href="#" tabindex="-1" class="dwb-e dwwb dwwbp" style="height:' + wheelHeight + 'px;"><span>+</span></a>' +
                            '<a href="#" tabindex="-1" class="dwb-e dwwb dwwbm" style="height:' + wheelHeight + 'px;"><span>&ndash;</span></a>' : '') +
                        '<div class="dwl">' + lbl + '</div>' +
                        '<div tabindex="0" aria-live="off" aria-label="' + lbl + '" role="listbox" class="dwww">' +
                            '<div class="dww" style="height:' + (rowsNr * wheelHeight) + 'px;' +
                                    (s.fixedWidth ? ('width:' + (s.fixedWidth[nr] || s.fixedWidth) + 'px;') :
                                    (s.minWidth ? ('min-width:' + (s.minWidth[nr] || s.minWidth) + 'px;') : 'min-width:' + s.width + 'px;') +
                                    (s.maxWidth ? ('max-width:' + (s.maxWidth[nr] || s.maxWidth) + 'px;') : '')) + '">' +
                                '<div class="dw-ul" style="margin-top:' + w.margin + 'px;">';

                    // Generate wheel items
                    html += genWheelItems(w, w.first, w.last);
                    html += '</div><div class="dwwol"></div></div><div class="dwwo"></div></div><div class="dwwol"></div></div></td>';
                    nr++;
                });


                html += '</tr></table></div></div>';
            });

            html += '</div>';

            // Generate buttons
            if (isModal && hasButtons) {
                html += '<div class="dwbc">';
                $.each(buttons, function (i, btn) {
                    btn = (typeof btn === 'string') ? that.buttons[btn] : btn;
                    html += '<div' + (s.btnWidth ? ' style="width:' + (100 / buttons.length) + '%"' : '') + ' class="dwbw ' + btn.css + '"><a href="#" class="dwb dwb' + i + ' dwb-e" role="button">' + btn.text + '</a></div>';
                });
                html += '</div>';
            }
            html += (isModal ? '</div>' : '') + '</div></div></div>';

            $markup = $(html);
            persp = $('.dw-persp', $markup);
            overlay = $('.dwo', $markup);

            $('.dw-ul', $markup).each(function (i, w) {
                wheels[i].$markup = $(this);
                scroll(wheels[i], 0);
            });

            scrollToValues();

            event('onMarkupReady', [$markup]);

            // Show
            if (isModal) {

                $markup.appendTo(s.context);
                //if (animate && !preventAnimation) {
                    //$markup.addClass('dw-trans');
                    // Remove animation class
                    //setTimeout(function () {
                    //    $markup.removeClass('dw-trans').find('.dw').removeClass(mAnim);
                    //}, 350);
                //}
            } else if ($elm.is('div')) {
                $elm.html($markup);
            } else {
                $markup.insertAfter($elm);
            }

            event('onMarkupInserted', [$markup]);

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
                    $markup.on('touchmove', function (e) {
                        if (scrollLock) {
                            e.preventDefault();
                        }
                    });
                }

                // Disable inputs to prevent bleed through (Android bug) and set autocomplete to off (for Firefox)
                $('input,select,button', $doc).each(function () {
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
            $markup//.on('DOMMouseScroll mousewheel', '.dwwl', onScroll)
                //.on('keydown', '.dwwl', onKeyDown)
                //.on('keyup', '.dwwl', onKeyUp)
                .on('selectstart mousedown', prevdef) // Prevents blue highlight on Android and text selection in IE
                .on('click', '.dwb-e', prevdef)
                .on('touchend', function () { if (s.tap) { setTap(); } }) // Prevent standard behaviour on click
                .on('keydown', '.dwb-e', function (e) {
                    if (e.keyCode == 32) { // Space
                        e.preventDefault();
                        e.stopPropagation();
                        $(this).click();
                    }
                });

            // Attach with timeout to increase compatibility with libraries like fastclick
            setTimeout(function () {
                // Init buttons
                $.each(buttons, function (i, b) {
                    that.tap($('.dwb' + i, $markup), function (e) {
                        b = (typeof b === 'string') ? that.buttons[b] : b;
                        b.handler.call(this, e, that);
                    });
                });

                if (s.closeOnOverlay) {
                    that.tap(overlay, function () {
                        that.cancel();
                    });
                }

                $('.dwwl', $markup)
                    .on('touchstart mousedown', onStart)
                    .on('touchmove', onMove)
                    .on('touchend', onEnd);

            }, 300);

            event('onShow', [$markup, valueText]);
        };

        /**
        * Hides the scroller instance.
        */
        that.hide = function (preventAnim, btn, force) {
            var doAnim = isModal && animate && !preventAnim;

            // If onClose handler returns false, prevent hide
            if (!isVisible || (!force && event('onClose', [valueText, btn]) === false)) {
                return;
            }

            // Re-enable temporary disabled fields
            $('.mbsc-temp-disabled', $doc).each(function () {
                $(this).prop('disabled', false).removeClass('mbsc-temp-disabled');
                // Workaround for Firefox refresh (fields remained disabled)
                if ($(this).data('autocomplete')) {
                    $(this).attr('autocomplete', $(this).data('autocomplete'));
                } else {
                    $(this).removeAttr('autocomplete');
                }
            });

            // Hide wheels and overlay
            if (doAnim) {
                //$markup.addClass('dw-trans').find('.dw').addClass('dw-' + animate + ' dw-out');
            }
            if (preventAnim) {
                $markup.remove();
            } else {
                setTimeout(function () {
                    $markup.remove();
                    if (activeElm) {
                        preventShow = true;
                        activeElm.focus();
                    }
                }, doAnim ? 350 : 1);
            }

            // Stop positioning on window resize
            $wnd.off('.mbsc');

            isVisible = false;
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
            $elm.off('.mbsc');

            p = ms.presets[s.preset];

            if (p) {
                preset = p.call(e, that);
                extend(s, preset, settings); // Load preset settings
            }

            // Set private members
            wheelHeight = s.height;
            rowsNr = s.rows;
            animate = s.animate;
            isModal = s.display !== 'inline';
            isScrollable = s.mode !== 'clickpick';
            buttons = s.buttons;
            $wnd = $(s.context == 'body' ? window : s.context);
            $doc = $(s.context)[0];

            that.context = $wnd;
            that.live = !isModal || ($.inArray('set', buttons) == -1);
            that.buttons.set = { text: s.setText, css: 'dwb-s', handler: that.select };
            that.buttons.cancel = { text: (that.live) ? s.closeText : s.cancelText, css: 'dwb-c', handler: that.cancel };
            that.buttons.clear = { text: s.clearText, css: 'dwb-cl', handler: function () {
                event('onClear', [dw]);
                $elm.val('');
                if (!that.live) {
                    that.hide();
                }
            }};

            hasButtons = buttons.length > 0;

            if (isVisible) {
                that.hide(true, false, true);
            }

            if (isModal) {
                readValue();
                if (isInput) {
                    // Set element readonly, save original state
                    if (readOnly === undefined) {
                        readOnly = e.readOnly;
                    }
                    e.readOnly = true;
                }
                that.attachShow($elm);
            } else {
                that.show();
            }

            if (isInput) {
                $elm.on('change.mbsc', function () {
                    if (!preventChange) {
                        that.setValue($elm.val(), false, 0.2);
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

        /**
        * Set mobiscroll value
        */
        that.setValueArray = function (values, time) {
            tempValues = $.isArray(values) ? values.slice(0) : s.parseValue.call(e, values + '', that);
            scrollToValues(time);
        };

        instances[e.id] = that;

        that.buttons = {};

        that.init(settings);
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
        action,
        tap,
        touch,
        preventShow,
        ms = $.mobiscroll,
        instances = ms.instances,
        util = ms.util,
        prefix = util.prefix,
        jsPrefix = util.jsPrefix,
        has3d = util.has3d,
        getCoord = util.getCoord,
        testTouch = util.testTouch,
        empty = function () {},
        prevdef = function (e) { e.preventDefault(); },
        extend = $.extend,
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
            theme: 'default',
            selectedText: 'Selected',
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
                        if ($.isArray(keys)) {
                            if ($.inArray(val[i], keys) !== -1) {
                                ret.push(val[i]);
                            } else {
                                ret.push(keys[0]);
                            }
                        } else {
                            ret.push(keys(val[i] === undefined ? 0 : val[i]));
                        }
                        i++;
                    });
                });
                return ret;
            }
        };

    // Prevent re-show on window focus
    $(window).on('focus', function () {
        if (activeElm) {
            preventShow = true;
        }
    });

    $(document).on('mouseover mouseup mousedown click', function (e) { // Prevent standard behaviour on click
        if (tap) {
            e.stopPropagation();
            e.preventDefault();
            return false;
        }
    });

})(jQuery);
