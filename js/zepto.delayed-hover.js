// (c) 2011 Thomas Fuchs

(function($){
  $.fn.delayedHover = function(opts){
    var options = $.extend({
                mouseoutDelay: 250,
            }, opts);
    var timeout = null, hovering = false, element = this;
    function enter(){
      element.trigger('delayed_hover:enter');
      timeout = null;
      hovering = true;
    }

    function leave(){
      element.trigger('delayed_hover:leave');
      timeout = null;
      hovering = false;
    }

    function reset(){
      if(timeout) clearTimeout(timeout);
      timeout = null;
    }

    element.bind('mouseover', function(){
      if(hovering)
        reset();
      else
        if(!timeout) timeout = setTimeout(enter, options.mouseoutDelay);
    });

    element.bind('mouseout', function(){
      if(hovering){
        if(timeout) reset();
        timeout = setTimeout(leave, 150);
      } else {
        reset();
      }
    });
  }
})(Zepto);