"use strict"

;(function() {

  // private helpers

  var hiddenClass = "hidden"
    , visibleClass = "visible"
    , transformProperty = "transform" in document.body.style
                        ? "transform"
                        : "webkitTransform"

  function create(el) {
    return document.createElement(el)
  }

  function storeApiResponse(apiResponse) {
    var shots = apiResponse.shots,
        player = shots[0].player

    ;(function(o) {
      o.shots = shots
      o.name = player.name
      o.twitter = player.twitter_screen_name
    })(dribbbox.dribbbleProfile)
  }

  function buildUI() {
    var title = document.querySelector("title")
      , fragment = document.createDocumentFragment()
      , header = new Header()
      , viewer = new Viewer()
      , nav = new Nav()

    title.textContent = dribbbox.dribbbleProfile.name + " › " + title.textContent

    ;[viewer.domNode, nav.selection].forEach(function(el) {
      el.className = hiddenClass
    })

    nav.attachViewer(viewer)
    nav.firstShotLoaded(function() {
      this.tapThumb(this.domNode.querySelector("img"))
      ;[viewer.domNode, this.selection].forEach(function(el) {
        el.removeAttribute("class")
      })
    })

    ;[header, viewer, nav].forEach(function(el) {
      fragment.appendChild(el.domNode)
    })

    document.body.appendChild(fragment)
    document.body.addEventListener("touchend", function() {}) // enables :active support
  }

  // private constructors

  function Header() {
    this.domNode = create("header")

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

    var linkList = create("ul"), links = {}

    if (dribbbox.config.email_address)
      links.Mail = "mailto:" + dribbbox.config.email_address

    links.Dribbble = "http://dribbble.com/" + dribbbox.config.dribbble_username

    if (dribbbox.dribbbleProfile.twitter)
      links.Twitter = "http://twitter.com/" + dribbbox.dribbbleProfile.twitter

    for (var prop in links) {
      var li = create("li"), a = create("a")
      a.href = links[prop]
      a.textContent = prop
      li.appendChild(a)
      linkList.appendChild(li)
    }

    this.domNode.appendChild(linkList)

  }

  function Viewer() {
    this.domNode = create("main")

    var shotSection = create("section")
      , hiddenShot = create("img")
      , visibleShot = create("img")
      , hiddenDescription = create("div")
      , hiddenTitle = create("h1")
      , hiddenYear = create("p")
      , visibleDescription = create("div")
      , visibleTitle = create("h1")
      , visibleYear = create("p")

    shotSection.id = "shot"

    ;[hiddenDescription, visibleDescription].forEach(function(el) {
      el.className = "description"
    })
    ;[hiddenShot, hiddenTitle, hiddenYear].forEach(function(el) {
      el.className = hiddenClass
    })
    ;[visibleShot, visibleTitle, visibleYear].forEach(function(el) {
      el.className = visibleClass
    })

    ;[hiddenTitle, hiddenYear].forEach(function(el) {
      hiddenDescription.appendChild(el)
    })
    ;[visibleTitle, visibleYear].forEach(function(el) {
      visibleDescription.appendChild(el)
    })
    ;[hiddenShot, visibleShot, hiddenDescription, visibleDescription].forEach(function(el) {
      shotSection.appendChild(el)
    })

    this.domNode.appendChild(shotSection)

  }

  function Nav() {
    this.domNode = create("nav")
    this.selection = create("span")
    this.selection.id = "selection"

    var thumbList = create("ul")

    dribbbox.dribbbleProfile.shots.forEach(function(shot, i) {

      var img = create("img")
      img.addEventListener("load", function(e) {
        e.target.className = "loaded"
        if (i == 0) this.firstShotLoadedCallback()
      }.bind(this))
      img.src = shot.image_url
      img.dribbboxShotInfo = {
        url: shot.image_url,
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
    attachViewer: function(viewer) {
      this.viewerNode = viewer.domNode

      var acceptTap = true
        , maxScroll

      function setMaxScroll(el) {
        var itemStyle = getComputedStyle(el)
        function getIntValue(property) {
          return parseInt(itemStyle.getPropertyValue(property).split("px")[0])
        }
        maxScroll = el.offsetLeft - document.width + getIntValue("width") + getIntValue("margin-right")
      }

      this.domNode.addEventListener("scroll", function() {
        acceptTap = false
        if (!maxScroll)
          setMaxScroll(this.domNode.querySelector("li:last-child"))
        if (this.domNode.scrollLeft == 0 || this.domNode.scrollLeft == maxScroll)
          acceptTap = true
      }.bind(this))

      this.domNode.addEventListener("touchend", function(e) {
        if (acceptTap && e.target.nodeName.toLowerCase() == "img") this.tapThumb(e.target)
        acceptTap = true
      }.bind(this))
    },
    firstShotLoaded: function(callback) {
      this.firstShotLoadedCallback = callback
    },
    tapThumb: function(target) {
      var fadeInShot = this.viewerNode.querySelector("img." + hiddenClass)
        , fadeInTitle = this.viewerNode.querySelector("h1." + hiddenClass)
        , fadeInYear = this.viewerNode.querySelector("p." + hiddenClass)

      ;[].forEach.call(this.viewerNode.querySelectorAll("." + visibleClass), function(el) {
        el.className = hiddenClass
      })
      ;[fadeInShot, fadeInTitle, fadeInYear].forEach(function(el) {
        el.className = visibleClass
      })

      var newShotInfo = target.dribbboxShotInfo
      fadeInShot.src = newShotInfo.url
      fadeInTitle.textContent = newShotInfo.title
      fadeInYear.textContent = newShotInfo.year

      var thumbParent = target.parentNode
      this.selection.style[transformProperty] = "translateX(" + thumbParent.offsetLeft + "px)"
      this.selectedItem = thumbParent
    }
  }

  // public api

  dribbbox.dribbbleProfile = {
    shots: [],
    name: "",
    twitter: ""
  }

  dribbbox.Spinner = function() {
    this.domNode = create("span")
    this.domNode.className = "spinner"
    this.domNode.addEventListener("transitionend", function() {
      this.parentNode.removeChild(this)
    })
  }

  dribbbox.callAPI = function(username, callback) {
    var script = create("script")
    script.src = "http://api.dribbble.com/players/"
               + username.trim()
               + "/shots?per_page=20&amp;callback="
               +  (callback || "dribbbox.init")
    document.head.appendChild(script)
  }

  dribbbox.init = function(apiResponse) {
    storeApiResponse(apiResponse)
    buildUI()
  }

})()

dribbbox.callAPI(dribbbox.config.dribbble_username)