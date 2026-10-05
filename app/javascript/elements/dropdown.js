import { AttractiveElement } from "attractivejs/element"

const generateIdentifier = (() => {
  let count = 0

  return () => `dropdown-${++count}`
})()

const VIEWPORT_MARGIN = 6
const ANCHOR_GAP = 0
const PLACEMENTS = ["bottom-start", "bottom-end", "top-start", "top-end"]

const actionableElements = (container) =>
  Array.from(container.querySelectorAll("a:not([disabled]), button:not([disabled])"))

class Dropdown extends AttractiveElement {
  #trigger
  #panel
  #anchor
  #reposition = () => this.#position()

  connect() {
    if (this.#panel) return

    this.style.display = "contents"

    const panel = this.targets("[data-dropdown-panel]")[0]
    if (!panel) return

    const identifier = generateIdentifier()
    panel.id ||= identifier

    if (this.#supportsPopover) {
      panel.setAttribute("popover", this.#triggerMode === "context" ? "manual" : "auto")
    }

    panel.hidden = true

    if (!panel.hasAttribute("role")) panel.setAttribute("role", "menu")

    if (this.#triggerMode === "context") {
      this.addEventListener("contextmenu", this.#contextMenu)
    } else {
      const trigger = this.targets("[data-dropdown-trigger]")[0]
      if (!trigger) return

      trigger.id ||= identifier
      trigger.setAttribute("aria-haspopup", "menu")
      trigger.setAttribute("aria-controls", panel.id)
      trigger.setAttribute("aria-expanded", "false")
      trigger.addEventListener("click", this.#toggle)

      this.#trigger = trigger
    }

    document.addEventListener("pointerdown", this.#pointerDown)
    document.addEventListener("keydown", this.#keyDown)
    window.addEventListener("scroll", this.#reposition, true)
    window.addEventListener("resize", this.#reposition)

    this.#panel = panel
  }

  disconnect() {
    if (!this.#panel) return

    if (this.#triggerMode === "context") {
      this.removeEventListener("contextmenu", this.#contextMenu)
    } else {
      this.#trigger?.removeEventListener("click", this.#toggle)
    }

    document.removeEventListener("pointerdown", this.#pointerDown)
    document.removeEventListener("keydown", this.#keyDown)
    window.removeEventListener("scroll", this.#reposition, true)
    window.removeEventListener("resize", this.#reposition)

    this.close()
    this.#trigger = null
    this.#panel = null
    this.#anchor = null
  }

  toggle() {
    this.#open ? this.close() : this.open()
  }

  open(at) {
    if (!this.#panel) return

    if (this.#supportsPopover) {
      try { this.#panel.showPopover() } catch {}
    } else {
      this.#panel.style.position = "fixed"
    }

    this.#panel.hidden = false

    this.#anchor = at ? this.#rectAt(at) : this.#trigger?.getBoundingClientRect()
    this.#position()
    this.#trigger?.setAttribute("aria-expanded", "true")
    this.setAttribute("data-open", "")

    actionableElements(this.#panel)[0]?.focus({ preventScroll: true })
  }

  close() {
    if (!this.#panel) return

    if (this.#supportsPopover) {
      try { this.#panel.hidePopover() } catch {}
    }

    this.#panel.hidden = true

    this.#trigger?.setAttribute("aria-expanded", "false")
    this.#trigger?.focus({ preventScroll: true })
    this.removeAttribute("data-open")
  }

  // private

  #toggle = () => this.toggle()

  #contextMenu = (event) => {
    if (this.#panel?.contains(event.target)) return

    event.preventDefault()
    if (this.#open) this.close()

    this.open({ x: event.clientX, y: event.clientY })
  }

  #pointerDown = (event) => {
    if (this.#open && !this.contains(event.target)) this.close()
  }

  #keyDown = (event) => {
    if (!this.#open) return

    if (event.key === "Escape") {
      event.preventDefault()
      this.close()

      return
    }

    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return

    const items = actionableElements(this.#panel)
    if (items.length === 0) return

    const currentIndex = items.indexOf(document.activeElement)
    const delta = event.key === "ArrowDown" ? 1 : -1
    const targetIndex =
      currentIndex < 0
        ? (delta === 1 ? 0 : items.length - 1)
        : (currentIndex + delta + items.length) % items.length

    event.preventDefault()
    items[targetIndex].focus()
  }

  #position() {
    const anchor = this.#anchor || this.#trigger?.getBoundingClientRect()
    if (!anchor) return

    const panelRect = this.#panel.getBoundingClientRect()

    const preferred = this.#placement
    const spaceBottom = window.innerHeight - anchor.bottom
    const spaceTop = anchor.top
    const spaceRight = window.innerWidth - anchor.right
    const spaceLeft = anchor.left

    const vertical =
      spaceBottom < panelRect.height + VIEWPORT_MARGIN && spaceTop > spaceBottom
        ? "top"
        : preferred.vertical
    const horizontal =
      spaceRight < panelRect.width + VIEWPORT_MARGIN && spaceLeft > spaceRight
        ? "start"
        : preferred.horizontal

    const top =
      vertical === "top"
        ? anchor.top - panelRect.height - ANCHOR_GAP
        : anchor.bottom + ANCHOR_GAP
    const left =
      horizontal === "start"
        ? anchor.left
        : anchor.right - panelRect.width

    this.#panel.style.top = `${Math.max(VIEWPORT_MARGIN, Math.min(top, window.innerHeight - panelRect.height - VIEWPORT_MARGIN))}px`
    this.#panel.style.left = `${Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - panelRect.width - VIEWPORT_MARGIN))}px`
  }

  #rectAt(at) {
    return { top: at.y, bottom: at.y, left: at.x, right: at.x }
  }

  get #open() {
    if (!this.#panel) return false
    if (this.#supportsPopover) return this.#panel.matches(":popover-open")
    return !this.#panel.hidden
  }

  get #triggerMode() {
    return this.getAttribute("trigger") === "context" ? "context" : "click"
  }

  get #placement() {
    const placement = this.getAttribute("placement") || "bottom-start"
    const [vertical = "bottom", horizontal = "start"] = placement.split("-")
    const valid = PLACEMENTS.includes(placement)

    return {
      vertical: valid ? vertical : "bottom",
      horizontal: valid ? horizontal : "start",
    }
  }

  get #supportsPopover() {
    return "showPopover" in HTMLElement.prototype
  }
}

customElements.define("ui-dropdown", Dropdown)
