"use strict"

;(function() {

  // private helpers

  var isFF = /firefox/i.test(navigator.userAgent)
    , hiddenClass = "hidden"
    , visibleClass = "visible"

  function create(el) {
    return document.createElement(el)
  }

  function buildUI() {
    var title = document.querySelector("title")
      , fragment = document.createDocumentFragment()
      , header = new Header()
      , nav = new Nav()
      , viewer = new Viewer()

    title.textContent = dribbbox.dribbbleProfile.name + " › " + title.textContent

    nav.attachViewer(viewer)
    nav.firstShotLoaded(function() {
      this.domNode.querySelector("img").click()
      document.body.className = "ready"
    })

    ;[header, nav, viewer].forEach(function(el) {
      fragment.appendChild(el.domNode)
    })

    document.body.appendChild(fragment)
  }

  // private constructors

  function Header() {
    this.domNode = create("header")

    var avatar = create("img")
    avatar.src = dribbbox.dribbbleProfile.avatar
    avatar.alt = ""
    this.domNode.appendChild(avatar)

    ;(function() {
      var section = create("section")
        , h1 = create("h1")
        , description = create("p")
        , content = create("em")

      h1.textContent = dribbbox.dribbbleProfile.name
      content.textContent = dribbbox.config.short_description

      description.appendChild(content)
      section.appendChild(h1)
      section.appendChild(description)
      this.domNode.appendChild(section)
    }).call(this)

    var linkList = create("ul")
      , links = {}

    if (dribbbox.config.email_address)
      links.Mail = "mailto:" + dribbbox.config.email_address
    links.Dribbble = "http://dribbble.com/" + dribbbox.config.dribbble_username
    if (dribbbox.dribbbleProfile.twitter)
      links.Twitter = dribbbox.dribbbleProfile.twitter

    for (var prop in links) {
      var li = create("li")
        , a = create("a")
      a.href = links[prop]
      a.textContent = prop
      li.appendChild(a)
      linkList.appendChild(li)
    }

    this.domNode.appendChild(linkList)

    ;(function() {
      if (!dribbbox.dribbbleProfile.location) return
      var location = create("p")
        , content = create("small")
        , country = create("strong")
      location.id = "location"
      content.textContent = "Made with love in "
      country.textContent = dribbbox.dribbbleProfile.location
      content.appendChild(country)
      location.appendChild(content)
      this.domNode.appendChild(location)
    }).call(this)
  }

  function Nav() {
    this.domNode = create("nav")
    this.selection = create("span")
    this.selection.id = "selection"

    var thumbList = create("ul")
      , firstValidShotIndex = undefined

    dribbbox.dribbbleProfile.shots.forEach(function(shot, i) {
      var availableShot = shot.images.hidpi || shot.images.normal
      if (availableShot.split(".").pop() == "gif") return
      if (firstValidShotIndex == undefined) firstValidShotIndex = i

      var img = create("img")
      img.addEventListener("load", function(e) {
        e.target.className = "loaded"
        if (i == firstValidShotIndex) this.firstShotLoadedCallback()
      }.bind(this))
      img.src = availableShot
      img.dribbboxShotInfo = {
        url: availableShot,
        title: shot.title,
        year: shot.created_at.substring(0,4)
      }

      var li = create("li")
      li.appendChild(img)
      li.appendChild(new dribbbox.Spinner().domNode)
      thumbList.appendChild(li)
    }.bind(this))
    ;[this.selection, thumbList].forEach(function(el) {
      this.domNode.appendChild(el)
    }.bind(this))
  }
  Nav.prototype = {
    clickedThumbInfo: function(e) {
      return e.target.dribbboxShotInfo
    },
    attachViewer: function(viewer) {
      var viewerNode = viewer.domNode
      , transformProperty = "transform" in document.body.style
                          ? "transform"
                          : "webkitTransform"

      this.enableKeyboardNav()
      this.domNode.addEventListener("click", function(e) {
        if (e.target.nodeName.toLowerCase() != "img") return

        var fadeInShot = viewerNode.querySelector("img." + hiddenClass)
          , fadeInBg = viewerNode.querySelector("span." + hiddenClass)
          , fadeInTitle = viewerNode.querySelector("h1." + hiddenClass)
          , fadeInYear = viewerNode.querySelector("p." + hiddenClass)
          , newShotInfo = this.clickedThumbInfo(e)

        ;[].forEach.call(viewerNode.querySelectorAll("." + visibleClass), function(el) {
          el.className = hiddenClass
        })
        ;[fadeInShot, fadeInBg, fadeInTitle, fadeInYear].forEach(function(el) {
          el.className = visibleClass
        })

        fadeInShot.src = newShotInfo.url
        fadeInBg.style.backgroundImage = "url(" + newShotInfo.url + ")"
        fadeInTitle.textContent = newShotInfo.title
        fadeInYear.textContent = newShotInfo.year

        var thumbParent = e.target.parentNode
        this.selection.style[transformProperty] = "translateY(" + thumbParent.offsetTop + "px)"
        this.selectedItem = thumbParent
      }.bind(this))
    },
    firstShotLoaded: function(callback) {
      this.firstShotLoadedCallback = callback
    },
    enableKeyboardNav: function() {

      var bezierCurve = function(x1, y1, x2, y2) {
        var curveX = function(t) {
          var v = 1 - t
          return 3 * v * v * t * x1 + 3 * v * t * t * x2 + t * t * t
        },
        curveY = function(t) {
          var v = 1 - t
          return 3 * v * v * t * y1 + 3 * v * t * t * y2 + t * t * t
        },
        derivativeCurveX = function(t) {
          var v = 1 - t
          return 3 * (2 * (t - 1) * t + v * v) * x1 + 3 * (- t * t * t + 2 * v * t) * x2
        },
        cache = {},
        cachingInterval = 0.001,
        invertCachingInterval = 1 / cachingInterval

        for (var i = 0; i <= invertCachingInterval; i += 1) {
          var t = curveX(i * cachingInterval),
              closestCachedT = Math.round(t / cachingInterval)
          cache[closestCachedT] = curveY(i * cachingInterval)
        }

        var findCachedValueAround = function(t, precision) {
          t = Math.round(t / cachingInterval)
          precision = precision * invertCachingInterval
          var originalT = t,
              y = cache[t],
              incr = 1
          while(!y) {
            t = originalT + incr
            if (Math.abs(t - originalT) > precision)
              break
            if (incr > 0)
              incr = -incr
            else
              incr = -2 * incr
            y = cache[t]
          }
          return y
        }
        return function(t, precision){
          // find closest cached value
          var y = findCachedValueAround(t, precision)
          if(!y) {
            // if not yet cached, we find it
            var t0 = 0, t1 = 1, t2 = t, x2
            while (t0 < t1) {
              x2 = curveX(t2)
              if (Math.abs(x2 - t) < precision) {
                y = curveY(t2)
                break
              }
              if (t > x2)
                t0 = t2
              else
                t1 = t2
              t2 = (t1 - t0) * .5 + t0
            }
            cache[Math.round(t / cachingInterval)] = y
          }
          return y
        }
      },

      scrollTo = function(to, duration, easingFunction) {
        var documentHeight = document.height,
            windowHeight = window.innerHeight
        if (to > documentHeight - windowHeight)
          to = documentHeight - windowHeight
        var from = root.scrollTop,
            startDate = Date.now(),
            precision = 1 / 240 / (duration / 1000)
        function scroll(timestamp) {
          var currentTime = Date.now(),
              t = Math.min(1, ((currentTime - startDate) / duration)),
              easedT = easingFunction(t, precision)
          root.scrollTop = easedT * (to - from) + from
          if (t < 1)
            requestAnimationFrame(scroll)
        }
        requestAnimationFrame(scroll)
      },

      root = isFF ? document.documentElement : document.body,
      easeOutFunction = bezierCurve(.645, .045, .355, 1),
      thumbDistance = undefined

      ;(function() {
        var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
                                    window.webkitRequestAnimationFrame || window.msRequestAnimationFrame
        window.requestAnimationFrame = requestAnimationFrame
      })()

      document.addEventListener("keydown", function(e) {
        if (e.keyCode == 38 || e.keyCode == 40) {
          e.preventDefault()
          if (!thumbDistance) {
            var itemStyle = getComputedStyle(this.selectedItem),
                getIntValue = function(property) {
                  return parseInt(itemStyle.getPropertyValue(property).split("px")[0])
                }
            thumbDistance = getIntValue("height") + getIntValue("margin-top")
          }
          var followingItem, scrollPosition
          if (e.keyCode == 38) {
            followingItem = this.selectedItem.previousSibling
            scrollPosition = -thumbDistance
          }
          else {
            followingItem = this.selectedItem.nextSibling
            scrollPosition = thumbDistance
          }
          if (!followingItem) return
          followingItem.firstChild.click()
          scrollTo(root.scrollTop + scrollPosition, 500, easeOutFunction)
        }
      }.bind(this))
    }
  }

  function Viewer() {
    this.domNode = create("main")

    var shotSection = create("section")
      , hiddenShot = create("img")
      , visibleShot = create("img")
      , hiddenTitle = create("h1")
      , hiddenYear = create("p")
      , visibleTitle = create("h1")
      , visibleYear = create("p")
      , background = create("div")
      , hiddenSpan = create("span")
      , visibleSpan = create("span")

    shotSection.id = "shot"
    background.id = "background"
    if (isFF) background.className = "no-blur"

    ;[hiddenShot, hiddenTitle, hiddenYear, hiddenSpan].forEach(function(el) {
      el.className = hiddenClass
    })
    ;[visibleShot, visibleTitle, visibleYear, visibleSpan].forEach(function(el) {
      el.className = visibleClass
    })

    ;[hiddenShot, visibleShot, hiddenTitle, hiddenYear, visibleTitle, visibleYear].forEach(function(el) {
      shotSection.appendChild(el)
    })
    ;[hiddenSpan, visibleSpan].forEach(function(el) {
      background.appendChild(el)
    })
    ;[shotSection, background].forEach(function(el) {
      this.domNode.appendChild(el)
    }.bind(this))
  }

  // public api

  dribbbox.dribbbleProfile = {
    shots: [],
    name: "",
    avatar: "",
    location: "",
    twitter: ""
  }

  dribbbox.storeUserProfile = function(player) {
    dribbbox.dribbbleProfile.name = player.data.name
    dribbbox.dribbbleProfile.avatar = player.data.avatar_url
    dribbbox.dribbbleProfile.location = player.data.location
    dribbbox.dribbbleProfile.twitter = player.data.links.twitter

    dribbbox.apiCall.getShots()
  }

  dribbbox.storeShots = function(apiResponse) {
    dribbbox.dribbbleProfile.shots = apiResponse.data

    buildUI()
  }

  dribbbox.Spinner = function() {
    this.domNode = create("span")
    this.domNode.className = "spinner"
    this.domNode.addEventListener("transitionend", function() {
      this.parentNode.removeChild(this)
    })
  }

  dribbbox.apiCall = {
    buildScript: function(path) {
      var script = create("script")
      script.src = "https://api.dribbble.com/v1/users/"
                 + dribbbox.config.dribbble_username.trim()
                 + path
                 + "&access_token=6a797c5ab12b0529be1b8c0b7f58bb2ebd5825d997c93a6b8caee4ce6d1568b3"
      document.head.appendChild(script)
    },
    getUserInfo: function() {
      this.buildScript("?callback=dribbbox.storeUserProfile")
    },
    getShots: function() {
      this.buildScript("/shots?callback=dribbbox.storeShots&per_page=20")
    }
  }

})()

document.body.appendChild(new dribbbox.Spinner().domNode)
dribbbox.apiCall.getUserInfo()
