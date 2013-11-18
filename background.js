var isNull = function(value){
    return value === undefined || value === null;
};

String.prototype.has = function(text){
    return this.indexOf(text) >= 0 ;
};

var lang_selector      = {
    "fr": function(html) {
        return $("div#mf-lumieresur p a", html); 
    },
    "en": function(html) {
        return $("div#mp-tfa b>a", html); 
    }
    // ,"nl": function(html) {
    //     return $(".radius", html).first().find('a').last(); 
    // }
    // ,"ar": function(html) {
    //     return $("div#mf-fa p>b>a", html);
    // }
};

var Wikipedia = function(){

    this.getWikiLink = function (lang, handler ){
        var article_url = "http://"+lang+".wikipedia.org" ;
        if (isNull(lang)){
            lang = "en";
        }
        $.get(article_url, function(html){
            var links = lang_selector[lang](html);
            if(links.length){
                handler( article_url+ $(links[0]).attr('href'), $(links[0]).text() ) ;
            }
        });
    };
};

var  Readability = function(){
    
    var link = 'http://www.readability.com',
        shortner='http://rdd.me',
        api = "/api/shortener/v1/urls";

    /**
    Creates a readability shortened link from the passed link 
    @param url The url to shorten 
    **/
    this.open = function(url,handler){
        var params = {'url': url};
        $.ajax({
            url: link+api, 
            type: "POST",
            contentType:"application/x-www-form-urlencoded",
            accepts:"text/plain",
            data:params 
        }).done(function( resObj ) { 
            var resUrl = resObj.meta.rdd_url;
            if(resUrl.has(shortner)){
                resUrl = resUrl.replace(shortner, link+'/articles');
            }
            resUrl = resUrl.replace('http:','https:');
            handler(resUrl);
        });
    };
};

var Twitter = function(){
    var twitterUrl = "https://twitter.com/home?status=";
    var messages = {
        'ar.': " [ AR ] %23diknows %23Wikipedia",
        'fr.': " [ FR ] %23diknows %23Wikipedia",
        'en.': " [ EN ] %23diknows %23Wikipedia",
        'nl.': " [ NL ] %23diknows %23Wikipedia"
    };

    this.tweet = function(oldlink, link,title){
        var keys = Object.keys(messages).filter(function(el){
            return oldlink.has(el);
        });
        if(keys){
            var text = link+" "+title+" "+ messages[keys[0]];
            chrome.tabs.create({url:twitterUrl + text});
        }
    };
};

var Manager = function(){
    var wiki = new Wikipedia();
    var read = new Readability();
    var twitter = new Twitter();
    var openLink = function (link,title){
        read.open(link,function(url){
            chrome.tabs.create({url:url});
            twitter.tweet(link,url,title);
        });
    };

    for(var lang in lang_selector){
        wiki.getWikiLink(lang, openLink);
    }
};

var Scheduler = function (){
    var scheduled = [] ;
    var check = function(cronPart, value){
        return cronPart === '*' || value === parseInt(cronPart,10);
    };
    var isExecutable = function(cronParts){
        var now = new Date();
        var execute = check (cronParts[0], now.getMinutes()) &&
                      check (cronParts[1], now.getHours()) &&
                      check (cronParts[2], now.getDate()) &&
                      check (cronParts[3], now.getMonth()+1) &&
                      check (cronParts[4], now.getDay()) ;
        return execute;
    };
    var checkSchedule = function(){
        for(var i=0;i<scheduled.length;i++){
            if(isExecutable(scheduled[i].cron)){
                scheduled[i].handler();
            }
        }
    };
    this.addSchedule = function(cronString,properties, handler){
        var cronParts = cronString.split(" ");
        if(cronParts.length !== 5){
            throw "Cron string must contain [ Minutes Hours DayOfMonth Month DayOfWeek(0/sun -> 6/sat) ] ";
        }
        var index = scheduled.length;
        scheduled[index] = {
            "cron":cronParts,
            "handler":handler
        };
        scheduled[index] = $.extend({},scheduled[index],properties);
        return this;
    };

    var schedule = null;
    var timeInterval = 58999 ; // 50 Seconds 
    this.start = function(){
        schedule = window.setInterval(checkSchedule, timeInterval);
    };
    this.stop = function(){
        window.clearInterval(schedule);
    };
};

$(function(){
    var scheduler = new Scheduler();
    var cron = "30 11 * * *";
    // var cron = "30 21 * * *";
    scheduler.addSchedule(cron, {}, Manager).start();
});
