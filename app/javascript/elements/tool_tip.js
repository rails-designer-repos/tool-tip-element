const generateIdentifier = (() => {
  let count = 0

  return () => `tooltip-${++count}`
})()

const VIEWPORT_MARGIN = 6

class ToolTip extends HTMLElement {
  #identifier
  #tooltip
  #triggerElement
  #wantsOpen = false
  #openTimer
  #closeTimer
  #reposition

  connectedCallback() {
    if (this.#tooltip) return

    const trigger = this.firstElementChild
    if (!trigger) return

    const label = this.#label

    if (!this.#supportsPopover) {
      trigger.setAttribute("title", trigger.getAttribute("title") || label)

      return
    }

    const identifier = generateIdentifier()
    const tooltip = document.createElement("div")

    if (!this.classList.contains("contents")) this.classList.add("contents")

    tooltip.id = identifier
    tooltip.textContent = label
    tooltip.setAttribute("popover", "hint")
    tooltip.className = "tooltip"
    tooltip.style.left = "-9999px"

    document.body.appendChild(tooltip)

    this.#identifier = identifier
    this.#triggerElement = trigger
    this.#tooltip = tooltip
    this.#reposition = () => this.#position()

    if (this.#supportsInterest) {
      trigger.setAttribute("interestfor", identifier)
    } else {
      this.#setupTrigger()
    }
  }

  disconnectedCallback() {
    this.#tooltip?.remove()
  }

  // private

  #setupTrigger() {
    const open = () => this.#scheduleOpen()
    const close = () => this.#scheduleClose()

    if (window.matchMedia("(hover: hover)").matches) {
      this.#triggerElement.addEventListener("pointerenter", open)
      this.#triggerElement.addEventListener("pointerleave", close)

      this.#tooltip.addEventListener("pointerenter", open)
      this.#tooltip.addEventListener("pointerleave", close)
    }

    this.#triggerElement.addEventListener("focus", open)
    this.#triggerElement.addEventListener("blur", close)
  }

  #scheduleOpen() {
    this.#wantsOpen = true

    clearTimeout(this.#closeTimer)
    clearTimeout(this.#openTimer)

    this.#openTimer = setTimeout(() => {
      if (this.#wantsOpen) this.#open()
    }, 150)
  }

  #scheduleClose() {
    this.#wantsOpen = false

    clearTimeout(this.#openTimer)
    clearTimeout(this.#closeTimer)

    this.#closeTimer = setTimeout(() => {
      if (!this.#wantsOpen) this.#close()
    }, 150)
  }

  #open() {
    try { this.#tooltip.showPopover() } catch {}

    this.#position()

    window.addEventListener("scroll", this.#reposition, true)
    window.addEventListener("resize", this.#reposition)
  }

  #close() {
    window.removeEventListener("scroll", this.#reposition, true)
    window.removeEventListener("resize", this.#reposition)

    try { this.#tooltip.hidePopover() } catch {}
  }

  #position() {
    const triggerRect = this.#triggerElement.getBoundingClientRect()
    const tooltipRect = this.#tooltip.getBoundingClientRect()

    let top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2
    top = Math.max(VIEWPORT_MARGIN, Math.min(top, window.innerHeight - tooltipRect.height - VIEWPORT_MARGIN))

    let left = triggerRect.right + VIEWPORT_MARGIN
    if (left + tooltipRect.width > window.innerWidth - VIEWPORT_MARGIN) {
      left = triggerRect.left - VIEWPORT_MARGIN - tooltipRect.width
    }

    this.#tooltip.style.top = `${top}px`
    this.#tooltip.style.left = `${left}px`
  }

  get #label() {
    return this.getAttribute("label") ?? this.getAttribute("text") ?? ""
  }

  set #label(value) {
    this.setAttribute("label", value)

    if (this.#tooltip) this.#tooltip.textContent = value
  }

  get #supportsPopover() {
    return "showPopover" in HTMLElement.prototype
  }

  get #supportsInterest() {
    return typeof CSS !== "undefined" && CSS.supports("interest-delay: 0s")
  }
}

customElements.define("tool-tip", ToolTip)
