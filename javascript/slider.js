(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Users/sunaiwen/projects/Sliderit/source/js/main.js":[function(require,module,exports){
//window.$ = require('zepto-browserify').$;
//window.Zepto = require('zepto-browserify').Zepto;

// 方法工具
var u = {};

// Math.round
u.round = Math.round;
// Math.abs
u.abs = Math.abs;
// Math.cos
u.cos = Math.cos;

// 带前缀的特殊类名
u.classSet = {
    wrapper: '.slider-wrap',
    inner: '.slider-inner',
    item: '.slider-item'
};

// 事件名后缀
u.eventAfterFixed = '.slider';

// requestAnimationFramework 的id
u.id=0;

//    封装requestAnimationFramework
u.rAF = function(){
    var prefixed = window.requestAnimationFrame       ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        window.oRequestAnimationFrame      ||
        window.msRequestAnimationFrame     ||
        function( callback ){
            window.setTimeout(callback, 1000 / 60);
        };
    return function(){
        var id = prefixed.apply(window, arguments);
        return id;
    }
}();

u.cancelRAF = function(){
    var prefixed = window.cancelAnimationFrame ||
        window.webkitCancelRequestAnimationFrame ||
        window.mozCancelRequestAnimationFrame ||
        window.oCancelRequestAnimationFrame ||
        window.msCancelRequestAnimationFrame ||
        function(id){
            clearTimeout(id);
        };
    return function(id){
        var id = prefixed.apply(window, arguments);
        return id;
    }
}();

// 检测是否支持3d
u.detect3D = function(){
//        只在webkit浏览器下有效
    if( !! (window.WebKitCSSMatrix && 'm11' in new WebKitCSSMatrix())) {
        return true
    }
    return false;
};

// 检测浏览器环境，分两大类，一类是安卓原生webview环境，一类是ios和chrome
u.detectEnv = function(){
    var ua = navigator.userAgent;
    var uv = navigator.vendor;
    var isChrome = !! window.chrome;
    var isIOS = /iPhone|iPad/.test(ua) && /Apple Computer/.test(uv);

    return isChrome || isIOS ? true : false;
};

//    获取带有特定前缀的css属性，目前只检测-webkit和无前缀两种情况，name只支持首字母大写的字符串
u.getStyle = function(name){
    var prefix = 'webkit';
    var firstChar;
    var testStyle = document.createElement('div').style;
    if(testStyle[prefix+name]!=undefined) {
        return prefix+name;
    } else if(testStyle[name]!=undefined){
//        Z 的 ascii码是90
        if(name.charCodeAt(0) > 90) {
            return name
        } else {
            firstChar = name.slice(0, 1);
            name = name.slice(1, -1);
            name  = firstChar + name;
        }
        return name;
    } else {
        return false;
    }
};

// 兼容新旧设备的 transform 方法
u.transform = function(elem, distance, direction) {
    var propValue;
    var twoD = 'translate';
    var threeD = 'translate3d';
    var prop = u.getStyle('Transform');
//        判断方向
    if(u.detect3D()) {
        switch (direction){
            case 'x':
                propValue = threeD+'('+ distance+'px, 0, 0)';
                break;
            case 'y':
                propValue = threeD+'(0,'+distance+'px, 0)';
                break;
            default :
                propValue = threeD+'('+ distance+'px, 0, 0)';
        }
    } else {
        switch (direction) {
            case 'x':
                propValue = twoD+'X('+distance+'px'+')';
                break;
            case 'y':
                propValue = twoD+'Y('+distance+'px'+')';
                break;
            default :
                propValue = twoD+'X('+distance+'px'+')';
        }
    }
    elem.style[prop] = propValue;
};

// 获取坐标
u.getXY = function(evt) {
    var touches = evt.touches[0];
    return {
        x: touches.clientX,
        y: touches.clientY
    };
};

// 记录坐标
u.xySet = {
    old: {},
    cur: {}
};

var Slider = function(element, opt){
    this.option = this.setOption(opt);
    this.initElement(element);
    this.initLayout();
    this.initOffset();
    this.addEvent();

//    触发无限循环，以便一开始就可以向两个方向滑
    if(this.option.infinite) {
        this.initInfinite();
    }
};

// 设置配置
Slider.prototype.setOption = function(opt){
//    默认配置
    var defOpt = {
        infinite: false,
        direction: 'x',
        moveRadius: 20,
        duration: 0.6
    };
    var option = {};
    option = $.extend(option, defOpt, opt);
    option.direction = option.direction.toLowerCase();
//    和css的相同
    return option;
};

// 初始化元素
Slider.prototype.initElement = function(element){
    this.$wrapper = $(element);
    this.$inner = this.$wrapper.children(u.classSet.inner);
    this.$items = this.$inner.children(u.classSet.item);
    this.$itemsCache = this.$items.clone();
    this._length = this.$items.length;
    this._index = 0;
    this.$firstItem = this.$items.eq(0);
    this.$lastItem = this.$items.eq(-1);
//    确定刚才是否滑了一屏
    this._hasSlided = false;
//    是否在当前列表前面插入了列表
    this._isInsertBefore = false;
//    与上面一个相反
    this._isInsertAfter = false;
};

// 初始化offset
Slider.prototype.initOffset = function(){
    var dire = this.option.direction;
    var $item = this.$items.eq(0);
    if(dire === 'x'){
        this._unitOffset = $item.eq(0).width();
//        wrapper宽度
        this.$wrapper.width(this._unitOffset);
    } else if(dire === 'y') {
        this._unitOffset = $item.eq(0).height();
//    wrapper高度
        this.$wrapper.height(this._unitOffset);
    }

//    inneroffset总和
    this._totalOffset = this._unitOffset * this._length;
//    inner整体的offset
    this._innerOffset = 0;
//    开始的地方
    this._startOffset = 0;
//    每次touchmove的offset
    this._offset = 0;
};

// 初始化布局
Slider.prototype.initLayout = function(){
    var $inner = this.$inner;
    var dire = this.option.direction;
    if(dire==='x') {
        $inner.addClass('is-horizon');
    }
};

// 初始化无限循环
Slider.prototype.initInfinite = function(){
    var cloneFirst = this.$firstItem.clone();
    var cloneLast = this.$lastItem.clone();
    var $inner = this.$inner;
    var _this = this;

    cloneLast.insertBefore(this.$firstItem);
    cloneFirst.insertAfter(this.$lastItem);

    u.transform($inner[0], -this._unitOffset, this.option.direction);
    this._startOffset = -this._unitOffset;
    this._innerOffset = this._startOffset;
    $inner
        .on('infinite:jumpToStart', function(){
            _this._innerOffset = _this._startOffset;
            u.transform($inner[0], _this._innerOffset, _this.option.direction);
            _this._index = 0;
        })
        .on('infinite:jumpToEnd', function(){
            _this._innerOffset = -_this._totalOffset;
            u.transform($inner[0], _this._innerOffset, _this.option.direction);
            _this._index = _this._length-1;
        });
};

// 获取移动距离（offset）
Slider.prototype.getOffset = function(){
    var dire = this.option.direction;
    var unitOffset = this._unitOffset;
    this._offset = u.xySet.cur[dire] - u.xySet.old[dire];
    this._offset = u.round(this._offset * unitOffset / (u.abs(this._offset) + unitOffset));
};

// 绑定事件
Slider.prototype.addEvent = function() {
    var $inner = this.$inner;
    var inner = $inner[0];
    var _this = this;
    var infinite = this.option.infinite;

//    添加touch事件
    _this.touchEvent();

//    防止ios边缘弹起
    $(document).on('touchmove', function(evt){
        var offsetTop = _this.$wrapper.offset().top;
        var touchY = u.getXY(evt).y;
        if(touchY > offsetTop && touchY < offsetTop + _this.$wrapper.height()) {
            evt.preventDefault();
        }
    });
    $inner
        .on('webkitTransitionEnd transitionend' + u.eventAfterFixed, function() {
            _this.disableTransition();
            if(_this._hasSlided === false) {
                return;
            }
//            触发翻页后事件
            $inner.trigger('slide:after');
            if(infinite) {
                if(_this._index === _this._length) {
                    $inner.triggerHandler('infinite:jumpToStart');
                } else if(_this._index === -1) {
                    $inner.triggerHandler('infinite:jumpToEnd');
                }
            }
            setTimeout(function(){
                //            恢复touch事件
                _this.touchEvent();
            }, 100);
        });
};

// 删除transition
Slider.prototype.disableTransition = function() {
    var inner = this.$inner[0];
    inner.style['transition'] = 'none';
    inner.style['webkitTransition']= 'none';
};

// 加上transition
Slider.prototype.enableTransition = function(){
    var inner = this.$inner[0];
    inner.style['transition'] = 'all '+this.option.duration+'s ease';
    inner.style['webkitTransition'] = 'all '+this.option.duration+'s ease';
};

// 事件绑定
Slider.prototype.touchEvent = function(isRemove){
    var _this = this;
    var $inner = this.$inner;
    var infinite = this.option.infinite;

    if(isRemove === true) {
        $inner
            .off('touchstart', startHandler)
            .off('touchmove', moveHandler)
            .off('touchend', endHandler);
        return;
    }

//    touchstart handler
    var startHandler = function(evt){
        if(u.detectEnv()===false) {
            evt.preventDefault();
        }
        u.xySet.old = u.getXY(evt);
//            每次触摸都是新的开始，所以归0
        _this._offset = 0;
    };
//    touchmove handler
    var moveHandler = function(evt){
        u.xySet.cur = u.getXY(evt);
        _this.getOffset();
        _this.move('move');
    };
//    touchend handler
    var endHandler = function(evt){
//        移动前保证清除raf，以免这次transform被raf的那次覆盖
        u.cancelRAF(u.id);
        if(u.abs(_this._offset) >= _this.option.moveRadius) {
            !infinite &&
            ((_this._offset > 0 && _this._index === 0) ||
                (_this._offset < 0 && _this._index === _this._length-1)) ?
                _this.move('back') :
                _this.move('slide');
        } else {
            _this.move('back');
        }
    };
    $inner
        .on('touchstart'+ u.eventAfterFixed, startHandler)
        .on('touchmove'+ u.eventAfterFixed, moveHandler)
        .on('touchend'+ u.eventAfterFixed, endHandler)
};

// move方法(重要)
Slider.prototype.move = function(command){
    var $inner = this.$inner;
    var inner = $inner[0];
    var offset = this._offset;
    var innerOffset = this._innerOffset;
    var dire = this.option.direction;
    var curIndex = this._index;
    var endOffset;

    this.enableTransition();
    if(command === 'move') {
        u.cancelRAF(u.id);
        this.disableTransition();
        this._hasSlided = false;
        u.id = u.rAF(function(){
            u.transform(inner, offset+innerOffset, dire);
        });
    } else if(command === 'slide') {
        //        解除touch事件绑定，以免误操作
        this.touchEvent(true);

        //            触发翻页前事件
        $inner.trigger('slide:before');
        if(this._offset < 0) {
            endOffset = (++curIndex) * this._unitOffset * (-1) + this._startOffset;
        } else {
            endOffset = (--curIndex) * this._unitOffset * (-1) + this._startOffset;
        }
        this._index = curIndex;
        u.transform(inner, endOffset, dire);
        this._innerOffset = endOffset;
        this._hasSlided = true;
    } else if('back') {
        u.transform(inner, innerOffset, dire);
        this._hasSlided = false;
    }
};

// 基于move方法的上一页、下一页方法
Slider.prototype.prev = function(){
    this._offset = this._unitOffset;
    this.$inner.triggerHandler('touchend');
};

Slider.prototype.next = function(){
    this._offset = -this._unitOffset;
    this.$inner.triggerHandler('touchend');
};

// 跳到指定页数
Slider.prototype.go = function(index){
    var _this = this;
    var curIndex = this._index;
    var paramIndex = index;
    var slideDuration = this.option.duration*1000 + 150;
// 如果不是数字，尝试转换为数字
    if(isNaN(index)) {
        paramIndex = parseInt(paramIndex);
    }

    var go = function(){
        if(isNaN(paramIndex) || curIndex === paramIndex) {
            return;
        } else if(curIndex > paramIndex) {
            _this.prev();
            curIndex -= 1;
        } else if(curIndex < paramIndex) {
            _this.next();
            curIndex += 1;
        }
        setTimeout(go, slideDuration);
    };
    go();
};

$.fn.slider = function(opt, index) {
    var action;
    var $this = $(this);
    var func;
    var pageIndex = index;
    $this.each(function(index, element) {
        if(typeof opt === 'object'){
            element._slider = new Slider(element, opt);
        } else if(typeof  opt === 'string') {
            action = opt;
            func = element._slider[action];
            typeof func === 'function' && element._slider[action](pageIndex);
        }
    });
};
},{}]},{},["/Users/sunaiwen/projects/Sliderit/source/js/main.js"])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL3N1bmFpd2VuL3Byb2plY3RzL1NsaWRlcml0L3NvdXJjZS9qcy9tYWluLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy93aW5kb3cuJCA9IHJlcXVpcmUoJ3plcHRvLWJyb3dzZXJpZnknKS4kO1xuLy93aW5kb3cuWmVwdG8gPSByZXF1aXJlKCd6ZXB0by1icm93c2VyaWZ5JykuWmVwdG87XG5cbi8vIOaWueazleW3peWFt1xudmFyIHUgPSB7fTtcblxuLy8gTWF0aC5yb3VuZFxudS5yb3VuZCA9IE1hdGgucm91bmQ7XG4vLyBNYXRoLmFic1xudS5hYnMgPSBNYXRoLmFicztcbi8vIE1hdGguY29zXG51LmNvcyA9IE1hdGguY29zO1xuXG4vLyDluKbliY3nvIDnmoTnibnmrornsbvlkI1cbnUuY2xhc3NTZXQgPSB7XG4gICAgd3JhcHBlcjogJy5zbGlkZXItd3JhcCcsXG4gICAgaW5uZXI6ICcuc2xpZGVyLWlubmVyJyxcbiAgICBpdGVtOiAnLnNsaWRlci1pdGVtJ1xufTtcblxuLy8g5LqL5Lu25ZCN5ZCO57yAXG51LmV2ZW50QWZ0ZXJGaXhlZCA9ICcuc2xpZGVyJztcblxuLy8gcmVxdWVzdEFuaW1hdGlvbkZyYW1ld29yayDnmoRpZFxudS5pZD0wO1xuXG4vLyAgICDlsIHoo4VyZXF1ZXN0QW5pbWF0aW9uRnJhbWV3b3JrXG51LnJBRiA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIHByZWZpeGVkID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSAgICAgICB8fFxuICAgICAgICB3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgICAgIHdpbmRvdy5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgICAgfHxcbiAgICAgICAgd2luZG93Lm9SZXF1ZXN0QW5pbWF0aW9uRnJhbWUgICAgICB8fFxuICAgICAgICB3aW5kb3cubXNSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgICAgIHx8XG4gICAgICAgIGZ1bmN0aW9uKCBjYWxsYmFjayApe1xuICAgICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoY2FsbGJhY2ssIDEwMDAgLyA2MCk7XG4gICAgICAgIH07XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBpZCA9IHByZWZpeGVkLmFwcGx5KHdpbmRvdywgYXJndW1lbnRzKTtcbiAgICAgICAgcmV0dXJuIGlkO1xuICAgIH1cbn0oKTtcblxudS5jYW5jZWxSQUYgPSBmdW5jdGlvbigpe1xuICAgIHZhciBwcmVmaXhlZCA9IHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZSB8fFxuICAgICAgICB3aW5kb3cud2Via2l0Q2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgICAgIHdpbmRvdy5tb3pDYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICAgICAgd2luZG93Lm9DYW5jZWxSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICAgICAgd2luZG93Lm1zQ2FuY2VsUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgICAgIGZ1bmN0aW9uKGlkKXtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dChpZCk7XG4gICAgICAgIH07XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGlkKXtcbiAgICAgICAgdmFyIGlkID0gcHJlZml4ZWQuYXBwbHkod2luZG93LCBhcmd1bWVudHMpO1xuICAgICAgICByZXR1cm4gaWQ7XG4gICAgfVxufSgpO1xuXG4vLyDmo4DmtYvmmK/lkKbmlK/mjIEzZFxudS5kZXRlY3QzRCA9IGZ1bmN0aW9uKCl7XG4vLyAgICAgICAg5Y+q5Zyod2Via2l05rWP6KeI5Zmo5LiL5pyJ5pWIXG4gICAgaWYoICEhICh3aW5kb3cuV2ViS2l0Q1NTTWF0cml4ICYmICdtMTEnIGluIG5ldyBXZWJLaXRDU1NNYXRyaXgoKSkpIHtcbiAgICAgICAgcmV0dXJuIHRydWVcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufTtcblxuLy8g5qOA5rWL5rWP6KeI5Zmo546v5aKD77yM5YiG5Lik5aSn57G777yM5LiA57G75piv5a6J5Y2T5Y6f55Sfd2Vidmlld+eOr+Wig++8jOS4gOexu+aYr2lvc+WSjGNocm9tZVxudS5kZXRlY3RFbnYgPSBmdW5jdGlvbigpe1xuICAgIHZhciB1YSA9IG5hdmlnYXRvci51c2VyQWdlbnQ7XG4gICAgdmFyIHV2ID0gbmF2aWdhdG9yLnZlbmRvcjtcbiAgICB2YXIgaXNDaHJvbWUgPSAhISB3aW5kb3cuY2hyb21lO1xuICAgIHZhciBpc0lPUyA9IC9pUGhvbmV8aVBhZC8udGVzdCh1YSkgJiYgL0FwcGxlIENvbXB1dGVyLy50ZXN0KHV2KTtcblxuICAgIHJldHVybiBpc0Nocm9tZSB8fCBpc0lPUyA/IHRydWUgOiBmYWxzZTtcbn07XG5cbi8vICAgIOiOt+WPluW4puacieeJueWumuWJjee8gOeahGNzc+WxnuaAp++8jOebruWJjeWPquajgOa1iy13ZWJraXTlkozml6DliY3nvIDkuKTnp43mg4XlhrXvvIxuYW1l5Y+q5pSv5oyB6aaW5a2X5q+N5aSn5YaZ55qE5a2X56ym5LiyXG51LmdldFN0eWxlID0gZnVuY3Rpb24obmFtZSl7XG4gICAgdmFyIHByZWZpeCA9ICd3ZWJraXQnO1xuICAgIHZhciBmaXJzdENoYXI7XG4gICAgdmFyIHRlc3RTdHlsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpLnN0eWxlO1xuICAgIGlmKHRlc3RTdHlsZVtwcmVmaXgrbmFtZV0hPXVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gcHJlZml4K25hbWU7XG4gICAgfSBlbHNlIGlmKHRlc3RTdHlsZVtuYW1lXSE9dW5kZWZpbmVkKXtcbi8vICAgICAgICBaIOeahCBhc2NpaeeggeaYrzkwXG4gICAgICAgIGlmKG5hbWUuY2hhckNvZGVBdCgwKSA+IDkwKSB7XG4gICAgICAgICAgICByZXR1cm4gbmFtZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZmlyc3RDaGFyID0gbmFtZS5zbGljZSgwLCAxKTtcbiAgICAgICAgICAgIG5hbWUgPSBuYW1lLnNsaWNlKDEsIC0xKTtcbiAgICAgICAgICAgIG5hbWUgID0gZmlyc3RDaGFyICsgbmFtZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmFtZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufTtcblxuLy8g5YW85a655paw5pen6K6+5aSH55qEIHRyYW5zZm9ybSDmlrnms5VcbnUudHJhbnNmb3JtID0gZnVuY3Rpb24oZWxlbSwgZGlzdGFuY2UsIGRpcmVjdGlvbikge1xuICAgIHZhciBwcm9wVmFsdWU7XG4gICAgdmFyIHR3b0QgPSAndHJhbnNsYXRlJztcbiAgICB2YXIgdGhyZWVEID0gJ3RyYW5zbGF0ZTNkJztcbiAgICB2YXIgcHJvcCA9IHUuZ2V0U3R5bGUoJ1RyYW5zZm9ybScpO1xuLy8gICAgICAgIOWIpOaWreaWueWQkVxuICAgIGlmKHUuZGV0ZWN0M0QoKSkge1xuICAgICAgICBzd2l0Y2ggKGRpcmVjdGlvbil7XG4gICAgICAgICAgICBjYXNlICd4JzpcbiAgICAgICAgICAgICAgICBwcm9wVmFsdWUgPSB0aHJlZUQrJygnKyBkaXN0YW5jZSsncHgsIDAsIDApJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3knOlxuICAgICAgICAgICAgICAgIHByb3BWYWx1ZSA9IHRocmVlRCsnKDAsJytkaXN0YW5jZSsncHgsIDApJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQgOlxuICAgICAgICAgICAgICAgIHByb3BWYWx1ZSA9IHRocmVlRCsnKCcrIGRpc3RhbmNlKydweCwgMCwgMCknO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgc3dpdGNoIChkaXJlY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgJ3gnOlxuICAgICAgICAgICAgICAgIHByb3BWYWx1ZSA9IHR3b0QrJ1goJytkaXN0YW5jZSsncHgnKycpJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3knOlxuICAgICAgICAgICAgICAgIHByb3BWYWx1ZSA9IHR3b0QrJ1koJytkaXN0YW5jZSsncHgnKycpJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQgOlxuICAgICAgICAgICAgICAgIHByb3BWYWx1ZSA9IHR3b0QrJ1goJytkaXN0YW5jZSsncHgnKycpJztcbiAgICAgICAgfVxuICAgIH1cbiAgICBlbGVtLnN0eWxlW3Byb3BdID0gcHJvcFZhbHVlO1xufTtcblxuLy8g6I635Y+W5Z2Q5qCHXG51LmdldFhZID0gZnVuY3Rpb24oZXZ0KSB7XG4gICAgdmFyIHRvdWNoZXMgPSBldnQudG91Y2hlc1swXTtcbiAgICByZXR1cm4ge1xuICAgICAgICB4OiB0b3VjaGVzLmNsaWVudFgsXG4gICAgICAgIHk6IHRvdWNoZXMuY2xpZW50WVxuICAgIH07XG59O1xuXG4vLyDorrDlvZXlnZDmoIdcbnUueHlTZXQgPSB7XG4gICAgb2xkOiB7fSxcbiAgICBjdXI6IHt9XG59O1xuXG52YXIgU2xpZGVyID0gZnVuY3Rpb24oZWxlbWVudCwgb3B0KXtcbiAgICB0aGlzLm9wdGlvbiA9IHRoaXMuc2V0T3B0aW9uKG9wdCk7XG4gICAgdGhpcy5pbml0RWxlbWVudChlbGVtZW50KTtcbiAgICB0aGlzLmluaXRMYXlvdXQoKTtcbiAgICB0aGlzLmluaXRPZmZzZXQoKTtcbiAgICB0aGlzLmFkZEV2ZW50KCk7XG5cbi8vICAgIOinpuWPkeaXoOmZkOW+queOr++8jOS7peS+v+S4gOW8gOWni+WwseWPr+S7peWQkeS4pOS4quaWueWQkea7kVxuICAgIGlmKHRoaXMub3B0aW9uLmluZmluaXRlKSB7XG4gICAgICAgIHRoaXMuaW5pdEluZmluaXRlKCk7XG4gICAgfVxufTtcblxuLy8g6K6+572u6YWN572uXG5TbGlkZXIucHJvdG90eXBlLnNldE9wdGlvbiA9IGZ1bmN0aW9uKG9wdCl7XG4vLyAgICDpu5jorqTphY3nva5cbiAgICB2YXIgZGVmT3B0ID0ge1xuICAgICAgICBpbmZpbml0ZTogZmFsc2UsXG4gICAgICAgIGRpcmVjdGlvbjogJ3gnLFxuICAgICAgICBtb3ZlUmFkaXVzOiAyMCxcbiAgICAgICAgZHVyYXRpb246IDAuNlxuICAgIH07XG4gICAgdmFyIG9wdGlvbiA9IHt9O1xuICAgIG9wdGlvbiA9ICQuZXh0ZW5kKG9wdGlvbiwgZGVmT3B0LCBvcHQpO1xuICAgIG9wdGlvbi5kaXJlY3Rpb24gPSBvcHRpb24uZGlyZWN0aW9uLnRvTG93ZXJDYXNlKCk7XG4vLyAgICDlkoxjc3PnmoTnm7jlkIxcbiAgICByZXR1cm4gb3B0aW9uO1xufTtcblxuLy8g5Yid5aeL5YyW5YWD57SgXG5TbGlkZXIucHJvdG90eXBlLmluaXRFbGVtZW50ID0gZnVuY3Rpb24oZWxlbWVudCl7XG4gICAgdGhpcy4kd3JhcHBlciA9ICQoZWxlbWVudCk7XG4gICAgdGhpcy4kaW5uZXIgPSB0aGlzLiR3cmFwcGVyLmNoaWxkcmVuKHUuY2xhc3NTZXQuaW5uZXIpO1xuICAgIHRoaXMuJGl0ZW1zID0gdGhpcy4kaW5uZXIuY2hpbGRyZW4odS5jbGFzc1NldC5pdGVtKTtcbiAgICB0aGlzLiRpdGVtc0NhY2hlID0gdGhpcy4kaXRlbXMuY2xvbmUoKTtcbiAgICB0aGlzLl9sZW5ndGggPSB0aGlzLiRpdGVtcy5sZW5ndGg7XG4gICAgdGhpcy5faW5kZXggPSAwO1xuICAgIHRoaXMuJGZpcnN0SXRlbSA9IHRoaXMuJGl0ZW1zLmVxKDApO1xuICAgIHRoaXMuJGxhc3RJdGVtID0gdGhpcy4kaXRlbXMuZXEoLTEpO1xuLy8gICAg56Gu5a6a5Yia5omN5piv5ZCm5ruR5LqG5LiA5bGPXG4gICAgdGhpcy5faGFzU2xpZGVkID0gZmFsc2U7XG4vLyAgICDmmK/lkKblnKjlvZPliY3liJfooajliY3pnaLmj5LlhaXkuobliJfooahcbiAgICB0aGlzLl9pc0luc2VydEJlZm9yZSA9IGZhbHNlO1xuLy8gICAg5LiO5LiK6Z2i5LiA5Liq55u45Y+NXG4gICAgdGhpcy5faXNJbnNlcnRBZnRlciA9IGZhbHNlO1xufTtcblxuLy8g5Yid5aeL5YyWb2Zmc2V0XG5TbGlkZXIucHJvdG90eXBlLmluaXRPZmZzZXQgPSBmdW5jdGlvbigpe1xuICAgIHZhciBkaXJlID0gdGhpcy5vcHRpb24uZGlyZWN0aW9uO1xuICAgIHZhciAkaXRlbSA9IHRoaXMuJGl0ZW1zLmVxKDApO1xuICAgIGlmKGRpcmUgPT09ICd4Jyl7XG4gICAgICAgIHRoaXMuX3VuaXRPZmZzZXQgPSAkaXRlbS5lcSgwKS53aWR0aCgpO1xuLy8gICAgICAgIHdyYXBwZXLlrr3luqZcbiAgICAgICAgdGhpcy4kd3JhcHBlci53aWR0aCh0aGlzLl91bml0T2Zmc2V0KTtcbiAgICB9IGVsc2UgaWYoZGlyZSA9PT0gJ3knKSB7XG4gICAgICAgIHRoaXMuX3VuaXRPZmZzZXQgPSAkaXRlbS5lcSgwKS5oZWlnaHQoKTtcbi8vICAgIHdyYXBwZXLpq5jluqZcbiAgICAgICAgdGhpcy4kd3JhcHBlci5oZWlnaHQodGhpcy5fdW5pdE9mZnNldCk7XG4gICAgfVxuXG4vLyAgICBpbm5lcm9mZnNldOaAu+WSjFxuICAgIHRoaXMuX3RvdGFsT2Zmc2V0ID0gdGhpcy5fdW5pdE9mZnNldCAqIHRoaXMuX2xlbmd0aDtcbi8vICAgIGlubmVy5pW05L2T55qEb2Zmc2V0XG4gICAgdGhpcy5faW5uZXJPZmZzZXQgPSAwO1xuLy8gICAg5byA5aeL55qE5Zyw5pa5XG4gICAgdGhpcy5fc3RhcnRPZmZzZXQgPSAwO1xuLy8gICAg5q+P5qyhdG91Y2htb3Zl55qEb2Zmc2V0XG4gICAgdGhpcy5fb2Zmc2V0ID0gMDtcbn07XG5cbi8vIOWIneWni+WMluW4g+WxgFxuU2xpZGVyLnByb3RvdHlwZS5pbml0TGF5b3V0ID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgJGlubmVyID0gdGhpcy4kaW5uZXI7XG4gICAgdmFyIGRpcmUgPSB0aGlzLm9wdGlvbi5kaXJlY3Rpb247XG4gICAgaWYoZGlyZT09PSd4Jykge1xuICAgICAgICAkaW5uZXIuYWRkQ2xhc3MoJ2lzLWhvcml6b24nKTtcbiAgICB9XG59O1xuXG4vLyDliJ3lp4vljJbml6DpmZDlvqrnjq9cblNsaWRlci5wcm90b3R5cGUuaW5pdEluZmluaXRlID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgY2xvbmVGaXJzdCA9IHRoaXMuJGZpcnN0SXRlbS5jbG9uZSgpO1xuICAgIHZhciBjbG9uZUxhc3QgPSB0aGlzLiRsYXN0SXRlbS5jbG9uZSgpO1xuICAgIHZhciAkaW5uZXIgPSB0aGlzLiRpbm5lcjtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuXG4gICAgY2xvbmVMYXN0Lmluc2VydEJlZm9yZSh0aGlzLiRmaXJzdEl0ZW0pO1xuICAgIGNsb25lRmlyc3QuaW5zZXJ0QWZ0ZXIodGhpcy4kbGFzdEl0ZW0pO1xuXG4gICAgdS50cmFuc2Zvcm0oJGlubmVyWzBdLCAtdGhpcy5fdW5pdE9mZnNldCwgdGhpcy5vcHRpb24uZGlyZWN0aW9uKTtcbiAgICB0aGlzLl9zdGFydE9mZnNldCA9IC10aGlzLl91bml0T2Zmc2V0O1xuICAgIHRoaXMuX2lubmVyT2Zmc2V0ID0gdGhpcy5fc3RhcnRPZmZzZXQ7XG4gICAgJGlubmVyXG4gICAgICAgIC5vbignaW5maW5pdGU6anVtcFRvU3RhcnQnLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgX3RoaXMuX2lubmVyT2Zmc2V0ID0gX3RoaXMuX3N0YXJ0T2Zmc2V0O1xuICAgICAgICAgICAgdS50cmFuc2Zvcm0oJGlubmVyWzBdLCBfdGhpcy5faW5uZXJPZmZzZXQsIF90aGlzLm9wdGlvbi5kaXJlY3Rpb24pO1xuICAgICAgICAgICAgX3RoaXMuX2luZGV4ID0gMDtcbiAgICAgICAgfSlcbiAgICAgICAgLm9uKCdpbmZpbml0ZTpqdW1wVG9FbmQnLCBmdW5jdGlvbigpe1xuICAgICAgICAgICAgX3RoaXMuX2lubmVyT2Zmc2V0ID0gLV90aGlzLl90b3RhbE9mZnNldDtcbiAgICAgICAgICAgIHUudHJhbnNmb3JtKCRpbm5lclswXSwgX3RoaXMuX2lubmVyT2Zmc2V0LCBfdGhpcy5vcHRpb24uZGlyZWN0aW9uKTtcbiAgICAgICAgICAgIF90aGlzLl9pbmRleCA9IF90aGlzLl9sZW5ndGgtMTtcbiAgICAgICAgfSk7XG59O1xuXG4vLyDojrflj5bnp7vliqjot53nprvvvIhvZmZzZXTvvIlcblNsaWRlci5wcm90b3R5cGUuZ2V0T2Zmc2V0ID0gZnVuY3Rpb24oKXtcbiAgICB2YXIgZGlyZSA9IHRoaXMub3B0aW9uLmRpcmVjdGlvbjtcbiAgICB2YXIgdW5pdE9mZnNldCA9IHRoaXMuX3VuaXRPZmZzZXQ7XG4gICAgdGhpcy5fb2Zmc2V0ID0gdS54eVNldC5jdXJbZGlyZV0gLSB1Lnh5U2V0Lm9sZFtkaXJlXTtcbiAgICB0aGlzLl9vZmZzZXQgPSB1LnJvdW5kKHRoaXMuX29mZnNldCAqIHVuaXRPZmZzZXQgLyAodS5hYnModGhpcy5fb2Zmc2V0KSArIHVuaXRPZmZzZXQpKTtcbn07XG5cbi8vIOe7keWumuS6i+S7tlxuU2xpZGVyLnByb3RvdHlwZS5hZGRFdmVudCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciAkaW5uZXIgPSB0aGlzLiRpbm5lcjtcbiAgICB2YXIgaW5uZXIgPSAkaW5uZXJbMF07XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB2YXIgaW5maW5pdGUgPSB0aGlzLm9wdGlvbi5pbmZpbml0ZTtcblxuLy8gICAg5re75YqgdG91Y2jkuovku7ZcbiAgICBfdGhpcy50b3VjaEV2ZW50KCk7XG5cbi8vICAgIOmYsuatomlvc+i+uee8mOW8uei1t1xuICAgICQoZG9jdW1lbnQpLm9uKCd0b3VjaG1vdmUnLCBmdW5jdGlvbihldnQpe1xuICAgICAgICB2YXIgb2Zmc2V0VG9wID0gX3RoaXMuJHdyYXBwZXIub2Zmc2V0KCkudG9wO1xuICAgICAgICB2YXIgdG91Y2hZID0gdS5nZXRYWShldnQpLnk7XG4gICAgICAgIGlmKHRvdWNoWSA+IG9mZnNldFRvcCAmJiB0b3VjaFkgPCBvZmZzZXRUb3AgKyBfdGhpcy4kd3JhcHBlci5oZWlnaHQoKSkge1xuICAgICAgICAgICAgZXZ0LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICAkaW5uZXJcbiAgICAgICAgLm9uKCd3ZWJraXRUcmFuc2l0aW9uRW5kIHRyYW5zaXRpb25lbmQnICsgdS5ldmVudEFmdGVyRml4ZWQsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgX3RoaXMuZGlzYWJsZVRyYW5zaXRpb24oKTtcbiAgICAgICAgICAgIGlmKF90aGlzLl9oYXNTbGlkZWQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuLy8gICAgICAgICAgICDop6blj5Hnv7vpobXlkI7kuovku7ZcbiAgICAgICAgICAgICRpbm5lci50cmlnZ2VyKCdzbGlkZTphZnRlcicpO1xuICAgICAgICAgICAgaWYoaW5maW5pdGUpIHtcbiAgICAgICAgICAgICAgICBpZihfdGhpcy5faW5kZXggPT09IF90aGlzLl9sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgJGlubmVyLnRyaWdnZXJIYW5kbGVyKCdpbmZpbml0ZTpqdW1wVG9TdGFydCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZihfdGhpcy5faW5kZXggPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICRpbm5lci50cmlnZ2VySGFuZGxlcignaW5maW5pdGU6anVtcFRvRW5kJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgICAgICAgICAgIC8vICAgICAgICAgICAg5oGi5aSNdG91Y2jkuovku7ZcbiAgICAgICAgICAgICAgICBfdGhpcy50b3VjaEV2ZW50KCk7XG4gICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICB9KTtcbn07XG5cbi8vIOWIoOmZpHRyYW5zaXRpb25cblNsaWRlci5wcm90b3R5cGUuZGlzYWJsZVRyYW5zaXRpb24gPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgaW5uZXIgPSB0aGlzLiRpbm5lclswXTtcbiAgICBpbm5lci5zdHlsZVsndHJhbnNpdGlvbiddID0gJ25vbmUnO1xuICAgIGlubmVyLnN0eWxlWyd3ZWJraXRUcmFuc2l0aW9uJ109ICdub25lJztcbn07XG5cbi8vIOWKoOS4inRyYW5zaXRpb25cblNsaWRlci5wcm90b3R5cGUuZW5hYmxlVHJhbnNpdGlvbiA9IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGlubmVyID0gdGhpcy4kaW5uZXJbMF07XG4gICAgaW5uZXIuc3R5bGVbJ3RyYW5zaXRpb24nXSA9ICdhbGwgJyt0aGlzLm9wdGlvbi5kdXJhdGlvbisncyBlYXNlJztcbiAgICBpbm5lci5zdHlsZVsnd2Via2l0VHJhbnNpdGlvbiddID0gJ2FsbCAnK3RoaXMub3B0aW9uLmR1cmF0aW9uKydzIGVhc2UnO1xufTtcblxuLy8g5LqL5Lu257uR5a6aXG5TbGlkZXIucHJvdG90eXBlLnRvdWNoRXZlbnQgPSBmdW5jdGlvbihpc1JlbW92ZSl7XG4gICAgdmFyIF90aGlzID0gdGhpcztcbiAgICB2YXIgJGlubmVyID0gdGhpcy4kaW5uZXI7XG4gICAgdmFyIGluZmluaXRlID0gdGhpcy5vcHRpb24uaW5maW5pdGU7XG5cbiAgICBpZihpc1JlbW92ZSA9PT0gdHJ1ZSkge1xuICAgICAgICAkaW5uZXJcbiAgICAgICAgICAgIC5vZmYoJ3RvdWNoc3RhcnQnLCBzdGFydEhhbmRsZXIpXG4gICAgICAgICAgICAub2ZmKCd0b3VjaG1vdmUnLCBtb3ZlSGFuZGxlcilcbiAgICAgICAgICAgIC5vZmYoJ3RvdWNoZW5kJywgZW5kSGFuZGxlcik7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbi8vICAgIHRvdWNoc3RhcnQgaGFuZGxlclxuICAgIHZhciBzdGFydEhhbmRsZXIgPSBmdW5jdGlvbihldnQpe1xuICAgICAgICBpZih1LmRldGVjdEVudigpPT09ZmFsc2UpIHtcbiAgICAgICAgICAgIGV2dC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9XG4gICAgICAgIHUueHlTZXQub2xkID0gdS5nZXRYWShldnQpO1xuLy8gICAgICAgICAgICDmr4/mrKHop6bmkbjpg73mmK/mlrDnmoTlvIDlp4vvvIzmiYDku6XlvZIwXG4gICAgICAgIF90aGlzLl9vZmZzZXQgPSAwO1xuICAgIH07XG4vLyAgICB0b3VjaG1vdmUgaGFuZGxlclxuICAgIHZhciBtb3ZlSGFuZGxlciA9IGZ1bmN0aW9uKGV2dCl7XG4gICAgICAgIHUueHlTZXQuY3VyID0gdS5nZXRYWShldnQpO1xuICAgICAgICBfdGhpcy5nZXRPZmZzZXQoKTtcbiAgICAgICAgX3RoaXMubW92ZSgnbW92ZScpO1xuICAgIH07XG4vLyAgICB0b3VjaGVuZCBoYW5kbGVyXG4gICAgdmFyIGVuZEhhbmRsZXIgPSBmdW5jdGlvbihldnQpe1xuLy8gICAgICAgIOenu+WKqOWJjeS/neivgea4hemZpHJhZu+8jOS7peWFjei/measoXRyYW5zZm9ybeiiq3JhZueahOmCo+asoeimhuebllxuICAgICAgICB1LmNhbmNlbFJBRih1LmlkKTtcbiAgICAgICAgaWYodS5hYnMoX3RoaXMuX29mZnNldCkgPj0gX3RoaXMub3B0aW9uLm1vdmVSYWRpdXMpIHtcbiAgICAgICAgICAgICFpbmZpbml0ZSAmJlxuICAgICAgICAgICAgKChfdGhpcy5fb2Zmc2V0ID4gMCAmJiBfdGhpcy5faW5kZXggPT09IDApIHx8XG4gICAgICAgICAgICAgICAgKF90aGlzLl9vZmZzZXQgPCAwICYmIF90aGlzLl9pbmRleCA9PT0gX3RoaXMuX2xlbmd0aC0xKSkgP1xuICAgICAgICAgICAgICAgIF90aGlzLm1vdmUoJ2JhY2snKSA6XG4gICAgICAgICAgICAgICAgX3RoaXMubW92ZSgnc2xpZGUnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIF90aGlzLm1vdmUoJ2JhY2snKTtcbiAgICAgICAgfVxuICAgIH07XG4gICAgJGlubmVyXG4gICAgICAgIC5vbigndG91Y2hzdGFydCcrIHUuZXZlbnRBZnRlckZpeGVkLCBzdGFydEhhbmRsZXIpXG4gICAgICAgIC5vbigndG91Y2htb3ZlJysgdS5ldmVudEFmdGVyRml4ZWQsIG1vdmVIYW5kbGVyKVxuICAgICAgICAub24oJ3RvdWNoZW5kJysgdS5ldmVudEFmdGVyRml4ZWQsIGVuZEhhbmRsZXIpXG59O1xuXG4vLyBtb3Zl5pa55rOVKOmHjeimgSlcblNsaWRlci5wcm90b3R5cGUubW92ZSA9IGZ1bmN0aW9uKGNvbW1hbmQpe1xuICAgIHZhciAkaW5uZXIgPSB0aGlzLiRpbm5lcjtcbiAgICB2YXIgaW5uZXIgPSAkaW5uZXJbMF07XG4gICAgdmFyIG9mZnNldCA9IHRoaXMuX29mZnNldDtcbiAgICB2YXIgaW5uZXJPZmZzZXQgPSB0aGlzLl9pbm5lck9mZnNldDtcbiAgICB2YXIgZGlyZSA9IHRoaXMub3B0aW9uLmRpcmVjdGlvbjtcbiAgICB2YXIgY3VySW5kZXggPSB0aGlzLl9pbmRleDtcbiAgICB2YXIgZW5kT2Zmc2V0O1xuXG4gICAgdGhpcy5lbmFibGVUcmFuc2l0aW9uKCk7XG4gICAgaWYoY29tbWFuZCA9PT0gJ21vdmUnKSB7XG4gICAgICAgIHUuY2FuY2VsUkFGKHUuaWQpO1xuICAgICAgICB0aGlzLmRpc2FibGVUcmFuc2l0aW9uKCk7XG4gICAgICAgIHRoaXMuX2hhc1NsaWRlZCA9IGZhbHNlO1xuICAgICAgICB1LmlkID0gdS5yQUYoZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIHUudHJhbnNmb3JtKGlubmVyLCBvZmZzZXQraW5uZXJPZmZzZXQsIGRpcmUpO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2UgaWYoY29tbWFuZCA9PT0gJ3NsaWRlJykge1xuICAgICAgICAvLyAgICAgICAg6Kej6ZmkdG91Y2jkuovku7bnu5HlrprvvIzku6XlhY3or6/mk43kvZxcbiAgICAgICAgdGhpcy50b3VjaEV2ZW50KHRydWUpO1xuXG4gICAgICAgIC8vICAgICAgICAgICAg6Kem5Y+R57+76aG15YmN5LqL5Lu2XG4gICAgICAgICRpbm5lci50cmlnZ2VyKCdzbGlkZTpiZWZvcmUnKTtcbiAgICAgICAgaWYodGhpcy5fb2Zmc2V0IDwgMCkge1xuICAgICAgICAgICAgZW5kT2Zmc2V0ID0gKCsrY3VySW5kZXgpICogdGhpcy5fdW5pdE9mZnNldCAqICgtMSkgKyB0aGlzLl9zdGFydE9mZnNldDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGVuZE9mZnNldCA9ICgtLWN1ckluZGV4KSAqIHRoaXMuX3VuaXRPZmZzZXQgKiAoLTEpICsgdGhpcy5fc3RhcnRPZmZzZXQ7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5faW5kZXggPSBjdXJJbmRleDtcbiAgICAgICAgdS50cmFuc2Zvcm0oaW5uZXIsIGVuZE9mZnNldCwgZGlyZSk7XG4gICAgICAgIHRoaXMuX2lubmVyT2Zmc2V0ID0gZW5kT2Zmc2V0O1xuICAgICAgICB0aGlzLl9oYXNTbGlkZWQgPSB0cnVlO1xuICAgIH0gZWxzZSBpZignYmFjaycpIHtcbiAgICAgICAgdS50cmFuc2Zvcm0oaW5uZXIsIGlubmVyT2Zmc2V0LCBkaXJlKTtcbiAgICAgICAgdGhpcy5faGFzU2xpZGVkID0gZmFsc2U7XG4gICAgfVxufTtcblxuLy8g5Z+65LqObW92ZeaWueazleeahOS4iuS4gOmhteOAgeS4i+S4gOmhteaWueazlVxuU2xpZGVyLnByb3RvdHlwZS5wcmV2ID0gZnVuY3Rpb24oKXtcbiAgICB0aGlzLl9vZmZzZXQgPSB0aGlzLl91bml0T2Zmc2V0O1xuICAgIHRoaXMuJGlubmVyLnRyaWdnZXJIYW5kbGVyKCd0b3VjaGVuZCcpO1xufTtcblxuU2xpZGVyLnByb3RvdHlwZS5uZXh0ID0gZnVuY3Rpb24oKXtcbiAgICB0aGlzLl9vZmZzZXQgPSAtdGhpcy5fdW5pdE9mZnNldDtcbiAgICB0aGlzLiRpbm5lci50cmlnZ2VySGFuZGxlcigndG91Y2hlbmQnKTtcbn07XG5cbi8vIOi3s+WIsOaMh+WumumhteaVsFxuU2xpZGVyLnByb3RvdHlwZS5nbyA9IGZ1bmN0aW9uKGluZGV4KXtcbiAgICB2YXIgX3RoaXMgPSB0aGlzO1xuICAgIHZhciBjdXJJbmRleCA9IHRoaXMuX2luZGV4O1xuICAgIHZhciBwYXJhbUluZGV4ID0gaW5kZXg7XG4gICAgdmFyIHNsaWRlRHVyYXRpb24gPSB0aGlzLm9wdGlvbi5kdXJhdGlvbioxMDAwICsgMTUwO1xuLy8g5aaC5p6c5LiN5piv5pWw5a2X77yM5bCd6K+V6L2s5o2i5Li65pWw5a2XXG4gICAgaWYoaXNOYU4oaW5kZXgpKSB7XG4gICAgICAgIHBhcmFtSW5kZXggPSBwYXJzZUludChwYXJhbUluZGV4KTtcbiAgICB9XG5cbiAgICB2YXIgZ28gPSBmdW5jdGlvbigpe1xuICAgICAgICBpZihpc05hTihwYXJhbUluZGV4KSB8fCBjdXJJbmRleCA9PT0gcGFyYW1JbmRleCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9IGVsc2UgaWYoY3VySW5kZXggPiBwYXJhbUluZGV4KSB7XG4gICAgICAgICAgICBfdGhpcy5wcmV2KCk7XG4gICAgICAgICAgICBjdXJJbmRleCAtPSAxO1xuICAgICAgICB9IGVsc2UgaWYoY3VySW5kZXggPCBwYXJhbUluZGV4KSB7XG4gICAgICAgICAgICBfdGhpcy5uZXh0KCk7XG4gICAgICAgICAgICBjdXJJbmRleCArPSAxO1xuICAgICAgICB9XG4gICAgICAgIHNldFRpbWVvdXQoZ28sIHNsaWRlRHVyYXRpb24pO1xuICAgIH07XG4gICAgZ28oKTtcbn07XG5cbiQuZm4uc2xpZGVyID0gZnVuY3Rpb24ob3B0LCBpbmRleCkge1xuICAgIHZhciBhY3Rpb247XG4gICAgdmFyICR0aGlzID0gJCh0aGlzKTtcbiAgICB2YXIgZnVuYztcbiAgICB2YXIgcGFnZUluZGV4ID0gaW5kZXg7XG4gICAgJHRoaXMuZWFjaChmdW5jdGlvbihpbmRleCwgZWxlbWVudCkge1xuICAgICAgICBpZih0eXBlb2Ygb3B0ID09PSAnb2JqZWN0Jyl7XG4gICAgICAgICAgICBlbGVtZW50Ll9zbGlkZXIgPSBuZXcgU2xpZGVyKGVsZW1lbnQsIG9wdCk7XG4gICAgICAgIH0gZWxzZSBpZih0eXBlb2YgIG9wdCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGFjdGlvbiA9IG9wdDtcbiAgICAgICAgICAgIGZ1bmMgPSBlbGVtZW50Ll9zbGlkZXJbYWN0aW9uXTtcbiAgICAgICAgICAgIHR5cGVvZiBmdW5jID09PSAnZnVuY3Rpb24nICYmIGVsZW1lbnQuX3NsaWRlclthY3Rpb25dKHBhZ2VJbmRleCk7XG4gICAgICAgIH1cbiAgICB9KTtcbn07Il19
