/*
 * pandaCommerce auto complete jQuery plugin
 * Author <anders at restfuldesign com>
 * Version 0.0.5
 */

/*global location jQuery setTimeout clearTimeout */

(function( $ ){
    "use strict";
    
    var plugin = "aSearch";
    
    var defaults = {
	source: '/search.json', // search source
	notFound: undefined,	// not found message
	asClass: 'asearch',     // dropdown list class
	visible: false,       	// initial visibility
	wrapper: '<div/>',      // wrapper element type
	animate: 300,       	// animation time in ms
	search: 'q',         	// ajax search parameter
	delay: 200,         	// pre-delay in ms
        threshold: 250,         // click/touch threshold
	chars: 3,            	// input threshold
	cache: {},		// result cache
	lt: 'ul',           	// list type
	li: 'li'            	// list item
    };

    // default query options
    defaults.query = {
	type: 'product',
	fields: ['title','url','thumbnail','price',/*'meta_description',*/'compare_at_price'],
	limit: 0
    };
    
    // search result mapping and normalization
    defaults.normalize = function(data){
	var list = data.results ? data.results.map(function(m) {
	    return {
		url: m.url,
		title:m.title,
		thumbnail:m.thumbnail,
		description: m.meta_description,
		price:m.price,
		compare_price:m.compare_at_price
	    };
	}) : [];

	return list;
    };

    function ajaxQuery(o,query){
	var cached = o.cache[o.source], q = {}, k;

	// check if we have a cached query 
	if(cached) {
	    for(var key in cached) {
		if(key === query) {
		    // cache hit
		    render(o,cached[key],query);
		    return;
		}
	    }
	} else {
	    cached = o.cache[o.source] = {};
	}
	
	// merge query options
	if(o.query) {
	    q[o.search] = query;
	    query = $.extend({},o.query,q);
	} 

	$.ajax({
	    url: o.source,
	    data: query,
	    method: o.method || 'get',
	    dataType: o.type || 'json'
	}).done(function(data){
            data = o.normalize(data);
	    cached[query] = data;
	    render(o,data,query);
	}).fail(function(e){
	    o.target.trigger('error',e);
	});

    }

    function performSearch(options,query){
	var execQuery = ajaxQuery;
	
	if(query) query = $.trim(query.toLowerCase());

	// when source is an array use that as datasource
	if(Array.isArray(options.source)) {
	    execQuery = function() {
		render(options,options.source,query);
	    };
	} 
	
	// reset deferal timer
	if(options.timer) {
	    clearTimeout(options.timer);
	    options.timer = null;
	}

	// defer search requests
	options.timer = setTimeout(function() {
	    execQuery(options,query);
	}, options.delay);
    }

    function render(o,data,key){
	var elem = $(o.lt,o.elem);    
	var content = '';

	// pass through user specified filtering 
	if(key && typeof o.filter === 'function') {
	    return render(o,o.filter(data,key));
	}

	// keep results at target element for easy access
	o.elem.data('results',data);
	
	function renderList(list){
	    var h = '';
	    
	    Object.keys(list).forEach(function(item,i){
		h+= '<'+o.li+'>\n';
		h+= '<'+o.lt+' title="'+item+'" data-row="' + i + '">\n';     
		
		h+= renderLines(list[item]);
		
		h+= '</'+o.lt+'>\n';
		h+= '</'+o.li+'>\n';
	    });
	    
	    return h;
	}

	function renderItem(item,i){
	    var h = '';
	    var title = item.title || '&nbsp;';
            var price = (item.price && parseFloat(item.price)) || 0;
	    var compare_price = (item.compare_price && parseFloat(item.compare_price)) || 0;
	    var discounted = compare_price > price;
            
            h+= '<'+o.li+' title="'+title+'" data-row="' + i + '">';
            if(item.url) h+= '<a href="' + item.url + '">';     
	    else h+= '<div>';
	    if(item.thumbnail) h+= '<img src="'+item.thumbnail+'">';
	    
	    h+= '<h4>' + title + '</h4>';
	    if(item.description) h+= '<p>' + item.description + '</p>';
	    if(discounted && compare_price) {
                h+= '<i>' + compare_price + '</i>';                                
            }
            if(price) h+= '<b class="' + (discounted ? 'discount' : '') + '">' + price + '</b>';
	    
	    
	    if(item.url) h+= '</a>';
	    else h+= '</div>';
	    h+= '</'+o.li+'>\n';
	    
	    return h;
	}
	
	function renderLines(list){
	    var h = '';

	    if(typeof list === 'object'){

		if(Array.isArray(list)){

		    list.forEach(function(item){
			if(typeof item === 'string'){

			    h+= '<'+o.li+'>';
			    h+= item;
			    h+= '</'+o.li+'>\n';
			} else {
			    h+= renderItem(item);
			}    
		    });
		} else {
		    Object.keys(list).forEach(function(item){
			h+= renderList(list[item]);
		    });
		}    
	    } else {
		h+= '<'+o.li+'>';
		h+= list;
		h+= '</'+o.li+'>\n';
	    }
	    
	    
	    return h;
	}
        
	for(var i = 0, l = data.length; i < l; i++){
	    
	    if(typeof data[i] === 'object'){
		content+= renderItem(data[i],i);
	    }    
	    else{
		if(i === 0){
		    content+= '<'+o.li+'>\n';
		    content+= '<'+o.lt+'>\n'; 
		}

		content+= renderLines(data[i]);
		
		if(i === l-1){
		    content+= '</'+o.lt+'>\n';
		    content+= '</'+o.li+'>\n';
		}
	    }
	}
	
	// when empty insert not found or hide
	if(!content) {
	    if(o.notFound) {
		content+= '<'+o.li+' title="'+o.notFound+'">';
		content+= o.notFound;
		content+= '</'+o.li+'>\n';
	    } else o.toggle(false);
	}  

	elem.html(content);

	return this;  
    }

    var instanceCounter = 0;
    
    $.fn.aSearch = function() {
	var args = Array.prototype.slice.call(arguments);
	
	if($.data(this, plugin)) return this;
	
	return $(this).each(function() {
	    aSearch.apply(this,args);
            $.data(this, plugin);
	});
    };

    function aSearch(options){
	options = options || {};
	
	// Note: An array can be used as data source for searches
	if(Array.isArray(options) || typeof options === 'string') options = {source: options};
	
        var o = $.extend({},defaults,options);
        var selector = [o.lt,o.li].join(' ');

	o.target = $(this);
        
        // create wrapper element
        if(o.wrapper.indexOf('id=') < 0) {
            var x = o.wrapper.indexOf('>');
            
            if(x < 0) throw new TypeError("wrapper");
            
            o.className = o.asClass + '-wrapper';
            o.id = o.asClass + instanceCounter++;
            o.wrapper = o.wrapper.substr(0,x-1) + ' id="' + o.id + '" class="' + o.className + '"' + o.wrapper.substr(x,o.wrapper.length);
        }
        
        // wrap target element
        $(this).wrap(o.wrapper);
        o.elem = $('#'+o.id);

	// result list 
        $('<'+o.lt+' class="' + o.asClass + '"></'+o.lt+'>\n').appendTo(o.elem);
        o.listElem = $(o.lt,o.elem);
        
        // a toggle helper due to issues with jQuery toggle()
        o.toggle = function(state) {
            o.visible = state === undefined ? !o.visible : state;
	    if(o.visible) {
                o.listElem.show(o.animate);
                o.target.trigger('show');
            }
	    else {
                o.listElem.hide(o.animate);
                o.target.trigger('hide');
            }
        };

        // toggle initial visibility
        o.toggle(o.visible);

	// if o.chars = 0, perform search on init
        if(!o.chars) performSearch(o,null);

	var inputValue = "";
        var timeStamp = false;

        function doSelect(target){
            var data = o.elem.data('results'),
	        row = $(target).attr('data-row'),
                href = $(target).attr('href');

            if(!href) {
                href = $(target).find('a').first().attr('href');
            }
            
            o.target.trigger('selected',href,data[row]);
        }
        
	// attach event handlers
        o.elem.on('touchstart',selector,function(event){
            timeStamp = event.timeStamp;
        }).on('touchend',selector,function(event){
            var row, data, href, delta;

            delta = event.timeStamp - timeStamp;

            event.preventDefault();
            event.stopPropagation();
            
            if(delta < o.threshold) {           
                doSelect(this);
            }
            
            return false;  
        }).on('click',selector,function(event) {
            event.preventDefault();
            doSelect(this);
        }).on('keyup','input',function(event) { 
            if(this.value !== inputValue){
                
                inputValue = this.value;
                
        	if(inputValue.length >= o.chars){
                    performSearch(o,inputValue);
                    o.toggle(true);
        	} else o.toggle(false);
            }
        }).on('click','input',function(event){  
            if(this.value.length >= o.chars) o.toggle();
    	}).on('blur','input',function(event){
            setTimeout(function(){
                o.toggle(false);
            },o.delay);
    	});
	
	return this;
    };
}( jQuery ));
