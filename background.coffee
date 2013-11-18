String::has = (text) ->
  @indexOf(text) >= 0

lang_selector =
  fr: (html) ->
    $ "div#mf-lumieresur p a", html

  en: (html) ->
    $ "div#mp-tfa b>a", html

  nl: (html) ->
    $(".radius", html).first().find('a').last()

  ar: (html) ->
    $ "div#mf-fa p>b>a", html

class Wikipedia
  getWikiLink: (lang, handler) ->
    lang = "en"  if lang?
    article_url = "http://" + lang + ".wikipedia.org"
    $.get article_url, (html) ->
      links = lang_selector[lang](html)
      handler article_url + $(links[0]).attr("href"), $(links[0]).text()  if links.length


class Readability
  constructor: ->
    @link = "http://www.readability.com"
    @shortner = "http://rdd.me"
    @api = "/api/shortener/v1/urls"
  
  ###
  Creates a readability shortened link from the passed link
  @param url The url to shorten
  ###
  open: (url, handler) ->
    $.ajax(
      url: @link + @api
      type: "POST"
      contentType: "application/x-www-form-urlencoded"
      accepts: "text/plain"
      data:
        url: url
    ).done (resObj) ->
      resUrl = resObj.meta.rdd_url
      resUrl = resUrl.replace(@shortner, @link + "/articles")  if resUrl.has(@shortner)
      resUrl = resUrl.replace "http:", "https:"
      handler resUrl

class Twitter
  constructor: ->
    @twitterUrl = "https://twitter.com/home?status="
    @messages =
      "ar.": " [ AR ] %23diknows %23Wikipedia"
      "fr.": " [ FR ] %23diknows %23Wikipedia"
      "en.": " [ EN ] %23diknows %23Wikipedia"
      "nl.": " [ NL ] %23diknows %23Wikipedia"

  tweet: (oldlink, link, title) ->
    keys = Object.keys(@messages).filter((el) ->
      oldlink.has el
    )
    if keys
      text = link + " " + title + " " + @messages[keys[0]]
      chrome.tabs.create url: @twitterUrl + text

class Manager
  constructor: ->
    @wiki = new Wikipedia()
    @read = new Readability()
    @twitter = new Twitter()

  openLink : (link, title) ->
    that = @
    @read.open link, (url) ->
      chrome.tabs.create url: url
      that.twitter.tweet link, url, title

  run: ->
    for lang of lang_selector
      @wiki.getWikiLink lang, openLink

class Scheduler
  constructor: ->
    @schedule = null
    @timeInterval = 58999 # 50 Seconds
    @scheduled = []

  check: (cronPart, value) ->
    cronPart is "*" or value is parseInt(cronPart, 10)

  isExecutable: (cronParts) ->
    now = new Date()
    execute = check(cronParts[0], now.getMinutes()) and check(cronParts[1], now.getHours()) and check(cronParts[2], now.getDate()) and check(cronParts[3], now.getMonth() + 1) and check(cronParts[4], now.getDay())
    execute

  checkSchedule: ->
    i = 0
    while i < scheduled.length
      scheduled[i].handler()  if isExecutable(scheduled[i].cron)
      i++

  addSchedule: (cronString, properties, handler) ->
    cronParts = cronString.split(" ")
    throw new Error("Cron string must contain [ Minutes Hours DayOfMonth Month DayOfWeek(0/sun -> 6/sat) ] ")  if cronParts.length isnt 5
    index = scheduled.length
    scheduled[index] =
      cron: cronParts
      handler: handler

    scheduled[index] = $.extend({}, scheduled[index], properties)
    this

  start: ->
    schedule = window.setInterval(checkSchedule, timeInterval)

  stop: ->
    window.clearInterval schedule

$ ->
  scheduler = new Scheduler()
  cron = "30 21 * * *"
  scheduler.addSchedule(cron, {}, Manager).start()
